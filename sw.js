// Speak Service Worker — offline support + asset caching
// Bumped for the safety-channel fix. Existing installs keep serving the old
// app.js from cache until CACHE changes — and the old app.js is the one that
// wrote safety alerts into localStorage where the caretaker could read them.
// Any future change to the safety path must bump this too.
const CACHE = 'speak-v38';   // v38: stale-while-revalidate, drops any bad v37 entries

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
  if (request.method !== 'GET') return false;

  // jsdelivr sends Access-Control-Allow-Origin: *, and we now request everything
  // from it with CORS (crossorigin on the SDK script tags, img.crossOrigin on the
  // symbols). So res.ok is real there, and requiring it stops a captive portal or
  // content filter's block page from being stored as though it were a symbol.
  if (request.url.includes('cdn.jsdelivr.net')) return res.ok;

  // Everything else may still legitimately be opaque.
  return res.ok || res.type === 'opaque';
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
      // Revalidate on every request, even when the cache hits.
      //
      // isCacheable() has to accept opaque responses, because cross-origin symbol
      // images come back opaque and requiring res.ok skipped every one of them.
      // The catch is that an opaque response is indistinguishable from a captive
      // portal or a school content filter handing back a block page: it arrives,
      // it looks fine, and it gets stored. A plain cache-first read then serves
      // that entry forever, because nothing ever checks it again. On a device
      // belonging to someone who cannot speak, that is a board that stays broken
      // until a caregiver thinks to clear site data, which will not happen.
      //
      // Serving the cached copy immediately keeps the app fast and offline-capable;
      // the background fetch means a bad entry heals itself on the next load.
      const network = fetch(e.request).then(res => {
        if (isCacheable(e.request, res)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });

      if (cached) {
        // Offline is fine here: we already have something to show.
        e.waitUntil(network.catch(() => {}));
        return cached;
      }
      return network.catch(err => {
        // Say something. This catch previously swallowed everything, so a CSP
        // connect-src gap (jsdelivr was missing from it) looked identical to being
        // offline: the SDKs came back as empty 504s and nothing anywhere logged why.
        console.warn('[Speak SW] fetch failed, serving offline fallback:', e.request.url, err && err.message);
        return offlineFallback(e.request);
      });
    })
  );
});
