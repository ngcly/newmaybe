/* global self, caches, URL, fetch, AbortSignal, Response */
// 林下书房 · 离线阅读 Service Worker
const CACHE_NAME = 'linxia-study-v1';

// 核心离线壳资源
const PRECACHE_URLS = ['/', '/favicon.svg', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 跨域资源不拦截（除 Google Fonts 切片与 CDN 样式外）
  const isGoogleFont =
    url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com');

  if (url.origin !== self.location.origin && !isGoogleFont) {
    return;
  }

  // Text URLs are stable across releases: revalidate online, retain the last copy offline.
  if (url.pathname.startsWith('/texts/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request, {
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok) {
            await cache.put(request, response.clone());
            return response;
          }
          if (response.status >= 500) return (await cache.match(request)) || response;
          return response;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Only content-hashed static assets use cache-first.
  const isStaticOrText = url.pathname.startsWith('/assets/') || isGoogleFont;

  if (isStaticOrText) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // HTML 导航请求：Network First, Fallback to Cache Shell
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return null;
        });
      }),
  );
});
