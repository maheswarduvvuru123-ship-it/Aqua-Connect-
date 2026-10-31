/**
 * AquaConnect - Firebase Cloud Messaging Background Service Worker
 * Handles background push notifications when the app/tab is closed or minimized.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDPlWeOhCpAPQ2Y_kPga0LmgAyPs2H7CZU",
  authDomain: "aqua-ec4f5.firebaseapp.com",
  projectId: "aqua-ec4f5",
  storageBucket: "aqua-ec4f5.firebasestorage.app",
  messagingSenderId: "818962725324",
  appId: "1:818962725324:android:d7d70d99fb20aa896d4569"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || 'AquaConnect Alert';
  const body = payload.notification?.body || payload.data?.message || 'You have a new update in AquaConnect.';
  const icon = payload.notification?.icon || '/images/bubble_top_can.jpg';
  const clickAction = payload.data?.clickAction || payload.data?.url || '/';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: '/images/bubble_top_can.jpg',
    tag: payload.data?.tag || payload.data?.orderId || `aquaconnect_${Date.now()}`,
    data: {
      url: clickAction,
      orderId: payload.data?.orderId,
      type: payload.data?.type
    },
    actions: [
      { action: 'open_app', title: 'Open AquaConnect' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

