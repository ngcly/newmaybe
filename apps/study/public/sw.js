/* global self, caches, URL, fetch */
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

  // 古籍 JSON 文本（/texts/*）与 Vite 构建带哈希静态资源：Cache First, Fallback to Network
  const isStaticOrText =
    url.pathname.startsWith('/assets/') || url.pathname.startsWith('/texts/') || isGoogleFont;

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
