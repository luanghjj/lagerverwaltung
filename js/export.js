// ═══ EXPORT (Excel, PDF) + closeModal ═══
function closeModal() {
  const ov = $(".mo-ov");
  if (!ov) return;
  ov.style.animation = "fadeOverlay .15s ease-out reverse forwards";
  const mo = ov.querySelector(".mo");
  if (mo) mo.style.animation = "modalIn .15s ease-in reverse forwards";
  setTimeout(() => ov.remove(), 150);
}

// ═══ EXPORT ═══
function exportExcel() {
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const sids = STF !== "all" ? [STF] : vS.map(s=>s.id);
  const hdr = [LANG==="vi"?"Mã SP":"SKU",LANG==="vi"?"Tên SP":"Artikel",LANG==="vi"?"Chi nhánh":"Standort",LANG==="vi"?"Vị trí":"Lagerort",LANG==="vi"?"ĐV":"Einheit",LANG==="vi"?"Tồn":"Ist",LANG==="vi"?"Quy đổi":"Gebinde",LANG==="vi"?"Chuẩn":"Soll","Min",LANG==="vi"?"Giá":"EK",LANG==="vi"?"Giá trị":"Wert"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="hd"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/></Style></Styles><Worksheet ss:Name="Inventur"><Table>';
  xml += "<Row>" + hdr.map(h=>`<Cell ss:StyleID="hd"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("") + "</Row>";
  D.artikel.forEach(a => { sids.forEach(sid => {
    const st=D.standorte.find(s=>s.id===sid);const ist=a.istBestand[sid]||0;const soll=a.sollBestand[sid]||0;const min=a.mindestmenge[sid]||0;const conv=formatUnitConv(ist,a);const bp=a.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0;const wert=(ist*bp);
    const row=[a.sku,artN(a),st?.name||"",a.lagerort?.[sid]||"",a.einheit,ist,conv,soll,min,bp,wert];
    xml += "<Row>" + row.map((v,i)=>typeof v==="number"?`<Cell ss:StyleID="num"><Data ss:Type="Number">${v}</Data></Cell>`:`<Cell><Data ss:Type="String">${esc(String(v))}</Data></Cell>`).join("") + "</Row>";
  });});
  xml += "</Table></Worksheet></Workbook>";
  dlFile(xml, `Inventur_${td()}.xls`, "application/vnd.ms-excel");
}

function exportPDF() {
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const sids = STF !== "all" ? [STF] : vS.map(s=>s.id);
  const title = LANG==="vi" ? "Danh sách kiểm kê" : "Inventurliste";
  let html = `<html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#222;margin:20px}h1{font-size:18px}h2{font-size:13px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f0f0f0;text-align:left;padding:5px 6px;font-size:10px;border-bottom:2px solid #ccc;text-transform:uppercase}td{padding:4px 6px;border-bottom:1px solid #eee;font-size:11px}.r{text-align:right}.mono{font-family:monospace}.crit{color:#DC2626;font-weight:bold}</style></head><body>`;
  html += `<h1>${esc(D.einstellungen.firmenname)} — ${title}</h1><h2>${new Date().toLocaleDateString("de-DE")}</h2>`;
  html += `<table><thead><tr><th>SKU</th><th>${LANG==="vi"?"SP":"Artikel"}</th><th>${LANG==="vi"?"CN":"Standort"}</th><th>${LANG==="vi"?"Vị trí":"Lagerort"}</th><th>${LANG==="vi"?"ĐV":"Einh."}</th><th class="r">${LANG==="vi"?"Tồn":"Ist"}</th><th class="r">${LANG==="vi"?"QĐ":"Geb."}</th><th class="r">${LANG==="vi"?"Chuẩn":"Soll"}</th><th class="r">Min</th><th class="r">${LANG==="vi"?"GT":"Wert"}</th></tr></thead><tbody>`;
  let tw = 0;
  D.artikel.forEach(a => { sids.forEach(sid => {
    const st=D.standorte.find(s=>s.id===sid);const ist=a.istBestand[sid]||0;const soll=a.sollBestand[sid]||0;const min=a.mindestmenge[sid]||0;const conv=formatUnitConv(ist,a);const bp=a.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0;const wert=ist*bp;tw+=wert;
    html += `<tr><td class="mono">${esc(a.sku)}</td><td>${esc(artN(a))}</td><td>${esc(st?.name||"")}</td><td>${esc(a.lagerort?.[sid]||"—")}</td><td>${esc(a.einheit)}</td><td class="r mono${ist<=min?" crit":""}">${ist}</td><td class="r">${esc(conv)}</td><td class="r mono">${soll}</td><td class="r mono">${min}</td><td class="r mono">${wert.toFixed(2)} €</td></tr>`;
  });});
  html += `</tbody><tfoot><tr><td colspan="9" style="text-align:right;font-weight:bold;padding-top:8px">Gesamt:</td><td class="r mono" style="font-weight:bold;padding-top:8px">${tw.toFixed(2)} €</td></tr></tfoot></table></body></html>`;
  openPrintHTML(html);
}

// ═══ LOGIN ═══