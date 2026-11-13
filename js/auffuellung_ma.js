/* Mitarbeiter-Auffüllung: Bereich → Kategorie → Artikel, direktes Abbuchen ohne Manager-Bestätigung.
   Phone: Bereich-Liste, dann Split-View (Kategorie-Tabs links, Karten rechts, sticky Button).
   iPad ab 768px: 3 Spalten (Auswahl | Bereich+Kategorie | Artikel). */
const MA_STATE = { brId: "", kat: "all", search: "", sel: {}, panel: false };
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

// Neu zeichnen. Das Auswahl-Panel hängt außerhalb von #app und wird separat aktualisiert.
function maUi() { render(); maPanelRender(); }
// Tastatur schließen, bevor neu gezeichnet wird (sonst springt sie bei jedem +/− wieder auf)
function maKbOff() {
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.blur();
}

function maSet(key, val) { MA_STATE[key] = val; if (key !== "search") maKbOff(); maUi(); }
function maOpen(brId) { MA_STATE.brId = brId; MA_STATE.kat = "all"; MA_STATE.search = ""; MA_STATE.panel = false; maKbOff(); maUi(); }

function maSelCount() { return Object.values(MA_STATE.sel).filter(x => x.menge > 0).length; }

function maStep(key, dir) {
  const s = MA_STATE.sel[key];
  if (!s) return;
  const max = s.lagerIst;
  s.menge = Math.max(0, Math.min(max, s.menge + dir));
  if (s.menge <= 0) delete MA_STATE.sel[key];
  maKbOff();
  maUi();
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
  setTimeout(maUi, 0);
}

function maAdd(key) {
  const it = (MA_ITEMS || []).find(x => `${x.artikelId}|${x.qId}|${x.qOrt}` === key);
  if (!it) return;
  maToggle(key, it);
}

function maToggle(key, it) {
  if (MA_STATE.sel[key]) { delete MA_STATE.sel[key]; maUi(); return; }
  if (it.lagerIst <= 0) { toast(LANG === "vi" ? "Hết hàng — không bổ sung được" : "Kein Bestand — Auffüllen nicht möglich", "e"); return; }
  MA_STATE.sel[key] = { artikelId: it.artikelId, qId: it.qId, qOrt: it.qOrt, menge: 1, lagerIst: it.lagerIst };
  maKbOff();
  maUi();
}

function maRemove(key) { delete MA_STATE.sel[key]; maUi(); }
function maClear() { MA_STATE.sel = {}; maUi(); }

// Aktuelle Auswahl → Buchungszeilen (Menge auf aktuellen Lagerbestand begrenzt)
function maFillData() {
  return Object.entries(MA_STATE.sel).filter(([, s]) => s.menge > 0).map(([key, s]) => {
    const a = D.artikel.find(x => x.id === s.artikelId);
    const lagerIst = a ? locQuelleIst(a, s.qId, s.qOrt) : 0;
    return { key, artikelId: s.artikelId, art: a, fillQty: Math.min(s.menge, lagerIst), angefordert: s.menge, quelleId: s.qId, quelleOrt: s.qOrt, standIst: a?.istBestand[s.qId] || 0, lagerIst };
  });
}

// Bestätigung: nur Kurzfrage mit Summe — bearbeitet wird die Auswahl im Panel, nicht hier
function maConfirm() {
  if (_actionLock) return;
  if (!D.bereiche.find(x => x.id === MA_STATE.brId) || !maSelCount()) return;
  maKbOff();
  maCfRender();
}

function maCfClose() { document.getElementById("maCfOv")?.remove(); }

function maCfRender() {
  const br = D.bereiche.find(x => x.id === MA_STATE.brId);
  const fd = br ? maFillData() : [];
  if (!fd.length) { maCfClose(); return; }
  const vi = LANG === "vi";
  const total = fd.reduce((sum, d) => sum + d.fillQty, 0);
  const dropped = fd.filter(d => d.fillQty < d.angefordert).length;
  const inner = `<div class="mo ma-cf" onclick="event.stopPropagation()">
    <div class="mo-h"><div class="mo-ti">${vi ? "Xác nhận bổ sung" : "Auffüllen bestätigen"} — ${esc(maBrName(br))}</div><button class="bi" onclick="maCfClose()">✕</button></div>
    <div class="ma-cf-f">
      <div class="ma-cf-q">${fd.length} ${vi ? "món bổ sung" : (fd.length === 1 ? "Artikel auffüllen" : "Artikel auffüllen")}?</div>
      <div class="ma-cf-sum">${vi ? "Tổng" : "Gesamt"} <b>${total}</b> ${vi ? "đơn vị" : "Einheiten"}</div>
      ${dropped ? `<div class="ma-cf-w">⚠ ${dropped} ${vi ? "món bị giảm vì kho không đủ" : "Artikel reduziert — Bestand reicht nicht"}</div>` : ""}
      <div class="ma-cf-h">${vi ? "Tồn kho sẽ bị trừ ngay." : "Bestand wird sofort reduziert."}</div>
      <div class="ma-cf-btn"><button class="btn btn-o" onclick="maCfClose()">${t("c.cancel")}</button><button class="btn btn-p" ${total > 0 ? "" : "disabled"} onclick="maCfBook()">${vi ? "Xác nhận" : "Bestätigen"}</button></div>
    </div>
  </div>`;
  const ov = document.getElementById("maCfOv");
  if (ov) { ov.innerHTML = inner; return; }
  document.body.insertAdjacentHTML("beforeend", `<div class="mo-ov" id="maCfOv" style="z-index:300" onclick="maCfClose()">${inner}</div>`);
}

function maCfBook() {
  if (_actionLock) return;
  const br = D.bereiche.find(x => x.id === MA_STATE.brId);
  if (!br) { maCfClose(); return; }
  const done = maFillData().filter(d => d.fillQty > 0);
  if (!done.length) { toast(LANG === "vi" ? "Không còn hàng để xuất" : "Kein Bestand mehr verfügbar", "e"); return; }
  _actionLock = true; setTimeout(() => _actionLock = false, 1500);
  maCfClose();
  const anf = {
    id: uid(), bereichId: br.id, standortId: br.standortId,
    items: done.map(d => ({ artikelId: d.artikelId, menge: d.fillQty, quelleId: d.quelleId, quelleOrt: d.quelleOrt })),
    status: "offen", datum: nw(), erstelltVon: U.id
  };
  D.anforderungen.unshift(anf);
  done.forEach(d => { delete MA_STATE.sel[d.key]; });
  rstAbbuchen(anf, done);
}

function maCard(br, it) {
  const a = it.art;
  const key = `${it.artikelId}|${it.qId}|${it.qOrt}`;
  const sel = MA_STATE.sel[key];
  const conv = formatUnitConv(it.lagerIst, a);
  // Wie die App: grün ab Soll, gelb darunter, rot bei 0 — zusätzlich rot ab Mindestmenge
  const min = (a.mindestmenge && a.mindestmenge[it.qId]) || 0;
  const low = it.lagerIst <= 0 || (min > 0 && it.lagerIst <= min);
  const col = low ? "var(--rd)" : it.lagerIst < it.soll ? "var(--yl)" : "var(--gn)";
  const leer = it.lagerIst <= 0; // nur bei leerem Lager nicht wählbar
  return `<div class="ma-it${low ? " low" : ""}${sel ? " sel" : ""}">
    <div class="ma-pic">${a.bilder?.length ? `<img src="${esc(a.bilder[0])}" loading="lazy" alt="">` : ""}</div>
    <div class="ma-bd">
      <div class="ma-nm">${esc(artN(a))}</div>
      <div class="ma-meta">${esc(maQuelleLabel(br, it))}</div>
      <div class="ma-row">
        <div class="ma-stock"><div class="l">ISTBESTAND</div><div class="v" style="color:${col}">${it.lagerIst}<small>${esc(a.einheit || "")}</small></div>${conv ? `<div class="ma-conv">= ${esc(conv)}</div>` : ""}</div>
        ${sel
          ? `<div class="ma-st"><button onclick="maStep('${key}',-1)">−</button><input class="ma-q" type="number" inputmode="numeric" value="${sel.menge}" onchange="maType('${key}',this.value)"><button class="p" onclick="maStep('${key}',1)">+</button></div>`
          : `<button class="ma-add" ${leer ? "disabled" : ""} onclick="maAdd('${key}')">+ ${LANG === "vi" ? "Chọn" : "Wählen"}</button>`}
      </div>
    </div>
  </div>`;
}

// Farbe der Kategorie (aus Kategorien-Verwaltung) als Tab-Streifen + getönter Hintergrund
function maKatStyle(k) {
  const c = k && /^#[0-9a-f]{6}$/i.test(k.farbe || "") ? k.farbe : null;
  return c ? ` style="--kc:${c};--kb:${c}1F;--ka:${c}59"` : "";
}

function maKatTabs(items, vertical) {
  const kats = maKatList(items);
  const row = (id, name, k) => {
    const z = maZeroCount(items, id);
    return `<div class="ma-tab${k ? " kf" : ""}${MA_STATE.kat === id ? " on" : ""}"${maKatStyle(k)} onclick="maSet('kat','${id}')"><span>${esc(name)}</span>${z ? `<span class="ma-cnt">${z}</span>` : ""}</div>`;
  };
  const tabs = row("all", LANG === "vi" ? "Tất cả" : "Alle") + kats.map(k => row(k.id, katN(k), k)).join("");
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
  return `<button class="ma-go" ${n ? "" : "disabled"} onclick="maConfirm()">✓ ${n} ${LANG === "vi" ? "món bổ sung" : "Artikel auffüllen"}</button>`;
}

// Phone: Auswahl-Panel von rechts (Wischgeste oder 🧺-Button). Nur auf dem Phone, iPad hat die Spalte.
function maPanelOpen() { MA_STATE.panel = true; maKbOff(); maPanelRender(); }
function maPanelClose() { MA_STATE.panel = false; maPanelRender(); }

function maPanelRender() {
  const ov = document.getElementById("maPnOv");
  if (window.innerWidth >= 768 || !MA_STATE.panel) { ov?.remove(); return; }
  const vi = LANG === "vi";
  const entries = Object.entries(MA_STATE.sel).filter(([, s]) => s.menge > 0);
  const rows = entries.map(([key, s]) => {
    const a = D.artikel.find(x => x.id === s.artikelId);
    const qName = D.standorte.find(x => x.id === s.qId)?.name || "";
    const short = s.menge > s.lagerIst;
    return `<div class="ma-pn-it">
      <div class="ma-pn-b"><div class="ma-pn-n">${esc(a ? artN(a) : "—")}</div><div class="ma-pn-m">${esc(qName)}${s.qOrt ? " · " + esc(s.qOrt) : ""} · ${vi ? "Kho" : "Lager"} <b style="color:${short ? "var(--rd)" : "var(--t2)"}">${s.lagerIst}</b></div></div>
      <div class="ma-st"><button onclick="maStep('${key}',-1)">−</button><input class="ma-q" type="number" inputmode="numeric" value="${s.menge}" onchange="maType('${key}',this.value)"><button class="p" onclick="maStep('${key}',1)">+</button></div>
      <button class="ma-cf-x" onclick="maRemove('${key}')" aria-label="${vi ? "Xoá" : "Entfernen"}">✕</button>
    </div>`;
  }).join("");
  const inner = `<div class="ma-pn-bd" onclick="maPanelClose()"></div>
    <div class="ma-pn">
      <div class="ma-pn-h"><b>${vi ? "Đã chọn" : "Ausgewählt"}</b><span class="ma-lc">${entries.length}</span><button class="bi" onclick="maPanelClose()">✕</button></div>
      <div class="ma-pn-l">${rows || `<div class="ma-empty">${vi ? "Chưa chọn món nào" : "Noch nichts gewählt"}</div>`}</div>
      <div class="ma-pn-f">
        ${entries.length ? `<div class="ma-clr" onclick="maClear()">${vi ? "Xoá tất cả" : "Alle löschen"}</div>` : ""}
        ${maGoBtn()}
      </div>
    </div>`;
  if (ov) { ov.innerHTML = inner; return; }
  document.body.insertAdjacentHTML("beforeend", `<div id="maPnOv">${inner}</div>`);
}

// Nur eindeutige waagerechte Wischgesten zählen — diagonales Scrollen wird ignoriert.
function maSwipe(el) {
  if (el.dataset.sw) return;
  el.dataset.sw = "1";
  let x0 = 0, y0 = 0, dx = 0, dy = 0, moved = false;
  el.addEventListener("touchstart", e => {
    const t = e.changedTouches[0];
    x0 = t.clientX; y0 = t.clientY; dx = 0; dy = 0; moved = false;
  }, { passive: true });
  el.addEventListener("touchmove", e => {
    const t = e.changedTouches[0];
    dx = t.clientX - x0; dy = t.clientY - y0;
    if (!moved && Math.abs(dx) > 10 && Math.abs(dx) > 1.5 * Math.abs(dy)) moved = true;
    if (moved) e.preventDefault();
  }, { passive: false });
  el.addEventListener("touchend", () => {
    if (!moved || Math.abs(dx) < 60 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    if (dx < 0 && !MA_STATE.panel) maPanelOpen();
    else if (dx > 0 && MA_STATE.panel) maPanelClose();
  }, { passive: true });
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
    <div class="ma-phone" onpointerenter="maSwipe(this)">
      <div class="ma-search"><input id="maSearch" type="search" placeholder="${LANG === "vi" ? "Tìm món…" : "Artikel suchen…"}" value="${esc(MA_STATE.search)}" oninput="maSet('search',this.value)"></div>
      <div class="ma-split">
        ${maKatTabs(items, true)}
        <div class="ma-scroll">${maGrid(br, items)}</div>
      </div>
      <div class="ma-bar">${maGoBtn()}<button class="ma-cart" onclick="maPanelOpen()" aria-label="${LANG === "vi" ? "Đã chọn" : "Ausgewählt"}">🧺<span class="ma-cart-n">${maSelCount()}</span></button></div>
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
      return `<div class="ma-kt kf${MA_STATE.kat === k.id ? " on" : ""}"${maKatStyle(k)} onclick="maSet('kat','${k.id}')"><span class="ma-kn">${esc(katN(k))}</span><span class="ma-kc">${n}</span>${z ? `<span class="ma-cnt">${z}</span>` : ""}</div>`;
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
  if (ipad) MA_STATE.panel = false;
  const html = ipad ? renderMaIpad(br, bereiche, items) : renderMaPhone(br, bereiche, items);
  setTimeout(maPanelRender, 0);
  return html;
}
