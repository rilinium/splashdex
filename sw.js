'use strict';

const CACHE = 'splashdex-v1';

const PRECACHE = [
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/Splashdex.svg',
  '/embedbanner.png',
  '/embedfrogbg.png',
];

// ── Install: precache critical assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Serverless API routes — network only, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests — try network, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Frog sprites — cache on first load, then serve from cache forever
  if (url.pathname.startsWith('/frog_sprites/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Everything else — serve from cache, revalidate in background
  event.respondWith(
    caches.match(request).then(cached => {
      const revalidate = fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      });
      return cached || revalidate;
    })
  );
});
