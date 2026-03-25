// ═══ QR CODE SYSTEM ═══
function makeQR(text, size) {
  if (typeof qrcode === "undefined") return null;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  // Draw on canvas
  const c = document.createElement("canvas");
  const mods = qr.getModuleCount();
  const cellSize = Math.floor(size / mods);
  c.width = c.height = cellSize * mods;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#000000";
  for (let row = 0; row < mods; row++) {
    for (let col = 0; col < mods; col++) {
      if (qr.isDark(row, col)) ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }
  return c.toDataURL("image/png");
}

function getBaseURL() {
  // For hosted version: use current URL without hash
  // For local file: use placeholder
  const loc = window.location;
  if (loc.protocol === "file:") return "lagerverwaltung.html";
  return loc.origin + loc.pathname;
}

// ═══ LAGERPLÄTZE QR-CODES ═══
function showLPQRCodes() {
  const baseURL = getBaseURL();
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const lps = (D.lagerplaetze||[]).filter(lp=>vS.some(s=>s.id===lp.standortId));

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-xl" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📱 QR-Codes ${LANG==="vi"?"— Vị trí kho":"— Lagerplätze"} (${lps.length})</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:12px;padding:6px 10px;background:var(--b3);border-radius:6px">📷 ${LANG==="vi"?"Quét QR → App mở tại vị trí kho. In và dán tại mỗi vị trí.":"QR scannen → App öffnet sich am Lagerplatz. Ausdrucken und am Regal befestigen."}</div>`;

  if (!lps.length) {
    h += `<div style="text-align:center;padding:20px;color:var(--t3)">${LANG==="vi"?"Chưa có vị trí kho":"Keine Lagerplätze vorhanden"}</div>`;
  } else {
    h += `<div id="lpQrGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">`;
    lps.forEach((lp, i) => {
      const st = D.standorte.find(s=>s.id===lp.standortId);
      const artCount = D.artikel.filter(a=>a.lagerort?.[lp.standortId]===lp.name).length;
      const qrData = `${baseURL}#standort=${lp.standortId}&ort=${encodeURIComponent(lp.name)}`;
      const qrImg = makeQR(qrData, 200);
      const tempIcon = lp.temperatur==="kuehl"?"❄️":lp.temperatur==="tk"?"🧊":lp.temperatur==="warm"?"🌡️":"🏠";

      h += `<div class="cd" style="text-align:center;padding:12px" id="lpqr_${i}">`;
      h += `<div style="font-weight:700;font-size:12px;margin-bottom:1px">${tempIcon} ${esc(lp.name)}</div>`;
      h += `<div style="font-size:9.5px;color:var(--t3);margin-bottom:6px">${esc(st?.name||"")} · ${artCount} ${t("c.article")}</div>`;
      if (qrImg) {
        h += `<img src="${qrImg}" style="width:140px;height:140px;border-radius:4px;border:1px solid var(--bd);image-rendering:pixelated">`;
      } else {
        h += `<div style="width:140px;height:140px;background:var(--b4);border-radius:4px;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:10px;color:var(--t3)">QR-Library fehlt</div>`;
      }
      h += `<div style="margin-top:4px"><button class="btn btn-o btn-sm" onclick="downloadSingleLPQR('${lp.standortId}','${esc(lp.name)}')" style="font-size:9px">📥 Download</button></div>`;
      h += `</div>`;
    });
    h += `</div>`;

    h += `<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">`;
    h += `<button class="btn btn-p" onclick="printLPQRCodes()">🖨 ${LANG==="vi"?"In tất cả":"Alle drucken"}</button>`;
    h += `</div>`;
  }

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function showSingleLPQR(lpId) {
  const lp = (D.lagerplaetze||[]).find(x=>x.id===lpId);
  if (!lp) return;
  const baseURL = getBaseURL();
  const st = D.standorte.find(s=>s.id===lp.standortId);
  const artCount = D.artikel.filter(a=>a.lagerort?.[lp.standortId]===lp.name).length;
  const qrData = `${baseURL}#standort=${lp.standortId}&ort=${encodeURIComponent(lp.name)}`;
  const qrImg = makeQR(qrData, 300);
  const tempIcon = lp.temperatur==="kuehl"?"❄️":lp.temperatur==="tk"?"🧊":lp.temperatur==="warm"?"🌡️":"🏠";

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo" style="max-width:340px" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📱 QR-Code</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b" style="text-align:center">`;
  h += `<div style="font-weight:700;font-size:16px;margin-bottom:2px">${tempIcon} ${esc(lp.name)}</div>`;
  if (lp.name_vi) h += `<div style="font-size:12px;color:var(--t3)">${esc(lp.name_vi)}</div>`;
  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:10px">${esc(st?.name||"")} · ${artCount} ${t("c.article")}${lp.zone?` · ${esc(lp.zone)}`:""}</div>`;
  if (qrImg) {
    h += `<img id="singleLPQR" src="${qrImg}" style="width:220px;height:220px;border-radius:6px;border:2px solid var(--bd);image-rendering:pixelated">`;
  }
  h += `<div style="font-size:9px;color:var(--t3);margin-top:6px;font-family:var(--m)">${esc(D.einstellungen.firmenname)}</div>`;
  h += `</div><div class="mo-f">`;
  h += `<button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button>`;
  h += `<button class="btn btn-p" onclick="downloadSingleLPQR('${lp.standortId}','${esc(lp.name)}')">📥 Download</button>`;
  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function downloadSingleLPQR(stId, name) {
  const baseURL = getBaseURL();
  const qrData = `${baseURL}#standort=${stId}&ort=${encodeURIComponent(name)}`;
  const qrImg = makeQR(qrData, 400);
  if (!qrImg) return;
  const a = document.createElement("a");
  a.href = qrImg;
  a.download = `QR_${name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g,"_")}.png`;
  a.click();
}

function printLPQRCodes() {
  const baseURL = getBaseURL();
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const lps = (D.lagerplaetze||[]).filter(lp=>vS.some(s=>s.id===lp.standortId));

  let html = `<html><head><meta charset="utf-8"><title>QR-Codes Lagerplätze</title><style>
    body{font-family:Arial,sans-serif;margin:10mm}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
    .card{border:1px solid #ccc;border-radius:4mm;padding:4mm;text-align:center;break-inside:avoid}
    .name{font-weight:bold;font-size:11pt;margin-bottom:1mm}
    .sub{font-size:8pt;color:#666;margin-bottom:3mm}
    .firm{font-size:7pt;color:#999;margin-top:2mm}
    img{width:30mm;height:30mm;image-rendering:pixelated}
    @media print{body{margin:5mm}.grid{gap:4mm}}
  </style></head><body>`;
  html += `<h2 style="font-size:14pt;margin-bottom:4mm">${esc(D.einstellungen.firmenname)} — QR-Codes Lagerplätze</h2>`;
  html += `<div class="grid">`;
  lps.forEach(lp => {
    const st = D.standorte.find(s=>s.id===lp.standortId);
    const artCount = D.artikel.filter(a=>a.lagerort?.[lp.standortId]===lp.name).length;
    const qrData = `${baseURL}#standort=${lp.standortId}&ort=${encodeURIComponent(lp.name)}`;
    const qrImg = makeQR(qrData, 300);
    const tempIcon = lp.temperatur==="kuehl"?"❄️":lp.temperatur==="tk"?"🧊":lp.temperatur==="warm"?"🌡️":"🏠";
    html += `<div class="card"><div class="name">${tempIcon} ${esc(lp.name)}</div>`;
    html += `<div class="sub">${esc(st?.name||"")} · ${artCount} Art.</div>`;
    if (qrImg) html += `<img src="${qrImg}">`;
    html += `<div class="firm">${esc(D.einstellungen.firmenname)}</div></div>`;
  });
  html += `</div></body></html>`;
  openPrintHTML(html);
}

function showQRCodes() {
  const baseURL = getBaseURL();

  // Collect all unique lagerorte per standort
  const locations = [];
  D.standorte.forEach(s => {
    // Standort-level QR (shows all articles at this location)
    locations.push({ standort: s, lagerort: null, label: s.name, sub: LANG==="vi"?"Toàn bộ chi nhánh":"Gesamter Standort" });
    // Lagerort-level QRs
    const orte = new Set();
    D.artikel.forEach(a => { const lo = a.lagerort?.[s.id]; if (lo) orte.add(lo); });
    [...orte].sort().forEach(ort => {
      const artCount = D.artikel.filter(a => a.lagerort?.[s.id] === ort).length;
      locations.push({ standort: s, lagerort: ort, label: ort, sub: `${s.name} · ${artCount} ${t("c.article")}` });
    });
  });

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-xl" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📱 QR-Codes ${LANG==="vi"?"cho vị trí kho":"für Lagerplätze"}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:12px;padding:6px 10px;background:var(--b3);border-radius:6px">📷 ${LANG==="vi"?"Quét QR bằng camera → App mở tự động tại vị trí kho tương ứng":"QR scannen mit Kamera → App öffnet sich direkt am entsprechenden Lagerplatz"}</div>`;

  h += `<div id="qrGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">`;

  locations.forEach((loc, i) => {
    const qrData = `${baseURL}#standort=${loc.standort.id}${loc.lagerort?`&ort=${encodeURIComponent(loc.lagerort)}`:""}`;
    const qrImg = makeQR(qrData, 200);

    h += `<div class="cd" style="text-align:center;padding:12px" id="qr_card_${i}">`;
    h += `<div style="font-weight:700;font-size:12px;margin-bottom:2px">${esc(loc.label)}</div>`;
    h += `<div style="font-size:9.5px;color:var(--t3);margin-bottom:8px">${esc(loc.sub)}</div>`;
    if (qrImg) {
      h += `<img src="${qrImg}" style="width:140px;height:140px;border-radius:4px;border:1px solid var(--bd);image-rendering:pixelated">`;
    } else {
      h += `<div style="width:140px;height:140px;background:var(--b4);border-radius:4px;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:10px;color:var(--t3)">QR-Library fehlt</div>`;
    }
    h += `<div style="font-size:8px;color:var(--t3);margin-top:4px;font-family:var(--m);word-break:break-all;max-width:170px;margin-inline:auto">${esc(D.einstellungen.firmenname)}</div>`;
    h += `</div>`;
  });

  h += `</div>`;

  // Print / Download buttons
  h += `<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">`;
  h += `<button class="btn btn-p" onclick="printQRCodes()">🖨 ${LANG==="vi"?"In QR":"QR drucken"}</button>`;
  h += `<button class="btn btn-o" onclick="downloadQRAll()">📥 ${LANG==="vi"?"Tải tất cả":"Alle herunterladen"}</button>`;
  h += `</div>`;

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function printQRCodes() {
  const baseURL = getBaseURL();
  const locations = [];
  D.standorte.forEach(s => {
    locations.push({ sId: s.id, sName: s.name, lagerort: null, label: s.name, sub: LANG==="vi"?"Toàn bộ":"Gesamt" });
    const orte = new Set();
    D.artikel.forEach(a => { const lo = a.lagerort?.[s.id]; if (lo) orte.add(lo); });
    [...orte].sort().forEach(ort => {
      const artCount = D.artikel.filter(a => a.lagerort?.[s.id] === ort).length;
      locations.push({ sId: s.id, sName: s.name, lagerort: ort, label: ort, sub: `${s.name} · ${artCount} Art.` });
    });
  });

  let html = `<html><head><meta charset="utf-8"><title>QR-Codes Lagerplätze</title><style>
  body{font-family:Helvetica,Arial,sans-serif;margin:0;padding:10mm}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
  .card{border:1px solid #ccc;border-radius:4mm;padding:5mm;text-align:center;break-inside:avoid;page-break-inside:avoid}
  .label{font-size:14pt;font-weight:bold;margin-bottom:1mm}
  .sub{font-size:8pt;color:#666;margin-bottom:3mm}
  .qr{width:30mm;height:30mm;image-rendering:pixelated}
  .firma{font-size:7pt;color:#999;margin-top:2mm;font-family:monospace}
  @media print{body{padding:5mm}.grid{gap:5mm}}
  </style></head><body>`;
  html += `<div class="grid">`;

  locations.forEach(loc => {
    const qrData = `${baseURL}#standort=${loc.sId}${loc.lagerort?`&ort=${encodeURIComponent(loc.lagerort)}`:""}`;
    const qrImg = makeQR(qrData, 200);
    html += `<div class="card"><div class="label">${esc(loc.label)}</div><div class="sub">${esc(loc.sub)}</div>`;
    if (qrImg) html += `<img class="qr" src="${qrImg}">`;
    html += `<div class="firma">${esc(D.einstellungen.firmenname)}</div></div>`;
  });

  html += `</div></body></html>`;
  openPrintHTML(html);
}

function downloadQRAll() {
  const baseURL = getBaseURL();
  let count = 0;
  D.standorte.forEach(s => {
    // Standort QR
    const qrData = `${baseURL}#standort=${s.id}`;
    const img = makeQR(qrData, 400);
    if (img) { dlDataURL(img, `QR_${s.name.replace(/\s/g,"_")}.png`); count++; }

    // Lagerort QRs
    const orte = new Set();
    D.artikel.forEach(a => { const lo = a.lagerort?.[s.id]; if (lo) orte.add(lo); });
    [...orte].forEach(ort => {
      const qd = `${baseURL}#standort=${s.id}&ort=${encodeURIComponent(ort)}`;
      const im = makeQR(qd, 400);
      if (im) { dlDataURL(im, `QR_${s.name.replace(/\s/g,"_")}_${ort.replace(/[\s·]/g,"_")}.png`); count++; }
    });
  });
  toast(`📥 ${count} QR-Codes ${LANG==="vi"?"đã tải":"heruntergeladen"}`,"s");
}

function dlDataURL(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// ═══ QR SCAN DETECTION (URL Hash) ═══
function checkQRScan() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("standort=")) return;
  const params = new URLSearchParams(hash.slice(1));
  const stId = params.get("standort");
  const ort = params.get("ort");
  if (!stId) return;

  // Set filters
  STF = stId;
  PAGE = "artikel";

  if (ort) {
    // Open "Nach Lagerort" view filtered to this specific place
    ART_VIEW = "lager";
    ART_SEARCH = ort;
  } else {
    ART_VIEW = "art";
    ART_SEARCH = "";
  }

  // Clear hash
  history.replaceState(null, "", window.location.pathname);
  const stName = D.standorte.find(s=>s.id===stId)?.name || stId;
  toast(`📍 ${stName}${ort?" · 📦 "+ort:""}`, "s");
}
