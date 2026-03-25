// ═══ LIEFERANTEN (Suppliers) ═══
let LIEF_SEARCH = "";
function renderLieferanten() {
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.suppliers")}</div><div class="mn-a">${can(U.role,"lieferanten")?`<button class="btn btn-p" onclick="editLief()">+ ${t("c.new")}</button>`:""}</div></div><div class="mn-c">`;
  h += `<div style="margin-bottom:8px"><div class="srch"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inp" placeholder="${LANG==="vi"?"Tìm NCC...":"Lieferant suchen..."}" value="${esc(LIEF_SEARCH)}" oninput="if(_IME)return;LIEF_SEARCH=this.value;render()" style="padding-right:${LIEF_SEARCH?'28px':'9px'}">${LIEF_SEARCH?`<button class="bi" onclick="LIEF_SEARCH='';render()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--t3)">✕</button>`:""}</div></div>`;
  const liefs = LIEF_SEARCH ? D.lieferanten.filter(l => { const q=norm(LIEF_SEARCH); return norm(l.name).includes(q)||norm(l.kontakt).includes(q)||norm(l.email).includes(q); }) : D.lieferanten;
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:7px">`;
  liefs.forEach(l => {
    const arts = D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===l.id));
    const nd = nextDelivery(l);
    const dl = dayL();
    const canDetail = can(U.role,"lieferanten.detail");
    h += `<div class="cd" ${canDetail?`style="cursor:pointer" onclick="showLiefDetail('${l.id}')"`:""}><div style="display:flex;justify-content:space-between"><div><div style="font-weight:700;font-size:13px">${esc(l.name)}</div><div style="font-size:10.5px;color:var(--t3)">${esc(l.kontakt)}</div></div>${can(U.role,"lieferanten")?`<div style="display:flex;gap:2px" onclick="event.stopPropagation()"><button class="bi" onclick="editLief('${l.id}')">✎</button><button class="bi dn" onclick="delLief('${l.id}')">🗑</button></div>`:""}</div><div style="display:flex;gap:8px;margin-top:5px;font-size:10.5px;color:var(--t2)"><span>☎ ${esc(l.telefon)}</span><span>✉ ${esc(l.email)}</span></div><div style="margin-top:5px;display:flex;gap:3px;align-items:center;flex-wrap:wrap"><span class="bp" style="background:var(--aA);color:var(--ac)">${arts.length} ${t("c.article")}</span>${nd?`<span class="bp" style="background:var(--gA);color:var(--gn)">📅 ${nd}</span>`:""}</div>`;
    if (arts.length) {
      h += `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px">`;
      arts.slice(0,5).forEach(a => {
        const al = a.lieferanten.find(x=>x.lieferantId===l.id);
        h += `<span style="font-size:10px;padding:1px 6px;background:var(--b4);border-radius:3px;color:var(--t2)">${esc(artN(a))}${canP()?` <b style="color:var(--tx)">${al?.preis.toFixed(2)||"?"}€</b>`:""}</span>`;
      });
      if (arts.length > 5) h += `<span style="font-size:10px;color:var(--t3)">+${arts.length-5}</span>`;
      h += `</div>`;
    }
    if (!canDetail) h += `<div style="margin-top:6px;font-size:10px;color:var(--t3);font-style:italic">${LANG==="vi"?"Chỉ quản lý xem chi tiết":"Details nur für Filialleiter/Admin"}</div>`;
    h += `<div style="margin-top:4px;display:flex;gap:1px">${WDAYS.map((d,i)=>`<span class="day-tag ${l.liefertage?.includes(d)?"on":""}">${dl[i]}</span>`).join("")}</div></div>`;
  });
  h += `</div></div>`;
  return h;
}

function editLief(id) {
  const l = id ? D.lieferanten.find(x=>x.id===id) : null;
  const f = l ? JSON.parse(JSON.stringify(l)) : {id:uid(),name:"",kontakt:"",telefon:"",email:"",adresse:"",notiz:"",liefertage:[],rhythmus:"weekly",vorlaufzeit:1};
  const dl = LANG==="vi" ? WDAYS_VI : WDAYS_S;

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${l?t("c.edit"):t("c.new")} ${t("c.supplier")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div class="fg"><label>${t("c.name")} *</label><input class="inp" id="lf_name" value="${esc(f.name)}"></div>`;
  h += `<div class="g2"><div class="fg"><label>${LANG==="vi"?"Liên hệ":"Kontakt"}</label><input class="inp" id="lf_kontakt" value="${esc(f.kontakt)}"></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Điện thoại":"Telefon"}</label><input class="inp" id="lf_telefon" value="${esc(f.telefon)}"></div></div>`;
  h += `<div class="g2"><div class="fg"><label>E-Mail</label><input class="inp" type="email" id="lf_email" value="${esc(f.email)}"></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Địa chỉ":"Adresse"}</label><input class="inp" id="lf_adresse" value="${esc(f.adresse)}"></div></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Ghi chú":"Notiz"}</label><input class="inp" id="lf_notiz" value="${esc(f.notiz)}" placeholder="${LANG==="vi"?"Đặt hàng tối thiểu...":"Mindestbestellwert..."}"></div>`;
  // Liefertage
  h += `<div class="fg"><label>${LANG==="vi"?"Ngày giao hàng":"Liefertage"}</label><div style="display:flex;gap:3px" id="lf_tage">`;
  WDAYS.forEach((d,i) => {
    const on = f.liefertage?.includes(d);
    h += `<div class="day-tag ${on?"on":""}" style="cursor:pointer;padding:4px 8px" onclick="this.classList.toggle('on')">${dl[i]}</div>`;
  });
  h += `</div></div>`;
  h += `<div class="g2"><div class="fg"><label>${LANG==="vi"?"Nhịp":"Rhythmus"}</label><select class="sel" id="lf_rhythmus"><option value="daily" ${f.rhythmus==="daily"?"selected":""}>${LANG==="vi"?"Hàng ngày":"Täglich"}</option><option value="weekly" ${f.rhythmus==="weekly"?"selected":""}>${LANG==="vi"?"Hàng tuần":"Wöchentlich"}</option><option value="biweekly" ${f.rhythmus==="biweekly"?"selected":""}>${LANG==="vi"?"2 tuần":"14-tägig"}</option><option value="monthly" ${f.rhythmus==="monthly"?"selected":""}>${LANG==="vi"?"Hàng tháng":"Monatlich"}</option></select></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Thời gian trước":"Vorlaufzeit"} (${LANG==="vi"?"ngày":"Tage"})</label><input class="inp" type="number" min="0" id="lf_vorlauf" value="${f.vorlaufzeit||1}"></div></div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveLief('${f.id}',${l?'true':'false'})">${t("c.save")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function saveLief(id, isEdit) {
  const name = document.getElementById("lf_name")?.value?.trim();
  if (!name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  // Collect liefertage from day-tag.on
  const tage = [];
  document.querySelectorAll("#lf_tage .day-tag.on").forEach((el,i) => { tage.push(WDAYS[i]); });
  const obj = {
    id, name, kontakt: document.getElementById("lf_kontakt")?.value||"",
    telefon: document.getElementById("lf_telefon")?.value||"",
    email: document.getElementById("lf_email")?.value||"",
    adresse: document.getElementById("lf_adresse")?.value||"",
    notiz: document.getElementById("lf_notiz")?.value||"",
    liefertage: tage,
    rhythmus: document.getElementById("lf_rhythmus")?.value||"weekly",
    vorlaufzeit: parseInt(document.getElementById("lf_vorlauf")?.value)||1
  };
  if (isEdit) { const idx = D.lieferanten.findIndex(x=>x.id===id); if (idx>=0) D.lieferanten[idx]=obj; }
  else D.lieferanten.push(obj);
  save(); closeModal(); render(); toast("✓","s");
  if (typeof sbSaveLieferant === "function") sbSaveLieferant(obj).catch(e => console.error("sbSaveLief:", e));
}

function delLief(id) {
  const l = D.lieferanten.find(x=>x.id===id);
  const artCount = D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===id)).length;
  const label = LANG==="vi" ? `Xóa "${l?.name}"? ${artCount} SP sẽ mất NCC này.` : `"${l?.name}" löschen? ${artCount} Artikel verlieren diesen Lieferant.`;
  cConfirm(label, () => {
    D.lieferanten = D.lieferanten.filter(x=>x.id!==id);
    D.artikel.forEach(a => { a.lieferanten = a.lieferanten.filter(al=>al.lieferantId!==id); });
    save(); render(); toast("✓","i");
    if (typeof sbDeleteLieferant === "function") sbDeleteLieferant(id).catch(e => console.error("sbDelLief:", e));
  });
}

function showLiefDetail(id) {
  if (!can(U.role,"lieferanten.detail")) { toast(LANG==="vi"?"Không có quyền":"Keine Berechtigung","e"); return; }
  const l = D.lieferanten.find(x=>x.id===id);
  if (!l) return;
  const arts = D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===l.id));
  const unassigned = D.artikel.filter(a=>!a.lieferanten.some(al=>al.lieferantId===l.id));
  const nd = nextDelivery(l);
  const dl = dayL();

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${esc(l.name)}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  // Contact info
  h += `<div class="g2" style="margin-bottom:10px"><div><span style="font-size:9.5px;color:var(--t3)">${t("c.contact")}:</span><br><strong>${esc(l.kontakt)}</strong></div><div><span style="font-size:9.5px;color:var(--t3)">Adresse:</span><br>${esc(l.adresse)}</div><div><span style="font-size:9.5px;color:var(--t3)">☎</span> ${esc(l.telefon)}</div><div><span style="font-size:9.5px;color:var(--t3)">✉</span> <a href="mailto:${esc(l.email)}" style="color:var(--ac)">${esc(l.email)}</a></div></div>`;

  // Delivery schedule
  h += `<div style="padding:6px 10px;background:var(--bg);border-radius:7px;margin-bottom:10px"><div style="font-size:10.5px;font-weight:700;margin-bottom:4px">${LANG==="vi"?"Lịch giao hàng":"Liefertermine"}</div><div style="display:flex;gap:2px;margin-bottom:3px">${WDAYS.map((d,i)=>`<span class="day-tag ${l.liefertage?.includes(d)?"on":""}" style="font-size:10.5px;padding:2px 7px">${dl[i]}</span>`).join("")}</div>`;
  const rhythLabels = {weekly:LANG==="vi"?"Hàng tuần":"Wöchentlich",biweekly:LANG==="vi"?"2 tuần/lần":"Alle 2 Wochen",monthly:LANG==="vi"?"Hàng tháng":"Monatlich",ondemand:LANG==="vi"?"Theo YC":"Auf Abruf"};
  h += `<div style="font-size:11px;color:var(--t2)">${rhythLabels[l.rhythmus]||""} · ${LANG==="vi"?"Thời gian":"Vorlaufzeit"}: ${l.vorlaufzeit||0} ${LANG==="vi"?"ngày":"Tage"}</div>`;
  if (nd) h += `<div style="font-size:11px;color:var(--gn);font-weight:600;margin-top:2px">${LANG==="vi"?"Giao tiếp theo":"Nächste Lieferung"}: ${nd}</div>`;
  if (l.notiz) h += `<div style="font-size:11px;color:var(--t3);margin-top:2px">${esc(l.notiz)}</div>`;
  h += `</div>`;

  // === ASSIGNED ARTICLES with QUICK ORDER ===
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const orderStId = STF !== "all" ? STF : vS[0]?.id || "";
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  h += `<div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">${LANG==="vi"?"Sản phẩm được cung cấp":"Zugeordnete Artikel"} (${arts.length})</div>`;
  if (arts.length) h += `<button class="btn btn-g btn-sm" onclick="liefQuickOrder('${l.id}','${orderStId}')" id="liefOrderBtn" style="font-size:11px">${LANG==="vi"?"Đặt hàng đã chọn":"Markierte bestellen"}</button>`;
  h += `</div>`;

  if (arts.length) {
    // Standort selector for ordering
    if (vS.length > 1) {
      h += `<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><span style="font-size:10px;color:var(--t3)">${t("c.location")}:</span><select class="sel" id="liefOrderSt" style="width:auto;min-width:140px;padding:3px 8px">${vS.map(s=>`<option value="${s.id}" ${s.id===orderStId?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>`;
    }

    h += `<div class="tw" style="margin-bottom:10px"><table><thead><tr><th style="width:32px"></th><th>${t("c.article")}</th><th class="mob-hide">SKU</th><th style="text-align:right">${t("a.stock")}</th>${canP()?`<th class="mob-hide" style="text-align:right">${LANG==="vi"?"Giá EK":"EK"}</th>`:""}<th style="text-align:center;color:var(--ac)">${t("c.quantity")}</th><th style="width:30px"></th></tr></thead><tbody>`;
    arts.forEach(a => {
      const al = a.lieferanten.find(x=>x.lieferantId===l.id);
      const ist = a.istBestand[orderStId]||0;
      const soll = a.sollBestand[orderStId]||0;
      const min = a.mindestmenge[orderStId]||0;
      const isCrit = min > 0 && ist <= min;
      const empf = Math.max(0, soll - ist);
      const alreadyOrdered = D.bestellungen.some(b=>b.artikelId===a.id&&b.standortId===orderStId&&b.status==="bestellt"&&b.lieferantId===l.id);
      h += `<tr style="${isCrit?"background:var(--rA)":""}${alreadyOrdered?" opacity:.5":""}">`;
      h += `<td><div class="th">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div></td>`;
      h += `<td><div style="font-weight:600">${esc(artN(a))}</div>${isCrit?`<span style="font-size:9px;color:var(--rd);font-weight:600">⚠ ${LANG==="vi"?"Dưới min":"Unter Min"}</span>`:""}</td>`;
      h += `<td class="mob-hide" style="font-family:var(--m);font-size:10.5px;color:var(--t2)">${esc(a.sku)}</td>`;
      h += `<td style="text-align:right"><span style="font-family:var(--m);font-weight:600;color:${isCrit?"var(--rd)":ist<soll?"var(--yl)":"var(--gn)"}">${ist}</span><span style="color:var(--t3);font-size:10px">/${soll} ${esc(a.einheit)}</span></td>`;
      if (canP()) h += `<td class="mob-hide" style="text-align:right;font-family:var(--m);font-size:11px">${al?.preis?.toFixed(2)||"0.00"} €</td>`;
      h += `<td style="text-align:center"><input class="inp liefOrdQty" type="number" min="0" value="${alreadyOrdered?0:empf}" data-art="${a.id}" style="width:55px;text-align:center;padding:4px;font-family:var(--m);font-size:14px;font-weight:700;border:2px solid ${empf>0&&!alreadyOrdered?"var(--ac)":"var(--bd)"}" ${alreadyOrdered?'disabled title="'+(LANG==="vi"?"Đã đặt":"Bereits bestellt")+'"':""}></td>`;
      h += `<td>${alreadyOrdered?`<span style="font-size:9px;color:var(--ac)">📦</span>`:`<button class="bi dn" onclick="removeLiefArtikel('${l.id}','${a.id}')" title="${t("c.delete")}">✕</button>`}</td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;

    // Quick fill buttons
    h += `<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">`;
    h += `<button class="btn btn-o btn-sm" onclick="liefFillAll('${l.id}','soll')">${LANG==="vi"?"Tự động (Soll−Ist)":"Auto (Soll−Ist)"}</button>`;
    h += `<button class="btn btn-o btn-sm" onclick="liefFillAll('${l.id}','crit')">${LANG==="vi"?"Chỉ SP thiếu":"Nur kritische"}</button>`;
    h += `<button class="btn btn-o btn-sm" onclick="liefFillAll('${l.id}','zero')">0 ${LANG==="vi"?"Xóa tất cả":"Alle leeren"}</button>`;
    h += `</div>`;
  } else {
    h += `<div style="padding:12px;text-align:center;color:var(--t3);font-size:12px;background:var(--b3);border-radius:7px;margin-bottom:10px">${LANG==="vi"?"Chưa có sản phẩm nào":"Noch keine Artikel zugeordnet"}</div>`;
  }

  // === ADD ARTICLE TO SUPPLIER ===
  if (unassigned.length) {
    h += `<div style="font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${LANG==="vi"?"Thêm sản phẩm":"Artikel hinzufügen"}</div>`;
    h += `<div style="display:flex;gap:5px;align-items:flex-end;margin-bottom:6px">`;
    h += `<div class="fg" style="flex:2;margin-bottom:0"><label>${t("c.article")}</label><select class="sel" id="lief_add_art">${unassigned.map(a=>`<option value="${a.id}">${esc(artN(a))} (${esc(a.sku)})</option>`).join("")}</select></div>`;
    h += `<div class="fg" style="flex:1;margin-bottom:0"><label>${LANG==="vi"?"Mã NCC":"Lief.-Art.Nr."}</label><input class="inp" id="lief_add_artnr" placeholder="Art.Nr."></div>`;
    h += `<div class="fg" style="flex:1;margin-bottom:0"><label>${LANG==="vi"?"Giá":"Preis"} (€)</label><input class="inp" type="number" step="0.01" id="lief_add_preis" value="0" style="text-align:right"></div>`;
    h += `<button class="btn btn-p" onclick="addLiefArtikel('${l.id}')">+ ${LANG==="vi"?"Thêm":"Hinzufügen"}</button>`;
    h += `</div>`;
  }

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function updateLiefPreis(liefId, artId, val) {
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  const al = a.lieferanten.find(x=>x.lieferantId===liefId);
  if (al) {
    const oldPreis = al.preis;
    const newPreis = parseFloat(val) || 0;
    if (oldPreis !== newPreis) {
      if (!D.preisHistorie) D.preisHistorie = [];
      D.preisHistorie.unshift({ artikelId: artId, lieferantId: liefId, alt: oldPreis, neu: newPreis, datum: nw(), benutzer: U.id });
    }
    al.preis = newPreis; save();
    if (typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e));
  }
}

function updateLiefArtNr(liefId, artId, val) {
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  const al = a.lieferanten.find(x=>x.lieferantId===liefId);
  if (al) { al.artNr = val || ""; save(); if (typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e)); }
}

function addLiefArtikel(liefId) {
  const artId = $("#lief_add_art")?.value;
  const preis = parseFloat($("#lief_add_preis")?.value) || 0;
  const artNr = $("#lief_add_artnr")?.value || "";
  if (!artId) return;
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  if (a.lieferanten.some(al=>al.lieferantId===liefId)) { toast(LANG==="vi"?"Đã có rồi":"Bereits zugeordnet","e"); return; }
  a.lieferanten.push({ lieferantId: liefId, preis, artNr });
  save();
  if (typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e));
  closeModal();
  showLiefDetail(liefId);
  toast(`${artN(a)} → ${D.lieferanten.find(x=>x.id===liefId)?.name} ✓`, "s");
}

function removeLiefArtikel(liefId, artId) {
  const label = LANG==="vi" ? "Xóa sản phẩm khỏi NCC?" : "Artikel-Zuordnung entfernen?";
  cConfirm(label, () => {
    const a = D.artikel.find(x=>x.id===artId);
    if (a) { a.lieferanten = a.lieferanten.filter(al=>al.lieferantId!==liefId); save(); if (typeof sbSaveArtikel === "function") sbSaveArtikel(a).catch(e => console.error("sbArt:", e)); }
    closeModal();
    showLiefDetail(liefId);
    toast("✓","i");
  });
}

// ═══ LIEFERANT QUICK ORDER ═══
function liefQuickOrder(liefId, defaultStId) {
  const l = D.lieferanten.find(x=>x.id===liefId);
  const stId = document.getElementById("liefOrderSt")?.value || defaultStId;
  const arts = D.artikel.filter(a=>a.lieferanten.some(al=>al.lieferantId===liefId));
  const items = [];
  document.querySelectorAll(".liefOrdQty").forEach(inp => {
    const artId = inp.dataset.art;
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) items.push({artId, qty});
  });
  if (!items.length) { toast(LANG==="vi"?"Chưa nhập số lượng":"Keine Mengen eingegeben","e"); return; }
  const stName = D.standorte.find(s=>s.id===stId)?.name || "";
  const label = LANG==="vi"
    ? `${items.length} Artikel bei ${l?.name} bestellen?\n\nStandort: ${stName}\nPositionen: ${items.map(it=>{const a=D.artikel.find(x=>x.id===it.artId);return `${artN(a)} ×${it.qty}`;}).join(", ")}`
    : `${items.length} Artikel bei ${l?.name} bestellen?\n\nStandort: ${stName}\nPositionen: ${items.map(it=>{const a=D.artikel.find(x=>x.id===it.artId);return `${artN(a)} ×${it.qty}`;}).join(", ")}`;
  cConfirm(label, () => {
    let added = 0;
    items.forEach(it => {
      const exists = D.bestellliste.find(bl=>bl.artikelId===it.artId&&bl.standortId===stId&&bl.lieferantId===liefId);
      if (exists) { exists.menge += it.qty; }
      else { D.bestellliste.push({id:uid(),artikelId:it.artId,standortId:stId,menge:it.qty,lieferantId:liefId}); }
      added++;
    });
    save(); closeModal(); render();
    toast(`${added} → ${t("nav.orderlist")} (${l?.name})`,"s");
    goPage("bestellliste");
  });
}

function liefFillAll(liefId, mode) {
  const stId = document.getElementById("liefOrderSt")?.value || STF || D.standorte[0]?.id;
  document.querySelectorAll(".liefOrdQty").forEach(inp => {
    if (inp.disabled) return;
    const artId = inp.dataset.art;
    const a = D.artikel.find(x=>x.id===artId);
    if (!a) return;
    const ist = a.istBestand[stId]||0, soll = a.sollBestand[stId]||0, min = a.mindestmenge[stId]||0;
    const isCrit = min > 0 && ist <= min;
    if (mode === "zero") inp.value = 0;
    else if (mode === "crit") inp.value = isCrit ? Math.max(1, soll-ist) : 0;
    else inp.value = Math.max(0, soll-ist); // "soll"
    inp.style.borderColor = parseInt(inp.value) > 0 ? "var(--ac)" : "var(--bd)";
  });
}

// ═══ BENUTZER & ZUGÄNGE ═══