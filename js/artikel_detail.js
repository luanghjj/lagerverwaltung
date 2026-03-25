// ═══ ARTIKEL DETAIL + EDITOR ═══
function showArtikelDetail(id) {
  const a = D.artikel.find(x=>x.id===id);
  if (!a) return;
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-xl" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${esc(artN(a))}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div style="display:grid;grid-template-columns:${a.bilder?.length?"1fr 1fr":"1fr"};gap:14px">`;
  if (a.bilder?.length) {
    h += `<div>`;
    h += `<div style="position:relative">`;
    h += `<img class="img-main" id="artDetailMainImg" src="${esc(a.bilder[0])}" onclick="adGalleryNext('${a.id}',1)">`;
    if (a.bilder.length > 1) {
      h += `<button onclick="adGalleryNext('${a.id}',-1)" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">‹</button>`;
      h += `<button onclick="adGalleryNext('${a.id}',1)" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">›</button>`;
      h += `<div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.5);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600" id="artDetailImgCounter">1 / ${a.bilder.length}</div>`;
    }
    h += `</div>`;
    if (a.bilder.length > 1) {
      h += `<div class="img-gallery" style="margin-top:6px">`;
      a.bilder.forEach((img, i) => {
        h += `<img src="${esc(img)}" class="${i === 0 ? "on" : ""}" onclick="adGallerySet('${a.id}',${i})" id="adThumb_${i}">`;
      });
      h += `</div>`;
    }
    h += `</div>`;
    window._adGalleryIdx = 0;
    window._adGalleryId = a.id;
  }
  h += `<div>`;
  h += `<div style="display:flex;gap:4px;margin-bottom:6px">${a.kategorien.map(kId=>{const k=D.kategorien.find(x=>x.id===kId);return k?`<span class="kt" style="background:${k.farbe}22;color:${k.farbe};font-size:11px;padding:2px 7px">${esc(katN(k))}</span>`:""}).join("")}</div>`;
  h += `<div style="font-family:var(--m);font-size:10.5px;color:var(--t3);margin-bottom:6px">SKU: ${esc(a.sku)} · ${esc(a.einheit)}${a.packSize>1?` · ${a.packSize}/${esc(a.packUnit)}`:""}</div>`;
  if (artD(a)) h += `<p style="font-size:12.5px;color:var(--t2);margin-bottom:10px;line-height:1.4">${esc(artD(a))}</p>`;
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:4px">${t("c.supplier")}</div>`;
  a.lieferanten.forEach(al => { const l = D.lieferanten.find(x=>x.id===al.lieferantId); h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--bd)"><span style="font-size:12px">${esc(l?.name||"—")}${al.artNr?` <span style="font-family:var(--m);font-size:10px;color:var(--t3)">${esc(al.artNr)}</span>`:""}</span>${canP()?`<span style="font-family:var(--m);font-weight:600">${al.preis.toFixed(2)} €/${esc(a.einheit)}</span>`:""}</div>`; });

  // Price history
  if (canP()) {
    const ph = (D.preisHistorie||[]).filter(p=>p.artikelId===a.id).slice(0,5);
    if (ph.length) {
      h += `<div style="margin-top:6px;font-size:9.5px;color:var(--t3)"><div style="font-weight:700;margin-bottom:2px">📈 ${LANG==="vi"?"Lịch sử giá":"Preishistorie"}</div>`;
      ph.forEach(p => {
        const l = D.lieferanten.find(x=>x.id===p.lieferantId);
        const dir = p.neu > p.alt ? "↑" : "↓";
        const col = p.neu > p.alt ? "var(--rd)" : "var(--gn)";
        const pctChange = p.alt > 0 ? ((p.neu - p.alt) / p.alt * 100).toFixed(1) : "—";
        h += `<div style="display:flex;justify-content:space-between;padding:1px 0"><span>${fDT(p.datum)} · ${esc(l?.name||"?")}</span><span style="font-family:var(--m);color:${col}">${p.alt.toFixed(2)}→${p.neu.toFixed(2)} <b>${dir}${pctChange}%</b></span></div>`;
      });
      h += `</div>`;
    }
  }
  h += `</div></div>`;

  h += `<div style="margin-top:14px;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">${t("c.location")}</div>`;
  vS.forEach(s => {
    const ist=a.istBestand[s.id]||0,soll=a.sollBestand[s.id]||0,min=a.mindestmenge[s.id]||0;
    const conv = formatUnitConv(ist,a);
    const fehl = Math.max(1, soll-ist);
    // Lieferant selector
    const liefOpts = a.lieferanten.map(al => { const l=D.lieferanten.find(x=>x.id===al.lieferantId); return `<option value="${al.lieferantId}">${esc(l?.name||"?")}${canP()?" ("+al.preis.toFixed(2)+"€)":""}</option>`; }).join("");
    h += `<div class="cd"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="min-width:100px"><div style="font-weight:600;font-size:12.5px">${esc(s.name)}</div><span class="loc-tag" style="margin-top:2px">${esc(a.lagerort?.[s.id]||"—")}</span></div><div style="flex:1;min-width:110px">${stkBar(ist,soll,min,a.einheit)}${conv?`<div class="unit-conv">= ${esc(conv)}</div>`:""}</div>`;

    // Quick +/- buttons (direct booking)
    const canWE = can(U.role,"eingang"), canWA = can(U.role,"ausgang");
    if (canWE || canWA) {
      h += `<div style="display:flex;gap:3px;align-items:center;flex-shrink:0">`;
      if (canWA) h += `<button class="btn btn-o" onclick="event.stopPropagation();quickBook('${a.id}','${s.id}','ausgang',1)" style="padding:6px 10px;font-size:14px;font-weight:800;min-width:36px;justify-content:center;color:var(--rd)"${ist<=0?' disabled style="opacity:.3"':""}>−1</button>`;
      h += `<span style="font-family:var(--m);font-weight:700;font-size:15px;min-width:30px;text-align:center">${ist}</span>`;
      if (canWE) h += `<button class="btn btn-o" onclick="event.stopPropagation();quickBook('${a.id}','${s.id}','eingang',1)" style="padding:6px 10px;font-size:14px;font-weight:800;min-width:36px;justify-content:center;color:var(--gn)">+1</button>`;
      h += `</div>`;
    }

    h += `<div style="display:flex;flex-direction:column;gap:4px">`;
    h += `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><input class="inp" type="number" min="1" value="${fehl}" id="addqty_${s.id}" style="width:60px;text-align:center;padding:8px 4px;font-size:15px;font-family:var(--m);font-weight:700">`;
    if (a.lieferanten.length > 1) {
      h += `<select class="sel" id="addlief_${s.id}" style="min-width:120px;font-size:13px;font-weight:700;padding:9px 8px">${liefOpts}</select>`;
    }
    h += `<button class="btn btn-g" onclick="addToBestellliste('${a.id}','${s.id}')" style="padding:8px 14px;font-size:13px;font-weight:700;white-space:nowrap">🛒 ${LANG==="vi"?"Đặt":"Bestellen"}</button></div>`;
    // Inter-Standort transfer
    const otherSt = vS.filter(os=>os.id!==s.id);
    if (otherSt.length && ist > 0) {
      h += `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><input class="inp" type="number" min="1" value="1" id="addtfqty_${s.id}" style="width:60px;text-align:center;padding:8px 4px;font-size:15px;font-family:var(--m);font-weight:700"><select class="sel" id="addtf_${s.id}" style="flex:1;min-width:140px;font-size:13px;font-weight:700;padding:9px 8px">${otherSt.map(os=>`<option value="${os.id}">→ ${esc(os.name)} (${a.istBestand[os.id]||0} ${esc(a.einheit)})</option>`).join("")}</select><button class="btn btn-o" onclick="addInterTransfer('${a.id}','${s.id}')" style="padding:9px 14px;font-size:13px;font-weight:700;white-space:nowrap">⇄ ${LANG==="vi"?"Chuyển kho":"Umbuchen"}</button></div>`;
    }
    h += `</div></div></div>`;
  });

  // ═══ MOVEMENT HISTORY ═══
  const artBew = D.bewegungen.filter(b=>b.artikelId===a.id).slice(0,10);
  if (artBew.length) {
    h += `<div style="margin-top:14px;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;margin-bottom:6px">${LANG==="vi"?"Lịch sử biến động":"Letzte Bewegungen"} (${Math.min(artBew.length,10)})</div>`;
    h += `<div class="tw"><table><thead><tr><th>${t("c.date")}</th><th>${t("c.type")}</th><th>${t("c.location")}</th><th style="text-align:right">${t("c.quantity")}</th><th>${t("c.reference")}</th><th>${LANG==="vi"?"NV":"MA"}</th></tr></thead><tbody>`;
    artBew.forEach(b => {
      const bt = BT[b.typ]||{s:"?",c:"#666",i:"?"};
      const s = D.standorte.find(x=>x.id===b.standortId);
      const usr = D.users.find(x=>x.id===b.benutzer);
      const plus = ["eingang","korrektur_plus"].includes(b.typ);
      const minus = ["ausgang","korrektur_minus"].includes(b.typ);
      const conv = formatUnitConv(b.menge, a);
      h += `<tr><td style="font-family:var(--m);font-size:9.5px;white-space:nowrap">${fDT(b.datum)}</td>`;
      h += `<td><span class="bwt" style="background:${bt.c}18;color:${bt.c}">${bt.i} ${bt.s}</span></td>`;
      h += `<td style="font-size:11px">${esc(s?.name||"")}${b.zielStandortId?` → ${esc(D.standorte.find(x=>x.id===b.zielStandortId)?.name||"")}`:""}</td>`;
      h += `<td style="text-align:right;font-family:var(--m);font-weight:700;color:${plus?"var(--gn)":minus?"var(--rd)":"var(--pu)"}">${plus?"+":minus?"−":"⇄"}${b.menge}${conv?`<span style="font-weight:400;color:var(--t3);font-size:9px"> ${esc(conv)}</span>`:""}</td>`;
      h += `<td style="font-family:var(--m);font-size:9.5px;color:var(--t2)">${esc(b.referenz||"")}</td>`;
      h += `<td style="font-size:10px">${usr?esc(usr.name):""}</td></tr>`;
    });
    h += `</tbody></table></div>`;
    if (D.bewegungen.filter(b=>b.artikelId===a.id).length > 10) {
      h += `<div style="text-align:center;margin-top:4px"><button class="btn btn-o btn-sm" onclick="closeModal();BWG_SEARCH=decodeURIComponent('${encodeURIComponent(a.sku)}');goPage('bewegungen')">${LANG==="vi"?"Xem tất cả biến động":"Alle Bewegungen anzeigen"} →</button></div>`;
    }
  }

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function addToBestellliste(artId, stId) {
  const a = D.artikel.find(x=>x.id===artId);
  const qty = parseInt($(`#addqty_${stId}`)?.value) || 1;
  const liefSel = $(`#addlief_${stId}`);
  const liefId = liefSel ? liefSel.value : (a?.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]).lieferantId : "");
  const ex = D.bestellliste.find(x=>x.artikelId===artId && x.standortId===stId && x.lieferantId===liefId);
  if (ex) ex.menge += qty;
  else D.bestellliste.push({id:uid(),artikelId:artId,standortId:stId,menge:qty,lieferantId:liefId});
  save();
  const liefName = D.lieferanten.find(l=>l.id===liefId)?.name || "";
  toast(`${qty}× → ${t("nav.orderlist")}${liefName?" · "+liefName:""}`,"s");
}

function addInterTransfer(artId, vonStId) {
  const a = D.artikel.find(x=>x.id===artId);
  const qty = parseInt($(`#addtfqty_${vonStId}`)?.value) || 1;
  const nachStId = $(`#addtf_${vonStId}`)?.value;
  if (!nachStId || nachStId === vonStId) return;
  const vonName = D.standorte.find(s=>s.id===vonStId)?.name;
  const nachName = D.standorte.find(s=>s.id===nachStId)?.name;
  const vonIst = a?.istBestand[vonStId]||0;
  const actualQty = Math.min(qty, vonIst);
  if (actualQty <= 0) { toast(LANG==="vi"?"Không đủ hàng":"Kein Bestand vorhanden","e"); return; }

  cConfirm(
    LANG==="vi"
      ? `${actualQty} ${a?.einheit} ${artN(a)} từ ${vonName} → ${nachName}?`
      : `${actualQty} ${a?.einheit} ${artN(a)} von ${vonName} → ${nachName} umbuchen?`,
    () => {
      if (!D.transfers) D.transfers = [];
      a.istBestand[vonStId] = vonIst - actualQty;
      D.bewegungen.unshift({ id:uid(), typ:"umbuchung", artikelId:artId, standortId:vonStId, zielStandortId:nachStId, menge:actualQty, datum:nw(), benutzer:U.id, referenz:`UB→${nachName}`, notiz:LANG==="vi"?"Chờ xác nhận":"Wartet auf Bestätigung", lieferantId:"" });
      D.transfers.unshift({ id:uid(), vonId:vonStId, nachId:nachStId, items:[{artId,menge:actualQty}], status:"unterwegs", datum:nw(), benutzer:U.id });
      save(); closeModal(); render();
      toast(`⇄ ${actualQty}× ${artN(a)} ${vonName} → ${nachName} (${LANG==="vi"?"chờ xác nhận":"wartet"})`,"s");
    }
  );
}

function editArtikel(id) {
  const a = id ? D.artikel.find(x=>x.id===id) : null;
  const f = a ? JSON.parse(JSON.stringify(a)) : {id:uid(),name:"",name_vi:"",sku:"",barcodes:[],kategorien:[],bilder:[],beschreibung:"",beschreibung_vi:"",lagerort:{},istBestand:{},sollBestand:{},mindestmenge:{},einheit:"Stk.",packUnit:"",packSize:0,lieferanten:[]};
  const title = a ? t("c.edit") : t("c.new");
  const units = ["Stk.","kg","g","L","ml","Fl.","Pkg.","Dose","Karton"];

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${title} ${t("c.article")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b" id="artEditBody">`;

  // Names
  h += `<div class="g2"><div class="fg"><label>${t("a.namede")} *</label><input class="inp" id="ae_name" value="${esc(f.name)}"></div><div class="fg"><label>${t("a.namevi")}</label><input class="inp" id="ae_name_vi" value="${esc(f.name_vi||"")}" placeholder="Tên sản phẩm..."></div></div>`;

  // SKU, Unit, Pack
  h += `<div class="g3"><div class="fg"><label>SKU</label><input class="inp" id="ae_sku" value="${esc(f.sku)}"></div><div class="fg"><label>${LANG==="vi"?"ĐV cơ bản":"Einheit"}</label><select class="sel" id="ae_einheit">${units.map(u=>`<option ${f.einheit===u?"selected":""}>${u}</option>`).join("")}</select></div><div class="fg"><label>${t("a.packunit")}</label><input class="inp" id="ae_packUnit" value="${esc(f.packUnit||"")}" placeholder="Karton, Kiste..."></div></div>`;

  // Barcodes
  h += `<div class="fg"><label>Barcodes / EAN</label><div id="ae_barcodes" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">`;
  (f.barcodes||[]).forEach((bc, i) => {
    h += `<div style="display:flex;align-items:center;gap:3px;padding:3px 8px;background:var(--b4);border-radius:5px;font-family:var(--m);font-size:11px"><span style="font-size:11px">▮</span>${esc(bc)}<button class="bi dn" style="font-size:9px;padding:1px" onclick="aeRemBarcode(${i})">✕</button></div>`;
  });
  h += `</div><div style="display:flex;gap:4px"><input class="inp" id="ae_bc_input" placeholder="${LANG==="vi"?"Nhập mã vạch...":"Barcode eingeben..."}" style="flex:1;font-family:var(--m);letter-spacing:1px" onkeydown="if(event.key==='Enter'){event.preventDefault();aeAddBarcode()}"><button class="btn btn-o btn-sm" onclick="aeAddBarcode()">+ Barcode</button></div></div>`;
  h += `<div class="g3"><div class="fg"><label>${LANG==="vi"?"Số lượng/Gói":"Stk. pro Gebinde"}</label><input class="inp" type="number" id="ae_packSize" value="${f.packSize||""}" min="0" placeholder="z.B. 12"></div><div class="fg"><label>${LANG==="vi"?"Mô tả (DE)":"Beschreibung (DE)"}</label><input class="inp" id="ae_desc" value="${esc(f.beschreibung||"")}"></div><div class="fg"><label>${LANG==="vi"?"Mô tả (VI)":"Beschreibung (VI)"}</label><input class="inp" id="ae_desc_vi" value="${esc(f.beschreibung_vi||"")}" placeholder="Mô tả..."></div></div>`;

  // Images
  const imgCount = (f.bilder||[]).length;
  h += `<div class="fg"><label>${LANG==="vi"?"Hình ảnh":"Bilder"} (${imgCount}/5)</label><div id="ae_imgs" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">`;
  (f.bilder||[]).forEach((b,i) => { h += `<div style="position:relative"><img src="${esc(b)}" style="width:60px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--bd)"><button class="bi dn" style="position:absolute;top:-4px;right:-4px;background:var(--r2);border-radius:50%;width:16px;height:16px;font-size:9px" onclick="aeRemImg(${i})">✕</button></div>`; });
  h += `</div>${imgCount<5?`<div style="display:flex;gap:4px"><input type="file" id="ae_img_file" accept="image/*" multiple style="display:none" onchange="aeUploadImgs(this.files)"><button class="btn btn-o btn-sm" onclick="document.getElementById('ae_img_file').click()">📷 ${LANG==="vi"?"Tải ảnh":"Bild hochladen"}</button><button class="btn btn-o btn-sm" onclick="aeAddImgUrl()">🔗 URL</button></div>`:`<div style="font-size:10px;color:var(--t3)">${LANG==="vi"?"Đã đạt tối đa 5 ảnh":"Maximum 5 Bilder erreicht"}</div>`}</div>`;

  // Categories
  h += `<div class="fg"><label>${t("c.categories")}</label><div class="mc" id="ae_kats">`;
  D.kategorien.forEach(k => {
    const checked = f.kategorien.includes(k.id);
    h += `<div class="mc-it ${checked?"checked":""}" onclick="aeTogKat('${k.id}',this)" style="border-left:3px solid ${k.farbe}">${checked?"✓":"○"} ${esc(katN(k))}</div>`;
  });
  h += `</div></div>`;

  // Stock per location (only user's standorte)
  const aeStandorte = U.standorte.includes("all") ? D.standorte.filter(s=>s.aktiv) : D.standorte.filter(s=>s.aktiv && U.standorte.includes(s.id));
  h += `<div style="font-size:9.5px;font-weight:700;color:var(--t2);margin:8px 0 4px;text-transform:uppercase">${LANG==="vi"?"Tồn kho theo CN":"Bestände pro Standort"}</div>`;
  aeStandorte.forEach(s => {
    h += `<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:600;margin-bottom:2px;color:var(--ac)">${esc(s.name)}</div><div class="g4">`;
    h += `<div class="fg"><label>${t("a.stock")}</label><input class="inp" type="number" id="ae_ist_${s.id}" value="${f.istBestand[s.id]||""}"></div>`;
    h += `<div class="fg"><label>${t("a.target")}</label><input class="inp" type="number" id="ae_soll_${s.id}" value="${f.sollBestand[s.id]||""}"></div>`;
    h += `<div class="fg"><label>${t("a.minimum")}</label><input class="inp" type="number" id="ae_min_${s.id}" value="${f.mindestmenge[s.id]||""}"></div>`;
    const lpOpts = (D.lagerplaetze||[]).filter(lp=>lp.standortId===s.id).map(lp => `<option value="${esc(lp.name)}" ${f.lagerort?.[s.id]===lp.name?"selected":""}>${esc(lp.name)}</option>`).join("");
    h += `<div class="fg"><label>${t("c.storageloc")}</label><select class="sel" id="ae_loc_${s.id}"><option value="">— ${LANG==="vi"?"Chọn":"Wählen"} —</option>${lpOpts}</select></div>`;
    h += `</div></div>`;
  });

  // Suppliers
  h += `<div style="font-size:9.5px;font-weight:700;color:var(--t2);margin:8px 0 4px;text-transform:uppercase">${LANG==="vi"?"NCC & Giá":"Lieferanten & Preise"}</div><div id="ae_liefs">`;
  (f.lieferanten||[]).forEach((l,i) => {
    h += `<div style="display:flex;gap:5px;align-items:center;margin-bottom:3px" id="ae_lief_${i}"><select class="sel" style="flex:2" id="ae_lief_id_${i}">${D.lieferanten.map(lf=>`<option value="${lf.id}" ${l.lieferantId===lf.id?"selected":""}>${esc(lf.name)}</option>`).join("")}</select><input class="inp" style="flex:1" placeholder="${LANG==="vi"?"Mã NCC":"Lief.-Art.Nr."}" id="ae_lief_nr_${i}" value="${esc(l.artNr||"")}"><input class="inp" style="flex:1" type="number" step="0.01" placeholder="€" id="ae_lief_p_${i}" value="${l.preis}"><button class="bi dn" onclick="aeRemLief(${i})">✕</button></div>`;
  });
  h += `</div><button class="btn btn-o btn-sm" onclick="aeAddLief()">+ ${t("c.supplier")}</button>`;

  // Footer
  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="aeSave('${f.id}',${a?'true':'false'})">${t("c.save")}</button></div></div></div>`;

  // Store state in window for callbacks
  window._aeForm = f;
  window._aeNameDupConfirmed = false;
  window._aeSollWarnConfirmed = false;
  document.body.insertAdjacentHTML("beforeend", h);
}

// Article editor helpers
function aeUploadImgs(files) {
  if (!files || !files.length) return;
  const f = window._aeForm;
  f.bilder = f.bilder || [];
  const remaining = 5 - f.bilder.length;
  if (remaining <= 0) { toast(LANG==="vi"?"Tối đa 5 ảnh":"Max. 5 Bilder","e"); return; }
  const toProcess = Math.min(files.length, remaining);
  let processed = 0;
  for (let i = 0; i < toProcess; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) continue;
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const maxS = 400; let w = img.width, h = img.height;
        if (w > maxS || h > maxS) { const r = Math.min(maxS/w, maxS/h); w = Math.round(w*r); h = Math.round(h*r); }
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        f.bilder.push(c.toDataURL("image/jpeg", 0.75));
        processed++;
        if (processed >= toProcess) { aeRenderImgs(); toast(`${processed} ${LANG==="vi"?"ảnh đã tải":"Bild(er) geladen"}`,"s"); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function aeAddImgUrl() {
  const f = window._aeForm;
  f.bilder = f.bilder || [];
  if (f.bilder.length >= 5) { toast(LANG==="vi"?"Tối đa 5 ảnh":"Max. 5 Bilder","e"); return; }
  const url = prompt(LANG==="vi"?"Nhập URL hình:":"Bild-URL eingeben:");
  if (!url) return;
  f.bilder.push(url);
  aeRenderImgs();
}

function aeRenderImgs() {
  const container = $("#ae_imgs");
  if (!container) return;
  let ih = "";
  (window._aeForm.bilder||[]).forEach((b,i) => { ih += `<div style="position:relative"><img src="${esc(b)}" style="width:60px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--bd)"><button class="bi dn" style="position:absolute;top:-4px;right:-4px;background:var(--r2);border-radius:50%;width:16px;height:16px;font-size:9px" onclick="aeRemImg(${i})">✕</button></div>`; });
  container.innerHTML = ih;
}

function aeRemImg(i) {
  window._aeForm.bilder.splice(i, 1);
  aeRenderImgs();
}

function aeAddBarcode() {
  const inp = document.getElementById("ae_bc_input");
  const bc = (inp?.value || "").trim();
  if (!bc) return;
  if ((window._aeForm.barcodes||[]).includes(bc)) { toast(LANG==="vi"?"Mã vạch đã tồn tại":"Barcode existiert bereits","e"); return; }
  const other = D.artikel.find(a => a.id !== window._aeForm.id && (a.barcodes||[]).includes(bc));
  if (other) { toast(`${LANG==="vi"?"Mã vạch đã dùng cho":"Barcode bereits bei"}: ${artN(other)}`,"e"); return; }
  window._aeForm.barcodes = window._aeForm.barcodes || [];
  window._aeForm.barcodes.push(bc);
  inp.value = "";
  inp.focus();
  aeRenderBarcodes();
  toast(`Barcode ${bc} +`,"s");
}

function aeRemBarcode(i) {
  window._aeForm.barcodes.splice(i, 1);
  aeRenderBarcodes();
}

function aeRenderBarcodes() {
  const container = document.getElementById("ae_barcodes");
  if (!container) return;
  let ih = "";
  (window._aeForm.barcodes||[]).forEach((b, i) => { ih += `<div style="display:flex;align-items:center;gap:3px;padding:3px 8px;background:var(--b4);border-radius:5px;font-family:var(--m);font-size:11px"><span style="font-size:11px">▮</span>${esc(b)}<button class="bi dn" style="font-size:9px;padding:1px" onclick="aeRemBarcode(${i})">✕</button></div>`; });
  container.innerHTML = ih;
}

function aeTogKat(kId, el) {
  const f = window._aeForm;
  const idx = f.kategorien.indexOf(kId);
  if (idx >= 0) { f.kategorien.splice(idx, 1); el.classList.remove("checked"); el.textContent = "○ " + el.textContent.substring(2); }
  else { f.kategorien.push(kId); el.classList.add("checked"); el.textContent = "✓ " + el.textContent.substring(2); }
}

function aeAddLief() {
  const f = window._aeForm;
  const i = f.lieferanten.length;
  f.lieferanten.push({lieferantId: D.lieferanten[0]?.id || "", preis: 0, artNr: ""});
  const container = $("#ae_liefs");
  if (container) {
    container.insertAdjacentHTML("beforeend",
      `<div style="display:flex;gap:5px;align-items:center;margin-bottom:3px" id="ae_lief_${i}"><select class="sel" style="flex:2" id="ae_lief_id_${i}">${D.lieferanten.map(lf=>`<option value="${lf.id}">${esc(lf.name)}</option>`).join("")}</select><input class="inp" style="flex:1" placeholder="${LANG==="vi"?"Mã NCC":"Lief.-Art.Nr."}" id="ae_lief_nr_${i}" value=""><input class="inp" style="flex:1" type="number" step="0.01" placeholder="€" id="ae_lief_p_${i}" value="0"><button class="bi dn" onclick="aeRemLief(${i})">✕</button></div>`
    );
  }
}

function aeRemLief(i) {
  const el = $(`#ae_lief_${i}`);
  if (el) el.remove();
  window._aeForm.lieferanten[i] = null; // mark for removal
}

function aeSave(id, isEdit) {
  const f = window._aeForm;
  f.name = $("#ae_name")?.value || "";
  f.name_vi = $("#ae_name_vi")?.value || "";
  f.sku = $("#ae_sku")?.value || "";
  f.einheit = $("#ae_einheit")?.value || "Stk.";
  f.packUnit = $("#ae_packUnit")?.value || "";
  f.packSize = parseInt($("#ae_packSize")?.value) || 0;
  f.beschreibung = $("#ae_desc")?.value || "";
  f.beschreibung_vi = $("#ae_desc_vi")?.value || "";

  if (!f.name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }

  // SKU duplicate check
  if (f.sku) {
    const skuDup = D.artikel.find(a => a.id !== f.id && a.sku.toLowerCase() === f.sku.toLowerCase());
    if (skuDup) { toast(`${LANG==="vi"?"SKU đã tồn tại":"SKU existiert bereits"}: ${artN(skuDup)} (${skuDup.sku})`,"e"); return; }
  }

  // Name duplicate warning (not blocking)
  const nameDup = D.artikel.find(a => a.id !== f.id && a.name.toLowerCase() === f.name.toLowerCase());
  if (nameDup && !window._aeNameDupConfirmed) {
    window._aeNameDupConfirmed = true;
    toast(`⚠ ${LANG==="vi"?"Trùng tên với":"Gleichnamig mit"}: ${artN(nameDup)} — ${LANG==="vi"?"Nhấn Speichern lần nữa":"Nochmal Speichern drücken"}`,"i");
    return;
  }
  window._aeNameDupConfirmed = false;

  // Stock per location (only user's standorte)
  const aeStandorte = U.standorte.includes("all") ? D.standorte.filter(s=>s.aktiv) : D.standorte.filter(s=>s.aktiv && U.standorte.includes(s.id));
  aeStandorte.forEach(s => {
    f.istBestand[s.id] = parseInt($(`#ae_ist_${s.id}`)?.value) || 0;
    f.sollBestand[s.id] = parseInt($(`#ae_soll_${s.id}`)?.value) || 0;
    f.mindestmenge[s.id] = parseInt($(`#ae_min_${s.id}`)?.value) || 0;
    f.lagerort = f.lagerort || {};
    f.lagerort[s.id] = $(`#ae_loc_${s.id}`)?.value || "";
  });

  // Warning: no Soll/Min set (non-blocking, only for new articles)
  if (!isEdit && !window._aeSollWarnConfirmed) {
    const hasSoll = aeStandorte.some(s => f.sollBestand[s.id] > 0);
    const hasMin = aeStandorte.some(s => f.mindestmenge[s.id] > 0);
    const hasLoc = aeStandorte.some(s => f.lagerort[s.id]);
    const warnings = [];
    if (!hasSoll) warnings.push(LANG==="vi" ? "Chưa có Soll-Bestand" : "Kein Soll-Bestand");
    if (!hasMin) warnings.push(LANG==="vi" ? "Chưa có Mindestmenge" : "Keine Mindestmenge");
    if (!hasLoc) warnings.push(LANG==="vi" ? "Chưa chọn vị trí kho" : "Kein Lagerort");
    if (warnings.length) {
      window._aeSollWarnConfirmed = true;
      toast(`⚠ ${warnings.join(", ")} — ${LANG==="vi"?"Nhấn lưu lần nữa":"Nochmal Speichern drücken"}`,"i");
      return;
    }
  }
  window._aeSollWarnConfirmed = false;

  // Suppliers - read from DOM
  const liefs = [];
  f.lieferanten.forEach((l, i) => {
    if (l === null) return; // removed
    const selEl = $(`#ae_lief_id_${i}`);
    const priceEl = $(`#ae_lief_p_${i}`);
    const nrEl = $(`#ae_lief_nr_${i}`);
    if (selEl && priceEl) {
      liefs.push({ lieferantId: selEl.value, preis: parseFloat(priceEl.value) || 0, artNr: nrEl?.value || "" });
    }
  });
  f.lieferanten = liefs;

  // Save
  if (isEdit) {
    const idx = D.artikel.findIndex(x=>x.id===id);
    if (idx >= 0) D.artikel[idx] = f;
  } else {
    // Auto-fill: khi tạo SP mới, copy sollBestand/mindestmenge từ kho gốc sang các kho khác
    const allActive = D.standorte.filter(s => s.aktiv);
    const srcSt = aeStandorte.find(s => f.istBestand[s.id] > 0) || aeStandorte[0];
    if (srcSt) {
      const srcSoll = f.sollBestand[srcSt.id] || 0;
      const srcMin = f.mindestmenge[srcSt.id] || 0;
      allActive.forEach(s => {
        // Khởi tạo istBestand nếu chưa có
        if (f.istBestand[s.id] === undefined || f.istBestand[s.id] === null) {
          f.istBestand[s.id] = 0;
        }
        // Copy soll/min từ kho gốc cho các kho có stock = 0 và chưa tự nhập soll/min
        if (s.id !== srcSt.id && (f.istBestand[s.id] || 0) === 0) {
          if (!f.sollBestand[s.id]) f.sollBestand[s.id] = srcSoll;
          if (!f.mindestmenge[s.id]) f.mindestmenge[s.id] = srcMin;
        }
        f.lagerort = f.lagerort || {};
        if (!f.lagerort[s.id]) f.lagerort[s.id] = "";
      });
    }
    D.artikel.push(f);
  }
  save();
  closeModal();
  render();
  if (typeof sbSaveArtikel === "function") sbSaveArtikel(f).catch(e => console.error("sbSaveArtikel:", e));
  toast("✓","s");
}
function delArtikel(id) {
  const a = D.artikel.find(x=>x.id===id);
  cConfirm(`${artN(a)} ${t("c.delete")}?`, () => {
    D.artikel = D.artikel.filter(x=>x.id!==id);
    save(); render();
    if (typeof sb !== "undefined") sb.from("artikel").update({ deleted_at: new Date().toISOString() }).eq("id", id).then(() => {}).catch(e => console.error("sbDelArtikel:", e));
    toast("✓","i");
  });
}

// ═══ ARTICLE DETAIL IMAGE GALLERY ═══
function adGallerySet(artId, idx) {
  const a = D.artikel.find(x => x.id === artId);
  if (!a || !a.bilder?.length) return;
  window._adGalleryIdx = idx;
  const img = document.getElementById("artDetailMainImg");
  if (img) img.src = a.bilder[idx];
  const counter = document.getElementById("artDetailImgCounter");
  if (counter) counter.textContent = `${idx + 1} / ${a.bilder.length}`;
  // Update thumbnails
  a.bilder.forEach((_, i) => {
    const th = document.getElementById(`adThumb_${i}`);
    if (th) th.className = i === idx ? "on" : "";
  });
}

function adGalleryNext(artId, dir) {
  const a = D.artikel.find(x => x.id === artId);
  if (!a || !a.bilder?.length) return;
  let idx = (window._adGalleryIdx || 0) + dir;
  if (idx < 0) idx = a.bilder.length - 1;
  if (idx >= a.bilder.length) idx = 0;
  adGallerySet(artId, idx);
}

// ═══ QUICK BOOKING (+1/-1 direct from article detail) ═══
function quickBook(artId, stId, typ, menge) {
  if (_actionLock) return;
  _actionLock = true; setTimeout(() => _actionLock = false, 1000);
  const perm = typ === "eingang" ? "eingang" : "ausgang";
  if (!can(U.role, perm)) { toast(LANG==="vi"?"Không có quyền":"Keine Berechtigung","e"); return; }
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  const isE = typ === "eingang";
  const ist = a.istBestand[stId] || 0;
  if (!isE && ist < menge) { toast(LANG==="vi"?"Không đủ hàng":"Kein Bestand","e"); return; }
  if (isE) a.istBestand[stId] = ist + menge;
  else a.istBestand[stId] = Math.max(0, ist - menge);
  D.bewegungen.unshift({ id:uid(), typ, artikelId:artId, standortId:stId, menge, datum:nw(), benutzer:U.id, referenz:"QUICK", notiz:"", lieferantId:"" });
  save();
  if (typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e=>console.error("sbArt:",e));
  // Re-open detail to show updated stock
  closeModal();
  showArtikelDetail(artId);
  const stName = D.standorte.find(s=>s.id===stId)?.name||"";
  toast(`${isE?"+":"-"}${menge} ${artN(a)} (${stName})`,"s");
}
