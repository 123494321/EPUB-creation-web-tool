const CACHE_NAME = 'epub-studio-cache-v2.2.6';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/epub_generator.js',
    './js/worker.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim())
    );
});

// Network-First 전략: 최신 배포 코드가 있으면 즉시 가져오고, 오프라인일 때만 캐시 사용!
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
                const clone = networkRes.clone();
                caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
            }
            return networkRes;
        }).catch(() => {
            return caches.match(e.request).then((cached) => cached || caches.match('./index.html'));
        })
    );
});
