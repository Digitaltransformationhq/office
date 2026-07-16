/* KAPS & Co. — Web Push service worker */

// Take over as soon as a new version ships. Without these, an updated worker
// sits in the "waiting" state until every tab of the app is closed — which for
// a dashboard people leave open all day means fixes here never land.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'KAPS & Co.', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'KAPS & Co.';
  const options = {
    body: data.body || '',
    icon: '/ca-india-logo.png',
    badge: '/ca-india-logo.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // An already-open tab keeps its URL when focused, so focusing alone would
    // drop the notification's destination on the floor. Hand the URL to the
    // running app instead — it navigates in place, without a reload.
    for (const client of list) {
      if ('focus' in client) {
        await client.focus();
        client.postMessage({ type: 'notification-click', url });
        return;
      }
    }

    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
