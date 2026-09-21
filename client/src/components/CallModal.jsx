import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';

export default function CallModal({
  callState, // null | { isIncoming, callerId, callerName, callerAvatar, callType, targetUserId, targetUserName, targetUserAvatar, isConnected }
  onAccept,
  onReject,
  onEndCall,
  socket
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('connecting'); // 'calling', 'incoming', 'connected'

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationTimerRef = useRef(null);
  const stopAudioRef = useRef(null);

  const isIncoming = callState?.isIncoming;
  const callType = callState?.callType || 'video';
  const otherName = isIncoming ? callState?.callerName : callState?.targetUserName;
  const otherAvatar = isIncoming ? callState?.callerAvatar : callState?.targetUserAvatar;

  // Sound Synthesizer using Web Audio API
  const playRingtone = (type) => {
    // Stop any existing sound first
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      let isStopped = false;

      if (type === 'incoming') {
        // WhatsApp-like melodic chime sequence (repeating loop)
        const playTone = (freq, start, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

          gain.gain.setValueAtTime(0, ctx.currentTime + start);
          gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };

        const loopChime = () => {
          if (isStopped) return;
          if (ctx.state === 'suspended') ctx.resume();

          // Melody phrase 1
          playTone(659.25, 0.0, 0.22); // E5
          playTone(830.61, 0.18, 0.22); // G#5
          playTone(987.77, 0.36, 0.3); // B5
          playTone(1318.51, 0.58, 0.45); // E6

          // Melody phrase 2
          playTone(659.25, 1.1, 0.22);
          playTone(830.61, 1.28, 0.22);
          playTone(987.77, 1.46, 0.3);
          playTone(1318.51, 1.68, 0.55);
        };

        loopChime();
        const intervalId = setInterval(loopChime, 3000);

        stopAudioRef.current = () => {
          isStopped = true;
          clearInterval(intervalId);
          try {
            ctx.close();
          } catch (e) {}
        };
      } else if (type === 'calling') {
        // Outgoing dial ring tone (beeps every 4 seconds)
        const playDialTone = () => {
          if (isStopped) return;
          if (ctx.state === 'suspended') ctx.resume();

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 1.6);
          osc2.stop(ctx.currentTime + 1.6);
        };

        playDialTone();
        const intervalId = setInterval(playDialTone, 4000);

        stopAudioRef.current = () => {
          isStopped = true;
          clearInterval(intervalId);
          try {
            ctx.close();
          } catch (e) {}
        };
      }
    } catch (err) {
      console.warn('Audio synthesis error:', err);
    }
  };

  const stopAllAudio = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
  };

  // Initialize Camera & Audio
  useEffect(() => {
    if (!callState) {
      stopAllAudio();
      return;
    }

    let mounted = true;

    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        });

        if (mounted) {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Could not access camera/mic (fallback simulation):', err.message);
      }
    }

    if (!isIncoming) {
      setCallStatus('calling');
      playRingtone('calling');
      setupMedia();
    } else {
      setCallStatus('incoming');
      playRingtone('incoming');
    }

    return () => {
      mounted = false;
      stopAllAudio();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState?.callerId, callState?.targetUserId, isIncoming, callType]);

  // When caller receives call_accepted from callee, switch caller to connected!
  useEffect(() => {
    if (callState?.isConnected && callStatus === 'calling') {
      stopAllAudio();
      setCallStatus('connected');
      setDuration(0);
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, [callState?.isConnected, callStatus]);

  // Start duration timer once connected
  const startTimer = () => {
    stopAllAudio();
    setCallStatus('connected');
    setDuration(0);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleAcceptCall = async () => {
    stopAllAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Camera/mic access fallback:', e);
    }

    startTimer();
    if (onAccept) onAccept();
  };

  const handleRejectCall = () => {
    stopAllAudio();
    if (onReject) onReject();
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleEnd = () => {
    stopAllAudio();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (onEndCall) onEndCall();
  };

  if (!callState) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 select-none animate-fadeIn">
      {/* INCOMING CALL SCREEN */}
      {callStatus === 'incoming' && (
        <div className="w-full max-w-sm bg-slate-950/80 backdrop-blur-3xl border border-white/15 rounded-3xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col items-center text-center animate-bounce-short">
          <div className="relative mb-6">
            <img
              src={otherAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
              alt={otherName}
              className="w-24 h-24 rounded-full object-cover border-4 border-wa-green shadow-xl animate-pulse"
            />
            <span className="absolute -bottom-2 -right-2 p-2 bg-wa-green rounded-full text-white shadow ring-4 ring-wa-panel">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-wa-text tracking-tight">{otherName}</h3>
          <p className="text-xs text-wa-green mt-1 uppercase tracking-wider font-semibold animate-pulse">
            Incoming Wavy {callType === 'video' ? 'Video' : 'Audio'} Call...
          </p>

          <div className="flex items-center gap-10 mt-10">
            {/* Decline Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleRejectCall}
                className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition transform hover:scale-110 flex items-center justify-center"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-wa-muted mt-2 font-medium">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleAcceptCall}
                className="p-4 bg-wa-green hover:bg-wa-greenDark text-white rounded-full shadow-lg transition transform hover:scale-110 flex items-center justify-center animate-bounce"
                title="Accept"
              >
                {callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </button>
              <span className="text-xs text-wa-green mt-2 font-medium">Accept</span>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CALL / CALLING SCREEN */}
      {callStatus !== 'incoming' && (
        <div className="w-full max-w-2xl h-[600px] max-h-[92vh] bg-slate-950/80 backdrop-blur-3xl border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col justify-between relative">
          {/* Top Call Info Bar */}
          <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
            <div className="flex items-center space-x-3">
              <img
                src={otherAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                alt={otherName}
                className="w-10 h-10 rounded-full object-cover border border-white/40"
              />
              <div>
                <h4 className="text-sm font-semibold text-white">{otherName}</h4>
                <p className="text-xs text-wa-green font-medium">
                  {callStatus === 'connected' ? formatTime(duration) : 'Ringing...'}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white uppercase tracking-wider font-semibold">
              {callType === 'video' ? 'Video Call' : 'Audio Call'}
            </span>
          </div>

          {/* Call Center Stage */}
          <div className="my-auto w-full h-full flex items-center justify-center relative overflow-hidden">
            {callType === 'video' ? (
              <>
                {/* Simulated / Remote Video Feed */}
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="flex flex-col items-center text-center p-6">
                    <img
                      src={otherAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                      alt={otherName}
                      className="w-28 h-28 rounded-full object-cover border-4 border-wa-green/60 shadow-2xl mb-4 animate-pulse"
                    />
                    <h3 className="text-lg font-semibold text-white">{otherName}</h3>
                    <p className="text-xs text-wa-muted mt-1">
                      {callStatus === 'connected' ? 'Video connected' : 'Connecting video stream...'}
                    </p>
                  </div>
                </div>

                {/* Local Picture-in-Picture Video */}
                <div className="absolute top-16 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-black z-20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white text-xs">
                      <VideoOff className="w-6 h-6 mb-1 text-rose-400" />
                      <span>Camera Off</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Audio Call View */
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full border-4 border-wa-green/40 flex items-center justify-center animate-ping absolute inset-0" />
                  <img
                    src={otherAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                    alt={otherName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-wa-green shadow-2xl relative z-10"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{otherName}</h3>
                <p className="text-sm text-wa-green font-medium mt-1">
                  {callStatus === 'connected' ? formatTime(duration) : 'Calling...'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Call Control Action Bar */}
          <div className="p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center space-x-6 z-20">
            {/* Mute Mic Button */}
            <button
              onClick={handleToggleMute}
              className={`p-3.5 rounded-full transition shadow-lg ${
                isMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEnd}
              className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition transform hover:scale-110 flex items-center justify-center"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            {/* Video Toggle Button (for video calls) */}
            {callType === 'video' && (
              <button
                onClick={handleToggleVideo}
                className={`p-3.5 rounded-full transition shadow-lg ${
                  isVideoOff
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
