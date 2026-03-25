// ═══ BESTELLLISTE (Order List) ═══
function renderBestellliste(vS, aS) {
  // Migrate
  if (!D.bestellVorlagen) D.bestellVorlagen = [];

  // Auto-add articles below Mindestmenge
  const sids = aS ? [aS] : vS.map(s=>s.id);
  D.artikel.forEach(a => {
    sids.forEach(sid => {
      const ist = a.istBestand[sid]||0, min = a.mindestmenge[sid]||0, soll = a.sollBestand[sid]||0;
      if (min > 0 && ist <= min) {
        const exists = D.bestellliste.find(x=>x.artikelId===a.id && x.standortId===sid);
        // Don't auto-add if already on order (bestellt)
        const alreadyOrdered = D.bestellungen.some(b=>b.artikelId===a.id && b.standortId===sid && b.status==="bestellt");
        if (!exists && !alreadyOrdered) {
          const bestL = a.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]) : null;
          const empf = Math.max(1, soll - ist);
          D.bestellliste.push({ id: uid(), artikelId: a.id, standortId: sid, menge: empf, lieferantId: bestL?.lieferantId||"", auto: true });
        }
      }
    });
  });
  // Remove auto-added items that are no longer critical
  D.bestellliste = D.bestellliste.filter(bl => {
    if (!bl.auto) return true;
    const a = D.artikel.find(x=>x.id===bl.artikelId);
    if (!a) return false;
    const ist = a.istBestand[bl.standortId]||0, min = a.mindestmenge[bl.standortId]||0;
    return min > 0 && ist <= min;
  });
  save();

  const items = D.bestellliste.filter(bl => sids.includes(bl.standortId)).map(bl => {
    const a = D.artikel.find(x=>x.id===bl.artikelId);
    const l = D.lieferanten.find(x=>x.id===bl.lieferantId);
    const s = D.standorte.find(x=>x.id===bl.standortId);
    const p = a?.lieferanten.find(al=>al.lieferantId===bl.lieferantId)?.preis || 0;
    const ist = a?.istBestand[bl.standortId] || 0;
    const soll = a?.sollBestand[bl.standortId] || 0;
    const min = a?.mindestmenge[bl.standortId] || 0;
    const empfohlen = Math.max(0, soll - ist);
    // bestellEinheit: "base" (default) or "pack"
    const usesPack = a?.packSize > 1 && a?.packUnit;
    const einheit = bl.bestellEinheit || "base";
    // Display qty depends on unit
    const displayQty = einheit === "pack" && usesPack ? Math.ceil(bl.menge / a.packSize) : bl.menge;
    const displayUnit = einheit === "pack" && usesPack ? a.packUnit : (a?.einheit || "");
    // Wert is always based on base menge
    const wert = p * bl.menge;
    return { ...bl, art: a, lief: l, st: s, preis: p, wert, ist, soll, min, empfohlen, usesPack, displayQty, displayUnit };
  });

  const totalWert = items.reduce((s, it) => s + it.wert, 0);
  const totalPos = items.length;

  const autoCount = items.filter(it=>it.auto).length;
  const manCount = items.length - autoCount;

  let h = `<div class="mn-h"><div class="mn-t">${t("nav.orderlist")}</div><div class="mn-a">`;
  h += `<div class="mode-tabs"><span class="mode-tab ${BL_VIEW==="lief"?"on":""}" onclick="BL_VIEW='lief';render()">📦 ${LANG==="vi"?"Theo NCC":"Nach Lieferant"}</span><span class="mode-tab ${BL_VIEW==="art"?"on":""}" onclick="BL_VIEW='art';render()">📋 ${LANG==="vi"?"Theo SP":"Nach Artikel"}</span><span class="mode-tab ${BL_VIEW==="vorlagen"?"on":""}" onclick="BL_VIEW='vorlagen';render()">⭐ ${LANG==="vi"?"Mẫu":"Vorlagen"}</span></div>`;
  // Critical + clear buttons
  const blCrit = D.artikel.filter(a=>sids.some(sid=>{const ist=a.istBestand[sid]||0,min=a.mindestmenge[sid]||0;return min>0&&ist<=min&&!D.bestellliste.some(bl=>bl.artikelId===a.id&&bl.standortId===sid)&&!D.bestellungen.some(b=>b.artikelId===a.id&&b.standortId===sid&&b.status==="bestellt");}));
  if (blCrit.length) h += `<button class="btn btn-d btn-sm" onclick="addCriticalToBestellliste()" style="animation:pulse 1.5s infinite">⚠ ${blCrit.length} ${t("m.addcritical")}</button>`;
  if (items.length) {
    h += `<button class="btn btn-o btn-sm" onclick="clearBestellliste()">✕ ${LANG==="vi"?"Xóa DS":"Leeren"}</button>`;
  }
  h += `</div></div><div class="mn-c">`;

  // Vorlagen tab
  if (BL_VIEW === "vorlagen") {
    h += renderBestellVorlagen(vS);
    h += `</div>`;
    return h;
  }

  if (!items.length) {
    h += `<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:32px;margin-bottom:6px">🛒</div><div style="font-size:13px;font-weight:600">${t("o.emptylist")}</div><div style="font-size:11px;margin-top:4px">${LANG==="vi"?"Tất cả SP đều trên mức tối thiểu":"Alle Artikel über Mindestbestand"} ✓</div></div></div>`;
    return h;
  }

  // Summary cards
  h += `<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><div class="sc"><div class="sc-l">${LANG==="vi"?"Vị trí":"Positionen"}</div><div class="sc-v">${totalPos}</div></div><div class="sc"><div class="sc-l">${LANG==="vi"?"NCC":"Lieferanten"}</div><div class="sc-v">${[...new Set(items.map(it=>it.lieferantId))].length}</div></div>${canP()?`<div class="sc"><div class="sc-l">${t("c.total")} ${t("c.value")}</div><div class="sc-v" style="color:var(--ac)">${fC(totalWert)}</div></div>`:""}${autoCount?`<div class="sc" style="border-left:3px solid var(--rd)"><div class="sc-l">${LANG==="vi"?"Dưới tối thiểu":"Unter Minimum"}</div><div class="sc-v" style="color:var(--rd)">${autoCount}</div></div>`:""}</div>`;

  // Quick-Add from Supplier
  h += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px;flex-wrap:wrap">`;
  h += `<span style="font-size:10px;color:var(--t3);font-weight:600">+</span>`;
  h += `<select class="sel" id="blQuickLief" style="width:auto;min-width:180px;padding:4px 8px" onchange="blQuickLiefChanged()"><option value="">— ${LANG==="vi"?"Thêm từ NCC":"Von Lieferant hinzufügen"} —</option>${D.lieferanten.map(l=>`<option value="${l.id}">${esc(l.name)} (${D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===l.id)).length} Art.)</option>`).join("")}</select>`;
  h += `<span id="blQuickInfo" style="font-size:10px;color:var(--t2)"></span>`;
  h += `</div>`;
  h += `<div id="blQuickPanel"></div>`;

  // ═══ VIEW: BY SUPPLIER (grouped) ═══
  if (BL_VIEW === "lief") {
    const groups = {};
    items.forEach(it => {
      const key = it.lieferantId || "none";
      if (!groups[key]) groups[key] = { lief: it.lief, items: [] };
      groups[key].items.push(it);
    });
    Object.values(groups).forEach(g => g.items.sort((a, b) => artN(a.art).localeCompare(artN(b.art))));

    for (const [key, g] of Object.entries(groups)) {
      const grpTotal = g.items.reduce((s, it) => s + it.wert, 0);
      const nd = g.lief ? nextDelivery(g.lief) : null;
      const dl = dayL();

      h += `<div class="cd" style="margin-bottom:12px;border-left:3px solid var(--ac)">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">`;
      h += `<div><div style="font-weight:700;font-size:14px">${esc(g.lief?.name || (LANG==="vi"?"Không có NCC":"Kein Lieferant"))}</div>`;
      if (g.lief) {
        h += `<div style="display:flex;gap:8px;font-size:10.5px;color:var(--t2);margin-top:2px">`;
        if (g.lief.email) h += `<span>✉ ${esc(g.lief.email)}</span>`;
        if (g.lief.telefon) h += `<span>☎ ${esc(g.lief.telefon)}</span>`;
        h += `</div>`;
        if (nd) h += `<div style="font-size:10.5px;color:var(--gn);font-weight:600;margin-top:2px">📅 ${LANG==="vi"?"Giao tiếp theo":"Nächste Lieferung"}: ${nd}</div>`;
        if (g.lief.liefertage?.length) h += `<div style="margin-top:3px;display:flex;gap:1px">${WDAYS.map((d,i)=>`<span class="day-tag ${g.lief.liefertage?.includes(d)?"on":""}">${dl[i]}</span>`).join("")}</div>`;
        if (g.lief.notiz) h += `<div style="font-size:10px;color:var(--t3);margin-top:2px">${esc(g.lief.notiz)}</div>`;
      }
      h += `</div>`;
      h += `<div style="text-align:right">${canP()?`<div style="font-family:var(--m);font-weight:700;font-size:17px">${fC(grpTotal)}</div>`:""}<div style="font-size:10px;color:var(--t3)">${g.items.length} ${t("c.article")}</div><button class="btn btn-g btn-sm" style="margin-top:4px" onclick="submitGroup('${key}')">📨 ${t("o.submitorder")}</button></div>`;
      h += `</div>`;

      h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
      h += `<th style="background:transparent;padding:4px 8px">${t("c.article")}</th>`;
      h += `<th style="background:transparent;padding:4px 8px">${t("c.location")}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Tồn kho":"Bestand"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Đề xuất":"Empfohlen"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:center">${LANG==="vi"?"Đặt hàng":"Bestell-Menge"}</th>`;
      h += `${canP()?`<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Giá":"EK"}</th>`:""}`;
      h += `${canP()?`<th style="background:transparent;padding:4px 8px;text-align:right">${t("c.value")}</th>`:""}`;
      h += `<th style="background:transparent;padding:4px 8px;width:28px"></th>`;
      h += `</tr></thead><tbody>`;

      g.items.forEach(it => { h += renderBLRow(it); });
      h += `</tbody></table></div>`;
    }
  }

  // ═══ VIEW: BY ARTICLE (flat sorted) ═══
  if (BL_VIEW === "art") {
    const sorted = [...items].sort((a, b) => artN(a.art).localeCompare(artN(b.art)));

    h += `<div class="tw"><table><thead><tr>`;
    h += `<th>${t("c.article")}</th>`;
    h += `<th>${t("c.location")}</th>`;
    h += `<th>${t("c.supplier")}</th>`;
    h += `<th style="text-align:right">${LANG==="vi"?"Tồn kho":"Bestand"}</th>`;
    h += `<th style="text-align:right">${LANG==="vi"?"Đề xuất":"Empfohlen"}</th>`;
    h += `<th style="text-align:center">${LANG==="vi"?"Đặt hàng":"Bestell-Menge"}</th>`;
    h += `${canP()?`<th style="text-align:right">${LANG==="vi"?"Giá":"EK"}</th>`:""}`;
    h += `${canP()?`<th style="text-align:right">${t("c.value")}</th>`:""}`;
    h += `<th style="width:28px"></th>`;
    h += `</tr></thead><tbody>`;

    sorted.forEach(it => {
      h += `<tr>`;
      h += `<td style="font-weight:600;cursor:pointer" onclick="showArtikelDetail('${it.art?.id}')">${it.art?.bilder?.length?`<img src="${esc(it.art.bilder[0])}" style="width:22px;height:22px;border-radius:3px;object-fit:cover;vertical-align:middle;margin-right:4px">`:""}<span style="color:var(--ac)">${esc(artN(it.art))}</span>${it.auto?`<span style="font-size:8px;padding:1px 4px;background:var(--rA);color:var(--rd);border-radius:3px;margin-left:4px;font-weight:700;vertical-align:middle">${LANG==="vi"?"TĐ":"AUTO"}</span>`:""}<div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(it.art?.sku||"")}</div></td>`;
      h += `<td style="font-size:11.5px">${esc(it.st?.name||"")}</td>`;
      h += `<td style="font-size:11.5px">${esc(it.lief?.name||"—")}</td>`;
      // Stock
      const stk = stkSt(it.ist, it.soll, it.min);
      h += `<td style="text-align:right"><span style="font-family:var(--m);font-weight:600;color:${stk.c}">${it.ist}</span><span style="font-size:10px;color:var(--t3)"> / ${it.soll} ${esc(it.art?.einheit||"")}</span></td>`;
      h += `<td style="text-align:right"><span style="font-family:var(--m);color:${it.empfohlen>0?"var(--yl)":"var(--gn)"};font-weight:600">${it.empfohlen}</span></td>`;
      // Qty with unit selector
      h += `<td style="text-align:center">${renderBLQtyCell(it)}</td>`;
      if (canP()) h += `<td style="text-align:right;font-family:var(--m);font-size:11px;color:var(--t2)">${it.preis.toFixed(2)} €</td>`;
      if (canP()) h += `<td style="text-align:right;font-family:var(--m);font-weight:600">${fC(it.wert)}</td>`;
      h += `<td><button class="bi dn" onclick="remBestellliste('${it.id}')">✕</button></td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;
  }

  h += `</div>`;
  return h;
}

// Render quantity cell with unit selector
function renderBLQtyCell(it) {
  const a = it.art;
  const einheit = it.bestellEinheit || "base";
  let h = `<div style="display:flex;align-items:center;gap:3px;justify-content:center">`;
  h += `<input class="inp" type="number" min="1" value="${it.displayQty}" onchange="setBLMengeUnit('${it.id}',this.value,'${einheit}')" style="width:58px;text-align:center;padding:3px 3px;font-family:var(--m);font-size:13px;font-weight:700">`;
  // Unit selector
  if (it.usesPack) {
    h += `<select class="sel" onchange="setBLUnit('${it.id}',this.value)" style="width:auto;min-width:60px;padding:3px 4px;font-size:10.5px;font-weight:600">`;
    h += `<option value="base" ${einheit==="base"?"selected":""}>${esc(a.einheit)}</option>`;
    h += `<option value="pack" ${einheit==="pack"?"selected":""}>${esc(a.packUnit)} (${a.packSize}×)</option>`;
    h += `</select>`;
  } else {
    h += `<span style="font-size:10.5px;color:var(--t2);min-width:30px">${esc(a?.einheit||"")}</span>`;
  }
  h += `</div>`;
  // Show conversion info
  if (it.usesPack) {
    const baseMenge = it.menge;
    const conv = formatUnitConv(baseMenge, a);
    h += `<div style="font-size:9.5px;color:var(--pu);text-align:center;margin-top:1px">= ${baseMenge} ${esc(a.einheit)}${conv ? ` (${esc(conv)})` : ""}</div>`;
  }
  return h;
}

// Render grouped view row (supplier view)
function renderBLRow(it) {
  const stk = stkSt(it.ist, it.soll, it.min);
  let h = `<tr style="border-bottom:1px solid var(--bd)">`;
  h += `<td style="padding:6px 8px;font-weight:600;cursor:pointer" onclick="showArtikelDetail('${it.art?.id}')">${it.art?.bilder?.length?`<img src="${esc(it.art.bilder[0])}" style="width:22px;height:22px;border-radius:3px;object-fit:cover;vertical-align:middle;margin-right:4px">`:""}<span style="color:var(--ac)">${esc(artN(it.art))}</span>${it.auto?`<span style="font-size:8px;padding:1px 4px;background:var(--rA);color:var(--rd);border-radius:3px;margin-left:4px;font-weight:700;vertical-align:middle">${LANG==="vi"?"TĐ":"AUTO"}</span>`:""}<div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(it.art?.sku||"")}</div></td>`;
  h += `<td style="padding:6px 8px;font-size:11.5px">${esc(it.st?.name||"")}</td>`;
  h += `<td style="padding:6px 8px;text-align:right"><span style="font-family:var(--m);font-weight:600;color:${stk.c}">${it.ist}</span><span style="font-size:10px;color:var(--t3)"> / ${it.soll} ${esc(it.art?.einheit||"")}</span></td>`;
  h += `<td style="padding:6px 8px;text-align:right"><span style="font-family:var(--m);color:${it.empfohlen>0?"var(--yl)":"var(--gn)"};font-weight:600">${it.empfohlen}</span> <span style="font-size:10px;color:var(--t3)">${esc(it.art?.einheit||"")}</span></td>`;
  h += `<td style="padding:6px 8px;text-align:center">${renderBLQtyCell(it)}</td>`;
  if (canP()) h += `<td style="padding:6px 8px;text-align:right;font-family:var(--m);font-size:11px;color:var(--t2)">${it.preis.toFixed(2)} €</td>`;
  if (canP()) h += `<td style="padding:6px 8px;text-align:right;font-family:var(--m);font-weight:600">${fC(it.wert)}</td>`;
  h += `<td style="padding:6px 8px"><button class="bi dn" onclick="remBestellliste('${it.id}')">✕</button></td>`;
  h += `</tr>`;
  return h;
}

// Set quantity, respecting current unit
function setBLMengeUnit(id, val, einheit) {
  const it = D.bestellliste.find(x=>x.id===id);
  if (!it) return;
  const a = D.artikel.find(x=>x.id===it.artikelId);
  const qty = Math.max(1, parseInt(val) || 1);
  if (einheit === "pack" && a?.packSize > 1) {
    it.menge = qty * a.packSize; // Convert pack → base
  } else {
    it.menge = qty;
  }
  save(); render();
}

// Switch unit for an item
function setBLUnit(id, unit) {
  const it = D.bestellliste.find(x=>x.id===id);
  if (!it) return;
  it.bestellEinheit = unit;
  // Don't change menge — just switch display
  save(); render();
}

function setBLMenge(id, val) {
  const it = D.bestellliste.find(x=>x.id===id);
  if (it) { it.menge = Math.max(1, parseInt(val) || 1); save(); render(); }
}

// ═══ BESTELL-VORLAGEN ═══
function renderBestellVorlagen(vS) {
  const vorlagen = D.bestellVorlagen || [];
  let h = "";

  // Create from current list button
  if (D.bestellliste.length) {
    h += `<div style="margin-bottom:12px;padding:8px 12px;background:var(--aA);border:1px solid rgba(59,130,246,.15);border-radius:6px;display:flex;justify-content:space-between;align-items:center">`;
    h += `<div><div style="font-weight:600;font-size:12px;color:var(--ac)">💡 ${LANG==="vi"?"Lưu DS hiện tại làm mẫu":"Aktuelle Liste als Vorlage speichern"}</div>`;
    h += `<div style="font-size:10.5px;color:var(--t2)">${D.bestellliste.length} ${t("c.article")} ${LANG==="vi"?"trong danh sách":"in der Liste"}</div></div>`;
    h += `<button class="btn btn-p btn-sm" onclick="createVorlageFromList()">⭐ ${LANG==="vi"?"Lưu mẫu":"Als Vorlage"}</button>`;
    h += `</div>`;
  }

  if (!vorlagen.length) {
    h += `<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:32px;margin-bottom:6px">⭐</div>`;
    h += `<div style="font-size:13px;font-weight:600">${LANG==="vi"?"Chưa có mẫu đặt hàng":"Keine Vorlagen vorhanden"}</div>`;
    h += `<div style="font-size:11px;margin-top:4px">${LANG==="vi"?"Tạo mẫu từ danh sách hiện tại hoặc thêm mới":"Erstelle eine Vorlage aus der aktuellen Liste oder manuell"}</div>`;
    h += `<button class="btn btn-o" onclick="editVorlage(-1)" style="margin-top:10px">+ ${LANG==="vi"?"Tạo mẫu mới":"Neue Vorlage"}</button>`;
    h += `</div>`;
    return h;
  }

  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  h += `<div style="font-weight:700;font-size:13px">⭐ ${vorlagen.length} ${LANG==="vi"?"Mẫu":"Vorlagen"}</div>`;
  h += `<button class="btn btn-o btn-sm" onclick="editVorlage(-1)">+ ${LANG==="vi"?"Tạo mới":"Neue Vorlage"}</button></div>`;

  vorlagen.forEach((v, idx) => {
    const lief = D.lieferanten.find(l=>l.id===v.lieferantId);
    const artCount = v.items.length;
    const totalMenge = v.items.reduce((s,it)=>s+it.menge, 0);

    h += `<div class="cd" style="margin-bottom:6px;border-left:3px solid var(--ac)">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:flex-start">`;
    h += `<div><div style="font-weight:700;font-size:13px">${esc(v.name)}</div>`;
    h += `<div style="font-size:10.5px;color:var(--t2)">${lief?esc(lief.name):(LANG==="vi"?"Nhiều NCC":"Mehrere Lieferanten")} · ${artCount} ${t("c.article")} · ${totalMenge} ${LANG==="vi"?"đơn vị":"Einh."}</div></div>`;
    h += `<div style="display:flex;gap:3px">`;
    h += `<button class="btn btn-g btn-sm" onclick="applyVorlage(${idx})">📥 ${LANG==="vi"?"Dùng":"Anwenden"}</button>`;
    h += `<button class="bi" onclick="editVorlage(${idx})">✎</button>`;
    h += `<button class="bi dn" onclick="deleteVorlage(${idx})">🗑</button>`;
    h += `</div></div>`;

    // Preview items
    h += `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">`;
    v.items.slice(0, 8).forEach(it => {
      const a = D.artikel.find(x=>x.id===it.artikelId);
      h += `<span style="font-size:10px;padding:1px 6px;background:var(--b4);border-radius:3px;color:var(--t2)">${it.menge}× ${esc(artN(a))}</span>`;
    });
    if (v.items.length > 8) h += `<span style="font-size:10px;color:var(--t3)">+${v.items.length-8}</span>`;
    h += `</div></div>`;
  });

  return h;
}

function createVorlageFromList() {
  // Group by supplier
  const groups = {};
  D.bestellliste.forEach(bl => {
    const key = bl.lieferantId || "none";
    if (!groups[key]) groups[key] = [];
    groups[key].push(bl);
  });

  const liefKeys = Object.keys(groups);
  if (liefKeys.length === 1) {
    // Single supplier: create one template
    const liefId = liefKeys[0] === "none" ? "" : liefKeys[0];
    const lief = D.lieferanten.find(l=>l.id===liefId);
    const items = groups[liefKeys[0]].map(bl => ({artikelId: bl.artikelId, menge: bl.menge}));
    const name = lief ? lief.name : (LANG==="vi"?"Mẫu mới":"Neue Vorlage");
    D.bestellVorlagen.push({id:uid(), name, lieferantId: liefId, items});
    save(); render();
    toast(`⭐ ${LANG==="vi"?"Đã lưu mẫu":"Vorlage gespeichert"}: ${name}`,"s");
  } else {
    // Multiple suppliers: create one template per supplier
    liefKeys.forEach(key => {
      const liefId = key === "none" ? "" : key;
      const lief = D.lieferanten.find(l=>l.id===liefId);
      const items = groups[key].map(bl => ({artikelId: bl.artikelId, menge: bl.menge}));
      D.bestellVorlagen.push({id:uid(), name: lief?.name || "Sonstige", lieferantId: liefId, items});
    });
    save(); render();
    toast(`⭐ ${liefKeys.length} ${LANG==="vi"?"mẫu đã tạo":"Vorlagen erstellt"}`,"s");
  }
}

function applyVorlage(idx) {
  const v = D.bestellVorlagen[idx];
  if (!v) return;
  const stId = STF !== "all" ? STF : (D.standorte[0]?.id||"");
  let added = 0;
  v.items.forEach(it => {
    const exists = D.bestellliste.find(bl => bl.artikelId === it.artikelId && bl.standortId === stId && bl.lieferantId === (v.lieferantId||""));
    if (exists) { exists.menge = it.menge; }
    else { D.bestellliste.push({id:uid(), artikelId: it.artikelId, standortId: stId, menge: it.menge, lieferantId: v.lieferantId||""}); added++; }
  });
  BL_VIEW = "lief";
  save(); render();
  toast(`📥 ${v.name}: ${added} ${LANG==="vi"?"SP đã thêm":"Artikel hinzugefügt"}`,"s");
}

function editVorlage(idx) {
  const isNew = idx < 0;
  const v = isNew ? {id:uid(), name:"", lieferantId:"", items:[]} : JSON.parse(JSON.stringify(D.bestellVorlagen[idx]));
  window._vlForm = v;
  window._vlIdx = idx;

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-xl" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">⭐ ${isNew?(LANG==="vi"?"Tạo mẫu mới":"Neue Vorlage"):(LANG==="vi"?"Chỉnh sửa mẫu":"Vorlage bearbeiten")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  h += `<div class="g2"><div class="fg"><label>${t("c.name")} *</label><input class="inp" id="vl_name" value="${esc(v.name)}" placeholder="${LANG==="vi"?"VD: Wocheneinkauf Asia Food":"z.B. Wocheneinkauf Asia Food"}"></div>`;
  h += `<div class="fg"><label>${t("c.supplier")}</label><select class="sel" id="vl_lief"><option value="">${LANG==="vi"?"Không chỉ định":"Kein bestimmter"}</option>${D.lieferanten.map(l=>`<option value="${l.id}" ${v.lieferantId===l.id?"selected":""}>${esc(l.name)}</option>`).join("")}</select></div></div>`;

  // Items
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin:10px 0 4px">${t("c.article")} (${v.items.length})</div>`;
  h += `<div id="vl_items">`;
  h += renderVlItems(v);
  h += `</div>`;

  // Add article
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin:10px 0 4px">${LANG==="vi"?"Thêm SP":"Artikel hinzufügen"}</div>`;
  h += `<div class="live-search-wrap"><input class="inp" id="vl_search" placeholder="${t("c.search")}..." oninput="vlSearch(this.value)" autocomplete="off"><div id="vl_search_results"></div></div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveVorlage()">${t("c.save")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function renderVlItems(v) {
  if (!v.items.length) return `<div style="text-align:center;padding:12px;color:var(--t3);font-size:11px">${LANG==="vi"?"Chưa có SP":"Keine Artikel"}</div>`;
  let h = "";
  v.items.forEach((it, i) => {
    const a = D.artikel.find(x=>x.id===it.artikelId);
    h += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd)">`;
    h += `<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:11.5px">${esc(artN(a))}</div><div style="font-size:9px;color:var(--t3)">${esc(a?.sku||"")} · ${esc(a?.einheit||"")}</div></div>`;
    h += `<input class="inp" type="number" min="1" value="${it.menge}" onchange="vlSetQty(${i},this.value)" style="width:55px;text-align:center;padding:4px;font-family:var(--m);font-weight:700">`;
    h += `<span style="font-size:10px;color:var(--t3);min-width:25px">${esc(a?.einheit||"")}</span>`;
    h += `<button class="bi dn" onclick="vlRemItem(${i})">✕</button></div>`;
  });
  return h;
}

function vlSearch(q) {
  if(_IME)return;
  const container = document.getElementById("vl_search_results");
  if (!container || q.length < 1) { if(container)container.innerHTML=""; return; }
  const ql = norm(q);
  const v = window._vlForm;
  const existIds = new Set(v.items.map(it=>it.artikelId));
  const results = D.artikel.filter(a => !existIds.has(a.id) && (norm(a.name).includes(ql) || norm(a.name_vi).includes(ql) || norm(a.sku).includes(ql))).slice(0,5);
  let h = `<div class="live-results">`;
  results.forEach(a => {
    h += `<div class="live-item" onmousedown="vlAddItem('${a.id}')"><div style="flex:1"><div style="font-weight:600;font-size:11.5px">${esc(artN(a))}</div><div style="font-size:9px;color:var(--t3)">${esc(a.sku)} · ${esc(a.einheit)}</div></div></div>`;
  });
  if (!results.length) h += `<div style="padding:8px;font-size:10.5px;color:var(--t3)">—</div>`;
  h += `</div>`;
  container.innerHTML = h;
}

function vlAddItem(artId) {
  const v = window._vlForm;
  v.items.push({artikelId: artId, menge: 1});
  document.getElementById("vl_items").innerHTML = renderVlItems(v);
  const si = document.getElementById("vl_search"); if(si){si.value="";} document.getElementById("vl_search_results").innerHTML = "";
}

function vlRemItem(idx) {
  window._vlForm.items.splice(idx, 1);
  document.getElementById("vl_items").innerHTML = renderVlItems(window._vlForm);
}

function vlSetQty(idx, val) {
  window._vlForm.items[idx].menge = Math.max(1, parseInt(val)||1);
}

function saveVorlage() {
  const v = window._vlForm;
  const idx = window._vlIdx;
  v.name = document.getElementById("vl_name")?.value?.trim() || "";
  v.lieferantId = document.getElementById("vl_lief")?.value || "";
  if (!v.name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  if (!v.items.length) { toast(LANG==="vi"?"Thêm ít nhất 1 SP":"Mindestens 1 Artikel","e"); return; }
  if (!D.bestellVorlagen) D.bestellVorlagen = [];
  if (idx < 0) D.bestellVorlagen.push(v);
  else D.bestellVorlagen[idx] = v;
  save(); closeModal(); render();
  toast(`⭐ ${v.name} ✓`,"s");
}

function deleteVorlage(idx) {
  const v = D.bestellVorlagen[idx];
  cConfirm(`${LANG==="vi"?"Xóa mẫu":"Vorlage löschen"} "${v?.name}"?`, () => {
    D.bestellVorlagen.splice(idx, 1);
    save(); render(); toast("✓","i");
  });
}

function submitGroup(liefKey) {
  const items = D.bestellliste.filter(bl => (bl.lieferantId || "none") === liefKey);
  if (!items.length) return;
  const lief = D.lieferanten.find(x=>x.id===liefKey);

  // Build order summary for preview
  const rows = items.map(it => {
    const a = D.artikel.find(x=>x.id===it.artikelId);
    const s = D.standorte.find(x=>x.id===it.standortId);
    const al = a?.lieferanten.find(x=>x.lieferantId===it.lieferantId);
    return { art: a, standort: s, menge: it.menge, einheit: a?.einheit||"", preis: al?.preis||0, artNr: al?.artNr||"", lagerort: a?.lagerort?.[it.standortId]||"" };
  });
  const total = rows.reduce((s,r)=>s+r.preis*r.menge,0);

  // Show export-first dialog
  let h = `<div class="mo-ov" id="submitOrderOv" style="z-index:200"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📨 ${LANG==="vi"?"Đặt hàng":"Bestellung"}: ${esc(lief?.name||"?")}</div><button class="bi" onclick="document.getElementById('submitOrderOv')?.remove()">✕</button></div><div class="mo-b">`;

  // Order summary table
  h += `<div class="tw" style="margin-bottom:10px"><table><thead><tr><th>${t("c.article")}</th><th>${LANG==="vi"?"Mã NCC":"Lief.-Art.Nr."}</th><th>${t("c.location")}</th><th style="text-align:right">${t("c.quantity")}</th>${canP()?`<th style="text-align:right">${t("c.value")}</th>`:""}</tr></thead><tbody>`;
  rows.forEach(r => {
    h += `<tr><td style="font-weight:600">${esc(artN(r.art))}<div style="font-size:9px;color:var(--t3)">${esc(r.art?.sku||"")}</div></td>`;
    h += `<td style="font-family:var(--m);font-size:10px;color:var(--t2)">${esc(r.artNr)}</td>`;
    h += `<td style="font-size:11px">${esc(r.standort?.name||"")}${r.lagerort?`<div style="font-size:9px;color:var(--t3)">📦 ${esc(r.lagerort)}</div>`:""}</td>`;
    h += `<td style="text-align:right;font-family:var(--m);font-weight:600">${r.menge} ${esc(r.einheit)}</td>`;
    if (canP()) h += `<td style="text-align:right;font-family:var(--m)">${fC(r.preis*r.menge)}</td>`;
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;
  if (canP()) h += `<div style="text-align:right;font-family:var(--m);font-weight:700;font-size:15px;margin-bottom:10px">${LANG==="vi"?"Tổng":"Gesamt"}: ${fC(total)}</div>`;

  // Export options
  if (can(U.role,"export")) {
    h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">${LANG==="vi"?"Xuất trước khi đặt":"Vor dem Bestellen exportieren"}</div>`;
    h += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">`;
    h += `<button class="btn btn-o" onclick="exportOrderPDF('${liefKey}')">📄 PDF</button>`;
    h += `<button class="btn btn-o" onclick="exportOrderImage('${liefKey}')">📷 ${LANG==="vi"?"Ảnh":"Bild"}</button>`;
    h += `<button class="btn btn-o" onclick="exportOrderExcel('${liefKey}')">📊 Excel</button>`;
    h += `</div>`;
  }

  h += `<div style="padding:8px 10px;background:var(--yA);border:1px solid rgba(245,158,11,.15);border-radius:6px;font-size:11px;color:var(--yl);margin-bottom:8px">⚠ ${LANG==="vi"?"Sau khi xác nhận, đơn hàng sẽ được chuyển sang Bestellungen":"Nach Bestätigung wird die Bestellung unter Bestellungen angelegt"}</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="document.getElementById('submitOrderOv')?.remove()">${t("c.cancel")}</button><button class="btn btn-g" onclick="doSubmitGroup('${liefKey}')">✓ ${LANG==="vi"?"Xác nhận đặt hàng":"Bestellung aufgeben"}</button></div></div></div>`;

  document.body.insertAdjacentHTML("beforeend", h);
}

function doSubmitGroup(liefKey) {
  if (_actionLock) return;
  _actionLock = true; setTimeout(() => _actionLock = false, 1500);
  const items = D.bestellliste.filter(bl => (bl.lieferantId || "none") === liefKey);
  const lief = D.lieferanten.find(x=>x.id===liefKey);
  const count = items.length;
  items.forEach(it => {
    D.bestellungen.unshift({ id: uid(), artikelId: it.artikelId, lieferantId: it.lieferantId, standortId: it.standortId, menge: it.menge, status: "bestellt", datum: td(), notiz: "", erstelltVon: U.id });
    D.bestellliste = D.bestellliste.filter(x => x.id !== it.id);
  });
  if (D.einstellungen.telegramBenachrichtigung) {
    const lines = items.map(it => { const a = D.artikel.find(x=>x.id===it.artikelId); return `• ${it.menge}× ${artN(a)}`; }).join("\n");
    sendTG("bestellung", `📦 *${LANG==="vi"?"Đặt hàng":"Bestellung"}: ${lief?.name||"?"}*\n${count} Pos.\n\n${lines}`);
  }
  document.getElementById("submitOrderOv")?.remove();
  PAGE = "bestellliste"; // Stay on Bestellliste
  save(); render();
  // Sync bestellungen to Supabase
  items.forEach(it => {
    const b = D.bestellungen.find(x => x.artikelId === it.artikelId && x.status === 'bestellt');
    if (b && typeof sb !== 'undefined') sb.from('bestellungen').upsert({ id: b.id, artikel_id: b.artikelId, lieferant_id: b.lieferantId, standort_id: b.standortId, menge: b.menge, status: b.status, datum: b.datum, erstellt_von: b.erstelltVon }, { onConflict: 'id' }).catch(e => console.error('sbBest:', e));
    if (typeof sbDeleteBestelllisteItem === 'function') sbDeleteBestelllisteItem(it.id).catch(e => console.error('sbDelBL:', e));
  });
  toast(`✓ ${count} ${t("c.article")} → ${lief?.name||""} ${LANG==="vi"?"đã đặt hàng":"bestellt"} (${LANG==="vi"?"xem tại Bestellungen":"siehe Bestellungen"})`, "s");
}

// Order export helpers
function getOrderData(liefKey) {
  const items = D.bestellliste.filter(bl => (bl.lieferantId || "none") === liefKey);
  const lief = D.lieferanten.find(x=>x.id===liefKey);
  return items.map(it => {
    const a = D.artikel.find(x=>x.id===it.artikelId);
    const s = D.standorte.find(x=>x.id===it.standortId);
    const al = a?.lieferanten.find(x=>x.lieferantId===it.lieferantId);
    return { artikel: artN(a), sku: a?.sku||"", artNr: al?.artNr||"", standort: s?.name||"", lagerort: a?.lagerort?.[it.standortId]||"", menge: it.menge, einheit: a?.einheit||"", preis: al?.preis||0, wert: (al?.preis||0)*it.menge, lief: lief?.name||"" };
  });
}

function exportOrderPDF(liefKey) {
  const rows = getOrderData(liefKey);
  const lief = D.lieferanten.find(x=>x.id===liefKey);
  const total = rows.reduce((s,r)=>s+r.wert,0);
  let html = `<html><head><meta charset="utf-8"><title>Bestellung ${lief?.name}</title><style>body{font-family:Helvetica,Arial,sans-serif;font-size:11px;margin:20mm}h1{font-size:18px}h2{font-size:13px;color:#666;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f0f0f0;text-align:left;padding:5px 6px;font-size:10px;border-bottom:2px solid #ccc;text-transform:uppercase}td{padding:4px 6px;border-bottom:1px solid #eee}.r{text-align:right}.mono{font-family:monospace}.total{font-size:14px;font-weight:bold;text-align:right;margin-top:10px}</style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)}</h1><h2>${LANG==="vi"?"Đơn đặt hàng":"Bestellung"}: ${esc(lief?.name||"")}</h2><p>${new Date().toLocaleDateString("de-DE")} · ${rows.length} ${LANG==="vi"?"sản phẩm":"Positionen"}</p>`;
  if (lief) html += `<p style="color:#666">${esc(lief.kontakt||"")} · ${esc(lief.telefon||"")} · ${esc(lief.email||"")}</p>`;
  html += `<table><thead><tr><th>Artikel</th><th>Lief.-Art.Nr.</th><th>Standort</th><th>Lagerort</th><th class="r">Menge</th><th class="r">EK</th><th class="r">Wert</th></tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr><td>${esc(r.artikel)}<br><span class="mono" style="font-size:9px;color:#999">${esc(r.sku)}</span></td><td class="mono">${esc(r.artNr)}</td><td>${esc(r.standort)}</td><td>${esc(r.lagerort)}</td><td class="r mono">${r.menge} ${esc(r.einheit)}</td><td class="r mono">${r.preis.toFixed(2)} €</td><td class="r mono" style="font-weight:bold">${r.wert.toFixed(2)} €</td></tr>`;
  });
  html += `</tbody></table><div class="total">Gesamt: ${total.toFixed(2)} €</div></body></html>`;
  openPrintHTML(html);
}

function exportOrderImage(liefKey) {
  const rows = getOrderData(liefKey);
  const lief = D.lieferanten.find(x=>x.id===liefKey);
  const total = rows.reduce((s,r)=>s+r.wert,0);
  const W = 420, pad = 20, lineH = 20;
  const H = pad + 70 + rows.length * lineH + 60 + pad;
  const canvas = document.createElement("canvas");
  canvas.width = W*2; canvas.height = H*2;
  canvas.style.width = W+"px"; canvas.style.height = H+"px";
  const ctx = canvas.getContext("2d");
  ctx.scale(2,2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0,0,W,H);

  let y = pad;
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 15px Helvetica,sans-serif";
  ctx.fillText(D.einstellungen.firmenname, pad, y+15); y+=22;
  ctx.font = "bold 13px Helvetica,sans-serif";
  ctx.fillStyle = "#3B82F6";
  ctx.fillText(`${LANG==="vi"?"Đơn hàng":"Bestellung"}: ${lief?.name||""}`, pad, y+13); y+=20;
  ctx.font = "500 10px Helvetica,sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText(`${new Date().toLocaleDateString("de-DE")} · ${rows.length} Pos.`, pad, y+10); y+=20;

  ctx.strokeStyle = "#E2E8F0"; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
  ctx.setLineDash([]); y+=12;

  ctx.font = "bold 9px Helvetica,sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("MENGE",pad,y+9); ctx.fillText("ARTIKEL",pad+60,y+9);
  if (canP()) ctx.fillText("WERT",W-pad-40,y+9);
  y+=16;

  ctx.font = "500 11px Helvetica,sans-serif";
  rows.forEach(r => {
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px 'Courier New',monospace";
    ctx.fillText(`${r.menge} ${r.einheit}`, pad, y+12);
    ctx.font = "500 11px Helvetica,sans-serif";
    ctx.fillText(r.artikel, pad+60, y+12);
    if (canP()) { ctx.fillStyle="#64748B"; ctx.fillText(r.wert.toFixed(2)+"€", W-pad-45, y+12); }
    y += lineH;
  });

  y+=8;
  ctx.strokeStyle = "#E2E8F0"; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
  ctx.setLineDash([]); y+=12;

  if (canP()) {
    ctx.font = "bold 14px Helvetica,sans-serif";
    ctx.fillStyle = "#1E293B";
    ctx.textAlign = "right";
    ctx.fillText(`Gesamt: ${total.toFixed(2)} €`, W-pad, y+14);
    ctx.textAlign = "left";
  }

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `Bestellung_${(lief?.name||"").replace(/\s/g,"_")}_${td()}.png`;
  a.click();
  toast(`📷 ${LANG==="vi"?"Ảnh đã lưu":"Bild gespeichert"}`,"s");
}

function exportOrderExcel(liefKey) {
  const rows = getOrderData(liefKey);
  const lief = D.lieferanten.find(x=>x.id===liefKey);
  const hdr = ["Artikel","SKU","Lief.-Art.Nr.","Standort","Lagerort","Menge","Einheit","EK","Wert"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="hd"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/></Style></Styles><Worksheet ss:Name="'+esc(lief?.name||"Bestellung")+'"><Table>';
  xml += "<Row>" + hdr.map(h=>`<Cell ss:StyleID="hd"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("") + "</Row>";
  rows.forEach(r => {
    xml += `<Row><Cell><Data ss:Type="String">${esc(r.artikel)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.sku)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.artNr)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.standort)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.lagerort)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.menge}</Data></Cell><Cell><Data ss:Type="String">${esc(r.einheit)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.preis}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.wert}</Data></Cell></Row>`;
  });
  xml += "</Table></Worksheet></Workbook>";
  dlFile(xml, `Bestellung_${(lief?.name||"").replace(/\s/g,"_")}_${td()}.xls`, "application/vnd.ms-excel");
  toast(`📊 Excel ✓`,"s");
}

function addCriticalToBestellliste() {
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const sids = STF !== "all" ? [STF] : vS.map(s=>s.id);
  let added = 0;
  D.artikel.forEach(a => {
    sids.forEach(sid => {
      const ist = a.istBestand[sid]||0, min = a.mindestmenge[sid]||0, soll = a.sollBestand[sid]||0;
      if (min > 0 && ist <= min) {
        const exists = D.bestellliste.find(bl=>bl.artikelId===a.id&&bl.standortId===sid);
        const alreadyOrdered = D.bestellungen.some(b=>b.artikelId===a.id&&b.standortId===sid&&b.status==="bestellt");
        if (!exists && !alreadyOrdered) {
          const bestL = a.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]) : null;
          D.bestellliste.push({id:uid(),artikelId:a.id,standortId:sid,menge:Math.max(1,soll-ist),lieferantId:bestL?.lieferantId||"",auto:true});
          added++;
        }
      }
    });
  });
  save(); render();
  toast(`⚠ ${added} ${LANG==="vi"?"SP thiếu đã thêm":"kritische Artikel hinzugefügt"}`,"s");
}

function clearBestellliste() { cConfirm(LANG==="vi"?"Xóa toàn bộ?":"Gesamte Liste leeren?", () => { D.bestellliste = []; save(); render(); if (typeof sbClearBestellliste === 'function') sbClearBestellliste().catch(e => console.error('sbClrBL:', e)); }); }
function remBestellliste(id) { D.bestellliste = D.bestellliste.filter(x=>x.id!==id); save(); render(); if (typeof sbDeleteBestelllisteItem === 'function') sbDeleteBestelllisteItem(id).catch(e => console.error('sbDelBL:', e)); }

// ═══ BESTELLLISTE: Quick-Add from Lieferant ═══
function blQuickLiefChanged() {
  const liefId = document.getElementById("blQuickLief")?.value;
  const panel = document.getElementById("blQuickPanel");
  const info = document.getElementById("blQuickInfo");
  if (!liefId || !panel) { if(panel)panel.innerHTML=""; if(info)info.textContent=""; return; }

  const l = D.lieferanten.find(x=>x.id===liefId);
  const arts = D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===liefId));
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const stId = STF !== "all" ? STF : vS[0]?.id || "";

  if (info) info.textContent = `${arts.length} ${LANG==="vi"?"sản phẩm":"Artikel"}`;

  let h = `<div class="cd" style="margin-bottom:12px;border-left:3px solid var(--ac);padding:10px">`;
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  h += `<div style="font-weight:700;font-size:12px">${esc(l?.name||"")} — ${LANG==="vi"?"Thêm nhanh":"Schnell hinzufügen"}</div>`;
  h += `<div style="display:flex;gap:4px"><button class="btn btn-o btn-sm" onclick="blQuickFill('${liefId}','auto')">${LANG==="vi"?"Auto (Soll−Ist)":"Auto"}</button><button class="btn btn-o btn-sm" onclick="blQuickFill('${liefId}','crit')">${LANG==="vi"?"Chỉ thiếu":"Nur kritische"}</button><button class="btn btn-g btn-sm" onclick="blQuickAddAll('${liefId}')">${LANG==="vi"?"Thêm vào DS":"Zur Liste"} →</button></div>`;
  h += `</div>`;

  if (!arts.length) { h += `<div style="color:var(--t3);font-size:11px;padding:8px;text-align:center">${LANG==="vi"?"Chưa có SP nào":"Keine Artikel"}</div>`; }
  else {
    arts.forEach(a => {
      const al = a.lieferanten.find(x=>x.lieferantId===liefId);
      const ist = a.istBestand[stId]||0, soll = a.sollBestand[stId]||0, min = a.mindestmenge[stId]||0;
      const isCrit = min > 0 && ist <= min;
      const alreadyInList = D.bestellliste.some(bl=>bl.artikelId===a.id&&bl.standortId===stId);
      const empf = Math.max(0, soll-ist);
      h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--bd);${isCrit?"background:var(--rA);margin:0 -4px;padding:4px":""}" class="blq-row">`;
      h += `<div class="th" style="width:26px;height:26px">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div>`;
      h += `<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:11.5px">${esc(artN(a))}${alreadyInList?` <span style="font-size:9px;color:var(--ac)">(${LANG==="vi"?"đã có":"in Liste"})</span>`:""}</div>`;
      h += `<div style="font-size:9.5px;color:var(--t2)">${ist}/${soll} ${esc(a.einheit)} ${isCrit?`<span style="color:var(--rd);font-weight:600">⚠</span>`:""} ${canP()&&al?`· ${al.preis.toFixed(2)}€`:""}</div></div>`;
      h += `<input class="inp blq-qty" type="number" min="0" value="${alreadyInList?0:empf}" data-art="${a.id}" data-lief="${liefId}" style="width:50px;text-align:center;padding:4px;font-family:var(--m);font-size:13px;font-weight:700;border:2px solid ${empf>0&&!alreadyInList?"var(--ac)":"var(--bd)"}">`;
      h += `<span style="font-size:9px;color:var(--t3);min-width:20px">${esc(a.einheit)}</span>`;
      h += `</div>`;
    });
  }
  h += `</div>`;
  panel.innerHTML = h;
}

function blQuickFill(liefId, mode) {
  const stId = STF !== "all" ? STF : (U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id)))[0]?.id;
  document.querySelectorAll(".blq-qty").forEach(inp => {
    const artId = inp.dataset.art;
    const a = D.artikel.find(x=>x.id===artId);
    if (!a) return;
    const ist = a.istBestand[stId]||0, soll = a.sollBestand[stId]||0, min = a.mindestmenge[stId]||0;
    if (mode === "crit") inp.value = (min>0&&ist<=min) ? Math.max(1,soll-ist) : 0;
    else inp.value = Math.max(0, soll-ist);
    inp.style.borderColor = parseInt(inp.value) > 0 ? "var(--ac)" : "var(--bd)";
  });
}

function blQuickAddAll(liefId) {
  const stId = STF !== "all" ? STF : (U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id)))[0]?.id;
  let added = 0;
  document.querySelectorAll(".blq-qty").forEach(inp => {
    const artId = inp.dataset.art;
    const qty = parseInt(inp.value) || 0;
    if (qty <= 0) return;
    const exists = D.bestellliste.find(bl=>bl.artikelId===artId&&bl.standortId===stId&&bl.lieferantId===liefId);
    if (exists) { exists.menge += qty; }
    else { D.bestellliste.push({id:uid(),artikelId:artId,standortId:stId,menge:qty,lieferantId:liefId}); }
    added++;
  });
  if (!added) { toast(LANG==="vi"?"Chưa nhập số lượng":"Keine Mengen eingegeben","e"); return; }
  save(); render();
  toast(`${added} ${LANG==="vi"?"SP đã thêm":"Artikel hinzugefügt"} (${D.lieferanten.find(x=>x.id===liefId)?.name||""})`,"s");
}

// ═══ BESTELLUNGEN ═══
let BEST_FILTER = "all";
let BEST_SORT = "datum";
let BEST_SORT_DIR = "desc";
let BEST_SEARCH = "";
function bestSort(col) { if (BEST_SORT===col) BEST_SORT_DIR=BEST_SORT_DIR==="asc"?"desc":"asc"; else { BEST_SORT=col; BEST_SORT_DIR=col==="datum"?"desc":"asc"; } render(); }
function bestSortIc(col) { return BEST_SORT===col?(BEST_SORT_DIR==="asc"?"▲":"▼"):"⇅"; }
