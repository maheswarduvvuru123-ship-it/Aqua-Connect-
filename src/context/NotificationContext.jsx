import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getCollection, updateDoc, subscribeToData } from '../services/firestoreData';
import { useAuth } from './AuthContext';

const defaultNotificationContext = {
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  showToast: (msg, type) => console.log(`[Toast ${type || 'info'}]:`, msg),
  toasts: [],
  removeToast: () => {},
  activeOrderPopup: null,
  dismissOrderPopup: () => {}
};

const NotificationContext = createContext(defaultNotificationContext);

// Web Audio API chime generator (no external audio assets required)
const playOrderChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Resume context if suspended by browser policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.25); // D6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio autoplay restrictions or headless environment
  }
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [activeOrderPopup, setActiveOrderPopup] = useState(null);
  const seenIdsRef = useRef(new Set());
  const initialLoadDone = useRef(false);

  const refreshNotifications = () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const all = getCollection('notifications') || [];
    const uid = currentUser.uid;
    const role = currentUser.role;

    const userNotifs = all.filter(n => {
      if (n.userId && n.userId === uid) return true;
      if (n.supplierId && n.supplierId === uid) return true;
      if (role === 'supplier' && n.role === 'supplier') {
        return !n.userId || n.userId === uid || n.supplierId === uid;
      }
      if (role === 'admin' || role === 'super_admin') return true;
      return n.role === role && (!n.userId || n.userId === uid);
    });

    // Sort descending by date
    userNotifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Check for brand new incoming notifications
    if (initialLoadDone.current) {
      const incoming = userNotifs.filter(n => !seenIdsRef.current.has(n.notificationId) && !n.isRead);
      incoming.forEach(n => {
        // Pop-up and sound for order-related notifications
        if (n.type === 'new_order' || n.orderId || n.title?.toLowerCase().includes('order')) {
          playOrderChime();
          showToast(`💧 ${n.title}: ${n.message}`, 'success', 8000);
          setActiveOrderPopup(n);
        } else {
          showToast(n.message || n.title, 'info', 5000);
        }
      });
    }

    userNotifs.forEach(n => seenIdsRef.current.add(n.notificationId));
    initialLoadDone.current = true;
    setNotifications(userNotifs);
  };

  useEffect(() => {
    refreshNotifications();
    const unsub = subscribeToData((coll) => {
      if (!coll || coll === 'notifications' || coll === 'orders' || coll === 'all') {
        refreshNotifications();
      }
    });
    return () => unsub();
  }, [currentUser]);

  const showToast = (message, type = 'info', duration = 5000) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissOrderPopup = () => {
    setActiveOrderPopup(null);
  };

  const markAsRead = (notificationId) => {
    updateDoc('notifications', 'notificationId', notificationId, { isRead: true });
    refreshNotifications();
  };

  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.isRead) {
        updateDoc('notifications', 'notificationId', n.notificationId, { isRead: true });
      }
    });
    refreshNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      showToast,
      toasts,
      removeToast,
      activeOrderPopup,
      dismissOrderPopup
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return defaultNotificationContext;
  }
  return context;
};
