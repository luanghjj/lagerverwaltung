// ═══ STANDORTE (Locations + Compare) ═══
let STD_TAB = "list"; // "list" | "compare"
function renderStandorte() {
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.locations")}</div><div class="mn-a">`;
  h += `<div class="mode-tabs"><span class="mode-tab ${STD_TAB==="list"?"on":""}" onclick="STD_TAB='list';render()">📋 ${LANG==="vi"?"Danh sách":"Übersicht"}</span><span class="mode-tab ${STD_TAB==="compare"?"on":""}" onclick="STD_TAB='compare';render()">📊 ${LANG==="vi"?"So sánh":"Vergleich"}</span></div>`;
  h += `<button class="btn btn-o btn-sm" onclick="showQRCodes()">📱 QR-Codes</button>`;
  h += `<button class="btn btn-p" onclick="editStandort()">+ ${t("c.new")}</button>`;
  h += `</div></div><div class="mn-c">`;

  if (STD_TAB === "list") {
    h += renderStandortList();
  } else {
    h += renderStandortCompare();
  }

  h += `</div>`;
  return h;
}

function renderStandortList() {
  let h = `<div class="tw"><table><thead><tr><th>${t("c.name")}</th><th>${LANG==="vi"?"Địa chỉ":"Adresse"}</th><th>${t("c.status")}</th><th>${t("c.article")}</th>${canP()?`<th>${LANG==="vi"?"Giá trị kho":"Lagerwert"}</th>`:""}<th>${LANG==="vi"?"Người dùng":"Benutzer"}</th><th style="width:60px"></th></tr></thead><tbody>`;

  D.standorte.forEach(s => {
    const artCount = D.artikel.filter(a => a.istBestand.hasOwnProperty(s.id) || a.istBestand[s.id] !== undefined).length;
    const wert = D.artikel.reduce((sum, a) => {
      const ist = a.istBestand[s.id] || 0;
      const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
      return sum + ist * bp;
    }, 0);
    const userCount = D.users.filter(u => u.standorte.includes("all") || u.standorte.includes(s.id)).length;
    const todayWE = D.bewegungen.filter(b => b.standortId === s.id && b.typ === "eingang" && b.datum?.slice(0, 10) === td()).reduce((sum, b) => sum + (b.menge || 0), 0);
    const todayWA = D.bewegungen.filter(b => b.standortId === s.id && b.typ === "ausgang" && b.datum?.slice(0, 10) === td()).reduce((sum, b) => sum + (b.menge || 0), 0);

    h += `<tr>`;
    h += `<td><div style="font-weight:600">${esc(s.name)}</div>`;
    h += `<div style="font-size:10px;color:var(--t3);display:flex;gap:8px;margin-top:2px">`;
    if (todayWE) h += `<span style="color:var(--gn)">↓+${todayWE} ${LANG==="vi"?"hôm nay":"heute"}</span>`;
    if (todayWA) h += `<span style="color:var(--rd)">↑−${todayWA} ${LANG==="vi"?"hôm nay":"heute"}</span>`;
    h += `</div></td>`;
    h += `<td style="color:var(--t2);font-size:12px">${esc(s.adresse)}</td>`;
    h += `<td><span class="bp" style="background:${s.aktiv ? "var(--gA)" : "var(--rA)"};color:${s.aktiv ? "var(--gn)" : "var(--rd)"}">${s.aktiv ? t("c.active") : (LANG==="vi"?"Ngừng":"Inaktiv")}</span></td>`;
    h += `<td style="font-family:var(--m);font-weight:600">${artCount}</td>`;
    if (canP()) h += `<td style="font-family:var(--m);font-weight:600;color:var(--gn)">${fC(wert)}</td>`;
    h += `<td style="font-size:11px;color:var(--t2)">${userCount} ${LANG==="vi"?"người":"User"}</td>`;
    const lpCount = (s.lagerplaetze||[]).length;
    h += `<td><div style="display:flex;gap:2px"><button class="bi" onclick="showLagerplaetze('${s.id}')" title="${LANG==="vi"?"Vị trí kho":"Lagerplätze"}">📦</button><button class="bi" onclick="editStandort('${s.id}')" title="${t("c.edit")}">✎</button><button class="bi dn" onclick="delStandort('${s.id}')" title="${t("c.delete")}">🗑</button></div>${lpCount?`<div style="font-size:9px;color:var(--t3)">${lpCount} ${LANG==="vi"?"vị trí":"Plätze"}</div>`:""}</td>`;
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;
  return h;
}

function renderStandortCompare() {
  if (D.standorte.length < 2) {
    return `<div style="text-align:center;padding:30px;color:var(--t3)">${LANG==="vi"?"Cần ít nhất 2 chi nhánh để so sánh":"Mindestens 2 Standorte für Vergleich nötig"}</div>`;
  }

  // Time range filter
  const ranges = [7, 14, 30, 90];
  let h = `<div style="display:flex;gap:4px;margin-bottom:12px;align-items:center"><span style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase">${LANG==="vi"?"Khoảng thời gian":"Zeitraum"}:</span>`;
  h += `<div class="mode-tabs">${ranges.map(r => `<span class="mode-tab ${(window._cmpDays||30)===r?"on":""}" onclick="window._cmpDays=${r};render()">${r} ${LANG==="vi"?"ngày":"Tage"}</span>`).join("")}</div></div>`;

  const days = window._cmpDays || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  // Compute stats per standort
  const stats = D.standorte.map(s => {
    const bew = D.bewegungen.filter(b => b.standortId === s.id && b.datum >= cutoffStr);
    const we = bew.filter(b => b.typ === "eingang");
    const wa = bew.filter(b => b.typ === "ausgang");
    const weMenge = we.reduce((sum, b) => sum + (b.menge || 0), 0);
    const waMenge = wa.reduce((sum, b) => sum + (b.menge || 0), 0);
    const weWert = we.reduce((sum, b) => {
      const a = D.artikel.find(x => x.id === b.artikelId);
      const bp = a?.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
      return sum + (b.menge || 0) * bp;
    }, 0);
    const waWert = wa.reduce((sum, b) => {
      const a = D.artikel.find(x => x.id === b.artikelId);
      const bp = a?.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
      return sum + (b.menge || 0) * bp;
    }, 0);
    const artCount = D.artikel.filter(a => (a.istBestand[s.id] || 0) > 0).length;
    const lagerWert = D.artikel.reduce((sum, a) => {
      const ist = a.istBestand[s.id] || 0;
      const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
      return sum + ist * bp;
    }, 0);
    const critCount = D.artikel.filter(a => (a.istBestand[s.id] || 0) <= (a.mindestmenge[s.id] || 0)).length;

    return { ...s, weMenge, waMenge, weCount: we.length, waCount: wa.length, weWert, waWert, artCount, lagerWert, critCount, totalBew: bew.length };
  });

  const maxWE = Math.max(...stats.map(s => s.weMenge), 1);
  const maxWA = Math.max(...stats.map(s => s.waMenge), 1);
  const maxWert = Math.max(...stats.map(s => s.lagerWert), 1);

  // Side-by-side cards
  h += `<div style="display:grid;grid-template-columns:repeat(${Math.min(stats.length, 4)},1fr);gap:10px;margin-bottom:16px">`;
  stats.forEach(s => {
    h += `<div class="sc" style="border-top:3px solid var(--ac)">`;
    h += `<div style="font-weight:700;font-size:14px;margin-bottom:8px">${esc(s.name)}</div>`;
    // Lagerwert
    h += `<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase">${LANG==="vi"?"Giá trị kho":"Lagerwert"}</div><div style="font-family:var(--m);font-weight:700;font-size:18px;color:var(--gn)">${fC(s.lagerWert)}</div></div>`;
    // Bar: Lagerwert
    h += `<div style="height:6px;background:var(--b4);border-radius:3px;margin-bottom:8px;overflow:hidden"><div style="height:100%;width:${(s.lagerWert/maxWert*100)}%;background:var(--gn);border-radius:3px"></div></div>`;
    // Stats grid
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">`;
    h += `<div style="padding:6px 8px;background:var(--gA);border-radius:6px;text-align:center"><div style="font-size:9px;color:var(--gn);font-weight:600">↓ ${LANG==="vi"?"NHẬP":"EINGANG"}</div><div style="font-family:var(--m);font-weight:700;font-size:16px;color:var(--gn)">${s.weMenge}</div><div style="font-size:9.5px;color:var(--t3)">${s.weCount} ${LANG==="vi"?"lần":"Buchg."} · ${fC(s.weWert)}</div></div>`;
    h += `<div style="padding:6px 8px;background:var(--rA);border-radius:6px;text-align:center"><div style="font-size:9px;color:var(--rd);font-weight:600">↑ ${LANG==="vi"?"XUẤT":"AUSGANG"}</div><div style="font-family:var(--m);font-weight:700;font-size:16px;color:var(--rd)">${s.waMenge}</div><div style="font-size:9.5px;color:var(--t3)">${s.waCount} ${LANG==="vi"?"lần":"Buchg."} · ${fC(s.waWert)}</div></div>`;
    h += `</div>`;
    // Bars WE/WA
    h += `<div style="margin-top:6px"><div style="display:flex;gap:4px;align-items:center;margin-bottom:3px"><span style="font-size:9px;color:var(--gn);width:14px">↓</span><div style="flex:1;height:8px;background:var(--b4);border-radius:4px;overflow:hidden"><div style="height:100%;width:${(s.weMenge/maxWE*100)}%;background:var(--gn);border-radius:4px"></div></div></div>`;
    h += `<div style="display:flex;gap:4px;align-items:center"><span style="font-size:9px;color:var(--rd);width:14px">↑</span><div style="flex:1;height:8px;background:var(--b4);border-radius:4px;overflow:hidden"><div style="height:100%;width:${(s.waMenge/maxWA*100)}%;background:var(--rd);border-radius:4px"></div></div></div></div>`;
    // Footer stats
    h += `<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid var(--bd);font-size:10.5px">`;
    h += `<span style="color:var(--t2)">${s.artCount} ${t("c.article")}</span>`;
    h += `<span style="color:${s.critCount?"var(--rd)":"var(--gn)"};font-weight:600">${s.critCount} ${LANG==="vi"?"cần bổ sung":"kritisch"}</span>`;
    h += `</div>`;
    h += `</div>`;
  });
  h += `</div>`;

  // Detailed comparison table
  h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px">${LANG==="vi"?"So sánh chi tiết":"Detailvergleich"} (${days} ${LANG==="vi"?"ngày":"Tage"})</h3>`;
  h += `<div class="tw"><table><thead><tr><th>${LANG==="vi"?"Chỉ số":"Kennzahl"}</th>`;
  stats.forEach(s => { h += `<th style="text-align:right">${esc(s.name)}</th>`; });
  h += `</tr></thead><tbody>`;

  const rows = [
    { l: LANG==="vi"?"Giá trị kho":"Lagerwert", k: s => fC(s.lagerWert), best: "max", field: "lagerWert" },
    { l: LANG==="vi"?"Số SP có tồn":"Artikel mit Bestand", k: s => s.artCount, field: "artCount" },
    { l: LANG==="vi"?"SP cần bổ sung":"Kritische Artikel", k: s => s.critCount, best: "min", field: "critCount", color: "var(--rd)" },
    { l: `↓ ${LANG==="vi"?"Nhập (SL)":"Eingang (Menge)"}`, k: s => s.weMenge, best: "max", field: "weMenge", color: "var(--gn)" },
    { l: `↓ ${LANG==="vi"?"Nhập (GT)":"Eingang (Wert)"}`, k: s => fC(s.weWert), field: "weWert" },
    { l: `↓ ${LANG==="vi"?"Nhập (lần)":"Eingang (Buchungen)"}`, k: s => s.weCount, field: "weCount" },
    { l: `↑ ${LANG==="vi"?"Xuất (SL)":"Ausgang (Menge)"}`, k: s => s.waMenge, best: "max", field: "waMenge", color: "var(--rd)" },
    { l: `↑ ${LANG==="vi"?"Xuất (GT)":"Ausgang (Wert)"}`, k: s => fC(s.waWert), field: "waWert" },
    { l: `↑ ${LANG==="vi"?"Xuất (lần)":"Ausgang (Buchungen)"}`, k: s => s.waCount, field: "waCount" },
    { l: LANG==="vi"?"Tổng biến động":"Ges. Bewegungen", k: s => s.totalBew, field: "totalBew" },
  ];

  rows.forEach(row => {
    const vals = stats.map(s => s[row.field]);
    const best = row.best === "min" ? Math.min(...vals) : row.best === "max" ? Math.max(...vals) : null;
    h += `<tr><td style="font-weight:600;font-size:12px">${row.l}</td>`;
    stats.forEach((s, i) => {
      const val = row.k(s);
      const isBest = best !== null && s[row.field] === best && stats.filter(x=>x[row.field]===best).length === 1;
      h += `<td style="text-align:right;font-family:var(--m);font-weight:${isBest?"700":"500"};font-size:12.5px;${isBest?"color:"+(row.color||"var(--ac)"):"color:var(--tx)"}">${val}${isBest?" ★":""}</td>`;
    });
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;

  // Top articles per location
  h += `<h3 style="font-size:13px;font-weight:700;margin:16px 0 8px">${LANG==="vi"?"Top SP xuất kho":"Top Artikel Ausgang"} (${days} ${LANG==="vi"?"ngày":"Tage"})</h3>`;
  h += `<div style="display:grid;grid-template-columns:repeat(${Math.min(stats.length, 4)},1fr);gap:10px">`;
  stats.forEach(s => {
    const waBew = D.bewegungen.filter(b => b.standortId === s.id && b.typ === "ausgang" && b.datum >= cutoffStr);
    const artTotals = {};
    waBew.forEach(b => { artTotals[b.artikelId] = (artTotals[b.artikelId] || 0) + (b.menge || 0); });
    const top5 = Object.entries(artTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

    h += `<div class="cd"><div style="font-weight:700;font-size:12px;margin-bottom:6px;color:var(--ac)">${esc(s.name)}</div>`;
    if (!top5.length) { h += `<div style="font-size:11px;color:var(--t3)">—</div>`; }
    top5.forEach(([artId, menge], idx) => {
      const a = D.artikel.find(x => x.id === artId);
      h += `<div style="display:flex;justify-content:space-between;padding:3px 0;${idx<top5.length-1?"border-bottom:1px solid var(--bd)":""}">`;
      h += `<span style="font-size:11.5px;font-weight:${idx===0?"700":"500"}">${idx + 1}. ${esc(artN(a))}</span>`;
      h += `<span style="font-family:var(--m);font-weight:600;color:var(--rd);font-size:11.5px">−${menge}</span>`;
      h += `</div>`;
    });
    h += `</div>`;
  });
  h += `</div>`;

  return h;
}

function editStandort(id) {
  const s = id ? D.standorte.find(x => x.id === id) : null;
  const f = s ? JSON.parse(JSON.stringify(s)) : { id: uid(), name: "", adresse: "", aktiv: true };
  const title = s ? `${t("c.edit")} — ${esc(f.name)}` : `${t("c.new")} ${t("nav.locations")}`;

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${title}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  h += `<div class="fg"><label>${t("c.name")} *</label><input class="inp" id="se_name" value="${esc(f.name)}" placeholder="${LANG==="vi"?"Tên chi nhánh":"Standortname"}"></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Địa chỉ":"Adresse"}</label><input class="inp" id="se_adresse" value="${esc(f.adresse)}" placeholder="${LANG==="vi"?"Địa chỉ đầy đủ":"Vollständige Adresse"}"></div>`;
  h += `<div class="fg"><label style="display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" id="se_aktiv" ${f.aktiv ? "checked" : ""}> ${t("c.active")}</label></div>`;

  // Copy Bereiche option (only for new Standort)
  if (!s && D.standorte.length) {
    h += `<div class="fg"><label>${LANG==="vi"?"Copy khu vực (Bereiche) từ":"Bereiche kopieren von"}</label><select class="sel" id="se_copy_bereiche"><option value="">${LANG==="vi"?"— Không copy —":"— Nicht kopieren —"}</option>${D.standorte.map(x=>`<option value="${x.id}">${esc(x.name)} (${D.bereiche.filter(b=>b.standortId===x.id).length} ${LANG==="vi"?"khu vực":"Bereiche"})</option>`).join("")}</select></div>`;
    h += `<div style="font-size:10px;color:var(--t3);margin-top:-6px;margin-bottom:8px;padding:0 2px">💡 ${LANG==="vi"?"Tất cả khu vực (Service, Küche, Bar...) sẽ được tạo tự động cho kho mới":"Alle Bereiche (Service, Küche, Bar...) werden automatisch für den neuen Standort erstellt"}</div>`;
  }

  // If editing, show current stats
  if (s) {
    const artCount = D.artikel.filter(a => (a.istBestand[s.id] || 0) > 0).length;
    const userCount = D.users.filter(u => u.standorte.includes("all") || u.standorte.includes(s.id)).length;
    const bewCount = D.bewegungen.filter(b => b.standortId === s.id).length;
    h += `<div style="padding:8px 10px;background:var(--b3);border-radius:6px;margin-top:6px">`;
    h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">${LANG==="vi"?"Thống kê":"Statistik"}</div>`;
    h += `<div style="display:flex;gap:12px;font-size:11.5px">`;
    h += `<span>${artCount} ${t("c.article")}</span>`;
    h += `<span>${userCount} ${LANG==="vi"?"người dùng":"Benutzer"}</span>`;
    h += `<span>${bewCount} ${LANG==="vi"?"biến động":"Bewegungen"}</span>`;
    h += `</div></div>`;
  }

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveStandort('${f.id}',${s ? 'true' : 'false'})">${t("c.save")}</button></div></div></div>`;

  document.body.insertAdjacentHTML("beforeend", h);
}

function saveStandort(id, isEdit) {
  const name = document.getElementById("se_name")?.value || "";
  const adresse = document.getElementById("se_adresse")?.value || "";
  const aktiv = document.getElementById("se_aktiv")?.checked ?? true;

  if (!name) { toast(LANG==="vi" ? "Vui lòng nhập tên" : "Bitte Name eingeben", "e"); return; }

  const f = { id, name, adresse, aktiv, lagerplaetze: D.standorte.find(x=>x.id===id)?.lagerplaetze || [] };

  if (isEdit) {
    const idx = D.standorte.findIndex(x => x.id === id);
    if (idx >= 0) D.standorte[idx] = f;
  } else {
    D.standorte.push(f);
    // Initialize stock fields for all articles
    D.artikel.forEach(a => {
      if (!a.istBestand[id]) a.istBestand[id] = 0;
      if (!a.sollBestand[id]) a.sollBestand[id] = 0;
      if (!a.mindestmenge[id]) a.mindestmenge[id] = 0;
      if (!a.lagerort) a.lagerort = {};
      if (!a.lagerort[id]) a.lagerort[id] = "";
    });
    // Copy Bereiche from source Standort
    const copyFrom = document.getElementById("se_copy_bereiche")?.value || "";
    if (copyFrom) {
      const srcBereiche = D.bereiche.filter(b => b.standortId === copyFrom);
      let copied = 0;
      srcBereiche.forEach(src => {
        const newBr = {
          id: uid(),
          name: src.name,
          name_vi: src.name_vi || "",
          standortId: id,
          farbe: src.farbe,
          icon: src.icon,
          artikel: src.artikel.map(ba => ({ artikelId: ba.artikelId, soll: ba.soll, quelleId: id }))
        };
        D.bereiche.push(newBr);
        if (typeof sbSaveBereich === "function") sbSaveBereich(newBr).catch(e => console.error("sbSaveBereich:", e));
        copied++;
      });
      if (copied) toast(`📋 ${copied} ${LANG==="vi"?"khu vực đã copy":"Bereiche kopiert"}`, "s");
    }
  }
  save(); closeModal(); render();
  if (typeof sbSaveStandort === "function") sbSaveStandort(f).catch(e => console.error("sbStandort:", e));
  toast("✓", "s");
}

function delStandort(id) {
  const s = D.standorte.find(x => x.id === id);
  const artCount = D.artikel.filter(a => (a.istBestand[id] || 0) > 0).length;
  const label = LANG === "vi"
    ? `Xóa "${s?.name}"? ${artCount ? artCount + " SP có tồn kho sẽ bị xóa!" : ""}`
    : `"${s?.name}" löschen? ${artCount ? artCount + " Artikel mit Bestand werden entfernt!" : ""}`;
  cConfirm(label, () => {
    D.standorte = D.standorte.filter(x => x.id !== id);
    D.artikel.forEach(a => {
      delete a.istBestand[id]; delete a.sollBestand[id]; delete a.mindestmenge[id];
      if (a.lagerort) delete a.lagerort[id];
    });
    D.users.forEach(u => { u.standorte = u.standorte.filter(x => x !== id); if (!u.standorte.length) u.standorte = ["all"]; });
    save(); render(); toast("✓", "i");
    if (typeof sb !== "undefined") sb.from("standorte").update({ aktiv: false }).eq("id", id).catch(e => console.error("sbDelStandort:", e));
  });
}

// ═══ LAGERPLÄTZE VERWALTUNG ═══