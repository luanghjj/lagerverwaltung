// ═══ KATEGORIEN (Categories) ═══
function renderKategorien() {
  let h = `<div class="mn-h"><div class="mn-t">${t("nav.categories")}</div><div class="mn-a"><button class="btn btn-p" onclick="editKat()">+ ${t("c.new")}</button></div></div><div class="mn-c"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">`;
  D.kategorien.forEach(k => {
    const c = D.artikel.filter(a=>a.kategorien.includes(k.id)).length;
    h += `<div class="cd" style="border-left:4px solid ${k.farbe}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:700">${esc(katN(k))}</div>${LANG==="de"&&k.name_vi?`<div style="font-size:10.5px;color:var(--t3)">🇻🇳 ${esc(k.name_vi)}</div>`:""}${LANG==="vi"?`<div style="font-size:10.5px;color:var(--t3)">🇩🇪 ${esc(k.name)}</div>`:""}<div style="font-size:10px;color:var(--t3)">${c} ${t("c.article")}</div></div><div style="display:flex;gap:2px"><button class="bi" onclick="editKat('${k.id}')">✎</button><button class="bi dn" onclick="delKat('${k.id}')">🗑</button></div></div></div>`;
  });
  h += `</div></div>`;
  return h;
}

function editKat(id) {
  const k = id ? D.kategorien.find(x=>x.id===id) : null;
  const f = k ? JSON.parse(JSON.stringify(k)) : {id:uid(),name:"",name_vi:"",farbe:"#3B82F6"};
  const colors = ["#3B82F6","#F59E0B","#8B5CF6","#10B981","#EF4444","#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"];

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${k?t("c.edit"):t("c.new")} ${t("nav.categories")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div class="g2"><div class="fg"><label>${t("c.name")} (DE) *</label><input class="inp" id="kat_name" value="${esc(f.name)}"></div>`;
  h += `<div class="fg"><label>${t("c.name")} (VI)</label><input class="inp" id="kat_name_vi" value="${esc(f.name_vi)}"></div></div>`;
  h += `<div class="fg"><label>${LANG==="vi"?"Màu sắc":"Farbe"}</label><div style="display:flex;gap:4px;flex-wrap:wrap">${colors.map(c=>`<div onclick="document.getElementById('kat_farbe').value='${c}';this.parentNode.querySelectorAll('div').forEach(d=>d.style.outline='');this.style.outline='2px solid var(--tx)'" style="width:28px;height:28px;background:${c};border-radius:6px;cursor:pointer;${f.farbe===c?"outline:2px solid var(--tx)":""}"></div>`).join("")}<input class="inp" id="kat_farbe" value="${esc(f.farbe)}" style="width:80px"></div></div>`;
  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveKat('${f.id}',${k?'true':'false'})">${t("c.save")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function saveKat(id, isEdit) {
  const name = document.getElementById("kat_name")?.value?.trim();
  if (!name) { toast(LANG==="vi"?"Vui lòng nhập tên":"Bitte Name eingeben","e"); return; }
  const obj = { id, name, name_vi: document.getElementById("kat_name_vi")?.value?.trim()||"", farbe: document.getElementById("kat_farbe")?.value||"#3B82F6" };
  if (isEdit) { const idx = D.kategorien.findIndex(x=>x.id===id); if (idx>=0) D.kategorien[idx]=obj; }
  else D.kategorien.push(obj);
  save(); closeModal(); render(); toast("✓","s");
  if (typeof sbSaveKategorie === "function") sbSaveKategorie(obj).catch(e => console.error("sbKat:", e));
}

function delKat(id) {
  const k = D.kategorien.find(x=>x.id===id);
  const artCount = D.artikel.filter(a=>a.kategorien.includes(id)).length;
  const label = LANG==="vi" ? `Xóa "${katN(k)}"? ${artCount} SP sẽ mất danh mục này.` : `"${katN(k)}" löschen? ${artCount} Artikel verlieren diese Kategorie.`;
  cConfirm(label, () => {
    D.kategorien = D.kategorien.filter(x=>x.id!==id);
    D.artikel.forEach(a => { a.kategorien = a.kategorien.filter(kId=>kId!==id); });
    save(); render(); toast("✓","i");
    if (typeof sbDeleteKategorie === "function") sbDeleteKategorie(id).catch(e => console.error("sbDelKat:", e));
  });
}

// ═══ EINSTELLUNGEN ═══