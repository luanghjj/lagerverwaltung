// ═══ RESTAURANT: Bereiche, Anforderung, Auffüllung, Verbrauch-Bon ═══
function renderRstBereiche(vS, aS) {
  const sids = aS ? [aS] : vS.map(s=>s.id);
  const userBr = U.bereiche || ["all"];
  const canSeeBereich = (br) => {
    if (!sids.includes(br.standortId)) return false;
    if (userBr.includes("all")) return true;
    return userBr.includes(br.id);
  };
  const bereiche = D.bereiche.filter(canSeeBereich);
  const pendingCount = (D.anforderungen||[]).filter(a=>a.status==="offen" && sids.includes(a.standortId) && (userBr.includes("all")||userBr.includes(a.bereichId))).length;

  let h = `<div class="mn-h"><div class="mn-t">🍽 ${t("rst.bereiche")}</div><div class="mn-a">`;
  if (pendingCount) h += `<button class="btn btn-o btn-sm" onclick="goPage('rst_auffuellung')">📦 ${pendingCount} ${LANG==="vi"?"yêu cầu chờ":"offen"}</button>`;
  if (canManageBereiche()) h += `<button class="btn btn-p" onclick="editBereich()">+ ${t("c.new")}</button>`;
  h += `</div></div><div class="mn-c">`;

  if (!bereiche.length) {
    h += `<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:32px;margin-bottom:6px">🍽</div><div style="font-size:13px;font-weight:600">${LANG==="vi"?"Chưa có khu vực nào":"Noch keine Bereiche definiert"}</div></div></div>`;
    return h;
  }

  const byStandort = {};
  bereiche.forEach(b => { if (!byStandort[b.standortId]) byStandort[b.standortId] = []; byStandort[b.standortId].push(b); });

  for (const [sid, brs] of Object.entries(byStandort)) {
    const st = D.standorte.find(s=>s.id===sid);
    if (sids.length > 1) h += `<h3 style="font-size:14px;font-weight:700;margin:12px 0 8px">📍 ${esc(st?.name||"")}</h3>`;
    h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;margin-bottom:16px">`;
    brs.forEach(br => {
      const artCount = br.artikel.length;
      let vollCount=0,fehlCount=0,totalFehl=0;
      br.artikel.forEach(ba => {
        const a = D.artikel.find(x=>x.id===ba.artikelId);
        const lagerIst = a?.istBestand[br.standortId]||0;
        if (lagerIst >= ba.soll) vollCount++; else { fehlCount++; totalFehl += Math.max(0, ba.soll-lagerIst); }
      });
      const status = fehlCount===0?"voll":fehlCount<artCount?"nachfuellen":"leer";
      const statusColor = {voll:"var(--gn)",nachfuellen:"var(--yl)",leer:"var(--rd)"}[status];
      const statusBg = {voll:"var(--gA)",nachfuellen:"var(--yA)",leer:"var(--rA)"}[status];

      h += `<div class="cd" style="border-left:4px solid ${br.farbe}">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:flex-start">`;
      h += `<div><div style="font-weight:700;font-size:14px">${br.icon||"📦"} ${esc(LANG==="vi"&&br.name_vi?br.name_vi:br.name)}</div>`;
      h += `<div style="font-size:10.5px;color:var(--t3)">${artCount} ${t("c.article")}</div></div>`;
      h += `<div style="display:flex;gap:3px;align-items:center">`;
      h += `<span class="bp" style="background:${statusBg};color:${statusColor}">${status==="voll"?"🟢":"🔴"} ${t("rst."+status)}</span>`;
      if (canManageBereiche()) {
        h += `<button class="bi" onclick="editBereich('${br.id}')">✎</button>`;
        h += `<button class="bi dn" onclick="delBereich('${br.id}')">🗑</button>`;
      }
      h += `</div></div>`;

      if (br.artikel.length) {
        h += `<div style="margin-top:8px;max-height:175px;overflow-y:auto">`;
        br.artikel.forEach(ba => {
          const a = D.artikel.find(x=>x.id===ba.artikelId);
          const lagerIst = a?.istBestand[br.standortId]||0;
          const fehl = Math.max(0, ba.soll-lagerIst);
          const pct = Math.min(100,(Math.min(lagerIst,ba.soll)/Math.max(ba.soll,1))*100);
          const col = fehl>0?"var(--rd)":"var(--gn)";
          h += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;${ba!==br.artikel[br.artikel.length-1]?"border-bottom:1px solid var(--bd)":""}">`;
          h += `<span style="font-size:11.5px;flex:1;font-weight:500">${esc(artN(a))}</span>`;
          h += `<div style="width:50px;height:4px;background:var(--b4);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div></div>`;
          h += `<span style="font-family:var(--m);font-size:10.5px;font-weight:600;color:${col};min-width:50px;text-align:right">${Math.min(lagerIst,ba.soll)}/${ba.soll}</span>`;
          if (fehl>0) h += `<span style="font-size:9px;padding:1px 5px;background:var(--rA);color:var(--rd);border-radius:3px;font-weight:600">-${fehl}</span>`;
          h += `</div>`;
        });
        h += `</div>`;
      }
      h += `<div style="margin-top:8px"><button class="btn ${fehlCount>0?"btn-p":"btn-o"} btn-sm" style="width:100%" onclick="openAnforderungModal('${br.id}')">${LANG==="vi"?"Bổ sung hàng":"Auffüllen"} →</button></div>`;
      h += `</div>`;
    });
    h += `</div>`;
  }
  h += `</div>`;
  return h;
}

// Step 1 Modal: enter consumed qty → create Anforderung
let ANF_SORT = "kat"; // "name" | "kat" | "lager" | "fehl"
function openAnforderungModal(brId) {
  const br = D.bereiche.find(x=>x.id===brId);
  if (!br) return;
  if (!canAccessBereich(brId)) { toast(LANG==="vi"?"Không có quyền":"Kein Zugriff","e"); return; }
  const st = D.standorte.find(s=>s.id===br.standortId);
  window._anfBrId = brId;
  window._anfItems = br.artikel.map(ba => {
    const a = D.artikel.find(x=>x.id===ba.artikelId);
    const qId = ba.quelleId || br.standortId;
    const lagerIst = a?.istBestand[qId]||0;
    const quelleName = D.standorte.find(s=>s.id===qId)?.name||"";
    const isExtern = qId !== br.standortId;
    return { artikelId: ba.artikelId, art: a, soll: ba.soll, lagerIst, quelleId: qId, quelleName, isExtern, verbrauch: 0 };
  });
  renderAnfModal();
}

function renderAnfModal() {
  // Preserve entered quantities before re-render
  if (window._anfItems) {
    window._anfItems.forEach((it, i) => {
      const inp = document.getElementById(`anf_qty_${i}`);
      if (inp) it._enteredQty = parseInt(inp.value) || 0;
    });
  }
  // Remove existing
  const ex = document.getElementById("anfModal"); if (ex) ex.remove();
  const brId = window._anfBrId;
  const br = D.bereiche.find(x=>x.id===brId);
  const st = D.standorte.find(s=>s.id===br?.standortId);
  const items = window._anfItems;
  const unassigned = D.artikel.filter(a => !items.some(it=>it.artikelId===a.id));
  const emptyCount = items.filter(it=>it.lagerIst<=0).length;

  let h = `<div class="mo-ov" id="anfModal" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${br?.icon||""} ${LANG==="vi"?"Bổ sung hàng":"Auffüllen"}: ${esc(br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):"")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:10px;padding:6px 10px;background:var(--b3);border-radius:6px">📍 ${esc(st?.name||"")} — ${LANG==="vi"?"Nhập số lượng cần bổ sung. Từ đó yêu cầu bổ sung sẽ được tạo.":"Auffüllmenge eingeben. Daraus wird die Anforderung erstellt."}</div>`;

  // Search + Sort controls
  h += `<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">`;
  h += `<div class="srch" style="position:relative;flex:1;min-width:150px"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" id="anfSearchInp" placeholder="${t("c.search")}..." oninput="anfFilterList(this.value)" style="padding-left:28px"></div>`;
  h += `<div class="mode-tabs" style="flex-shrink:0">`;
  h += `<span class="mode-tab ${ANF_SORT==="kat"?"on":""}" onclick="ANF_SORT='kat';renderAnfModal()" title="${LANG==="vi"?"Theo danh mục":"Nach Kategorie"}">🏷</span>`;
  h += `<span class="mode-tab ${ANF_SORT==="name"?"on":""}" onclick="ANF_SORT='name';renderAnfModal()" title="${LANG==="vi"?"Theo tên":"Nach Name"}">A-Z</span>`;
  h += `<span class="mode-tab ${ANF_SORT==="lager"?"on":""}" onclick="ANF_SORT='lager';renderAnfModal()" title="${LANG==="vi"?"Theo tồn kho":"Nach Bestand"}">📊</span>`;
  h += `<span class="mode-tab ${ANF_SORT==="fehl"?"on":""}" onclick="ANF_SORT='fehl';renderAnfModal()" title="${LANG==="vi"?"Thiếu trước":"Fehlmenge zuerst"}">⚠</span>`;
  h += `</div></div>`;

  h += `<div id="anfTableWrap">`;
  h += renderAnfTable(items, brId);
  h += `</div>`;

  // Add article to this Bereich
  if (unassigned.length) {
    h += `<div style="display:flex;gap:5px;align-items:center;margin-top:8px">`;
    h += `<select class="sel" id="anf_add_art" style="flex:1"><option value="">— ${LANG==="vi"?"Thêm SP":"Artikel hinzufügen"} —</option>${unassigned.map(a=>`<option value="${a.id}">${esc(artN(a))} (${esc(a.einheit)})</option>`).join("")}</select>`;
    h += `<button class="btn btn-o btn-sm" onclick="anfAddItem()">+ ${LANG==="vi"?"Thêm":"Hinzufügen"}</button>`;
    h += `</div>`;
  }

  // Auto-Bestellliste warning
  if (emptyCount > 0) {
    h += `<div style="margin-top:10px;padding:8px 12px;background:var(--rA);border:1px solid rgba(239,68,68,.15);border-radius:6px;font-size:11.5px;display:flex;align-items:center;gap:6px">`;
    h += `<span style="font-size:16px">🛒</span><div><div style="color:var(--rd);font-weight:600">${emptyCount} ${LANG==="vi"?"SP hết hàng trong kho":"Artikel ohne Lagerbestand"}</div>`;
    h += `<div style="color:var(--t2);font-size:10.5px">${LANG==="vi"?"Sẽ tự động thêm vào danh sách đặt hàng khi xác nhận":"Werden bei Bestätigung automatisch zur Bestellliste hinzugefügt"}</div></div></div>`;
  }

  h += `<div style="margin-top:10px;padding:10px 12px;background:var(--yA);border:1px solid rgba(245,158,11,.2);border-radius:6px;font-size:11.5px;color:var(--yl)">⚠ ${LANG==="vi"?"Bước 1/2: Tạo yêu cầu bổ sung. Hàng chưa được xuất kho.":"Schritt 1/2: Anforderung erstellen. Ware wird noch NICHT abgebucht."}</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="createAnforderung('${brId}')">✓ ${LANG==="vi"?"Xác nhận yêu cầu (1/2)":"Anforderung erstellen (1/2)"}</button></div></div></div>`;

  document.body.insertAdjacentHTML("beforeend", h);
}

function renderAnfTable(items, brId) {
  const br = D.bereiche.find(x=>x.id===brId);
  const stId = br?.standortId;

  // Sort items
  let sorted = [...items.map((it,i) => ({...it, _idx: i}))];
  if (ANF_SORT === "name") {
    sorted.sort((a,b) => (artN(a.art)||"").localeCompare(artN(b.art)||""));
  } else if (ANF_SORT === "lager") {
    sorted.sort((a,b) => a.lagerIst - b.lagerIst);
  } else if (ANF_SORT === "fehl") {
    sorted.sort((a,b) => {
      const fehlA = Math.max(0, a.soll - a.lagerIst);
      const fehlB = Math.max(0, b.soll - b.lagerIst);
      return fehlB - fehlA; // highest shortage first
    });
  } else if (ANF_SORT === "kat") {
    // Group by first category
    sorted.sort((a,b) => {
      const katA = a.art?.kategorien?.[0] || "zzz";
      const katB = b.art?.kategorien?.[0] || "zzz";
      if (katA !== katB) return katA.localeCompare(katB);
      return (artN(a.art)||"").localeCompare(artN(b.art)||"");
    });
  }

  let h = "";
  let lastKat = null;

  sorted.forEach(it => {
    const i = it._idx;
    const isEmpty = it.lagerIst <= 0;
    const lagerort = it.art?.lagerort?.[it.quelleId||stId] || "";
    const fehl = Math.max(0, it.soll - it.lagerIst);

    // Category header (only in "kat" mode)
    if (ANF_SORT === "kat") {
      const katId = it.art?.kategorien?.[0] || null;
      if (katId !== lastKat) {
        lastKat = katId;
        const kat = katId ? D.kategorien.find(k=>k.id===katId) : null;
        const katName = kat ? katN(kat) : (LANG==="vi"?"Không danh mục":"Ohne Kategorie");
        const katColor = kat?.farbe || "var(--t3)";
        const katCount = sorted.filter(x => (x.art?.kategorien?.[0]||null) === katId).length;
        h += `<div style="display:flex;align-items:center;gap:6px;padding:8px 8px 4px;margin-top:${lastKat===katId&&sorted.indexOf(it)===0?"0":"4"}px">`;
        h += `<div style="width:4px;height:16px;border-radius:2px;background:${katColor}"></div>`;
        h += `<span style="font-size:11px;font-weight:700;color:${katColor}">${esc(katName)}</span>`;
        h += `<span style="font-size:9px;color:var(--t3)">(${katCount})</span>`;
        h += `<div style="flex:1;height:1px;background:var(--bd)"></div>`;
        h += `</div>`;
      }
    }

    h += `<div class="anf-row" data-name="${norm(it.art?.name||"")} ${norm(it.art?.name_vi||"")}" style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--bd);${isEmpty?"background:var(--rA);border-radius:6px;margin-bottom:2px":""}">`;
    // Left: Article info with thumbnail
    h += `<div class="th" style="width:30px;height:30px">${it.art?.bilder?.length?`<img src="${esc(it.art.bilder[0])}" style="width:100%;height:100%;object-fit:cover">`:""}</div>`;
    h += `<div style="flex:1;min-width:0">`;
    h += `<div style="font-weight:600;font-size:12.5px">${esc(artN(it.art))}</div>`;
    h += `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px">`;
    if (lagerort) h += `<span class="loc-tag" style="font-size:8.5px;padding:0 4px">📦 ${esc(lagerort)}</span>`;
    h += `<span style="font-size:9.5px;color:var(--t3)">${LANG==="vi"?"Chuẩn":"Soll"}: ${it.soll}</span>`;
    h += `<span style="font-size:9.5px;font-family:var(--m);color:${it.lagerIst>=it.soll?"var(--gn)":it.lagerIst>0?"var(--yl)":"var(--rd)"};font-weight:${isEmpty?"700":"500"}">${LANG==="vi"?"Kho":"Lager"}: ${it.lagerIst}${isEmpty?" ⚠":""}</span>`;
    if (it.isExtern) h += `<span style="font-size:8px;padding:1px 4px;background:var(--pA);color:var(--pu);border-radius:3px;font-weight:600">← ${esc(it.quelleName||"")}</span>`;
    if (fehl > 0) h += `<span style="font-size:8.5px;padding:1px 4px;background:var(--rA);color:var(--rd);border-radius:3px;font-weight:600">−${fehl}</span>`;
    h += `</div></div>`;
    // Right: Input + Unit + Remove
    h += `<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">`;
    h += `<input class="inp" type="number" min="0" value="${it._enteredQty||0}" id="anf_qty_${i}" style="width:55px;text-align:center;padding:5px;font-family:var(--m);font-size:15px;font-weight:700;border:2px solid ${(it._enteredQty||0)>0?"var(--gn)":"var(--ac)"}" placeholder="0">`;
    h += `<span style="font-size:10px;color:var(--t3);min-width:22px">${esc(it.art?.einheit||"")}</span>`;
    h += `<button class="bi dn" onclick="anfRemItem(${i})" style="font-size:10px">✕</button>`;
    h += `</div></div>`;
  });
  return h;
}

function anfFilterList(q) {
  if(_IME)return;
  const ql = norm(q);
  document.querySelectorAll(".anf-row").forEach(row => {
    const name = row.getAttribute("data-name") || "";
    row.style.display = !ql || name.includes(ql) ? "" : "none";
  });
}

function anfAddItem() {
  const sel = document.getElementById("anf_add_art");
  const artId = sel?.value;
  if (!artId) return;
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  const br = D.bereiche.find(x=>x.id===window._anfBrId);
  const lagerIst = a.istBestand[br?.standortId]||0;

  // Add to Bereich permanently
  br.artikel.push({ artikelId: artId, soll: 1 });
  save();

  // Add to modal items
  window._anfItems.push({ artikelId: artId, art: a, soll: 1, lagerIst, verbrauch: 0 });

  // Re-render modal
  renderAnfModal();
  toast(`${artN(a)} → ${br?.icon} ${LANG==="vi"&&br?.name_vi?br.name_vi:br?.name} +`,"s");
}

function anfRemItem(idx) {
  const it = window._anfItems[idx];
  if (!it) return;
  // Remove from Bereich
  const br = D.bereiche.find(x=>x.id===window._anfBrId);
  if (br) { br.artikel = br.artikel.filter(ba=>ba.artikelId!==it.artikelId); save(); }
  // Remove from modal
  window._anfItems.splice(idx, 1);
  renderAnfModal();
}

function createAnforderung(brId) {
  const br = D.bereiche.find(x=>x.id===brId);
  if (!br) return;
  const items = [];
  const bestellItems = [];

  for (let i = 0; i < window._anfItems.length; i++) {
    const el = document.getElementById("anf_qty_" + i);
    const qty = parseInt(el?.value) || 0;
    const it = window._anfItems[i];
    if (qty > 0 && it) {
      items.push({ artikelId: it.artikelId, menge: qty, quelleId: it.quelleId || br.standortId });
      // Auto-add to Bestellliste if lager is 0
      if (it.lagerIst <= 0) {
        const a = it.art;
        const qId = it.quelleId || br.standortId;
        const bestL = a?.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]) : null;
        const exists = D.bestellliste.find(x=>x.artikelId===it.artikelId && x.standortId===qId);
        if (!exists) {
          const empfohlen = Math.max(qty, (a?.sollBestand[qId]||0) - (a?.istBestand[qId]||0));
          bestellItems.push({ id: uid(), artikelId: it.artikelId, standortId: qId, menge: empfohlen, lieferantId: bestL?.lieferantId||"" });
        }
      }
    }
  }
  if (!items.length) { toast(LANG==="vi"?"Không có mục nào":"Keine Position","e"); return; }

  // Add to Bestellliste
  if (bestellItems.length) {
    bestellItems.forEach(bi => D.bestellliste.push(bi));
    toast(`🛒 ${bestellItems.length} → ${t("nav.orderlist")}`, "i");
  }

  if (!D.anforderungen) D.anforderungen = [];
  const anf = { id: uid(), bereichId: brId, standortId: br.standortId, items, status: "offen", datum: nw(), erstelltVon: U.id };
  D.anforderungen.unshift(anf);
  save(); closeModal();
  showVerbrauchBon(anf);
}

// ═══ VERBRAUCH-BON (Receipt) ═══
function showVerbrauchBon(anf) {
  const br = D.bereiche.find(x=>x.id===anf.bereichId);
  const st = D.standorte.find(s=>s.id===anf.standortId);
  const usr = D.users.find(u=>u.id===anf.erstelltVon);
  const brName = br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):"?";
  const anfNr = "#ANF-" + anf.id.slice(-5).toUpperCase();
  const dtStr = new Date(anf.datum).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

  let h = `<div class="mo-ov" id="bonOverlay" style="z-index:200;background:rgba(0,0,0,.75)"><div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;max-height:100vh;overflow-y:auto" onclick="event.stopPropagation()">`;

  // Canvas container
  h += `<canvas id="bonCanvas" style="border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);max-width:95vw"></canvas>`;

  // Buttons
  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">`;
  h += `<button class="btn btn-p" onclick="saveBonImage()" style="font-size:13px;padding:8px 20px">📥 ${LANG==="vi"?"Lưu ảnh":"Als Bild speichern"}</button>`;
  h += `<button class="btn btn-g" id="bonShareBtn" onclick="shareBon()" style="font-size:13px;padding:8px 20px;display:none">📤 ${LANG==="vi"?"Chia sẻ":"Teilen"}</button>`;
  h += `<button class="btn btn-o" onclick="closeBon()" style="font-size:13px;padding:8px 20px">✓ ${LANG==="vi"?"Đóng":"Schließen"}</button>`;
  h += `</div>`;

  h += `</div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);

  // Draw bon on canvas
  drawBon(anf, br, st, usr, brName, anfNr, dtStr);

  // Show share button if available
  if (navigator.share) { document.getElementById("bonShareBtn").style.display = ""; }
}

function drawBon(anf, br, st, usr, brName, anfNr, dtStr) {
  const canvas = document.getElementById("bonCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 380, pad = 20, lineH = 22, smallH = 16;

  // Calculate height
  const itemCount = anf.items.length;
  const H = pad + 50 + 10 + lineH*4 + 16 + (itemCount * lineH) + 16 + lineH*2 + 30 + pad;

  canvas.width = W * 2; canvas.height = H * 2;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.scale(2, 2); // Retina

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  const r=12; ctx.moveTo(r,0); ctx.lineTo(W-r,0); ctx.quadraticCurveTo(W,0,W,r); ctx.lineTo(W,H-r); ctx.quadraticCurveTo(W,H,W-r,H); ctx.lineTo(r,H); ctx.quadraticCurveTo(0,H,0,H-r); ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.fill();

  let y = pad;

  // Header
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 16px 'Outfit', Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(D.einstellungen.firmenname, W/2, y + 18);
  y += 24;
  ctx.font = "500 12px 'Outfit', Helvetica, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText(st?.name || "", W/2, y + 14);
  y += 22;

  // Divider
  ctx.strokeStyle = "#E2E8F0"; ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 12;

  // Title
  ctx.fillStyle = br?.farbe || "#3B82F6";
  ctx.font = "bold 15px 'Outfit', Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${br?.icon||"📦"} ${LANG==="vi"?"PHIẾU TIÊU THỤ":"VERBRAUCH-BELEG"}`, W/2, y + 16);
  y += 28;

  // Info lines
  ctx.font = "500 12px 'Outfit', Helvetica, sans-serif";
  ctx.textAlign = "left";
  const info = [
    [`${LANG==="vi"?"Ngày":"Datum"}:`, dtStr],
    [`${LANG==="vi"?"Khu vực":"Bereich"}:`, `${br?.icon||""} ${brName}`],
    [`${LANG==="vi"?"NV":"Mitarbeiter"}:`, usr?.name||"?"],
    [`${LANG==="vi"?"Mã":"Nr."}:`, anfNr],
  ];
  info.forEach(([label, val]) => {
    ctx.fillStyle = "#94A3B8"; ctx.fillText(label, pad + 4, y + 13);
    ctx.fillStyle = "#1E293B"; ctx.font = "600 12px 'Outfit', Helvetica, sans-serif"; ctx.fillText(val, pad + 90, y + 13);
    ctx.font = "500 12px 'Outfit', Helvetica, sans-serif";
    y += lineH;
  });

  // Divider
  y += 4;
  ctx.strokeStyle = "#E2E8F0"; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 12;

  // Items header
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 9px 'Outfit', Helvetica, sans-serif";
  ctx.fillText(LANG==="vi"?"SỐ LƯỢNG":"MENGE", pad + 4, y + 10);
  ctx.fillText(LANG==="vi"?"SẢN PHẨM":"ARTIKEL", pad + 80, y + 10);
  y += smallH;

  // Items
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  let totalMenge = 0;
  anf.items.forEach(it => {
    const a = D.artikel.find(x=>x.id===it.artikelId);
    ctx.fillStyle = "#1E293B";
    ctx.fillText(`${it.menge} ${a?.einheit||""}`, pad + 4, y + 14);
    ctx.font = "500 12px 'Outfit', Helvetica, sans-serif";
    ctx.fillText(artN(a), pad + 80, y + 14);
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    totalMenge += it.menge;
    y += lineH;
  });

  // Divider
  y += 4;
  ctx.strokeStyle = "#E2E8F0"; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 12;

  // Total
  ctx.fillStyle = "#64748B";
  ctx.font = "500 11px 'Outfit', Helvetica, sans-serif";
  ctx.fillText(`${anf.items.length} ${LANG==="vi"?"sản phẩm":"Artikel"} · ${totalMenge} ${LANG==="vi"?"đơn vị":"Einheiten"}`, pad + 4, y + 12);
  y += lineH;

  // Status
  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 11px 'Outfit', Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`⏳ ${LANG==="vi"?"Chờ xác nhận (Bước 2/2)":"Wartet auf Bestätigung (Schritt 2/2)"}`, W/2, y + 12);
}

function saveBonImage() {
  const canvas = document.getElementById("bonCanvas");
  if (!canvas) return;
  const anf = D.anforderungen[0];
  const anfNr = anf ? "ANF-" + anf.id.slice(-5).toUpperCase() : "BON";
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `Verbrauch_${anfNr}_${td()}.png`;
  a.click();
  toast(`📥 ${LANG==="vi"?"Đã lưu ảnh":"Bild gespeichert"}`,"s");
}

async function shareBon() {
  const canvas = document.getElementById("bonCanvas");
  if (!canvas || !navigator.share) return;
  try {
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    const anf = D.anforderungen[0];
    const anfNr = anf ? "ANF-" + anf.id.slice(-5).toUpperCase() : "BON";
    const file = new File([blob], `Verbrauch_${anfNr}_${td()}.png`, { type: "image/png" });
    await navigator.share({
      title: `${D.einstellungen.firmenname} — ${LANG==="vi"?"Phiếu tiêu thụ":"Verbrauch-Beleg"}`,
      text: anfNr,
      files: [file]
    });
    toast(`📤 ${LANG==="vi"?"Đã chia sẻ":"Geteilt"}`,"s");
  } catch(e) {
    if (e.name !== "AbortError") toast(LANG==="vi"?"Lỗi chia sẻ":"Teilen fehlgeschlagen","e");
  }
}

function closeBon() {
  const ov = document.getElementById("bonOverlay");
  if (ov) ov.remove();
  render();
}

function showBereichDetail(brId) { openAnforderungModal(brId); }

function canManageBereiche() {
  return can(U.role, "bereiche.manage") || can(U.role, "bereiche");
}
function canAccessBereich(brId) {
  const userBr = U.bereiche || ["all"];
  if (userBr.includes("all")) return true;
  return userBr.includes(brId);
}

function editBereich(id) {
  if (!canManageBereiche()) { toast("❌","e"); return; }
  const br = id ? D.bereiche.find(x=>x.id===id) : null;
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const f = br ? JSON.parse(JSON.stringify(br)) : {id:uid(),name:"",name_vi:"",standortId:vS[0]?.id||"",farbe:"#3B82F6",icon:"🍽",artikel:[]};
  const icons = ["🍽","🔥","🍣","🍸","🥗","🍕","☕","🧊","📦","🎯"];
  const colors = ["#3B82F6","#F59E0B","#10B981","#8B5CF6","#EF4444","#EC4899","#14B8A6","#F97316"];
  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${br?t("c.edit"):t("c.new")} ${t("rst.bereich")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div class="g2"><div class="fg"><label>${t("c.name")} (DE) *</label><input class="inp" id="bre_name" value="${esc(f.name)}"></div><div class="fg"><label>${t("c.name")} (VI)</label><input class="inp" id="bre_name_vi" value="${esc(f.name_vi||"")}"></div></div>`;
  h += `<div class="g2"><div class="fg"><label>${t("c.location")} *</label><select class="sel" id="bre_standort">${vS.map(s=>`<option value="${s.id}" ${f.standortId===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div><div class="fg"><label>Icon</label><div style="display:flex;gap:4px;flex-wrap:wrap">${icons.map(ic=>`<span style="font-size:18px;cursor:pointer;padding:2px 4px;border-radius:4px;${f.icon===ic?"background:var(--aA)":""}" onclick="document.getElementById('bre_icon').value='${ic}';this.parentElement.querySelectorAll('span').forEach(s=>s.style.background='');this.style.background='var(--aA)'">${ic}</span>`).join("")}<input type="hidden" id="bre_icon" value="${f.icon||"🍽"}"></div></div></div>`;
  h += `<div class="fg"><label>${t("c.color")}</label><div style="display:flex;gap:4px">${colors.map(c=>`<div onclick="document.getElementById('bre_farbe').value='${c}';this.parentElement.querySelectorAll('div').forEach(d=>d.style.border='3px solid transparent');this.style.border='3px solid #fff'" style="width:24px;height:24px;border-radius:4px;background:${c};cursor:pointer;border:3px solid ${f.farbe===c?"#fff":"transparent"}"></div>`).join("")}<input type="hidden" id="bre_farbe" value="${f.farbe}"></div></div>`;
  h += `<div style="font-size:9.5px;font-weight:700;color:var(--t2);margin:10px 0 6px;text-transform:uppercase">${t("c.article")} & ${t("rst.sollbestand")}</div>`;
  h += `<div style="font-size:9px;color:var(--t3);margin-bottom:6px;padding:4px 8px;background:var(--b3);border-radius:4px">💡 ${LANG==="vi"?"\"Nguồn\" = kho nào bị trừ hàng khi bổ sung":"\"Quelle\" = aus welchem Lager wird beim Auffüllen abgebucht"}</div>`;
  h += `<div id="bre_artikel">`;
  const stOpts = D.standorte.filter(s=>s.aktiv).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  (f.artikel||[]).forEach((ba,i) => { h += `<div style="display:flex;gap:5px;align-items:center;margin-bottom:3px" id="bre_art_${i}"><select class="sel" style="flex:2" id="bre_art_id_${i}">${D.artikel.map(a2=>`<option value="${a2.id}" ${ba.artikelId===a2.id?"selected":""}>${esc(artN(a2))} (${esc(a2.einheit)})</option>`).join("")}</select><input class="inp" style="flex:1;max-width:60px" type="number" min="1" id="bre_art_soll_${i}" value="${ba.soll}"><select class="sel" style="flex:1;font-size:10px" id="bre_art_quelle_${i}" title="${LANG==="vi"?"Nguồn":"Quelle"}">${D.standorte.filter(s=>s.aktiv).map(s=>`<option value="${s.id}" ${(ba.quelleId||f.standortId)===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select><button class="bi dn" onclick="document.getElementById('bre_art_${i}').remove()">✕</button></div>`; });
  h += `</div><button class="btn btn-o btn-sm" onclick="breAddArtikel()">+ ${t("c.article")}</button>`;
  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveBereich('${f.id}',${br?'true':'false'})">${t("c.save")}</button></div></div></div>`;
  window._breForm = f;
  document.body.insertAdjacentHTML("beforeend", h);
}
let _breArtIdx=100;
function breAddArtikel() { const i=_breArtIdx++; const c=document.getElementById("bre_artikel"); if(!c)return; const defSt=document.getElementById("bre_standort")?.value||D.standorte[0]?.id||""; c.insertAdjacentHTML("beforeend",`<div style="display:flex;gap:5px;align-items:center;margin-bottom:3px" id="bre_art_${i}"><select class="sel" style="flex:2" id="bre_art_id_${i}">${D.artikel.map(a=>`<option value="${a.id}">${esc(artN(a))} (${esc(a.einheit)})</option>`).join("")}</select><input class="inp" style="flex:1;max-width:60px" type="number" min="1" id="bre_art_soll_${i}" value="1"><select class="sel" style="flex:1;font-size:10px" id="bre_art_quelle_${i}" title="${LANG==="vi"?"Nguồn":"Quelle"}">${D.standorte.filter(s=>s.aktiv).map(s=>`<option value="${s.id}" ${s.id===defSt?"selected":""}>${esc(s.name)}</option>`).join("")}</select><button class="bi dn" onclick="document.getElementById('bre_art_${i}').remove()">✕</button></div>`); }
function saveBereich(id,isEdit) {
  const name=document.getElementById("bre_name")?.value||""; if(!name){toast("Name!","e");return;}
  const brStId = document.getElementById("bre_standort")?.value||"";
  const f={id,name,name_vi:document.getElementById("bre_name_vi")?.value||"",standortId:brStId,farbe:document.getElementById("bre_farbe")?.value||"#3B82F6",icon:document.getElementById("bre_icon")?.value||"🍽",artikel:[]};
  document.querySelectorAll('[id^="bre_art_id_"]').forEach(sel=>{const idx=sel.id.replace("bre_art_id_","");const s2=document.getElementById("bre_art_soll_"+idx);const q=document.getElementById("bre_art_quelle_"+idx);if(sel&&s2){const quelleId=q?.value||brStId;f.artikel.push({artikelId:sel.value,soll:Math.max(1,parseInt(s2.value)||1),quelleId});}});
  if(isEdit){const i=D.bereiche.findIndex(x=>x.id===id);if(i>=0)D.bereiche[i]=f;}else D.bereiche.push(f);
  save();closeModal();render();toast("✓","s");
  if (typeof sbSaveBereich === "function") sbSaveBereich(f).catch(e => console.error("sbSaveBereich:", e));
}
function delBereich(id){if(!canManageBereiche()){toast("❌","e");return;}const br=D.bereiche.find(x=>x.id===id);cConfirm(`${br?.icon} ${br?.name} ?`,()=>{D.bereiche=D.bereiche.filter(x=>x.id!==id);save();render();if(typeof sbDeleteBereich==="function")sbDeleteBereich(id).catch(e=>console.error("sbDeleteBereich:",e));});}

// ═══ RESTAURANT: AUFFÜLLUNG (Step 2: confirm & book + undo) ═══
function renderRstAuffuellung(vS, aS) {
  if (!D.anforderungen) D.anforderungen = [];
  if (!D.auffuellungen) D.auffuellungen = [];
  const sids = aS ? [aS] : vS.map(s=>s.id);
  const userBr = U.bereiche || ["all"];
  const canSeeAnf = (a) => sids.includes(a.standortId) && (userBr.includes("all") || userBr.includes(a.bereichId));
  const offen = D.anforderungen.filter(a=>a.status==="offen" && canSeeAnf(a));
  const erledigt = D.anforderungen.filter(a=>a.status==="erledigt" && canSeeAnf(a)).slice(0,20);

  let h = `<div class="mn-h"><div class="mn-t">📦 ${t("rst.auffuellung")}</div></div><div class="mn-c">`;

  // Summary
  h += `<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">`;
  h += `<div class="sc"><div class="sc-l">${LANG==="vi"?"Yêu cầu chờ":"Offene Anforderungen"}</div><div class="sc-v" style="color:${offen.length?"var(--yl)":"var(--gn)"}">${offen.length}</div></div>`;
  h += `<div class="sc"><div class="sc-l">${LANG==="vi"?"Đã hoàn thành hôm nay":"Erledigt heute"}</div><div class="sc-v" style="color:var(--gn)">${D.auffuellungen.filter(a=>{const br=D.bereiche.find(x=>x.id===a.bereichId);return a.datum?.slice(0,10)===td()&&br&&sids.includes(br.standortId)&&(userBr.includes("all")||userBr.includes(a.bereichId));}).length}</div></div>`;
  h += `</div>`;

  // ═══ PENDING ANFORDERUNGEN ═══
  if (offen.length) {
    h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--yl)">⏳ ${LANG==="vi"?"Yêu cầu chờ xác nhận (Bước 2/2)":"Offene Anforderungen (Schritt 2/2)"}</h3>`;
    offen.forEach(anf => {
      const br = D.bereiche.find(x=>x.id===anf.bereichId);
      const st = D.standorte.find(s=>s.id===anf.standortId);
      const usr = D.users.find(u=>u.id===anf.erstelltVon);
      const totalMenge = anf.items.reduce((s,it)=>s+it.menge,0);

      h += `<div class="cd" style="margin-bottom:10px;border-left:4px solid ${br?.farbe||"var(--yl)"}">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">`;
      h += `<div><div style="font-weight:700;font-size:14px">${br?.icon||"📦"} ${esc(br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):"?")} <span style="font-size:10.5px;color:var(--t3);font-weight:400">— ${esc(st?.name||"")}</span></div>`;
      h += `<div style="font-size:10.5px;color:var(--t2);margin-top:2px">${LANG==="vi"?"Tạo bởi":"Erstellt von"}: ${esc(usr?.name||"?")} · ${fDT(anf.datum)}</div></div>`;
      h += `<div style="display:flex;gap:4px"><button class="btn btn-g" onclick="confirmAnforderung('${anf.id}')">✓ ${LANG==="vi"?"Xác nhận & Xuất kho (2/2)":"Bestätigen & Abbuchen (2/2)"}</button><button class="btn btn-d" onclick="cancelAnforderung('${anf.id}')">${LANG==="vi"?"Hủy":"Stornieren"}</button></div>`;
      h += `</div>`;

      h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
      h += `<th style="background:transparent;padding:4px 8px">${t("c.article")}</th>`;
      h += `<th style="background:transparent;padding:4px 8px">${t("c.storageloc")}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Kho":"Lager"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:center">${LANG==="vi"?"Yêu cầu":"Angefordert"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:center;color:var(--ac);font-weight:700">${LANG==="vi"?"Bổ sung":"Auffüllen"}</th>`;
      h += `</tr></thead><tbody>`;
      anf.items.forEach((it, itIdx) => {
        const a = D.artikel.find(x=>x.id===it.artikelId);
        const qId = it.quelleId || anf.standortId;
        const lagerIst = a?.istBestand[qId]||0;
        const lagerort = a?.lagerort?.[qId]||"";
        const isExtern = qId !== anf.standortId;
        const quelleName = isExtern ? (D.standorte.find(s=>s.id===qId)?.name||"") : "";
        const maxFill = Math.min(it.menge, lagerIst);
        const notEnough = lagerIst < it.menge;
        h += `<tr style="border-bottom:1px solid var(--bd);${lagerIst<=0?"background:var(--rA)":""}">`;
        h += `<td style="padding:5px 8px;font-weight:600">${esc(artN(a))}<div style="font-size:9px;color:var(--t3)">${esc(a?.sku||"")}${isExtern?` <span style="color:var(--pu);font-weight:600">← ${esc(quelleName)}</span>`:""}</div></td>`;
        h += `<td style="padding:5px 8px">${lagerort?`<span class="loc-tag" style="font-size:9px">📦 ${esc(lagerort)}</span>`:`<span style="color:var(--t3);font-size:10px">—</span>`}</td>`;
        h += `<td style="padding:5px 8px;text-align:right;font-family:var(--m);color:${lagerIst>=it.menge?"var(--gn)":lagerIst>0?"var(--yl)":"var(--rd)"};font-weight:${lagerIst<=0?"700":"400"}">${lagerIst} ${esc(a?.einheit||"")}${lagerIst<=0?" ⚠":""}</td>`;
        h += `<td style="padding:5px 8px;text-align:center;font-family:var(--m);font-size:13px">${it.menge} ${esc(a?.einheit||"")}</td>`;
        h += `<td style="padding:5px 8px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:3px"><input class="inp" type="number" min="0" max="${lagerIst}" value="${maxFill}" id="anf_fill_${anf.id}_${itIdx}" style="width:60px;text-align:center;padding:4px;font-family:var(--m);font-size:14px;font-weight:700;border:2px solid ${notEnough?"var(--yl)":"var(--ac)"}"><span style="font-size:10px;color:var(--t3)">${esc(a?.einheit||"")}</span></div>${notEnough?`<div style="font-size:8.5px;color:var(--rd);margin-top:1px">max ${lagerIst}</div>`:""}</td>`;
        h += `</tr>`;
      });
      h += `</tbody></table>`;
      h += `<div style="text-align:right;margin-top:4px;font-size:11px;color:var(--t3)">${t("c.total")}: ${totalMenge} ${LANG==="vi"?"đơn vị":"Einheiten"} · ${anf.items.length} ${t("c.article")}</div>`;
      h += `</div>`;
    });
  } else {
    h += `<div style="text-align:center;padding:20px;color:var(--gn);margin-bottom:14px"><div style="font-size:28px;margin-bottom:4px">✅</div><div style="font-size:13px;font-weight:700">${LANG==="vi"?"Không có yêu cầu chờ":"Keine offenen Anforderungen"}</div></div>`;
  }

  // ═══ HISTORY with UNDO ═══
  const recent = D.auffuellungen.filter(af => {
    const br = D.bereiche.find(x=>x.id===af.bereichId);
    return br && sids.includes(br.standortId) && (userBr.includes("all") || userBr.includes(af.bereichId));
  }).slice(0, 15);
  if (recent.length) {
    h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">${LANG==="vi"?"Lịch sử bổ sung":"Auffüll-Historie"}</h3>`;
    h += `<div class="tw"><table><thead><tr><th>${t("c.date")}</th><th>${t("rst.bereich")}</th><th>${t("c.article")}</th><th>${t("c.quantity")}</th><th>${t("c.user")}</th><th style="width:60px"></th></tr></thead><tbody>`;
    recent.forEach(af => {
      const br = D.bereiche.find(x=>x.id===af.bereichId);
      const a = D.artikel.find(x=>x.id===af.artikelId);
      const u = D.users.find(x=>x.id===af.benutzer);
      const canUndo = af.datum && (new Date()-new Date(af.datum)) < 3600000; // 1h window
      h += `<tr><td style="font-family:var(--m);font-size:10px">${fDT(af.datum)}</td><td>${br?`${br.icon} ${esc(LANG==="vi"&&br.name_vi?br.name_vi:br.name)}`:""}</td><td style="font-weight:600">${esc(artN(a))}</td><td style="font-family:var(--m);font-weight:600;color:var(--rd)">-${af.menge} ${esc(a?.einheit||"")}</td><td style="color:var(--t2)">${esc(u?.name||"")}</td>`;
      h += `<td>${canUndo?`<button class="btn btn-o btn-sm" onclick="undoAuffuellung('${af.id}')" title="${LANG==="vi"?"Hoàn tác":"Rückgängig"}">↩</button>`:""}</td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;
  }

  h += `</div>`;
  return h;
}

// Step 2: Confirm Anforderung → book out stock
function confirmAnforderung(anfId) {
  if (_actionLock) return;
  _actionLock = true; setTimeout(() => _actionLock = false, 1500);
  const anf = D.anforderungen.find(x=>x.id===anfId);
  if (!anf || anf.status !== "offen") return;
  const br = D.bereiche.find(x=>x.id===anf.bereichId);

  // Read fill quantities from inputs
  const fillData = anf.items.map((it, i) => {
    const inp = document.getElementById(`anf_fill_${anfId}_${i}`);
    const qty = Math.max(0, parseInt(inp?.value) || 0);
    const a = D.artikel.find(x=>x.id===it.artikelId);
    const qId = it.quelleId || anf.standortId;
    const lagerIst = a?.istBestand[qId]||0;
    return { ...it, fillQty: Math.min(qty, lagerIst), art: a, lagerIst, angefordert: it.menge, quelleId: qId };
  });
  const totalFill = fillData.reduce((s,d)=>s+d.fillQty, 0);
  const skipped = fillData.filter(d=>d.fillQty===0 && d.angefordert>0);

  let label = LANG==="vi"
    ? `Xuất kho ${totalFill} đơn vị cho ${br?.icon} ${br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):"?"}?`
    : `${totalFill} Einheiten für ${br?.icon} ${br?.name} aus dem Lager abbuchen?`;
  if (skipped.length) {
    label += `\n\n⚠ ${skipped.length} ${LANG==="vi"?"SP không được bổ sung":"Artikel werden nicht aufgefüllt"} (${LANG==="vi"?"SL = 0":"Menge = 0"})`;
  }
  label += `\n\n${LANG==="vi"?"Tồn kho sẽ bị trừ ngay.":"Bestand wird sofort reduziert."}`;

  cConfirm(label, () => {
    let count = 0;
    fillData.forEach(d => {
      if (d.fillQty <= 0 || !d.art) return;
      const qId = d.quelleId;
      d.art.istBestand[qId] = Math.max(0, d.lagerIst - d.fillQty);
      D.bewegungen.unshift({ id: uid(), typ: "ausgang", artikelId: d.artikelId, standortId: qId, menge: d.fillQty, datum: nw(), benutzer: U.id, referenz: `RST-${br?.icon||""}${br?.name||""}`, notiz: `${LANG==="vi"?"Bổ sung":"Auffüllung"}: ${br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):""}${d.fillQty<d.angefordert?` (${d.fillQty}/${d.angefordert})`:""}${qId!==anf.standortId?" ← "+esc(D.standorte.find(s=>s.id===qId)?.name||""):""}`, lieferantId: "" });
      D.auffuellungen.unshift({ id: uid(), bereichId: anf.bereichId, artikelId: d.artikelId, menge: d.fillQty, datum: nw(), benutzer: U.id, anforderungId: anfId, quelleId: qId });
      count++;
    });
    anf.status = "erledigt"; anf.erledigtVon = U.id; anf.erledigtAm = nw();
    save(); render();
    // Supabase sync
    if (typeof sbSaveAnforderung === "function") sbSaveAnforderung(anf).catch(e => console.error("sbAnf:", e));
    fillData.forEach(d => { if (d.fillQty > 0) { const af = D.auffuellungen.find(x => x.artikelId === d.artikelId && x.anforderungId === anfId); if (af && typeof sbSaveAuffuellung === "function") sbSaveAuffuellung(af).catch(e => console.error("sbAuf:", e)); if (d.art && typeof sbSaveArtikel === "function") sbSaveArtikel(d.art).catch(e => console.error("sbArt:", e)); } });
    toast(`✓ ${count} ${t("c.article")} ${LANG==="vi"?"đã xuất kho":"abgebucht"} (${totalFill} ${LANG==="vi"?"đơn vị":"Einh."})`, "s");
  });
}

function cancelAnforderung(anfId) {
  if (!D.anforderungen) return;
  const anf = D.anforderungen.find(x=>x.id===anfId);
  if (!anf) { toast("Nicht gefunden","e"); return; }
  const label = LANG==="vi" ? "Hủy yêu cầu này?" : "Anforderung stornieren?";
  cConfirm(label, () => { D.anforderungen = D.anforderungen.filter(x=>x.id!==anfId); save(); render(); toast(LANG==="vi"?"Đã hủy":"Storniert","i"); if (typeof sbDeleteAnforderung === "function") sbDeleteAnforderung(anfId).catch(e => console.error("sbDelAnf:", e)); });
}

// Undo: reverse a completed Auffüllung entry
function undoAuffuellung(afId) {
  const af = D.auffuellungen.find(x=>x.id===afId);
  if (!af) return;
  const a = D.artikel.find(x=>x.id===af.artikelId);
  const br = D.bereiche.find(x=>x.id===af.bereichId);
  const label = LANG==="vi"
    ? `Hoàn tác: +${af.menge} ${artN(a)} trả lại kho?`
    : `Rückgängig: +${af.menge} ${artN(a)} zurück ins Lager?`;
  cConfirm(label, () => {
    if (a) {
      const stId = br?.standortId || D.standorte[0]?.id || "";
      a.istBestand[stId] = (a.istBestand[stId]||0) + af.menge;
      D.bewegungen.unshift({ id: uid(), typ: "eingang", artikelId: af.artikelId, standortId: stId, menge: af.menge, datum: nw(), benutzer: U.id, referenz: `UNDO-RST`, notiz: `${LANG==="vi"?"Hoàn tác bổ sung":"Auffüllung rückgängig"}: ${br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):""}`, lieferantId: "" });
    }
    D.auffuellungen = D.auffuellungen.filter(x=>x.id!==afId);
    save(); render();
    if (a && typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e));
    if (typeof sb !== "undefined") sb.from("auffuellungen").delete().eq("id", afId).catch(e => console.error("sbDelAuf:", e));
    toast(`↩ ${af.menge}× ${artN(a)} ${LANG==="vi"?"đã hoàn tác":"rückgängig"}`, "s");
  });
}

// ═══ STANDORTE (CRUD + Vergleich) ═══