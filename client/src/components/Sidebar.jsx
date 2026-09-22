import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  UserPlus,
  MoreVertical,
  Search,
  LogOut,
  X,
  Check,
  Inbox,
  Plus,
  CircleDot,
  Radio,
  User,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Trash2
} from 'lucide-react';

export default function Sidebar({
  contacts = [],
  pendingRequests = [],
  myStories = [],
  contactStories = [],
  calls = [],
  onDeleteCall,
  onClearCalls,
  onStartCall,
  activeRoom,
  onSelectRoom,
  onStartDirectMessage,
  onOpenAddContact,
  onAcceptRequest,
  onRejectRequest,
  onViewProfile,
  onCreateStory,
  onViewStory,
  onOpenEditProfile
}) {
  const { user, logout } = useAuth();
  const { onlineUserIds } = useSocket();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('direct'); // 'direct', 'status', 'calls', 'requests'
  const [showMenu, setShowMenu] = useState(false);

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (secs) => {
    if (!secs || secs <= 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatCallTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today, ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  };

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full ios-glass border-r border-white/10 flex flex-col flex-shrink-0 select-none">
      {/* iOS Wavy Header */}
      <header className="h-16 ios-header-glass px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div
            onClick={() => onOpenEditProfile && onOpenEditProfile()}
            title="Edit my profile & DP"
            className="relative cursor-pointer hover:opacity-90 transition group flex-shrink-0 ios-tap"
          >
            <img
              src={user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
              alt={user?.username}
              className="w-10 h-10 rounded-full bg-slate-800 object-cover ring-1 ring-white/15 group-hover:ring-emerald-500/50 shadow-sm transition-all duration-200"
            />
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-sm" />
            </span>
          </div>
          <div
            onClick={() => onOpenEditProfile && onOpenEditProfile()}
            className="cursor-pointer hover:opacity-85 transition"
            title="Click to edit profile"
          >
            <h3 className="font-semibold text-sm text-wa-text tracking-tight truncate max-w-[130px]">
              {user?.full_name || user?.username}
            </h3>
            <span className="text-[11px] text-wa-green font-medium">online • edit profile</span>
          </div>
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center space-x-1 text-wa-muted">
          {/* Status / Story Create Button */}
          <button
            onClick={onCreateStory}
            title="Add Status (Story)"
            className="p-2 hover:text-wa-text hover:bg-white/10 rounded-full transition relative ios-tap"
          >
            <CircleDot className="w-5 h-5 text-wa-green" />
          </button>

          {/* Add Contact / Search User Button */}
          <button
            onClick={onOpenAddContact}
            title="Find & Add Users"
            className="p-2 hover:text-wa-text hover:bg-white/10 rounded-full transition relative ios-tap"
          >
            <UserPlus className="w-5 h-5 text-wa-muted hover:text-wa-green" />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Menu"
              className="p-2 hover:text-wa-text hover:bg-white/10 rounded-full transition ios-tap"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-44 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl py-1.5 z-50 text-sm">
                <button
                  onClick={() => {
                    if (onOpenEditProfile) onOpenEditProfile();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-white/10 flex items-center space-x-2 transition ios-tap"
                >
                  <User className="w-4 h-4 text-wa-green" />
                  <span>Profile & DP</span>
                </button>
                <button
                  onClick={() => {
                    onCreateStory();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-white/10 flex items-center space-x-2 transition ios-tap"
                >
                  <CircleDot className="w-4 h-4 text-wa-green" />
                  <span>Add Status</span>
                </button>
                <button
                  onClick={() => {
                    onOpenAddContact();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-white/10 flex items-center space-x-2 transition ios-tap"
                >
                  <UserPlus className="w-4 h-4 text-wa-green" />
                  <span>Find Contacts</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={logout}
                  className="w-full px-4 py-2 text-left text-rose-400 hover:bg-white/10 flex items-center space-x-2 transition ios-tap"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* iOS Search Bar & Segmented Control */}
      <div className="p-3 border-b border-white/10 bg-transparent">
        <div className="relative flex items-center ios-search-bar px-3 py-2 border border-white/10 focus-within:border-emerald-400/50 transition">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-transparent text-[14px] text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-white ios-tap">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* iOS Segmented Control Tabs */}
        <div className="flex items-center ios-segmented-container mt-2.5">
          {[
            { id: 'direct', label: 'Chats' },
            {
              id: 'status',
              label: 'Status',
              badge: contactStories.length > 0
            },
            {
              id: 'calls',
              label: 'Calls',
              badge: calls.some((c) => c.status === 'missed' && c.receiver_id === user?.id)
            },
            {
              id: 'requests',
              label: `Requests ${pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}`,
              badge: pendingRequests.length > 0
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-[9px] text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ios-tap ${
                activeTab === tab.id
                  ? 'ios-segmented-item-active'
                  : 'ios-segmented-item-inactive'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content List */}
      <div className="flex-1 overflow-y-auto divide-y divide-wa-border/50">
        {/* STATUS (STORIES) TAB */}
        {activeTab === 'status' && (
          <div className="p-3 space-y-4">
            {/* My Status Card */}
            <div>
              <span className="text-[11px] font-semibold text-wa-muted uppercase tracking-wider px-1">
                My Status
              </span>

              <div className="mt-2 p-3 bg-wa-panel rounded-xl border border-wa-border flex items-center justify-between">
                <div
                  onClick={() => {
                    if (myStories.length > 0) {
                      onViewStory({
                        username: 'My Status',
                        avatar_url: user?.avatar_url,
                        stories: myStories
                      });
                    } else {
                      onCreateStory();
                    }
                  }}
                  className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                      alt="My Status"
                      className={`w-12 h-12 rounded-full object-cover ${
                        myStories.length > 0
                          ? 'border-2 border-wa-green p-0.5'
                          : 'border border-wa-border'
                      }`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateStory();
                      }}
                      className="absolute bottom-0 right-0 w-4 h-4 bg-wa-green text-white rounded-full flex items-center justify-center border-2 border-wa-panel shadow"
                      title="Add status"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-wa-text truncate">
                      My Status
                    </h4>
                    <p className="text-xs text-wa-muted truncate mt-0.5">
                      {myStories.length > 0
                        ? `${myStories.length} update${myStories.length > 1 ? 's' : ''}${
                            myStories.reduce((acc, s) => acc + (s.view_count || 0), 0) > 0
                              ? ` • ${myStories.reduce((acc, s) => acc + (s.view_count || 0), 0)} view${myStories.reduce((acc, s) => acc + (s.view_count || 0), 0) > 1 ? 's' : ''}`
                              : ' • Tap to view'
                          }`
                        : 'Tap to add status update'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onCreateStory}
                  className="p-2 bg-wa-bg hover:bg-wa-hover text-wa-green rounded-xl border border-wa-border transition ml-2 flex-shrink-0"
                  title="Create new status"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recent Updates from Contacts */}
            <div>
              <span className="text-[11px] font-semibold text-wa-muted uppercase tracking-wider px-1">
                Recent Updates ({contactStories.length})
              </span>

              {contactStories.length === 0 ? (
                <div className="py-10 text-center text-wa-muted">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-50 text-wa-muted" />
                  <p className="text-xs">No recent status updates</p>
                  <p className="text-[11px] mt-1 text-wa-muted/70">
                    When your contacts post a story, it will appear here for 24 hours.
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  {contactStories.map((group) => {
                    const timeAgo = new Date(group.lastStoryAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={`story-user-${group.userId}`}
                        onClick={() => onViewStory(group)}
                        className="p-2.5 rounded-xl hover:bg-wa-hover cursor-pointer transition flex items-center space-x-3"
                      >
                        {/* WhatsApp Green Ring around Avatar */}
                        <div className="p-0.5 rounded-full border-2 border-wa-green flex-shrink-0">
                          <img
                            src={group.avatar_url}
                            alt={group.username}
                            className="w-11 h-11 rounded-full object-cover bg-slate-800"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-wa-text truncate">
                            {group.username}
                          </h4>
                          <p className="text-xs text-wa-muted truncate mt-0.5">
                            Today at {timeAgo} • {group.stories.length} update{group.stories.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALLS HISTORY TAB */}
        {activeTab === 'calls' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-wa-muted uppercase tracking-wider">
                Call History ({calls.length})
              </span>
              {calls.length > 0 && onClearCalls && (
                <button
                  onClick={onClearCalls}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium transition flex items-center gap-1 ios-tap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {calls.length === 0 ? (
              <div className="py-12 text-center text-wa-muted">
                <Phone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No call history yet</p>
                <p className="text-[11px] mt-1 text-wa-muted/70">
                  When you make or receive audio and video calls, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {calls
                  .filter((c) => {
                    const isCaller = c.caller_id === user?.id;
                    const otherName = isCaller
                      ? (c.receiver_full_name || c.receiver_username)
                      : (c.caller_full_name || c.caller_username);
                    return !search || otherName?.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((call) => {
                    const isCaller = call.caller_id === user?.id;
                    const otherUserId = isCaller ? call.receiver_id : call.caller_id;
                    const otherName = isCaller
                      ? (call.receiver_full_name || call.receiver_username)
                      : (call.caller_full_name || call.caller_username);
                    const otherAvatar = isCaller ? call.receiver_avatar : call.caller_avatar;
                    const isVideo = call.call_type === 'video';
                    const isMissed = call.status === 'missed' || call.status === 'rejected';

                    return (
                      <div
                        key={`call-${call.id}`}
                        className="group p-2.5 rounded-xl hover:bg-white/[0.06] transition flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <img
                            src={otherAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                            alt={otherName}
                            className="w-11 h-11 rounded-full bg-slate-800 object-cover ring-1 ring-white/10 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-sm font-semibold truncate ${isMissed && !isCaller ? 'text-rose-400' : 'text-wa-text'}`}>
                              {otherName}
                            </h4>
                            <div className="flex items-center space-x-1.5 text-xs text-wa-muted mt-0.5">
                              {isMissed ? (
                                <PhoneMissed className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                              ) : isCaller ? (
                                <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                              ) : (
                                <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              )}
                              <span>{formatCallTime(call.created_at)}</span>
                              {call.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(call.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Call Actions */}
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <button
                            onClick={() =>
                              onStartCall &&
                              onStartCall({
                                targetUserId: otherUserId,
                                targetUserName: otherName,
                                targetUserAvatar: otherAvatar,
                                callType: call.call_type
                              })
                            }
                            title={`Call back (${call.call_type})`}
                            className="p-2 text-wa-green hover:bg-emerald-500/15 rounded-lg transition ios-tap"
                          >
                            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </button>

                          {onDeleteCall && (
                            <button
                              onClick={() => onDeleteCall(call.id)}
                              title="Delete log"
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg opacity-0 group-hover:opacity-100 transition ios-tap"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-wa-muted uppercase tracking-wider">
                Pending Requests ({pendingRequests.length})
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="py-12 text-center text-wa-muted">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No pending requests</p>
                <p className="text-[11px] mt-1 text-wa-muted/70">
                  When someone sends you a contact request, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.request_id}
                    className="p-3 bg-wa-panel rounded-xl border border-wa-border flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={req.avatar_url}
                        alt={req.username}
                        className="w-10 h-10 rounded-full bg-slate-800 object-cover border border-wa-border flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-wa-text truncate">
                          {req.full_name || req.username}
                        </h4>
                        <span className="text-[11px] text-wa-muted">
                          @{req.username} • Wants to connect
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                      <button
                        onClick={() => onAcceptRequest(req.request_id)}
                        title="Accept"
                        className="p-2 bg-wa-green hover:bg-wa-greenDark text-white rounded-lg transition shadow"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.request_id)}
                        title="Reject"
                        className="p-2 bg-wa-bg hover:bg-rose-500/20 text-wa-muted hover:text-rose-400 rounded-lg border border-wa-border transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHATS TAB (DIRECT MESSAGES - ACCEPTED CONTACTS ONLY) */}
        {activeTab === 'direct' && (
          <div>
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-wa-muted">
                <p className="text-xs">No accepted contacts yet</p>
                <button
                  onClick={onOpenAddContact}
                  className="mt-3 px-3.5 py-2 bg-wa-panel hover:bg-wa-active text-wa-green text-xs font-medium rounded-lg border border-wa-border transition inline-flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Find & Add Users</span>
                </button>
              </div>
            ) : (
              filteredContacts.map((u) => {
                const isOnline = onlineUserIds.has(u.id);
                const isActive =
                  activeRoom?.type === 'direct' && activeRoom?.otherUser?.id === u.id;

                return (
                  <div
                    key={`contact-${u.id}`}
                    onClick={() => onStartDirectMessage(u.id)}
                    className={`flex items-center px-4 py-3 cursor-pointer transition ios-tap ${
                      isActive ? 'bg-white/[0.12]' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewProfile) onViewProfile(u);
                      }}
                      title="View contact profile"
                      className="relative w-12 h-12 rounded-full mr-3 flex-shrink-0 hover:opacity-90 transition cursor-pointer group"
                    >
                      <img
                        src={u.avatar_url}
                        alt={u.username}
                        className="w-12 h-12 rounded-full bg-slate-800 object-cover ring-1 ring-white/10 group-hover:ring-emerald-500/40 shadow-sm transition-all duration-200"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-wa-bg shadow-sm" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-wa-text truncate">
                          {u.full_name || u.username}
                        </h4>
                        <span
                          className={`text-[11px] flex-shrink-0 ${
                            isOnline ? 'text-wa-green font-medium' : 'text-wa-muted'
                          }`}
                        >
                          {isOnline ? 'online' : 'offline'}
                        </span>
                      </div>
                      <p className="text-xs text-wa-muted truncate mt-0.5">
                        {u.about || (isOnline ? 'Tap to chat...' : 'Tap to start conversation')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modern Sidebar Footer */}
      <footer className="h-10 bg-wa-header border-t border-wa-border px-4 flex items-center justify-center flex-shrink-0">
        <div className="inline-flex items-center space-x-1.5 text-[11px] text-wa-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-wa-green animate-pulse" />
          <span>Created by</span>
          <span className="text-wa-green font-semibold tracking-wide">Shailender Gautam</span>
        </div>
      </footer>
    </aside>
  );
}
