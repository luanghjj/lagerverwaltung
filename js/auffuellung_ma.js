/* Mitarbeiter-Auffüllung: Bereich → Kategorie → Artikel, direktes Abbuchen ohne Manager-Bestätigung.
   Phone: Bereich-Liste, dann Split-View (Kategorie-Tabs links, Karten rechts, sticky Button).
   iPad ab 768px: 3 Spalten (Auswahl | Bereich+Kategorie | Artikel). */
const MA_STATE = { brId: "", kat: "all", search: "", sel: {} };
let MA_ITEMS = [];

function maBereiche(vS, aS) {
  const sids = aS ? [aS] : vS.map(s => s.id);
  const userBr = U.bereiche || ["all"];
  return D.bereiche.filter(br => sids.includes(br.standortId) && (userBr.includes("all") || userBr.includes(br.id)));
}

function maBrName(br) { return LANG === "vi" && br.name_vi ? br.name_vi : br.name; }

// Auflösung pro Bereich-Artikel: Quelle (Standort/Lagerort) + verfügbarer Bestand
function maResolve(br, ba) {
  const a = D.artikel.find(x => x.id === ba.artikelId);
  if (!a || (a.status || "active") !== "active") return null;
  const qId = ba.quelleId || br.standortId;
  const qOrt = locQuelleOrt(a, qId, ba.quelleOrt);
  const lagerIst = locQuelleIst(a, qId, qOrt);
  return { artikelId: ba.artikelId, art: a, soll: ba.soll || 0, qId, qOrt, lagerIst, standIst: a.istBestand[qId] || 0 };
}

function maKatList(items) {
  const seen = [];
  items.forEach(it => (it.art.kategorien || []).forEach(kId => { if (!seen.includes(kId)) seen.push(kId); }));
  return seen.map(id => D.kategorien.find(k => k.id === id)).filter(Boolean);
}

function maZeroCount(items, katId) {
  return items.filter(it => it.lagerIst <= 0 && (katId === "all" || (it.art.kategorien || []).includes(katId))).length;
}

function maQuelleLabel(br, it) {
  const name = D.standorte.find(s => s.id === it.qId)?.name || "";
  const ort = it.qOrt ? ` · ${it.qOrt}` : "";
  return it.qId !== br.standortId ? `${name}${ort}` : (it.qOrt || name);
}

function maSet(key, val) { MA_STATE[key] = val; render(); }
function maOpen(brId) { MA_STATE.brId = brId; MA_STATE.kat = "all"; MA_STATE.search = ""; render(); }

function maSelCount() { return Object.values(MA_STATE.sel).filter(x => x.menge > 0).length; }

function maStep(key, dir) {
  const s = MA_STATE.sel[key];
  if (!s) return;
  const max = s.lagerIst;
  s.menge = Math.max(0, Math.min(max, s.menge + dir));
  if (s.menge <= 0) delete MA_STATE.sel[key];
  render();
}

function maType(key, val) {
  const s = MA_STATE.sel[key];
  if (!s) return;
  const n = parseInt(val);
  const menge = isNaN(n) ? 0 : Math.max(0, Math.min(s.lagerIst, n));
  if (menge === s.menge && String(menge) === String(val)) return;
  s.menge = menge;
  if (s.menge <= 0) delete MA_STATE.sel[key];
  // render() ersetzt das fokussierte Feld → Blur feuert erneut "change". Nicht mitten im render() neu rendern.
  setTimeout(render, 0);
}

function maAdd(key) {
  const it = (MA_ITEMS || []).find(x => `${x.artikelId}|${x.qId}|${x.qOrt}` === key);
  if (!it) return;
  maToggle(key, it);
}

function maToggle(key, it) {
  if (MA_STATE.sel[key]) { delete MA_STATE.sel[key]; render(); return; }
  if (it.lagerIst <= 0) { toast(LANG === "vi" ? "Hết hàng — không bổ sung được" : "Kein Bestand — Auffüllen nicht möglich", "e"); return; }
  MA_STATE.sel[key] = { artikelId: it.artikelId, qId: it.qId, qOrt: it.qOrt, menge: 1, lagerIst: it.lagerIst };
  render();
}

function maRemove(key) { delete MA_STATE.sel[key]; render(); }
function maClear() { MA_STATE.sel = {}; render(); }

function maConfirm() {
  if (_actionLock) return;
  const br = D.bereiche.find(x => x.id === MA_STATE.brId);
  if (!br) return;
  const entries = Object.entries(MA_STATE.sel).filter(([, s]) => s.menge > 0);
  if (!entries.length) return;
  _actionLock = true; setTimeout(() => _actionLock = false, 1500);

  const fillData = entries.map(([key, s]) => {
    const a = D.artikel.find(x => x.id === s.artikelId);
    const lagerIst = a ? locQuelleIst(a, s.qId, s.qOrt) : 0;
    return { key, artikelId: s.artikelId, art: a, fillQty: Math.min(s.menge, lagerIst), angefordert: s.menge, quelleId: s.qId, quelleOrt: s.qOrt, standIst: a?.istBestand[s.qId] || 0, lagerIst };
  });
  const total = fillData.reduce((sum, d) => sum + d.fillQty, 0);
  const dropped = fillData.filter(d => d.fillQty < d.angefordert);
  if (total <= 0) { toast(LANG === "vi" ? "Không còn hàng để xuất" : "Kein Bestand mehr verfügbar", "e"); return; }

  let label = LANG === "vi"
    ? `Xuất kho ${total} đơn vị cho ${maBrName(br)}?`
    : `${total} Einheiten für ${maBrName(br)} aus dem Lager abbuchen?`;
  if (dropped.length) label += `\n\n⚠ ${dropped.length} ${LANG === "vi" ? "món bị giảm vì kho không đủ" : "Artikel reduziert — Bestand reicht nicht"}`;
  label += `\n\n${LANG === "vi" ? "Tồn kho sẽ bị trừ ngay." : "Bestand wird sofort reduziert."}`;

  cConfirm(label, () => {
    const anf = {
      id: uid(), bereichId: br.id, standortId: br.standortId,
      items: fillData.filter(d => d.fillQty > 0).map(d => ({ artikelId: d.artikelId, menge: d.fillQty, quelleId: d.quelleId, quelleOrt: d.quelleOrt })),
      status: "offen", datum: nw(), erstelltVon: U.id
    };
    D.anforderungen.unshift(anf);
    const done = fillData.filter(d => d.fillQty > 0);
    done.forEach(d => { const s = MA_STATE.sel[d.key]; if (s) delete MA_STATE.sel[d.key]; });
    rstAbbuchen(anf, done);
  });
}

function maCard(br, it) {
  const a = it.art;
  const key = `${it.artikelId}|${it.qId}|${it.qOrt}`;
  const sel = MA_STATE.sel[key];
  const conv = formatUnitConv(it.lagerIst, a);
  const low = it.lagerIst <= 0;
  return `<div class="ma-it${low ? " low" : ""}${sel ? " sel" : ""}">
    <div class="ma-pic">${a.bilder?.length ? `<img src="${esc(a.bilder[0])}" loading="lazy" alt="">` : ""}</div>
    <div class="ma-bd">
      <div class="ma-nm">${esc(artN(a))}</div>
      <div class="ma-meta">${esc(maQuelleLabel(br, it))}</div>
      <div class="ma-row">
        <div class="ma-stock"><div class="l">ISTBESTAND</div><div class="v" style="${low ? "color:var(--rd)" : ""}">${it.lagerIst}<small>${esc(a.einheit || "")}</small></div>${conv ? `<div class="ma-conv">= ${esc(conv)}</div>` : ""}</div>
        ${sel
          ? `<div class="ma-st"><button onclick="maStep('${key}',-1)">−</button><input class="ma-q" type="number" inputmode="numeric" value="${sel.menge}" onchange="maType('${key}',this.value)"><button class="p" onclick="maStep('${key}',1)">+</button></div>`
          : `<button class="ma-add" ${low ? "disabled" : ""} onclick="maAdd('${key}')">+ ${LANG === "vi" ? "Chọn" : "Wählen"}</button>`}
      </div>
    </div>
  </div>`;
}

function maKatTabs(items, vertical) {
  const kats = maKatList(items);
  const row = (id, name) => {
    const z = maZeroCount(items, id);
    return `<div class="ma-tab${MA_STATE.kat === id ? " on" : ""}" onclick="maSet('kat','${id}')"><span>${esc(name)}</span>${z ? `<span class="ma-cnt">${z}</span>` : ""}</div>`;
  };
  const tabs = row("all", LANG === "vi" ? "Tất cả" : "Alle") + kats.map(k => row(k.id, katN(k))).join("");
  return `<div class="ma-tabs${vertical ? " v" : ""}">${tabs}</div>`;
}

function maGrid(br, items) {
  const q = MA_STATE.search.trim().toLowerCase();
  let list = items;
  if (MA_STATE.kat !== "all") list = list.filter(it => (it.art.kategorien || []).includes(MA_STATE.kat));
  if (q) list = list.filter(it => artN(it.art).toLowerCase().includes(q) || (it.art.artNr || "").toLowerCase().includes(q));
  if (!list.length) return `<div class="ma-empty">${LANG === "vi" ? "Không có món nào" : "Keine Artikel"}</div>`;
  return `<div class="ma-grid">${list.map(it => maCard(br, it)).join("")}</div>`;
}

function maGoBtn() {
  const n = maSelCount();
  return `<button class="ma-go" ${n ? "" : "disabled"} onclick="maConfirm()">✓ ${n} ${LANG === "vi" ? "món bổ sung" : (n === 1 ? "Artikel auffüllen" : "Artikel auffüllen")}</button>`;
}

function renderMaPhone(br, bereiche, items) {
  if (!br) {
    const list = bereiche.map(b => {
      const its = (b.artikel || []).map(ba => maResolve(b, ba)).filter(Boolean);
      const z = maZeroCount(its, "all");
      return `<div class="ma-br" onclick="maOpen('${b.id}')"><div><b>${esc(maBrName(b))}</b><small>${its.length} ${LANG === "vi" ? "món" : "Artikel"}</small></div>${z ? `<span class="ma-cnt">${z}</span>` : ""}</div>`;
    }).join("");
    return `<div class="mn-h"><div class="mn-t">${LANG === "vi" ? "Bổ sung" : "Auffüllung"}</div></div><div class="mn-c ma-phone">${list || `<div class="ma-empty">${LANG === "vi" ? "Chưa được gán Bereich nào" : "Keine Bereiche zugewiesen"}</div>`}</div>`;
  }
  return `<div class="mn-h"><div class="mn-t"><button class="ma-back" onclick="maOpen('')">‹</button> ${esc(maBrName(br))}</div></div>
    <div class="ma-phone">
      <div class="ma-search"><input id="maSearch" type="search" placeholder="${LANG === "vi" ? "Tìm món…" : "Artikel suchen…"}" value="${esc(MA_STATE.search)}" oninput="maSet('search',this.value)"></div>
      <div class="ma-split">
        ${maKatTabs(items, true)}
        <div class="ma-scroll">${maGrid(br, items)}</div>
      </div>
      <div class="ma-bar">${maGoBtn()}</div>
    </div>`;
}

function renderMaIpad(br, bereiche, items) {
  const selEntries = Object.entries(MA_STATE.sel).filter(([, s]) => s.menge > 0);
  const selHtml = selEntries.map(([key, s]) => {
    const a = D.artikel.find(x => x.id === s.artikelId);
    const qName = D.standorte.find(x => x.id === s.qId)?.name || "";
    return `<div class="ma-si"><div class="ma-si-b"><div class="ma-si-n">${esc(a ? artN(a) : "—")}</div><div class="ma-si-r">Lager ${esc(qName)}${s.qOrt ? " · " + esc(s.qOrt) : ""}</div></div><div class="ma-si-q">${s.menge}</div><button class="ma-sx" onclick="maRemove('${key}')">✕</button></div>`;
  }).join("");

  const brHtml = bereiche.map(b => {
    const its = (b.artikel || []).map(ba => maResolve(b, ba)).filter(Boolean);
    const z = maZeroCount(its, "all");
    return `<div class="ma-bb${b.id === MA_STATE.brId ? " on" : ""}" onclick="maOpen('${b.id}')"><div><b>${esc(maBrName(b))}</b><small>${its.length} ${LANG === "vi" ? "món" : "Artikel"}</small></div>${z ? `<em>${z}</em>` : ""}</div>`;
  }).join("");

  const kats = br ? maKatList(items) : [];
  const katHtml = br ? [`<div class="ma-kt${MA_STATE.kat === "all" ? " on" : ""}" onclick="maSet('kat','all')"><span class="ma-kn">${LANG === "vi" ? "Tất cả" : "Alle"}</span><span class="ma-kc">${items.length}</span>${maZeroCount(items, "all") ? `<span class="ma-cnt">${maZeroCount(items, "all")}</span>` : ""}</div>`]
    .concat(kats.map(k => {
      const n = items.filter(it => (it.art.kategorien || []).includes(k.id)).length;
      const z = maZeroCount(items, k.id);
      return `<div class="ma-kt${MA_STATE.kat === k.id ? " on" : ""}" onclick="maSet('kat','${k.id}')"><span class="ma-kn">${esc(katN(k))}</span><span class="ma-kc">${n}</span>${z ? `<span class="ma-cnt">${z}</span>` : ""}</div>`;
    })).join("") : "";

  return `<div class="ma-ipad">
    <div class="ma-left">
      <div class="ma-lh"><b>${LANG === "vi" ? "Đã chọn" : "Ausgewählt"}</b><span class="ma-lc">${selEntries.length}</span></div>
      <div class="ma-sl">${selHtml || `<div class="ma-empty">${LANG === "vi" ? "Chưa chọn món nào" : "Noch nichts gewählt"}</div>`}</div>
      <div class="ma-lb">
        ${selEntries.length ? `<div class="ma-clr" onclick="maClear()">${LANG === "vi" ? "Xoá tất cả" : "Alle löschen"}</div>` : ""}
        ${maGoBtn()}
      </div>
    </div>
    <div class="ma-mid">
      <div class="ma-ml">${LANG === "vi" ? "BEREICH" : "BEREICH"}</div>
      <div class="ma-bsel">${brHtml || `<div class="ma-empty">${LANG === "vi" ? "Chưa được gán Bereich nào" : "Keine Bereiche zugewiesen"}</div>`}</div>
      <div class="ma-ml">KATEGORIE</div>
      <div class="ma-kl">${katHtml}</div>
    </div>
    <div class="ma-right">
      <div class="ma-rh">${br ? `<b>${esc(maBrName(br))}</b>` : ""}<div class="ma-search"><input id="maSearch" type="search" placeholder="${LANG === "vi" ? "Tìm món…" : "Artikel suchen…"}" value="${esc(MA_STATE.search)}" oninput="maSet('search',this.value)"></div></div>
      <div class="ma-scroll">${br ? maGrid(br, items) : `<div class="ma-empty">${LANG === "vi" ? "Chọn một Bereich" : "Bereich wählen"}</div>`}</div>
    </div>
  </div>`;
}

function renderAuffuellungMa(vS, aS) {
  const bereiche = maBereiche(vS, aS);
  const br = bereiche.find(b => b.id === MA_STATE.brId) || null;
  if (MA_STATE.brId && !br) MA_STATE.brId = "";
  const items = br ? (br.artikel || []).map(ba => maResolve(br, ba)).filter(Boolean) : [];
  MA_ITEMS = items;
  const ipad = window.innerWidth >= 768;
  return ipad ? renderMaIpad(br, bereiche, items) : renderMaPhone(br, bereiche, items);
}
