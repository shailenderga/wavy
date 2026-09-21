import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AuthModal from './components/AuthModal';
import AddContactModal from './components/AddContactModal';
import UserProfileModal from './components/UserProfileModal';
import CreateStoryModal from './components/CreateStoryModal';
import StoryViewerModal from './components/StoryViewerModal';
import CallModal from './components/CallModal';
import EditProfileModal from './components/EditProfileModal';
import { roomAPI, contactAPI, messageAPI, storyAPI } from './services/api';

function ChatDashboard() {
  const { user, loading } = useAuth();
  const { socket } = useSocket();

  const [channels, setChannels] = useState([]);
  const [directRooms, setDirectRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [contactStories, setContactStories] = useState([]);

  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);

  // Modals
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [showStoryViewerModal, setShowStoryViewerModal] = useState(false);

  // Calling State
  const [callState, setCallState] = useState(null);

  // Load Rooms, Contacts, Requests & Stories
  const loadInitialData = useCallback(async () => {
    try {
      const [roomsRes, contactsRes, requestsRes, storiesRes] = await Promise.all([
        roomAPI.getRooms(),
        contactAPI.getContacts(),
        contactAPI.getRequests(),
        storyAPI.getStories()
      ]);

      const fetchedChannels = roomsRes.data.channels || [];
      const fetchedDirect = roomsRes.data.directRooms || [];

      setChannels(fetchedChannels);
      setDirectRooms(fetchedDirect);
      setContacts(contactsRes.data.contacts || []);
      setPendingRequests(requestsRes.data.incoming || []);
      setMyStories(storiesRes.data.myStories || []);
      setContactStories(storiesRes.data.contactStories || []);

      // On desktop, default select first direct room if exists
      if (window.innerWidth >= 768 && !activeRoom) {
        if (fetchedDirect.length > 0) {
          setActiveRoom(fetchedDirect[0]);
        } else if (fetchedChannels.length > 0) {
          setActiveRoom(fetchedChannels[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load initial chat data:', err);
    }
  }, [activeRoom]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  // Load messages when activeRoom changes
  useEffect(() => {
    if (!activeRoom) return;

    let isMounted = true;
    async function fetchMessages() {
      try {
        const res = await messageAPI.getRoomMessages(activeRoom.id);
        if (isMounted) {
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch messages for room', activeRoom.id, err);
      }
    }

    fetchMessages();

    // Join room on socket
    if (socket) {
      socket.emit('join_room', activeRoom.id);
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.emit('leave_room', activeRoom.id);
      }
    };
  }, [activeRoom?.id, socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (newMsg) => {
      if (activeRoom && newMsg.room_id === activeRoom.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const handleContactRequestReceived = (data) => {
      if (data.receiverId === user.id) {
        contactAPI.getRequests().then((res) => {
          setPendingRequests(res.data.incoming || []);
        });
      }
    };

    const handleContactRequestUpdated = (data) => {
      if (data.senderId === user.id || data.receiverId === user.id) {
        Promise.all([contactAPI.getContacts(), contactAPI.getRequests()]).then(
          ([contactsRes, requestsRes]) => {
            setContacts(contactsRes.data.contacts || []);
            setPendingRequests(requestsRes.data.incoming || []);
          }
        );
      }
    };

    const handleNewStoryPosted = () => {
      storyAPI.getStories().then((res) => {
        setMyStories(res.data.myStories || []);
        setContactStories(res.data.contactStories || []);
      });
    };

    // Request notification permission if available
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Calling Listeners
    const handleIncomingCall = (data) => {
      console.log('Incoming call received:', data);
      setCallState({
        isIncoming: true,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType,
        signalData: data.signalData,
        isConnected: false
      });

      // Browser Desktop Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const notif = new Notification(`Wavy ${data.callType === 'video' ? 'Video' : 'Audio'} Call`, {
              body: `${data.callerName} is calling you on Wavy Web`,
              icon: data.callerAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
              tag: 'wavy-call',
              requireInteraction: true
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (err) {
            console.warn('Desktop notification failed:', err);
          }
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    };

    const handleCallAccepted = () => {
      console.log('Call was accepted by the other user');
      setCallState((prev) => (prev ? { ...prev, isConnected: true } : null));
    };

    const handleCallRejected = () => {
      alert('Call was declined');
      setCallState(null);
    };

    const handleCallEnded = () => {
      setCallState(null);
    };

    const handleCallUserOffline = () => {
      alert('User is currently offline and cannot receive calls');
      setCallState(null);
    };

    const handleUserProfileUpdated = (updated) => {
      contactAPI.getContacts().then((res) => {
        setContacts(res.data.contacts || []);
      });
      setActiveRoom((prev) => {
        if (prev && prev.otherUser && prev.otherUser.id === updated.userId) {
          return {
            ...prev,
            otherUser: {
              ...prev.otherUser,
              username: updated.username,
              avatar_url: updated.avatar_url,
              about: updated.about
            }
          };
        }
        return prev;
      });
    };

    const handleStoryViewed = (data) => {
      if (data.authorId === user.id) {
        storyAPI.getStories().then((res) => {
          setMyStories(res.data.myStories || []);
        });
      }
    };

    const handleStoryDeleted = ({ storyId }) => {
      setMyStories((prev) => prev.filter((s) => s.id !== storyId));
      setContactStories((prev) =>
        prev
          .map((group) => ({
            ...group,
            stories: group.stories.filter((s) => s.id !== storyId)
          }))
          .filter((group) => group.stories.length > 0)
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('contact_request_received', handleContactRequestReceived);
    socket.on('contact_request_updated', handleContactRequestUpdated);
    socket.on('new_story_posted', handleNewStoryPosted);
    socket.on('story_viewed', handleStoryViewed);
    socket.on('story_deleted', handleStoryDeleted);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_user_offline', handleCallUserOffline);
    socket.on('user_profile_updated', handleUserProfileUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('contact_request_received', handleContactRequestReceived);
      socket.off('contact_request_updated', handleContactRequestUpdated);
      socket.off('new_story_posted', handleNewStoryPosted);
      socket.off('story_viewed', handleStoryViewed);
      socket.off('story_deleted', handleStoryDeleted);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_user_offline', handleCallUserOffline);
      socket.off('user_profile_updated', handleUserProfileUpdated);
    };
  }, [socket, activeRoom?.id, user?.id]);

  // Handlers
  const handleSelectRoom = (room) => {
    setActiveRoom(room);
  };

  const handleBackToChatList = () => {
    setActiveRoom(null);
  };

  const handleViewProfile = async (targetUser) => {
    setSelectedProfileUser(targetUser);
    setShowProfileModal(true);

    try {
      const res = await contactAPI.getUserProfile(targetUser.id);
      if (res.data?.user) {
        setSelectedProfileUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  const handleStartDirectMessage = async (targetUserId) => {
    try {
      const res = await roomAPI.getOrCreateDirectRoom(targetUserId);
      const directRoom = res.data.room;
      setActiveRoom(directRoom);
    } catch (err) {
      console.error('Failed to initiate direct message:', err);
      alert(err.response?.data?.error || 'Could not start direct chat');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await contactAPI.respondRequest(requestId, 'accept');
      const [contactsRes, requestsRes] = await Promise.all([
        contactAPI.getContacts(),
        contactAPI.getRequests()
      ]);
      setContacts(contactsRes.data.contacts || []);
      setPendingRequests(requestsRes.data.incoming || []);
    } catch (err) {
      console.error('Failed to accept request:', err);
      alert('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await contactAPI.respondRequest(requestId, 'reject');
      setPendingRequests((prev) => prev.filter((r) => r.request_id !== requestId));
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert('Failed to reject request');
    }
  };

  const handleSendMessage = (messageData) => {
    if (!activeRoom || !socket) return;

    const payload = typeof messageData === 'string'
      ? { roomId: activeRoom.id, content: messageData, messageType: 'text' }
      : { roomId: activeRoom.id, ...messageData };

    socket.emit('send_message', payload, (res) => {
      if (res?.error) {
        console.error('Send error:', res.error);
      }
    });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert(err.response?.data?.error || 'Failed to delete message');
    }
  };

  const handleViewStory = (group) => {
    setSelectedStoryGroup(group);
    setShowStoryViewerModal(true);
  };

  const refreshStories = () => {
    storyAPI.getStories().then((res) => {
      setMyStories(res.data.myStories || []);
      setContactStories(res.data.contactStories || []);
    });
  };

  // Calling Handlers
  const handleStartCall = (targetUser, callType) => {
    setCallState({
      isIncoming: false,
      targetUserId: targetUser.id,
      targetUserName: targetUser.username,
      targetUserAvatar: targetUser.avatar_url,
      callType,
      isConnected: false
    });

    if (socket) {
      socket.emit('start_call', {
        targetUserId: targetUser.id,
        callType,
        callerName: user.username,
        callerAvatar: user.avatar_url
      });
    }
  };

  const handleAcceptCall = () => {
    if (!callState || !socket) return;
    socket.emit('accept_call', {
      callerId: callState.callerId
    });
    setCallState((prev) => ({ ...prev, isConnected: true }));
  };

  const handleRejectCall = () => {
    if (!callState || !socket) return;
    socket.emit('reject_call', {
      callerId: callState.callerId
    });
    setCallState(null);
  };

  const handleEndCall = () => {
    if (!callState || !socket) return;
    const otherId = callState.isIncoming ? callState.callerId : callState.targetUserId;
    socket.emit('end_call', {
      targetUserId: otherId
    });
    setCallState(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-wa-bg">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-wa-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-wa-muted">Loading Wavy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen flex bg-wa-bg overflow-hidden font-sans select-none">
      {!user && <AuthModal />}

      {user && (
        <>
          {/* Sidebar */}
          <div className={`h-full ${activeRoom ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
            <Sidebar
              contacts={contacts}
              pendingRequests={pendingRequests}
              myStories={myStories}
              contactStories={contactStories}
              activeRoom={activeRoom}
              onSelectRoom={handleSelectRoom}
              onStartDirectMessage={handleStartDirectMessage}
              onOpenAddContact={() => setShowAddContactModal(true)}
              onAcceptRequest={handleAcceptRequest}
              onRejectRequest={handleRejectRequest}
              onViewProfile={handleViewProfile}
              onCreateStory={() => setShowCreateStoryModal(true)}
              onViewStory={handleViewStory}
              onOpenEditProfile={() => setShowEditProfileModal(true)}
            />
          </div>

          {/* ChatArea */}
          <div className={`h-full flex-1 ${activeRoom ? 'flex' : 'hidden md:flex'}`}>
            <ChatArea
              activeRoom={activeRoom}
              messages={messages}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onBack={handleBackToChatList}
              onViewProfile={handleViewProfile}
              onStartCall={handleStartCall}
            />
          </div>

          {/* Find & Add Contact Modal */}
          <AddContactModal
            isOpen={showAddContactModal}
            onClose={() => setShowAddContactModal(false)}
            onRequestSent={() => {
              contactAPI.getRequests().then((res) => {
                setPendingRequests(res.data.incoming || []);
              });
            }}
            onAcceptDirect={(newContactId) => {
              setShowAddContactModal(false);
              contactAPI.getContacts().then((res) => {
                setContacts(res.data.contacts || []);
              });
              handleStartDirectMessage(newContactId);
            }}
            onViewProfile={(u) => {
              handleViewProfile(u);
            }}
          />

          {/* User Profile Details Modal */}
          <UserProfileModal
            user={selectedProfileUser}
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            onOpenEditProfile={() => setShowEditProfileModal(true)}
            onStartChat={(targetUserId) => {
              setShowProfileModal(false);
              handleStartDirectMessage(targetUserId);
            }}
            onContactUpdated={() => {
              Promise.all([contactAPI.getContacts(), contactAPI.getRequests()]).then(
                ([contactsRes, requestsRes]) => {
                  setContacts(contactsRes.data.contacts || []);
                  setPendingRequests(requestsRes.data.incoming || []);
                }
              );
            }}
          />

          {/* Edit Profile & DP Modal */}
          <EditProfileModal
            isOpen={showEditProfileModal}
            onClose={() => setShowEditProfileModal(false)}
            onProfileUpdated={() => {
              contactAPI.getContacts().then((res) => {
                setContacts(res.data.contacts || []);
              });
            }}
          />

          {/* Create Story (Status) Modal */}
          <CreateStoryModal
            isOpen={showCreateStoryModal}
            onClose={() => setShowCreateStoryModal(false)}
            onStoryCreated={refreshStories}
          />

          {/* Story Viewer Modal */}
          <StoryViewerModal
            storyGroup={selectedStoryGroup}
            isOpen={showStoryViewerModal}
            onClose={() => {
              setShowStoryViewerModal(false);
              setSelectedStoryGroup(null);
            }}
          />

          {/* Audio & Video Calling Modal */}
          <CallModal
            callState={callState}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onEndCall={handleEndCall}
            socket={socket}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatDashboard />
      </SocketProvider>
    </AuthProvider>
  );
}
