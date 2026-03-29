// ═══ ARTIKEL (Article Management) ═══
function renderArtikel(vS, aS) {
  const stC = vS.filter(s=>!aS||s.id===aS);
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.articles")}</div><div class="mn-a">`;
  h += `<div class="mode-tabs"><span class="mode-tab ${ART_VIEW==="art"?"on":""}" onclick="ART_VIEW='art';render()">📋 ${LANG==="vi"?"Theo SP":"Nach Artikel"}</span><span class="mode-tab ${ART_VIEW==="kat"?"on":""}" onclick="ART_VIEW='kat';render()">🏷 ${LANG==="vi"?"Theo DM":"Nach Kategorie"}</span><span class="mode-tab ${ART_VIEW==="lager"?"on":""}" onclick="ART_VIEW='lager';render()">📦 ${LANG==="vi"?"Theo kho":"Nach Lagerort"}</span><span class="mode-tab ${ART_VIEW==="lief"?"on":""}" onclick="ART_VIEW='lief';render()">🚛 ${LANG==="vi"?"Theo NCC":"Nach Lieferant"}</span></div>`;
  if (can(U.role,"export")) h += `<button class="btn btn-o btn-sm" onclick="exportExcel()">⬇ Excel</button><button class="btn btn-o btn-sm" onclick="exportPDF()">⬇ PDF</button>`;
  h += `${can(U.role,"artikel")?`<button class="btn btn-p" onclick="editArtikel()">+ ${t("c.new")}</button>`:""}`;
  h += `</div></div><div class="mn-c">`;

  h += `<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap"><div class="srch" style="flex:1;min-width:150px;position:relative"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" placeholder="${t("c.search")}" id="artSearch" value="${esc(ART_SEARCH)}" oninput="artSearchInput(this)" style="padding-right:${ART_SEARCH?'28px':'9px'}">${ART_SEARCH?`<button class="bi" onclick="artSearchClear()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;

  const q = norm(ART_SEARCH);
  const fil = D.artikel.filter(a => {
    if (q && !norm(a.name).includes(q) && !norm(a.name_vi).includes(q) && !norm(a.sku).includes(q) && !(a.barcodes||[]).some(bc=>bc.includes(q))) return false;
    return true;
  });

  if (q) {
    h += `<div style="font-size:11px;color:var(--t2);margin-bottom:8px">${fil.length} ${LANG==="vi"?"kết quả cho":"Ergebnis(se) für"} „${esc(ART_SEARCH)}"${fil.length!==D.artikel.length?` <span style="color:var(--t3)">(${LANG==="vi"?"trong tổng":"von"} ${D.artikel.length})</span>`:""}</div>`;
    if (!fil.length && /^\d{8,}$/.test(ART_SEARCH.trim()) && can(U.role,"artikel")) {
      h += `<div style="text-align:center;padding:16px"><div style="margin-bottom:8px;color:var(--t3)">${LANG==="vi"?"Mã vạch chưa có sản phẩm":"Barcode nicht gefunden"}: <b>${esc(ART_SEARCH.trim())}</b></div><button class="btn btn-p" onclick="editArtikelWithBarcode('${esc(ART_SEARCH.trim())}')">${LANG==="vi"?"+ Tạo sản phẩm mới":"+ Neuen Artikel anlegen"}</button></div>`;
    }
  }

  if (ART_VIEW === "art") h += renderArtikelTable(fil, stC, aS);
  else if (ART_VIEW === "kat") h += renderArtikelByKat(fil, stC, aS);
  else if (ART_VIEW === "lager") h += renderArtikelByLagerort(fil, stC, aS);
  else h += renderArtikelByLief(fil, stC, aS);

  h += `</div>`;
  return h;
}

function renderArtikelTable(fil, stC, aS) {
  const sorted = sortArtikel(fil, stC);
  const thS = (col, label) => `<th style="cursor:pointer" onclick="artSort('${col}')"><span style="display:inline-flex;align-items:center;gap:3px">${label} <span class="si" style="${ART_SORT===col?"color:var(--ac);opacity:1":"opacity:.4"};font-size:9px">${sortIc(col)}</span></span></th>`;

  let h = `<div class="tw"><table><thead><tr><th style="width:34px"></th>${thS("name",t("c.article"))}<th class="mob-hide">${t("c.categories")}</th><th class="mob-hide">${t("c.storageloc")}</th>`;
  stC.forEach(s => { h += `${thS("stock",esc(s.name))}`; });
  h += `<th class="mob-hide">${t("a.packunit")}</th>${canP()?thS("ek",t("a.bestprice")):""}${can(U.role,"artikel")?`<th></th>`:""}</tr></thead><tbody>`;

  sorted.forEach(a => {
    const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l=>l.preis)) : null;
    const locStr = aS ? (a.lagerort?.[aS]||"—") : stC.map(s=>a.lagerort?.[s.id]).filter(Boolean).join(" | ") || "—";
    h += `<tr class="art-row" onclick="showArtikelDetail('${a.id}')">`;
    h += `<td><div class="th">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td>`;
    h += `<td><div style="font-weight:600">${esc(artN(a))}</div>`;
    if (LANG === "de" && a.name_vi) h += `<div style="font-size:10px;color:var(--t3)">${esc(a.name_vi)}</div>`;
    if (LANG === "vi") h += `<div style="font-size:10px;color:var(--t3)">${esc(a.name)}</div>`;
    h += `<div style="font-size:9.5px;color:var(--t3);font-family:var(--m)">${esc(a.sku)}</div></td>`;
    h += `<td class="mob-hide">${a.kategorien.map(kId=>{const k=D.kategorien.find(x=>x.id===kId);return k?`<span class="kt" style="background:${k.farbe}22;color:${k.farbe}">${esc(katN(k))}</span>`:""}).join("")}</td>`;
    h += `<td class="mob-hide"><span class="loc-tag">${esc(locStr)}</span></td>`;
    stC.forEach(s => {
      const ist=a.istBestand[s.id]||0,soll=a.sollBestand[s.id]||0,min=a.mindestmenge[s.id]||0;
      const conv = formatUnitConv(ist, a);
      h += `<td style="min-width:100px">${stkBar(ist,soll,min,a.einheit)}${conv?`<div class="unit-conv">= ${esc(conv)}</div>`:""}</td>`;
    });
    h += `<td class="mob-hide" style="font-size:10.5px;color:var(--t2)">${a.packSize>1?`${a.packSize} ${esc(a.einheit)}/${esc(a.packUnit||"Geb.")}`:"—"}</td>`;
    if (canP()) h += `<td style="font-family:var(--m);font-weight:600">${bp!==null?bp.toFixed(2)+"€":"—"}</td>`;
    if (can(U.role,"artikel")) h += `<td onclick="event.stopPropagation()"><button class="bi" onclick="editArtikel('${a.id}')">✎</button> <button class="bi dn" onclick="delArtikel('${a.id}')">🗑</button></td>`;
    h += `</tr>`;
  });
  if (!sorted.length) h += `<tr><td colspan="99" style="text-align:center;color:var(--t3);padding:18px">—</td></tr>`;
  h += `</tbody></table></div>`;
  return h;
}

// ═══ ARTIKEL NACH KATEGORIE ═══
function renderArtikelByKat(fil, stC, aS) {
  const groups = {};
  const noKat = [];
  fil.forEach(a => {
    if (!a.kategorien.length) { noKat.push(a); return; }
    a.kategorien.forEach(kId => {
      if (!groups[kId]) groups[kId] = { kat: D.kategorien.find(x=>x.id===kId), items: [] };
      groups[kId].items.push(a);
    });
  });
  // Sort handled by sortArtikel in table render

  let h = "";
  // Sort groups by category name
  const sortedKeys = Object.keys(groups).sort((a,b) => katN(groups[a].kat).localeCompare(katN(groups[b].kat)));

  for (const kId of sortedKeys) {
    const g = groups[kId];
    const k = g.kat;
    const totalStock = g.items.reduce((s,a) => s + stC.reduce((s2,st) => s2 + (a.istBestand[st.id]||0), 0), 0);
    const critCount = g.items.filter(a => stC.some(st => (a.istBestand[st.id]||0) <= (a.mindestmenge[st.id]||0))).length;

    h += `<div class="cd" style="margin-bottom:10px;border-left:4px solid ${k?.farbe||"var(--t3)"}">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
    h += `<div><div style="font-weight:700;font-size:14px;color:${k?.farbe||"var(--tx)"}">${esc(katN(k))}</div>`;
    if (LANG==="de" && k?.name_vi) h += `<span style="font-size:10.5px;color:var(--t3)">🇻🇳 ${esc(k.name_vi)}</span>`;
    if (LANG==="vi" && k?.name) h += `<span style="font-size:10.5px;color:var(--t3)">🇩🇪 ${esc(k.name)}</span>`;
    h += `</div>`;
    h += `<div style="display:flex;gap:4px;align-items:center"><span class="bp" style="background:${k?.farbe||"var(--t3)"}22;color:${k?.farbe||"var(--t3)"}">${g.items.length} ${t("c.article")}</span>`;
    if (critCount) h += `<span class="bp" style="background:var(--rA);color:var(--rd)">${critCount} ${LANG==="vi"?"thiếu":"kritisch"}</span>`;
    h += `</div></div>`;

    // Table within group — sortable headers
    const gthS = (col, label) => `<th style="background:transparent;padding:4px 8px;cursor:pointer" onclick="artSort('${col}')"><span style="display:inline-flex;align-items:center;gap:2px">${label} <span style="${ART_SORT===col?"color:var(--ac);opacity:1":"opacity:.3"};font-size:8px">${sortIc(col)}</span></span></th>`;
    h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
    h += `<th style="background:transparent;padding:4px 8px;width:34px"></th>`;
    h += gthS("name", t("c.article"));
    h += `<th style="background:transparent;padding:4px 8px">${t("c.storageloc")}</th>`;
    stC.forEach(s => { h += gthS("stock", esc(s.name)); });
    h += `${canP()?gthS("ek", t("a.bestprice")):""}`;
    h += `${can(U.role,"artikel")?`<th style="background:transparent;padding:4px 8px;width:50px"></th>`:""}</tr></thead><tbody>`;

    sortArtikel(g.items, stC).forEach(a => {
      const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l=>l.preis)) : null;
      const locStr = aS ? (a.lagerort?.[aS]||"—") : stC.map(s=>a.lagerort?.[s.id]).filter(Boolean).join(" | ") || "—";
      h += `<tr class="art-row" style="border-bottom:1px solid var(--bd)" onclick="showArtikelDetail('${a.id}')">`;
      h += `<td style="padding:5px 8px"><div class="th">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td>`;
      h += `<td style="padding:5px 8px"><div style="font-weight:600">${esc(artN(a))}</div><div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a.sku)}</div></td>`;
      h += `<td style="padding:5px 8px"><span class="loc-tag">${esc(locStr)}</span></td>`;
      stC.forEach(s => {
        const ist=a.istBestand[s.id]||0,soll=a.sollBestand[s.id]||0,min=a.mindestmenge[s.id]||0;
        h += `<td style="padding:5px 8px;min-width:90px">${stkBar(ist,soll,min,a.einheit)}</td>`;
      });
      if (canP()) h += `<td style="padding:5px 8px;text-align:right;font-family:var(--m);font-weight:600">${bp!==null?bp.toFixed(2)+"€":"—"}</td>`;
      if (can(U.role,"artikel")) h += `<td style="padding:5px 8px" onclick="event.stopPropagation()"><button class="bi" onclick="editArtikel('${a.id}')">✎</button></td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;
  }

  // Articles without category
  if (noKat.length) {
    h += `<div class="cd" style="margin-bottom:10px;border-left:4px solid var(--t3)">`;
    h += `<div style="font-weight:700;font-size:13px;color:var(--t3);margin-bottom:6px">${LANG==="vi"?"Chưa phân loại":"Ohne Kategorie"} (${noKat.length})</div>`;
    noKat.forEach(a => {
      h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--bd);cursor:pointer" onclick="showArtikelDetail('${a.id}')"><span style="font-weight:600;font-size:12px">${esc(artN(a))}</span><span style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a.sku)}</span></div>`;
    });
    h += `</div>`;
  }

  if (!fil.length) h += `<div style="text-align:center;padding:18px;color:var(--t3)">—</div>`;
  return h;
}

// ═══ ARTIKEL NACH LAGERORT ═══
function renderArtikelByLagerort(fil, stC, aS) {
  const stId = aS || stC[0]?.id || "";
  const groups = {};
  const noLager = [];
  fil.forEach(a => {
    const locs = aS ? [aS] : stC.map(s=>s.id);
    let hasLager = false;
    locs.forEach(sid => {
      const loc = a.lagerort?.[sid] || "";
      if (loc) {
        const key = `${sid}::${loc}`;
        if (!groups[key]) groups[key] = { loc, standort: D.standorte.find(s=>s.id===sid), items: [] };
        groups[key].items.push({art: a, sid});
        hasLager = true;
      }
    });
    if (!hasLager) noLager.push(a);
  });

  // Sort groups by standort then lagerort
  const sortedKeys = Object.keys(groups).sort((a,b) => {
    const ga = groups[a], gb = groups[b];
    const sv = (ga.standort?.name||"").localeCompare(gb.standort?.name||"");
    return sv !== 0 ? sv : ga.loc.localeCompare(gb.loc);
  });

  let h = "";
  sortedKeys.forEach(key => {
    const g = groups[key];
    const critCount = g.items.filter(it => {
      const ist = it.art.istBestand[it.sid]||0, min = it.art.mindestmenge[it.sid]||0;
      return min > 0 && ist <= min;
    }).length;

    h += `<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--ac)">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
    h += `<div><div style="font-weight:700;font-size:13px">📦 ${esc(g.loc)}</div>`;
    if (!aS) h += `<div style="font-size:10px;color:var(--t3)">📍 ${esc(g.standort?.name||"")}</div>`;
    h += `</div><div style="display:flex;gap:4px"><span class="bp" style="background:var(--aA);color:var(--ac)">${g.items.length} ${t("c.article")}</span>`;
    if (critCount) h += `<span class="bp" style="background:var(--rA);color:var(--rd)">⚠ ${critCount}</span>`;
    h += `</div></div>`;

    g.items.forEach(it => {
      const a = it.art;
      const ist = a.istBestand[it.sid]||0, soll = a.sollBestand[it.sid]||0, min = a.mindestmenge[it.sid]||0;
      const st = stkSt(ist, soll, min);
      h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--bd);cursor:pointer" onclick="showArtikelDetail('${a.id}')">`;
      h += `<div class="th" style="width:28px;height:28px;flex-shrink:0">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div>`;
      h += `<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12px">${esc(artN(a))}</div><div style="font-size:9px;color:var(--t3)">${esc(a.sku)} · ${esc(a.einheit)}</div></div>`;
      h += `<div style="text-align:right;flex-shrink:0"><div style="font-family:var(--m);font-weight:700;font-size:13px;color:${st.c}">${ist}/${soll} ${esc(a.einheit)}</div>`;
      if (min > 0 && ist <= min) h += `<div style="font-size:9px;color:var(--rd)">⚠ min ${min}</div>`;
      h += `</div></div>`;
    });
    h += `</div>`;
  });

  // No Lagerort group
  if (noLager.length) {
    h += `<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--t3)">`;
    h += `<div style="font-weight:700;font-size:13px;color:var(--t3);margin-bottom:6px">— ${LANG==="vi"?"Chưa gán vị trí":"Ohne Lagerort"} (${noLager.length})</div>`;
    noLager.forEach(a => {
      h += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-top:1px solid var(--bd);cursor:pointer" onclick="showArtikelDetail('${a.id}')">`;
      h += `<div style="flex:1;font-size:12px;font-weight:600">${esc(artN(a))}</div>`;
      h += `<span style="font-size:10px;color:var(--t3)">${esc(a.sku)}</span></div>`;
    });
    h += `</div>`;
  }

  if (!sortedKeys.length && !noLager.length) h += `<div style="text-align:center;padding:18px;color:var(--t3)">—</div>`;
  return h;
}

function renderArtikelByLief(fil, stC, aS) {
  // Group by supplier
  const groups = {};
  const noLief = [];
  fil.forEach(a => {
    if (!a.lieferanten.length) { noLief.push(a); return; }
    a.lieferanten.forEach(al => {
      if (!groups[al.lieferantId]) groups[al.lieferantId] = { lief: D.lieferanten.find(x=>x.id===al.lieferantId), items: [] };
      groups[al.lieferantId].items.push({ art: a, preis: al.preis });
    });
  });
  // Sort handled by sortable headers in table render

  let h = "";
  for (const [liefId, g] of Object.entries(groups)) {
    const nd = g.lief ? nextDelivery(g.lief) : null;
    const dl = dayL();
    h += `<div class="cd" style="margin-bottom:12px;border-left:3px solid ${g.lief ? "var(--ac)" : "var(--t3)"}">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">`;
    h += `<div><div style="font-weight:700;font-size:14px">${esc(g.lief?.name || "?")}</div>`;
    if (g.lief) {
      h += `<div style="font-size:10.5px;color:var(--t2);margin-top:1px">${esc(g.lief.kontakt||"")} · ${esc(g.lief.telefon||"")} · ${esc(g.lief.email||"")}</div>`;
      if (nd) h += `<div style="font-size:10.5px;color:var(--gn);font-weight:600;margin-top:2px">📅 ${nd}</div>`;
      if (g.lief.liefertage?.length) h += `<div style="margin-top:2px;display:flex;gap:1px">${WDAYS.map((d,i)=>`<span class="day-tag ${g.lief.liefertage?.includes(d)?"on":""}">${dl[i]}</span>`).join("")}</div>`;
    }
    h += `</div><div style="text-align:right"><span class="bp" style="background:var(--aA);color:var(--ac)">${g.items.length} ${t("c.article")}</span></div></div>`;

    const lthS = (col, label) => `<th style="background:transparent;padding:4px 8px;cursor:pointer" onclick="artSort('${col}')"><span style="display:inline-flex;align-items:center;gap:2px">${label} <span style="${ART_SORT===col?"color:var(--ac);opacity:1":"opacity:.3"};font-size:8px">${sortIc(col)}</span></span></th>`;
    h += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="background:transparent;padding:4px 8px;width:34px"></th>${lthS("name",t("c.article"))}`;
    stC.forEach(s => { h += lthS("stock",esc(s.name)); });
    h += `${canP()?lthS("ek",LANG==="vi"?"Giá so sánh":"Preisvergleich"):""}`;
    h += `${can(U.role,"artikel")?`<th style="background:transparent;padding:4px 8px;width:50px"></th>`:""}</tr></thead><tbody>`;

    // Sort items within group
    const sortedItems = [...g.items].sort((a,b) => {
      let v = 0; const sId = stC[0]?.id||"";
      if (ART_SORT==="name") v = artN(a.art).localeCompare(artN(b.art));
      else if (ART_SORT==="sku") v = (a.art.sku||"").localeCompare(b.art.sku||"");
      else if (ART_SORT==="stock") v = (a.art.istBestand[sId]||0) - (b.art.istBestand[sId]||0);
      else if (ART_SORT==="ek") v = a.preis - b.preis;
      else v = artN(a.art).localeCompare(artN(b.art));
      return ART_SORT_DIR==="desc" ? -v : v;
    });

    sortedItems.forEach(({ art: a, preis }) => {
      // Calculate price comparison
      const allPrices = a.lieferanten.map(al => ({
        liefId: al.lieferantId,
        lief: D.lieferanten.find(x=>x.id===al.lieferantId),
        preis: al.preis,
      }));
      const bestPreis = Math.min(...allPrices.map(p=>p.preis));
      const isBest = preis === bestPreis;
      const hasMultiple = allPrices.length > 1;
      const rowId = `pc_${liefId}_${a.id}`;

      h += `<tr class="art-row" style="border-bottom:${hasMultiple?'none':'1px solid var(--bd)'}" onclick="showArtikelDetail('${a.id}')">`;
      h += `<td style="padding:5px 8px"><div class="th">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td>`;
      h += `<td style="padding:5px 8px"><div style="font-weight:600">${esc(artN(a))}</div><div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a.sku)}</div></td>`;
      stC.forEach(s => {
        const ist=a.istBestand[s.id]||0,soll=a.sollBestand[s.id]||0,min=a.mindestmenge[s.id]||0;
        h += `<td style="padding:5px 8px;min-width:90px">${stkBar(ist,soll,min,a.einheit)}</td>`;
      });

      // Price cell with comparison toggle
      if (canP()) {
      h += `<td style="padding:5px 8px;text-align:right" onclick="event.stopPropagation()">`;
      h += `<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">`;
      h += `<span style="font-family:var(--m);font-weight:700;font-size:13px;color:${isBest?"var(--gn)":"var(--rd)"}">${preis.toFixed(2)} €</span>`;
      h += `<span style="font-size:9.5px;color:var(--t3)">/${esc(a.einheit)}</span>`;
      if (isBest && hasMultiple) h += `<span style="font-size:9px;padding:1px 4px;background:var(--gA);color:var(--gn);border-radius:3px;font-weight:700">${LANG==="vi"?"TỐT":"BEST"}</span>`;
      if (hasMultiple) h += `<button class="bi" onclick="togglePriceCompare('${rowId}')" style="font-size:10px;padding:2px 4px" title="${LANG==="vi"?"So sánh giá":"Preisvergleich"}">▾</button>`;
      h += `</div>`;
      if (hasMultiple) {
        h += `<div id="${rowId}" style="display:none;margin-top:4px;text-align:right">`;
        const sorted = [...allPrices].sort((a,b) => a.preis - b.preis);
        sorted.forEach((p, idx) => {
          const isThis = p.liefId === liefId;
          const isBestP = p.preis === bestPreis;
          const diff = preis > 0 ? ((p.preis - bestPreis) / bestPreis * 100) : 0;
          h += `<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:2px 0;${idx < sorted.length-1 ? "border-bottom:1px dashed var(--bd)":""}">`;
          h += `<span style="font-size:10px;color:${isThis?"var(--ac)":"var(--t2)"};font-weight:${isThis?"700":"400"};max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.lief?.name||"?")}</span>`;
          h += `<span style="font-family:var(--m);font-size:12px;font-weight:700;color:${isBestP?"var(--gn)":"var(--rd)"}">${p.preis.toFixed(2)} €</span>`;
          if (isBestP) h += `<span style="font-size:8px;padding:0 3px;background:var(--gA);color:var(--gn);border-radius:2px;font-weight:700">✓</span>`;
          else h += `<span style="font-size:8px;color:var(--rd);font-weight:600">+${diff.toFixed(0)}%</span>`;
          h += `</div>`;
        });
        h += `</div>`;
      }
      h += `</td>`;
      } // end canP

      if (can(U.role,"artikel")) h += `<td style="padding:5px 8px" onclick="event.stopPropagation()"><button class="bi" onclick="editArtikel('${a.id}')">✎</button></td>`;
      h += `</tr>`;

      // Expand row for price comparison
      if (canP() && hasMultiple) {
        h += `<tr id="${rowId}_row" style="display:none;border-bottom:1px solid var(--bd)"><td colspan="${3 + stC.length + (can(U.role,"artikel")?2:1)}" style="padding:0 8px 6px">`;
        h += `<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">`;
        const sorted2 = [...allPrices].sort((a,b) => a.preis - b.preis);
        sorted2.forEach(p => {
          const isBestP = p.preis === bestPreis;
          const isThis = p.liefId === liefId;
          const diff = bestPreis > 0 ? ((p.preis - bestPreis) / bestPreis * 100) : 0;
          h += `<div style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:${isBestP?"var(--gA)":"var(--rA)"};border:1px solid ${isBestP?"rgba(16,185,129,.2)":"rgba(239,68,68,.15)"};border-radius:6px;${isThis?"outline:2px solid var(--ac);outline-offset:-1px":""}">`;
          h += `<span style="font-size:10.5px;font-weight:${isThis?"700":"500"};color:${isThis?"var(--ac)":"var(--t2)"}">${esc(p.lief?.name||"?")}</span>`;
          h += `<span style="font-family:var(--m);font-weight:700;font-size:13px;color:${isBestP?"var(--gn)":"var(--rd)"}">${p.preis.toFixed(2)} €</span>`;
          if (isBestP) h += `<span style="font-size:8px;padding:1px 4px;background:var(--gn);color:#fff;border-radius:3px;font-weight:700">${LANG==="vi"?"TỐT NHẤT":"BESTER PREIS"}</span>`;
          else h += `<span style="font-size:9px;color:var(--rd);font-weight:600">+${diff.toFixed(1)}%</span>`;
          h += `</div>`;
        });
        h += `</div></td></tr>`;
      }
    });
    h += `</tbody></table></div>`;
  }

  // Articles without supplier
  if (noLief.length) {
    h += `<div class="cd" style="margin-bottom:12px;border-left:3px solid var(--t3)">`;
    h += `<div style="font-weight:700;font-size:13px;color:var(--t3);margin-bottom:6px">${LANG==="vi"?"Chưa có NCC":"Ohne Lieferant"} (${noLief.length})</div>`;
    noLief.forEach(a => {
      h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--bd);cursor:pointer" onclick="showArtikelDetail('${a.id}')"><span style="font-weight:600;font-size:12px">${esc(artN(a))}</span><span style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a.sku)}</span></div>`;
    });
    h += `</div>`;
  }

  if (!fil.length) h += `<div style="text-align:center;padding:18px;color:var(--t3)">—</div>`;
  return h;
}

function togglePriceCompare(id) {
  const inl = document.getElementById(id);
  const row = document.getElementById(id + "_row");
  // Toggle row version
  if (row) {
    const vis = row.style.display !== "none";
    row.style.display = vis ? "none" : "";
  }
}

// ═══ WARENEINGANG / AUSGANG ═══
// Grund: default + previously used reasons
function getGrundOptions() {
  const defaults = LANG === "vi"
    ? ["Tiêu thụ hàng ngày","Phục vụ","Hư hỏng/Hết hạn","Trả hàng","Mẫu thử","Nội bộ"]
    : ["Tagesverbrauch","Service","Bruch/Verderb","Rückgabe","Probe/Muster","Intern"];
  const used = [...new Set(D.bewegungen.filter(b => b.typ === "ausgang" && b.notiz).map(b => b.notiz))];
  const all = [...new Set([...defaults, ...used])];
  return all;
}
