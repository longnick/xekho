importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDOxVZDZ1JkpermI-J2L7AEioP0CWERqOY',
  authDomain: 'pos-v2-909ff.firebaseapp.com',
  databaseURL: 'https://pos-v2-909ff-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pos-v2-909ff',
  storageBucket: 'pos-v2-909ff.firebasestorage.app',
  messagingSenderId: '774115283908',
  appId: '1:774115283908:web:55ed845aad8ade281d8a91',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const notification = payload?.notification || {};
  const data = payload?.data || {};
  const title = notification.title || data.tableName || 'Thong bao bep';
  const body = notification.body || 'Co cap nhat moi tu bep';

  self.registration.showNotification(title, {
    body,
    icon: '/kitchen-icon.svg',
    badge: '/kitchen-badge.svg',
    tag: `kitchen-${data.type || 'update'}`,
    renotify: true,
    data: {
      url: '/',
      tableId: data.tableId || '',
      orderId: data.orderId || '',
      type: data.type || '',
    },
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) {
          try { await client.navigate(targetUrl); } catch (_) {}
        }
        return;
      }
    }
    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});
