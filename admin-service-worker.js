// _CHEMERA_ 後台專屬 Service Worker
// 目的只是讓「加到主畫面」在 Android 上更容易被系統判定為可安裝的 App，
// 不做任何離線快取 —— 後台資料需要保持即時，快取舊資料反而會造成誤判。

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 純轉發：每個請求都直接打到網路，不做任何攔截或快取
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
