// ═══ BESTELLUNGEN (Orders) ═══
function renderBestellungen(vS, aS) {
  const sids = aS ? [aS] : vS.map(s=>s.id);
  const filtB = D.bestellungen.filter(b=>sids.includes(b.standortId));
  const counts = { bestellt: filtB.filter(b=>b.status==="bestellt").length, geliefert: filtB.filter(b=>b.status==="geliefert").length, storniert: filtB.filter(b=>b.status==="storniert").length };
  const pendingTf = (D.transfers||[]).filter(t=>t.status==="unterwegs" && (sids.includes(t.vonId)||sids.includes(t.nachId))).length;

  let h = `<div class="mn-h"><div class="mn-t">${t("nav.orders")}</div><div class="mn-a">`;
  const todayCount = filtB.filter(b=>b.datum===td()).length;
  h += `<div class="mode-tabs">`;
  h += `<span class="mode-tab ${BEST_FILTER==="all"?"on":""}" onclick="BEST_FILTER='all';render()">${t("c.all")} (${filtB.length})</span>`;
  h += `<span class="mode-tab ${BEST_FILTER==="bestellt"?"on":""}" onclick="BEST_FILTER='bestellt';render()" style="${counts.bestellt?"color:var(--yl)":""}">⏳ ${counts.bestellt}</span>`;
  h += `<span class="mode-tab ${BEST_FILTER==="geliefert"?"on":""}" onclick="BEST_FILTER='geliefert';render()" style="${counts.geliefert?"color:var(--gn)":""}">✓ ${counts.geliefert}</span>`;
  h += `<span class="mode-tab ${BEST_FILTER==="storniert"?"on":""}" onclick="BEST_FILTER='storniert';render()">✕ ${counts.storniert}</span>`;
  if (todayCount) h += `<span class="mode-tab ${BEST_FILTER==="heute"?"on":""}" onclick="BEST_FILTER='heute';render()" style="color:var(--ac)">📅 ${LANG==="vi"?"Hôm nay":"Heute"} (${todayCount})</span>`;
  h += `<span class="mode-tab ${BEST_FILTER==="transfer"?"on":""}" onclick="BEST_FILTER='transfer';render()" style="${pendingTf?"color:var(--pu)":""}">⇄ ${LANG==="vi"?"Chuyển kho":"Umbuchen"} ${pendingTf?`(${pendingTf})`:""}</span>`;
  h += `</div>`;
  if (BEST_FILTER !== "transfer" && filtB.length && can(U.role,"export")) h += `<button class="btn btn-o btn-sm" onclick="exportBestellungenExcel()">⬇ Excel</button><button class="btn btn-o btn-sm" onclick="exportBestellungenPDF()">⬇ PDF</button><button class="btn btn-o btn-sm" onclick="exportBestellungenSevdesk()">⬇ sevDesk</button>`;
  h += `</div></div><div class="mn-c">`;

  // Search
  h += `<div style="margin-bottom:8px"><div class="srch"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" placeholder="${LANG==="vi"?"Tìm đơn hàng, SP, NCC...":"Bestellung, Artikel, Lieferant suchen..."}" id="bestSearch" value="${esc(BEST_SEARCH)}" oninput="if(_IME)return;BEST_SEARCH=this.value;render()" style="padding-right:${BEST_SEARCH?'28px':'9px'}">${BEST_SEARCH?`<button class="bi" onclick="BEST_SEARCH='';render()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;

  // Transfer tab
  if (BEST_FILTER === "transfer") {
    h += renderBestellungenTransfers();
    h += `</div>`;
    return h;
  }

  let filtered = BEST_FILTER === "all" ? [...filtB] : BEST_FILTER === "heute" ? filtB.filter(b=>b.datum===td()) : filtB.filter(b=>b.status===BEST_FILTER);

  // Search filter
  if (BEST_SEARCH) {
    const q = norm(BEST_SEARCH);
    filtered = filtered.filter(b => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const l = D.lieferanten.find(x=>x.id===b.lieferantId);
      return norm(artN(a)).includes(q) || norm(a?.sku||"").includes(q) || norm(l?.name||"").includes(q) || norm(b.referenz||"").includes(q);
    });
  }

  // Sort
  filtered.sort((a,b) => {
    let v = 0;
    const aA = D.artikel.find(x=>x.id===a.artikelId), bA = D.artikel.find(x=>x.id===b.artikelId);
    if (BEST_SORT==="datum") v = (a.datum||"").localeCompare(b.datum||"");
    else if (BEST_SORT==="artikel") v = artN(aA).localeCompare(artN(bA));
    else if (BEST_SORT==="standort") v = (D.standorte.find(s=>s.id===a.standortId)?.name||"").localeCompare(D.standorte.find(s=>s.id===b.standortId)?.name||"");
    else if (BEST_SORT==="lagerort") v = (aA?.lagerort?.[a.standortId]||"").localeCompare(bA?.lagerort?.[b.standortId]||"");
    else if (BEST_SORT==="menge") v = a.menge - b.menge;
    else if (BEST_SORT==="wert") { const pA=(aA?.lieferanten.find(x=>x.lieferantId===a.lieferantId)?.preis||0)*a.menge; const pB=(bA?.lieferanten.find(x=>x.lieferantId===b.lieferantId)?.preis||0)*b.menge; v=pA-pB; }
    else if (BEST_SORT==="status") { const so={bestellt:0,geliefert:1,storniert:2}; v=(so[a.status]||9)-(so[b.status]||9); }
    return BEST_SORT_DIR==="desc"?-v:v;
  });

  if (!filtered.length) {
    h += `<div style="text-align:center;padding:24px;color:var(--t3)">—</div></div>`;
    return h;
  }

  // Group by supplier
  const groups = {};
  filtered.forEach(b => {
    const key = b.lieferantId || "none";
    if (!groups[key]) groups[key] = { lief: D.lieferanten.find(x=>x.id===b.lieferantId), items: [] };
    groups[key].items.push(b);
  });
  // Sort within groups: bestellt first, then by date desc
  const statusOrder = { bestellt: 0, geliefert: 1, storniert: 2 };
  Object.values(groups).forEach(g => g.items.sort((a, b) => (statusOrder[a.status]||9) - (statusOrder[b.status]||9) || (b.datum||"").localeCompare(a.datum||"")));

  let grpIdx = 0;
  for (const [key, g] of Object.entries(groups)) {
    const offenCount = g.items.filter(b=>b.status==="bestellt").length;
    const grpWert = g.items.filter(b=>b.status==="bestellt").reduce((s, b) => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const p = a?.lieferanten.find(x=>x.lieferantId===b.lieferantId)?.preis||0;
      return s + p * b.menge;
    }, 0);
    const nd = g.lief ? nextDelivery(g.lief) : null;
    const gid = `bestGrp_${grpIdx++}`;
    const defaultOpen = offenCount > 0; // Auto-expand if has open orders

    h += `<div class="cd" style="margin-bottom:10px;border-left:3px solid ${offenCount?"var(--yl)":"var(--gn)"}">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:flex-start;cursor:pointer" onclick="const el=document.getElementById('${gid}');el.style.display=el.style.display==='none'?'':'none'">`;
    h += `<div><div style="font-weight:700;font-size:14px">${esc(g.lief?.name||(LANG==="vi"?"Không rõ":"Unbekannt"))} <span style="font-size:11px;color:var(--t3)">▾</span></div>`;
    if (g.lief) {
      h += `<div style="font-size:10.5px;color:var(--t2);margin-top:1px">${esc(g.lief.kontakt||"")} · ${esc(g.lief.email||"")}</div>`;
      if (nd) h += `<div style="font-size:10.5px;color:var(--gn);font-weight:600;margin-top:2px">📅 ${nd}</div>`;
    }
    h += `</div>`;
    h += `<div style="text-align:right" onclick="event.stopPropagation()"><span class="bp" style="background:var(--aA);color:var(--ac)">${g.items.length} ${t("c.article")}</span>`;
    if (offenCount) h += `<span class="bp" style="background:var(--yA);color:var(--yl);margin-left:3px">⏳ ${offenCount}</span>`;
    if (canP() && offenCount) h += `<div style="font-family:var(--m);font-weight:700;font-size:15px;margin-top:2px">${fC(grpWert)}</div>`;
    if (offenCount) h += `<button class="btn btn-g btn-sm" onclick="bestConfirmAll('${key}')" style="margin-top:4px">✓ ${LANG==="vi"?"Nhận tất cả":"Alle bestätigen"} (${offenCount})</button>`;
    h += `</div></div>`;

    h += `<div id="${gid}" style="${defaultOpen?"":"display:none;"}margin-top:8px">`;

    const bthS = (col,label) => `<th style="background:transparent;padding:4px 8px;cursor:pointer" onclick="bestSort('${col}')"><span style="display:inline-flex;align-items:center;gap:2px">${label} <span style="${BEST_SORT===col?"color:var(--ac);opacity:1":"opacity:.3"};font-size:8px">${bestSortIc(col)}</span></span></th>`;
    h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
    h += bthS("datum",t("c.date"));
    h += bthS("artikel",t("c.article"));
    h += bthS("standort",t("c.location"));
    h += bthS("lagerort",t("c.storageloc"));
    h += bthS("menge",t("c.quantity"));
    h += `<th style="background:transparent;padding:4px 8px;text-align:center;color:var(--ac);font-weight:700">${LANG==="vi"?"Nhận":"Empfangen"}</th>`;
    h += `${canP()?bthS("wert",t("c.value")):""}`;
    h += bthS("status",t("c.status"));
    h += `<th style="background:transparent;padding:4px 8px;width:50px"></th>`;
    h += `</tr></thead><tbody>`;

    g.items.forEach(b => {
      const a = D.artikel.find(x=>x.id===b.artikelId);
      const s = D.standorte.find(x=>x.id===b.standortId);
      const p = a?.lieferanten.find(x=>x.lieferantId===b.lieferantId)?.preis||0;
      const stC = { bestellt: "#F59E0B", geliefert: "#10B981", storniert: "#EF4444" }[b.status] || "#666";
      const conv = a ? formatUnitConv(b.menge, a) : "";
      const lagerort = a?.lagerort?.[b.standortId] || "";
      h += `<tr style="border-bottom:1px solid var(--bd)">`;
      h += `<td style="padding:5px 8px;font-family:var(--m);font-size:10px">${b.datum}</td>`;
      h += `<td style="padding:5px 8px;font-weight:600;cursor:pointer" onclick="showArtikelDetail('${b.artikelId}')">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}" style="width:22px;height:22px;border-radius:3px;object-fit:cover;vertical-align:middle;margin-right:4px">`:""}<span style="color:var(--ac)">${esc(artN(a))}</span><div style="font-size:9.5px;font-family:var(--m);color:var(--t3)">${esc(a?.sku||"")}</div></td>`;
      h += `<td style="padding:5px 8px;font-size:11.5px">${esc(s?.name||"")}</td>`;
      h += `<td style="padding:5px 8px">${lagerort?`<span class="loc-tag">📦 ${esc(lagerort)}</span>`:`<span style="color:var(--t3);font-size:10px">—</span>`}</td>`;
      h += `<td style="padding:5px 8px;text-align:right;font-family:var(--m);font-weight:600">${b.menge} ${esc(a?.einheit||"")}${conv?`<div class="unit-conv">= ${esc(conv)}</div>`:""}</td>`;
      // Empfangen column
      if (b.status === "bestellt") {
        h += `<td style="padding:5px 4px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:2px"><input class="inp" type="number" min="0" max="${b.menge*2}" value="${b.menge}" id="best_emp_${b.id}" style="width:50px;text-align:center;padding:3px;font-family:var(--m);font-size:13px;font-weight:700;border:2px solid var(--ac)"><span style="font-size:9px;color:var(--t3)">${esc(a?.einheit||"")}</span></div></td>`;
      } else if (b.status === "geliefert" && b.empfangen !== undefined && b.empfangen !== b.menge) {
        h += `<td style="padding:5px 8px;text-align:center;font-family:var(--m);font-size:11px;color:var(--rd);font-weight:600">${b.empfangen}/${b.menge}</td>`;
      } else {
        h += `<td style="padding:5px 8px;text-align:center;font-size:10px;color:var(--t3)">${b.status==="geliefert"?"✓":"—"}</td>`;
      }
      if (canP()) h += `<td style="padding:5px 8px;text-align:right;font-family:var(--m);font-weight:600">${fC(p*b.menge)}</td>`;
      h += `<td style="padding:5px 8px"><span class="bp" style="background:${stC}18;color:${stC}">${t("o."+b.status)||b.status}</span></td>`;
      h += `<td style="padding:5px 4px">${b.status==="bestellt"?`<button class="btn btn-g btn-sm" onclick="bestConfirmOne('${b.id}')" title="${LANG==="vi"?"Xác nhận":"Bestätigen"}">✓</button><button class="btn btn-d btn-sm" onclick="bestStatus('${b.id}','storniert')" title="${LANG==="vi"?"Hủy":"Stornieren"}" style="margin-left:2px">✕</button>`:""}</td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div></div>`;
  }

  h += `</div>`;
  return h;
}
function renderBestellungenTransfers() {
  const allTf = D.transfers || [];
  const pending = allTf.filter(t=>t.status==="unterwegs");
  const done = allTf.filter(t=>t.status!=="unterwegs").slice(0, 10);
  let h = "";

  // Pending
  if (pending.length) {
    h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--pu)">📦 ${pending.length} ${LANG==="vi"?"đang chờ xác nhận":"offene Transfers"}</h3>`;
    pending.forEach(tf => {
      const von = D.standorte.find(s=>s.id===tf.vonId);
      const nach = D.standorte.find(s=>s.id===tf.nachId);
      const usr = D.users.find(u=>u.id===tf.benutzer);
      h += `<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--pu)">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
      h += `<div><div style="font-weight:700">${esc(von?.name||"?")} → ${esc(nach?.name||"?")}</div>`;
      h += `<div style="font-size:10px;color:var(--t3)">${fDT(tf.datum)} · ${esc(usr?.name||"?")}</div></div>`;
      h += `<span class="bp" style="background:var(--pA);color:var(--pu)">📦 ${LANG==="vi"?"Đang chờ":"Unterwegs"}</span></div>`;

      // Items with editable qty
      h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
      h += `<th style="background:transparent;padding:3px 8px">${t("c.article")}</th>`;
      h += `<th style="background:transparent;padding:3px 8px">${t("c.storageloc")}</th>`;
      h += `<th style="background:transparent;padding:3px 8px;text-align:right">${LANG==="vi"?"Đã gửi":"Gesendet"}</th>`;
      h += `<th style="background:transparent;padding:3px 8px;text-align:center;color:var(--ac);font-weight:700">${LANG==="vi"?"Nhận":"Empfangen"}</th>`;
      h += `<th style="background:transparent;padding:3px 8px;text-align:right">${LANG==="vi"?"CL":"Diff"}</th>`;
      h += `</tr></thead><tbody>`;
      tf.items.forEach((it, i) => {
        const a = D.artikel.find(x=>x.id===it.artId);
        const lagerort = a?.lagerort?.[tf.nachId] || "";
        h += `<tr style="border-bottom:1px solid var(--bd)">`;
        h += `<td style="padding:4px 8px;font-weight:600">${esc(artN(a))}<div style="font-size:9px;color:var(--t3)">${esc(a?.einheit||"")}</div></td>`;
        h += `<td style="padding:4px 8px">${lagerort?`<span class="loc-tag" style="font-size:9px">📦 ${esc(lagerort)}</span>`:`<span style="color:var(--t3);font-size:10px">—</span>`}</td>`;
        h += `<td style="padding:4px 8px;text-align:right;font-family:var(--m);font-weight:600">${it.menge}</td>`;
        h += `<td style="padding:4px 8px;text-align:center"><input class="inp" type="number" min="0" max="${it.menge}" value="${it.menge}" id="tf_emp_${tf.id}_${i}" style="width:55px;text-align:center;padding:4px;font-family:var(--m);font-size:14px;font-weight:700;border:2px solid var(--ac)" onchange="tfCalcDiff('${tf.id}',${i},this.value,${it.menge})"></td>`;
        h += `<td style="padding:4px 8px;text-align:right" id="tf_diff_${tf.id}_${i}"><span style="font-family:var(--m);font-weight:700;color:var(--gn)">0</span></td>`;
        h += `</tr>`;
      });
      h += `</tbody></table>`;
      h += `<div id="tf_warn_${tf.id}" style="display:none;margin-top:6px;padding:6px 10px;background:var(--rA);border:1px solid rgba(239,68,68,.15);border-radius:6px;font-size:11px;color:var(--rd)"></div>`;
      h += `<div style="display:flex;gap:4px;margin-top:8px">`;
      h += `<button class="btn btn-g" onclick="confirmTransfer('${tf.id}',${tf.items.length})">✓ ${LANG==="vi"?"Nhập kho":"Wareneingang buchen"}</button>`;
      h += `<button class="btn btn-d btn-sm" onclick="rejectTransfer('${tf.id}')">✕ ${LANG==="vi"?"Từ chối":"Zurückweisen"}</button>`;
      h += `</div></div>`;
    });
  } else {
    h += `<div style="text-align:center;padding:20px;color:var(--gn)"><div style="font-size:24px;margin-bottom:4px">✅</div><div style="font-size:12px;font-weight:600">${LANG==="vi"?"Không có chuyển kho chờ":"Keine offenen Transfers"}</div></div>`;
  }

  // Recent completed
  if (done.length) {
    h += `<h3 style="font-size:12px;font-weight:700;margin:14px 0 6px;color:var(--t3)">${LANG==="vi"?"Gần đây":"Letzte Transfers"}</h3>`;
    done.forEach(tf => {
      const von = D.standorte.find(s=>s.id===tf.vonId);
      const nach = D.standorte.find(s=>s.id===tf.nachId);
      const stC = tf.status==="empfangen"?"var(--gn)":"var(--rd)";
      const details = tf.empfangenDetails || tf.items.map(it=>({artId:it.artId,gesendet:it.menge,empfangen:tf.status==="empfangen"?it.menge:0,diff:0}));
      const fehlCount = details.filter(d=>d.diff<0).length;
      h += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:11px">`;
      h += `<span>${fDT(tf.datum)} · ${esc(von?.name||"?")} → ${esc(nach?.name||"?")} · ${tf.items.length} Art.</span>`;
      h += `<div style="display:flex;gap:4px"><span class="bp" style="background:${stC}18;color:${stC}">${tf.status==="empfangen"?"✓":"↩"} ${tf.status}</span>${fehlCount?`<span class="bp" style="background:var(--rA);color:var(--rd)">${fehlCount} Fehl</span>`:""}</div></div>`;
    });
  }

  return h;
}

function bestConfirmOne(id) {
  const b = D.bestellungen.find(x=>x.id===id);
  if (!b) return;
  const a = D.artikel.find(x=>x.id===b.artikelId);
  const inp = document.getElementById(`best_emp_${id}`);
  const empfangen = Math.max(0, parseInt(inp?.value) || 0);
  const diff = empfangen - b.menge;

  let label = LANG==="vi"
    ? `Nhận hàng: ${artN(a)}\n\nĐã đặt: ${b.menge} ${a?.einheit||""}\nĐã nhận: ${empfangen} ${a?.einheit||""}`
    : `Wareneingang: ${artN(a)}\n\nBestellt: ${b.menge} ${a?.einheit||""}\nEmpfangen: ${empfangen} ${a?.einheit||""}`;
  if (diff < 0) label += `\n\n⚠ ${LANG==="vi"?"Thiếu":"Fehlmenge"}: ${Math.abs(diff)} ${a?.einheit||""} → ${LANG==="vi"?"sẽ được ghi nhận":"wird dokumentiert"}`;
  if (diff > 0) label += `\n\n📦 ${LANG==="vi"?"Thêm":"Mehrlieferung"}: +${diff} ${a?.einheit||""}`;

  cConfirm(label, () => {
    b.status = "geliefert";
    b.empfangen = empfangen;
    if (a && empfangen > 0) {
      a.istBestand[b.standortId] = (a.istBestand[b.standortId]||0) + empfangen;
      D.bewegungen.unshift({id:uid(),typ:"eingang",artikelId:b.artikelId,standortId:b.standortId,menge:empfangen,datum:nw(),benutzer:U.id,referenz:`B-${b.id}`,notiz:diff<0?`Fehlmenge: ${b.menge} bestellt, ${empfangen} empfangen`:diff>0?`Mehrlieferung: +${diff}`:"",lieferantId:b.lieferantId});
    }
    if (diff < 0) {
      b.fehlmenge = Math.abs(diff);
    }
    save(); render();
    toast(diff<0?`⚠ ${artN(a)}: ${empfangen}/${b.menge} (${diff})`:`✓ ${artN(a)}: ${empfangen} ${a?.einheit||""}`, diff<0?"i":"s");
  });
}

function bestConfirmAll(liefKey) {
  const items = D.bestellungen.filter(b => (b.lieferantId||"none") === liefKey && b.status === "bestellt");
  if (!items.length) return;
  const lief = D.lieferanten.find(x=>x.id===liefKey);

  // Read all quantities
  const data = items.map(b => {
    const inp = document.getElementById(`best_emp_${b.id}`);
    const empfangen = Math.max(0, parseInt(inp?.value) || 0);
    const a = D.artikel.find(x=>x.id===b.artikelId);
    return { b, a, empfangen, diff: empfangen - b.menge };
  });
  const fehlCount = data.filter(d=>d.diff<0).length;
  const mehrCount = data.filter(d=>d.diff>0).length;

  let label = LANG==="vi"
    ? `Nhận tất cả ${items.length} SP từ ${lief?.name||"?"}?`
    : `Alle ${items.length} Artikel von ${lief?.name||"?"} als empfangen buchen?`;
  if (fehlCount) label += `\n\n⚠ ${fehlCount} ${LANG==="vi"?"thiếu hàng":"Fehlmengen"}`;
  if (mehrCount) label += `\n📦 ${mehrCount} ${LANG==="vi"?"thêm":"Mehrlieferungen"}`;

  cConfirm(label, () => {
    let count = 0;
    data.forEach(d => {
      d.b.status = "geliefert";
      d.b.empfangen = d.empfangen;
      if (d.a && d.empfangen > 0) {
        d.a.istBestand[d.b.standortId] = (d.a.istBestand[d.b.standortId]||0) + d.empfangen;
        D.bewegungen.unshift({id:uid(),typ:"eingang",artikelId:d.b.artikelId,standortId:d.b.standortId,menge:d.empfangen,datum:nw(),benutzer:U.id,referenz:`B-${d.b.id}`,notiz:d.diff<0?`Fehlmenge: ${d.b.menge} bestellt, ${d.empfangen} empfangen`:d.diff>0?`Mehrlieferung: +${d.diff}`:"",lieferantId:d.b.lieferantId});
        count++;
      }
      if (d.diff < 0) d.b.fehlmenge = Math.abs(d.diff);
    });
    sendTG("eingang", `📦 *${LANG==="vi"?"Lieferung":"Wareneingang"}: ${lief?.name||"?"}*\n${count} Pos. ${LANG==="vi"?"đã nhận":"empfangen"}${fehlCount?`\n⚠ ${fehlCount} Fehlmengen`:""}\n\n${data.map(d=>`• ${d.empfangen}/${d.b.menge} ${artN(d.a)}${d.diff<0?" ⚠":""}`).join("\n")}`);
    save(); render();
    toast(`✓ ${count} ${t("c.article")} ${LANG==="vi"?"đã nhận":"empfangen"}${fehlCount?` · ${fehlCount} ${LANG==="vi"?"thiếu":"Fehl"}`:""}`, fehlCount?"i":"s");
  });
}

function bestStatus(id, st) {
  const b = D.bestellungen.find(x=>x.id===id);
  if (!b) return;
  const a = D.artikel.find(x=>x.id===b.artikelId);
  if (st === "storniert") {
    const label = LANG==="vi" ? `Hủy đơn hàng ${artN(a)}?` : `Bestellung ${artN(a)} stornieren?`;
    cConfirm(label, () => { b.status = st; save(); render(); toast("✓","i"); });
  }
}

// ═══ BESTELLUNGEN EXPORT ═══
function getBestellungenExportData() {
  const filtered = BEST_FILTER === "all" ? D.bestellungen : D.bestellungen.filter(b=>b.status===BEST_FILTER);
  return filtered.map(b => {
    const a = D.artikel.find(x=>x.id===b.artikelId);
    const l = D.lieferanten.find(x=>x.id===b.lieferantId);
    const s = D.standorte.find(x=>x.id===b.standortId);
    const al = a?.lieferanten.find(x=>x.lieferantId===b.lieferantId);
    const p = al?.preis || 0;
    return { datum: b.datum, artikel: artN(a), sku: a?.sku||"", liefArtNr: al?.artNr||"", lieferant: l?.name||"", standort: s?.name||"", menge: b.menge, einheit: a?.einheit||"", preis: p, wert: p*b.menge, status: b.status };
  });
}

function exportBestellungenExcel() {
  const rows = getBestellungenExportData();
  const hdr = ["Datum","Artikel","SKU","Lief.-Art.Nr.","Lieferant","Standort","Menge","Einheit","EK-Preis","Wert","Status"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="hd"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/></Style></Styles><Worksheet ss:Name="Bestellungen"><Table>';
  xml += "<Row>" + hdr.map(h=>`<Cell ss:StyleID="hd"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("") + "</Row>";
  rows.forEach(r => {
    xml += `<Row><Cell><Data ss:Type="String">${esc(r.datum)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.artikel)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.sku)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.liefArtNr)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.lieferant)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.standort)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.menge}</Data></Cell><Cell><Data ss:Type="String">${esc(r.einheit)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.preis}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.wert}</Data></Cell><Cell><Data ss:Type="String">${esc(r.status)}</Data></Cell></Row>`;
  });
  xml += "</Table></Worksheet></Workbook>";
  dlFile(xml, `Bestellungen_${td()}.xls`, "application/vnd.ms-excel");
  toast(`${rows.length} ${LANG==="vi"?"đơn hàng xuất Excel":"Bestellungen exportiert"}`,"s");
}

function exportBestellungenPDF() {
  const rows = getBestellungenExportData();
  const title = LANG==="vi" ? "Danh sách đơn hàng" : "Bestellübersicht";
  let html = `<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#222;margin:20px}h1{font-size:18px}h2{font-size:13px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;text-align:left;padding:5px 6px;font-size:10px;border-bottom:2px solid #ccc;text-transform:uppercase}td{padding:4px 6px;border-bottom:1px solid #eee;font-size:11px}.r{text-align:right}.mono{font-family:monospace}.bestellt{color:#D97706}.geliefert{color:#059669}.storniert{color:#DC2626}</style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)} — ${title}</h1><h2>${new Date().toLocaleDateString("de-DE")}${BEST_FILTER!=="all"?" · Filter: "+BEST_FILTER:""}</h2>`;
  html += `<table><thead><tr><th>Datum</th><th>Artikel</th><th>SKU</th><th>Lief.-Art.Nr.</th><th>Lieferant</th><th>Standort</th><th class="r">Menge</th><th>Einh.</th><th class="r">EK</th><th class="r">Wert</th><th>Status</th></tr></thead><tbody>`;
  let tw = 0;
  rows.forEach(r => {
    tw += r.wert;
    html += `<tr><td class="mono">${esc(r.datum)}</td><td>${esc(r.artikel)}</td><td class="mono">${esc(r.sku)}</td><td class="mono">${esc(r.liefArtNr)}</td><td>${esc(r.lieferant)}</td><td>${esc(r.standort)}</td><td class="r mono">${r.menge}</td><td>${esc(r.einheit)}</td><td class="r mono">${r.preis.toFixed(2)}</td><td class="r mono">${r.wert.toFixed(2)}</td><td class="${r.status}">${esc(r.status)}</td></tr>`;
  });
  html += `</tbody><tfoot><tr><td colspan="9" style="text-align:right;font-weight:bold;padding-top:8px">Gesamt:</td><td class="r mono" style="font-weight:bold;padding-top:8px">${tw.toFixed(2)} €</td><td></td></tr></tfoot></table></body></html>`;
  openPrintHTML(html);
}

function exportBestellungenSevdesk() {
  const rows = getBestellungenExportData();
  // sevDesk CSV format for import
  const hdr = ["Belegdatum","Lieferant","Belegnummer","Artikelname","Artikelnummer","Menge","Einheit","Einzelpreis","Gesamtpreis","Status"];
  let csv = "\uFEFF" + hdr.join(";") + "\n"; // BOM for Excel UTF-8
  rows.forEach((r,i) => {
    const belegnr = `B-${r.datum.replace(/-/g,"")}-${String(i+1).padStart(3,"0")}`;
    csv += [r.datum, r.lieferant, belegnr, r.artikel, r.liefArtNr||r.sku, r.menge, r.einheit, r.preis.toFixed(2).replace(".",","), r.wert.toFixed(2).replace(".",","), r.status].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";") + "\n";
  });
  dlFile(csv, `Bestellungen_sevDesk_${td()}.csv`, "text/csv;charset=utf-8");
  toast(`${rows.length} → sevDesk CSV ✓`,"s");
}

// ═══ LIEFERANTEN ═══