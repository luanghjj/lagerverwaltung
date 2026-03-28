// ═══ RENDER ENGINE ═══
// ═══ RENDER ENGINE ═══
function render() {
  if (!U) { renderLogin(); return; }
  const app = $("#app");
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s => U.standorte.includes(s.id));
  const aS = STF === "all" ? null : STF;
  const fS = aS ? vS.filter(s=>s.id===aS) : vS; // filtered standorte for critCount
  const cartCount = D.bestellliste.length;
  const critCount = D.artikel.filter(a=>fS.some(s=>{const ist=a.istBestand[s.id]||0,min=a.mindestmenge[s.id]||0;return min>0&&ist<=min;})).length;

  const NAV = [
    {id:"dashboard",l:t("nav.dashboard"),s:"main",pm:"dashboard",svg:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
    {id:"auswertung",l:LANG==="vi"?"Phân tích":"Auswertung",s:"main",pm:"auswertung",svg:'<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/>'},
    {id:"artikel",l:t("nav.articles"),s:"lager",bdg:critCount||null,bdgColor:"var(--rd)",svg:'<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10"/>'},
    {id:"eingang",l:t("nav.goodsin"),s:"lager",pm:"eingang",svg:'<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>'},
    {id:"ausgang",l:t("nav.goodsout"),s:"lager",pm:"ausgang",svg:'<path d="M12 21V9m0 0l4 4m-4-4l-4 4M5 3h14"/>'},
    {id:"transfer",l:LANG==="vi"?"Chuyển kho":"Umbuchen",s:"lager",pm:"transfer",svg:'<path d="M4 12h16m0 0l-4-4m4 4l-4 4M20 12H4m0 0l4 4m-4-4l4-4"/>'},
    {id:"bewegungen",l:t("nav.movements"),s:"lager",pm:"bewegungen",svg:'<path d="M7 16V4m0 12l-3-3m3 3l3-3M17 8v12m0-12l3 3m-3-3l-3 3"/>'},
    {id:"inventur",l:LANG==="vi"?"Kiểm kê":"Inventur",s:"lager",pm:"inventur",svg:'<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12l2 2 4-4"/>'},
    {id:"bestellliste",l:t("nav.orderlist"),s:"einkauf",pm:"bestellliste",bdg:cartCount||null,svg:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>'},
    {id:"bestellungen",l:t("nav.orders"),s:"einkauf",pm:"bestellungen",svg:'<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>'},
    {id:"lieferanten",l:t("nav.suppliers"),s:"einkauf",pm:"lieferanten.read",svg:'<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'},
    {id:"rst_bereiche",l:t("rst.bereiche"),s:"restaurant",pm:"bereiche.view",svg:'<path d="M3 3h18v18H3z M3 9h18 M9 3v18"/>' },
    {id:"rst_auffuellung",l:t("rst.auffuellung"),s:"restaurant",pm:"bereiche.view",svg:'<path d="M12 3v12m0 0l-4-4m4 4l4-4"/><rect x="4" y="18" width="16" height="2" rx="1"/>'},
    {id:"standorte",l:t("nav.locations"),s:"admin",pm:"standorte",svg:'<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>'},
    {id:"benutzer",l:t("nav.users"),s:"admin",pm:"benutzer",svg:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>'},
    {id:"kategorien",l:t("nav.categories"),s:"admin",pm:"kategorien",svg:'<circle cx="9.5" cy="9.5" r="5.5"/><circle cx="15.5" cy="14.5" r="5.5"/>'},
    {id:"lagerplaetze",l:LANG==="vi"?"Vị trí kho":"Lagerplätze",s:"admin",pm:"standorte",svg:'<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10"/><rect x="9" y="13" width="6" height="6" rx="1"/>'},
    {id:"einstellungen",l:t("nav.settings"),s:"admin",pm:"einstellungen",svg:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33"/>'},
  ];
  const secs = {main:t("nav.overview"),lager:t("nav.warehouse"),einkauf:t("nav.purchase"),restaurant:t("rst.restaurant"),admin:t("nav.admin")};
  const ic = (svg) => `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">${svg}</svg>`;

  let sidebar = `<div class="hb" onclick="toggleSidebar()"><span></span></div><div class="sb-ov" id="sbOv" onclick="toggleSidebar()"></div><div class="sb" id="sbEl"><div class="sb-h"><div style="display:flex;justify-content:space-between;align-items:center"><div class="sb-logo">${esc(D.einstellungen.firmenname)}</div><div style="display:flex;gap:3px;align-items:center"><div class="theme-sw"><button class="theme-btn ${THEME==="light"?"on":""}" onclick="setTheme('light')" title="Hell">☀</button><button class="theme-btn ${THEME==="dark"?"on":""}" onclick="setTheme('dark')" title="Dunkel">🌙</button></div><div class="lang-sw"><button class="lang-btn ${LANG==="de"?"on":""}" onclick="setLang('de')">DE</button><button class="lang-btn ${LANG==="vi"?"on":""}" onclick="setLang('vi')">VI</button></div></div></div><div class="sb-sub">${t("nav.warehouse")}</div></div><div class="sb-n">`;
  const secKeys = [...new Set(NAV.map(n=>n.s))];
  for (const sec of secKeys) {
    const items = NAV.filter(n => n.s === sec && (!n.pm || can(U.role, n.pm)));
    if (!items.length) continue;
    sidebar += `<div class="sb-s">${secs[sec]}</div>`;
    for (const n of items) {
      sidebar += `<div class="sb-i ${PAGE===n.id?"on":""}" onclick="goPage('${n.id}')">${ic(n.svg)}<span>${n.l}</span>${n.bdg?`<span class="bg" ${n.bdgColor?`style="background:${n.bdgColor}"`:""}">${n.bdg}</span>`:""}</div>`;
    }
  }
  sidebar += `</div><div class="sb-u"><div class="sb-av" style="background:${ROLES[U.role].color}">${U.name[0]}</div><div style="flex:1;min-width:0"><div class="sb-un">${esc(U.name)}</div><div class="sb-ur">${t("r."+U.role)}</div></div><div class="sb-lo" onclick="logout()"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></div></div>${typeof APP_ONLINE!=="undefined"&&!APP_ONLINE?`<div style="padding:3px 12px;text-align:center;background:var(--yA);border-top:1px solid var(--bd)"><span style="font-size:10px;font-weight:700;color:var(--yl)">⚠ ${LANG==="vi"?"Ngoại tuyến":"Offline"}</span><span style="font-size:9px;color:var(--t3);margin-left:4px">${LANG==="vi"?"Dữ liệu cục bộ":"Lokale Daten"}</span></div>`:""}<div style="padding:2px 12px 6px;text-align:center;font-size:9px;color:var(--t3);font-family:var(--m);opacity:.5">${APP_VERSION}</div></div>`;

  // Standort bar
  let stBar = "";
  if (vS.length > 1) {
    stBar = `<div class="st-bar"><span class="st-l">${t("c.location")}:</span><div style="display:flex;gap:2px;flex-wrap:wrap"><span class="st-ch ${STF==="all"?"on":""}" onclick="setSTF('all')">${t("c.all")}</span>${vS.map(s=>`<span class="st-ch ${STF===s.id?"on":""}" onclick="setSTF('${s.id}')">${esc(s.name)}</span>`).join("")}</div></div>`;
  }

  // Main content
  let content = "";
  const noAccess = `<div class="mn-h"><div class="mn-t">🚫</div></div><div class="mn-c"><div style="text-align:center;padding:40px;color:var(--t3)">${LANG==="vi"?"Bạn không có quyền truy cập trang này":"Kein Zugriff auf diese Seite"}</div></div>`;
  if (PAGE === "dashboard") content = can(U.role,"dashboard") ? renderDashboard(vS, aS) : noAccess;
  else if (PAGE === "auswertung") content = can(U.role,"auswertung") ? renderAuswertung(vS, aS) : noAccess;
  else if (PAGE === "artikel") content = renderArtikel(vS, aS);
  else if (PAGE === "eingang") content = can(U.role,"eingang") ? renderBewBuch("eingang", vS, aS) : noAccess;
  else if (PAGE === "ausgang") content = can(U.role,"ausgang") ? renderBewBuch("ausgang", vS, aS) : noAccess;
  else if (PAGE === "bewegungen") content = can(U.role,"bewegungen") ? renderBewegungen(vS, aS) : noAccess;
  else if (PAGE === "transfer") content = can(U.role,"transfer") ? renderTransfer(vS, aS) : noAccess;
  else if (PAGE === "inventur") content = can(U.role,"inventur") ? renderInventur(vS, aS) : noAccess;
  else if (PAGE === "bestellliste") content = can(U.role,"bestellliste") ? renderBestellliste(vS, aS) : noAccess;
  else if (PAGE === "bestellungen") content = can(U.role,"bestellungen") ? renderBestellungen(vS, aS) : noAccess;
  else if (PAGE === "lieferanten") content = can(U.role,"lieferanten.read") ? renderLieferanten() : noAccess;
  else if (PAGE === "rst_bereiche") content = can(U.role,"bereiche.view") ? renderRstBereiche(vS, aS) : noAccess;
  else if (PAGE === "rst_auffuellung") content = can(U.role,"bereiche.view") ? renderRstAuffuellung(vS, aS) : noAccess;
  else if (PAGE === "standorte") content = can(U.role,"standorte") ? renderStandorte() : noAccess;
  else if (PAGE === "benutzer") content = can(U.role,"benutzer") ? renderBenutzer() : noAccess;
  else if (PAGE === "kategorien") content = can(U.role,"kategorien") ? renderKategorien() : noAccess;
  else if (PAGE === "lagerplaetze") content = can(U.role,"standorte") ? renderLagerplaetze() : noAccess;
  else if (PAGE === "einstellungen") content = can(U.role,"einstellungen") ? renderEinstellungen() : noAccess;
  else content = `<div class="mn-c" style="padding:40px;text-align:center;color:var(--t3)">Seite: ${PAGE}</div>`;

  // Critical articles banner
  let critBanner = "";
  if (critCount > 0) {
    critBanner = `<div class="crit-bar" style="padding:4px 16px;background:var(--rA);border-bottom:1px solid rgba(239,68,68,.15);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;cursor:pointer" onclick="goPage('artikel')"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px">🔴</span><span style="font-size:11px;font-weight:600;color:var(--rd)">${critCount} ${LANG==="vi"?"SP dưới mức tối thiểu":"Artikel unter Mindestbestand"}</span></div><button class="btn btn-d btn-sm" onclick="event.stopPropagation();goPage('bestellliste')" style="font-size:10px;padding:2px 8px">${LANG==="vi"?"Đặt hàng":"Bestellen"}</button></div>`;
  }

  // Save scroll position before re-render
  const mnc = document.querySelector(".mn-c");
  const scrollTop = mnc ? mnc.scrollTop : 0;

  app.innerHTML = `<div class="app">${sidebar}<div class="mn">${stBar}${critBanner}${content}</div></div>`;

  // Restore scroll position after re-render (skip on page change)
  const mnc2 = document.querySelector(".mn-c");
  if (mnc2) {
    if (window._scrollReset) { mnc2.scrollTop = 0; window._scrollReset = false; }
    else if (scrollTop > 0) mnc2.scrollTop = scrollTop;
  }

  // Restore search focus after render
  if (PAGE === "artikel" && ART_SEARCH) {
    const si = document.getElementById("artSearch");
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
  if (PAGE === "bewegungen" && BWG_SEARCH) {
    const si = document.getElementById("bewSearch");
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
  if (PAGE === "transfer" && TF_HSEARCH) {
    const si = document.getElementById("tfHSearch");
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
  if (PAGE === "inventur" && INV_SEARCH) {
    const si = document.getElementById("inv_search");
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }
}