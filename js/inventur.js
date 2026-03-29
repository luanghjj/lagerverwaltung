// ═══ INVENTUR (Stocktaking) ═══
function invSearchKey(e) {
  if (e.key === "Escape") { INV_SEARCH = ""; render(); return; }
  if (e.key === "Enter") {
    e.preventDefault();
    // Find first visible inv-input and focus it
    setTimeout(() => {
      const inp = document.querySelector(".inv-input");
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }
}
function renderInventur(vS, aS) {
  const stId = aS || vS[0]?.id || "";
  const stName = D.standorte.find(s=>s.id===stId)?.name || "";

  let h = `<div class="mn-h"><div class="mn-t">📋 ${LANG==="vi"?"Kiểm kê":"Inventur"}</div><div class="mn-a">`;
  if (!INV_ACTIVE) {
    h += `<button class="btn btn-p" onclick="startInventur()">▶ ${LANG==="vi"?"Bắt đầu kiểm kê":"Inventur starten"}</button>`;
  } else {
    const counted = Object.keys(INV_DATA).length;
    const total = D.artikel.length;
    h += `<span class="bp" style="background:var(--gA);color:var(--gn)">${counted}/${total}</span>`;
    h += `<button class="btn btn-g" onclick="finishInventur()">✓ ${LANG==="vi"?"Hoàn thành":"Abschließen"}</button>`;
    h += `<button class="btn btn-d btn-sm" onclick="cancelInventur()">✕</button>`;
  }
  h += `</div></div><div class="mn-c">`;

  if (!INV_ACTIVE && INV_DONE.length) {
    // Show history
    h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px">${LANG==="vi"?"Lịch sử kiểm kê":"Inventur-Protokolle"}</h3>`;
    INV_DONE.forEach((inv,idx) => {
      const diffCount = inv.items.filter(x=>x.diff!==0).length;
      h += `<div class="cd" style="margin-bottom:8px;cursor:pointer;border-left:3px solid ${diffCount?"var(--yl)":"var(--gn)"}" onclick="showInvDetail(${idx})">`;
      h += `<div style="display:flex;justify-content:space-between"><div><div style="font-weight:700">${fDT(inv.datum)}</div><div style="font-size:11px;color:var(--t2)">${esc(inv.standort)} · ${esc(inv.benutzer)}</div></div>`;
      h += `<div style="text-align:right"><span class="bp" style="background:${diffCount?"var(--yA)":"var(--gA)"};color:${diffCount?"var(--yl)":"var(--gn)"}">${diffCount?`${diffCount} ${LANG==="vi"?"chênh lệch":"Differenzen"}`:`✓ ${LANG==="vi"?"Khớp":"Keine Differenz"}`}</span><div style="font-size:10px;color:var(--t3);margin-top:2px">${inv.items.length} ${t("c.article")}</div></div></div></div>`;
    });
  }

  if (!INV_ACTIVE && !INV_DONE.length) {
    h += `<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:40px;margin-bottom:8px">📋</div>`;
    h += `<div style="font-size:14px;font-weight:600">${LANG==="vi"?"Kiểm kê kho":"Stichtagsinventur"}</div>`;
    h += `<div style="font-size:12px;margin-top:6px;max-width:400px;margin-inline:auto">${LANG==="vi"?"Đếm từng sản phẩm, so sánh với số liệu hệ thống, tự động điều chỉnh chênh lệch.":"Artikel für Artikel zählen, mit System-Bestand vergleichen, Differenzen automatisch korrigieren."}</div></div>`;
  }

  if (INV_ACTIVE) {
    h += `<div style="font-size:11px;color:var(--t2);margin-bottom:10px;padding:6px 10px;background:var(--b3);border-radius:6px">📍 ${esc(stName)} — ${LANG==="vi"?"Nhập số lượng thực tế đếm được":"Gezählte Menge eingeben"}</div>`;

    // Progress bar
    const totalArts = D.artikel.length;
    const countedArts = Object.keys(INV_DATA).filter(k => INV_DATA[k]?.gezählt !== undefined).length;
    const pctDone = totalArts > 0 ? Math.round(countedArts / totalArts * 100) : 0;
    const diffCount = Object.entries(INV_DATA).filter(([artId, v]) => { const a = D.artikel.find(x=>x.id===artId); return v.gezählt !== undefined && v.gezählt !== (a?.istBestand[stId]||0); }).length;
    h += `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:600;margin-bottom:3px"><span style="color:var(--ac)">${countedArts}/${totalArts} ${LANG==="vi"?"đã đếm":"gezählt"} (${pctDone}%)</span><span style="color:${diffCount?"var(--rd)":"var(--gn)"}">${diffCount} ${LANG==="vi"?"chênh lệch":"Differenzen"}</span></div><div class="stk-b" style="height:6px"><div class="stk-f" style="width:${pctDone}%;background:${pctDone===100?"var(--gn)":"var(--ac)"}"></div></div></div>`;

    // Search bar
    h += `<div style="margin-bottom:8px"><div class="srch" style="position:relative"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" id="inv_search" placeholder="${LANG==="vi"?"Tìm SP, SKU, Barcode...":"Artikel, SKU, Barcode suchen..."}" value="${esc(INV_SEARCH)}" oninput="if(_IME)return;INV_SEARCH=this.value;render()" onkeydown="invSearchKey(event)" style="font-size:13px;padding:9px 9px 9px 28px;${INV_SEARCH?'padding-right:28px':''}" autocomplete="off">${INV_SEARCH?`<button class="bi" onclick="INV_SEARCH='';render()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;

    // Filter by category
    h += `<div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;align-items:center">`;
    h += `<span class="st-l" style="margin-right:2px">${LANG==="vi"?"Danh mục":"Kategorie"}:</span>`;
    h += `<span class="st-ch ${INV_KAT==="all"?"on":""}" onclick="INV_KAT='all';render()">${t("c.all")}</span>`;
    D.kategorien.forEach(k => { h += `<span class="st-ch ${INV_KAT===k.id?"on":""}" onclick="INV_KAT='${k.id}';render()" style="${INV_KAT===k.id?"border-color:"+k.farbe:""}">${esc(katN(k))}</span>`; });
    h += `</div>`;

    // Sort & Group controls
    h += `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">`;
    h += `<div style="display:flex;gap:3px;align-items:center"><span class="st-l">${LANG==="vi"?"Nhóm":"Gruppieren"}:</span>`;
    h += `<span class="st-ch ${INV_GROUP==="lagerort"?"on":""}" onclick="INV_GROUP='lagerort';render()">📦 ${t("c.storageloc")}</span>`;
    h += `<span class="st-ch ${INV_GROUP==="kat"?"on":""}" onclick="INV_GROUP='kat';render()">🏷 ${t("c.categories")}</span>`;
    h += `<span class="st-ch ${INV_GROUP==="none"?"on":""}" onclick="INV_GROUP='none';render()">— ${LANG==="vi"?"Không":"Keine"}</span>`;
    h += `</div>`;
    h += `<div style="display:flex;gap:3px;align-items:center"><span class="st-l">${LANG==="vi"?"Sắp xếp":"Sortieren"}:</span>`;
    h += `<span class="st-ch ${INV_SORT==="lagerort"?"on":""}" onclick="INV_SORT='lagerort';render()">📦 ${t("c.storageloc")}</span>`;
    h += `<span class="st-ch ${INV_SORT==="name"?"on":""}" onclick="INV_SORT='name';render()">A-Z</span>`;
    h += `<span class="st-ch ${INV_SORT==="status"?"on":""}" onclick="INV_SORT='status';render()">⏳ ${LANG==="vi"?"Chưa đếm":"Offen"}</span>`;
    h += `</div></div>`;

    let arts = D.artikel.filter(a => INV_KAT==="all" || a.kategorien.includes(INV_KAT));

    // Search filter
    if (INV_SEARCH) {
      const q = norm(INV_SEARCH);
      arts = arts.filter(a => norm(a.name).includes(q) || norm(a.name_vi).includes(q) || norm(a.sku).includes(q) || (a.barcodes||[]).some(bc => bc.toLowerCase().includes(q)));
      if (!arts.length && /^\d{8,}$/.test(INV_SEARCH.trim()) && can(U.role,"artikel")) {
        h += `<div style="text-align:center;padding:16px"><div style="margin-bottom:8px;color:var(--t3)">${LANG==="vi"?"Mã vạch chưa có SP":"Barcode nicht gefunden"}: <b>${esc(INV_SEARCH.trim())}</b></div><button class="btn btn-p btn-sm" onclick="editArtikelWithBarcode('${esc(INV_SEARCH.trim())}')">${LANG==="vi"?"+ Tạo sản phẩm mới":"+ Neuen Artikel anlegen"}</button></div>`;
      }
    }

    // Sort
    arts.sort((a, b) => {
      if (INV_SORT === "lagerort") return (a.lagerort?.[stId]||"zzz").localeCompare(b.lagerort?.[stId]||"zzz") || artN(a).localeCompare(artN(b));
      if (INV_SORT === "name") return artN(a).localeCompare(artN(b));
      if (INV_SORT === "status") { const aD=INV_DATA[a.id]?.gezählt!==undefined?1:0; const bD=INV_DATA[b.id]?.gezählt!==undefined?1:0; return aD-bD || artN(a).localeCompare(artN(b)); }
      return 0;
    });

    // Group
    if (INV_GROUP !== "none") {
      const groups = {};
      arts.forEach(a => {
        let key, label, color;
        if (INV_GROUP === "lagerort") {
          key = a.lagerort?.[stId] || "—";
          label = key;
          color = "var(--ac)";
        } else {
          const kat = D.kategorien.find(k => a.kategorien.includes(k.id));
          key = kat?.id || "none";
          label = kat ? katN(kat) : (LANG==="vi"?"Không phân loại":"Ohne Kategorie");
          color = kat?.farbe || "var(--t3)";
        }
        if (!groups[key]) groups[key] = { label, color, items: [] };
        groups[key].items.push(a);
      });

      for (const [gKey, g] of Object.entries(groups)) {
        const gCounted = g.items.filter(a => INV_DATA[a.id]?.gezählt !== undefined).length;
        h += `<div style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:5px 8px;background:var(--b3);border-radius:6px;border-left:3px solid ${g.color}"><span style="font-weight:700;font-size:12px">${INV_GROUP==="lagerort"?"📦 ":"🏷 "}${esc(g.label)}</span><span style="font-size:10px;color:var(--t3)">${gCounted}/${g.items.length}</span></div>`;
        h += renderInvTable(g.items, stId);
        h += `</div>`;
      }
    } else {
      h += renderInvTable(arts, stId);
    }

    // Summary
    const counted = Object.keys(INV_DATA).length;
    const diffs = Object.entries(INV_DATA).filter(([,v])=>v.diff!==0);
    h += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">`;
    h += `<span class="bp" style="background:var(--aA);color:var(--ac)">${counted}/${D.artikel.length} ${LANG==="vi"?"đã đếm":"gezählt"}</span>`;
    if (diffs.length) h += `<span class="bp" style="background:var(--yA);color:var(--yl)">${diffs.length} ${LANG==="vi"?"chênh lệch":"Differenzen"}</span>`;
    h += `</div>`;
  }

  h += `</div>`;
  return h;
}

function renderInvTable(arts, stId) {
  let h = `<div class="tw"><table><thead><tr><th style="width:30px"></th><th>${t("c.article")}</th><th class="mob-hide">${t("c.storageloc")}</th><th style="text-align:right">${LANG==="vi"?"Hệ thống":"System"}</th><th style="text-align:center;color:var(--ac)">${LANG==="vi"?"Đếm được":"Gezählt"}</th><th style="text-align:right">${LANG==="vi"?"Chênh lệch":"Differenz"}</th></tr></thead><tbody>`;
  arts.forEach(a => {
    const sysIst = a.istBestand[stId] || 0;
    const inv = INV_DATA[a.id];
    const gezählt = inv?.gezählt;
    const diff = gezählt !== undefined ? gezählt - sysIst : null;
    const isDone = gezählt !== undefined;
    const rowBg = isDone ? (diff === 0 ? "" : diff > 0 ? "background:var(--gA)" : "background:var(--rA)") : "";
    h += `<tr style="border-bottom:1px solid var(--bd);${rowBg}">`;
    h += `<td><div class="th" style="width:28px;height:28px">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:`<span style="font-size:10px;color:var(--t3)">${isDone?(diff===0?"✓":"⚠"):"○"}</span>`}</div></td>`;
    h += `<td style="font-weight:600">${esc(artN(a))}<div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a.sku)}</div></td>`;
    h += `<td class="mob-hide"><span class="loc-tag">${esc(a.lagerort?.[stId]||"—")}</span></td>`;
    h += `<td style="text-align:right;font-family:var(--m)">${sysIst} ${esc(a.einheit)}</td>`;
    h += `<td style="text-align:center"><input class="inp inv-input" type="number" min="0" value="${gezählt!==undefined?gezählt:""}" placeholder="—" onchange="invCount('${a.id}',this.value,'${stId}')" style="width:70px;text-align:center;padding:5px;font-family:var(--m);font-size:14px;font-weight:700;border:2px solid ${isDone?(diff===0?"var(--gn)":"var(--yl)"):"var(--bd)"}"></td>`;
    h += `<td style="text-align:right;font-family:var(--m);font-weight:700;color:${diff===null?"var(--t3)":diff===0?"var(--gn)":diff>0?"var(--ac)":"var(--rd)"}">${diff===null?"—":diff>0?"+"+diff:diff}</td>`;
    h += `</tr>`;
  });
  if (!arts.length) h += `<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:14px">—</td></tr>`;
  h += `</tbody></table></div>`;
  return h;
}

function startInventur() { INV_ACTIVE = true; INV_DATA = {}; render(); toast(`📋 ${LANG==="vi"?"Bắt đầu kiểm kê":"Inventur gestartet"}`,"i"); }

function invCount(artId, val, stId) {
  if (val === "" || val === undefined) { delete INV_DATA[artId]; return; }
  const a = D.artikel.find(x=>x.id===artId);
  const sysIst = a?.istBestand[stId] || 0;
  const gezählt = parseInt(val) || 0;
  INV_DATA[artId] = { gezählt, diff: gezählt - sysIst };
}

function cancelInventur() {
  cConfirm(LANG==="vi"?"Hủy kiểm kê? Dữ liệu đếm sẽ bị mất.":"Inventur abbrechen? Zähldaten gehen verloren.", () => {
    INV_ACTIVE = false; INV_DATA = {}; render();
  });
}

function finishInventur() {
  const counted = Object.keys(INV_DATA).length;
  if (!counted) { toast(LANG==="vi"?"Chưa đếm gì":"Nichts gezählt","e"); return; }
  const diffs = Object.entries(INV_DATA).filter(([,v])=>v.diff!==0);

  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const stId = STF !== "all" ? STF : vS[0]?.id;
  const stName = D.standorte.find(s=>s.id===stId)?.name || "";

  const label = LANG==="vi"
    ? `Hoàn thành kiểm kê?\n\n${counted} SP đã đếm, ${diffs.length} chênh lệch.\n\nChênh lệch sẽ được tự động điều chỉnh.`
    : `Inventur abschließen?\n\n${counted} Artikel gezählt, ${diffs.length} Differenzen.\n\nDifferenzen werden automatisch korrigiert.`;

  cConfirm(label, () => {
    const invItems = [];
    Object.entries(INV_DATA).forEach(([artId, v]) => {
      const a = D.artikel.find(x=>x.id===artId);
      if (!a) return;
      const sysIst = a.istBestand[stId] || 0;
      invItems.push({ artId, name: artN(a), sku: a.sku, sysIst, gezählt: v.gezählt, diff: v.diff });

      if (v.diff !== 0) {
        // Correct stock
        a.istBestand[stId] = v.gezählt;
        // Log correction
        D.bewegungen.unshift({
          id: uid(), typ: v.diff > 0 ? "korrektur_plus" : "korrektur_minus",
          artikelId: artId, standortId: stId, menge: Math.abs(v.diff),
          datum: nw(), benutzer: U.id, referenz: "INVENTUR", notiz: `Soll:${sysIst}→Ist:${v.gezählt}`, lieferantId: ""
        });
      }
    });

    // Save protocol
    INV_DONE.unshift({ datum: nw(), standort: stName, standortId: stId, benutzer: U.name, items: invItems });
    INV_ACTIVE = false; INV_DATA = {};
    save(); render();
    // Supabase sync: inventur + corrected articles
    const prot = INV_DONE[0];
    if (prot && typeof sbSaveInventur === "function") sbSaveInventur({ id: uid(), standortId: prot.standortId, datum: prot.datum, benutzer: U.id }, prot.items.map(it => ({ artikelId: it.artId, gezaehlt: it.gezählt, systemBestand: it.sysIst, diff: it.diff }))).catch(e => console.error("sbInv:", e));
    invItems.forEach(it => { if (it.diff !== 0) { const a = D.artikel.find(x => x.id === it.artId); if (a && typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e)); } });
    const diffLines = diffs.slice(0,10).map(d => `• ${d.name}: ${d.sysIst}→${d.gezählt} (${d.diff>0?"+":""}${d.diff})`).join("\n");
    sendTG("inventur", `📋 *Inventur abgeschlossen*\n📍 ${stName}\n👤 ${U?.name||"?"}\n${invItems.length} Artikel gezählt\n${diffs.length} Korrekturen\n\n${diffLines}${diffs.length>10?"\n... +"+(diffs.length-10)+" weitere":""}`, stId);
    tgCheckKritisch();
    toast(`✓ ${LANG==="vi"?"Kiểm kê hoàn thành":"Inventur abgeschlossen"} · ${diffs.length} ${LANG==="vi"?"điều chỉnh":"Korrekturen"}`,"s");
  });
}

function showInvDetail(idx) {
  const inv = INV_DONE[idx];
  if (!inv) return;
  const diffs = inv.items.filter(x=>x.diff!==0);

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📋 ${LANG==="vi"?"Biên bản kiểm kê":"Inventur-Protokoll"} — ${fDT(inv.datum)}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div style="display:flex;gap:12px;margin-bottom:10px;font-size:11px;color:var(--t2)"><span>📍 ${esc(inv.standort)}</span><span>👤 ${esc(inv.benutzer)}</span><span>${inv.items.length} ${t("c.article")}</span></div>`;

  h += `<div class="tw"><table><thead><tr><th>${t("c.article")}</th><th>SKU</th><th style="text-align:right">${LANG==="vi"?"Hệ thống":"System"}</th><th style="text-align:right">${LANG==="vi"?"Đếm":"Gezählt"}</th><th style="text-align:right">${LANG==="vi"?"Chênh lệch":"Differenz"}</th></tr></thead><tbody>`;
  inv.items.forEach(it => {
    const bg = it.diff === 0 ? "" : it.diff > 0 ? "background:var(--gA)" : "background:var(--rA)";
    h += `<tr style="${bg}"><td style="font-weight:600">${esc(it.name)}</td><td style="font-family:var(--m);font-size:10px;color:var(--t3)">${esc(it.sku)}</td>`;
    h += `<td style="text-align:right;font-family:var(--m)">${it.sysIst}</td>`;
    h += `<td style="text-align:right;font-family:var(--m);font-weight:700">${it.gezählt}</td>`;
    h += `<td style="text-align:right;font-family:var(--m);font-weight:700;color:${it.diff===0?"var(--gn)":it.diff>0?"var(--ac)":"var(--rd)"}">${it.diff>0?"+"+it.diff:it.diff}</td></tr>`;
  });
  h += `</tbody></table></div>`;

  if (diffs.length) {
    h += `<div style="margin-top:10px;padding:8px 10px;background:var(--yA);border-radius:6px;font-size:11px;color:var(--yl)">⚠ ${diffs.length} ${LANG==="vi"?"đã điều chỉnh tự động":"automatisch korrigiert"}</div>`;
  }

  // Export
  if (can(U.role,"export")) h += `<div style="margin-top:10px;display:flex;gap:4px"><button class="btn btn-o btn-sm" onclick="exportInvPDF(${idx})">⬇ PDF</button></div>`;

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function exportInvPDF(idx) {
  const inv = INV_DONE[idx]; if (!inv) return;
  let html = `<html><head><meta charset="utf-8"><title>Inventur ${inv.datum}</title><style>body{font-family:Helvetica,Arial,sans-serif;font-size:11px;margin:20px}h1{font-size:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;text-align:left;padding:4px 6px;font-size:10px;border-bottom:2px solid #ccc}td{padding:4px 6px;border-bottom:1px solid #eee}.r{text-align:right}.mono{font-family:monospace}.pos{color:#059669;font-weight:bold}.neg{color:#DC2626;font-weight:bold}.zero{color:#999}</style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)} — Inventur-Protokoll</h1>`;
  html += `<p><b>Datum:</b> ${fDT(inv.datum)} | <b>Standort:</b> ${esc(inv.standort)} | <b>Benutzer:</b> ${esc(inv.benutzer)}</p>`;
  html += `<table><thead><tr><th>Artikel</th><th>SKU</th><th class="r">System</th><th class="r">Gezählt</th><th class="r">Differenz</th></tr></thead><tbody>`;
  inv.items.forEach(it => {
    html += `<tr><td>${esc(it.name)}</td><td class="mono">${esc(it.sku)}</td><td class="r mono">${it.sysIst}</td><td class="r mono" style="font-weight:bold">${it.gezählt}</td><td class="r mono ${it.diff>0?"pos":it.diff<0?"neg":"zero"}">${it.diff>0?"+"+it.diff:it.diff}</td></tr>`;
  });
  const diffC = inv.items.filter(x=>x.diff!==0).length;
  html += `</tbody></table><p style="margin-top:12px;font-weight:bold">${inv.items.length} Artikel gezählt · ${diffC} Differenzen</p></body></html>`;
  openPrintHTML(html);
}

// ═══ UMBUCHEN (Transfer between locations) ═══
let TF_BATCH = [];
let TF_HSEARCH = "";