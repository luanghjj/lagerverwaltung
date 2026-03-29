// ═══ サービスワーカー — 在庫管理 PWA ═══
const CACHE_NAME = 'lager-v2.0.1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './manifest.json',
  './js/supabase.js',
  './js/config.js',
  './js/data.js',
  './js/state.js',
  './js/ui_helpers.js',
  './js/render.js',
  './js/dashboard.js',
  './js/auswertung.js',
  './js/artikel.js',
  './js/artikel_detail.js',
  './js/bewegungen.js',
  './js/inventur.js',
  './js/transfer.js',
  './js/export_bew.js',
  './js/bestellliste.js',
  './js/bestellungen.js',
  './js/lieferanten.js',
  './js/benutzer.js',
  './js/restaurant.js',
  './js/standorte.js',
  './js/lagerplaetze_inline.js',
  './js/qr.js',
  './js/lagerplaetze.js',
  './js/kategorien.js',
  './js/einstellungen.js',
  './js/export.js',
  './js/login.js',
  './js/navigation.js',
  './js/activity_log.js',
  './js/telegram.js',
  './js/offline.js',
  './js/push.js',
  './js/realtime.js',
  './js/init.js'
];

// インストール — 全アセットをキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート — 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ — ネットワーク優先、キャッシュにフォールバック
self.addEventListener('fetch', e => {
  // GET以外およびSupabase・外部リクエストをスキップ
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase')) return;
  if (e.request.url.includes('googleapis')) return;
  if (e.request.url.includes('cdn.jsdelivr')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// プッシュ通知 — Push Notification受信
self.addEventListener('push', e => {
  let data = { title: 'Lagerverwaltung', body: '', icon: './icons/icon-192.png', tag: 'lager' };
  try {
    if (e.data) {
      const json = e.data.json();
      data = { ...data, ...json };
    }
  } catch (err) {
    data.body = e.data ? e.data.text() : '';
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: data.tag || 'lager',
      data: data.url || './',
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

// 通知クリック — Notification Click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
      // Nếu app đã mở → focus
      for (const c of cl) {
        if (c.url.includes('index.html') && 'focus' in c) return c.focus();
      }
      // Nếu chưa mở → mở mới
      return clients.openWindow(url);
    })
  );
});
