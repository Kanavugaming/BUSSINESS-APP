import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api/client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [pulse, setPulse] = useState(false);

  // Load persisted notification history once logged in.
  useEffect(() => {
    if (!token) return;
    api.get('/api/notifications').then(({ data }) => setNotifications(data)).catch(() => {});
  }, [token]);

  // Connect the socket once we have a session. Same-origin in production,
  // proxied in dev — matches the backend's shared HTTP server setup.
  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL || undefined, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setPulse(true);
      setTimeout(() => setPulse(false), 2200);
    });

    return () => socket.disconnect();
  }, [token]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch {
      /* non-critical */
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, pulse, markRead }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
