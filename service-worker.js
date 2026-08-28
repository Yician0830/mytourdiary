// _CHEMERA_ DIARY — Service Worker
// 目標：快取網站骨架（HTML/字型/圖示）以加快重複造訪速度、支援離線開啟，
// 並對照片圖片採用「先秀快取、背景更新」策略，兼顧速度與新鮮度。
// 不快取 Firebase/Firestore 的即時資料請求，避免看到過期的按讚數或照片列表。

const SHELL_CACHE = 'chemera-shell-v2';
const IMAGE_CACHE = 'chemera-images-v2';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {}) // 離線開發或部分資源缺漏時不阻擋安裝
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isFirebaseRequest(url) {
  return /firestore\.googleapis\.com|firebaseio\.com|googleapis\.com\/.*identitytoolkit|gstatic\.com\/firebasejs/.test(url);
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  return /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || url.includes('images.weserv.nl');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  // Firebase 即時資料一律走網路，不快取，避免資料過期
  if (isFirebaseRequest(url)) return;

  // 照片圖片：Stale-While-Revalidate（先回快取，同時在背景更新）
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 網站骨架（HTML/CSS/字型等同源資源）：Cache First，網路失敗時回退快取
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
    })
  );
});
