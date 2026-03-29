// ═══ APP INITIALIZATION ═══
let APP_ONLINE = true;
(async function() {
  // Show loading
  document.getElementById("app").innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--t2);font-family:Outfit"><div style="text-align:center"><div style="font-size:24px;margin-bottom:8px">⏳</div><div>Lade Daten...</div></div></div>';

  // Try Supabase first
  let loaded = false;
  try {
    const sbData = await sbLoadAll();
    if (sbData && sbData.artikel && sbData.artikel.length > 0) {
      try {
        const cached = JSON.parse(localStorage.getItem(SK) || "{}");
        sbData.lang = cached.lang || "de";
        sbData.theme = cached.theme || "dark";
      } catch(e) {}
      D = sbData;
      LANG = D.lang || "de";
      THEME = D.theme || "dark";
      applyTheme();
      fixMobileHeight();
      save();
      loaded = true;
      APP_ONLINE = true;
      console.log("✅ App loaded from Supabase");
    }
  } catch(e) {
    console.warn("[init] Supabase failed:", e);
    APP_ONLINE = false;
  }

  // Fallback to localStorage
  if (!loaded) {
    load();
    APP_ONLINE = false;
    console.log("⚠️ App loaded from localStorage (offline)");
  }

  // Listen for online/offline events
  window.addEventListener("online", () => { APP_ONLINE = true; render(); });
  window.addEventListener("offline", () => { APP_ONLINE = false; render(); });

  checkQRScan();
  render();

  // プッシュ通知の初期化
  if (typeof initPush === 'function') setTimeout(() => initPush(), 2000);

  // Realtime sync initialization
  if (APP_ONLINE && typeof initRealtime === 'function') setTimeout(() => initRealtime(), 1000);
})();
