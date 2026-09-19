import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  X,
  Camera,
  Check,
  Edit2,
  Mail,
  User,
  Info,
  Sparkles,
  Trash2,
  Smile
} from 'lucide-react';

const ABOUT_PRESETS = [
  'Hey there! I am using WhatsApp.',
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Battery about to die',
  'Can’t talk, WhatsApp only',
  'Sleeping'
];

export default function EditProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const { user, updateUser, logout } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAbout(user.about || 'Hey there! I am using WhatsApp.');
      setAvatarUrl(user.avatar_url || '');
      setError('');
      setSuccessMsg('');
      setIsEditingName(false);
      setIsEditingAbout(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle Photo Upload from device
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Randomize DiceBear avatar
  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username || 'User')}`);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }
    if (!email.trim()) {
      setError('Email cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await authAPI.updateProfile({
        username: username.trim(),
        email: email.trim(),
        avatar_url: avatarUrl,
        about: about.trim()
      });

      const { user: updatedUser, token } = res.data;
      updateUser(updatedUser, token);
      setSuccessMsg('Profile updated successfully!');

      if (onProfileUpdated) onProfileUpdated(updatedUser);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteAccount();
      setShowDeleteConfirm(false);
      onClose();
      logout();
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert(err.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-wa-panel border border-wa-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* WhatsApp Header */}
        <div className="h-14 bg-wa-header px-5 flex items-center justify-between border-b border-wa-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-wa-green" />
            <h3 className="text-base font-semibold text-wa-text">Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-wa-muted hover:text-wa-text hover:bg-wa-hover rounded-full transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto space-y-6 bg-wa-bg">
          {/* Error & Success Messages */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-wa-green/10 border border-wa-green/30 rounded-xl text-wa-green text-xs font-medium flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Picture (DP) Section */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                alt="Profile DP"
                className="w-32 h-32 rounded-full object-cover border-4 border-wa-border group-hover:border-wa-green shadow-xl transition"
              />

              {/* Camera Hover Overlay */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 text-white"
                title="Change profile photo"
              >
                <Camera className="w-7 h-7 mb-1 text-wa-green" />
                <span className="text-[11px] font-medium uppercase tracking-wider">CHANGE DP</span>
              </div>

              {/* Floating Camera Button (always visible on mobile) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2.5 bg-wa-green hover:bg-wa-greenDark text-white rounded-full shadow-lg border-2 border-wa-panel transition transform hover:scale-105"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Quick Photo Actions */}
            <div className="flex items-center space-x-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-wa-panel hover:bg-wa-hover border border-wa-border text-wa-text rounded-lg text-xs font-medium transition flex items-center space-x-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-wa-green" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="px-3 py-1.5 bg-wa-panel hover:bg-wa-hover border border-wa-border text-wa-text rounded-lg text-xs font-medium transition flex items-center space-x-1.5"
                title="Randomize Avatar"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Randomize</span>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="p-1.5 bg-wa-panel hover:bg-rose-500/20 border border-wa-border hover:border-rose-500/40 text-wa-muted hover:text-rose-400 rounded-lg transition"
                title="Remove Photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Name / Username Section */}
          <div className="bg-wa-panel border border-wa-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-wa-green font-semibold">
              <span>Your name</span>
              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                className="text-wa-muted hover:text-wa-green transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  maxLength={50}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 bg-wa-bg border-b-2 border-wa-green text-wa-text px-2 py-1.5 text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1.5 text-wa-green hover:bg-wa-hover rounded-full transition"
                  title="Done"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="text-sm font-medium text-wa-text cursor-pointer hover:text-wa-green transition py-1"
              >
                {username || 'No name set'}
              </div>
            )}

            <p className="text-[11px] text-wa-muted leading-relaxed">
              This is not your username or pin. This name will be visible to your WhatsApp contacts.
            </p>
          </div>

          {/* About / Bio Section */}
          <div className="bg-wa-panel border border-wa-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-wa-green font-semibold">
              <span>About</span>
              <button
                type="button"
                onClick={() => setIsEditingAbout(!isEditingAbout)}
                className="text-wa-muted hover:text-wa-green transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingAbout ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    maxLength={100}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Hey there! I am using WhatsApp."
                    className="flex-1 bg-wa-bg border-b-2 border-wa-green text-wa-text px-2 py-1.5 text-sm focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingAbout(false)}
                    className="p-1.5 text-wa-green hover:bg-wa-hover rounded-full transition"
                    title="Done"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ABOUT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAbout(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                        about === preset
                          ? 'bg-wa-green/20 border-wa-green text-wa-green font-medium'
                          : 'bg-wa-bg border-wa-border text-wa-muted hover:text-wa-text'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingAbout(true)}
                className="text-sm text-wa-text cursor-pointer hover:text-wa-green transition py-1"
              >
                {about || 'Hey there! I am using WhatsApp.'}
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="bg-wa-panel border border-wa-border rounded-2xl p-4 space-y-2">
            <span className="text-xs text-wa-green font-semibold">Email</span>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-wa-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="flex-1 bg-transparent text-sm text-wa-text border-b border-wa-border focus:border-wa-green focus:outline-none py-1"
              />
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                  Delete Account
                </h4>
                <p className="text-[11px] text-wa-muted mt-0.5">
                  Permanently delete your WhatsApp account and chats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/40 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Modern Created By Badge */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-wa-panel border border-wa-border shadow-xs">
              <span className="w-2 h-2 rounded-full bg-wa-green animate-pulse" />
              <span className="text-[11px] font-medium text-wa-muted">
                Created by <span className="text-wa-green font-semibold">Shailender Gautam</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-wa-header border-t border-wa-border flex items-center justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-sm text-wa-muted hover:text-wa-text transition font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-wa-green hover:bg-wa-greenDark text-white text-sm font-semibold rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{loading ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-wa-panel border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-wa-text">Delete Account?</h3>
            <p className="text-xs text-wa-muted leading-relaxed">
              Are you sure you want to permanently delete your account? All your chats, messages, and contact requests will be permanently erased. This cannot be undone.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-wa-bg hover:bg-wa-hover text-wa-muted hover:text-wa-text rounded-xl text-xs font-medium border border-wa-border transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {deleting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Yes, Delete My Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
