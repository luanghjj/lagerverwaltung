// ═══ オフラインキュー & 同期 ═══

const OFFLINE_QUEUE_KEY = '_offlineQueue';

// ── キューヘルパー ──
function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || []; }
  catch { return []; }
}

function setOfflineQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  updateSyncBadge();
}

function queueOfflineAction(fnName, args) {
  const queue = getOfflineQueue();
  queue.push({ fn: fnName, args, ts: new Date().toISOString() });
  setOfflineQueue(queue);
  console.log(`[Sync] Queued: ${fnName} (${queue.length} pending)`);
}

// ── オンライン時にキューを処理 ──
async function processOfflineQueue() {
  const queue = getOfflineQueue();
  if (!queue.length || !navigator.onLine) return;

  console.log(`[Sync] Processing ${queue.length} offline actions...`);
  const failed = [];
  let success = 0;

  for (const item of queue) {
    try {
      const fn = window['_orig_' + item.fn] || window[item.fn];
      if (typeof fn === 'function') {
        await fn(...item.args);
        success++;
      }
    } catch (e) {
      console.error(`[Sync] Failed: ${item.fn}`, e);
      failed.push(item);
    }
  }

  setOfflineQueue(failed);
  if (success > 0) toast(`${LANG==="vi"?`Đã đồng bộ ${success} thao tác`:`${success} Aktionen synchronisiert`}`, "s");
  if (failed.length > 0) toast(`${failed.length} ${LANG==="vi"?"thao tác chưa đồng bộ được":"Aktionen ausstehend"}`, "i");
}

// ── モンキーパッチ — sb*関数をラップしてオフライン時に自動キュー ──
const SB_FUNCTIONS = [
  'sbSaveArtikel', 'sbSaveBewegung', 'sbSaveBestellung', 'sbSaveTransfer',
  'sbSaveUser', 'sbSaveBereich', 'sbSaveLieferant', 'sbSaveKategorie',
  'sbSaveStandort', 'sbSaveLagerplatz', 'sbSaveBestelllisteItem',
  'sbSaveEinstellungen', 'sbSaveInventur', 'sbSaveAnforderung',
  'sbSaveAuffuellung', 'sbDeleteUser', 'sbDeleteBereich',
  'sbDeleteLieferant', 'sbDeleteKategorie', 'sbDeleteLagerplatz',
  'sbDeleteBestelllisteItem', 'sbDeleteAnforderung', 'sbClearBestellliste'
];

function wrapSbFunctions() {
  SB_FUNCTIONS.forEach(fnName => {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;

    // Lưu bản gốc
    window['_orig_' + fnName] = orig;

    // Thay thế bằng wrapper
    window[fnName] = async function(...args) {
      if (!navigator.onLine) {
        queueOfflineAction(fnName, args);
        return;
      }
      try {
        await orig.apply(this, args);
      } catch (e) {
        console.warn(`⚠ ${fnName} failed, queuing:`, e.message);
        queueOfflineAction(fnName, args);
      }
    };
  });
  console.log(`[Sync] Wrapped ${SB_FUNCTIONS.length} functions`);
}

// ── UI: 同期待ちバッジ表示 ──
function updateSyncBadge() {
  const count = getOfflineQueue().length;
  let badge = document.getElementById('syncBadge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'syncBadge';
      badge.style.cssText = 'position:fixed;top:4px;top:calc(4px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:999;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;font-family:var(--f);display:flex;align-items:center;gap:4px;animation:toastIn .3s cubic-bezier(.16,1,.3,1);box-shadow:0 4px 16px rgba(0,0,0,.4);pointer-events:none';
      document.body.appendChild(badge);
    }
    const on = navigator.onLine;
    badge.style.background = on ? 'var(--yA)' : 'var(--rA)';
    badge.style.color = on ? 'var(--yl)' : 'var(--rd)';
    badge.style.border = on ? '1px solid rgba(245,158,11,.3)' : '1px solid rgba(239,68,68,.3)';
    badge.innerHTML = on
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> ${LANG==="vi"?"Đang đồng bộ...":"Synchronisiere..."} (${count})`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> ${LANG==="vi"?"Offline":"Offline"} · ${count} ${LANG==="vi"?"chờ":"wartend"}`;
  } else {
    if (badge) badge.remove();
  }
}

// ── イベントリスナー ──
window.addEventListener('online', () => {
  console.log('[Sync] Online');
  toast(LANG==="vi"?"Đã có mạng — đang đồng bộ...":"Online — synchronisiere...", "s");
  updateSyncBadge();
  setTimeout(() => processOfflineQueue(), 1500);
});

window.addEventListener('offline', () => {
  console.log('[Sync] Offline');
  toast(LANG==="vi"?"Mất mạng — thao tác được lưu tạm":"Offline — Aktionen werden lokal gespeichert", "i");
  updateSyncBadge();
});

// ── 初期化 ──
// ロード時にラップ（他のスクリプトの後に実行）
window.addEventListener('load', () => {
  wrapSbFunctions();
  updateSyncBadge();
  if (navigator.onLine && getOfflineQueue().length > 0) {
    setTimeout(() => processOfflineQueue(), 3000);
  }
  // 30秒ごとに自動リトライ
  setInterval(() => {
    if (navigator.onLine && getOfflineQueue().length > 0) processOfflineQueue();
  }, 30000);
});

console.log("[Sync] Offline queue module loaded");
