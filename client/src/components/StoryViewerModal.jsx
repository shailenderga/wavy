import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

export default function StoryViewerModal({ storyGroup, isOpen, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const stories = storyGroup?.stories || (storyGroup?.id ? [storyGroup] : []);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
  }, [storyGroup]);

  // Progress timer for text & image stories (5 seconds)
  useEffect(() => {
    if (!isOpen || !currentStory) return;

    setProgress(0);

    // If video, we let the video's onTimeUpdate handle progress
    if (currentStory.media_type === 'video') {
      return;
    }

    const interval = 50; // update every 50ms
    const totalDuration = 5000; // 5000ms = 5 seconds
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timerRef.current);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentIndex, currentStory?.id, currentStory?.media_type]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  if (!isOpen || !currentStory) return null;

  const timeFormatted = new Date(currentStory.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isMedia = currentStory.media_type === 'image' || currentStory.media_type === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6 select-none animate-fadeIn">
      <div
        className="w-full max-w-md h-[580px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col justify-between p-5 relative overflow-hidden transition-colors duration-300 border border-white/10"
        style={{
          backgroundColor: isMedia ? '#000000' : currentStory.background_color || '#005c4b'
        }}
      >
        {/* Top Progress Bars (One for each story) */}
        <div className="flex gap-1.5 w-full z-20">
          {stories.map((s, idx) => (
            <div
              key={s.id}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info Header */}
        <div className="flex items-center justify-between mt-3 z-20">
          <div className="flex items-center space-x-3">
            <img
              src={
                storyGroup?.avatar_url ||
                currentStory.avatar_url ||
                'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
              }
              alt={storyGroup?.username || currentStory.username}
              className="w-10 h-10 rounded-full bg-slate-800 object-cover border-2 border-white/80 shadow"
            />
            <div>
              <h4 className="text-sm font-semibold text-white truncate max-w-[180px]">
                {storyGroup?.username || currentStory.username}
              </h4>
              <span className="text-[11px] text-white/80">
                Today at {timeFormatted}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {currentStory.media_type === 'video' && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-black/30 rounded-full transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-black/30 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Story Content: Text, Image, or Video */}
        <div className="my-auto w-full h-full max-h-[420px] flex items-center justify-center relative overflow-hidden">
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain rounded-xl"
            />
          ) : currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleNext}
              className="w-full h-full object-contain rounded-xl"
            />
          ) : (
            <p className="text-2xl sm:text-3xl font-medium text-white break-words text-center px-4 leading-relaxed whitespace-pre-wrap">
              {currentStory.content}
            </p>
          )}

          {/* Caption Overlay */}
          {isMedia && (currentStory.caption || currentStory.content) && (
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center">
              <p className="text-sm font-medium text-white break-words">
                {currentStory.caption || currentStory.content}
              </p>
            </div>
          )}
        </div>

        {/* Click Areas for Next / Previous navigation */}
        <div
          onClick={handlePrev}
          className="absolute inset-y-16 left-0 w-1/3 cursor-pointer z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition"
        >
          {currentIndex > 0 && (
            <div className="p-2 bg-black/40 rounded-full text-white">
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
        </div>

        <div
          onClick={handleNext}
          className="absolute inset-y-16 right-0 w-1/3 cursor-pointer z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition"
        >
          <div className="p-2 bg-black/40 rounded-full text-white">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="text-center text-[11px] text-white/60 z-20">
          Tap right for next, left for previous
        </div>
      </div>
    </div>
  );
}
