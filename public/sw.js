// IP Room Nepal - Service Worker for Web Push Notifications & PWA
const CACHE_NAME = 'iproom-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle real mobile push notification (shows in phone notification bar even when site is closed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'IP Room', body: event.data.text() };
    }
  }

  const title = data.title || 'New Message · IP Room';
  const options = {
    body: data.body || 'You have received a new message regarding your room listing.',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      conversationId: data.conversationId,
      roomId: data.roomId,
    },
    tag: data.conversationId ? `chat-${data.conversationId}` : `iproom-push-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to open or focus the chat conversation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
