// ═══ BENUTZER (User Management) ═══
function renderBenutzer() {
  const roleInfo = {
    admin: { de: "Vollzugriff auf alle Funktionen", vi: "Toàn quyền truy cập", perms: LANG==="vi" ? ["Tất cả chức năng"] : ["Alle Funktionen"] },
    manager: { de: "Artikel, Bestellungen, Lieferanten-Details, Preise sichtbar", vi: "SP, Đơn hàng, Chi tiết NCC, Xem giá", perms: LANG==="vi" ? ["Sản phẩm","Đơn hàng","Biến động","Chi tiết NCC","Xem giá","Khu vực","Xuất file","Danh mục"] : ["Artikel","Bestellungen","Bewegungen","Lief.-Details","Preise","Bereiche","Export","Kategorien"] },
    staff: { de: "Buchen, Bestellen, Bereiche — keine Preise, keine Lief.-Details", vi: "Nhập/Xuất, Đặt hàng, Khu vực — không xem giá, không xem chi tiết NCC", perms: LANG==="vi" ? ["Xem SP","Nhập/Xuất kho","Tạo đơn hàng","Khu vực","Không giá","Không chi tiết NCC"] : ["Artikel ansehen","Ein-/Ausbuchen","Bestellen","Bereiche","Keine Preise","Keine Lief.-Details"] },
  };

  let h = `<div class="mn-h"><div class="mn-t">${t("nav.users")} & ${LANG==="vi"?"Quyền truy cập":"Zugänge"}</div><div class="mn-a"><button class="btn btn-p" onclick="editUser()">+ ${t("c.new")}</button></div></div><div class="mn-c">`;

  // Role hierarchy info
  h += `<div style="background:var(--b2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">`;
  h += `<div style="font-size:11px;font-weight:700;margin-bottom:8px">${LANG==="vi"?"Phân cấp vai trò":"Rollen-Hierarchie"}</div>`;
  h += `<div style="display:flex;gap:16px;flex-wrap:wrap">`;
  for (const [role, info] of Object.entries(roleInfo)) {
    h += `<div style="display:flex;gap:8px;align-items:flex-start">`;
    h += `<div style="width:10px;height:10px;border-radius:50%;background:${ROLES[role].color};margin-top:3px;flex-shrink:0"></div>`;
    h += `<div><div style="font-weight:700;font-size:12px">${t("r."+role)}</div>`;
    h += `<div style="font-size:10px;color:var(--t3)">${LANG==="vi"?info.vi:info.de}</div>`;
    h += `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:3px">${info.perms.map(p=>`<span style="font-size:9px;padding:1px 5px;background:var(--b4);border-radius:3px;color:var(--t2)">${esc(p)}</span>`).join("")}</div>`;
    h += `</div></div>`;
  }
  h += `</div></div>`;

  // Users table
  h += `<div class="tw"><table><thead><tr>`;
  h += `<th style="width:34px"></th>`;
  h += `<th>${t("c.name")}</th>`;
  h += `<th>E-Mail</th>`;
  h += `<th>${LANG==="vi"?"Vai trò":"Rolle"}</th>`;
  h += `<th>${LANG==="vi"?"Chi nhánh":"Standorte"}</th>`;
  h += `<th>${LANG==="vi"?"Khu vực":"Bereiche"}</th>`;
  h += `<th>${LANG==="vi"?"Hoạt động":"Aktivität"}</th>`;
  h += `<th style="width:60px"></th>`;
  h += `</tr></thead><tbody>`;

  D.users.forEach(u => {
    const movCount = D.bewegungen.filter(b=>b.benutzer===u.id).length;
    const lastMov = D.bewegungen.find(b=>b.benutzer===u.id);
    const standortNames = u.standorte.includes("all")
      ? (LANG==="vi"?"Tất cả CN":"Alle Standorte")
      : u.standorte.map(sid=>D.standorte.find(s=>s.id===sid)?.name||sid).join(", ");
    const bereicheNames = (u.bereiche||["all"]).includes("all")
      ? (LANG==="vi"?"Tất cả":"Alle")
      : (u.bereiche||[]).map(bId=>{const br=D.bereiche.find(x=>x.id===bId);return br?`${br.icon} ${LANG==="vi"&&br.name_vi?br.name_vi:br.name}`:""}).filter(Boolean).join(", ") || "—";
    const isCurrentUser = U.id === u.id;

    h += `<tr>`;
    h += `<td><div class="sb-av" style="background:${ROLES[u.role]?.color||"#666"};width:28px;height:28px;font-size:11px">${esc(u.name[0])}</div></td>`;
    h += `<td><div style="font-weight:600">${esc(u.name)}${isCurrentUser?` <span style="font-size:9px;padding:1px 5px;background:var(--aA);color:var(--ac);border-radius:3px">${LANG==="vi"?"Bạn":"Du"}</span>`:""}</div><div style="font-size:10px;color:var(--t3)">${esc(u.email)}</div></td>`;
    h += `<td style="font-size:11.5px;color:var(--t2)">${esc(u.email)}</td>`;
    h += `<td><span class="bp" style="background:${ROLES[u.role]?.color||"#666"}22;color:${ROLES[u.role]?.color||"#666"}">${t("r."+u.role)}</span></td>`;
    h += `<td style="font-size:11.5px">${esc(standortNames)}</td>`;
    h += `<td style="font-size:10.5px">${esc(bereicheNames)}</td>`;
    h += `<td style="font-size:10.5px;color:var(--t2)"><div>${movCount} ${LANG==="vi"?"biến động":"Buchungen"}</div>${lastMov?`<div style="font-size:9.5px;color:var(--t3)">${LANG==="vi"?"Lần cuối":"Zuletzt"}: ${fDT(lastMov.datum)}</div>`:""}</td>`;
    h += `<td><div style="display:flex;gap:2px"><button class="bi" onclick="editUser('${u.id}')" title="${t("c.edit")}">✎</button>${!isCurrentUser?`<button class="bi dn" onclick="delUser('${u.id}')" title="${t("c.delete")}">🗑</button>`:""}</div></td>`;
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;

  h += `</div>`;
  return h;
}

function editUser(id) {
  const u = id ? D.users.find(x=>x.id===id) : null;
  const usedPins = D.users.map(x => x.pin);
  let rndPin = "";
  if (!u) { do { rndPin = String(Math.floor(100000 + Math.random() * 900000)); } while (usedPins.includes(rndPin)); }
  const f = u ? JSON.parse(JSON.stringify(u)) : {id:uid(),name:"",email:"",role:"staff",standorte:[],bereiche:["all"],pin:rndPin};
  const title = u ? `${t("c.edit")} — ${esc(f.name)}` : `${t("c.new")} ${t("nav.users")}`;

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${title}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  // Name + Email
  h += `<div class="g2"><div class="fg"><label>${t("c.name")} *</label><input class="inp" id="ue_name" value="${esc(f.name)}"></div><div class="fg"><label>E-Mail</label><input class="inp" type="email" id="ue_email" value="${esc(f.email)}"></div></div>`;

  // Role + PIN
  h += `<div class="g2">`;
  h += `<div class="fg"><label>${LANG==="vi"?"Vai trò":"Rolle"} *</label><select class="sel" id="ue_role">`;
  for (const [role, info] of Object.entries(ROLES)) {
    h += `<option value="${role}" ${f.role===role?"selected":""}>${t("r."+role)}</option>`;
  }
  h += `</select></div>`;
  h += `<div class="fg"><label>PIN (6 ${LANG==="vi"?"số":"Ziffern"}) *</label><input class="inp" id="ue_pin" value="${esc(f.pin)}" maxlength="6" placeholder="123456" style="font-family:var(--m);letter-spacing:4px;text-align:center;font-size:16px"></div>`;
  h += `</div>`;

  // Role description
  h += `<div id="ue_role_desc" style="padding:8px 10px;background:var(--b3);border-radius:6px;margin-bottom:10px;font-size:11px;color:var(--t2)">`;
  const roleDescs = {
    admin: {de:"Vollzugriff: Alle Funktionen, Benutzer verwalten, Einstellungen ändern", vi:"Toàn quyền: Tất cả chức năng, quản lý người dùng, cài đặt"},
    manager: {de:"Artikel & Bestände verwalten, Bestellungen, Bewegungen, Exporte. Kein Zugriff auf Benutzer & Einstellungen.", vi:"Quản lý SP & tồn kho, đơn hàng, biến động, xuất file. Không có quyền quản lý người dùng & cài đặt."},
    staff: {de:"Bestände ein-/ausbuchen, Bestellungen anlegen, Artikel & Lieferanten ansehen. Kein Bearbeiten oder Löschen.", vi:"Nhập/xuất kho, tạo đơn hàng, xem SP & NCC. Không được chỉnh sửa hoặc xóa."},
  };
  h += `${roleDescs[f.role]?.[LANG] || roleDescs[f.role]?.de || ""}`;
  h += `</div>`;

  // Custom permissions
  if (f.role !== "admin") {
    h += `<div class="fg"><label>${LANG==="vi"?"Quyền hạn":"Berechtigungen"}</label>`;
    h += `<div id="ue_perms_wrap">`;
    h += renderUePerms(f);
    h += `</div></div>`;
  }

  // Standort access
  h += `<div class="fg"><label>${LANG==="vi"?"Quyền truy cập chi nhánh":"Standort-Zugriff"}</label>`;
  h += `<div class="mc" id="ue_standorte">`;
  h += renderUeStandorte(f);
  h += `</div></div>`;

  // Bereiche access
  h += `<div class="fg"><label>${LANG==="vi"?"Khu vực phụ trách":"Zugewiesene Bereiche"}</label>`;
  h += `<div class="mc" id="ue_bereiche">`;
  h += renderUeBereiche(f);
  h += `</div></div>`;

  // If editing current user, show warning
  if (u && U.id === u.id) {
    h += `<div style="padding:8px 10px;background:var(--yA);border:1px solid var(--yl);border-radius:6px;font-size:11px;color:var(--yl);margin-bottom:8px">⚠ ${LANG==="vi"?"Bạn đang chỉnh sửa tài khoản của mình. Thay đổi vai trò sẽ có hiệu lực sau khi đăng nhập lại.":"Du bearbeitest deinen eigenen Account. Rollenänderungen werden nach erneutem Anmelden wirksam."}</div>`;
  }

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveUser('${f.id}',${u?'true':'false'})">${t("c.save")}</button></div></div></div>`;

  window._ueForm = f;
  document.body.insertAdjacentHTML("beforeend", h);

  // Role change listener
  const roleSel = document.getElementById("ue_role");
  if (roleSel) {
    roleSel.addEventListener("change", function() {
      const rd = document.getElementById("ue_role_desc");
      if (rd) rd.textContent = roleDescs[this.value]?.[LANG] || roleDescs[this.value]?.de || "";
    });
  }
}

function renderUeStandorte(f) {
  const allOn = f.standorte.includes("all");
  let h = `<div class="mc-it ${allOn?"checked":""}" onclick="ueTogStandort('all')">${allOn?"✓":"○"} ${LANG==="vi"?"Tất cả":"Alle Standorte"}</div>`;
  if (!allOn) {
    D.standorte.forEach(s => {
      const on = f.standorte.includes(s.id);
      h += `<div class="mc-it ${on?"checked":""}" onclick="ueTogStandort('${s.id}')">${on?"✓":"○"} ${esc(s.name)}</div>`;
    });
  }
  return h;
}

function ueTogStandort(sId) {
  const f = window._ueForm;
  if (sId === "all") {
    f.standorte = f.standorte.includes("all") ? [] : ["all"];
  } else {
    f.standorte = f.standorte.filter(x => x !== "all");
    const idx = f.standorte.indexOf(sId);
    if (idx >= 0) f.standorte.splice(idx, 1);
    else f.standorte.push(sId);
  }
  const container = document.getElementById("ue_standorte");
  if (container) container.innerHTML = renderUeStandorte(f);
}

function renderUeBereiche(f) {
  const allBr = (f.bereiche||["all"]).includes("all");
  let h = `<div class="mc-it ${allBr?"checked":""}" onclick="ueTogBereich('all')">${allBr?"✓ ":"○ "}${LANG==="vi"?"Tất cả":"Alle Bereiche"}</div>`;
  if (!allBr) {
    D.bereiche.forEach(br => {
      const st = D.standorte.find(s=>s.id===br.standortId);
      const checked = (f.bereiche||[]).includes(br.id);
      h += `<div class="mc-it ${checked?"checked":""}" onclick="ueTogBereich('${br.id}')" style="border-left:3px solid ${br.farbe}">${checked?"✓ ":"○ "}${br.icon} ${esc(LANG==="vi"&&br.name_vi?br.name_vi:br.name)} <span style="font-size:9px;color:var(--t3)">${esc(st?.name||"")}</span></div>`;
    });
  }
  return h;
}

function renderUePerms(f) {
  const PERMS_DEF = [
    // Übersicht
    {id:"_h_overview",header:true,de:"ÜBERSICHT",vi:"TỔNG QUAN"},
    {id:"dashboard",de:"📊 Dashboard",vi:"📊 Bảng điều khiển"},
    {id:"auswertung",de:"📈 Auswertung & Analyse",vi:"📈 Thống kê & Phân tích"},
    // Lagerverwaltung
    {id:"_h_lager",header:true,de:"LAGERVERWALTUNG",vi:"QUẢN LÝ KHO"},
    {id:"artikel",de:"Artikel verwalten (CRUD)",vi:"Quản lý SP (CRUD)"},
    {id:"artikel.read",de:"Artikel ansehen (nur lesen)",vi:"Xem SP (chỉ đọc)"},
    {id:"bewegungen",de:"Warenbewegungen anzeigen",vi:"Xem biến động kho"},
    {id:"eingang",de:"↓ Wareneingang buchen",vi:"↓ Nhập kho"},
    {id:"ausgang",de:"↑ Warenausgang buchen",vi:"↑ Xuất kho"},
    {id:"transfer",de:"⇄ Umbuchen",vi:"⇄ Chuyển kho"},
    {id:"inventur",de:"📋 Inventur",vi:"📋 Kiểm kê"},
    // Einkauf
    {id:"_h_einkauf",header:true,de:"EINKAUF",vi:"MUA HÀNG"},
    {id:"bestellliste",de:"Bestellliste",vi:"DS đặt hàng"},
    {id:"bestellungen",de:"Bestellungen verwalten",vi:"Quản lý đơn hàng"},
    {id:"bestellungen.create",de:"Bestellungen anlegen",vi:"Tạo đơn hàng"},
    {id:"lieferanten",de:"Lieferanten verwalten",vi:"Quản lý NCC"},
    {id:"lieferanten.read",de:"Lieferanten ansehen",vi:"Xem NCC"},
    {id:"lieferanten.detail",de:"Lieferanten-Details & Preise",vi:"Chi tiết NCC & Giá"},
    {id:"preise",de:"💰 Preise sichtbar",vi:"💰 Xem giá"},
    {id:"export",de:"📥 Export (Excel/PDF/CSV)",vi:"📥 Xuất file"},
    // Restaurant
    {id:"_h_restaurant",header:true,de:"RESTAURANT",vi:"NHÀ HÀNG"},
    {id:"bereiche.view",de:"Bereiche sehen & nutzen",vi:"Xem & dùng khu vực"},
    {id:"bereiche.manage",de:"Bereiche verwalten (CRUD)",vi:"Quản lý khu vực (CRUD)"},
    // Administration
    {id:"_h_admin",header:true,de:"ADMINISTRATION",vi:"QUẢN TRỊ"},
    {id:"standorte",de:"📍 Standorte & Lagerplätze",vi:"📍 Chi nhánh & Vị trí kho"},
    {id:"benutzer",de:"👥 Benutzer & Zugänge",vi:"👥 Người dùng & Quyền"},
    {id:"kategorien",de:"🏷 Kategorien verwalten",vi:"🏷 Quản lý danh mục"},
    {id:"einstellungen",de:"⚙ Einstellungen & Backup",vi:"⚙ Cài đặt & Sao lưu"},
  ];
  const useCustom = Array.isArray(f.perms);
  let h = `<div style="margin-bottom:4px"><div class="mc-it ${!useCustom?"checked":""}" onclick="ueTogCustomPerms(false)" style="margin-bottom:3px">${!useCustom?"✓":"○"} ${LANG==="vi"?"Mặc định theo vai trò":"Standard nach Rolle"}</div>`;
  h += `<div class="mc-it ${useCustom?"checked":""}" onclick="ueTogCustomPerms(true)">${useCustom?"✓":"○"} ${LANG==="vi"?"Tùy chỉnh":"Individuell anpassen"}</div></div>`;
  if (useCustom) {
    h += `<div style="margin-top:4px">`;
    PERMS_DEF.forEach(p => {
      if (p.header) {
        h += `<div style="font-size:8.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin:8px 0 3px;padding-top:6px;border-top:1px solid var(--bd)">${LANG==="vi"?p.vi:p.de}</div>`;
        return;
      }
      const on = f.perms.includes(p.id);
      h += `<div class="mc-it ${on?"checked":""}" onclick="ueTogPerm('${p.id}')" style="margin-bottom:2px">${on?"✓":"○"} ${LANG==="vi"?p.vi:p.de}</div>`;
    });
    h += `</div>`;
  }
  return h;
}

function ueTogCustomPerms(useCustom) {
  const f = window._ueForm;
  if (useCustom) {
    f.perms = [...(ROLE_PERMS[f.role]||[])];
  } else {
    delete f.perms;
  }
  const wrap = document.getElementById("ue_perms_wrap");
  if (wrap) wrap.innerHTML = renderUePerms(f);
}

function ueTogPerm(pId) {
  const f = window._ueForm;
  if (!f.perms) return;
  const idx = f.perms.indexOf(pId);
  if (idx >= 0) f.perms.splice(idx, 1);
  else f.perms.push(pId);
  const wrap = document.getElementById("ue_perms_wrap");
  if (wrap) wrap.innerHTML = renderUePerms(f);
}

function ueTogBereich(bId) {
  const f = window._ueForm;
  if (!f.bereiche) f.bereiche = ["all"];
  if (bId === "all") {
    f.bereiche = f.bereiche.includes("all") ? [] : ["all"];
  } else {
    // Remove "all" if present
    f.bereiche = f.bereiche.filter(x => x !== "all");
    const idx = f.bereiche.indexOf(bId);
    if (idx >= 0) f.bereiche.splice(idx, 1);
    else f.bereiche.push(bId);
  }
  // Re-render the bereiche container
  const container = document.getElementById("ue_bereiche");
  if (container) container.innerHTML = renderUeBereiche(f);
}

function saveUser(id, isEdit) {
  const f = window._ueForm;
  f.name = document.getElementById("ue_name")?.value || "";
  f.email = document.getElementById("ue_email")?.value || "";
  f.role = document.getElementById("ue_role")?.value || "staff";
  f.pin = document.getElementById("ue_pin")?.value || "";

  if (!f.name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  if (!f.pin || f.pin.length < 6) { toast(LANG==="vi"?"PIN phải có 6 số":"PIN muss 6 Ziffern haben","e"); return; }
  if (!f.standorte.length) { toast(LANG==="vi"?"Vui lòng chọn chi nhánh":"Bitte Standort wählen","e"); return; }
  if (!f.bereiche || !f.bereiche.length) f.bereiche = ["all"];

  if (isEdit) {
    const idx = D.users.findIndex(x=>x.id===id);
    if (idx >= 0) D.users[idx] = f;
    // Update current user if editing self
    if (U.id === id) { U.name = f.name; U.email = f.email; U.standorte = f.standorte; }
  } else {
    // Check unique name
    if (D.users.some(u => u.name.toLowerCase() === f.name.toLowerCase())) {
      toast(LANG==="vi"?"Tên đã tồn tại":"Name existiert bereits","e"); return;
    }
    D.users.push(f);
  }
  save(); closeModal(); render();
  if (typeof sbSaveUser === "function") sbSaveUser(f).catch(e => console.error("sbSaveUser:", e));
  toast("✓","s");
}

function delUser(id) {
  if (U.id === id) { toast(LANG==="vi"?"Không thể xóa chính mình":"Eigenen Account kann man nicht löschen","e"); return; }
  const u = D.users.find(x=>x.id===id);
  const label = LANG==="vi" ? `Xóa người dùng "${u?.name}"?` : `Benutzer "${u?.name}" löschen?`;
  cConfirm(label, () => { D.users = D.users.filter(x=>x.id!==id); save(); render(); if (typeof sbDeleteUser === "function") sbDeleteUser(id).catch(e => console.error("sbDeleteUser:", e)); toast("✓","i"); });
}

// ═══ RESTAURANT: BEREICHE (Step 1: create Anforderung) ═══