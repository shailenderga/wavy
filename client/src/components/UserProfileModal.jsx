import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { contactAPI } from '../services/api';
import {
  X,
  Mail,
  Calendar,
  ShieldCheck,
  MessageSquare,
  UserPlus,
  Clock,
  Check,
  CheckCheck,
  Edit2,
  Info
} from 'lucide-react';

export default function UserProfileModal({
  user: profileUser,
  isOpen,
  onClose,
  onStartChat,
  onContactUpdated,
  onOpenEditProfile
}) {
  const { user: currentUser } = useAuth();
  const { onlineUserIds } = useSocket();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !profileUser) return null;

  const isSelf = profileUser.id === currentUser?.id;
  const isOnline = onlineUserIds.has(profileUser.id);
  const formattedDate = profileUser.created_at
    ? new Date(profileUser.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently';

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      await contactAPI.sendRequest({ receiverId: profileUser.id });
      if (onContactUpdated) onContactUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!profileUser.requestId) return;
    setLoading(true);
    try {
      await contactAPI.respondRequest(profileUser.requestId, 'accept');
      if (onContactUpdated) onContactUpdated();
      if (onStartChat) onStartChat(profileUser.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-wa-panel border border-wa-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 bg-wa-header px-4 flex items-center justify-between border-b border-wa-border">
          <h3 className="text-sm font-semibold text-wa-text">Contact Info</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-wa-muted hover:text-wa-text hover:bg-wa-hover rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 flex flex-col items-center text-center bg-wa-bg">
          {/* Large Avatar */}
          <div className="relative mb-4 group">
            <img
              src={profileUser.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
              alt={profileUser.username}
              className="w-24 h-24 rounded-full bg-slate-800 object-cover ring-2 ring-white/10 group-hover:ring-emerald-500/50 shadow-xl transition-all duration-200"
            />
            {isOnline && (
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-wa-bg shadow-sm" />
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-wa-text tracking-tight">
            {profileUser.username}
          </h2>
          <span
            className={`text-xs mt-0.5 font-medium ${
              isOnline ? 'text-wa-green' : 'text-wa-muted'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {/* Quick Chat / Request Action */}
          <div className="w-full mt-5">
            {isSelf ? (
              <button
                onClick={() => {
                  onClose();
                  if (onOpenEditProfile) onOpenEditProfile();
                }}
                className="w-full py-2.5 bg-wa-green hover:bg-wa-greenDark text-white text-sm font-medium rounded-xl shadow transition flex items-center justify-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile & Change DP</span>
              </button>
            ) : profileUser.relationship === 'accepted' ? (
              <button
                onClick={() => {
                  onClose();
                  if (onStartChat) onStartChat(profileUser.id);
                }}
                className="w-full py-2.5 bg-wa-green hover:bg-wa-greenDark text-white text-sm font-medium rounded-xl shadow transition flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message @{profileUser.username}</span>
              </button>
            ) : profileUser.relationship === 'pending_sent' ? (
              <div className="py-2.5 bg-wa-panel text-wa-muted text-xs font-medium rounded-xl border border-wa-border flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Contact Request Pending</span>
              </div>
            ) : profileUser.relationship === 'pending_received' ? (
              <button
                onClick={handleAcceptRequest}
                disabled={loading}
                className="w-full py-2.5 bg-wa-green hover:bg-wa-greenDark text-white text-sm font-medium rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Accepting...' : 'Accept Request & Chat'}</span>
              </button>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="w-full py-2.5 bg-wa-green hover:bg-wa-greenDark text-white text-sm font-medium rounded-xl shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Send Contact Request'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Info List */}
        <div className="p-4 space-y-3 bg-wa-panel border-t border-wa-border text-left">
          {/* About / Status */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="p-2 rounded-lg bg-wa-bg text-wa-muted flex-shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-wa-muted uppercase font-medium">About</p>
              <p className="text-xs text-wa-text font-normal truncate">
                {profileUser.about || 'Hey there! I am using WhatsApp.'}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="p-2 rounded-lg bg-wa-bg text-wa-muted flex-shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-wa-muted uppercase font-medium">Email</p>
              <p className="text-xs text-wa-text truncate font-normal">
                {profileUser.email || 'Private'}
              </p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="p-2 rounded-lg bg-wa-bg text-wa-muted flex-shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-wa-muted uppercase font-medium">Joined</p>
              <p className="text-xs text-wa-text font-normal">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="p-2 rounded-lg bg-wa-bg text-wa-muted flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-wa-muted uppercase font-medium">Chat Status</p>
              <p className="text-xs text-wa-text font-normal">
                {isSelf
                  ? 'Your Account'
                  : profileUser.relationship === 'accepted'
                  ? 'Connected (Chat Enabled)'
                  : profileUser.relationship === 'pending_sent'
                  ? 'Request Sent'
                  : profileUser.relationship === 'pending_received'
                  ? 'Sent You a Request'
                  : 'Not Connected'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
