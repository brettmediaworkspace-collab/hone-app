/* Firebase Cloud Messaging service worker.
   Handles streak reminders while HONE is closed or backgrounded.
   Registered at its own scope so it doesn't clash with /sw.js. */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// Client config is public by design.
firebase.initializeApp({
  apiKey: 'AIzaSyCRseZ2YiIU-thua_CmpF5j2iCPIgnjueA',
  authDomain: 'appsplosh-86e73.firebaseapp.com',
  projectId: 'appsplosh-86e73',
  storageBucket: 'appsplosh-86e73.firebasestorage.app',
  messagingSenderId: '1081771279286',
  appId: '1:1081771279286:web:9680040d9a72802538b717',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload?.notification?.title || 'HONE'
  const body = payload?.notification?.body || 'Time to train.'
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'hone-streak-reminder',
    renotify: false,
    data: { url: payload?.fcmOptions?.link || 'https://app.hone.appsplosh.com' },
  })
})

// Focus an existing tab if one is open, otherwise open the app.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification?.data?.url || 'https://app.hone.appsplosh.com'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('hone.appsplosh.com') && 'focus' in client) return client.focus()
      }
      return clients.openWindow(target)
    })
  )
})
