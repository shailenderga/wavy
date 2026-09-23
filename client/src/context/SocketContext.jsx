import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const DEFAULT_PROD_URL = 'https://wavy-1tnr.onrender.com';
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const envApiUrl = import.meta.env.VITE_API_URL;

    let socketURL = DEFAULT_PROD_URL;
    if (envSocketUrl) {
      socketURL = envSocketUrl;
    } else if (envApiUrl) {
      socketURL = envApiUrl.replace(/\/api\/?$/, '');
    } else if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
      socketURL = '/';
    }

    const newSocket = io(socketURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('online_users_list', (ids) => {
      setOnlineUserIds(new Set(ids));
    });

    newSocket.on('user_status_change', ({ userId, status }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
