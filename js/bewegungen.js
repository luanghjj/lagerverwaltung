// ═══ BEWEGUNGEN (Inventory Movements) ═══
function renderBewBuch(typ, vS, aS) {
  const isE = typ === "eingang";
  const title = isE ? t("nav.goodsin") : t("nav.goodsout");
  const stId = aS || vS[0]?.id || "";
  const tBew = D.bewegungen.filter(b=>b.typ===typ && b.datum?.slice(0,10)===td());

  // Pending orders for this location
  const pendingOrders = isE ? D.bestellungen.filter(b=>b.status==="bestellt") : [];
  const pendingByLief = {};
  pendingOrders.forEach(b => {
    const k = b.lieferantId || "none";
    if (!pendingByLief[k]) pendingByLief[k] = { lief: D.lieferanten.find(l=>l.id===b.lieferantId), items: [] };
    pendingByLief[k].items.push(b);
  });
  const pendingGroups = Object.values(pendingByLief);

  let h = `<div class="mn-h"><div class="mn-t">${isE?"↓":"↑"} ${title}</div><div class="mn-a">${isE?`<button class="btn btn-o btn-sm" onclick="addCriticalBatch('${stId}')">⚠ ${t("m.addcritical")}</button>`:""}${isE && pendingGroups.length?`<button class="btn btn-p btn-sm" onclick="showLoadOrderModal()">📋 ${LANG==="vi"?"Tải đơn hàng":"Bestellung laden"} (${pendingOrders.length})</button>`:""}</div></div><div class="mn-c">`;

  // Batch area
  h += `<div style="background:var(--b2);border:2px solid ${isE?"var(--gn)":"var(--rd)"}22;border-radius:10px;padding:12px;margin-bottom:14px">`;
  h += `<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><div class="fg" style="flex:1;min-width:120px;margin-bottom:0"><label>${t("c.location")}</label><select class="sel" id="bew_standort">${vS.map(s=>`<option value="${s.id}" ${s.id===stId?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div><div class="fg" style="flex:1;min-width:120px;margin-bottom:0"><label>${t("c.reference")}</label><input class="inp" id="bew_ref" placeholder="LS-Nr."></div>${isE?`<div class="fg" style="flex:1;min-width:120px;margin-bottom:0"><label>${t("c.supplier")}</label><select class="sel" id="bew_lief"><option value="">—</option>${D.lieferanten.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></div>`:`<div class="fg" style="flex:1;min-width:120px;margin-bottom:0"><label>${t("m.reason")}</label><input class="inp" id="bew_grund" list="grund_list" placeholder="${LANG==="vi"?"Nhập hoặc chọn...":"Eingeben oder wählen..."}"><datalist id="grund_list">${getGrundOptions().map(g=>`<option value="${esc(g)}">`).join("")}</datalist></div>`}</div>`;

  // Search
  h += `<div class="live-search-wrap" style="margin-bottom:10px"><div class="srch"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" id="bew_search" placeholder="${t("c.search")}" oninput="bewSearch('${typ}')" onkeydown="bewSearchKey(event,'${typ}')" style="font-size:13px;padding:9px 9px 9px 28px" autocomplete="off"></div><div id="bew_results"></div></div>`;

  // Zuletzt gebucht (recent articles for this type)
  const recentIds = [];
  D.bewegungen.filter(b=>b.typ===typ).forEach(b => { if (!recentIds.includes(b.artikelId) && recentIds.length < 6) recentIds.push(b.artikelId); });
  if (recentIds.length) {
    h += `<div style="margin-bottom:10px"><div style="font-size:9px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${LANG==="vi"?"Gần đây":"Zuletzt gebucht"}</div><div style="display:flex;gap:4px;flex-wrap:wrap">`;
    recentIds.forEach(artId => {
      const a = D.artikel.find(x=>x.id===artId);
      if (!a) return;
      const inB = BATCH.find(b=>b.artikelId===artId);
      h += `<button class="btn btn-o btn-sm" onclick="addToBatch('${artId}','${typ}')" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;padding:4px 8px;${inB?"border-color:var(--ac);color:var(--ac)":""}"><div class="th" style="width:18px;height:18px">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div>${esc(artN(a).substring(0,20))}${artN(a).length>20?"…":""}${inB?` (${inB.menge})`:""}</button>`;
    });
    h += `</div></div>`;
  }

  // Batch list
  h += `<div id="bew_batch_${typ}"><div style="padding:16px 0;text-align:center;color:var(--t3);font-size:12px">${isE?"📥":"📤"} ${t("c.search")}...</div></div>`;
  h += `</div>`;

  // Today's history
  h += `<h3 style="font-size:12px;font-weight:700;margin-bottom:6px">${t("c.today")} (${tBew.length})</h3>`;
  h += `<div class="tw"><table><thead><tr><th>${t("c.date")}</th><th style="width:30px"></th><th>${t("c.article")}</th><th>${t("c.location")}</th><th>${t("c.quantity")}</th></tr></thead><tbody>`;
  if (!tBew.length) h += `<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:14px">—</td></tr>`;
  tBew.forEach(b => {
    const a = D.artikel.find(x=>x.id===b.artikelId);
    const s = D.standorte.find(x=>x.id===b.standortId);
    const conv = a ? formatUnitConv(b.menge, a) : "";
    h += `<tr><td style="font-family:var(--m);font-size:10px">${b.datum?.slice(11,16)}</td><td><div class="th" style="width:26px;height:26px">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td><td style="font-weight:600">${esc(artN(a))}</td><td>${esc(s?.name||"")}</td><td style="font-family:var(--m);font-weight:700;color:${isE?"var(--gn)":"var(--rd)"}">${isE?"+":"−"}${b.menge}${conv?`<span class="unit-conv"> = ${esc(conv)}</span>`:""}</td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

// Batch state (in-memory, not persisted)
let BATCH = [];

function bewSearch(typ) {
  if(_IME)return;
  const q = norm($("#bew_search")?.value||"");
  if (!q) { $("#bew_results").innerHTML = ""; return; }
  const stId = $("#bew_standort")?.value || "";
  const results = D.artikel.filter(a => norm(a.name).includes(q) || norm(a.name_vi).includes(q) || norm(a.sku).includes(q) || (a.barcodes||[]).some(bc => bc.toLowerCase().includes(q))).slice(0,10);
  if (!results.length) { $("#bew_results").innerHTML = `<div class="live-results" style="padding:12px;text-align:center;color:var(--t3)">—</div>`; return; }
  let h = `<div class="live-results">`;
  results.forEach((a,i) => {
    const ist = a.istBestand[stId]||0, soll = a.sollBestand[stId]||0, min = a.mindestmenge[stId]||0;
    const st = stkSt(ist,soll,min);
    const conv = formatUnitConv(ist, a);
    const inB = BATCH.find(b=>b.artikelId===a.id);
    h += `<div class="live-item ${i===0?"hl":""}" onmousedown="addToBatch('${a.id}','${typ}')"><div class="li-img">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12.5px">${esc(artN(a))} ${inB?`<span style="font-size:9.5px;color:var(--ac);font-weight:700">(${inB.menge}×)</span>`:""}</div><div style="font-size:10.5px;color:var(--t2);display:flex;gap:6px"><span style="font-family:var(--m)">${esc(a.sku)}</span><span class="loc-tag" style="font-size:9px;padding:0 4px">${esc(a.lagerort?.[stId]||"—")}</span></div></div><div style="text-align:right;flex-shrink:0"><div style="font-family:var(--m);font-weight:700;font-size:13px;color:${st.c}">${ist} ${esc(a.einheit)}</div>${conv?`<div class="unit-conv">${esc(conv)}</div>`:""}</div></div>`;
  });
  h += `</div>`;
  $("#bew_results").innerHTML = h;
}

function bewSearchKey(e, typ) {
  if (e.key === "Enter") {
    const q = norm($("#bew_search")?.value||"");
    const a = D.artikel.find(a => norm(a.name).includes(q) || norm(a.name_vi).includes(q) || norm(a.sku) === q || (a.barcodes||[]).some(bc => bc.toLowerCase() === q));
    if (a) addToBatch(a.id, typ);
  } else if (e.key === "Escape") {
    $("#bew_search").value = "";
    $("#bew_results").innerHTML = "";
  }
}

function addToBatch(artikelId, typ) {
  const a = D.artikel.find(x=>x.id===artikelId);
  if (!a) return;
  const ex = BATCH.find(b=>b.artikelId===artikelId);
  if (ex) ex.menge++;
  else BATCH.push({id:uid(),artikelId,menge:1,notiz:""});
  toast(`${artN(a)} +`, "s");
  if ($("#bew_search")) { $("#bew_search").value = ""; $("#bew_results").innerHTML = ""; $("#bew_search").focus(); }
  renderBatch(typ);
}

// ═══ BESTELLUNG IN WARENEINGANG LADEN ═══
function showLoadOrderModal() {
  const pending = D.bestellungen.filter(b=>b.status==="bestellt");
  const byLief = {};
  pending.forEach(b => {
    const k = b.lieferantId || "none";
    if (!byLief[k]) byLief[k] = { lief: D.lieferanten.find(l=>l.id===b.lieferantId), items: [] };
    byLief[k].items.push(b);
  });

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📋 ${LANG==="vi"?"Chọn đơn hàng để nhập kho":"Bestellung für Wareneingang auswählen"}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:10px;padding:6px 10px;background:var(--b3);border-radius:6px">📦 ${LANG==="vi"?"Chọn một đơn hàng. Tất cả SP sẽ được tải vào danh sách nhập kho với số lượng đã đặt. Bạn có thể điều chỉnh số lượng trước khi xác nhận.":"Wähle eine Bestellung. Alle Artikel werden in die Buchungsliste geladen mit der bestellten Menge. Du kannst die Mengen anpassen bevor du buchst."}</div>`;

  for (const [key, g] of Object.entries(byLief)) {
    const totalItems = g.items.length;
    const totalWert = g.items.reduce((s,b) => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const p = a?.lieferanten.find(al=>al.lieferantId===b.lieferantId)?.preis||0;
      return s + p * b.menge;
    }, 0);
    const dates = [...new Set(g.items.map(b=>b.datum?.slice(0,10)))].sort().reverse();

    h += `<div class="cd" style="margin-bottom:6px;border-left:3px solid var(--yl);cursor:pointer;transition:background .15s" onmouseenter="this.style.background='var(--b3)'" onmouseleave="this.style.background=''" onclick="loadOrderToBatch('${key}');closeModal()">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:flex-start">`;
    h += `<div><div style="font-weight:700;font-size:13px">${esc(g.lief?.name||(LANG==="vi"?"Không rõ":"Unbekannt"))}</div>`;
    if (g.lief) h += `<div style="font-size:10px;color:var(--t2)">${esc(g.lief.kontakt||"")} · ${esc(g.lief.email||"")}</div>`;
    h += `<div style="font-size:10px;color:var(--t3);margin-top:2px">${dates.join(", ")}</div></div>`;
    h += `<div style="text-align:right"><span class="bp" style="background:var(--yA);color:var(--yl)">${totalItems} ${t("c.article")}</span>`;
    if (canP()) h += `<div style="font-family:var(--m);font-weight:700;font-size:14px;margin-top:2px">${fC(totalWert)}</div>`;
    h += `</div></div>`;

    // Preview items
    h += `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">`;
    g.items.slice(0, 6).forEach(b => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const lagerort = a?.lagerort?.[b.standortId] || "";
      h += `<span style="font-size:9.5px;padding:2px 6px;background:var(--b4);border-radius:3px;color:var(--t2)">${b.menge}× ${esc(artN(a))}${lagerort?` 📦${esc(lagerort)}`:""}</span>`;
    });
    if (g.items.length > 6) h += `<span style="font-size:9.5px;color:var(--t3)">+${g.items.length-6}</span>`;
    h += `</div>`;

    h += `<div style="margin-top:6px;text-align:right"><span style="font-size:10px;color:var(--ac);font-weight:600">→ ${LANG==="vi"?"Tải vào nhập kho":"In Wareneingang laden"}</span></div>`;
    h += `</div>`;
  }

  if (!Object.keys(byLief).length) {
    h += `<div style="text-align:center;padding:20px;color:var(--gn)"><div style="font-size:24px;margin-bottom:4px">✅</div><div style="font-size:12px">${LANG==="vi"?"Không có đơn hàng chờ":"Keine offenen Bestellungen"}</div></div>`;
  }

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function loadOrderToBatch(liefKey) {
  const items = D.bestellungen.filter(b=>b.status==="bestellt" && (b.lieferantId||"none")===liefKey);
  if (!items.length) return;

  // Set standort and supplier
  const firstItem = items[0];
  const stSel = document.getElementById("bew_standort");
  if (stSel && firstItem.standortId) stSel.value = firstItem.standortId;
  const liefSel = document.getElementById("bew_lief");
  if (liefSel && firstItem.lieferantId) liefSel.value = firstItem.lieferantId;
  const refInp = document.getElementById("bew_ref");
  if (refInp) refInp.value = `B-${items[0].datum?.slice(0,10)||""}`;

  // Clear existing batch and load order items
  BATCH.length = 0;
  const seen = new Set();
  items.forEach(b => {
    const a = D.artikel.find(x=>x.id===b.artikelId);
    if (!a || seen.has(b.artikelId)) return;
    seen.add(b.artikelId);
    // Sum all quantities for same article across the order
    const totalMenge = items.filter(x=>x.artikelId===b.artikelId).reduce((s,x)=>s+x.menge, 0);
    BATCH.push({ id: uid(), artikelId: b.artikelId, menge: totalMenge, _orderId: b.id });
  });

  // Store reference to order items for later confirmation
  window._loadedOrderLiefKey = liefKey;
  window._loadedOrderItems = items;

  renderBatch("eingang");
  toast(`📋 ${items.length} ${t("c.article")} ${LANG==="vi"?"đã tải":"geladen"} — ${LANG==="vi"?"kiểm tra số lượng rồi xác nhận":"Mengen prüfen, dann buchen"}`, "s");
}

function addCriticalBatch(stId) {
  let c = 0;
  D.artikel.forEach(a => {
    const ist=a.istBestand[stId]||0,soll=a.sollBestand[stId]||0,min=a.mindestmenge[stId]||0;
    if (ist<=min && soll>ist) {
      if (!BATCH.find(b=>b.artikelId===a.id)) { BATCH.push({id:uid(),artikelId:a.id,menge:soll-ist,notiz:"Auto"}); c++; }
    }
  });
  toast(c>0?`${c} ${t("c.article")} +`:"—",c>0?"s":"i");
  renderBatch("eingang");
}

function renderBatch(typ) {
  const isE = typ === "eingang";
  const stId = $("#bew_standort")?.value || "";
  const el = $(`#bew_batch_${typ}`);
  if (!el) return;
  const total = BATCH.reduce((s,b)=>s+b.menge,0);

  if (!BATCH.length) { el.innerHTML = `<div style="padding:16px 0;text-align:center;color:var(--t3);font-size:12px">${isE?"📥":"📤"} ${t("c.search")}...</div>`; return; }

  let h = `<div style="font-size:13px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:5px"><span style="color:${isE?"var(--gn)":"var(--rd)"};font-size:16px">${isE?"↓":"↑"}</span>${t("m.batchlist")} <span class="bp" style="background:${isE?"var(--gA)":"var(--rA)"};color:${isE?"var(--gn)":"var(--rd)"}">${BATCH.length} · ${total}</span></div>`;

  BATCH.forEach((b,idx) => {
    const a = D.artikel.find(x=>x.id===b.artikelId);
    if (!a) return;
    const ist=a.istBestand[stId]||0;
    const nv = isE ? ist+b.menge : ist-b.menge;
    const conv = formatUnitConv(b.menge, a);
    const lagerort = a.lagerort?.[stId] || "";
    h += `<div class="batch-item"><div style="font-size:11px;color:var(--t3);font-weight:700;width:18px;text-align:center">${idx+1}</div><div class="bi-thumb">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:12.5px">${esc(artN(a))}</div><div style="font-size:10px;color:var(--t2)">${esc(a.sku)} · ${ist}→<b style="color:${isE?"var(--gn)":nv<0?"var(--rd)":"var(--yl)"}">${nv}</b> ${esc(a.einheit)} ${conv?`<span class="unit-conv">= ${esc(conv)}</span>`:""}</div>${lagerort?`<div style="margin-top:1px"><span class="loc-tag" style="font-size:9px">📦 ${esc(lagerort)}</span></div>`:""}</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0"><button class="bi" onclick="batchQty('${b.id}',-1,'${typ}')" style="font-size:15px;font-weight:700;width:24px;height:24px;justify-content:center">−</button><input class="inp" type="number" min="1" value="${b.menge}" onchange="batchSet('${b.id}',this.value,'${typ}')" style="width:50px;text-align:center;padding:3px 2px;font-family:var(--m);font-size:14px;font-weight:700"><button class="bi" onclick="batchQty('${b.id}',1,'${typ}')" style="font-size:15px;font-weight:700;width:24px;height:24px;justify-content:center">+</button></div><button class="bi dn" onclick="batchRem('${b.id}','${typ}')">✕</button></div>`;
  });

  h += `<div class="batch-total"><div><span style="font-size:11px;color:var(--t2)">${t("c.total")}:</span><span style="font-family:var(--m);font-weight:700;font-size:16px;margin-left:6px">${BATCH.length} ${t("c.article")}</span><span style="font-family:var(--m);font-weight:700;font-size:16px;margin-left:4px;color:${isE?"var(--gn)":"var(--rd)"}">${isE?"+":"−"}${total}</span></div><button class="btn ${isE?"btn-g":"btn-d"}" style="font-size:13px;padding:8px 24px" onclick="buchenAlle('${typ}')">${isE?"↓":"↑"} ${t("m.bookall")} (${BATCH.length})</button></div>`;
  el.innerHTML = h;
}

function batchQty(id, delta, typ) { const b = BATCH.find(x=>x.id===id); if (b) { b.menge = Math.max(1, b.menge+delta); renderBatch(typ); } }
function batchSet(id, val, typ) { const b = BATCH.find(x=>x.id===id); if (b) { b.menge = Math.max(1, parseInt(val)||1); renderBatch(typ); } }
function batchRem(id, typ) { BATCH = BATCH.filter(x=>x.id!==id); renderBatch(typ); }

function buchenAlle(typ) {
  withLock(() => {
  if (!can(U.role, typ)) { toast(LANG==="vi"?"Không có quyền":"Keine Berechtigung","e"); return; }
  if (!BATCH.length) return toast("—","e");
  const isE = typ === "eingang";
  const stId = $("#bew_standort")?.value || "";
  const ref = $("#bew_ref")?.value || "";
  const lief = isE ? ($("#bew_lief")?.value||"") : "";
  const grund = !isE ? ($("#bew_grund")?.value||"") : "";

  for (const b of BATCH) {
    const a = D.artikel.find(x=>x.id===b.artikelId);
    if (!isE && b.menge > (a?.istBestand[stId]||0)) return toast(`${artN(a)}: nicht genug!`,"e");
  }

  BATCH.forEach(b => {
    D.bewegungen.unshift({id:uid(),typ,artikelId:b.artikelId,standortId:stId,menge:b.menge,datum:nw(),benutzer:U.id,referenz:ref,notiz:b.notiz||grund,lieferantId:lief});
    const a = D.artikel.find(x=>x.id===b.artikelId);
    if (a) {
      if (isE) a.istBestand[stId] = (a.istBestand[stId]||0) + b.menge;
      else a.istBestand[stId] = Math.max(0, (a.istBestand[stId]||0) - b.menge);
    }
  });
  save();
  // Supabase sync
  BATCH.forEach(b => {
    const bew = D.bewegungen.find(x => x.artikelId === b.artikelId && x.typ === typ);
    if (bew && typeof sbSaveBewegung === "function") sbSaveBewegung(bew).catch(e => console.error("sbBew:", e));
    const a = D.artikel.find(x => x.id === b.artikelId);
    if (a && typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e));
  });
  const stName = D.standorte.find(s=>s.id===stId)?.name||"";
  const batchLines = BATCH.map(b => { const a=D.artikel.find(x=>x.id===b.artikelId); return `• ${b.menge}× ${artN(a)}`; }).join("\n");
  if (isE) {
    const liefName = D.lieferanten.find(l=>l.id===lief)?.name||"";
    sendTG("eingang", `↓ *Wareneingang*\n📍 ${stName}${liefName?"\n🚛 "+liefName:""}\n${BATCH.length} Pos.${ref?"\n🏷 "+ref:""}\n\n${batchLines}`, stId);

    // Auto-confirm loaded orders
    if (window._loadedOrderItems?.length) {
      let fehlCount = 0;
      window._loadedOrderItems.forEach(order => {
        const batchItem = BATCH.find(b=>b.artikelId===order.artikelId);
        const empfangen = batchItem ? batchItem.menge : 0;
        order.status = "geliefert";
        order.empfangen = empfangen;
        if (empfangen < order.menge) {
          order.fehlmenge = order.menge - empfangen;
          fehlCount++;
        }
      });
      save();
      if (fehlCount) toast(`⚠ ${fehlCount} ${LANG==="vi"?"thiếu hàng":"Fehlmengen dokumentiert"}`,"i");
      window._loadedOrderItems = null;
      window._loadedOrderLiefKey = null;
    }
  } else {
    sendTG("ausgang", `↑ *Warenausgang*\n📍 ${stName}\n${BATCH.length} Pos.${grund?"\n💬 "+grund:""}\n\n${batchLines}`, stId);
    tgCheckKritisch();
  }
  // Booking summary
  const summaryLines = BATCH.slice(0,5).map(b => { const a=D.artikel.find(x=>x.id===b.artikelId); return `${b.menge}× ${artN(a)}`; });
  const summaryText = summaryLines.join(", ") + (BATCH.length > 5 ? ` +${BATCH.length-5}…` : "");
  toast(`${isE?"↓":"↑"} ${BATCH.length} ${t("c.article")}: ${summaryText}`,"s");
  BATCH = [];
  render();
  }); // withLock
}

// ═══ BEWEGUNGEN ═══
let BWG_GROUP = "none"; // "none" | "standort" | "lagerort" | "referenz"
let BWG_SEARCH = "";
function renderBewegungen(vS, aS) {
  const sids = aS ? [aS] : vS.map(s=>s.id);
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.movements")}</div><div class="mn-a">`;
  h += `<div style="display:flex;gap:4px;align-items:center"><span style="font-size:10px;color:var(--t3);font-weight:600">${LANG==="vi"?"Nhóm theo":"Gruppierung"}:</span>`;
  h += `<div class="mode-tabs">`;
  h += `<span class="mode-tab ${BWG_GROUP==="none"?"on":""}" onclick="BWG_GROUP='none';render()">—</span>`;
  h += `<span class="mode-tab ${BWG_GROUP==="standort"?"on":""}" onclick="BWG_GROUP='standort';render()">${t("c.location")}</span>`;
  h += `<span class="mode-tab ${BWG_GROUP==="lagerort"?"on":""}" onclick="BWG_GROUP='lagerort';render()">${t("c.storageloc")}</span>`;
  h += `<span class="mode-tab ${BWG_GROUP==="referenz"?"on":""}" onclick="BWG_GROUP='referenz';render()">${t("c.reference")}</span>`;
  h += `</div></div>`;
  if (can(U.role,"export")) { h += `<button class="btn btn-o btn-sm" onclick="exportBewExcel()">⬇ Excel</button>`;
  h += `<button class="btn btn-o btn-sm" onclick="exportBewCSV()">⬇ CSV</button>`;
  h += `<button class="btn btn-o btn-sm" onclick="exportBewPDF()">⬇ PDF</button>`; }
  h += `</div></div><div class="mn-c">`;

  // Search
  h += `<div style="display:flex;gap:6px;margin-bottom:10px"><div class="srch" style="flex:1;position:relative"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" placeholder="${LANG==="vi"?"Tìm SP, SKU, Referenz...":"Artikel, SKU, Referenz suchen..."}" id="bewSearch" value="${esc(BWG_SEARCH)}" oninput="if(_IME)return;BWG_SEARCH=this.value;render()" style="padding-right:${BWG_SEARCH?'28px':'9px'}">${BWG_SEARCH?`<button class="bi" onclick="BWG_SEARCH='';render()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;

  // Filter
  const q = norm(BWG_SEARCH);
  let bew = D.bewegungen.filter(b => sids.includes(b.standortId)).slice(0, 200);
  if (q) {
    bew = bew.filter(b => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      return norm(a?.name).includes(q) || norm(a?.name_vi).includes(q) || norm(a?.sku).includes(q) || (b.referenz||"").toLowerCase().includes(q) || (b.notiz||"").toLowerCase().includes(q);
    });
    h += `<div style="font-size:11px;color:var(--t2);margin-bottom:8px">${bew.length} ${LANG==="vi"?"kết quả cho":"Ergebnis(se) für"} „${esc(BWG_SEARCH)}"</div>`;
  } else {
    bew = bew.slice(0, 80);
  }

  if (!bew.length) { h += `<div style="text-align:center;padding:20px;color:var(--t3)">—</div></div>`; return h; }

  if (BWG_GROUP === "none") {
    h += renderBewTable(bew);
  } else {
    // Group
    const groups = {};
    bew.forEach(b => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const s = D.standorte.find(x=>x.id===b.standortId);
      let key;
      if (BWG_GROUP === "standort") key = s?.name || "—";
      else if (BWG_GROUP === "lagerort") key = a?.lagerort?.[b.standortId] || "—";
      else if (BWG_GROUP === "referenz") key = b.referenz || "—";
      else key = "—";
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    // Sort within groups by date desc
    Object.values(groups).forEach(g => g.sort((a,b) => (b.datum||"").localeCompare(a.datum||"")));
    // Sort group keys
    const sortedKeys = Object.keys(groups).sort();

    for (const key of sortedKeys) {
      const g = groups[key];
      const label = BWG_GROUP === "standort" ? `📍 ${key}` : BWG_GROUP === "lagerort" ? `📦 ${key}` : `🏷 ${key}`;
      h += `<div class="cd" style="margin-bottom:10px">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-weight:700;font-size:13px">${esc(label)}</div><span class="bp" style="background:var(--aA);color:var(--ac)">${g.length}</span></div>`;
      h += renderBewTable(g);
      h += `</div>`;
    }
  }

  h += `</div>`;
  return h;
}

function renderBewTable(bew) {
  // Desktop table
  let h = `<div class="tw bew-table-desk"><table><thead><tr><th>${t("c.date")}</th><th>${t("c.type")}</th><th style="width:30px"></th><th>${t("c.article")}</th><th>${t("c.location")}</th><th class="mob-hide">${t("c.storageloc")}</th><th>${t("c.quantity")}</th><th class="mob-hide">${t("c.reference")}</th><th class="mob-hide">${LANG==="vi"?"NV":"MA"}</th><th class="mob-hide">${t("c.note")}</th></tr></thead><tbody>`;
  bew.forEach(b => {
    const bt=BT[b.typ]||{s:"?",c:"#666",i:"?"};const a=D.artikel.find(x=>x.id===b.artikelId);const s=D.standorte.find(x=>x.id===b.standortId);const usr=D.users.find(x=>x.id===b.benutzer);
    const plus=["eingang","korrektur_plus"].includes(b.typ);const minus=["ausgang","korrektur_minus"].includes(b.typ);
    const conv = a ? formatUnitConv(b.menge,a) : "";
    h += `<tr><td style="font-family:var(--m);font-size:9.5px">${fDT(b.datum)}</td><td><span class="bwt" style="background:${bt.c}18;color:${bt.c}">${bt.i} ${bt.s}</span></td><td><div class="th" style="width:24px;height:24px">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td><td style="font-weight:600;cursor:pointer" onclick="showArtikelDetail('${b.artikelId}')">${esc(artN(a))}</td><td>${esc(s?.name||"")}${b.zielStandortId?` → ${esc(D.standorte.find(x=>x.id===b.zielStandortId)?.name||"")}`:""}</td><td class="mob-hide"><span class="loc-tag" style="font-size:9px">${esc(a?.lagerort?.[b.standortId]||"—")}</span></td><td style="font-family:var(--m);font-weight:700;color:${plus?"var(--gn)":minus?"var(--rd)":"var(--pu)"}">${plus?"+":minus?"−":"⇄"}${b.menge}${conv?`<span class="unit-conv"> = ${esc(conv)}</span>`:""}</td><td class="mob-hide" style="font-family:var(--m);font-size:9.5px;color:var(--t2)">${esc(b.referenz||"—")}</td><td class="mob-hide" style="font-size:10.5px">${usr?esc(usr.name):""}</td><td class="mob-hide" style="color:var(--t3);font-size:10.5px;max-width:150px;word-break:break-word;white-space:normal">${esc(b.notiz||"")}</td></tr>`;
  });
  if (!bew.length) h += `<tr><td colspan="10" style="text-align:center;color:var(--t3);padding:16px">—</td></tr>`;
  h += `</tbody></table></div>`;

  // Mobile card layout (shown only on <540px via CSS)
  h += `<div class="mob-card-list">`;
  bew.forEach(b => {
    const bt=BT[b.typ]||{s:"?",c:"#666",i:"?"};const a=D.artikel.find(x=>x.id===b.artikelId);const s=D.standorte.find(x=>x.id===b.standortId);const usr=D.users.find(x=>x.id===b.benutzer);
    const plus=["eingang","korrektur_plus"].includes(b.typ);const minus=["ausgang","korrektur_minus"].includes(b.typ);
    h += `<div class="cd" style="padding:8px 10px;border-left:3px solid ${bt.c};cursor:pointer" onclick="showArtikelDetail('${b.artikelId}')">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center">`;
    h += `<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0"><div class="th" style="width:28px;height:28px">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div style="min-width:0"><div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(artN(a))}</div><div style="font-size:9.5px;color:var(--t3)">${b.datum?.slice(5,10)} ${b.datum?.slice(11,16)} · ${esc(s?.name||"")}${usr?" · "+esc(usr.name):""}</div></div></div>`;
    h += `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0"><span class="bwt" style="background:${bt.c}18;color:${bt.c};font-size:9.5px">${bt.i}${bt.s}</span><span style="font-family:var(--m);font-weight:700;font-size:14px;color:${plus?"var(--gn)":minus?"var(--rd)":"var(--pu)"}">${plus?"+":minus?"−":"⇄"}${b.menge}</span></div>`;
    h += `</div></div>`;
  });
  if (!bew.length) h += `<div style="text-align:center;padding:16px;color:var(--t3)">—</div>`;
  h += `</div>`;
  return h;
}

// ═══ INVENTUR ═══
let INV_ACTIVE = false;
let INV_DATA = {};
let INV_DONE = [];
let INV_KAT = "all";
let INV_SORT = "lagerort"; // "name" | "lagerort" | "sku" | "status"
let INV_GROUP = "lagerort"; // "none" | "lagerort" | "kat"
