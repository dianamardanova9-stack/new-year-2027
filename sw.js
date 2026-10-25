const CACHE_NAME = 'shopping-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Установка — кэшируем основные файлы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ⚠️ ВАЖНО: обработчик fetch обязателен для установки как приложение
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Firebase SDK и Firestore — сеть, с fallback на кэш
  if (url.hostname === 'www.gstatic.com' || url.hostname === 'firestore.googleapis.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(e.request)
          .then(resp => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          })
          .catch(() => cache.match(e.request))
      )
    );
    return;
  }

  // Наш HTML и прочее — сеть, с fallback на кэш
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
