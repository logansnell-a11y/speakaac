// Speak Service Worker — offline support + asset caching
const CACHE = 'speak-v6';

const PRECACHE = [
  '/app.html',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/onboarding.js',
  '/dashboard.js',
  '/symbols.js',
  '/arasaac.js',
  '/sync.js',
  '/manifest.json',
  '/icons/icon.png',
  // icon.svg not included — file doesn't exist; icon.png covers all sizes
];

// External origins — always go to network, never cache
// Note: arasaac.org removed so symbol images cache after first load (enables offline use)
const NETWORK_ONLY = [
  'supabase.co',
  'emailjs.com',
  'anthropic.com',
  'jsdelivr.net',
  'typekit.net',
  'googleapis.com',
  'gstatic.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Let external API calls bypass the cache entirely
  if (NETWORK_ONLY.some(origin => url.includes(origin))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses (audio files, images, etc.)
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached); // Offline fallback to cache if network fails
    })
  );
});
