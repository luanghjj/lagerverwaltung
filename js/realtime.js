// ═══ REALTIME SYNC — Multi-User Live Updates ═══
let _rtChannel = null;
let _rtLastSync = 0;
const RT_DEBOUNCE = 2000; // min 2s between reloads

function initRealtime() {
  if (!sb || typeof sb.channel !== "function") {
    console.warn("[RT] Supabase Realtime not available");
    return;
  }

  // Subscribe to all relevant table changes
  const tables = [
    "artikel", "artikel_bestand", "bereiche", "bereich_artikel",
    "bewegungen", "bestellungen", "bestellliste",
    "transfers", "transfer_items", "standorte",
    "anforderungen", "anforderung_items", "auffuellungen",
    "kategorien", "lieferanten", "users", "einstellungen",
    "lagerplaetze", "inventur_protokolle", "inventur_items"
  ];

  _rtChannel = sb.channel("lager-realtime");

  tables.forEach(table => {
    _rtChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => handleRealtimeChange(table, payload)
    );
  });

  _rtChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("🟢 Realtime connected");
      showSyncBadge("online");
    } else if (status === "CLOSED" || status === "TIMED_OUT") {
      console.warn("🔴 Realtime disconnected:", status);
      showSyncBadge("offline");
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (_rtChannel) { _rtChannel.unsubscribe(); _rtChannel = null; }
        initRealtime();
      }, 5000);
    }
  });
}

function handleRealtimeChange(table, payload) {
  const now = Date.now();

  // Ignore own changes (check if the change was made in the last 500ms - likely from this client)
  // Kurz nach eigener Änderung nicht verwerfen, sondern später neu laden (sonst gehen fremde Änderungen verloren)
  const wait = Math.max(1000, RT_DEBOUNCE - (now - _rtLastSync) + 1500);

  console.log(`📡 [RT] ${table}: ${payload.eventType}`, payload.new?.id || payload.old?.id || "");

  // Debounce: reload data after short delay to batch multiple rapid changes
  if (window._rtReloadTimer) clearTimeout(window._rtReloadTimer);
  window._rtReloadTimer = setTimeout(async () => {
    await realtimeReload();
  }, wait);
}

async function realtimeReload() {
  try {
    _rtLastSync = Date.now();
    const sbData = await sbLoadAll();
    if (sbData && sbData.artikel && sbData.artikel.length > 0) {
      // Preserve local-only settings
      sbData.lang = LANG;
      D = sbData;
      save();
      // Tài khoản bị xóa hoặc PIN đổi trên máy khác → bắt đăng nhập lại
      if (U) {
        const fresh = D.users.find(u => u.id === U.id);
        if (!fresh || fresh.pin !== U.pin) { U = null; clearSession(); }
        else { U = fresh; saveSession(); }
      }
      render();
      showSyncToast();
      console.log("🔄 Realtime data refreshed");
    }
  } catch (e) {
    console.error("[RT] Reload failed:", e);
  }
}

// Mark outgoing changes to prevent self-trigger
function rtMarkLocalChange() {
  _rtLastSync = Date.now();
}

function showSyncBadge(status) {
  const el = document.getElementById("rtBadge");
  if (!el) return;
  if (status === "online") {
    el.style.background = "var(--gn)";
    el.title = LANG === "vi" ? "Đồng bộ trực tiếp" : "Live-Sync aktiv";
  } else {
    el.style.background = "var(--rd)";
    el.title = LANG === "vi" ? "Mất kết nối" : "Verbindung verloren";
  }
}

function showSyncToast() {
  // Subtle sync notification — don't interrupt user
  const msg = LANG === "vi" ? "🔄 Dữ liệu đã cập nhật" : "🔄 Daten aktualisiert";
  toast(msg, "i");
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (_rtChannel) { _rtChannel.unsubscribe(); _rtChannel = null; }
});
