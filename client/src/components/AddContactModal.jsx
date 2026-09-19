import React, { useState, useEffect, useCallback } from 'react';
import { contactAPI } from '../services/api';
import { Search, UserPlus, Check, Clock, X, CheckCheck, Info } from 'lucide-react';

export default function AddContactModal({
  isOpen,
  onClose,
  onRequestSent,
  onAcceptDirect,
  onViewProfile
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const loadUsers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const res = await contactAPI.searchUsers(query);
      setResults(res.data.users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all users immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers(searchTerm.trim());
    }
  }, [isOpen, loadUsers]);

  // Debounced search when searchTerm changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      loadUsers(searchTerm.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, loadUsers]);

  const handleSendRequest = async (user) => {
    setActionLoading((prev) => ({ ...prev, [user.id]: true }));
    try {
      await contactAPI.sendRequest({ receiverId: user.id });
      setResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, relationship: 'pending_sent' } : u))
      );
      if (onRequestSent) onRequestSent();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const handleAcceptRequest = async (user) => {
    if (!user.requestId) return;
    setActionLoading((prev) => ({ ...prev, [user.id]: true }));
    try {
      await contactAPI.respondRequest(user.requestId, 'accept');
      setResults((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, relationship: 'accepted' } : u))
      );
      if (onAcceptDirect) onAcceptDirect(user.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-wa-panel border border-wa-border rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-wa-border">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-wa-green" />
            <h3 className="font-semibold text-wa-text text-base">Find & Add Contacts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-wa-muted hover:text-wa-text hover:bg-wa-hover rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Field */}
        <div className="mt-4">
          <div className="relative flex items-center bg-wa-bg rounded-lg px-3 py-2 border border-wa-border">
            <Search className="w-4 h-4 text-wa-muted mr-2 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-transparent text-sm text-wa-text placeholder-wa-muted focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-wa-muted hover:text-wa-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-wa-muted mt-1 px-1">
            Tap on any user to view their full details, or click 'Send Request' to connect.
          </p>
        </div>

        {/* Results List */}
        <div className="mt-4 flex-1 overflow-y-auto divide-y divide-wa-border/40">
          {loading ? (
            <div className="py-8 text-center text-xs text-wa-muted">
              <div className="w-6 h-6 border-2 border-wa-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching users...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-wa-muted italic">
              {searchTerm ? 'No users found matching your search' : 'No other users registered yet'}
            </div>
          ) : (
            results.map((u) => {
              const isActioning = actionLoading[u.id];

              return (
                <div key={u.id} className="py-3 flex items-center justify-between group">
                  {/* Clickable user profile area */}
                  <div
                    onClick={() => onViewProfile && onViewProfile(u)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition pr-2"
                    title="Click to view profile details"
                  >
                    <img
                      src={u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                      alt={u.username}
                      className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-wa-border flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-sm font-semibold text-wa-text truncate group-hover:text-wa-green transition">
                          {u.username}
                        </h4>
                        <Info className="w-3.5 h-3.5 text-wa-muted opacity-60 group-hover:opacity-100" />
                      </div>
                      <span className="text-[11px] text-wa-muted capitalize">
                        {u.status || 'offline'} • View Profile
                      </span>
                    </div>
                  </div>

                  {/* Relationship Action Button */}
                  <div className="flex-shrink-0 ml-2">
                    {u.relationship === 'accepted' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-wa-green bg-wa-green/10 border border-wa-green/20">
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        Connected
                      </span>
                    ) : u.relationship === 'pending_sent' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-wa-muted bg-wa-bg border border-wa-border">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Request Sent
                      </span>
                    ) : u.relationship === 'pending_received' ? (
                      <button
                        onClick={() => handleAcceptRequest(u)}
                        disabled={isActioning}
                        className="px-3 py-1 bg-wa-green hover:bg-wa-greenDark text-white text-xs font-medium rounded-lg shadow transition flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(u)}
                        disabled={isActioning}
                        className="px-3 py-1.5 bg-wa-green hover:bg-wa-greenDark text-white text-xs font-medium rounded-lg shadow transition flex items-center space-x-1 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isActioning ? 'Sending...' : 'Send Request'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
