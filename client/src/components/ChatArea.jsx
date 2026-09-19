import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from './MessageBubble';
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  MoreVertical,
  Search,
  ArrowLeft,
  Hash,
  MessageSquareOff,
  Phone,
  Video,
  X,
  Square
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🙏', '💯'];

export default function ChatArea({
  activeRoom,
  messages,
  onSendMessage,
  onBack,
  onViewProfile,
  onStartCall
}) {
  const { user } = useAuth();
  const { socket, onlineUserIds } = useSocket();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Typing event listener
  useEffect(() => {
    if (!socket || !activeRoom) return;

    const handleUserTyping = ({ roomId, userId, username, isTyping }) => {
      if (roomId === activeRoom.id && userId !== user?.id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(username);
          } else {
            next.delete(username);
          }
          return next;
        });
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
      setTypingUsers(new Set());
    };
  }, [socket, activeRoom?.id, user?.id]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && activeRoom) {
      socket.emit('typing', { roomId: activeRoom.id, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId: activeRoom.id, isTyping: false });
      }, 1500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (socket && activeRoom) {
      socket.emit('typing', { roomId: activeRoom.id, isTyping: false });
    }

    onSendMessage({ content: inputText.trim(), messageType: 'text' });
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  // Image Attachment Handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large! Please choose an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onSendMessage({
        content: 'Photo',
        messageType: 'image',
        mediaUrl: reader.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone for voice recording: ' + err.message);
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage({
          content: 'Voice note',
          messageType: 'audio',
          mediaUrl: reader.result
        });
      };
      reader.readAsDataURL(audioBlob);
    };

    recorder.stop();
    setIsRecording(false);
    clearInterval(recordTimerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(recordTimerRef.current);
    audioChunksRef.current = [];
  };

  if (!activeRoom) {
    return (
      <main className="hidden md:flex flex-1 h-full flex-col items-center justify-center bg-wa-panel text-wa-muted border-b-8 border-wa-green select-none">
        <div className="w-20 h-20 rounded-full bg-wa-bg/80 flex items-center justify-center mb-6 text-wa-muted shadow-lg ring-1 ring-white/5">
          <MessageSquareOff className="w-10 h-10 text-wa-green/80" />
        </div>
        <h3 className="text-2xl font-light text-wa-text tracking-wide">WhatsApp Web</h3>
        <p className="text-xs text-wa-muted max-w-sm text-center mt-2 leading-relaxed">
          Send and receive messages in real-time. Select a chat from the sidebar to get started.
        </p>
        <div className="mt-8 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-wa-bg/80 border border-wa-border shadow-sm">
          <span className="w-2 h-2 rounded-full bg-wa-green animate-pulse" />
          <span className="text-xs font-medium text-wa-muted">
            Created by <span className="text-wa-green font-semibold">Shailender Gautam</span>
          </span>
        </div>
      </main>
    );
  }

  const isDirect = activeRoom.type === 'direct';
  const otherUser = activeRoom.otherUser;
  const isOtherUserOnline = isDirect && otherUser ? onlineUserIds.has(otherUser.id) : false;

  const formatSecs = (s) => {
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-wa-bg min-w-0">
      {/* WhatsApp Chat Header */}
      <header className="h-16 bg-wa-header px-3 sm:px-4 flex items-center justify-between border-b border-wa-border flex-shrink-0 z-10">
        <div className="flex items-center space-x-2 sm:space-x-3 truncate">
          {/* Back button for Mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-wa-muted hover:text-wa-text hover:bg-wa-hover rounded-full transition"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact / Channel Avatar & Info */}
          <div
            onClick={() => isDirect && otherUser && onViewProfile && onViewProfile(otherUser)}
            className={`flex items-center space-x-3 truncate ${
              isDirect ? 'cursor-pointer hover:opacity-90 transition group' : ''
            }`}
            title={isDirect ? 'Click to view contact profile' : undefined}
          >
            <div className="relative flex-shrink-0">
              {isDirect ? (
                <img
                  src={otherUser?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                  alt={otherUser?.username}
                  className="w-10 h-10 rounded-full bg-slate-800 object-cover ring-1 ring-white/10 group-hover:ring-emerald-500/50 shadow-sm transition-all duration-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-wa-panel ring-1 ring-white/10 flex items-center justify-center text-wa-green shadow-sm">
                  <Hash className="w-5 h-5" />
                </div>
              )}
              {isDirect && isOtherUserOnline && (
                <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-wa-header shadow-sm" />
                </span>
              )}
            </div>

            <div className="truncate">
              <h2 className="font-semibold text-wa-text text-sm sm:text-base truncate group-hover:text-emerald-400 transition-colors">
                {isDirect ? otherUser?.username : `#${activeRoom.name}`}
              </h2>
              <p className="text-[11px] sm:text-xs text-wa-muted truncate">
                {isDirect
                  ? isOtherUserOnline ? 'online' : 'offline • click for info'
                  : activeRoom.description || 'tap here for channel info'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Calling & Action Icons */}
        <div className="flex items-center space-x-1 sm:space-x-2 text-wa-muted">
          {isDirect && otherUser && (
            <>
              {/* Video Call */}
              <button
                onClick={() => onStartCall && onStartCall(otherUser, 'video')}
                title="Video Call"
                className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition"
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Audio Call */}
              <button
                onClick={() => onStartCall && onStartCall(otherUser, 'audio')}
                title="Audio Call"
                className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition"
              >
                <Phone className="w-5 h-5" />
              </button>
            </>
          )}

          <button className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* WhatsApp Wallpaper Chat Messages */}
      <div className="flex-1 overflow-y-auto wa-wallpaper p-2 sm:p-4 space-y-1">
        <div className="flex justify-center my-3">
          <span className="px-3 py-1 bg-wa-panel/90 text-wa-muted text-[11px] uppercase tracking-wide font-medium rounded-lg shadow-sm border border-wa-border/50 select-none">
            Today
          </span>
        </div>

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.sender_id === user?.id}
            isGroup={!isDirect}
          />
        ))}

        {typingUsers.size > 0 && (
          <div className="px-4 py-1 text-xs text-wa-green italic font-medium animate-pulse">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Emoji Quick Bar */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-wa-panel border-t border-wa-border flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="text-lg hover:scale-125 transition transform p-1.5 rounded-lg hover:bg-wa-hover"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Modern WhatsApp Input Bar */}
      <footer className="bg-[#202c33]/95 backdrop-blur-md px-3 sm:px-4 py-3 flex items-center space-x-2 sm:space-x-3 border-t border-white/5 relative z-10">
        {isRecording ? (
          /* VOICE NOTE RECORDING BAR */
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-[#182229] rounded-full border border-rose-500/30 shadow-lg animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-xs font-semibold text-rose-400 tracking-wide">
                Recording audio... {formatSecs(recordDuration)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-wa-muted hover:text-rose-400 rounded-full hover:bg-white/5 transition-colors"
                title="Cancel recording"
              >
                <X className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={stopAndSendRecording}
                className="p-2.5 bg-gradient-to-tr from-[#00a884] to-[#25d366] text-white rounded-full shadow-lg shadow-[#00a884]/30 hover:scale-105 active:scale-95 transition-all"
                title="Send Voice Note"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* REGULAR MESSAGE INPUT */
          <>
            <div className="flex items-center space-x-1 text-[#8696a0]">
              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 rounded-full transition-all duration-200 ${
                  showEmojiPicker
                    ? 'text-emerald-400 bg-white/10'
                    : 'hover:text-[#e9edef] hover:bg-white/5'
                }`}
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Paperclip Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:text-[#e9edef] hover:bg-white/5 rounded-full transition-all duration-200"
                title="Attach Photo"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Modern Pill Input Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2 sm:space-x-3">
              <div className="flex-1 flex items-center bg-[#2a3942] hover:bg-[#32424b] focus-within:!bg-[#2a3942] rounded-full px-4 py-2 border border-white/5 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200 shadow-inner">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Type a message"
                  style={{ backgroundColor: 'transparent' }}
                  className="w-full !bg-transparent text-[#e9edef] placeholder-[#8696a0] text-sm focus:outline-none border-none py-0.5"
                />
              </div>

              {/* Send / Mic Button */}
              {inputText.trim() ? (
                <button
                  type="submit"
                  className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-3 bg-[#2a3942] hover:bg-emerald-500 text-[#8696a0] hover:text-white rounded-full border border-white/5 hover:border-transparent transition-all duration-200 hover:scale-105 active:scale-95 shadow-md flex items-center justify-center flex-shrink-0 group"
                  title="Hold or tap to record voice note"
                >
                  <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </form>
          </>
        )}
      </footer>
    </main>
  );
}
