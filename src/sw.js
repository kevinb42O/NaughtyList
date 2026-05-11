import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// Precache all Vite-built assets
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'The Naughty List'
  const options = {
    body: data.body ?? '',
    icon: '/naughty-list-icon.svg',
    badge: '/naughty-list-icon.svg',
    tag: 'drop-in',
    renotify: true,
    vibrate: [100, 50, 100],
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tap notification → open / focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus()
        }
        if (self.clients.openWindow) return self.clients.openWindow(url)
      }),
  )
})
