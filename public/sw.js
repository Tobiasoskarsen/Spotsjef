// Nær service worker – gjør appen installerbar og tilgjengelig offline.
// Strategi: nettverk-først (alltid fersk når online), med cache som fallback.
const CACHE = 'naer-v1'

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

// Push-varsel mottatt fra serveren – vis det (virker selv når appen er lukket)
self.addEventListener('push', (event) => {
  let data = { title: 'Nær', body: '' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    // Ugyldig payload – bruk standardtekst
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nær', {
      body: data.body || '',
      icon: '/naer-icon.svg',
      badge: '/naer-icon.svg',
      // Unik tag per varsel: en påminnelse skal ALDRI overskrive et
      // eskaleringsvarsel (eller omvendt) – pålitelighet er eksistensielt
      tag: 'naer-' + Date.now(),
      lang: 'no',
    }),
  )
})

// Klikk på varselet -> åpne/fokuser appen
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const apent = clients.find((c) => 'focus' in c)
      if (apent) return apent.focus()
      return self.clients.openWindow('/')
    }),
  )
})
