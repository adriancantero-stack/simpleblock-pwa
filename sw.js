const CACHE_NAME = 'livreplay-v36';
const FILTERS_URL = 'filters.json';
let blockedPatterns = [];

async function loadFilters() {
  try {
    const res = await fetch(FILTERS_URL, { cache: 'no-store' });
    if (res.ok) {
      blockedPatterns = await res.json();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(FILTERS_URL, res.clone());
    }
  } catch {
    try {
      const cachedRes = await caches.match(FILTERS_URL);
      if (cachedRes) {
        blockedPatterns = await cachedRes.json();
        return;
      }
    } catch {}
    blockedPatterns = ["doubleclick.net","googlesyndication.com","youtube.com/api/stats/ads","adserver.","tracking.","analytics.","pixel.","adservice.","s.youtube.com"];
  }
}

function isBlocked(url) { return blockedPatterns.some(p => url.includes(p)); }

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(loadFilters());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))),
      loadFilters()
    ])
  );
});

self.addEventListener('fetch', e => {
  // Ignora e não intercepta requisições ao YouTube Embed para preservar o cabeçalho Referer nativo e evitar o Erro 153
  if (e.request.url.includes('youtube.com/embed') || e.request.url.includes('youtube-nocookie.com/embed')) {
    return;
  }

  if (isBlocked(e.request.url)) { e.respondWith(new Response('', { status: 204 })); return; }
  if (e.request.destination === 'document' || e.request.destination === 'image') {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); }
      return res;
    }).catch(async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }));
    return;
  }
  e.respondWith(fetch(e.request).catch(async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    return new Response('Network Error', { status: 503, statusText: 'Network Error' });
  }));
});

// Load filters on service worker waking up
loadFilters();

