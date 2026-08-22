const CACHE_NAME = 'nabungadmin-v1.0.2'
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/logo.svg',
  '/icon.svg'
]

// Install event: Precache shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate event: Clean up old caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Admin SW] Deleting obsolete cache:', key)
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Listen for message commands from clients (Force update & Skip waiting)
self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[Admin SW] Received SKIP_WAITING signal')
    self.skipWaiting()
  }

  if (event.data.type === 'FORCE_REFRESH') {
    console.log('[Admin SW] Received FORCE_REFRESH signal, clearing all caches...')
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)))
      }).then(() => {
        self.skipWaiting()
      })
    )
  }
})

// Fetch event: Network-first for navigation, Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Avoid caching non-HTTP/HTTPS schemes
  if (!url.protocol.startsWith('http')) return

  // NEVER cache version.json -> always fetch fresh from network to detect updates
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => {
        return new Response(JSON.stringify({ version: 'unknown', error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // Handle page navigation (HTML) -> Network First with offline cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/')
        })
    )
    return
  }

  // Handle same-origin assets or Google Fonts -> Stale-while-revalidate
  const isSameOrigin = url.origin === self.location.origin
  const isFont = url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')

  if (isSameOrigin || isFont) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
  }
})
