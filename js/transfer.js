// ═══ TRANSFER (Stock Transfer) ═══
function renderTransfer(vS, aS) {
  if (vS.length < 2) return `<div class="mn-h"><div class="mn-t">⇄ ${LANG==="vi"?"Chuyển kho":"Umbuchen"}</div></div><div class="mn-c"><div style="text-align:center;padding:30px;color:var(--t3)">${LANG==="vi"?"Cần ít nhất 2 chi nhánh":"Mindestens 2 Standorte nötig"}</div></div>`;
  if (!D.transfers) D.transfers = [];
  const pending = D.transfers.filter(t=>t.status==="unterwegs");

  let h = `<div class="mn-h"><div class="mn-t">⇄ ${LANG==="vi"?"Chuyển kho":"Umbuchen"}</div><div class="mn-a">`;
  if (D.transfers.length && can(U.role,"export")) h += `<button class="btn btn-o btn-sm" onclick="exportTfExcel()">⬇ Excel</button><button class="btn btn-o btn-sm" onclick="exportTfCSV()">⬇ CSV</button><button class="btn btn-o btn-sm" onclick="exportTfPDF()">⬇ PDF</button>`;
  h += `</div></div><div class="mn-c">`;

  // Pending transfers that need confirmation
  if (pending.length) {
    h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--yl)">📦 ${pending.length} ${LANG==="vi"?"đang chờ xác nhận":"offene Transfers"}</h3>`;
    pending.forEach(tf => {
      const von = D.standorte.find(s=>s.id===tf.vonId);
      const nach = D.standorte.find(s=>s.id===tf.nachId);
      const usr = D.users.find(u=>u.id===tf.benutzer);
      h += `<div class="cd" style="border-left:3px solid var(--yl);margin-bottom:6px">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
      h += `<div><div style="font-weight:700">${esc(von?.name||"?")} → ${esc(nach?.name||"?")}</div>`;
      h += `<div style="font-size:10px;color:var(--t3)">${fDT(tf.datum)} · ${esc(usr?.name||"?")}</div></div>`;
      h += `<span class="bp" style="background:var(--yA);color:var(--yl)">📦 ${LANG==="vi"?"Đang chờ":"Unterwegs"}</span></div>`;

      // Per-article confirmation with qty input
      h += `<table style="width:100%;border-collapse:collapse"><thead><tr>`;
      h += `<th style="background:transparent;padding:4px 8px">${t("c.article")}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Đã gửi":"Gesendet"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:center;color:var(--ac)">${LANG==="vi"?"Nhận được":"Empfangen"}</th>`;
      h += `<th style="background:transparent;padding:4px 8px;text-align:right">${LANG==="vi"?"Chênh lệch":"Differenz"}</th>`;
      h += `</tr></thead><tbody>`;
      tf.items.forEach((it, i) => {
        const a = D.artikel.find(x=>x.id===it.artId);
        h += `<tr style="border-bottom:1px solid var(--bd)">`;
        h += `<td style="padding:5px 8px;font-weight:600">${esc(artN(a))}<div style="font-size:9px;color:var(--t3)">${esc(a?.einheit||"")}</div></td>`;
        h += `<td style="padding:5px 8px;text-align:right;font-family:var(--m);font-weight:600">${it.menge}</td>`;
        h += `<td style="padding:5px 8px;text-align:center"><input class="inp" type="number" min="0" max="${it.menge}" value="${it.menge}" id="tf_emp_${tf.id}_${i}" style="width:65px;text-align:center;padding:5px;font-family:var(--m);font-size:15px;font-weight:700;border:2px solid var(--ac)" onchange="tfCalcDiff('${tf.id}',${i},this.value,${it.menge})"></td>`;
        h += `<td style="padding:5px 8px;text-align:right" id="tf_diff_${tf.id}_${i}"><span style="font-family:var(--m);font-weight:700;color:var(--gn)">0</span></td>`;
        h += `</tr>`;
      });
      h += `</tbody></table>`;

      h += `<div id="tf_warn_${tf.id}" style="display:none;margin-top:6px;padding:6px 10px;background:var(--rA);border:1px solid rgba(239,68,68,.15);border-radius:6px;font-size:11px;color:var(--rd)"></div>`;

      h += `<div style="display:flex;gap:4px;margin-top:8px">`;
      h += `<button class="btn btn-g" onclick="confirmTransfer('${tf.id}',${tf.items.length})">✓ ${LANG==="vi"?"Nhập kho":"Wareneingang buchen"}</button>`;
      h += `<button class="btn btn-p btn-sm" onclick="tfQuickAcceptAll('${tf.id}',${tf.items.length})" style="font-weight:700">✓ ${LANG==="vi"?"Tất cả OK":"Alles OK"}</button>`;
      h += `<button class="btn btn-d btn-sm" onclick="rejectTransfer('${tf.id}')">✕ ${LANG==="vi"?"Từ chối toàn bộ":"Komplett zurückweisen"}</button>`;
      h += `</div></div>`;
    });
    h += `<hr style="border:none;border-top:1px solid var(--bd);margin:12px 0">`;
  }

  // New transfer form
  h += `<h3 style="font-size:13px;font-weight:700;margin-bottom:8px">⇄ ${LANG==="vi"?"Tạo chuyển kho mới":"Neuen Transfer erstellen"}</h3>`;
  h += `<div style="font-size:11px;color:var(--t2);margin-bottom:10px;padding:6px 10px;background:var(--b3);border-radius:6px">📤 ${LANG==="vi"?"Hàng sẽ được trừ ngay tại CN gốc. CN đích phải xác nhận nhận hàng.":"Ware wird sofort am Quell-Standort abgebucht. Der Ziel-Standort muss den Empfang bestätigen."}</div>`;

  // Pick default Von = standort with most stock
  const stStockCount = vS.map(s => ({ id: s.id, count: D.artikel.reduce((sum, a) => sum + (a.istBestand[s.id] || 0), 0) }));
  stStockCount.sort((a, b) => b.count - a.count);
  const defaultVon = stStockCount[0]?.id || vS[0]?.id;
  const defaultNach = vS.find(s => s.id !== defaultVon)?.id || vS[1]?.id;
  h += `<div class="g2"><div class="fg"><label>📤 ${LANG==="vi"?"Từ kho":"Von Standort"}</label><select class="sel" id="tf_von">${vS.map(s=>`<option value="${s.id}" ${s.id===defaultVon?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>`;
  h += `<div class="fg"><label>📥 ${LANG==="vi"?"Đến kho":"Nach Standort"}</label><select class="sel" id="tf_nach">${vS.map(s=>`<option value="${s.id}" ${s.id===defaultNach?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div></div>`;

  h += `<div class="fg"><label>${t("c.article")} ${LANG==="vi"?"tìm":"suchen"}</label><input class="inp" id="tf_search" placeholder="${t("c.search")}" oninput="tfSearch(this.value)"></div>`;
  h += `<div id="tf_results"></div>`;

  h += `<div id="tf_batch">`;
  if (TF_BATCH.length) {
    h += `<h3 style="font-size:12px;font-weight:700;margin:8px 0 4px">${TF_BATCH.length} ${t("c.article")}</h3>`;
    TF_BATCH.forEach((b,i) => {
      const a = D.artikel.find(x=>x.id===b.artId);
      h += `<div class="batch-item"><div style="flex:1"><div style="font-weight:600;font-size:12px">${esc(artN(a))}</div><div style="font-size:10px;color:var(--t2)">${esc(a?.sku||"")}</div></div><input class="inp" type="number" min="1" value="${b.menge}" onchange="TF_BATCH[${i}].menge=parseInt(this.value)||1" style="width:60px;text-align:center;font-family:var(--m);font-weight:700"><span style="font-size:11px;color:var(--t3);min-width:30px">${esc(a?.einheit||"")}</span><button class="bi dn" onclick="TF_BATCH.splice(${i},1);render()">✕</button></div>`;
    });
    h += `<button class="btn btn-p" onclick="execTransfer()" style="margin-top:8px">📤 ${LANG==="vi"?"Absenden":"Transfer senden"} (${TF_BATCH.length})</button>`;
  }
  h += `</div>`;

  // History
  let done = (D.transfers||[]).filter(t=>t.status!=="unterwegs");
  // Search
  h += `<h3 style="font-size:13px;font-weight:700;margin:16px 0 6px">${LANG==="vi"?"Lịch sử":"Historie"} (${done.length})</h3>`;
  if (done.length) {
    h += `<div style="margin-bottom:8px"><div class="srch" style="position:relative"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" placeholder="${LANG==="vi"?"Tìm SP trong lịch sử...":"Artikel in Historie suchen..."}" id="tfHSearch" value="${esc(TF_HSEARCH)}" oninput="if(_IME)return;TF_HSEARCH=this.value;render()" style="padding-right:${TF_HSEARCH?'28px':'9px'}">${TF_HSEARCH?`<button class="bi" onclick="TF_HSEARCH='';render()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;
    const tfQ = norm(TF_HSEARCH);
    if (tfQ) {
      done = done.filter(tf => {
        const von = D.standorte.find(s=>s.id===tf.vonId);
        const nach = D.standorte.find(s=>s.id===tf.nachId);
        return tf.items.some(it => { const a=D.artikel.find(x=>x.id===it.artId); return norm(artN(a)).includes(tfQ) || norm(a?.sku).includes(tfQ); }) || (von?.name||"").toLowerCase().includes(tfQ) || (nach?.name||"").toLowerCase().includes(tfQ);
      });
      if (tfQ) h += `<div style="font-size:11px;color:var(--t2);margin-bottom:6px">${done.length} ${LANG==="vi"?"kết quả":"Ergebnisse"}</div>`;
    }
    done = done.slice(0, 20);
    done.forEach((tf,idx) => {
      const von = D.standorte.find(s=>s.id===tf.vonId);
      const nach = D.standorte.find(s=>s.id===tf.nachId);
      const usr = D.users.find(u=>u.id===tf.benutzer);
      const empUsr = tf.empfangenVon ? D.users.find(u=>u.id===tf.empfangenVon) : null;
      const stC = tf.status==="empfangen"?"var(--gn)":"var(--rd)";
      const details = tf.empfangenDetails || tf.items.map(it=>({artId:it.artId,gesendet:it.menge,empfangen:tf.status==="empfangen"?it.menge:0,diff:tf.status==="empfangen"?0:-it.menge}));
      const fehlCount = details.filter(d=>d.diff<0).length;

      h += `<div class="cd" style="margin-bottom:4px;border-left:3px solid ${stC};cursor:pointer" onclick="document.getElementById('tfh_${idx}').style.display=document.getElementById('tfh_${idx}').style.display==='none'?'':'none'">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      h += `<div><div style="font-weight:600;font-size:12px">${esc(von?.name||"?")} → ${esc(nach?.name||"?")}</div>`;
      h += `<div style="font-size:10px;color:var(--t3)">${fDT(tf.datum)} · ${esc(usr?.name||"?")}${empUsr?` → ${esc(empUsr.name)}`:""}</div></div>`;
      h += `<div style="display:flex;gap:4px;align-items:center"><span class="bp" style="background:${stC}18;color:${stC}">${tf.status==="empfangen"?"✓":"↩"} ${tf.status}</span>`;
      if (fehlCount) h += `<span class="bp" style="background:var(--rA);color:var(--rd)">${fehlCount} ${LANG==="vi"?"thiếu":"Fehl"}</span>`;
      h += `<span style="font-size:10px;color:var(--t3)">${tf.items.length} Art. ▾</span></div></div>`;

      // Expandable detail
      h += `<div id="tfh_${idx}" style="display:none;margin-top:8px;border-top:1px solid var(--bd);padding-top:6px">`;
      h += `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="background:transparent;padding:3px 6px;font-size:9px">${t("c.article")}</th><th style="background:transparent;padding:3px 6px;text-align:right;font-size:9px">${LANG==="vi"?"Gửi":"Gesendet"}</th><th style="background:transparent;padding:3px 6px;text-align:right;font-size:9px">${LANG==="vi"?"Nhận":"Empfangen"}</th><th style="background:transparent;padding:3px 6px;text-align:right;font-size:9px">${LANG==="vi"?"CL":"Diff"}</th></tr></thead><tbody>`;
      details.forEach(d => {
        const a = D.artikel.find(x=>x.id===d.artId);
        const diffCol = d.diff===0?"var(--gn)":d.diff<0?"var(--rd)":"var(--ac)";
        h += `<tr style="border-bottom:1px solid var(--bd)"><td style="padding:3px 6px;font-weight:500;font-size:11px">${esc(artN(a))}</td>`;
        h += `<td style="padding:3px 6px;text-align:right;font-family:var(--m);font-size:11px">${d.gesendet}</td>`;
        h += `<td style="padding:3px 6px;text-align:right;font-family:var(--m);font-size:11px;font-weight:600">${d.empfangen}</td>`;
        h += `<td style="padding:3px 6px;text-align:right;font-family:var(--m);font-size:11px;font-weight:700;color:${diffCol}">${d.diff===0?"✓":d.diff>0?"+"+d.diff:d.diff}</td></tr>`;
      });
      h += `</tbody></table>`;
      if (tf.empfangenAm) h += `<div style="font-size:9.5px;color:var(--t3);margin-top:4px">${LANG==="vi"?"Xác nhận":"Bestätigt"}: ${fDT(tf.empfangenAm)}</div>`;
      h += `</div></div>`;
    });
  }

  h += `</div>`;
  return h;
}

// ═══ TRANSFER EXPORT ═══
function getTfExportData() {
  return (D.transfers||[]).flatMap(tf => {
    const von = D.standorte.find(s=>s.id===tf.vonId);
    const nach = D.standorte.find(s=>s.id===tf.nachId);
    const usr = D.users.find(u=>u.id===tf.benutzer);
    const empUsr = tf.empfangenVon ? D.users.find(u=>u.id===tf.empfangenVon) : null;
    const details = tf.empfangenDetails || tf.items.map(it=>({artId:it.artId,gesendet:it.menge,empfangen:tf.status==="empfangen"?it.menge:0,diff:0}));
    return details.map(d => {
      const a = D.artikel.find(x=>x.id===d.artId);
      return { datum: tf.datum, von: von?.name||"", nach: nach?.name||"", artikel: artN(a), sku: a?.sku||"", einheit: a?.einheit||"", gesendet: d.gesendet, empfangen: d.empfangen, diff: d.diff, status: tf.status, gesendetVon: usr?.name||"", empfangenVon: empUsr?.name||"", empfangenAm: tf.empfangenAm||"" };
    });
  });
}

function exportTfExcel() {
  const rows = getTfExportData();
  const hdr = ["Datum","Von","Nach","Artikel","SKU","Einheit","Gesendet","Empfangen","Differenz","Status","Gesendet von","Empfangen von","Empfangen am"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="hd"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0"/></Style></Styles><Worksheet ss:Name="Transfers"><Table>';
  xml += "<Row>" + hdr.map(h=>`<Cell ss:StyleID="hd"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("") + "</Row>";
  rows.forEach(r => {
    xml += `<Row><Cell><Data ss:Type="String">${esc(r.datum)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.von)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.nach)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.artikel)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.sku)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.einheit)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.gesendet}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.empfangen}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.diff}</Data></Cell><Cell><Data ss:Type="String">${esc(r.status)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.gesendetVon)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.empfangenVon)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.empfangenAm)}</Data></Cell></Row>`;
  });
  xml += "</Table></Worksheet></Workbook>";
  dlFile(xml, `Transfers_${td()}.xls`, "application/vnd.ms-excel");
  toast(`${rows.length} ${LANG==="vi"?"dòng đã xuất":"Zeilen exportiert"} (Excel)`,"s");
}

function exportTfCSV() {
  const rows = getTfExportData();
  const hdr = ["Datum","Von","Nach","Artikel","SKU","Einheit","Gesendet","Empfangen","Differenz","Status","Gesendet von","Empfangen von","Empfangen am"];
  let csv = "\uFEFF" + hdr.join(";") + "\n";
  rows.forEach(r => {
    csv += [r.datum,r.von,r.nach,r.artikel,r.sku,r.einheit,r.gesendet,r.empfangen,r.diff,r.status,r.gesendetVon,r.empfangenVon,r.empfangenAm].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";") + "\n";
  });
  dlFile(csv, `Transfers_${td()}.csv`, "text/csv;charset=utf-8");
  toast(`${rows.length} ${LANG==="vi"?"dòng đã xuất":"Zeilen exportiert"} (CSV)`,"s");
}

function exportTfPDF() {
  const allTf = (D.transfers||[]);
  let html = `<html><head><meta charset="utf-8"><title>Transfers</title><style>body{font-family:Helvetica,Arial,sans-serif;font-size:10px;margin:15mm}h1{font-size:16px}h2{font-size:11px;color:#666;margin-bottom:12px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#f0f0f0;text-align:left;padding:3px 5px;font-size:9px;border-bottom:2px solid #ccc;text-transform:uppercase}td{padding:3px 5px;border-bottom:1px solid #eee;font-size:10px}.r{text-align:right}.mono{font-family:monospace}.ok{color:#059669;font-weight:bold}.fehl{color:#DC2626;font-weight:bold}.grp{background:#f8f9fa;font-weight:bold;font-size:11px}@media print{body{margin:10mm}}</style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)} — ${LANG==="vi"?"Chuyển kho":"Umbuchungen"}</h1>`;
  html += `<h2>${new Date().toLocaleDateString("de-DE")} · ${allTf.length} Transfers</h2>`;

  allTf.forEach(tf => {
    const von = D.standorte.find(s=>s.id===tf.vonId);
    const nach = D.standorte.find(s=>s.id===tf.nachId);
    const usr = D.users.find(u=>u.id===tf.benutzer);
    const details = tf.empfangenDetails || tf.items.map(it=>({artId:it.artId,gesendet:it.menge,empfangen:tf.status==="empfangen"?it.menge:0,diff:0}));
    const fehlCount = details.filter(d=>d.diff<0).length;

    html += `<table><thead><tr class="grp"><td colspan="5">${fDT(tf.datum)} · ${esc(von?.name||"")} → ${esc(nach?.name||"")} · <span style="color:${tf.status==="empfangen"?"#059669":"#DC2626"}">${tf.status}</span>${fehlCount?` · <span class="fehl">${fehlCount} Fehlmengen</span>`:""} · ${esc(usr?.name||"")}</td></tr>`;
    html += `<tr><th>Artikel</th><th>SKU</th><th class="r">Gesendet</th><th class="r">Empfangen</th><th class="r">Differenz</th></tr></thead><tbody>`;
    details.forEach(d => {
      const a = D.artikel.find(x=>x.id===d.artId);
      html += `<tr><td>${esc(artN(a))}</td><td class="mono">${esc(a?.sku||"")}</td><td class="r mono">${d.gesendet}</td><td class="r mono" style="font-weight:bold">${d.empfangen}</td><td class="r mono ${d.diff===0?"ok":d.diff<0?"fehl":""}">${d.diff===0?"✓":d.diff}</td></tr>`;
    });
    html += `</tbody></table>`;
  });

  html += `</body></html>`;
  openPrintHTML(html);
}

function tfSearch(q) {
  if(_IME)return;
  const container = document.getElementById("tf_results");
  if (!container) return;
  if (q.length < 1) { container.innerHTML = ""; return; }
  const vonId = document.getElementById("tf_von")?.value;
  const nachId = document.getElementById("tf_nach")?.value;
  const vonName = D.standorte.find(s=>s.id===vonId)?.name||"";
  const nachName = D.standorte.find(s=>s.id===nachId)?.name||"";
  const ql = norm(q);
  const results = D.artikel.filter(a => (norm(a.name).includes(ql) || norm(a.name_vi).includes(ql) || norm(a.sku).includes(ql) || (a.barcodes||[]).some(bc => bc.toLowerCase().includes(ql))) && (a.istBestand[vonId]||0) > 0).slice(0,8);
  let h = "";
  results.forEach(a => {
    const vonIst = a.istBestand[vonId]||0;
    const nachIst = a.istBestand[nachId]||0;
    const nachSoll = a.sollBestand[nachId]||0;
    const already = TF_BATCH.some(b=>b.artId===a.id);
    h += `<div class="live-item ${already?"hl":""}" onmousedown="tfAdd('${a.id}')"><div style="flex:1"><div style="font-weight:600;font-size:12px">${esc(artN(a))}</div><div style="font-size:10px;color:var(--t2)">${esc(a.sku)}</div></div>`;
    h += `<div style="text-align:right;min-width:140px">`;
    h += `<div style="display:flex;flex-direction:column;gap:2px;font-size:10.5px">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--t3);font-size:9px;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(vonName)}</span><span style="font-family:var(--m);font-weight:700;color:var(--rd)">${vonIst} ${esc(a.einheit)}</span></div>`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--t3);font-size:9px;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nachName)}</span><span style="font-family:var(--m);font-weight:700;color:${nachIst<nachSoll?"var(--yl)":"var(--gn)"}">${nachIst}/${nachSoll} ${esc(a.einheit)}</span></div>`;
    h += `</div></div></div>`;
  });
  if (!results.length) h = `<div style="padding:10px;color:var(--t3);font-size:11px">—</div>`;
  container.innerHTML = h;
}

function tfAdd(artId) {
  if (TF_BATCH.some(b=>b.artId===artId)) return;
  TF_BATCH.push({ artId, menge: 1 });
  render();
  setTimeout(() => { const el = document.getElementById("tf_search"); if(el){el.focus();el.value="";} },50);
}

function execTransfer() {
  const vonId = document.getElementById("tf_von")?.value;
  const nachId = document.getElementById("tf_nach")?.value;
  if (!vonId || !nachId || vonId === nachId) { toast(LANG==="vi"?"Kho gốc và đích phải khác nhau":"Quelle und Ziel müssen verschieden sein","e"); return; }
  if (!TF_BATCH.length) return;
  const vonName = D.standorte.find(s=>s.id===vonId)?.name;
  const nachName = D.standorte.find(s=>s.id===nachId)?.name;
  const label = LANG==="vi"
    ? `Chuyển ${TF_BATCH.length} SP từ ${vonName} → ${nachName}?\n\nHàng sẽ bị trừ ngay tại ${vonName}.\n${nachName} phải xác nhận nhận hàng.`
    : `${TF_BATCH.length} Artikel von ${vonName} → ${nachName} senden?\n\nBestand wird sofort bei ${vonName} abgebucht.\n${nachName} muss den Empfang bestätigen.`;

  cConfirm(label, () => {
    if (!D.transfers) D.transfers = [];
    const items = [];
    TF_BATCH.forEach(b => {
      const a = D.artikel.find(x=>x.id===b.artId);
      if (!a) return;
      const vonIst = a.istBestand[vonId]||0;
      const qty = Math.min(b.menge, vonIst);
      if (qty <= 0) return;
      // Deduct from source immediately
      a.istBestand[vonId] = vonIst - qty;
      D.bewegungen.unshift({ id:uid(), typ:"umbuchung", artikelId:b.artId, standortId:vonId, zielStandortId:nachId, menge:qty, datum:nw(), benutzer:U.id, referenz:`UB→${nachName}`, notiz:LANG==="vi"?"Chờ xác nhận":"Wartet auf Bestätigung", lieferantId:"" });
      items.push({ artId: b.artId, menge: qty });
    });
    if (items.length) {
      D.transfers.unshift({ id:uid(), vonId, nachId, items, status:"unterwegs", datum:nw(), benutzer:U.id });
    }
    TF_BATCH = [];
    save(); render();
    if (typeof sbSaveTransfer === "function") sbSaveTransfer(D.transfers[0]).catch(e => console.error("sbSaveTransfer:", e));
    // Also save each bewegung to Supabase
    if (typeof sbSaveBewegung === "function") items.forEach(it => { const bew = D.bewegungen.find(b => b.artikelId === it.artId && b.typ === "umbuchung"); if (bew) sbSaveBewegung(bew).catch(e => console.error("sbSaveBewegung:", e)); });
    // Also save updated artikel stock
    if (typeof sbSaveArtikel === "function") items.forEach(it => { const a = D.artikel.find(x => x.id === it.artId); if (a) sbSaveArtikel(a).catch(e => console.error("sbSaveArtikel:", e)); });
    sendTG("transfer", `⇄ *Transfer gesendet*\n📤 ${vonName} → 📥 ${nachName}\n${items.length} Pos.\n👤 ${U?.name||"?"}\n\n${items.map(it=>{const a=D.artikel.find(x=>x.id===it.artId);return `• ${it.menge}× ${artN(a)}`;}).join("\n")}`);
    toast(`📤 ${items.length} ${t("c.article")} → ${nachName} (${LANG==="vi"?"chờ xác nhận":"wartet auf Bestätigung"})`, "s");
  });
}

function tfCalcDiff(tfId, idx, val, gesendet) {
  const emp = parseInt(val) || 0;
  const diff = emp - gesendet;
  const el = document.getElementById(`tf_diff_${tfId}_${idx}`);
  if (el) {
    const col = diff === 0 ? "var(--gn)" : "var(--rd)";
    el.innerHTML = `<span style="font-family:var(--m);font-weight:700;color:${col}">${diff === 0 ? "✓" : diff}</span>`;
  }
  // Update warning
  const tf = (D.transfers||[]).find(x=>x.id===tfId);
  if (!tf) return;
  let totalDiff = 0;
  const fehlItems = [];
  tf.items.forEach((it, i) => {
    const inp = document.getElementById(`tf_emp_${tfId}_${i}`);
    const empVal = parseInt(inp?.value) || 0;
    const d = empVal - it.menge;
    if (d < 0) { const a = D.artikel.find(x=>x.id===it.artId); fehlItems.push(`${Math.abs(d)} ${a?.einheit||""} ${artN(a)}`); }
    totalDiff += d;
  });
  const warn = document.getElementById(`tf_warn_${tfId}`);
  if (warn) {
    if (fehlItems.length) {
      warn.style.display = "";
      warn.innerHTML = `⚠ ${LANG==="vi"?"Thiếu hàng":"Fehlmenge"}: ${fehlItems.join(", ")}<br><span style="font-size:10px;color:var(--t2)">${LANG==="vi"?"Số thiếu sẽ được trả lại kho gốc":"Fehlmengen werden an den Quell-Standort zurückgebucht"}</span>`;
    } else {
      warn.style.display = "none";
    }
  }
}

function tfQuickAcceptAll(tfId, itemCount) {
  // Set all inputs to sent qty and confirm
  for (let i = 0; i < itemCount; i++) {
    const diffEl = document.getElementById(`tf_diff_${tfId}_${i}`);
    if (diffEl) diffEl.innerHTML = `<span style="font-family:var(--m);font-weight:700;color:var(--gn)">0</span>`;
  }
  confirmTransfer(tfId, itemCount);
}

function confirmTransfer(tfId, itemCount) {
  const tf = (D.transfers||[]).find(x=>x.id===tfId);
  if (!tf || tf.status !== "unterwegs") return;
  const von = D.standorte.find(s=>s.id===tf.vonId);
  const nach = D.standorte.find(s=>s.id===tf.nachId);

  // Read per-article quantities
  const empfangen = [];
  let hasDiff = false;
  tf.items.forEach((it, i) => {
    const inp = document.getElementById(`tf_emp_${tfId}_${i}`);
    const empQty = Math.max(0, parseInt(inp?.value) || 0);
    const diff = empQty - it.menge;
    if (diff !== 0) hasDiff = true;
    empfangen.push({ artId: it.artId, gesendet: it.menge, empfangen: empQty, diff });
  });

  const fehlList = empfangen.filter(e => e.diff < 0);
  let label = LANG==="vi"
    ? `Wareneingang für ${empfangen.length} Artikel buchen?`
    : `Wareneingang für ${empfangen.length} Artikel buchen?`;
  if (fehlList.length) {
    label += `\n\n⚠ ${fehlList.length} ${LANG==="vi"?"thiếu hàng":"Fehlmengen"}:`;
    fehlList.forEach(f => {
      const a = D.artikel.find(x=>x.id===f.artId);
      label += `\n  ${artN(a)}: ${f.gesendet} ${LANG==="vi"?"gửi":"gesendet"} → ${f.empfangen} ${LANG==="vi"?"nhận":"empfangen"} (${f.diff})`;
    });
    label += `\n\n${LANG==="vi"?"Số thiếu sẽ được trả lại":"Fehlmengen werden an"} ${von?.name} ${LANG==="vi"?"":"zurückgebucht"}.`;
  }

  cConfirm(label, () => {
    empfangen.forEach(e => {
      const a = D.artikel.find(x=>x.id===e.artId);
      if (!a) return;

      // Book received qty at target
      if (e.empfangen > 0) {
        a.istBestand[tf.nachId] = (a.istBestand[tf.nachId]||0) + e.empfangen;
        D.bewegungen.unshift({ id:uid(), typ:"eingang", artikelId:e.artId, standortId:tf.nachId, menge:e.empfangen, datum:nw(), benutzer:U.id, referenz:`UB←${von?.name}`, notiz:`Transfer ${von?.name}→${nach?.name}`, lieferantId:"" });
      }

      // Return shortage to source
      if (e.diff < 0) {
        const fehlMenge = Math.abs(e.diff);
        a.istBestand[tf.vonId] = (a.istBestand[tf.vonId]||0) + fehlMenge;
        D.bewegungen.unshift({ id:uid(), typ:"korrektur_plus", artikelId:e.artId, standortId:tf.vonId, menge:fehlMenge, datum:nw(), benutzer:U.id, referenz:`UB↩ Fehl`, notiz:`Fehlmenge Transfer→${nach?.name}: ${e.gesendet} gesendet, ${e.empfangen} empfangen`, lieferantId:"" });
      }
    });

    tf.status = "empfangen";
    tf.empfangenVon = U.id;
    tf.empfangenAm = nw();
    tf.empfangenDetails = empfangen;
    save(); render();
    if (typeof sbSaveTransfer === "function") sbSaveTransfer(tf).catch(e => console.error("sbSaveTransfer:", e));
    if (typeof sbSaveArtikel === "function") empfangen.forEach(e => { const a = D.artikel.find(x => x.id === e.artId); if (a) sbSaveArtikel(a).catch(e2 => console.error("sbSaveArtikel:", e2)); });

    const fehlCount = empfangen.filter(e=>e.diff<0).length;
    const tgLines = empfangen.map(e=>{const a=D.artikel.find(x=>x.id===e.artId);return `• ${artN(a)}: ${e.gesendet}→${e.empfangen}${e.diff<0?" ⚠":""}`;}).join("\n");
    sendTG("transfer", `✅ *Transfer empfangen*\n📤 ${von?.name} → 📥 ${nach?.name}\n👤 ${U?.name||"?"}\n${fehlCount?`⚠ ${fehlCount} Fehlmengen`:empfangen.length+" vollständig"}\n\n${tgLines}`);
    if (fehlCount) {
      toast(`✓ ${LANG==="vi"?"Đã nhận":"Empfangen"} · ${fehlCount} ${LANG==="vi"?"thiếu hàng → trả lại":"Fehlmengen → zurückgebucht"} ${von?.name}`, "i");
    } else {
      toast(`✓ ${empfangen.length} ${t("c.article")} ${LANG==="vi"?"đã nhận đầy đủ":"vollständig empfangen"}`, "s");
    }
  });
}

function rejectTransfer(tfId) {
  const tf = (D.transfers||[]).find(x=>x.id===tfId);
  if (!tf || tf.status !== "unterwegs") return;
  const von = D.standorte.find(s=>s.id===tf.vonId);
  const label = LANG==="vi"
    ? `Gesamten Transfer zurückweisen?\nAlle ${tf.items.length} Artikel werden an ${von?.name} zurückgebucht.`
    : `Gesamten Transfer zurückweisen?\nAlle ${tf.items.length} Artikel werden an ${von?.name} zurückgebucht.`;

  cConfirm(label, () => {
    tf.items.forEach(it => {
      const a = D.artikel.find(x=>x.id===it.artId);
      if (!a) return;
      a.istBestand[tf.vonId] = (a.istBestand[tf.vonId]||0) + it.menge;
      D.bewegungen.unshift({ id:uid(), typ:"korrektur_plus", artikelId:it.artId, standortId:tf.vonId, menge:it.menge, datum:nw(), benutzer:U.id, referenz:"UB↩", notiz:`Transfer komplett zurückgewiesen`, lieferantId:"" });
    });
    tf.status = "zurück";
    tf.empfangenDetails = tf.items.map(it=>({artId:it.artId,gesendet:it.menge,empfangen:0,diff:-it.menge}));
    save(); render();
    if (typeof sbSaveTransfer === "function") sbSaveTransfer(tf).catch(e => console.error("sbSaveTransfer:", e));
    if (typeof sbSaveArtikel === "function") tf.items.forEach(it => { const a = D.artikel.find(x => x.id === it.artId); if (a) sbSaveArtikel(a).catch(e => console.error("sbSaveArtikel:", e)); });
    const nach = D.standorte.find(s=>s.id===tf.nachId);
    sendTG("transfer", `↩ *Transfer zurückgewiesen*\n📤 ${von?.name} → 📥 ${nach?.name}\n👤 ${U?.name||"?"}\n${tf.items.length} Artikel zurückgebucht`);
    toast(`↩ ${LANG==="vi"?"Đã từ chối":"Zurückgewiesen"} → ${von?.name}`, "i");
  });
}

// ═══ BEWEGUNGEN EXPORT ═══
function getBewExportData() {
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const sids = STF !== "all" ? [STF] : vS.map(s=>s.id);
  return D.bewegungen.filter(b => sids.includes(b.standortId)).map(b => {
    const bt = BT[b.typ]||{s:b.typ,i:""};
    const a = D.artikel.find(x=>x.id===b.artikelId);
    const s = D.standorte.find(x=>x.id===b.standortId);
    const ziel = b.zielStandortId ? D.standorte.find(x=>x.id===b.zielStandortId) : null;
    const usr = D.users.find(x=>x.id===b.benutzer);
    const al = a?.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]) : null;
    const wert = (al?.preis||0) * b.menge;
    return {
      datum: b.datum, typ: bt.s, artikel: artN(a), sku: a?.sku||"", einheit: a?.einheit||"",
      standort: s?.name||"", zielStandort: ziel?.name||"", lagerort: a?.lagerort?.[b.standortId]||"",
      menge: b.menge, wert, referenz: b.referenz||"", notiz: b.notiz||"", benutzer: usr?.name||""
    };
  });
}
