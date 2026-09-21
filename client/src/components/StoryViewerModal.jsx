import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { storyAPI } from '../services/api';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Eye,
  ChevronUp,
  Users,
  Check,
  Trash2
} from 'lucide-react';

export default function StoryViewerModal({ storyGroup, isOpen, onClose, onStoryDeleted }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const viewedStoryIdsRef = useRef(new Set());

  const stories = storyGroup?.stories || (storyGroup?.id ? [storyGroup] : []);
  const currentStory = stories[currentIndex];

  const isOwner =
    user &&
    (Number(storyGroup?.userId) === Number(user.id) ||
      Number(currentStory?.user_id) === Number(user.id) ||
      storyGroup?.username === 'My Status');

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setShowViewersSheet(false);
    setViewers([]);
  }, [storyGroup]);

  // When viewing a contact's story, record view once
  useEffect(() => {
    if (!isOpen || !currentStory || !user) return;

    if (!isOwner && !viewedStoryIdsRef.current.has(currentStory.id)) {
      viewedStoryIdsRef.current.add(currentStory.id);
      storyAPI.recordView(currentStory.id).catch((err) => {
        console.warn('Failed to record story view:', err);
      });
    }
  }, [isOpen, currentStory?.id, user?.id, isOwner]);

  // Fetch viewers when owner opens a story or opens the sheet
  const fetchViewers = async (storyId) => {
    if (!storyId) return;
    try {
      setLoadingViewers(true);
      const res = await storyAPI.getViewers(storyId);
      setViewers(res.data.viewers || []);
    } catch (err) {
      console.error('Failed to fetch story viewers:', err);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Progress timer for text & image stories (5 seconds)
  useEffect(() => {
    if (!isOpen || !currentStory || showViewersSheet) return;

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
  }, [isOpen, currentIndex, currentStory?.id, currentStory?.media_type, showViewersSheet]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setShowViewersSheet(false);
      setViewers([]);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setShowViewersSheet(false);
      setViewers([]);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (showViewersSheet) return;
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleDeleteCurrentStory = async () => {
    if (!currentStory?.id) return;
    if (!window.confirm('Are you sure you want to delete this status update?')) return;

    try {
      await storyAPI.deleteStory(currentStory.id);
      if (onStoryDeleted) onStoryDeleted(currentStory.id);
      if (stories.length > 1) {
        if (currentIndex >= stories.length - 1) {
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to delete status';
      alert(errMsg);
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

            {isOwner && (
              <button
                onClick={handleDeleteCurrentStory}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full transition"
                title="Delete this status"
              >
                <Trash2 className="w-5 h-5" />
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

        {/* Bottom Area: Views counter for Owner & tap indicators */}
        <div className="flex flex-col items-center justify-center z-20 space-y-1">
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowViewersSheet(true);
                fetchViewers(currentStory.id);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-md border border-white/15 text-white text-xs font-medium transition shadow-lg"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentStory.view_count ?? viewers.length}</span>
              <span className="text-white/70">views</span>
              <ChevronUp className="w-3 h-3 text-white/50 ml-0.5" />
            </button>
          )}

          <div className="text-center text-[11px] text-white/60">
            {isOwner ? 'Tap views to see who viewed' : 'Tap right for next, left for previous'}
          </div>
        </div>

        {/* Slide-up Viewers Bottom Sheet for Story Owner */}
        {showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 max-h-[75%] bg-slate-900/95 backdrop-blur-xl border-t border-white/15 rounded-t-2xl z-40 flex flex-col shadow-2xl animate-fadeIn">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Viewed by ({viewers.length})
                </h3>
              </div>
              <button
                onClick={() => setShowViewersSheet(false)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Content: List of Viewers */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[260px]">
              {loadingViewers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading viewers...
                </div>
              ) : viewers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium text-slate-300">No views yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When your contacts view this status, they will appear here.
                  </p>
                </div>
              ) : (
                viewers.map((viewer) => {
                  const viewTime = new Date(viewer.viewed_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div
                      key={viewer.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={
                            viewer.avatar_url ||
                            'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
                          }
                          alt={viewer.username}
                          className="w-9 h-9 rounded-full object-cover bg-slate-700 border border-white/10"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate">
                            {viewer.username}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Viewed at {viewTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-emerald-400 text-xs font-medium pr-1">
                        <Check className="w-3.5 h-3.5 mr-0.5" />
                        <span>Seen</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
