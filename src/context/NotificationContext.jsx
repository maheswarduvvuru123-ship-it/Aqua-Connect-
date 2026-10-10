import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCollection, updateDoc, subscribeToData, addNotification } from '../services/firestoreData';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const refreshNotifications = () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const all = getCollection('notifications');
    const userNotifs = all.filter(n => n.userId === currentUser.uid || n.role === currentUser.role);
    // Sort descending by date
    userNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(userNotifs);
  };

  useEffect(() => {
    refreshNotifications();
    const unsub = subscribeToData((coll) => {
      if (coll === 'notifications' || coll === 'orders' || coll === 'all') {
        refreshNotifications();
      }
    });
    return () => unsub();
  }, [currentUser]);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
      removeToast
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
