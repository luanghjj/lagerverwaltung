// ═══ EXPORT: Bewegungen & Transfer Excel ═══
function exportBewExcel() {
  const rows = getBewExportData();
  const hdr = ["Datum","Typ","Artikel","SKU","Einheit","Standort","Ziel","Lagerort","Menge","Wert €","Referenz","Notiz","Mitarbeiter"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="hd"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/></Style></Styles><Worksheet ss:Name="Bewegungen"><Table>';
  xml += "<Row>" + hdr.map(h=>`<Cell ss:StyleID="hd"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("") + "</Row>";
  rows.forEach(r => {
    xml += `<Row><Cell><Data ss:Type="String">${esc(r.datum)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.typ)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.artikel)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.sku)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.einheit)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.standort)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.zielStandort)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.lagerort)}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.menge}</Data></Cell><Cell ss:StyleID="num"><Data ss:Type="Number">${r.wert}</Data></Cell><Cell><Data ss:Type="String">${esc(r.referenz)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.notiz)}</Data></Cell><Cell><Data ss:Type="String">${esc(r.benutzer)}</Data></Cell></Row>`;
  });
  xml += "</Table></Worksheet></Workbook>";
  dlFile(xml, `Bewegungen_${td()}.xls`, "application/vnd.ms-excel");
  toast(`${rows.length} ${LANG==="vi"?"biến động đã xuất":"Bewegungen exportiert"} (Excel)`,"s");
}

function exportBewCSV() {
  const rows = getBewExportData();
  const hdr = ["Datum","Typ","Artikel","SKU","Einheit","Standort","Ziel","Lagerort","Menge","Wert","Referenz","Notiz","Mitarbeiter"];
  let csv = "\uFEFF" + hdr.join(";") + "\n";
  rows.forEach(r => {
    csv += [r.datum, r.typ, r.artikel, r.sku, r.einheit, r.standort, r.zielStandort, r.lagerort, r.menge, r.wert.toFixed(2).replace(".",","), r.referenz, r.notiz, r.benutzer].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";") + "\n";
  });
  dlFile(csv, `Bewegungen_${td()}.csv`, "text/csv;charset=utf-8");
  toast(`${rows.length} ${LANG==="vi"?"biến động đã xuất":"Bewegungen exportiert"} (CSV)`,"s");
}

function exportBewPDF() {
  const rows = getBewExportData();
  const weTotal = rows.filter(r=>r.typ==="WE").reduce((s,r)=>s+r.menge,0);
  const waTotal = rows.filter(r=>r.typ==="WA").reduce((s,r)=>s+r.menge,0);
  const weWert = rows.filter(r=>r.typ==="WE").reduce((s,r)=>s+r.wert,0);
  const waWert = rows.filter(r=>r.typ==="WA").reduce((s,r)=>s+r.wert,0);

  let html = `<html><head><meta charset="utf-8"><title>Bewegungen</title><style>
  body{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#222;margin:15mm}
  h1{font-size:16px;margin-bottom:2px}h2{font-size:11px;color:#666;margin-bottom:12px}
  .sum{display:flex;gap:20px;margin-bottom:12px;font-size:11px}
  .sum b{font-size:13px}
  table{width:100%;border-collapse:collapse}
  th{background:#f0f0f0;text-align:left;padding:3px 5px;font-size:9px;border-bottom:2px solid #ccc;text-transform:uppercase}
  td{padding:3px 5px;border-bottom:1px solid #eee;font-size:10px}
  .r{text-align:right}.mono{font-family:monospace;font-size:9px}
  .we{color:#059669}.wa{color:#DC2626}.ub{color:#7C3AED}.k{color:#D97706}
  @media print{body{margin:10mm}}
  </style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)} — ${LANG==="vi"?"Biến động kho":"Warenbewegungen"}</h1>`;
  html += `<h2>${new Date().toLocaleDateString("de-DE")} · ${rows.length} ${LANG==="vi"?"dòng":"Einträge"}</h2>`;
  html += `<div class="sum"><span class="we">↓ Eingang: <b>+${weTotal}</b> (${weWert.toFixed(2)} €)</span><span class="wa">↑ Ausgang: <b>−${waTotal}</b> (${waWert.toFixed(2)} €)</span></div>`;
  html += `<table><thead><tr><th>Datum</th><th>Typ</th><th>Artikel</th><th>SKU</th><th>Standort</th><th>Lagerort</th><th class="r">Menge</th><th class="r">Wert</th><th>Referenz</th><th>MA</th><th>Notiz</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const tc = r.typ==="WE"?"we":r.typ==="WA"?"wa":r.typ==="UB"?"ub":"k";
    html += `<tr><td class="mono">${esc(r.datum)}</td><td class="${tc}" style="font-weight:bold">${esc(r.typ)}</td><td>${esc(r.artikel)}</td><td class="mono">${esc(r.sku)}</td><td>${esc(r.standort)}${r.zielStandort?` → ${esc(r.zielStandort)}`:""}</td><td>${esc(r.lagerort)}</td><td class="r mono" style="font-weight:bold">${r.menge}</td><td class="r mono">${r.wert.toFixed(2)}</td><td class="mono">${esc(r.referenz)}</td><td>${esc(r.benutzer)}</td><td style="max-width:150px;word-break:break-word;white-space:normal">${esc(r.notiz)}</td></tr>`;
  });
  html += `</tbody></table></body></html>`;
  openPrintHTML(html);
}

// ═══ BESTELLLISTE ═══
let BL_VIEW = "lief"; // "lief" | "art" | "vorlagen"