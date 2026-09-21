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
  User
} from 'lucide-react';

export default function Sidebar({
  contacts = [],
  pendingRequests = [],
  myStories = [],
  contactStories = [],
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
  const [activeTab, setActiveTab] = useState('direct'); // 'direct', 'status', 'requests'
  const [showMenu, setShowMenu] = useState(false);

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full bg-wa-bg border-r border-wa-border flex flex-col flex-shrink-0 select-none">
      {/* WhatsApp Header */}
      <header className="h-16 bg-wa-header px-4 flex items-center justify-between border-b border-wa-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div
            onClick={() => onOpenEditProfile && onOpenEditProfile()}
            title="Edit my profile & DP"
            className="relative cursor-pointer hover:opacity-90 transition group flex-shrink-0"
          >
            <img
              src={user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
              alt={user?.username}
              className="w-10 h-10 rounded-full bg-slate-800 object-cover ring-1 ring-white/10 group-hover:ring-emerald-500/50 shadow-sm transition-all duration-200"
            />
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-wa-header shadow-sm" />
            </span>
          </div>
          <div
            onClick={() => onOpenEditProfile && onOpenEditProfile()}
            className="cursor-pointer hover:opacity-85 transition"
            title="Click to edit profile"
          >
            <h3 className="font-semibold text-sm text-wa-text truncate max-w-[130px]">
              {user?.username}
            </h3>
            <span className="text-[11px] text-wa-green font-medium">online • edit profile</span>
          </div>
        </div>

        {/* WhatsApp Top Right Action Icons */}
        <div className="flex items-center space-x-1 text-wa-muted">
          {/* Status / Story Create Button */}
          <button
            onClick={onCreateStory}
            title="Add Status (Story)"
            className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition relative"
          >
            <CircleDot className="w-5 h-5 text-wa-green" />
          </button>

          {/* Add Contact / Search User Button */}
          <button
            onClick={onOpenAddContact}
            title="Find & Add Users"
            className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition relative"
          >
            <UserPlus className="w-5 h-5 text-wa-muted hover:text-wa-green" />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Menu"
              className="p-2 hover:text-wa-text hover:bg-wa-hover rounded-full transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-44 bg-wa-panel border border-wa-border rounded-lg shadow-xl py-1 z-50 text-sm">
                <button
                  onClick={() => {
                    if (onOpenEditProfile) onOpenEditProfile();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-wa-active flex items-center space-x-2"
                >
                  <User className="w-4 h-4 text-wa-green" />
                  <span>Profile & DP</span>
                </button>
                <button
                  onClick={() => {
                    onCreateStory();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-wa-active flex items-center space-x-2"
                >
                  <CircleDot className="w-4 h-4 text-wa-green" />
                  <span>Add Status</span>
                </button>
                <button
                  onClick={() => {
                    onOpenAddContact();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-wa-text hover:bg-wa-active flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4 text-wa-green" />
                  <span>Find Contacts</span>
                </button>
                <div className="my-1 border-t border-wa-border" />
                <button
                  onClick={logout}
                  className="w-full px-4 py-2 text-left text-rose-400 hover:bg-wa-active flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* WhatsApp Search Bar */}
      <div className="p-2 border-b border-wa-border bg-wa-bg">
        <div className="relative flex items-center bg-wa-panel rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-wa-muted mr-3 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-transparent text-sm text-wa-text placeholder-wa-muted focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-wa-muted hover:text-wa-text">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* WhatsApp Tabs: Chats, Status (Story), Requests */}
        <div className="flex items-center gap-1.5 mt-2 px-1">
          {[
            { id: 'direct', label: 'Chats' },
            {
              id: 'status',
              label: 'Status',
              badge: contactStories.length > 0
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
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'bg-wa-panel text-wa-green border border-wa-border'
                  : 'text-wa-muted hover:bg-wa-panel/60 hover:text-wa-text'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-2 h-2 bg-wa-green rounded-full inline-block" />
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
                          {req.username}
                        </h4>
                        <span className="text-[11px] text-wa-muted">
                          Wants to connect with you
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
                    className={`flex items-center px-4 py-3 cursor-pointer transition ${
                      isActive ? 'bg-wa-active' : 'hover:bg-wa-hover'
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
                          {u.username}
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
                        {isOnline ? 'Tap to chat...' : 'Tap to start conversation'}
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
