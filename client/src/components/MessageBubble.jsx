import React, { useState, useRef } from 'react';
import { CheckCheck, Play, Pause, Mic, Trash2 } from 'lucide-react';

export default function MessageBubble({ message, isSelf, isGroup, onDeleteMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const isImage = message.message_type === 'image' && message.media_url;
  const isAudio = message.message_type === 'audio' && message.media_url;

  return (
    <div className={`flex my-1 px-2 sm:px-6 ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] px-3.5 py-2.5 shadow-md backdrop-blur-2xl text-[14.5px] leading-relaxed break-words whitespace-pre-wrap transition duration-200 ios-tap ${
          isSelf
            ? 'wa-bubble-sent bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400/30 shadow-emerald-950/20'
            : 'wa-bubble-received bg-[#242731]/85 border border-white/[0.12] text-slate-100 shadow-black/30'
        }`}
      >
        {/* Delete Message Button for Sender */}
        {isSelf && onDeleteMessage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMessage(message.id);
            }}
            className="absolute -top-2.5 -right-2 p-1.5 bg-[#1c1c1e]/95 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full shadow-lg border border-white/20 sm:opacity-0 sm:group-hover:opacity-100 transition-all ios-tap z-10"
            title="Delete message"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Sender Name in Group chats */}
        {!isSelf && isGroup && (
          <div className="text-[12px] font-semibold text-[#53bdeb] mb-1 px-1">
            {message.sender_name}
          </div>
        )}

        {/* 1. PHOTO MESSAGE */}
        {isImage && (
          <div className="mb-1 rounded-lg overflow-hidden max-h-72 flex items-center justify-center bg-black/20">
            <img
              src={message.media_url}
              alt="Sent photo"
              className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition"
              onClick={() => window.open(message.media_url, '_blank')}
            />
          </div>
        )}

        {/* 2. VOICE NOTE AUDIO MESSAGE */}
        {isAudio && (
          <div className="flex items-center space-x-3 py-1 px-2 pr-12 min-w-[200px]">
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-full transition text-white shadow ${
                isSelf ? 'bg-wa-green hover:bg-wa-greenDark' : 'bg-wa-green hover:bg-wa-greenDark'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Fake Waveform Lines */}
            <div className="flex-1 flex items-center gap-0.5 h-6">
              {[40, 70, 30, 90, 60, 45, 80, 50, 65, 35, 75, 40, 85, 30, 60].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${
                    isPlaying ? 'bg-wa-green animate-pulse' : 'bg-white/40'
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <audio
              ref={audioRef}
              src={message.media_url}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* 3. TEXT CONTENT */}
        {(!isImage && !isAudio) || (isImage && message.content && message.content !== 'Photo') ? (
          <div className="px-1 pr-14 sm:pr-16 inline-block">
            {message.content}
          </div>
        ) : null}

        {/* Timestamp and Double Checkmarks */}
        <div className="absolute right-2 bottom-1 flex items-center space-x-1 select-none pointer-events-none">
          <span className="text-[11px] text-wa-muted/80">
            {time}
          </span>
          {isSelf && (
            <CheckCheck className="w-3.5 h-3.5 text-wa-tick flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
