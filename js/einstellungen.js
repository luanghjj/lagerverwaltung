// ═══ EINSTELLUNGEN (Settings, Backup, Reset) ═══
function renderEinstellungen() {
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.settings")}</div></div><div class="mn-c" style="max-width:600px">`;

  // Language + Theme
  h += `<div class="g2"><div class="fg"><label>${t("set.language")}</label><div class="lang-sw"><button class="lang-btn ${LANG==="de"?"on":""}" onclick="setLang('de')" style="padding:6px 16px;font-size:13px">🇩🇪 Deutsch</button><button class="lang-btn ${LANG==="vi"?"on":""}" onclick="setLang('vi')" style="padding:6px 16px;font-size:13px">🇻🇳 Tiếng Việt</button></div></div>`;
  h += `<div class="fg"><label>Design</label><div class="theme-sw"><button class="theme-btn ${THEME==="light"?"on":""}" onclick="setTheme('light')" style="padding:6px 16px;font-size:13px">☀ ${LANG==="vi"?"Sáng":"Hell"}</button><button class="theme-btn ${THEME==="dark"?"on":""}" onclick="setTheme('dark')" style="padding:6px 16px;font-size:13px">🌙 ${LANG==="vi"?"Tối":"Dunkel"}</button></div></div></div>`;
  h += `<div class="fg"><label>Firmenname</label><input class="inp" value="${esc(D.einstellungen.firmenname)}" onchange="D.einstellungen.firmenname=this.value;save();if(typeof sbSaveEinstellungen==='function')sbSaveEinstellungen().catch(e=>console.error('sbEinst:',e))"></div>`;

  // Telegram
  h += `<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px;padding-top:10px;border-top:1px solid var(--bd)">📨 Telegram</h3>`;
  h += `<div class="fg"><label><input type="checkbox" ${D.einstellungen.telegramBenachrichtigung?"checked":""} onchange="D.einstellungen.telegramBenachrichtigung=this.checked;save();render()"> ${LANG==="vi"?"Gửi thông báo qua Telegram":"Benachrichtigungen über Telegram"}</label></div>`;

  if (D.einstellungen.telegramBenachrichtigung) {
    // Iframe warning
    if (window.self !== window.top) {
      h += `<div style="font-size:10px;color:var(--yl);margin-bottom:6px;padding:4px 8px;background:var(--yA);border-radius:4px">⚠ ${LANG==="vi"?"Telegram chỉ hoạt động khi mở file trực tiếp":"Telegram funktioniert nur beim direkten Öffnen der Datei"}</div>`;
    }

    // Multi-channel management
    if (!D.einstellungen.tgChannels) D.einstellungen.tgChannels = [];
    // Migrate old single config
    if (D.einstellungen.telegramBotToken && !D.einstellungen.tgChannels.length) {
      D.einstellungen.tgChannels.push({ id: uid(), name: "Haupt", token: D.einstellungen.telegramBotToken, chatId: D.einstellungen.telegramChatId, standorte: ["all"] });
      D.einstellungen.telegramBotToken = ""; D.einstellungen.telegramChatId = "";
      save();
    }

    h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">${LANG==="vi"?"Kênh Telegram":"Telegram-Kanäle"}</div>`;

    D.einstellungen.tgChannels.forEach((ch, idx) => {
      const stNames = ch.standorte?.includes("all") ? (LANG==="vi"?"Tất cả":"Alle Standorte") : (ch.standorte||[]).map(sId => D.standorte.find(s=>s.id===sId)?.name||"?").join(", ");
      h += `<div class="cd" style="margin-bottom:6px;border-left:3px solid var(--ac)">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
      h += `<div style="font-weight:700;font-size:12px">${ch.name?esc(ch.name):`Kanal ${idx+1}`} <span style="font-size:10px;color:var(--t3);font-weight:400">(${esc(stNames)})</span></div>`;
      h += `<div style="display:flex;gap:3px"><button class="btn btn-o btn-sm" onclick="testTgChannel(${idx})">🧪</button><button class="bi" onclick="editTgChannel(${idx})">✎</button><button class="bi dn" onclick="removeTgChannel(${idx})">🗑</button></div></div>`;
      h += `<div style="font-size:10px;color:var(--t3);font-family:var(--m);word-break:break-all">Token: ${esc((ch.token||"").slice(0,8))}... · Chat: ${esc(ch.chatId||"")}</div>`;
      h += `</div>`;
    });

    h += `<button class="btn btn-o btn-sm" onclick="editTgChannel(-1)" style="margin-bottom:12px">+ ${LANG==="vi"?"Thêm kênh":"Kanal hinzufügen"}</button>`;

    // Notification event types
    if (!D.einstellungen.tgEvents) D.einstellungen.tgEvents = {bestellung:true,eingang:true,ausgang:true,transfer:true,inventur:true,kritisch:true};
    const ev = D.einstellungen.tgEvents;
    const evDef = [
      {id:"bestellung",de:"📦 Bestellungen aufgegeben",vi:"📦 Đặt hàng"},
      {id:"eingang",de:"↓ Wareneingang gebucht",vi:"↓ Nhập kho"},
      {id:"ausgang",de:"↑ Warenausgang gebucht",vi:"↑ Xuất kho"},
      {id:"transfer",de:"⇄ Transfer gesendet/empfangen",vi:"⇄ Chuyển kho"},
      {id:"inventur",de:"📋 Inventur abgeschlossen",vi:"📋 Kiểm kê xong"},
      {id:"kritisch",de:"🔴 Kritischer Bestand (unter Minimum)",vi:"🔴 Tồn kho thấp"},
    ];
    h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">${LANG==="vi"?"Loại thông báo":"Benachrichtigungen für"}</div>`;
    h += `<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px">`;
    evDef.forEach(e => {
      h += `<label style="display:flex;align-items:center;gap:6px;font-size:11.5px;cursor:pointer"><input type="checkbox" ${ev[e.id]?"checked":""} onchange="D.einstellungen.tgEvents.${e.id}=this.checked;save()"> ${LANG==="vi"?e.vi:e.de}</label>`;
    });
    h += `</div>`;
  }

  // Backup / Restore
  h += `<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px;padding-top:10px;border-top:1px solid var(--bd)">💾 ${LANG==="vi"?"Sao lưu & Khôi phục":"Backup & Restore"}</h3>`;

  // Storage info
  const storageUsed = new Blob([JSON.stringify(D)]).size;
  const storageKB = (storageUsed / 1024).toFixed(1);
  const storageMB = (storageUsed / (1024*1024)).toFixed(2);
  const pct = Math.min(100, storageUsed / (5*1024*1024) * 100);
  h += `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t2);margin-bottom:3px"><span>localStorage: ${storageKB} KB (${storageMB} MB)</span><span style="color:${pct>80?"var(--rd)":pct>50?"var(--yl)":"var(--gn)"}">${pct.toFixed(0)}% ${LANG==="vi"?"đã dùng":"belegt"}</span></div>`;
  h += `<div style="height:6px;background:var(--b4);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct>80?"var(--rd)":pct>50?"var(--yl)":"var(--gn)"};border-radius:3px"></div></div></div>`;

  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">`;
  h += `<button class="btn btn-p" onclick="openBackupModal()">📥 ${LANG==="vi"?"Sao lưu chọn lọc":"Selektives Backup"}</button>`;
  h += `<button class="btn btn-o" onclick="document.getElementById('importJSON').click()">📤 ${LANG==="vi"?"Khôi phục":"Backup laden"}</button>`;
  h += `<input type="file" id="importJSON" accept=".json" style="display:none" onchange="importJSON(this.files)">`;
  h += `</div>`;

  // Data summary
  h += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">`;
  h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${D.artikel.length} ${t("c.article")}</span>`;
  h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${D.lieferanten.length} ${t("c.supplier")}</span>`;
  h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${D.bewegungen.length} ${LANG==="vi"?"biến động":"Buchungen"}</span>`;
  h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${D.standorte.length} ${LANG==="vi"?"chi nhánh":"Standorte"}</span>`;
  h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${D.users.length} User</span>`;
  const imgCount = D.artikel.reduce((s,a)=>s+(a.bilder||[]).filter(b=>b.startsWith("data:")).length,0);
  if (imgCount) h += `<span class="bp" style="background:var(--yA);color:var(--yl)">${imgCount} ${LANG==="vi"?"ảnh nhúng":"eingebettete Bilder"}</span>`;
  h += `</div>`;

  // Reset - Admin only
  if (U?.role === "admin") {
    h += `<div style="padding-top:12px;border-top:1px solid var(--bd)"><div style="font-size:10px;color:var(--rd);margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">⚠ ${LANG==="vi"?"Vùng nguy hiểm":"Gefahrenzone"}</div>`;
    h += `<button class="btn btn-d" onclick="resetAll()">🗑 ${LANG==="vi"?"Đặt lại toàn bộ dữ liệu":"Alle Daten zurücksetzen"}</button>`;
    h += `</div>`;
  }

  h += `</div>`;
  return h;
}

function exportJSON() {
  // Quick full export (legacy)
  const data = JSON.stringify(D, null, 2);
  dlFile(data, `Lagerverwaltung_Backup_${td()}.json`, "application/json");
  toast(`💾 ${LANG==="vi"?"Đã xuất backup":"Backup exportiert"} (${(new Blob([data]).size/1024).toFixed(0)} KB)`,"s");
}

// ═══ SELECTIVE BACKUP SYSTEM ═══
function bkpSizeOf(obj) {
  return new Blob([JSON.stringify(obj)]).size;
}
function bkpFmt(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(2) + " MB";
}

function bkpGetSections() {
  const imgSize = D.artikel.reduce((s,a)=>s+bkpSizeOf((a.bilder||[]).filter(b=>b.startsWith("data:"))),0);
  const artNoImg = D.artikel.map(a=>({...a,bilder:[]}));
  return [
    { id:"stamm", icon:"📦", de:"Stammdaten",vi:"Dữ liệu gốc",desc_de:"Artikel (ohne Bilder), Kategorien, Standorte, Lagerplätze, Lieferanten, Bereiche",desc_vi:"Sản phẩm (không ảnh), danh mục, chi nhánh, vị trí kho, NCC, khu vực",
      count:`${D.artikel.length} Art., ${D.kategorien.length} Kat., ${D.lieferanten.length} Lief., ${D.standorte.length} Std.`,
      size:bkpSizeOf({artikel:artNoImg,kategorien:D.kategorien,standorte:D.standorte,lagerplaetze:D.lagerplaetze||[],lieferanten:D.lieferanten,bereiche:D.bereiche||[]}),
      color:"var(--ac)", default:true },
    { id:"users", icon:"👥", de:"Benutzer & Rechte",vi:"Người dùng & Quyền",desc_de:"Benutzer, PINs, Rollen, Standort-Zugriff",desc_vi:"Người dùng, PIN, vai trò, quyền truy cập",
      count:`${D.users.length} User`,
      size:bkpSizeOf(D.users),
      color:"var(--pu)", default:true },
    { id:"bestand", icon:"📊", de:"Bestände",vi:"Tồn kho",desc_de:"Ist/Soll/Min-Werte, Lagerorte pro Standort",desc_vi:"Giá trị Tồn/Chuẩn/Min, vị trí kho theo chi nhánh",
      count:`${D.artikel.length}×${D.standorte.length} Werte`,
      size:bkpSizeOf(D.artikel.map(a=>({id:a.id,istBestand:a.istBestand,sollBestand:a.sollBestand,mindestmenge:a.mindestmenge,lagerort:a.lagerort}))),
      color:"var(--gn)", default:true },
    { id:"bewegungen", icon:"↕", de:"Bewegungen",vi:"Biến động",desc_de:"Warenein-/ausgang, Korrekturen, Umbuchungen",desc_vi:"Nhập/xuất kho, điều chỉnh, chuyển kho",
      count:`${D.bewegungen.length}`,
      size:bkpSizeOf(D.bewegungen),
      color:"#F59E0B", default:true, hasTimeFilter:true },
    { id:"bestellungen", icon:"📋", de:"Bestellungen",vi:"Đơn hàng",desc_de:"Bestellungen, Bestellliste, Vorlagen",desc_vi:"Đơn hàng, danh sách đặt, mẫu",
      count:`${D.bestellungen.length} Best., ${D.bestellliste.length} Liste, ${(D.bestellVorlagen||[]).length} Vorl.`,
      size:bkpSizeOf({bestellungen:D.bestellungen,bestellliste:D.bestellliste,bestellVorlagen:D.bestellVorlagen||[]}),
      color:"#0EA5E9", default:true, hasTimeFilter:true },
    { id:"transfers", icon:"⇄", de:"Transfers",vi:"Chuyển kho",desc_de:"Umbuchungen zwischen Standorten",desc_vi:"Chuyển kho giữa các chi nhánh",
      count:`${(D.transfers||[]).length}`,
      size:bkpSizeOf(D.transfers||[]),
      color:"var(--pu)", default:true },
    { id:"inventur", icon:"📋", de:"Inventur & Preise",vi:"Kiểm kê & Giá",desc_de:"Inventur-Protokolle, Preishistorie, Anforderungen, Auffüllungen",desc_vi:"Biên bản kiểm kê, lịch sử giá, yêu cầu, bổ sung",
      count:`${(D.inventurProtokolle||[]).length} Inv., ${(D.preisHistorie||[]).length} Preise`,
      size:bkpSizeOf({inventurProtokolle:D.inventurProtokolle||[],preisHistorie:D.preisHistorie||[],anforderungen:D.anforderungen||[],auffuellungen:D.auffuellungen||[]}),
      color:"#6366F1", default:false },
    { id:"einstellungen", icon:"⚙", de:"Einstellungen",vi:"Cài đặt",desc_de:"Firmenname, Telegram-Kanäle, Benachrichtigungen",desc_vi:"Tên công ty, kênh Telegram, thông báo",
      count:"",
      size:bkpSizeOf(D.einstellungen),
      color:"var(--t2)", default:true },
    { id:"bilder", icon:"🖼", de:"Bilder",vi:"Hình ảnh",desc_de:"Eingebettete Artikelbilder (base64)",desc_vi:"Ảnh sản phẩm nhúng (base64)",
      count:`${D.artikel.reduce((s,a)=>s+(a.bilder||[]).filter(b=>b.startsWith("data:")).length,0)} Bilder`,
      size:imgSize,
      color:"#EC4899", default:false },
  ];
}

function openBackupModal() {
  const sections = bkpGetSections();
  const totalSize = sections.reduce((s,sec)=>s+sec.size,0);
  window._bkpSel = {};
  sections.forEach(s => { window._bkpSel[s.id] = s.default; });
  window._bkpDays = 0; // 0 = all

  let h = `<div class="mo-ov" id="bkpModal" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">💾 ${LANG==="vi"?"Sao lưu chọn lọc":"Selektives Backup"}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  // Presets
  h += `<div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">`;
  h += `<button class="btn btn-p btn-sm" onclick="bkpPreset('all')">✓ ${LANG==="vi"?"Tất cả":"Alles"}</button>`;
  h += `<button class="btn btn-o btn-sm" onclick="bkpPreset('stamm')">${LANG==="vi"?"Chỉ dữ liệu gốc":"Nur Stammdaten"}</button>`;
  h += `<button class="btn btn-o btn-sm" onclick="bkpPreset('compact')">${LANG==="vi"?"Gọn (không ảnh/lịch sử)":"Kompakt (ohne Bilder/Historie)"}</button>`;
  h += `<button class="btn btn-o btn-sm" onclick="bkpPreset('none')">○ ${LANG==="vi"?"Bỏ chọn":"Keine"}</button>`;
  h += `</div>`;

  // Section checkboxes
  h += `<div id="bkpSections">`;
  sections.forEach(sec => {
    const pctOfTotal = totalSize > 0 ? (sec.size / totalSize * 100).toFixed(0) : 0;
    h += `<div class="cd" style="margin-bottom:4px;border-left:3px solid ${sec.color};cursor:pointer;transition:opacity .1s" id="bkpSec_${sec.id}" onclick="bkpToggle('${sec.id}')">`;
    h += `<div style="display:flex;align-items:center;gap:8px">`;
    h += `<div style="width:20px;height:20px;border-radius:4px;border:2px solid ${sec.color};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;background:${window._bkpSel[sec.id]?sec.color:"transparent"};color:#fff;transition:all .1s" id="bkpChk_${sec.id}">${window._bkpSel[sec.id]?"✓":""}</div>`;
    h += `<div style="font-size:18px;flex-shrink:0">${sec.icon}</div>`;
    h += `<div style="flex:1;min-width:0">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-size:12.5px">${LANG==="vi"?sec.vi:sec.de}</span>`;
    h += `<span style="font-family:var(--m);font-size:10px;color:var(--t3)">${bkpFmt(sec.size)} (${pctOfTotal}%)</span></div>`;
    h += `<div style="font-size:10px;color:var(--t3)">${LANG==="vi"?sec.desc_vi:sec.desc_de}</div>`;
    if (sec.count) h += `<div style="font-size:10px;color:var(--t2);font-family:var(--m);margin-top:1px">${sec.count}</div>`;
    // Size bar
    h += `<div style="height:3px;background:var(--b4);border-radius:2px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${pctOfTotal}%;background:${sec.color};border-radius:2px;opacity:.5"></div></div>`;
    h += `</div></div></div>`;
  });
  h += `</div>`;

  // Time filter for Bewegungen/Bestellungen
  h += `<div style="margin-top:10px;padding:8px 10px;background:var(--b3);border-radius:6px">`;
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">⏱ ${LANG==="vi"?"Bộ lọc thời gian (Biến động & Đơn hàng)":"Zeitfilter (Bewegungen & Bestellungen)"}</div>`;
  h += `<div class="mode-tabs" id="bkpTimeFilter">`;
  [{v:0,de:"Alle",vi:"Tất cả"},{v:7,de:"7 Tage",vi:"7 ngày"},{v:14,de:"14 Tage",vi:"14 ngày"},{v:30,de:"30 Tage",vi:"30 ngày"},{v:90,de:"90 Tage",vi:"90 ngày"},{v:180,de:"180 Tage",vi:"180 ngày"},{v:365,de:"1 Jahr",vi:"1 năm"}].forEach(opt => {
    h += `<span class="mode-tab ${window._bkpDays===opt.v?"on":""}" onclick="bkpSetDays(${opt.v})">${LANG==="vi"?opt.vi:opt.de}</span>`;
  });
  h += `</div></div>`;

  // Total estimated size
  h += `<div id="bkpTotal" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--b2);border:2px solid var(--bd2);border-radius:8px">`;
  h += `<div><span style="font-size:11px;color:var(--t2)">${LANG==="vi"?"Kích thước ước tính":"Geschätzte Größe"}:</span> <span style="font-family:var(--m);font-weight:700;font-size:15px" id="bkpTotalSize">${bkpFmt(bkpCalcSize())}</span></div>`;
  h += `<div style="display:flex;gap:4px"><span style="font-size:11px;color:var(--t2)" id="bkpSelCount">${Object.values(window._bkpSel).filter(v=>v).length}/${sections.length}</span></div>`;
  h += `</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-g" onclick="exportJSON()">📥 ${LANG==="vi"?"Xuất toàn bộ":"Alles exportieren"}</button><button class="btn btn-p" onclick="bkpExport()">💾 ${LANG==="vi"?"Xuất chọn lọc":"Selektiv exportieren"}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function bkpToggle(id) {
  window._bkpSel[id] = !window._bkpSel[id];
  const chk = document.getElementById(`bkpChk_${id}`);
  const sec = bkpGetSections().find(s=>s.id===id);
  if (chk) {
    chk.style.background = window._bkpSel[id] ? sec.color : "transparent";
    chk.textContent = window._bkpSel[id] ? "✓" : "";
  }
  const secEl = document.getElementById(`bkpSec_${id}`);
  if (secEl) secEl.style.opacity = window._bkpSel[id] ? "1" : ".5";
  bkpUpdateTotal();
}

function bkpPreset(preset) {
  const sections = bkpGetSections();
  sections.forEach(sec => {
    if (preset === "all") window._bkpSel[sec.id] = true;
    else if (preset === "none") window._bkpSel[sec.id] = false;
    else if (preset === "stamm") window._bkpSel[sec.id] = ["stamm","users","bestand","einstellungen"].includes(sec.id);
    else if (preset === "compact") window._bkpSel[sec.id] = !["bilder","inventur"].includes(sec.id);
    // Update UI
    const chk = document.getElementById(`bkpChk_${sec.id}`);
    if (chk) { chk.style.background = window._bkpSel[sec.id] ? sec.color : "transparent"; chk.textContent = window._bkpSel[sec.id] ? "✓" : ""; }
    const secEl = document.getElementById(`bkpSec_${sec.id}`);
    if (secEl) secEl.style.opacity = window._bkpSel[sec.id] ? "1" : ".5";
  });
  bkpUpdateTotal();
}

function bkpSetDays(days) {
  window._bkpDays = days;
  document.querySelectorAll("#bkpTimeFilter .mode-tab").forEach(el => el.classList.remove("on"));
  event.target.classList.add("on");
  bkpUpdateTotal();
}

function bkpCalcSize() {
  const sel = window._bkpSel || {};
  const days = window._bkpDays || 0;
  let size = 50; // base JSON overhead
  const cutoff = days > 0 ? new Date(Date.now()-days*86400000).toISOString() : null;
  if (sel.stamm) {
    const artNoImg = D.artikel.map(a=>({...a,bilder:[]}));
    size += bkpSizeOf({artikel:artNoImg,kategorien:D.kategorien,standorte:D.standorte,lagerplaetze:D.lagerplaetze||[],lieferanten:D.lieferanten,bereiche:D.bereiche||[]});
  }
  if (sel.users) size += bkpSizeOf(D.users);
  if (sel.bestand) size += bkpSizeOf(D.artikel.map(a=>({id:a.id,istBestand:a.istBestand,sollBestand:a.sollBestand,mindestmenge:a.mindestmenge,lagerort:a.lagerort})));
  if (sel.bewegungen) { const bew = cutoff ? D.bewegungen.filter(b=>b.datum>=cutoff) : D.bewegungen; size += bkpSizeOf(bew); }
  if (sel.bestellungen) { const best = cutoff ? D.bestellungen.filter(b=>b.datum>=cutoff) : D.bestellungen; size += bkpSizeOf({bestellungen:best,bestellliste:D.bestellliste,bestellVorlagen:D.bestellVorlagen||[]}); }
  if (sel.transfers) size += bkpSizeOf(D.transfers||[]);
  if (sel.inventur) size += bkpSizeOf({inventurProtokolle:D.inventurProtokolle||[],preisHistorie:D.preisHistorie||[],anforderungen:D.anforderungen||[],auffuellungen:D.auffuellungen||[]});
  if (sel.einstellungen) size += bkpSizeOf(D.einstellungen);
  if (sel.bilder) size += D.artikel.reduce((s,a)=>s+bkpSizeOf((a.bilder||[]).filter(b=>b.startsWith("data:"))),0);
  return size;
}

function bkpUpdateTotal() {
  const el = document.getElementById("bkpTotalSize");
  if (el) el.textContent = bkpFmt(bkpCalcSize());
  const cnt = document.getElementById("bkpSelCount");
  if (cnt) cnt.textContent = `${Object.values(window._bkpSel).filter(v=>v).length}/${bkpGetSections().length}`;
}

function bkpExport() {
  const sel = window._bkpSel || {};
  const days = window._bkpDays || 0;
  const cutoff = days > 0 ? new Date(Date.now()-days*86400000).toISOString() : null;
  const selected = Object.keys(sel).filter(k=>sel[k]);
  if (!selected.length) { toast(LANG==="vi"?"Chọn ít nhất 1 mục":"Mindestens 1 Bereich auswählen","e"); return; }

  const backup = { _backup: true, _version: APP_VERSION, _date: nw(), _sections: selected, _days: days };

  if (sel.stamm) {
    backup.artikel = D.artikel.map(a => sel.bilder ? a : {...a, bilder: []});
    backup.kategorien = D.kategorien;
    backup.standorte = D.standorte;
    backup.lagerplaetze = D.lagerplaetze || [];
    backup.lieferanten = D.lieferanten;
    backup.bereiche = D.bereiche || [];
  }
  if (sel.users) backup.users = D.users;
  if (sel.bestand && !sel.stamm) {
    // If stamm not included, store bestand separately
    backup._bestandData = D.artikel.map(a=>({id:a.id,istBestand:a.istBestand,sollBestand:a.sollBestand,mindestmenge:a.mindestmenge,lagerort:a.lagerort}));
  }
  if (sel.bewegungen) backup.bewegungen = cutoff ? D.bewegungen.filter(b=>b.datum>=cutoff) : D.bewegungen;
  if (sel.bestellungen) {
    backup.bestellungen = cutoff ? D.bestellungen.filter(b=>b.datum>=cutoff) : D.bestellungen;
    backup.bestellliste = D.bestellliste;
    backup.bestellVorlagen = D.bestellVorlagen || [];
  }
  if (sel.transfers) backup.transfers = D.transfers || [];
  if (sel.inventur) {
    backup.inventurProtokolle = D.inventurProtokolle || [];
    backup.preisHistorie = D.preisHistorie || [];
    backup.anforderungen = D.anforderungen || [];
    backup.auffuellungen = D.auffuellungen || [];
  }
  if (sel.einstellungen) backup.einstellungen = D.einstellungen;
  if (sel.bilder && !sel.stamm) {
    // Store images separately if stamm not included
    backup._bilderData = D.artikel.map(a=>({id:a.id,bilder:a.bilder||[]})).filter(a=>a.bilder.length);
  }

  const json = JSON.stringify(backup, null, 2);
  const sizeStr = bkpFmt(new Blob([json]).size);
  const label = days > 0 ? `_${days}d` : "";
  const scope = selected.length === bkpGetSections().length ? "VOLL" : selected.length <= 3 ? selected.join("+") : `${selected.length}Bereiche`;
  dlFile(json, `Backup_${D.einstellungen.firmenname.replace(/\s/g,"_")}_${scope}${label}_${td()}.json`, "application/json");
  closeModal();
  toast(`💾 ${LANG==="vi"?"Backup xuất thành công":"Backup exportiert"} (${sizeStr}) · ${selected.length} ${LANG==="vi"?"mục":"Bereiche"}`,"s");
}

// ═══ SELECTIVE IMPORT ═══
function importJSON(files) {
  if (!files || !files.length) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported._backup && imported._sections) {
        openImportModal(imported);
      } else if (imported.artikel && imported.standorte && imported.users) {
        // Legacy full backup
        openImportModal(imported, true);
      } else {
        toast(LANG==="vi"?"File không hợp lệ":"Ungültige Datei","e");
      }
    } catch(err) {
      toast(`${LANG==="vi"?"Lỗi đọc file":"Datei-Fehler"}: ${err.message}`,"e");
    }
  };
  reader.readAsText(files[0]);
}

function openImportModal(imported, isLegacy) {
  window._importData = imported;
  window._importLegacy = !!isLegacy;
  const sections = isLegacy ? ["stamm","users","bestand","bewegungen","bestellungen","transfers","inventur","einstellungen","bilder"] : (imported._sections||[]);
  window._importSel = {};
  sections.forEach(s => { window._importSel[s] = true; });

  const sizeStr = bkpFmt(new Blob([JSON.stringify(imported)]).size);
  const allSections = bkpGetSections();

  let h = `<div class="mo-ov" id="impModal" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📤 ${LANG==="vi"?"Khôi phục Backup":"Backup wiederherstellen"}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  // Info
  h += `<div style="padding:8px 12px;background:var(--b3);border-radius:6px;margin-bottom:10px;font-size:11px">`;
  if (!isLegacy) {
    h += `<div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-weight:700">📅 ${imported._date?fDT(imported._date):""}</span><span style="color:var(--t3)">${imported._version||""}</span></div>`;
    if (imported._days) h += `<div style="color:var(--t2)">⏱ ${LANG==="vi"?"Dữ liệu":"Daten"}: ${LANG==="vi"?"chỉ":"nur"} ${imported._days} ${LANG==="vi"?"ngày":"Tage"}</div>`;
  }
  h += `<div style="color:var(--t2)">${LANG==="vi"?"Kích thước":"Größe"}: ${sizeStr} · ${sections.length} ${LANG==="vi"?"mục":"Bereiche"}</div>`;
  h += `</div>`;

  // Mode: Replace vs Merge
  h += `<div style="margin-bottom:10px">`;
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">${LANG==="vi"?"Chế độ nhập":"Import-Modus"}</div>`;
  h += `<div class="mode-tabs" id="impModeTab">`;
  h += `<span class="mode-tab on" onclick="window._impMode='replace';document.querySelectorAll('#impModeTab .mode-tab').forEach(e=>e.classList.remove('on'));this.classList.add('on')">🔄 ${LANG==="vi"?"Thay thế":"Ersetzen"}</span>`;
  h += `<span class="mode-tab" onclick="window._impMode='merge';document.querySelectorAll('#impModeTab .mode-tab').forEach(e=>e.classList.remove('on'));this.classList.add('on')">🔀 ${LANG==="vi"?"Gộp (thêm mới, giữ cũ)":"Zusammenführen"}</span>`;
  h += `</div>`;
  h += `<div style="font-size:10px;color:var(--t3);margin-top:3px">🔄 ${LANG==="vi"?"Thay thế = Xóa dữ liệu cũ, dùng backup":"Ersetzen = Alte Daten weg, Backup übernehmen"} · 🔀 ${LANG==="vi"?"Gộp = Giữ dữ liệu cũ, thêm mới từ backup":"Zusammenführen = Vorhandene behalten, Neue ergänzen"}</div>`;
  h += `</div>`;
  window._impMode = "replace";

  // Selectable sections
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">${LANG==="vi"?"Chọn mục cần khôi phục":"Bereiche zum Wiederherstellen"}</div>`;
  sections.forEach(secId => {
    const sec = allSections.find(s=>s.id===secId);
    if (!sec) return;
    // Count what's in the backup
    let count = "";
    if (secId==="stamm" && imported.artikel) count = `${imported.artikel.length} Art.`;
    else if (secId==="users" && imported.users) count = `${imported.users.length} User`;
    else if (secId==="bewegungen" && imported.bewegungen) count = `${imported.bewegungen.length} Bew.`;
    else if (secId==="bestellungen" && imported.bestellungen) count = `${imported.bestellungen.length} Best.`;
    else if (secId==="transfers" && imported.transfers) count = `${imported.transfers.length} Transf.`;

    h += `<div class="cd" style="margin-bottom:3px;padding:6px 10px;border-left:3px solid ${sec.color};cursor:pointer" onclick="impToggle('${secId}')">`;
    h += `<div style="display:flex;align-items:center;gap:8px">`;
    h += `<div style="width:18px;height:18px;border-radius:3px;border:2px solid ${sec.color};display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;background:${sec.color};color:#fff" id="impChk_${secId}">✓</div>`;
    h += `<span style="font-size:12px">${sec.icon}</span>`;
    h += `<span style="font-weight:600;font-size:11.5px;flex:1">${LANG==="vi"?sec.vi:sec.de}</span>`;
    if (count) h += `<span style="font-size:10px;color:var(--t2);font-family:var(--m)">${count}</span>`;
    h += `</div></div>`;
  });

  // Warning
  h += `<div style="margin-top:10px;padding:8px 12px;background:var(--yA);border:1px solid rgba(245,158,11,.15);border-radius:6px;font-size:11px;color:var(--yl)">⚠ ${LANG==="vi"?"Hãy tạo backup hiện tại trước khi khôi phục!":"Erstelle ein Backup der aktuellen Daten bevor du wiederherstellst!"}</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="executeImport()">📤 ${LANG==="vi"?"Khôi phục":"Wiederherstellen"}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function impToggle(id) {
  window._importSel[id] = !window._importSel[id];
  const chk = document.getElementById(`impChk_${id}`);
  const sec = bkpGetSections().find(s=>s.id===id);
  if (chk) {
    chk.style.background = window._importSel[id] ? sec.color : "transparent";
    chk.textContent = window._importSel[id] ? "✓" : "";
  }
}

function executeImport() {
  const imp = window._importData;
  const sel = window._importSel;
  const mode = window._impMode || "replace";
  const isLegacy = window._importLegacy;
  const selected = Object.keys(sel).filter(k=>sel[k]);
  if (!selected.length) { toast(LANG==="vi"?"Chọn ít nhất 1 mục":"Mindestens 1 Bereich","e"); return; }

  const label = mode === "merge"
    ? (LANG==="vi"?`Gộp ${selected.length} mục từ backup?\n\nDữ liệu cũ sẽ được giữ, mục mới được thêm.`:`${selected.length} Bereiche zusammenführen?\n\nVorhandene Daten bleiben, Neue werden ergänzt.`)
    : (LANG==="vi"?`Thay thế ${selected.length} mục bằng backup?\n\n⚠ Dữ liệu cũ trong các mục đã chọn sẽ bị xóa!`:`${selected.length} Bereiche aus Backup ersetzen?\n\n⚠ Vorhandene Daten in den gewählten Bereichen werden überschrieben!`);

  cConfirm(label, () => {
    let count = 0;

    if (sel.stamm && imp.artikel) {
      if (mode === "replace") {
        D.artikel = imp.artikel;
        D.kategorien = imp.kategorien || D.kategorien;
        D.standorte = imp.standorte || D.standorte;
        D.lagerplaetze = imp.lagerplaetze || D.lagerplaetze;
        D.lieferanten = imp.lieferanten || D.lieferanten;
        D.bereiche = imp.bereiche || D.bereiche;
      } else {
        imp.artikel.forEach(a => { if (!D.artikel.find(x=>x.id===a.id)) D.artikel.push(a); });
        (imp.kategorien||[]).forEach(k => { if (!D.kategorien.find(x=>x.id===k.id)) D.kategorien.push(k); });
        (imp.standorte||[]).forEach(s => { if (!D.standorte.find(x=>x.id===s.id)) D.standorte.push(s); });
        (imp.lagerplaetze||[]).forEach(lp => { if (!(D.lagerplaetze||[]).find(x=>x.id===lp.id)) { if(!D.lagerplaetze)D.lagerplaetze=[]; D.lagerplaetze.push(lp); }});
        (imp.lieferanten||[]).forEach(l => { if (!D.lieferanten.find(x=>x.id===l.id)) D.lieferanten.push(l); });
        (imp.bereiche||[]).forEach(b => { if (!(D.bereiche||[]).find(x=>x.id===b.id)) { if(!D.bereiche)D.bereiche=[]; D.bereiche.push(b); }});
      }
      count++;
    }
    if (sel.users && imp.users) {
      if (mode === "replace") D.users = imp.users;
      else imp.users.forEach(u => { if (!D.users.find(x=>x.id===u.id)) D.users.push(u); });
      count++;
    }
    if (sel.bestand && imp._bestandData) {
      imp._bestandData.forEach(bd => {
        const a = D.artikel.find(x=>x.id===bd.id);
        if (a) { a.istBestand = bd.istBestand; a.sollBestand = bd.sollBestand; a.mindestmenge = bd.mindestmenge; a.lagerort = bd.lagerort; }
      });
      count++;
    }
    if (sel.bewegungen && imp.bewegungen) {
      if (mode === "replace") D.bewegungen = imp.bewegungen;
      else { const ids = new Set(D.bewegungen.map(b=>b.id)); imp.bewegungen.forEach(b => { if(!ids.has(b.id)) D.bewegungen.push(b); }); D.bewegungen.sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")); }
      count++;
    }
    if (sel.bestellungen) {
      if (imp.bestellungen) { if(mode==="replace") D.bestellungen=imp.bestellungen; else { const ids=new Set(D.bestellungen.map(b=>b.id)); imp.bestellungen.forEach(b=>{if(!ids.has(b.id))D.bestellungen.push(b);}); } }
      if (imp.bestellliste) { if(mode==="replace") D.bestellliste=imp.bestellliste; else { const ids=new Set(D.bestellliste.map(b=>b.id)); imp.bestellliste.forEach(b=>{if(!ids.has(b.id))D.bestellliste.push(b);}); } }
      if (imp.bestellVorlagen) { if(mode==="replace") D.bestellVorlagen=imp.bestellVorlagen; else { const ids=new Set((D.bestellVorlagen||[]).map(v=>v.id)); imp.bestellVorlagen.forEach(v=>{if(!ids.has(v.id)){if(!D.bestellVorlagen)D.bestellVorlagen=[];D.bestellVorlagen.push(v);}}); } }
      count++;
    }
    if (sel.transfers && imp.transfers) {
      if (mode === "replace") D.transfers = imp.transfers;
      else { const ids = new Set((D.transfers||[]).map(t=>t.id)); imp.transfers.forEach(t => { if(!ids.has(t.id)){if(!D.transfers)D.transfers=[];D.transfers.push(t);} }); }
      count++;
    }
    if (sel.inventur) {
      if (imp.inventurProtokolle) { if(mode==="replace") D.inventurProtokolle=imp.inventurProtokolle; else { const ids=new Set((D.inventurProtokolle||[]).map(i=>i.id)); imp.inventurProtokolle.forEach(i=>{if(!ids.has(i.id)){if(!D.inventurProtokolle)D.inventurProtokolle=[];D.inventurProtokolle.push(i);}}); } }
      if (imp.preisHistorie) { if(mode==="replace") D.preisHistorie=imp.preisHistorie; else (imp.preisHistorie||[]).forEach(p=>{if(!D.preisHistorie)D.preisHistorie=[];D.preisHistorie.push(p);}); }
      if (imp.anforderungen) { if(mode==="replace") D.anforderungen=imp.anforderungen; else { const ids=new Set((D.anforderungen||[]).map(a=>a.id)); imp.anforderungen.forEach(a=>{if(!ids.has(a.id)){if(!D.anforderungen)D.anforderungen=[];D.anforderungen.push(a);}}); } }
      if (imp.auffuellungen) { if(mode==="replace") D.auffuellungen=imp.auffuellungen; else (imp.auffuellungen||[]).forEach(a=>{if(!D.auffuellungen)D.auffuellungen=[];D.auffuellungen.push(a);}); }
      count++;
    }
    if (sel.einstellungen && imp.einstellungen) {
      if (mode === "replace") D.einstellungen = imp.einstellungen;
      else Object.keys(imp.einstellungen).forEach(k => { if(D.einstellungen[k]===undefined) D.einstellungen[k]=imp.einstellungen[k]; });
      count++;
    }
    if (sel.bilder && imp._bilderData) {
      imp._bilderData.forEach(bd => { const a = D.artikel.find(x=>x.id===bd.id); if(a) a.bilder = bd.bilder; });
      count++;
    }

    // For legacy full import that included bilder inside artikel
    if (isLegacy && sel.stamm && imp.artikel?.[0]?.bilder?.length && !sel.bilder) {
      // Strip images if bilder not selected
      D.artikel.forEach(a => { a.bilder = []; });
    }

    migrate();
    save();
    closeModal();
    render();
    toast(`✓ ${LANG==="vi"?"Đã khôi phục":"Wiederhergestellt"} · ${count} ${LANG==="vi"?"mục":"Bereiche"} (${mode==="merge"?LANG==="vi"?"gộp":"zusammengeführt":LANG==="vi"?"thay thế":"ersetzt"})`,"s");
  });
}
function resetAll() {
  if (U?.role !== "admin") { toast("❌ Admin only","e"); return; }

  let h = `<div class="mo-ov" id="resetModal" onclick="document.getElementById('resetModal')?.remove()"><div class="mo" onclick="event.stopPropagation()" style="border:2px solid var(--rd)"><div class="mo-h" style="background:var(--rA)"><div class="mo-ti" style="color:var(--rd)">⚠ ${LANG==="vi"?"Đặt lại dữ liệu":"Daten zurücksetzen"}</div><button class="bi" onclick="document.getElementById('resetModal')?.remove()">✕</button></div><div class="mo-b">`;

  h += `<div style="padding:10px 12px;background:var(--rA);border:1px solid rgba(239,68,68,.2);border-radius:8px;margin-bottom:12px">`;
  h += `<div style="font-weight:700;font-size:13px;color:var(--rd);margin-bottom:4px">🗑 ${LANG==="vi"?"Xóa TOÀN BỘ dữ liệu":"ALLE Daten werden gelöscht"}</div>`;
  h += `<div style="font-size:11px;color:var(--t2)">`;
  h += `${LANG==="vi"?"Bao gồm":"Betrifft"}: ${D.artikel.length} ${t("c.article")}, ${D.lieferanten.length} ${t("c.supplier")}, ${D.bewegungen.length} ${LANG==="vi"?"biến động":"Bewegungen"}, ${D.bestellungen.length} ${t("nav.orders")}, ${(D.transfers||[]).length} Transfers, ${D.users.length} ${LANG==="vi"?"người dùng":"Benutzer"}`;
  h += `</div></div>`;

  h += `<div style="font-size:11.5px;color:var(--t2);margin-bottom:8px">${LANG==="vi"?"Nhập mật khẩu Admin để xác nhận:":"Admin-Passwort eingeben zum Bestätigen:"}</div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Mật khẩu xác nhận":"Sicherheits-Passwort"}</label><input class="inp" type="password" id="resetPw" placeholder="${LANG==="vi"?"Nhập mật khẩu...":"Passwort eingeben..."}" style="border:2px solid var(--rd);text-align:center;font-size:15px;letter-spacing:3px" onkeydown="if(event.key==='Enter')confirmReset()"></div>`;
  h += `<div id="resetErr" style="display:none;color:var(--rd);font-size:11px;margin-top:4px;text-align:center"></div>`;

  h += `<div style="font-size:10px;color:var(--t3);margin-top:8px;padding:6px 8px;background:var(--b3);border-radius:4px">💡 ${LANG==="vi"?"Mật khẩu = PIN của Admin hiện tại":"Passwort = PIN des aktuellen Admin-Benutzers"}</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="document.getElementById('resetModal')?.remove()">${t("c.cancel")}</button><button class="btn btn-d" onclick="confirmReset()">🗑 ${LANG==="vi"?"Xác nhận xóa":"Endgültig löschen"}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
  setTimeout(() => document.getElementById("resetPw")?.focus(), 100);
}

function confirmReset() {
  const pw = document.getElementById("resetPw")?.value || "";
  const errEl = document.getElementById("resetErr");
  if (!pw) { if(errEl){errEl.style.display="";errEl.textContent=LANG==="vi"?"Vui lòng nhập mật khẩu":"Bitte Passwort eingeben";} return; }
  if (pw !== U.pin) { if(errEl){errEl.style.display="";errEl.textContent=LANG==="vi"?"Mật khẩu sai!":"Falsches Passwort!";} document.getElementById("resetPw").value=""; document.getElementById("resetPw")?.focus(); return; }

  // Password correct — execute reset
  document.getElementById("resetModal")?.remove();
  D = JSON.parse(JSON.stringify(DEF));
  migrate();
  save();
  U = null;
  render();
  toast(`🗑 ${LANG==="vi"?"Đã xóa toàn bộ dữ liệu":"Alle Daten zurückgesetzt"}`,"i");
}

// ═══ ARTIKEL DETAIL POPUP ═══