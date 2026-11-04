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
function locSetIst(a, sid, neu, ort) {
  a.istBestand = a.istBestand || {};
  const rows = locRows(a, sid);
  if (rows.length < 2) { a.istBestand[sid] = neu; return; }
  let i = ort ? rows.findIndex(r => r.ort === ort) : 0;
  if (i < 0) i = 0;
  locShift(rows, "ist", _locNum(neu) - _locSum(rows, "ist"), i);
  locStore(a, sid, rows);
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

// Auswahl des Lagerorts für Buchungen – nur bei mehreren Lagerorten, sonst ""
function locSelectHtml(a, sid, id, cur, onchange, style) {
  const rows = locRows(a, sid);
  if (rows.length < 2) return "";
  const sel = rows.some(r => r.ort === cur) ? cur : rows[0].ort;
  return `<select class="sel" id="${id}" ${onchange ? `onchange="${onchange}"` : ""} onclick="event.stopPropagation()" style="${style || "font-size:11px;padding:3px 6px"}">${rows.map(r => `<option value="${esc(r.ort)}" ${r.ort === sel ? "selected" : ""}>📦 ${esc(r.ort || "—")} (${r.ist})</option>`).join("")}</select>`;
}
