importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyABu2ykOLJz0i42GiIyksgnaEERoqmDdS4",
  authDomain: "rallyupph.firebaseapp.com",
  projectId: "rallyupph",
  storageBucket: "rallyupph.firebasestorage.app",
  messagingSenderId: "66620157767",
  appId: "1:66620157767:web:0a40c00bf47b960041e662"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};

  const notificationTitle = data.title || notification.title || 'RallyUp Update';
  const notificationOptions = {
    body: data.body || notification.body || '',
    icon: data.icon || notification.icon || '/icon-192x192.png',
    data: {
      click_action: data.click_action || '/',
      type: data.type || '',
      courtId: data.courtId || '',
      matchId: data.matchId || '',
      ...payload.data
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/';
  const urlToOpen = new URL(clickAction, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find((client) => {
        return client.url === urlToOpen;
      });

      if (matchingClient) {
        return matchingClient.focus();
      }

      return clients.openWindow(urlToOpen);
    })
  );
});
