const CACHE_NAME = 'shangan-library-pwa-v1'
const fromScope = (path) => new URL(path, self.registration.scope).toString()
const DASHBOARD_URL = fromScope('dashboard')
const OFFLINE_URL = fromScope('offline.html')
const APP_SHELL = ['', 'dashboard', 'manifest.webmanifest', 'favicon.svg', 'apple-touch-icon.png', 'offline.html'].map(fromScope)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(DASHBOARD_URL, copy))
          return response
        })
        .catch(() => caches.match(DASHBOARD_URL).then((response) => response || caches.match(OFFLINE_URL))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
