const CACHE_NAME = 'epub-studio-cache-v2.2.2';
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

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then((cached) => {
            if (cached) {
                fetch(e.request).then((res) => {
                    if (res && res.status === 200) {
                        caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(e.request).then((res) => {
                if (!res || res.status !== 200 || res.type !== 'basic') return res;
                const clone = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
                return res;
            });
        }).catch(() => caches.match('./index.html'))
    );
});
