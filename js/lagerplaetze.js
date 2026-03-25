// ═══ LAGERPLÄTZE (Storage Locations) ═══
function renderLagerplaetze() {
  if (!D.lagerplaetze) D.lagerplaetze = [];
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));

  let h = `<div class="mn-h"><div class="mn-t">📦 ${LANG==="vi"?"Vị trí kho":"Lagerplätze"}</div><div class="mn-a">`;
  h += `<button class="btn btn-o btn-sm" onclick="showLPQRCodes()">📱 QR-Codes</button>`;
  h += `<button class="btn btn-p" onclick="editLagerplatz()">+ ${t("c.new")}</button>`;
  h += `</div></div><div class="mn-c">`;

  // Stats
  const total = D.lagerplaetze.length;
  const zones = [...new Set(D.lagerplaetze.map(lp=>lp.zone).filter(Boolean))];
  h += `<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:12px">`;
  h += `<div class="sc"><div class="sc-l">${LANG==="vi"?"Tổng vị trí":"Gesamt"}</div><div class="sc-v">${total}</div></div>`;
  h += `<div class="sc"><div class="sc-l">${LANG==="vi"?"Vùng":"Zonen"}</div><div class="sc-v">${zones.length}</div></div>`;
  vS.forEach(s => {
    const cnt = D.lagerplaetze.filter(lp=>lp.standortId===s.id).length;
    h += `<div class="sc"><div class="sc-l">${esc(s.name)}</div><div class="sc-v">${cnt}</div></div>`;
  });
  h += `</div>`;

  if (!total) {
    h += `<div style="text-align:center;padding:30px;color:var(--t3)"><div style="font-size:32px;margin-bottom:6px">📦</div><div style="font-size:13px;font-weight:600">${LANG==="vi"?"Chưa có vị trí kho":"Keine Lagerplätze definiert"}</div>`;
    h += `<div style="font-size:11px;margin-top:4px">${LANG==="vi"?"Thêm vị trí để quản lý kho hiệu quả hơn":"Lagerplätze hinzufügen für bessere Organisation"}</div></div></div>`;
    return h;
  }

  // Group by standort
  vS.forEach(s => {
    const items = D.lagerplaetze.filter(lp=>lp.standortId===s.id);
    if (!items.length) return;

    h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 8px">📍 ${esc(s.name)} <span style="font-weight:400;color:var(--t3)">(${items.length})</span></h3>`;

    // Group by zone within standort
    const byZone = {};
    items.forEach(lp => {
      const z = lp.zone || (LANG==="vi"?"Không phân vùng":"Ohne Zone");
      if (!byZone[z]) byZone[z] = [];
      byZone[z].push(lp);
    });

    for (const [zone, zItems] of Object.entries(byZone)) {
      h += `<div style="margin-bottom:10px">`;
      if (Object.keys(byZone).length > 1 || zone !== (LANG==="vi"?"Không phân vùng":"Ohne Zone")) {
        h += `<div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;margin-bottom:4px">${esc(zone)}</div>`;
      }
      h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px">`;
      zItems.forEach(lp => {
        const artCount = D.artikel.filter(a => a.lagerort?.[s.id] === lp.name).length;
        const tempIcon = lp.temperatur === "kuehl" ? "❄️" : lp.temperatur === "tk" ? "🧊" : lp.temperatur === "warm" ? "🌡️" : "🏠";
        const tempLabel = {kuehl:LANG==="vi"?"Lạnh":"Kühl (2-8°C)",tk:LANG==="vi"?"Đông lạnh":"Tiefkühl (-18°C)",warm:LANG==="vi"?"Ấm":"Warm",normal:LANG==="vi"?"Bình thường":"Normal"}[lp.temperatur||"normal"]||"Normal";

        h += `<div class="cd" style="padding:10px;border-left:3px solid ${lp.temperatur==="kuehl"?"#0EA5E9":lp.temperatur==="tk"?"#6366F1":lp.temperatur==="warm"?"#F59E0B":"var(--bd)"}">`;
        h += `<div style="display:flex;justify-content:space-between;align-items:flex-start">`;
        h += `<div><div style="font-weight:700;font-size:13px">${tempIcon} ${esc(lp.name)}</div>`;
        if (lp.name_vi) h += `<div style="font-size:10px;color:var(--t3)">${esc(lp.name_vi)}</div>`;
        h += `<div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">`;
        h += `<span style="font-size:9.5px;padding:1px 5px;background:var(--b4);border-radius:3px;color:var(--t2)">${tempLabel}</span>`;
        if (lp.kapazitaet) h += `<span style="font-size:9.5px;padding:1px 5px;background:var(--b4);border-radius:3px;color:var(--t2)">📊 ${lp.kapazitaet}</span>`;
        h += `<span style="font-size:9.5px;padding:1px 5px;background:var(--aA);border-radius:3px;color:var(--ac)">${artCount} ${t("c.article")}</span>`;
        h += `</div>`;
        if (lp.beschreibung) h += `<div style="font-size:10px;color:var(--t3);margin-top:3px">${esc(lp.beschreibung)}</div>`;
        h += `</div>`;
        h += `<div style="display:flex;gap:3px"><button class="bi" onclick="showSingleLPQR('${lp.id}')" title="QR-Code">📱</button><button class="bi" onclick="editLagerplatz('${lp.id}')">✎</button><button class="bi dn" onclick="delLagerplatz('${lp.id}')">🗑</button></div>`;
        h += `</div></div>`;
      });
      h += `</div></div>`;
    }
  });

  h += `</div>`;
  return h;
}

function editLagerplatz(id) {
  const lp = id ? D.lagerplaetze.find(x=>x.id===id) : null;
  const vS = U.standorte.includes("all") ? D.standorte : D.standorte.filter(s=>U.standorte.includes(s.id));
  const f = lp ? JSON.parse(JSON.stringify(lp)) : {id:uid(),name:"",name_vi:"",standortId:vS[0]?.id||"",zone:"",temperatur:"normal",kapazitaet:"",beschreibung:""};

  const zones = [...new Set(D.lagerplaetze.map(x=>x.zone).filter(Boolean))];
  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📦 ${lp?(LANG==="vi"?"Chỉnh sửa vị trí":"Lagerplatz bearbeiten"):(LANG==="vi"?"Tạo vị trí mới":"Neuer Lagerplatz")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  h += `<div class="g2"><div class="fg"><label>${t("c.name")} (DE) *</label><input class="inp" id="lp_name" value="${esc(f.name)}" placeholder="z.B. Kühlraum 1, Lager A · Regal 3"></div>`;
  h += `<div class="fg"><label>${t("c.name")} (VI)</label><input class="inp" id="lp_name_vi" value="${esc(f.name_vi||"")}" placeholder="VD: Phòng lạnh 1"></div></div>`;

  h += `<div class="g2"><div class="fg"><label>${t("c.location")} *</label><select class="sel" id="lp_standort">${vS.map(s=>`<option value="${s.id}" ${f.standortId===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}</select></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Vùng":"Zone"}</label><input class="inp" id="lp_zone" value="${esc(f.zone||"")}" list="zone_list" placeholder="${LANG==="vi"?"VD: Khu vực lạnh":"z.B. Kühlbereich, Trockenlager"}"><datalist id="zone_list">${zones.map(z=>`<option value="${esc(z)}">`).join("")}</datalist></div></div>`;

  h += `<div class="g2"><div class="fg"><label>${LANG==="vi"?"Nhiệt độ":"Temperatur"}</label><select class="sel" id="lp_temp">`;
  h += `<option value="normal" ${f.temperatur==="normal"?"selected":""}>🏠 ${LANG==="vi"?"Bình thường":"Normal (Raumtemp.)"}</option>`;
  h += `<option value="kuehl" ${f.temperatur==="kuehl"?"selected":""}>❄️ ${LANG==="vi"?"Lạnh (2-8°C)":"Kühl (2-8°C)"}</option>`;
  h += `<option value="tk" ${f.temperatur==="tk"?"selected":""}>🧊 ${LANG==="vi"?"Đông lạnh (-18°C)":"Tiefkühl (-18°C)"}</option>`;
  h += `<option value="warm" ${f.temperatur==="warm"?"selected":""}>🌡️ ${LANG==="vi"?"Ấm":"Warm"}</option>`;
  h += `</select></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Sức chứa":"Kapazität"}</label><input class="inp" id="lp_kap" value="${esc(f.kapazitaet||"")}" placeholder="${LANG==="vi"?"VD: 50 Karton, 3 Paletten":"z.B. 50 Karton, 3 Paletten"}"></div></div>`;

  h += `<div class="fg"><label>${LANG==="vi"?"Ghi chú":"Beschreibung"}</label><input class="inp" id="lp_desc" value="${esc(f.beschreibung||"")}" placeholder="${LANG==="vi"?"VD: Nur für Fisch":"z.B. Nur für Fisch-Produkte"}"></div>`;

  // Show articles currently assigned
  const artCount = D.artikel.filter(a => a.lagerort?.[f.standortId] === f.name && f.name).length;
  if (lp && artCount) {
    h += `<div style="margin-top:8px;padding:6px 10px;background:var(--b3);border-radius:6px;font-size:11px;color:var(--t2)">📋 ${artCount} ${t("c.article")} ${LANG==="vi"?"đang được gán tại đây":"sind diesem Lagerplatz zugeordnet"}</div>`;
  }

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveLagerplatz('${f.id}',${lp?'true':'false'})">${t("c.save")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function saveLagerplatz(id, isEdit) {
  const name = document.getElementById("lp_name")?.value?.trim();
  if (!name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  const standortId = document.getElementById("lp_standort")?.value;
  const f = {
    id, name, name_vi: document.getElementById("lp_name_vi")?.value?.trim()||"",
    standortId, zone: document.getElementById("lp_zone")?.value?.trim()||"",
    temperatur: document.getElementById("lp_temp")?.value||"normal",
    kapazitaet: document.getElementById("lp_kap")?.value?.trim()||"",
    beschreibung: document.getElementById("lp_desc")?.value?.trim()||""
  };

  if (!D.lagerplaetze) D.lagerplaetze = [];

  if (isEdit) {
    const old = D.lagerplaetze.find(x=>x.id===id);
    // Rename: update all articles referencing old name
    if (old && old.name !== name) {
      D.artikel.forEach(a => {
        if (a.lagerort?.[old.standortId] === old.name) a.lagerort[old.standortId] = name;
      });
    }
    const idx = D.lagerplaetze.findIndex(x=>x.id===id);
    if (idx >= 0) D.lagerplaetze[idx] = f;
  } else {
    D.lagerplaetze.push(f);
  }

  // Also update standort.lagerplaetze array for backward compat
  const st = D.standorte.find(s=>s.id===standortId);
  if (st) {
    if (!st.lagerplaetze) st.lagerplaetze = [];
    if (!st.lagerplaetze.includes(name)) st.lagerplaetze.push(name);
  }

  save(); closeModal(); render();
  toast(`📦 ${name} ✓`, "s");
}

function delLagerplatz(id) {
  const lp = D.lagerplaetze.find(x=>x.id===id);
  if (!lp) return;
  const artCount = D.artikel.filter(a => a.lagerort?.[lp.standortId] === lp.name).length;
  let label = `${LANG==="vi"?"Xóa":"Löschen"}: ${lp.name}?`;
  if (artCount) label += `\n\n⚠ ${artCount} ${t("c.article")} ${LANG==="vi"?"đang được gán — sẽ bị xóa Lagerort":"zugeordnet — Lagerort wird entfernt"}`;

  cConfirm(label, () => {
    // Remove lagerort from articles
    D.artikel.forEach(a => {
      if (a.lagerort?.[lp.standortId] === lp.name) delete a.lagerort[lp.standortId];
    });
    // Remove from standort array
    const st = D.standorte.find(s=>s.id===lp.standortId);
    if (st?.lagerplaetze) st.lagerplaetze = st.lagerplaetze.filter(n=>n!==lp.name);
    // Remove from D.lagerplaetze
    D.lagerplaetze = D.lagerplaetze.filter(x=>x.id!==id);
    save(); render(); toast("✓","i");
  });
}
