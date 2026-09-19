import React, { useState, useRef } from 'react';
import { storyAPI } from '../services/api';
import { X, Send, Image, Video, Type, Upload } from 'lucide-react';

const STORY_COLORS = [
  '#005c4b', // WhatsApp Dark Teal
  '#128c7e', // Teal Green
  '#7b1fa2', // Purple
  '#c2185b', // Magenta
  '#d32f2f', // Red
  '#f57c00', // Orange
  '#1976d2', // Blue
  '#388e3c'  // Green
];

export default function CreateStoryModal({ isOpen, onClose, onStoryCreated }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'image', 'video'
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedColor, setSelectedColor] = useState(STORY_COLORS[0]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle local image or video file upload via FileReader (base64)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('File size too large! Please choose a file under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'text' && !content.trim()) return;
    if (activeTab !== 'text' && !mediaUrl) {
      alert('Please upload an image or video first!');
      return;
    }

    setLoading(true);
    try {
      await storyAPI.createStory({
        content: activeTab === 'text' ? content.trim() : caption.trim(),
        backgroundColor: selectedColor,
        mediaUrl: activeTab !== 'text' ? mediaUrl : null,
        mediaType: activeTab,
        caption: caption.trim() || null
      });

      setContent('');
      setCaption('');
      setMediaUrl('');
      if (onStoryCreated) onStoryCreated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div
        className="w-full max-w-md h-[540px] rounded-2xl shadow-2xl flex flex-col justify-between p-6 transition-colors duration-300 relative border border-white/10"
        style={{ backgroundColor: activeTab === 'text' ? selectedColor : '#111b21' }}
      >
        {/* Top Header & Tab Switcher */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('text');
                setMediaUrl('');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition flex items-center space-x-1 ${
                activeTab === 'text' ? 'bg-wa-green text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('image');
                setMediaUrl('');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition flex items-center space-x-1 ${
                activeTab === 'image' ? 'bg-wa-green text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('video');
                setMediaUrl('');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition flex items-center space-x-1 ${
                activeTab === 'video' ? 'bg-wa-green text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Content: Text OR Media Preview */}
        <div className="my-auto w-full flex flex-col items-center justify-center">
          {activeTab === 'text' ? (
            <textarea
              autoFocus
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a status..."
              maxLength={250}
              className="w-full bg-transparent text-white text-2xl sm:text-3xl font-medium text-center placeholder-white/50 resize-none focus:outline-none leading-relaxed"
            />
          ) : (
            <div className="w-full flex flex-col items-center">
              {mediaUrl ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                  {activeTab === 'image' ? (
                    <img
                      src={mediaUrl}
                      alt="Story preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      controls
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 rounded-xl border-2 border-dashed border-white/30 hover:border-wa-green flex flex-col items-center justify-center cursor-pointer transition p-4 text-center bg-black/20"
                >
                  <Upload className="w-10 h-10 text-wa-green mb-2" />
                  <p className="text-sm font-semibold text-white">
                    Upload {activeTab === 'image' ? 'Photo' : 'Video'}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Tap to browse from your device
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Caption Input */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={100}
                className="w-full mt-3 px-4 py-2 bg-black/30 border border-white/20 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:border-wa-green"
              />
            </div>
          )}
        </div>

        {/* Bottom Bar: Colors & Send Button */}
        <div className="space-y-3 z-10">
          {activeTab === 'text' && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {STORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform transform ${
                    selectedColor === color
                      ? 'border-white scale-125 shadow-lg'
                      : 'border-white/40 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <span className="text-xs text-white/70">
              {activeTab === 'text'
                ? `${content.length}/250 • 24h`
                : `${activeTab.toUpperCase()} • 24h`}
            </span>

            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                (activeTab === 'text' && !content.trim()) ||
                (activeTab !== 'text' && !mediaUrl)
              }
              className="p-3 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-40 rounded-full shadow-lg transition transform hover:scale-105 flex items-center justify-center"
              title="Post Status"
            >
              <Send className="w-5 h-5 text-wa-green fill-wa-green" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
