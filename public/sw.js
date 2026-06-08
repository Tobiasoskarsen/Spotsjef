// Flyt service worker – gjør appen installerbar og tilgjengelig offline.
// Strategi: nettverk-først (alltid fersk når online), med cache som fallback.
const CACHE = 'flyt-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith('http')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Ta vare på en kopi i cache (kun vellykkede svar)
        if (response && response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(() =>
        // Offline: bruk cachet versjon, fall tilbake til forsiden for navigasjon
        caches.match(request).then((cached) => cached || caches.match('/')),
      ),
  )
})
