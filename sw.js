const CACHE_NAME = 'simpleblock-v2';
const FILTERS_URL = '/filters.json';
let blockedPatterns = [];

async function loadFilters() {
  try {
    const res = await fetch(FILTERS_URL, { cache: 'no-store' });
    if (res.ok) blockedPatterns = await res.json();
  } catch {
    blockedPatterns = ["doubleclick.net","googlesyndication.com","youtube.com/api/stats/ads","adserver.","tracking.","analytics.","pixel.","adservice.","s.youtube.com"];
  }
}
function isBlocked(url) { return blockedPatterns.some(p => url.includes(p)); }

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))));
});
self.addEventListener('fetch', e => {
  if (isBlocked(e.request.url)) { e.respondWith(new Response('', { status: 204 })); return; }
  if (e.request.destination === 'document' || e.request.destination === 'image') {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
setInterval(loadFilters, 12*60*60*1000);
loadFilters();
