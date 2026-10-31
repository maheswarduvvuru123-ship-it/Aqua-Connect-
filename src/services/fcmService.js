/**
 * AquaConnect - Firebase Cloud Messaging (FCM) Web Push Service
 * Manages device push registration, service worker lifecycle,
 * foreground notification reception, and multi-channel notification dispatch.
 */

import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db, getMessagingInstance, isLiveFirebaseConfigured } from './firebase.js';
import { addNotification } from './firestoreData.js';

// VAPID public key - can be overridden via VITE_FIREBASE_VAPID_KEY in .env
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
export const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY || 'BD7a63X5U2pY0r4w_DEMO_KEY_GENERATE_IN_FIREBASE_CONSOLE';

let isListening = false;

/**
 * Register Service Worker for Background Messaging
 */
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FCM] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[FCM] Service worker registration warning:', error.message);
    return null;
  }
};

/**
 * Request Browser Notification Permission & Obtain FCM Device Token
 */
export const requestNotificationPermissionAndGetToken = async (currentUser = null) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[FCM] Notifications are not supported in this browser.');
    return null;
  }

  try {
    if (Notification.permission === 'denied') {
      // User or browser has muted notifications; silently skip to preserve clean console
      return null;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[FCM] Firebase Messaging is not supported or initialized.');
      return null;
    }

    const swRegistration = await registerServiceWorker();

    let token = null;
    try {
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY.includes('DEMO_KEY') ? undefined : VAPID_KEY,
        serviceWorkerRegistration: swRegistration || undefined
      });
    } catch (tokenErr) {
      console.warn('[FCM] Could not retrieve FCM token with VAPID key:', tokenErr.message);
    }

    if (token) {
      console.log('[FCM] Device Push Token retrieved successfully:', token.slice(0, 16) + '...');
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aquaconnect_fcm_token', token);
      }

      // Associate token with user profile in Firestore
      if (currentUser && currentUser.uid) {
        await saveTokenToUserProfile(currentUser.uid, token);
      }
    }

    return token;
  } catch (error) {
    console.warn('[FCM] Permission/Token error:', error.message);
    return null;
  }
};

/**
 * Save FCM Token to User's Firestore Document
 */
export const saveTokenToUserProfile = async (userId, token) => {
  if (!userId || !token) return;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`fcm_token_${userId}`, token);
    }

    if (isLiveFirebaseConfigured() && db) {
      const userRef = doc(db, 'users', String(userId));
      await setDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastFcmToken: token,
        fcmUpdatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[FCM] Token associated with user ${userId}`);
    }
  } catch (err) {
    console.warn('[FCM] Could not save token to user document:', err.message);
  }
};

/**
 * Setup Foreground Push Listener
 */
export const setupForegroundPushListener = async (onPushReceived = null) => {
  if (isListening) return;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground push message received:', payload);

      const title = payload.notification?.title || payload.data?.title || 'AquaConnect Alert';
      const body = payload.notification?.body || payload.data?.message || 'New update received';

      // 1. Show browser notification if permission granted and document is hidden
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body: body,
            icon: payload.notification?.icon || '/images/bubble_top_can.jpg',
            badge: '/images/bubble_top_can.jpg',
            tag: payload.data?.orderId || `fcm_${Date.now()}`
          });
        } catch (e) {
          // Notifications might fail in some mobile browsers
        }
      }

      // 2. Dispatch custom in-app event for components & contexts
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fcm-push-notification', { detail: payload }));
      }

      // 3. Optional callback
      if (onPushReceived) {
        onPushReceived(payload);
      }
    });

    isListening = true;
    console.log('[FCM] Foreground push listener active');
  } catch (err) {
    console.warn('[FCM] Could not initialize foreground push listener:', err.message);
  }
};

// ============================================================================
// NOTIFICATION DISPATCH ENGINE FOR THE 3 PRD SCENARIOS
// ============================================================================

/**
 * SCENARIO 1: Customer and Supplier Orders Push Notification
 */
export const dispatchOrderPushNotification = async ({
  orderId,
  customerName,
  customerId,
  supplierId,
  supplierName,
  amount,
  status = 'Pending',
  type = 'new_order',
  itemsSummary = ''
}) => {
  console.log(`[FCM Dispatch] Order Notification: #${orderId} (${status})`);

  let title = '';
  let message = '';
  let targetUserId = supplierId;
  let targetRole = 'supplier';

  if (type === 'new_order' || status === 'Pending') {
    // Notify Supplier & Admin
    title = 'New Customer Order Received! 💧';
    message = `${customerName || 'Customer'} placed order #${orderId} for ₹${amount || 0}. ${itemsSummary ? `(${itemsSummary})` : ''}`;
    targetUserId = supplierId;
    targetRole = 'supplier';

    // Also alert admin
    addNotification({
      userId: 'admin_all',
      role: 'admin',
      title: 'Order Placed (Platform GMV Alert)',
      message: `Order #${orderId} (₹${amount}) placed at ${supplierName || 'Plant'} by ${customerName}.`,
      type: 'order_admin_alert',
      orderId,
      amount
    });
  } else if (status === 'Confirmed') {
    title = 'Order Confirmed by Water Plant! ✅';
    message = `Your order #${orderId} has been confirmed and scheduled for delivery.`;
    targetUserId = customerId;
    targetRole = 'customer';
  } else if (status === 'Out for Delivery') {
    title = 'Out for Delivery! 🚚';
    message = `Your water cans for order #${orderId} are on the way!`;
    targetUserId = customerId;
    targetRole = 'customer';
  } else if (status === 'Delivered') {
    title = 'Water Delivery Completed! 💧🎉';
    message = `Order #${orderId} has been delivered. Thank you for choosing clean water!`;
    targetUserId = customerId;
    targetRole = 'customer';
  } else if (status === 'Cancelled') {
    title = 'Order Cancelled';
    message = `Order #${orderId} was cancelled.`;
    targetUserId = customerId;
    targetRole = 'customer';
  }

  // Record in notifications collection (triggers live sync & pop-up)
  return addNotification({
    userId: targetUserId,
    supplierId,
    customerId,
    role: targetRole,
    title,
    message,
    type: type || 'order_update',
    orderId,
    amount,
    customerName,
    itemsSummary
  });
};

/**
 * SCENARIO 2: Supplier Subscription Expiry and Renewal Reminders
 */
export const dispatchSubscriptionReminderPush = async ({
  supplierId,
  supplierName,
  planName = 'Pro Flow Plan',
  daysRemaining = 0,
  expiryDate = ''
}) => {
  console.log(`[FCM Dispatch] Subscription Reminder for ${supplierName}: ${daysRemaining} days left`);

  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 3;

  const title = isExpired
    ? '🚨 Supplier Plan Expired — Renew Now!'
    : isUrgent
    ? `⚠️ Action Required: Plan Expires in ${daysRemaining} Days`
    : `📅 Plan Renewal Reminder: ${daysRemaining} Days Remaining`;

  const message = isExpired
    ? `Your ${planName} has expired. Please renew your subscription in the Admin portal to continue processing customer orders without interruption.`
    : `Your ${planName} subscription expires on ${expiryDate || 'soon'}. Renew today to keep seamless water delivery dispatch active.`;

  return addNotification({
    userId: supplierId,
    supplierId,
    role: 'supplier',
    title,
    message,
    type: 'subscription_reminder',
    daysRemaining,
    planName,
    expiryDate
  });
};

/**
 * SCENARIO 3: Admin Alerts (Registrations, Orders, Payment Status)
 */
export const dispatchAdminAlertPush = async ({
  alertType = 'registration', // 'registration' | 'payment_verification' | 'system'
  title = '',
  message = '',
  entityId = '',
  amount = 0
}) => {
  console.log(`[FCM Dispatch] Admin Alert (${alertType}):`, title);

  const defaultTitles = {
    registration: '🛡️ New Supplier Registration Pending Review',
    payment_verification: '💰 Offline Direct Payment Verification Request',
    subscription_payment: '💳 New Plan Subscription Payment Reference',
    system: '🔔 AquaConnect Platform Alert'
  };

  const finalTitle = title || defaultTitles[alertType] || 'Platform Alert';

  return addNotification({
    userId: 'admin_001',
    role: 'admin',
    title: finalTitle,
    message,
    type: `admin_${alertType}`,
    entityId,
    amount
  });
};

