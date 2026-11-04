// ═══ NAVIGATION ═══
function goPage(p) { if (p !== PAGE) { ART_SEARCH = ""; BWG_SEARCH = ""; TF_HSEARCH = ""; window._scrollReset = true; } PAGE = p; BATCH = []; closeSidebar(); render(); }
function toggleSidebar() { const sb=document.getElementById("sbEl"),ov=document.getElementById("sbOv"); if(sb){sb.classList.toggle("open");ov?.classList.toggle("show");} }
function closeSidebar() { const sb=document.getElementById("sbEl"),ov=document.getElementById("sbOv"); if(sb){sb.classList.remove("open");ov?.classList.remove("show");} }
function setSTF(v) {
  // Während laufender Inventur Standort nicht wechseln – sonst landen Zählungen am falschen Standort
  if (typeof INV_ACTIVE !== "undefined" && INV_ACTIVE && v !== STF) {
    toast(LANG==="vi"?"Đang kiểm kê – hoàn thành hoặc hủy trước khi đổi chi nhánh":"Inventur läuft – erst abschließen oder abbrechen","e");
    return;
  }
  STF = v; render();
}
function setLang(l) { LANG = l; D.lang = l; save(); render(); }

// ═══ TELEGRAM BENACHRICHTIGUNGEN ═══