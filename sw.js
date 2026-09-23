// Speak Service Worker — offline support + asset caching
// Bumped for the safety-channel fix. Existing installs keep serving the old
// app.js from cache until CACHE changes — and the old app.js is the one that
// wrote safety alerts into localStorage where the caretaker could read them.
// Any future change to the safety path must bump this too.
const CACHE = 'speak-v36';

// The app shell. If any one of these 404s the install fails and every existing
// device stays frozen on the previous cache, so keep this list to files that
// really must be here and verify them before adding.
//
// Netlify's Pretty URLs rewrites every link in the deployed HTML from
// "app.html" to "/app", so the extensionless paths are what a device actually
// requests. Both spellings are cached or an offline device gets a dead link.
const PRECACHE = [
  '/',
  '/index.html',
  '/app',
  '/app.html',
  '/styles.css',
  '/app.js',
  '/icons.js',
  '/onboarding.js',
  '/dashboard.js',
  '/symbols.js',
  '/mulberry.js',
  '/sync.js',
  '/page-lang.js',
  '/manifest.json',
  '/icons/icon.png',
  // icon.svg not included — file doesn't exist; icon.png covers all sizes
];

// Secondary pages. Cached best-effort, one at a time, so a renamed or removed
// page can never break the install for everyone.
const PRECACHE_OPTIONAL = [
  '/mission',
  '/guide',
  '/for_clinics',
  '/device',
  '/install_guide',
  '/teacher',
  '/clinic_guide',
];

// External origins — always go to network, never cache.
// cdn.jsdelivr.net is deliberately NOT here: it serves the Mulberry and
// OpenMoji symbol images, and a board with no symbols is useless to the child
// it belongs to. Those requests get cached on first view so they survive
// going offline.
const NETWORK_ONLY = [
  'supabase.co',
  'emailjs.com',
  'anthropic.com',
  'typekit.net',
  'googleapis.com',
  'gstatic.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(PRECACHE);
      await Promise.all(
        PRECACHE_OPTIONAL.map(u => c.add(u).catch(() => {}))
      );
    })
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

// A cross-origin <img> with no crossorigin attribute produces an opaque
// response: status 0, ok false. Checking res.ok alone silently skipped every
// symbol image, which is why the board came up blank offline.
function isCacheable(request, res) {
  return request.method === 'GET' && (res.ok || res.type === 'opaque');
}

// respondWith(undefined) surfaces to the user as a hard browser network error.
// An offline device should land on the app shell instead.
function offlineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match('/app.html').then(
      r => r || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Let external API calls bypass the cache entirely
  if (NETWORK_ONLY.some(origin => url.includes(origin))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (isCacheable(e.request, res)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => offlineFallback(e.request));
    })
  );
});
