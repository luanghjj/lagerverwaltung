// ═══ MEHRERE LAGERORTE PRO STANDORT ═══
// a.lagerortSplit[sid] = [{ort, ist, soll}, …]  – nur vorhanden, wenn ein Artikel an einem Standort ≥ 2 Lagerorte hat
//                                                 (DB: artikel_bestand.lagerort_split, sonst []).
// a.istBestand[sid] / a.sollBestand[sid] bleiben immer die SUMME, a.lagerort[sid] = erster Lagerort.
// → Bestellliste, Warnungen, Auswertung usw. rechnen unverändert mit dem Standort-Gesamtwert,
//   und ältere App-Versionen lesen/schreiben weiter die Summen-Spalten.
// Passt die gespeicherte Aufteilung nicht (mehr) zur Summe (z.B. alte App-Version hat nur IST geschrieben),
// gleicht locRows() die Differenz aus: Zugang → erster Lagerort, Abgang → ab erstem Lagerort, Rest vom nächsten.

function _locNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function _locSum(rows, key) { return rows.reduce((s, r) => s + r[key], 0); }

// Gleiche Lagerorte zusammenfassen (Reihenfolge des ersten Auftretens bleibt)
function _locMerge(rows) {
  const out = [];
  rows.forEach(r => {
    const ex = out.find(x => x.ort === r.ort);
    if (ex) { ex.ist += r.ist; ex.soll += r.soll; }
    else out.push({ ort: r.ort, ist: r.ist, soll: r.soll });
  });
  return out;
}

// Differenz auf die Zeilen verteilen. Zugang → Zeile start. Abgang → ab Zeile start,
// was dort fehlt, von den folgenden Zeilen (danach wieder von vorne). Summe stimmt immer.
function locShift(rows, key, delta, start) {
  if (!rows.length || !delta) return rows;
  const s = Math.min(Math.max(start || 0, 0), rows.length - 1);
  if (delta > 0) { rows[s][key] += delta; return rows; }
  let rest = -delta;
  for (let k = 0; k < rows.length && rest > 0; k++) {
    const r = rows[(s + k) % rows.length];
    const take = Math.min(Math.max(r[key], 0), rest);
    r[key] -= take; rest -= take;
  }
  if (rest > 0) rows[s][key] -= rest;
  return rows;
}

// Alle Lagerorte eines Artikels an einem Standort (Kopie), Summe passt immer zu istBestand/sollBestand
function locRows(a, sid) {
  const ist = _locNum(a?.istBestand?.[sid]), soll = _locNum(a?.sollBestand?.[sid]);
  const main = a?.lagerort?.[sid] || "";
  const sp = a?.lagerortSplit?.[sid];
  if (!Array.isArray(sp) || sp.length < 2) return [{ ort: main, ist, soll }];
  let rows = sp.map(r => ({ ort: String(r?.ort || ""), ist: _locNum(r?.ist), soll: _locNum(r?.soll) }));
  rows[0].ort = main; // erster Lagerort = Spalte lagerort (falls dort zwischenzeitlich geändert)
  rows = _locMerge(rows);
  if (rows.length < 2) return [{ ort: main, ist, soll }];
  locShift(rows, "ist", ist - _locSum(rows, "ist"), 0);
  locShift(rows, "soll", soll - _locSum(rows, "soll"), 0);
  return rows;
}

function locIsSplit(a, sid) { return locRows(a, sid).length > 1; }
function locNames(a, sid) { return locRows(a, sid).map(r => r.ort).filter(Boolean); }
function locHas(a, sid, name) { return !!name && locNames(a, sid).includes(name); }

// Anzeige: "OMOI 40 · Origami 20" bei mehreren Lagerorten, sonst nur der Name ("" wenn keiner)
function locLabel(a, sid) {
  const rows = locRows(a, sid);
  if (rows.length < 2) return rows[0].ort;
  return rows.map(r => `${r.ort || "—"} ${r.ist}`).join(" · ");
}
// Alle Standorte zusammen (Artikelliste ohne Standortfilter)
function locLabelAll(a, sids) { return sids.map(sid => locLabel(a, sid)).filter(Boolean).join(" | "); }

// Zeilen übernehmen: Summe → istBestand/sollBestand, erster Ort → lagerort, Aufteilung nur bei ≥ 2 Orten
function locStore(a, sid, rows) {
  rows = _locMerge((rows || []).map(r => ({ ort: String(r.ort || ""), ist: _locNum(r.ist), soll: _locNum(r.soll) })));
  if (!rows.length) rows = [{ ort: "", ist: 0, soll: 0 }];
  a.istBestand = a.istBestand || {}; a.sollBestand = a.sollBestand || {}; a.lagerort = a.lagerort || {};
  a.istBestand[sid] = _locSum(rows, "ist");
  a.sollBestand[sid] = _locSum(rows, "soll");
  a.lagerort[sid] = rows[0].ort;
  if (rows.length > 1) (a.lagerortSplit = a.lagerortSplit || {})[sid] = rows;
  else if (a.lagerortSplit) delete a.lagerortSplit[sid];
}

// IST am Standort auf `neu` setzen. Bei mehreren Lagerorten geht die Differenz an Lagerort `ort`
// (Standard: erster); ein Abgang, der dort nicht reicht, wird von den nächsten Lagerorten abgezogen.
// Rückgabe: betroffene Lagerorte für die Bewegung, z.B. "Restaurant" oder "Restaurant 3 · Lager 01 2".
// create=true (nur Wareneingang / Transfer-Empfang, Lagerort wird dort mitgespeichert): Zugang an einen Lagerort,
// den der Artikel noch nicht hat → wird angelegt (ohne Lagerort: wird zugewiesen). Sonst unbekannter Ort → erster.
function locSetIst(a, sid, neu, ort, create) {
  a.istBestand = a.istBestand || {};
  let rows = locRows(a, sid);
  if (create && ort && _locNum(neu) > _locSum(rows, "ist") && !rows.some(r => r.ort === ort)) {
    if (rows.length === 1 && !rows[0].ort) rows[0].ort = ort;
    else rows.push({ ort, ist: 0, soll: 0 });
    locStore(a, sid, rows);
    rows = locRows(a, sid);
  }
  if (rows.length < 2) { a.istBestand[sid] = neu; return rows[0].ort; }
  let i = ort ? rows.findIndex(r => r.ort === ort) : 0;
  if (i < 0) i = 0;
  const before = rows.map(r => r.ist);
  locShift(rows, "ist", _locNum(neu) - _locSum(rows, "ist"), i);
  locStore(a, sid, rows);
  // ab dem gewählten Lagerort aufführen (gleiche Reihenfolge wie beim Abziehen)
  const moved = rows.map((_, k) => (i + k) % rows.length)
    .map(k => ({ ort: rows[k].ort || "—", d: Math.abs(rows[k].ist - before[k]) })).filter(x => x.d);
  if (moved.length < 2) return moved[0]?.ort || rows[i].ort;
  return moved.map(x => `${x.ort} ${x.d}`).join(" · ");
}

// Lagerort aus dem Text einer Bewegung ("Restaurant" bzw. "Restaurant 3 · Lager 01 2" → "Restaurant"),
// z.B. um eine Rückbuchung an den Lagerort zu buchen, von dem genommen wurde
function locSingleOrt(txt) {
  const first = String(txt || "").split(" · ")[0];
  return String(txt || "").includes(" · ") ? first.replace(/ -?\d+$/, "") : first;
}

// Lagerort umbenennen ("" = entfernen, Mengen bleiben). Gibt zurück, ob der Artikel vorher mehrere Lagerorte hatte.
function locRename(a, sid, from, to) {
  const rows = locRows(a, sid);
  const wasSplit = rows.length > 1;
  rows.forEach(r => { if (r.ort === from) r.ort = to; });
  locStore(a, sid, rows);
  return wasSplit;
}

// Wert für die DB-Spalte artikel_bestand.lagerort_split
function locSplitDb(a, sid) {
  const rows = locRows(a, sid);
  return rows.length > 1 ? rows.map(r => ({ ort: r.ort, ist: r.ist, soll: r.soll })) : [];
}

// Auswahl des Lagerorts für Buchungen. Abgang: nur bei mehreren Lagerorten, sonst "".
// zugang=true (Wareneingang, Transfer-Empfang): zusätzlich die übrigen Lagerplätze des Standorts (➕ = neu anlegen).
function locSelectHtml(a, sid, id, cur, onchange, style, zugang) {
  const rows = locRows(a, sid);
  const names = rows.map(r => r.ort);
  const extra = zugang ? [...new Set((D.lagerplaetze || []).filter(lp => lp.standortId === sid && lp.name && !names.includes(lp.name)).map(lp => lp.name))] : [];
  if (rows.length < 2 && !extra.length) return "";
  const sel = names.includes(cur) || extra.includes(cur) ? cur : rows[0].ort;
  const opt = (v, label) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${label}</option>`;
  return `<select class="sel" id="${id}" ${onchange ? `onchange="${onchange}"` : ""} onclick="event.stopPropagation()" style="${style || "font-size:11px;padding:3px 6px"}">`
    + rows.map(r => opt(r.ort, `📦 ${esc(r.ort || "—")} (${r.ist})`)).join("")
    + extra.map(n => opt(n, `➕ ${esc(n)}`)).join("") + `</select>`;
}

// Lagerplatz löschen: betroffene Artikel auflisten, je Artikel wählen, wohin Lagerort + Bestand wandern.
// Standard: anderer Lagerort des Artikels (bei mehreren), sonst "kein Lagerort" (wie bisher).
// onYes(moves) mit moves[artId] = Ziel-Lagerort ("" = keiner)
function locDeleteDialog(sid, name, onYes) {
  const vi = LANG === "vi";
  const affected = D.artikel.filter(a => locHas(a, sid, name));
  const title = `${vi ? "Xóa" : "Löschen"}: ${name}?`;
  if (!affected.length) return cConfirm(title, () => onYes({}));
  const others = (D.lagerplaetze || []).filter(lp => lp.standortId === sid && lp.name !== name).map(lp => lp.name);
  let h = `<div class="mo-ov" id="locDelOv" style="z-index:300"><div class="mo" style="max-width:520px" onclick="event.stopPropagation()"><div class="mo-b" style="padding:18px">`;
  h += `<div style="font-size:14px;font-weight:700;margin-bottom:4px">⚠ ${esc(title)}</div>`;
  h += `<div style="font-size:11.5px;color:var(--t2);margin-bottom:10px">${affected.length} ${t("c.article")} ${vi ? "đang ở đây. Chọn nơi chuyển hàng sang (tổng Kho không đổi):" : "liegen hier. Wohin sollen sie samt Bestand (Standort-Summe bleibt gleich)?"}</div>`;
  h += `<div style="max-height:50vh;overflow:auto">`;
  affected.forEach((a, i) => {
    const rows = locRows(a, sid);
    const r = rows.find(x => x.ort === name);
    const rest = rows.filter(x => x.ort !== name && x.ort).map(x => x.ort);
    const opts = [...new Set([...rest, ...others])];
    const def = rest[0] || "";
    h += `<div style="display:flex;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--bd)">`;
    h += `<div style="flex:1;min-width:0;font-size:12px;font-weight:600">${esc(artN(a))}<div style="font-size:10px;color:var(--t3);font-weight:400">${vi ? "Tồn" : "Bestand"}: ${r?.ist || 0} ${esc(a.einheit || "")}</div></div>`;
    h += `<select class="sel" id="locDel_${i}" style="flex:1;min-width:0;font-size:11.5px">`;
    if (rows.length < 2 || !opts.length) h += `<option value="" ${def ? "" : "selected"}>— ${vi ? "Không có Lagerort" : "Kein Lagerort"}</option>`;
    h += opts.map(o => `<option value="${esc(o)}" ${o === def ? "selected" : ""}>→ 📦 ${esc(o)}${rest.includes(o) ? " ✓" : ""}</option>`).join("");
    h += `</select></div>`;
  });
  h += `</div><div style="display:flex;gap:6px;justify-content:flex-end;margin-top:12px"><button class="btn btn-o" id="locDelNo">${t("c.cancel")}</button><button class="btn btn-d" id="locDelYes">${vi ? "Xóa & chuyển" : "Löschen & verschieben"}</button></div>`;
  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
  const close = () => document.getElementById("locDelOv")?.remove();
  document.getElementById("locDelNo").onclick = close;
  document.getElementById("locDelOv").onclick = close;
  document.getElementById("locDelYes").onclick = () => {
    const moves = {};
    affected.forEach((a, i) => { moves[a.id] = document.getElementById(`locDel_${i}`)?.value || ""; });
    close();
    onYes(moves);
  };
}

// ═══ QUELLE BEIM AUFFÜLLEN (Bereiche): Standort gesamt oder ein bestimmter Lagerort ═══
// Gespeichert als quelleId (Standort) + quelleOrt ("" = Standort gesamt). Select-Wert: "sid@@ort".
const LOC_Q_SEP = "@@";
// Gültige Quelle: Lagerplatz des Standorts oder Lagerort, den der Artikel dort hat. Sonst (gelöscht) → "" = gesamt
function _locPlaetze(sid) { return [...new Set((typeof D !== "undefined" && D.lagerplaetze || []).filter(lp => lp.standortId === sid && lp.name).map(lp => lp.name))]; }
function locQuelleOrt(a, sid, ort) { return ort && (locHas(a, sid, ort) || _locPlaetze(sid).includes(ort)) ? ort : ""; }
// Artikel ohne Lagerplatz an dem Standort (nur eine Zeile, kein Ort) → ganzer Bestand gilt als dort verfügbar
function _locUnplaced(a, sid) { const rows = locRows(a, sid); return rows.length === 1 && !rows[0].ort; }
function locQuelleIst(a, sid, ort) {
  const o = locQuelleOrt(a, sid, ort);
  if (!o) return _locNum(a?.istBestand?.[sid]);
  const r = locRows(a, sid).find(x => x.ort === o);
  return r ? r.ist : _locUnplaced(a, sid) ? _locNum(a?.istBestand?.[sid]) : 0;
}
function locQuelleParse(v) { const i = String(v || "").indexOf(LOC_Q_SEP); return i < 0 ? { sid: String(v || ""), ort: "" } : { sid: v.slice(0, i), ort: v.slice(i + LOC_Q_SEP.length) }; }
// Pro Standort: "🏢 Standort (gesamt n)" + alle Lagerplätze des Standorts (+ Lagerorte des Artikels), Menge des Artikels dort
function locQuelleSelectHtml(a, sid, ort, id, onchange, style) {
  const cur = locQuelleOrt(a, sid, ort);
  const vi = typeof LANG !== "undefined" && LANG === "vi";
  const selV = cur ? sid + LOC_Q_SEP + cur : sid;
  const o = (v, label) => `<option value="${esc(v)}" ${v === selV ? "selected" : ""}>${label}</option>`;
  let h = `<select class="sel" id="${id}" ${onchange ? `onchange="${onchange}"` : ""} onclick="event.stopPropagation()" style="${style || "font-size:10px"}" title="${vi ? "Nguồn" : "Quelle"}">`;
  D.standorte.filter(s => s.aktiv || s.id === sid).forEach(s => {
    const rows = a ? locRows(a, s.id) : [];
    const names = [...new Set([..._locPlaetze(s.id), ...rows.map(r => r.ort).filter(Boolean)])];
    h += `<optgroup label="${esc(s.name)}">` + o(s.id, `🏢 ${esc(s.name)} (${vi ? "tổng" : "gesamt"}${a ? ` ${_locNum(a.istBestand?.[s.id])}` : ""})`)
      + names.map(n => { const r = rows.find(x => x.ort === n); return o(s.id + LOC_Q_SEP + n, `📦 ${esc(n)}${r ? ` (${r.ist})` : ""}`); }).join("") + `</optgroup>`;
  });
  return h + `</select>`;
}
// Abbuchen: bestimmter Lagerort → nur dort; sonst Standort gesamt (ab erstem Lagerort, Rest vom nächsten).
// Rückgabe wie locSetIst (Lagerort-Text für die Bewegung)
function locTakeFrom(a, sid, qty, ort) {
  const o = locQuelleOrt(a, sid, ort);
  if (!o) return locSetIst(a, sid, Math.max(0, _locNum(a.istBestand?.[sid]) - qty));
  const rows = locRows(a, sid);
  const r = rows.find(x => x.ort === o);
  if (!r) { if (_locUnplaced(a, sid)) a.istBestand[sid] = Math.max(0, rows[0].ist - qty); return o; } // ohne Lagerplatz → vom Bestand; anderswo gelagert → dort nichts
  if (rows.length < 2) { a.istBestand[sid] = Math.max(0, rows[0].ist - qty); return o; }
  r.ist = Math.max(0, r.ist - qty);
  locStore(a, sid, rows);
  return o;
}
