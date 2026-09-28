// Firebase Cloud Messaging Service Worker for IP Room Nepal
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyC7AY37NDr360h5Bof5J0EnwThhPWWcyXs",
  authDomain: "round-client-dh7nb.firebaseapp.com",
  projectId: "round-client-dh7nb",
  storageBucket: "round-client-dh7nb.firebasestorage.app",
  messagingSenderId: "213858411845",
  appId: "1:213858411845:web:20dcd65db7d2648ac60a2c"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'IP Room Nepal';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New room notification received.',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
    tag: payload.data?.tag || 'iproom-notification',
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
