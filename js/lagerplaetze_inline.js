// ═══ LAGERPLÄTZE INLINE (Standort Lagerplatz Management) ═══
function showLagerplaetze(stId) {
  const s = D.standorte.find(x=>x.id===stId);
  if (!s) return;
  if (!s.lagerplaetze) s.lagerplaetze = [];
  window._lpStId = stId;
  renderLPModal();
}

function renderLPModal() {
  const ex = document.getElementById("lpModal"); if (ex) ex.remove();
  const stId = window._lpStId;
  const s = D.standorte.find(x=>x.id===stId);
  if (!s) return;
  const lps = s.lagerplaetze || [];

  let h = `<div class="mo-ov" id="lpModal" onclick="closeModal()"><div class="mo mo-xl" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">📦 ${LANG==="vi"?"Vị trí kho":"Lagerplätze"}: ${esc(s.name)}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;

  // Add new Lagerplatz
  h += `<div style="display:flex;gap:5px;margin-bottom:12px">`;
  h += `<input class="inp" id="lp_new_name" placeholder="${LANG==="vi"?"Tên vị trí mới":"Neuer Lagerplatz-Name..."}" style="flex:1">`;
  h += `<button class="btn btn-p" onclick="addLagerplatz()">+ ${LANG==="vi"?"Thêm":"Hinzufügen"}</button>`;
  h += `</div>`;

  if (!lps.length) {
    h += `<div style="text-align:center;padding:20px;color:var(--t3)"><div style="font-size:28px;margin-bottom:6px">📦</div>${LANG==="vi"?"Chưa có vị trí kho nào":"Noch keine Lagerplätze definiert"}</div>`;
  }

  // Each Lagerplatz as expandable card
  lps.forEach((lp, idx) => {
    const arts = D.artikel.filter(a => a.lagerort?.[stId] === lp);
    const unassigned = D.artikel.filter(a => (a.istBestand[stId]||0) > 0 && a.lagerort?.[stId] !== lp);

    h += `<div class="cd" style="margin-bottom:6px;border-left:3px solid var(--ac)">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="document.getElementById('lp_det_${idx}').style.display=document.getElementById('lp_det_${idx}').style.display==='none'?'':'none'">`;
    h += `<div><div style="font-weight:700;font-size:13px">📦 ${esc(lp)}</div>`;
    h += `<div style="font-size:10px;color:var(--t3)">${arts.length} ${t("c.article")} ${arts.length?`· ${arts.map(a=>artN(a)).slice(0,3).join(", ")}${arts.length>3?"...":""}`:""}</div></div>`;
    h += `<div style="display:flex;gap:3px;align-items:center"><span class="bp" style="background:var(--aA);color:var(--ac)">${arts.length}</span><span style="font-size:10px;color:var(--t3)">▾</span>`;
    h += `<button class="bi dn" onclick="event.stopPropagation();removeLagerplatz(${idx})" title="${t("c.delete")}">🗑</button></div></div>`;

    // Detail (hidden by default)
    h += `<div id="lp_det_${idx}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">`;

    // Articles at this location
    if (arts.length) {
      arts.forEach(a => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--bd)">`;
        h += `<div style="display:flex;align-items:center;gap:6px"><div class="th" style="width:24px;height:24px">${a.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div><div style="font-weight:600;font-size:11.5px">${esc(artN(a))}</div><div style="font-size:9px;color:var(--t3);font-family:var(--m)">${esc(a.sku)} · ${a.istBestand[stId]||0} ${esc(a.einheit)}</div></div></div>`;
        h += `<button class="bi dn" onclick="unassignFromLP('${a.id}','${stId}')" title="${LANG==="vi"?"Xóa khỏi vị trí":"Vom Platz entfernen"}">✕</button>`;
        h += `</div>`;
      });
    } else {
      h += `<div style="font-size:11px;color:var(--t3);padding:4px 0">${LANG==="vi"?"Trống":"Leer"}</div>`;
    }

    // Add article to this location
    if (unassigned.length) {
      h += `<div style="display:flex;gap:4px;margin-top:6px;align-items:center">`;
      h += `<select class="sel" id="lp_add_art_${idx}" style="flex:1;font-size:11px"><option value="">— ${LANG==="vi"?"Thêm SP":"Artikel zuweisen"} —</option>${unassigned.map(a=>`<option value="${a.id}">${esc(artN(a))} (${a.istBestand[stId]||0} ${esc(a.einheit)})</option>`).join("")}</select>`;
      h += `<button class="btn btn-o btn-sm" onclick="assignToLP('${idx}','${stId}')">+</button>`;
      h += `</div>`;
    }

    h += `</div></div>`;
  });

  // Summary: articles without any Lagerplatz
  const unplaced = D.artikel.filter(a => (a.istBestand[stId]||0) > 0 && (!a.lagerort?.[stId] || !lps.includes(a.lagerort[stId])));
  if (unplaced.length) {
    h += `<div style="margin-top:12px;padding:8px 10px;background:var(--yA);border:1px solid rgba(245,158,11,.15);border-radius:6px">`;
    h += `<div style="font-weight:700;font-size:11px;color:var(--yl);margin-bottom:4px">⚠ ${unplaced.length} ${LANG==="vi"?"SP chưa xếp vị trí":"Artikel ohne Lagerplatz"}</div>`;
    h += `<div style="display:flex;flex-wrap:wrap;gap:3px">`;
    unplaced.forEach(a => {
      h += `<span style="font-size:10px;padding:1px 6px;background:var(--b4);border-radius:3px;color:var(--t2)">${esc(artN(a))}</span>`;
    });
    h += `</div></div>`;
  }

  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function addLagerplatz() {
  const inp = document.getElementById("lp_new_name");
  const name = inp?.value?.trim();
  if (!name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  const s = D.standorte.find(x=>x.id===window._lpStId);
  if (!s) return;
  if (!s.lagerplaetze) s.lagerplaetze = [];
  if (s.lagerplaetze.includes(name)) { toast(LANG==="vi"?"Đã tồn tại":"Existiert bereits","e"); return; }
  s.lagerplaetze.push(name);
  s.lagerplaetze.sort();
  save();
  renderLPModal();
  toast(`📦 ${name} +`,"s");
}

function removeLagerplatz(idx) {
  const s = D.standorte.find(x=>x.id===window._lpStId);
  if (!s) return;
  const lpName = s.lagerplaetze[idx];
  const artCount = D.artikel.filter(a => a.lagerort?.[s.id] === lpName).length;
  const label = LANG==="vi"
    ? `Xóa "${lpName}"?${artCount?` ${artCount} SP sẽ mất vị trí kho.`:""}`
    : `"${lpName}" löschen?${artCount?` ${artCount} Artikel verlieren ihren Lagerort.`:""}`;
  cConfirm(label, () => {
    s.lagerplaetze.splice(idx, 1);
    // Clear from articles
    D.artikel.forEach(a => { if (a.lagerort?.[s.id] === lpName) a.lagerort[s.id] = ""; });
    save();
    renderLPModal();
    toast("✓","i");
  });
}

function assignToLP(lpIdx, stId) {
  const s = D.standorte.find(x=>x.id===stId);
  if (!s) return;
  const lpName = s.lagerplaetze[lpIdx];
  const sel = document.getElementById(`lp_add_art_${lpIdx}`);
  const artId = sel?.value;
  if (!artId) return;
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  if (!a.lagerort) a.lagerort = {};
  a.lagerort[stId] = lpName;
  save();
  renderLPModal();
  toast(`${artN(a)} → 📦 ${lpName}`,"s");
}

function unassignFromLP(artId, stId) {
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  if (a.lagerort) a.lagerort[stId] = "";
  save();
  renderLPModal();
  toast("✓","i");
}

// ═══ QR-CODE SYSTEM ═══