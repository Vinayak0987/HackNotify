/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'hacktrackr-pwa-v1'

// Cache core assets so the app can reopen offline after first load.
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/icon.svg',
  '/apple-icon.png',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
    ]),
  )
})

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
}

self.addEventListener('message', (event) => {
  const data = event.data || {}
  if (data && data.type === 'PRECACHE_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Cache each URL; ignore failures so one bad URL doesn't break precache.
        await Promise.all(
          data.urls.map((u) =>
            fetch(u, { credentials: 'include' })
              .then((resp) => {
                if (resp && resp.ok) return cache.put(u, resp.clone())
              })
              .catch(() => {}),
          ),
        )
      }),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET.
  if (request.method !== 'GET') return

  // Next static assets: cache-first.
  const url = new URL(request.url)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return resp
        }),
      ),
    )
    return
  }

  // Navigation: cache-first (so the UI looks identical offline), then refresh from network.
  // If the page was never visited/cached, fall back to offline.html.
  if (isNavigationRequest(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((resp) => {
            const copy = resp.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            return resp
          })
          .catch(() => null)

        // Prefer cached response immediately for fast/offline loading.
        if (cached) {
          // Update cache in background.
          event.waitUntil(networkFetch)
          return cached
        }

        // No cache: try network, else offline page.
        return networkFetch.then((resp) => resp || caches.match('/offline.html'))
      }),
    )
    return
  }

  // Other requests: try cache, then network.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((resp) => {
        const copy = resp.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return resp
      }),
    ),
  )
})
