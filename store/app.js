// ═══ /store — Lieferung + Einkauf ═══
// Spricht Supabase direkt an. Kein Login: Name einmal fragen, auf dem Gerät merken.
// "1234" (statt Name) schaltet den Admin-Modus frei → Liefertage hier in /store setzen.
//
// Lieferung: ein Schein = eine Route (Quell-Standort → Ziel-Standort) an einem Liefertag,
// status "geplant" — der Bestand bleibt unberührt, bis "Lieferung abgeschlossen":
// angehakte Positionen → Bestand Quelle minus, Ziel plus, Bewegungen umbuchung + eingang,
// Status "empfangen". Nicht angehakt → Warnung, bei OK aus dem Schein entfernen.
// Freitext-Zeilen berühren den Bestand nie.
//
// Einkauf: Menge pro Standort und Liefertag notieren, beim Einkauf "gekauft" abhaken. Keine Lagerwirkung.

const SUPABASE_URL = "https://tpabnjsplwfvlwrecboz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jF-lkGv2qQ97kraZa1DigQ_BUIt5tm3";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PIN = "1234";
const STORE_IDS = ["ENSO", "mo8dhnnzfc3un", "OKYU"]; // Enso, OMOI Origami, Okyu
const NAME_KEY = "store_name";
const ADMIN_KEY = "store_admin";

// Feste Einkauf-Liste (aus "2026 Lieferung.xlsx", von Linh freigegeben)
const EINKAUF = [
  { id: "ek_tofu", name: "Tofu", einheit: "Stk.", wo: "Asia-Markt", hinweis: "leere Eimer zurückgeben", sort: 10 },
  { id: "ek_eier", name: "Eier", einheit: "Pkg. (18 Stk.)", sort: 20 },
  { id: "ek_bananen", name: "Bananen", einheit: "kg", sort: 30 },
  { id: "ek_chili", name: "Chili, frisch", einheit: "Pkg.", sort: 40 },
  { id: "ek_spinat", name: "Spinat", einheit: "Pkg.", sort: 50 },
  { id: "ek_auberginen", name: "Auberginen", einheit: "Stk.", sort: 60 },
  { id: "ek_lauchzwiebeln", name: "Lauchzwiebeln", einheit: "Bund", sort: 110 },
  { id: "ek_orangen", name: "Orangen", einheit: "kg", sort: 120 },
  { id: "ek_sellerie", name: "Staudensellerie", einheit: "Stk.", sort: 130 },
  { id: "ek_champ_weiss", name: "Champignons, weiß", einheit: "Pkg.", sort: 140 },
  { id: "ek_champ_braun", name: "Champignons, braun", einheit: "Pkg.", sort: 150 },
  { id: "ek_spargel", name: "Grüner Spargel", einheit: "kg", sort: 160 },
  { id: "ek_brokkoli", name: "Brokkoli", einheit: "Stk.", sort: 210 },
  { id: "ek_ananas", name: "Ananas", einheit: "Stk.", sort: 220 },
  { id: "ek_eisberg", name: "Eisbergsalat", einheit: "Stk.", sort: 230 },
  { id: "ek_salatmix", name: "Salatmischung", einheit: "Pkg.", sort: 240 },
  { id: "ek_cherry", name: "Cherrytomaten", einheit: "Schale", sort: 250 },
  { id: "ek_paprika", name: "Paprika, rot", einheit: "kg", sort: 260 },
  { id: "ek_schalotten", name: "Schalotten", einheit: "kg", sort: 270 },
  { id: "ek_aepfel", name: "Äpfel, grün", einheit: "kg", sort: 280 },
  { id: "ek_melone", name: "Wassermelone", einheit: "Stk.", sort: 290 },
  { id: "ek_erdbeeren", name: "Erdbeeren", einheit: "Schale", sort: 300 },
  { id: "ek_heidelbeeren", name: "Heidelbeeren", einheit: "Schale", sort: 310 },
  { id: "ek_zitronengras", name: "Zitronengras", einheit: "Stange", wo: "Asia-Markt", sort: 320 },
  { id: "ek_buchen_hell", name: "Buchenpilze, hell", einheit: "Pkg.", wo: "Asia-Markt", sort: 330 },
  { id: "ek_buchen_dunkel", name: "Buchenpilze, dunkel", einheit: "Pkg.", wo: "Asia-Markt", sort: 340 },
  { id: "ek_klebreis", name: "Klebreismehl", einheit: "Pkg.", wo: "Asia-Markt", sort: 350 },
  { id: "ek_cashew", name: "Cashewkerne", einheit: "Pkg.", sort: 360 },
  { id: "ek_erdnuesse", name: "Erdnüsse, gesalzen", einheit: "Pkg. (500 g)", sort: 370 },
  { id: "ek_milch", name: "Milch", einheit: "Karton", sort: 380 },
  { id: "ek_hefeweizen", name: "Hefeweizen", einheit: "Fl.", sort: 390 },
  { id: "ek_hefeweizen_af", name: "Hefeweizen alkoholfrei", einheit: "Fl.", sort: 400 }
];

const S = {
  name: "", admin: false, screen: "home",
  standorte: [], artikel: [], bestand: {}, termine: [],
  scheine: [], einkaufPos: [],
  // Lieferung: neuer Schein (eine Route)
  von: "", nach: "", datum: "", suche: "", sucheOffen: false,
  entwurf: [],        // [{artId, freitext, einheit, menge}]
  // Einkauf
  ekStandort: "", ekSuche: "",
  ekDatum: "",          // gewählter Liefertag ("" = nächster); vergangene Tage nur Ansicht
  ekWahl: false, ekVerlauf: false, ekVerlaufLaedt: false,
  // Lieferung: Hauptansicht = kommende Liefertage; lfDatum = vergangener Tag (Verlauf)
  lfDatum: "", lfWahl: false, lfVerlauf: null, lfVerlaufLaedt: false,
  busy: false, fehler: ""
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const standort = id => S.standorte.find(s => s.id === id);
const nameOf = id => standort(id)?.name || "?";

function datumLang(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function kommendeTermine() {
  const t = heute();
  return S.termine.map(x => x.datum).filter(d => d >= t).sort();
}
function naechsterTermin() { return kommendeTermine()[0] || ""; }

// ── Daten laden ──
// Supabase liefert höchstens 1000 Zeilen pro Abfrage → seitenweise lesen.
// build() muss bei jedem Aufruf eine frische, sortierte Abfrage liefern.
async function alle(build) {
  const SEITE = 1000, rows = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await build().range(von, von + SEITE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < SEITE) return { data: rows, error: null };
  }
}

async function lade() {
  const [st, art, best, term, tf, ek] = await Promise.all([
    sb.from("standorte").select("id,name,aktiv"),
    alle(() => sb.from("artikel").select("id,name,name_vi,einheit,status,deleted_at").order("id")),
    alle(() => sb.from("artikel_bestand").select("artikel_id,standort_id,ist_bestand,soll_bestand,lagerort,lagerort_split").order("artikel_id").order("standort_id")),
    sb.from("liefertermine").select("datum,notiz").order("datum"),
    sb.from("transfers").select("*").eq("status", "geplant").order("datum", { ascending: false }),
    alle(() => sb.from("einkauf_positionen").select("*").gte("liefer_datum", heute()).order("id"))
  ]);
  for (const r of [st, art, best, term, tf, ek]) {
    if (r.error) throw new Error(r.error.message);
  }
  const tfIds = (tf.data || []).map(t => t.id);
  const ti = tfIds.length
    ? await alle(() => sb.from("transfer_items").select("*").in("transfer_id", tfIds).order("id"))
    : { data: [], error: null };
  if (ti.error) throw new Error(ti.error.message);
  S.standorte = (st.data || []).filter(s => s.aktiv !== false && STORE_IDS.includes(s.id))
    .sort((a, b) => STORE_IDS.indexOf(a.id) - STORE_IDS.indexOf(b.id));
  S.artikel = (art.data || []).filter(a => !a.deleted_at && (a.status || "active") === "active")
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  S.bestand = {};
  (best.data || []).forEach(b => {
    (S.bestand[b.artikel_id] = S.bestand[b.artikel_id] || {})[b.standort_id] = b;
  });
  S.termine = term.data || [];
  const itemsByTf = {};
  (ti.data || []).forEach(i => { (itemsByTf[i.transfer_id] = itemsByTf[i.transfer_id] || []).push(zeileAusDb(i)); });
  S.scheine = (tf.data || []).filter(t => t.liefer_datum).map(t => ({ ...t, items: itemsByTf[t.id] || [] }));
  S.einkaufPos = ek.data || [];
  if (!S.ekStandort) S.ekStandort = S.standorte[0]?.id || "";
  if (!S.von) S.von = S.standorte[0]?.id || "";
  if (!S.nach) S.nach = S.standorte.find(s => s.id !== S.von)?.id || "";
  if (!S.datum) S.datum = naechsterTermin();
}

function zeileAusDb(i) {
  return {
    id: i.id, artId: i.artikel_id || "", freitext: i.freitext || "",
    einheit: i.einheit || "", menge: num(i.menge) || (i.freitext ? i.menge : 0),
    abgehakt: !!i.abgehakt
  };
}
function bestandVon(artId, sid) {
  return num(S.bestand[artId]?.[sid]?.ist_bestand);
}

// Bestand als Artikel-Objekt, wie es ../js/lagerorte.js erwartet (locRows / locSetIst).
// locSetIst bucht genau wie die Lager-App: Abgang ab dem ersten Lagerort, Rest vom nächsten,
// reicht es nirgends, wird der erste Lagerort negativ.
function artObj(artId) {
  const b = S.bestand[artId] || {};
  const a = { istBestand: {}, sollBestand: {}, lagerort: {}, lagerortSplit: {} };
  for (const sid in b) {
    a.istBestand[sid] = num(b[sid].ist_bestand);
    a.sollBestand[sid] = num(b[sid].soll_bestand);
    a.lagerort[sid] = b[sid].lagerort || "";
    if (Array.isArray(b[sid].lagerort_split) && b[sid].lagerort_split.length > 1) a.lagerortSplit[sid] = b[sid].lagerort_split;
  }
  return a;
}
// Neu-Bestand am Standort buchen. Gibt {patch, lagerort} für die DB zurück.
function buche(artId, sid, neu) {
  const a = artObj(artId);
  const lagerort = locSetIst(a, sid, neu);
  const patch = { ist_bestand: num(a.istBestand[sid]) };
  const split = locSplitDb(a, sid);
  if (split.length) patch.lagerort_split = split;
  return { patch, lagerort };
}

// ── Lieferung abschließen ──
async function abschliessen(schein) {
  const offen = schein.items.filter(z => !z.abgehakt);
  if (offen.length && !await frage(
    `Noch ${offen.length} ${offen.length === 1 ? "Position" : "Positionen"} nicht abgehakt`,
    `<p>Diese Positionen werden aus dem Lieferschein entfernt und nicht gebucht:</p><ul class="mt-2 space-y-1">${offen.map(z => `<li class="text-sm font-medium text-slate-700">• ${esc(zeilenName(z))}</li>`).join("")}</ul>`,
    "Entfernen & abschließen")) return;

  const gebucht = schein.items.filter(z => z.abgehakt && z.artId);
  const knapp = gebucht.filter(z => bestandVon(z.artId, schein.von_id) < num(z.menge))
    .map(z => ({ z, ist: bestandVon(z.artId, schein.von_id) }));
  if (knapp.length && !await frage(
    "Bestand reicht nicht",
    `<p>Bei ${knapp.length === 1 ? "dieser Position" : "diesen Positionen"} wird der Bestand negativ:</p><ul class="mt-2 space-y-1">${knapp.map(k => `<li class="text-sm font-medium text-slate-700">• ${esc(artikelName(k.z.artId))}: Bestand ${k.ist}, Lieferung ${num(k.z.menge)}</li>`).join("")}</ul>`,
    "Trotzdem buchen")) return;

  S.busy = true; zeichne();
  try {
    // Bestand direkt vor dem Buchen neu lesen — zwischen Laden und Abschließen kann gebucht worden sein
    const ids = [...new Set(gebucht.map(z => z.artId))];
    if (ids.length) {
      const { data: frisch, error: fErr } = await sb.from("artikel_bestand")
        .select("artikel_id,standort_id,ist_bestand,soll_bestand,lagerort,lagerort_split").in("artikel_id", ids);
      if (fErr) throw new Error(fErr.message);
      (frisch || []).forEach(b => { (S.bestand[b.artikel_id] = S.bestand[b.artikel_id] || {})[b.standort_id] = b; });
    }

    const jetzt = new Date().toISOString();
    for (const z of gebucht) {
      const menge = num(z.menge);
      const von = buche(z.artId, schein.von_id, bestandVon(z.artId, schein.von_id) - menge);
      const nach = buche(z.artId, schein.nach_id, bestandVon(z.artId, schein.nach_id) + menge);
      for (const [sid, res] of [[schein.von_id, von], [schein.nach_id, nach]]) {
        const { data: upd, error } = await sb.from("artikel_bestand").update(res.patch)
          .eq("artikel_id", z.artId).eq("standort_id", sid).select("artikel_id");
        if (error) throw new Error(error.message);
        if (!upd || !upd.length) {
          const { error: iErr } = await sb.from("artikel_bestand").upsert(
            { artikel_id: z.artId, standort_id: sid, ist_bestand: 0, soll_bestand: 0, mindestmenge: 0, lagerort: "", ...res.patch },
            { onConflict: "artikel_id,standort_id", ignoreDuplicates: true });
          if (iErr) throw new Error(iErr.message);
        }
        const row = (S.bestand[z.artId] = S.bestand[z.artId] || {})[sid] || {};
        Object.assign(row, res.patch);
        S.bestand[z.artId][sid] = row;
      }
      const { error: bErr } = await sb.from("bewegungen").insert([
        { id: uid(), typ: "umbuchung", artikel_id: z.artId, standort_id: schein.von_id, ziel_standort_id: schein.nach_id, menge, datum: jetzt, benutzer: S.name, referenz: `UB→${nameOf(schein.nach_id)}`, notiz: `Lieferung ${schein.liefer_datum}`, lagerort: von.lagerort },
        { id: uid(), typ: "eingang", artikel_id: z.artId, standort_id: schein.nach_id, menge, datum: jetzt, benutzer: S.name, referenz: `UB←${nameOf(schein.von_id)}`, notiz: `Lieferung ${nameOf(schein.von_id)}→${nameOf(schein.nach_id)}`, lagerort: nach.lagerort }
      ]);
      if (bErr) throw new Error(bErr.message);
      const { error: zErr } = await sb.from("transfer_items").update({ empfangen: menge, diff: 0 }).eq("id", z.id);
      if (zErr) throw new Error(zErr.message);
    }
    if (offen.length) {
      const { error } = await sb.from("transfer_items").delete().in("id", offen.map(z => z.id));
      if (error) throw new Error(error.message);
    }
    const { error: tErr } = await sb.from("transfers").update({
      status: "empfangen", empfangen_von: S.name, empfangen_am: jetzt,
      empfangen_details: gebucht.map(z => ({ artId: z.artId, gesendet: num(z.menge), empfangen: num(z.menge), diff: 0 }))
    }).eq("id", schein.id);
    if (tErr) throw new Error(tErr.message);
    schein.status = "empfangen"; schein.empfangen_von = S.name;
    schein.items = schein.items.filter(z => z.abgehakt);
    S.scheine = S.scheine.filter(s => s.id !== schein.id);
    if (S.lfVerlauf && !S.lfVerlauf.some(s => s.id === schein.id)) S.lfVerlauf.push(schein);
    toast(`✓ Lieferung gebucht: ${gebucht.length} ${gebucht.length === 1 ? "Position" : "Positionen"}, ${nameOf(schein.von_id)} → ${nameOf(schein.nach_id)}`);
  } catch (e) {
    S.fehler = "Buchen fehlgeschlagen: " + e.message + " – bitte prüfen, ob alles angekommen ist.";
  } finally {
    S.busy = false; zeichne();
  }
}

function zeilenName(z) { return z.artId ? artikelName(z.artId) : (z.freitext || "—"); }
function artikelName(id) { return S.artikel.find(a => a.id === id)?.name || "—"; }

// ── Schein speichern (eine Route) ──
async function scheinSpeichern() {
  const datum = kommendeTermine().includes(S.datum) ? S.datum : naechsterTermin();
  if (!datum) { S.fehler = "Kein Liefertag gesetzt."; zeichne(); return; }
  if (S.von === S.nach) { S.fehler = "Quell- und Ziel-Standort müssen verschieden sein."; zeichne(); return; }
  const zeilen = S.entwurf.filter(z => z.artId || z.freitext.trim());
  if (!zeilen.length) return;
  if (zeilen.some(z => !(mengeZahl(z.menge) > 0))) { S.fehler = "Bitte bei jeder Position eine Menge über 0 eintragen."; zeichne(); return; }
  S.busy = true; zeichne();
  try {
    const id = uid();
    const { error } = await sb.from("transfers").insert({
      id, von_id: S.von, nach_id: S.nach, datum: new Date().toISOString(),
      benutzer: S.name, status: "geplant", liefer_datum: datum
    });
    if (error) throw new Error(error.message);
    const rows = zeilen.map(z => ({
      id: uid(), transfer_id: id, artikel_id: z.artId || null,
      freitext: z.artId ? "" : z.freitext.trim(), einheit: z.einheit || "",
      menge: mengeZahl(z.menge), abgehakt: false
    }));
    const { error: iErr } = await sb.from("transfer_items").insert(rows);
    if (iErr) throw new Error(iErr.message);
    S.scheine.unshift({ id, von_id: S.von, nach_id: S.nach, benutzer: S.name, status: "geplant", liefer_datum: datum, datum: new Date().toISOString(), items: rows.map(zeileAusDb) });
    S.entwurf = [];
    toast(`Lieferschein gespeichert · ${datumLang(datum)}`);
  } catch (e) {
    S.fehler = "Speichern fehlgeschlagen: " + e.message;
  } finally { S.busy = false; zeichne(); }
}

async function scheinLoeschen(schein) {
  if (!await frage("Lieferschein löschen?", `<p>${esc(nameOf(schein.von_id))} → ${esc(nameOf(schein.nach_id))}, ${esc(datumLang(schein.liefer_datum))}</p><p>Noch nichts wurde gebucht.</p>`, "Löschen")) return;
  const { error } = await sb.from("transfers").delete().eq("id", schein.id);
  if (error) { S.fehler = error.message; zeichne(); return; }
  S.scheine = S.scheine.filter(s => s.id !== schein.id);
  zeichne();
}

async function haken(schein, z, an) {
  z.abgehakt = an;
  zeichne();
  const { error } = await sb.from("transfer_items").update({ abgehakt: an }).eq("id", z.id);
  if (error) { z.abgehakt = !an; S.fehler = error.message; zeichne(); }
}

// ── Einkauf ──
// Liste gilt bis zum Liefertag; danach nur noch über die Datumsauswahl als Verlauf sichtbar.
function ekTag() { return S.ekDatum || naechsterTermin(); }
const ekVergangen = () => !!S.ekDatum && S.ekDatum < heute();
function ekPos(artId) {
  return S.einkaufPos.find(p => p.standort_id === S.ekStandort && p.liefer_datum === ekTag() && p.einkauf_artikel_id === artId);
}
async function ekSetzen(art, menge) {
  const termin = ekTag();
  if (!termin) { S.fehler = "Kein Liefertag gesetzt."; zeichne(); return; }
  if (ekVergangen()) return;
  const alt = ekPos(art.id);
  const m = String(menge ?? "").trim();
  if (!m) {
    if (!alt) return;
    S.einkaufPos = S.einkaufPos.filter(p => p.id !== alt.id);
    zeichne();
    const { error } = await sb.from("einkauf_positionen").delete().eq("id", alt.id);
    if (error) { S.einkaufPos.push(alt); S.fehler = error.message; zeichne(); }
    return;
  }
  if (alt) {
    alt.menge = m; zeichne();
    const { error } = await sb.from("einkauf_positionen").update({ menge: m }).eq("id", alt.id);
    if (error) { S.fehler = error.message; zeichne(); }
    return;
  }
  const neu = { id: uid(), standort_id: S.ekStandort, liefer_datum: termin, einkauf_artikel_id: art.id, freitext: "", menge: m, status: "offen", benutzer: S.name };
  S.einkaufPos.push(neu); zeichne();
  const { error } = await sb.from("einkauf_positionen").insert(neu);
  if (error) { S.einkaufPos = S.einkaufPos.filter(p => p.id !== neu.id); S.fehler = error.message; zeichne(); }
}
async function ekGekauft(p, an) {
  if (!p || ekVergangen()) return;
  p.status = an ? "gekauft" : "offen"; zeichne();
  const { error } = await sb.from("einkauf_positionen").update({ status: p.status, benutzer: S.name }).eq("id", p.id);
  if (error) { p.status = an ? "offen" : "gekauft"; S.fehler = error.message; zeichne(); }
}
async function ekFrei(text, menge) {
  const termin = ekTag();
  const t = text.trim();
  if (!termin || !t || ekVergangen()) return;
  const neu = { id: uid(), standort_id: S.ekStandort, liefer_datum: termin, einkauf_artikel_id: null, freitext: t, menge: String(menge || "").trim(), status: "offen", benutzer: S.name };
  S.einkaufPos.push(neu);
  const { error } = await sb.from("einkauf_positionen").insert(neu);
  if (error) { S.einkaufPos = S.einkaufPos.filter(p => p.id !== neu.id); S.fehler = error.message; }
  zeichne();
}
// Datumsauswahl: kommende Liefertage + vergangene Tage mit Einträgen (Verlauf wird erst beim Öffnen geladen)
async function ekWahlOeffnen() {
  S.ekWahl = true; zeichne();
  if (S.ekVerlauf || S.ekVerlaufLaedt) return;
  S.ekVerlaufLaedt = true; zeichne();
  const { data, error } = await sb.from("einkauf_positionen").select("*")
    .lt("liefer_datum", heute()).order("liefer_datum", { ascending: false }).limit(2000);
  S.ekVerlaufLaedt = false;
  if (error) { S.fehler = error.message; }
  else {
    const da = new Set(S.einkaufPos.map(p => p.id));
    S.einkaufPos.push(...(data || []).filter(p => !da.has(p.id)));
    S.ekVerlauf = true;
  }
  zeichne();
}
function ekTagWaehlen(d) { S.ekDatum = d === naechsterTermin() ? "" : d; S.ekWahl = false; S.ekSuche = ""; zeichne(); }

// ── Admin: Liefertage ──
async function terminSetzen(datum, an) {
  if (an) {
    S.termine.push({ datum, notiz: "" }); zeichne();
    const { error } = await sb.from("liefertermine").upsert({ datum }, { onConflict: "datum" });
    if (error) { S.termine = S.termine.filter(t => t.datum !== datum); S.fehler = error.message; zeichne(); }
  } else {
    S.termine = S.termine.filter(t => t.datum !== datum); zeichne();
    const { error } = await sb.from("liefertermine").delete().eq("datum", datum);
    if (error) { S.termine.push({ datum, notiz: "" }); S.fehler = error.message; zeichne(); }
  }
  if (!kommendeTermine().includes(S.datum)) { S.datum = naechsterTermin(); zeichne(); }
}

// ── Dialoge ──
function frage(titel, html, okText) {
  return new Promise(res => {
    const ov = document.createElement("div");
    ov.className = "fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4";
    ov.innerHTML = `<div class="w-full max-w-sm bg-white rounded-3xl shadow-floating p-5">
      <h3 class="text-base font-extrabold text-slate-900">${esc(titel)}</h3>
      <div class="mt-2 text-sm text-slate-600 leading-relaxed">${html}</div>
      <div class="mt-4 flex gap-2">
        <button type="button" id="qNo" class="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm active:scale-[0.98]">Abbrechen</button>
        <button type="button" id="qYes" class="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:scale-[0.98]">${esc(okText || "OK")}</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const fertig = v => { ov.remove(); res(v); };
    ov.querySelector("#qNo").onclick = () => fertig(false);
    ov.querySelector("#qYes").onclick = () => fertig(true);
  });
}
function toast(text) {
  const alt = $("toastMsg"); if (alt) alt.remove();
  const t = document.createElement("div");
  t.id = "toastMsg";
  t.className = "fixed bottom-24 left-1/2 z-[400] -translate-x-1/2 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-floating whitespace-nowrap";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const IC = {
  next: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>`,
  back: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>`,
  home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>`,
  check: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`,
  x: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>`,
  arrow: `<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>`,
  plus: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`,
  truck: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3.75 16.5V6.75A1.5 1.5 0 0 1 5.25 5.25h9a1.5 1.5 0 0 1 1.5 1.5V16.5m0-6.75h2.55a1.5 1.5 0 0 1 1.27.7l1.6 2.55a1.5 1.5 0 0 1 .23.8v3.2M3.75 16.5h12.75"/></svg>`,
  bag: `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"/></svg>`
};

// ── Render ──
function zeichne() {
  const app = $("app");
  const katTop = $("ekKatalog")?.scrollTop || 0;
  const termin = naechsterTermin();
  const fehler = S.fehler ? `<div class="mx-4 mt-3 px-3.5 py-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">${esc(S.fehler)}</div>` : "";
  if (S.screen === "einkauf") app.innerHTML = einkaufHtml(ekTag(), fehler);
  else if (S.screen === "lieferung") app.innerHTML = lieferungHtml(termin, fehler);
  else if (S.screen === "admin" && S.admin) app.innerHTML = adminHtml(termin, fehler);
  else app.innerHTML = homeHtml(termin);
  const kat = $("ekKatalog"); if (kat) kat.scrollTop = katTop;
}
function screen(name) { if (name === "einkauf") { S.ekDatum = ""; S.ekWahl = false; } if (name === "lieferung") { S.lfDatum = ""; S.lfWahl = false; } S.screen = name; S.fehler = ""; S.suche = ""; S.sucheOffen = false; zeichne(); }

function kopf(titel, unter, rechtsHtml) {
  return `<header class="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-4 pt-4 pb-3" style="padding-top: calc(1rem + env(safe-area-inset-top, 0px));">
    <div class="flex items-center gap-2">
      <button type="button" onclick="screen('home')" aria-label="Home" class="w-9 h-9 -ml-1 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center active:scale-90 transition-all">${IC.back}</button>
      <div class="min-w-0 flex-1">
        <h1 class="text-base font-extrabold tracking-tight text-slate-900 leading-tight truncate">${titel}</h1>
        ${unter ? `<p class="text-[11px] font-medium text-slate-400 truncate">${unter}</p>` : ""}
      </div>
      ${rechtsHtml || ""}
    </div>`;
}
function datumBadge(termin) {
  return termin
    ? `<span class="shrink-0 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">${esc(datumLang(termin))}</span>`
    : `<span class="shrink-0 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">Kein Liefertag</span>`;
}

function homeHtml(termin) {
  return `
    <header class="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-5 pt-5 pb-4" style="padding-top: calc(1.25rem + env(safe-area-inset-top, 0px));">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">OMOI GROUP</p>
          <h1 class="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">Store</h1>
        </div>
        <button type="button" onclick="nameAendern()" class="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full active:scale-95 transition-all">${esc(S.name || "—")}${S.admin ? " · Admin" : ""}</button>
      </div>
      <div class="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl ${termin ? "bg-blue-50 border border-blue-100" : "bg-amber-50 border border-amber-100"}">
        <span class="w-2 h-2 rounded-full ${termin ? "bg-blue-500" : "bg-amber-500"}"></span>
        <span class="text-sm font-bold ${termin ? "text-blue-800" : "text-amber-800"}">${termin ? "Nächste Lieferung: " + esc(datumLang(termin)) : "Kein Liefertag gesetzt"}</span>
      </div>
    </header>
    <main class="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-3 no-scrollbar">
      <p class="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Funktion wählen</p>
      <button type="button" onclick="screen('einkauf')" class="w-full text-left bg-white border border-slate-200/80 rounded-3xl shadow-soft p-4 flex items-center gap-4 active:scale-[0.99] transition-all">
        <span class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">${IC.bag}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-base font-extrabold text-slate-900">Einkauf</span>
          <span class="block text-xs font-medium text-slate-400 mt-0.5">Einkaufsliste pro Standort – ohne Lagerbuchung</span>
        </span>
        <span class="text-slate-300 shrink-0">${IC.next}</span>
      </button>
      <button type="button" onclick="screen('lieferung')" class="w-full text-left bg-white border border-slate-200/80 rounded-3xl shadow-soft p-4 flex items-center gap-4 active:scale-[0.99] transition-all">
        <span class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">${IC.truck}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-base font-extrabold text-slate-900">Lieferung</span>
          <span class="block text-xs font-medium text-slate-400 mt-0.5">Ware zwischen Standorten umbuchen – mit Lagerbuchung</span>
        </span>
        <span class="text-slate-300 shrink-0">${IC.next}</span>
      </button>
      ${S.admin ? `<button type="button" onclick="screen('admin')" class="w-full text-left bg-white border border-slate-200/80 rounded-3xl shadow-soft p-4 flex items-center gap-4 active:scale-[0.99] transition-all">
        <span class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 text-xl">📅</span>
        <span class="min-w-0 flex-1">
          <span class="block text-base font-extrabold text-slate-900">Liefertage</span>
          <span class="block text-xs font-medium text-slate-400 mt-0.5">Admin – Liefertage festlegen</span>
        </span>
      </button>` : ""}
      <p class="px-1 pt-2 text-center text-[10px] font-semibold tracking-widest text-slate-300">OMOI · ORIGAMI · ENSO · OKYU</p>
    </main>`;
}

function nameMaske() {
  $("app").innerHTML = `
    <div class="flex-1 flex flex-col justify-center px-6">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">OMOI GROUP</p>
      <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">Dein Name</h1>
      <p class="text-sm text-slate-400 mt-1">Wird bei jeder Buchung gespeichert.</p>
      <input id="nm" type="text" autocomplete="name" placeholder="z. B. Linh"
        class="mt-5 w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
      <button type="button" onclick="nameOk()" class="mt-3 w-full py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold active:scale-[0.98] transition-all">Weiter</button>
    </div>`;
  $("nm").focus();
  $("nm").onkeydown = e => { if (e.key === "Enter") nameOk(); };
}
function nameOk() {
  const v = $("nm").value.trim();
  if (!v) return;
  if (v === ADMIN_PIN) { adminAn(); return; }
  S.name = v; try { localStorage.setItem(NAME_KEY, v); } catch {}
  zeichne();
}
// "1234" → direkt in den Admin-Modus (Liefertage). Ohne Namen wird "Admin" gespeichert.
function adminAn() {
  S.admin = true; try { localStorage.setItem(ADMIN_KEY, "1"); } catch {}
  if (!S.name) { S.name = "Admin"; try { localStorage.setItem(NAME_KEY, S.name); } catch {} }
  screen("admin");
}
function adminAus() {
  S.admin = false; try { localStorage.setItem(ADMIN_KEY, ""); } catch {}
  screen("home");
}
function nameAendern() {
  const v = prompt("Dein Name", S.name);
  if (v == null) return;
  const t = v.trim();
  if (t === ADMIN_PIN) { adminAn(); return; }
  if (!t) return;
  S.name = t; try { localStorage.setItem(NAME_KEY, t); } catch {}
  zeichne();
}

function adminHtml(termin, fehler) {
  const start = new Date(); start.setHours(12, 0, 0, 0);
  const tage = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    tage.push({ iso, label: d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }), an: S.termine.some(t => t.datum === iso) });
  }
  return `
    ${kopf("Liefertage", "Admin · Liefertage antippen", datumBadge(termin))}
    </header>
    ${fehler}
    <main class="flex-1 overflow-y-auto px-4 pt-3 pb-10 no-scrollbar">
      <div class="bg-white border border-slate-200/80 rounded-2xl shadow-soft divide-y divide-slate-100 overflow-hidden">
        ${tage.map(t => `<button type="button" onclick="terminSetzen('${t.iso}',${!t.an})" class="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
          <span class="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center ${t.an ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-transparent"}">${IC.check}</span>
          <span class="flex-1 text-sm font-bold ${t.an ? "text-slate-900" : "text-slate-500"}">${esc(t.label)}</span>
          ${t.iso === termin ? `<span class="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">nächste</span>` : ""}
        </button>`).join("")}
      </div>
      <button type="button" onclick="adminAus()" class="mt-4 w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold active:scale-[0.98] transition-all">Admin-Modus beenden</button>
    </main>`;
}

// ── Lieferung: ein Schein = eine Route ──
// Hauptansicht: nur kommende Liefertage. Vergangene Tage über die Datumsauswahl (Verlauf).
function lieferungHtml(termin, fehler) {
  if (S.lfDatum) return lfVerlaufHtml(termin, fehler);
  const tage = kommendeTermine();
  const t = heute();
  const gruppen = {};
  S.scheine.filter(s => s.liefer_datum >= t).forEach(s => { (gruppen[s.liefer_datum] = gruppen[s.liefer_datum] || []).push(s); });
  const daten = Object.keys(gruppen).sort();
  const altOffen = S.scheine.filter(s => s.liefer_datum < t).length;
  return `
    ${kopf("Lieferung", "Ein Lieferschein pro Route", lfDatumKnopf(termin))}
    </header>
    ${fehler}
    <main class="flex-1 overflow-y-auto px-4 pt-3 pb-10 space-y-3 no-scrollbar">
      ${altOffen ? `<button type="button" onclick="lfWahlOeffnen()" class="w-full text-left px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold">
        ${altOffen} ${altOffen === 1 ? "Lieferschein" : "Lieferscheine"} aus vergangenen Tagen noch nicht abgeschlossen – antippen zum Ansehen</button>` : ""}
      ${neuScheinHtml(tage)}
      ${daten.length ? daten.map(d => `
        <h2 class="px-1 pt-2 text-[11px] font-bold uppercase tracking-wider ${d === termin ? "text-blue-600" : "text-slate-400"}">${esc(datumLang(d))}${d === termin ? " · nächste" : ""} · ${gruppen[d].length}</h2>
        ${nachRoute(gruppen[d]).map(scheinHtml).join("")}`).join("")
        : `<div class="px-1 py-6 text-center text-xs font-medium text-slate-300 italic">Noch keine Lieferung geplant</div>`}
    </main>
    ${S.lfWahl ? lfWahlHtml() : ""}`;
}

function lfVerlaufHtml(termin, fehler) {
  const d = S.lfDatum;
  const offen = S.scheine.filter(s => s.liefer_datum === d);
  const fertig = (S.lfVerlauf || []).filter(s => s.liefer_datum === d && s.status !== "geplant" && !offen.some(o => o.id === s.id));
  return `
    ${kopf("Lieferung", "Verlauf", lfDatumKnopf(termin))}
    </header>
    ${fehler}
    <main class="flex-1 overflow-y-auto px-4 pt-3 pb-10 space-y-3 no-scrollbar">
      <div class="px-3.5 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-between gap-2">
        <span>Verlauf · ${esc(datumLang(d))}</span>
        <button type="button" onclick="lfTagWaehlen('')" class="shrink-0 text-blue-600 font-bold">Zu kommenden Lieferungen</button>
      </div>
      ${nachRoute(offen).map(scheinHtml).join("")}
      ${nachRoute(fertig).map(scheinFertigHtml).join("")}
      ${!offen.length && !fertig.length ? `<p class="py-10 text-center text-xs font-medium text-slate-400">Keine Lieferscheine an diesem Tag</p>` : ""}
    </main>
    ${S.lfWahl ? lfWahlHtml() : ""}`;
}
function scheinFertigHtml(s) {
  return `<div class="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-hidden">
    <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
      <div class="min-w-0">
        <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">${esc(nameOf(s.von_id))} <span class="text-slate-300">${IC.arrow}</span> ${esc(nameOf(s.nach_id))}</h3>
        <p class="text-[11px] font-medium text-slate-400 mt-0.5">${s.items.length} ${s.items.length === 1 ? "Position" : "Positionen"}${s.empfangen_von ? " · abgeschlossen von " + esc(s.empfangen_von) : ""}</p>
      </div>
      <span class="shrink-0 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">gebucht</span>
    </div>
    <div class="divide-y divide-slate-100">
      ${s.items.map(z => `<div class="flex items-baseline gap-1.5 px-4 py-2.5">
        <span class="font-mono font-bold text-xs text-slate-500 shrink-0">${esc(z.menge)} ${esc(z.artId ? (S.artikel.find(a => a.id === z.artId)?.einheit || "") : (z.einheit || ""))}</span>
        <span class="font-bold text-sm text-slate-900 truncate">${esc(zeilenName(z))}</span>
        ${z.artId ? "" : `<span class="text-[11px] font-medium text-slate-400 shrink-0">· Freitext</span>`}
      </div>`).join("")}
    </div>
  </div>`;
}
function lfDatumKnopf(termin) {
  const alt = !!S.lfDatum;
  return `<button type="button" onclick="lfWahlOeffnen()" aria-label="Liefertag wählen"
    class="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border active:scale-95 transition-all ${alt ? "text-slate-600 bg-slate-100 border-slate-200" : termin ? "text-blue-700 bg-blue-50 border-blue-100" : "text-amber-700 bg-amber-50 border-amber-100"}">
    ${alt ? esc(datumLang(S.lfDatum)) : termin ? esc(datumLang(termin)) : "Kein Liefertag"}
    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
  </button>`;
}
// Verlauf (abgeschlossene + alte Scheine) erst beim Öffnen laden
async function lfWahlOeffnen() {
  S.lfWahl = true; zeichne();
  if (S.lfVerlauf || S.lfVerlaufLaedt) return;
  S.lfVerlaufLaedt = true; zeichne();
  try {
    const { data: tf, error } = await sb.from("transfers").select("*")
      .lte("liefer_datum", heute()).order("liefer_datum", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const ids = (tf || []).map(t => t.id);
    const ti = ids.length ? await alle(() => sb.from("transfer_items").select("*").in("transfer_id", ids).order("id")) : { data: [], error: null };
    if (ti.error) throw new Error(ti.error.message);
    const byTf = {};
    (ti.data || []).forEach(i => { (byTf[i.transfer_id] = byTf[i.transfer_id] || []).push(zeileAusDb(i)); });
    S.lfVerlauf = (tf || []).filter(t => t.liefer_datum).map(t => ({ ...t, items: byTf[t.id] || [] }));
  } catch (e) { S.fehler = e.message; }
  S.lfVerlaufLaedt = false; zeichne();
}
function lfTagWaehlen(d) { S.lfDatum = d; S.lfWahl = false; zeichne(); }
function lfWahlHtml() {
  const t = heute();
  const tage = {};
  const add = (s, offen) => { const e = (tage[s.liefer_datum] = tage[s.liefer_datum] || { n: 0, offen: 0 }); e.n++; if (offen) e.offen++; };
  S.scheine.filter(s => s.liefer_datum < t).forEach(s => add(s, true));
  (S.lfVerlauf || []).filter(s => s.status !== "geplant").forEach(s => add(s, false));
  const vergangen = Object.keys(tage).sort().reverse();
  const naechst = naechsterTermin();
  const zeile = (d, rechts, onclick, aktiv) => `<button type="button" onclick="${onclick}"
    class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${aktiv ? "bg-blue-50" : "active:bg-slate-50"}">
    <span class="text-sm font-bold text-slate-900">${d}</span>
    <span class="text-[11px] font-semibold text-slate-400">${rechts}</span>
  </button>`;
  return `<div class="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onclick="if(event.target===this){S.lfWahl=false;zeichne()}">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-floating overflow-hidden max-h-[80vh] flex flex-col">
      <div class="px-5 pt-5 pb-2"><h3 class="text-base font-extrabold text-slate-900">Liefertag wählen</h3></div>
      <div class="overflow-y-auto no-scrollbar pb-3">
        <div class="divide-y divide-slate-100">${zeile(naechst ? "Kommende Lieferungen" : "Kommende Lieferungen", naechst ? "ab " + esc(datumLang(naechst)) : "", "lfTagWaehlen('')", !S.lfDatum)}</div>
        <p class="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Verlauf</p>
        <div class="divide-y divide-slate-100">${S.lfVerlaufLaedt ? `<p class="px-5 py-2 text-xs text-slate-400">Wird geladen …</p>`
          : vergangen.map(d => zeile(esc(datumLang(d)) + (d === t ? ` <span class="ml-1 text-[10px] font-bold uppercase text-blue-600">heute</span>` : ""),
              `${tage[d].n} ${tage[d].n === 1 ? "Schein" : "Scheine"}${tage[d].offen ? ` · <span class="text-amber-600">${tage[d].offen} offen</span>` : ""}`,
              `lfTagWaehlen('${esc(d)}')`, d === S.lfDatum)).join("") || `<p class="px-5 py-2 text-xs text-slate-400">Noch kein Verlauf</p>`}</div>
      </div>
    </div>
  </div>`;
}

// Scheine eines Tages nach Route sortieren (Quelle, dann Ziel, Reihenfolge wie STORE_IDS)
function nachRoute(liste) {
  const pos = id => { const i = STORE_IDS.indexOf(id); return i < 0 ? 99 : i; };
  return [...liste].sort((a, b) => pos(a.von_id) - pos(b.von_id) || pos(a.nach_id) - pos(b.nach_id) || String(a.datum).localeCompare(String(b.datum)));
}

function neuScheinHtml(tage) {
  const ziele = S.standorte.filter(s => s.id !== S.von);
  const pill = (an, farbe) => `flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${an ? `bg-${farbe}-600 text-white border-${farbe}-600` : "bg-white text-slate-500 border-slate-200"}`;
  return `<div class="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-hidden">
    <div class="px-4 py-3 border-b border-slate-100">
      <h2 class="text-sm font-extrabold tracking-tight text-slate-900">Neuer Lieferschein</h2>
      <p class="text-[11px] font-medium text-slate-400 mt-0.5">Eine Route, ein Liefertag</p>
    </div>
    <div class="px-3 py-3 space-y-2">
      <div>
        <p class="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Von</p>
        <div class="flex gap-1.5">
          ${S.standorte.map(s => `<button type="button" onclick="routeVon('${esc(s.id)}')" class="${pill(s.id === S.von, "slate")}">${esc(s.name)}</button>`).join("")}
        </div>
      </div>
      <div>
        <p class="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Nach</p>
        <div class="flex gap-1.5">
          ${ziele.map(s => `<button type="button" onclick="S.nach='${esc(s.id)}';zeichne()" class="${pill(s.id === S.nach, "blue")}">${esc(s.name)}</button>`).join("")}
        </div>
      </div>
      <p class="px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Liefertag</p>
      ${tage.length ? `<div class="flex gap-1.5 overflow-x-auto no-scrollbar">
        ${tage.map(d => `<button type="button" onclick="S.datum='${d}';zeichne()"
          class="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${d === S.datum ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}">${esc(datumLang(d))}</button>`).join("")}
      </div>` : `<div class="text-[11px] font-semibold text-amber-600 px-1">Kein Liefertag gesetzt – bitte zuerst im Admin-Modus festlegen.</div>`}
      ${tage.length ? `
      <div class="relative">
        <input type="text" id="suche" placeholder="Artikel suchen" value="${esc(S.suche)}" autocomplete="off"
          onfocus="S.sucheOffen=true;trefferZeigen()"
          onblur="setTimeout(()=>{S.sucheOffen=false;trefferZeigen();},200)"
          oninput="S.sucheOffen=true;S.suche=this.value;trefferZeigen()"
          class="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
        <div id="treffer">${trefferHtml()}</div>
      </div>
      <div class="flex gap-2">
        <input type="text" id="frei" placeholder="Freitext (ohne Lagerbuchung)"
          class="flex-1 min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
        <button type="button" onclick="zeileFrei()"
          class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold active:scale-[0.97] transition-all shrink-0">+ Freitext</button>
      </div>
      ${S.entwurf.length ? `<p class="px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Artikel · Menge</p>` : ""}
      ${S.entwurf.map((z, i) => entwurfZeileHtml(z, i)).join("")}
      ${S.entwurf.length ? `<button type="button" ${S.busy || S.von === S.nach ? "disabled" : ""} onclick="scheinSpeichern()"
        class="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:bg-slate-300">Für ${esc(datumLang(S.datum))} planen · ${S.entwurf.length} ${S.entwurf.length === 1 ? "Position" : "Positionen"}</button>` : ""}` : ""}
    </div>
  </div>`;
}

function entwurfZeileHtml(z, i) {
  const einheit = z.artId ? (S.artikel.find(a => a.id === z.artId)?.einheit || "") : (z.einheit || "");
  const info = z.artId ? `${esc(einheit)}${einheit ? " · " : ""}${bestandVon(z.artId, S.von)} im Lager` : "Freitext · ohne Lagerbuchung";
  return `<div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl">
    <div class="min-w-0 flex-1">
      <div class="text-xs font-bold text-slate-900 truncate">${esc(z.artId ? artikelName(z.artId) : z.freitext)}</div>
      <div class="text-[10px] font-medium text-slate-400 truncate">${info}</div>
    </div>
    <div class="flex items-center bg-white border border-slate-200 rounded-xl shrink-0">
      <button type="button" onclick="entwurfSchritt(${i},-1)" aria-label="weniger" class="w-8 h-8 text-slate-500 font-bold active:scale-90">−</button>
      <input type="text" inputmode="decimal" value="${esc(z.menge)}" aria-label="Menge" onchange="entwurfMenge(${i},this.value)"
        class="qty-input w-10 text-center font-mono font-bold text-sm text-slate-800 bg-transparent p-0"/>
      <button type="button" onclick="entwurfSchritt(${i},1)" aria-label="mehr" class="w-8 h-8 text-blue-600 font-bold active:scale-90">+</button>
    </div>
    <button type="button" onclick="S.entwurf.splice(${i},1);zeichne()" aria-label="Entfernen" class="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all shrink-0">${IC.x}</button>
  </div>`;
}
const mengeZahl = v => num(String(v ?? "").trim().replace(",", "."));
function entwurfMenge(i, v) { if (S.entwurf[i]) { S.entwurf[i].menge = Math.max(0, mengeZahl(v)); zeichne(); } }
function entwurfSchritt(i, d) { const z = S.entwurf[i]; if (!z) return; z.menge = Math.max(0, mengeZahl(z.menge) + d); zeichne(); }

function scheinHtml(s) {
  const erledigt = s.items.filter(z => z.abgehakt).length;
  return `<div class="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <div class="min-w-0">
        <h3 class="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">${esc(nameOf(s.von_id))} <span class="text-slate-300">${IC.arrow}</span> ${esc(nameOf(s.nach_id))}</h3>
        <p class="text-[11px] font-medium text-slate-400 mt-0.5">${s.items.length} ${s.items.length === 1 ? "Position" : "Positionen"} · ${erledigt} abgehakt${s.benutzer ? " · " + esc(s.benutzer) : ""}</p>
      </div>
      <button type="button" onclick="scheinLoeschen(scheinById('${esc(s.id)}'))" aria-label="Lieferschein löschen" class="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all shrink-0">${IC.x}</button>
    </div>
    <div class="divide-y divide-slate-100">
      ${s.items.map(z => `<div class="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onclick="haken(scheinById('${esc(s.id)}'),zeileById('${esc(s.id)}','${esc(z.id)}'),${!z.abgehakt})" aria-label="erledigt"
          class="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center transition-all ${z.abgehakt ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-transparent"}">${IC.check}</button>
        <div class="min-w-0 flex-1 ${z.abgehakt ? "line-through opacity-40" : ""}">
          <div class="flex items-baseline gap-1.5">
            <span class="font-mono font-bold text-xs text-slate-500 shrink-0">${esc(z.menge)} ${esc(z.artId ? (S.artikel.find(a => a.id === z.artId)?.einheit || "") : (z.einheit || ""))}</span>
            <span class="font-bold text-sm text-slate-900 truncate">${esc(zeilenName(z))}</span>
          </div>
          ${z.artId ? "" : `<div class="text-[11px] font-medium text-slate-400">Freitext · ohne Lagerbuchung</div>`}
        </div>
      </div>`).join("")}
    </div>
    <div class="px-3 py-3 border-t border-slate-100">
      <button type="button" ${S.busy || !erledigt ? "disabled" : ""} onclick="abschliessen(scheinById('${esc(s.id)}'))"
        class="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:bg-slate-300 flex items-center justify-center gap-1.5">${IC.check} Lieferung abgeschlossen</button>
    </div>
  </div>`;
}

function routeVon(id) {
  S.von = id;
  if (S.nach === id || !S.nach) S.nach = S.standorte.find(s => s.id !== id)?.id || "";
  zeichne();
}
function scheinById(id) { return S.scheine.find(s => s.id === id); }
function zeileById(sid, zid) { return scheinById(sid)?.items.find(z => z.id === zid); }

function zeileArtikel(artId) {
  const a = S.artikel.find(x => x.id === artId);
  if (!S.entwurf.some(z => z.artId === artId)) S.entwurf.push({ artId, freitext: "", einheit: a?.einheit || "", menge: 1 });
  S.suche = ""; S.sucheOffen = false;
  zeichne();
}
function zeileFrei() {
  const t = ($("frei")?.value || "").trim();
  if (!t) return;
  S.entwurf.push({ artId: "", freitext: t, einheit: "", menge: 1 });
  zeichne();
}
// Nur die Trefferliste neu zeichnen — das Eingabefeld bleibt, damit Fokus und Tastatur erhalten bleiben
function trefferHtml() {
  const q = S.sucheOffen ? S.suche.trim().toLowerCase() : "";
  if (!q) return "";
  const treffer = S.artikel.filter(a => a.name.toLowerCase().includes(q) || (a.name_vi || "").toLowerCase().includes(q)).slice(0, 8);
  if (!treffer.length) return `<div class="absolute left-0 right-0 bottom-full mb-1 z-20 bg-white border border-slate-200 rounded-xl shadow-floating px-3 py-2 text-xs font-medium text-slate-400">Kein Artikel gefunden – Freitext verwenden</div>`;
  return `<div class="absolute left-0 right-0 bottom-full mb-1 z-20 bg-white border border-slate-200 rounded-xl shadow-floating overflow-hidden max-h-60 overflow-y-auto">
    ${treffer.map(a => `<button type="button" onmousedown="event.preventDefault()" onclick="zeileArtikel('${esc(a.id)}')" class="w-full flex items-center gap-2 px-3 py-2 text-left border-b border-slate-100 last:border-0 active:bg-slate-50">
      <span class="flex-1 min-w-0 text-xs font-bold text-slate-900 truncate">${esc(a.name)}</span>
      <span class="text-[10px] font-medium text-slate-400 shrink-0">${esc(a.einheit || "")} · ${bestandVon(a.id, S.von)} im Lager</span>
    </button>`).join("")}
  </div>`;
}
function trefferZeigen() { const el = $("treffer"); if (el) el.innerHTML = trefferHtml(); }

// ── Einkauf: Checkliste, ein Tipp = gekauft ──
const ekTreffer = (text, q) => !q || String(text || "").toLowerCase().includes(q);
// Katalog ohne die Artikel, die schon auf der Liste stehen (die stehen oben)
function ekGruppen() {
  const q = S.ekSuche.trim().toLowerCase();
  const liste = EINKAUF.filter(a => !ekPos(a.id) && (ekTreffer(a.name, q) || ekTreffer(a.wo, q)));
  return [
    { titel: "Supermarkt", items: liste.filter(a => !a.wo) },
    { titel: "Asia-Markt", items: liste.filter(a => a.wo) }
  ].filter(g => g.items.length);
}
function einkaufHtml(termin, fehler) {
  const pos = S.einkaufPos.filter(p => p.standort_id === S.ekStandort && p.liefer_datum === termin);
  const gekauft = pos.filter(p => p.status === "gekauft").length;
  const alt = ekVergangen();
  const gruppen = alt ? [] : ekGruppen();
  // Oben: alles, was gekauft werden soll — offene zuerst, gekaufte danach, sonst Katalog-Reihenfolge
  const q = S.ekSuche.trim().toLowerCase();
  const sortOf = p => EINKAUF.find(a => a.id === p.einkauf_artikel_id)?.sort ?? 9999;
  const oben = pos
    .filter(p => ekTreffer(p.einkauf_artikel_id ? ekArt(p.einkauf_artikel_id)?.name : p.freitext, q))
    .sort((a, b) => (a.status === "gekauft") - (b.status === "gekauft") || sortOf(a) - sortOf(b));
  return `
    ${kopf("Einkauf", "Einkaufsliste · ohne Lagerbuchung", ekDatumKnopf(termin))}
      <div class="mt-3 flex gap-1.5">
        ${S.standorte.map(s => `<button type="button" onclick="S.ekStandort='${esc(s.id)}';zeichne()"
          class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${s.id === S.ekStandort ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200"}">${esc(s.name)}</button>`).join("")}
      </div>
    </header>
    ${fehler}
    <main class="flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-3 no-scrollbar">
      ${!termin ? `<div class="px-3.5 py-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">Kein Liefertag gesetzt – Einkauf gesperrt.</div>` : alt ? `
      <div class="px-3.5 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-between gap-2">
        <span>Verlauf · ${esc(datumLang(termin))} – nur Ansicht</span>
        <button type="button" onclick="ekTagWaehlen('${esc(naechsterTermin())}')" class="shrink-0 text-blue-600 font-bold">Zur aktuellen Liste</button>
      </div>
      ${oben.length ? `<div class="bg-white border border-slate-200/80 rounded-2xl shadow-soft divide-y divide-slate-100 overflow-hidden">
        ${oben.map(p => ekVerlaufZeileHtml(p)).join("")}
      </div>` : `<p class="py-10 text-center text-xs font-medium text-slate-400">Keine Einträge für diesen Standort</p>`}` : `
      <input type="text" id="ekSuche" placeholder="Artikel suchen" value="${esc(S.ekSuche)}"
        oninput="S.ekSuche=this.value;zeichne();fokusEk()"
        class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"/>
      ${oben.length ? `<div>
        <h2 class="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Einkaufsliste · ${oben.length}</h2>
        <div class="bg-white border border-emerald-200 rounded-2xl shadow-soft divide-y divide-slate-100 overflow-hidden">
          ${oben.map(p => p.einkauf_artikel_id ? ekZeileHtml(ekArt(p.einkauf_artikel_id), p) : ekFreiZeileHtml(p)).join("")}
        </div>
      </div>` : ""}
      ${gruppen.length ? `<div>
        <h2 class="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Artikel · ${gruppen.reduce((n, g) => n + g.items.length, 0)}</h2>
        <div id="ekKatalog" class="max-h-[48vh] overflow-y-auto overscroll-contain bg-white border border-slate-200/80 rounded-2xl shadow-soft">
          ${gruppen.map(g => `
            <h3 class="sticky top-0 z-10 px-4 py-1.5 bg-slate-50/95 backdrop-blur border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">${esc(g.titel)}</h3>
            <div class="divide-y divide-slate-100">${g.items.map(a => ekZeileHtml(a, ekPos(a.id))).join("")}</div>`).join("")}
        </div>
      </div>` : ""}
      <div class="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
        <h2 class="text-xs font-extrabold text-amber-800">Anderer Artikel</h2>
        <div class="mt-2 flex gap-2">
          <input type="text" id="ekFreiText" placeholder="Artikel"
            class="flex-1 min-w-0 px-2.5 py-2 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
          <input type="text" id="ekFreiMenge" placeholder="Menge" inputmode="decimal"
            class="w-16 px-2.5 py-2 bg-white border border-amber-200 rounded-xl text-xs text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
          <button type="button" onclick="ekFrei($('ekFreiText').value,$('ekFreiMenge').value)"
            class="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold active:scale-[0.97] transition-all shrink-0">Hinzufügen</button>
        </div>
      </div>`}
    </main>
    <aside class="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-5 pt-3.5 pb-6 shadow-floating z-40" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));">
      <div class="flex items-center justify-between">
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-black tracking-tight text-slate-900 leading-none">${gekauft}</span>
          <span class="text-xs font-bold uppercase text-slate-600">/ ${pos.length} gekauft</span>
        </div>
        <p class="text-[11px] font-medium text-slate-400">Ohne Lagerbuchung</p>
      </div>
    </aside>
    ${S.ekWahl ? ekWahlHtml() : ""}`;
}
function ekDatumKnopf(termin) {
  if (!termin && !S.termine.length) return datumBadge(termin);
  const alt = ekVergangen();
  return `<button type="button" onclick="ekWahlOeffnen()" aria-label="Liefertag wählen"
    class="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border active:scale-95 transition-all ${alt ? "text-slate-600 bg-slate-100 border-slate-200" : termin ? "text-blue-700 bg-blue-50 border-blue-100" : "text-amber-700 bg-amber-50 border-amber-100"}">
    ${termin ? esc(datumLang(termin)) : "Kein Liefertag"}
    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
  </button>`;
}
function ekWahlHtml() {
  const t = heute(), aktiv = ekTag(), naechst = naechsterTermin();
  const zaehl = d => {
    const ps = S.einkaufPos.filter(p => p.standort_id === S.ekStandort && p.liefer_datum === d);
    return { n: ps.length, g: ps.filter(p => p.status === "gekauft").length };
  };
  const vergangen = [...new Set(S.einkaufPos.filter(p => p.liefer_datum < t && p.standort_id === S.ekStandort).map(p => p.liefer_datum))].sort().reverse();
  const zeile = (d, tag) => {
    const { n, g } = zaehl(d);
    return `<button type="button" onclick="ekTagWaehlen('${esc(d)}')"
      class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${d === aktiv ? "bg-blue-50" : "active:bg-slate-50"}">
      <span class="text-sm font-bold text-slate-900">${esc(datumLang(d))}${tag ? ` <span class="ml-1 text-[10px] font-bold uppercase text-blue-600">${tag}</span>` : ""}</span>
      <span class="text-[11px] font-semibold text-slate-400">${n ? `${g} / ${n} gekauft` : "leer"}</span>
    </button>`;
  };
  return `<div class="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onclick="if(event.target===this){S.ekWahl=false;zeichne()}">
    <div class="w-full max-w-sm bg-white rounded-3xl shadow-floating overflow-hidden max-h-[80vh] flex flex-col">
      <div class="px-5 pt-5 pb-2">
        <h3 class="text-base font-extrabold text-slate-900">Liefertag wählen</h3>
        <p class="text-[11px] font-medium text-slate-400">${esc(nameOf(S.ekStandort))}</p>
      </div>
      <div class="overflow-y-auto no-scrollbar pb-3">
        <p class="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kommende Liefertage</p>
        <div class="divide-y divide-slate-100">${kommendeTermine().map(d => zeile(d, d === naechst ? "nächste" : "")).join("") || `<p class="px-5 py-2 text-xs text-slate-400">Kein Liefertag gesetzt</p>`}</div>
        <p class="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Verlauf</p>
        <div class="divide-y divide-slate-100">${S.ekVerlaufLaedt ? `<p class="px-5 py-2 text-xs text-slate-400">Wird geladen …</p>` : vergangen.map(d => zeile(d, "")).join("") || `<p class="px-5 py-2 text-xs text-slate-400">Noch kein Verlauf</p>`}</div>
      </div>
    </div>
  </div>`;
}
function ekVerlaufZeileHtml(p) {
  const an = p.status === "gekauft";
  const name = p.einkauf_artikel_id ? (ekArt(p.einkauf_artikel_id)?.name || p.einkauf_artikel_id) : p.freitext;
  const einheit = p.einkauf_artikel_id ? (ekArt(p.einkauf_artikel_id)?.einheit || "") : "eigener Artikel";
  return `<div class="flex items-center gap-3 px-4 py-2.5">
    <span class="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center ${an ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-transparent"}">${IC.check}</span>
    <div class="min-w-0 flex-1">
      <div class="font-bold text-sm text-slate-900 truncate">${esc(name)}</div>
      <div class="text-[11px] font-medium text-slate-400 truncate">${esc(einheit)}${p.benutzer ? " · " + esc(p.benutzer) : ""}</div>
    </div>
    <span class="font-mono font-bold text-sm text-slate-700 shrink-0">${esc(p.menge || "")}</span>
    <span class="text-[10px] font-bold uppercase shrink-0 ${an ? "text-emerald-600" : "text-amber-600"}">${an ? "gekauft" : "offen"}</span>
  </div>`;
}
function ekZeileHtml(a, p) {
  const an = p?.status === "gekauft";
  const m = p ? p.menge : "";
  return `<div class="flex items-center gap-3 px-4 py-2.5 ${p ? "bg-emerald-50/40" : ""}">
    <button type="button" ${p ? "" : "disabled"} onclick="ekGekauft(posById('${p ? esc(p.id) : ""}'),${!an})" aria-label="gekauft"
      class="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center transition-all disabled:opacity-30 ${an ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-transparent"}">${IC.check}</button>
    <div class="min-w-0 flex-1 ${an ? "line-through opacity-40" : ""}">
      <div class="font-bold text-sm text-slate-900 truncate">${esc(a.name)}</div>
      <div class="text-[11px] font-medium text-slate-400 truncate">${esc(a.einheit)}${a.hinweis ? " · " + esc(a.hinweis) : ""}</div>
    </div>
    <div class="flex items-center bg-slate-50 border border-slate-200 rounded-xl shrink-0">
      <button type="button" onclick="ekSchritt('${esc(a.id)}',-1)" aria-label="weniger" class="w-8 h-8 text-slate-500 font-bold active:scale-90">−</button>
      <input type="text" inputmode="decimal" value="${esc(m)}" placeholder="0" onchange="ekSetzen(ekArt('${esc(a.id)}'),this.value)"
        class="qty-input w-9 text-center font-mono font-bold text-sm text-slate-800 bg-transparent p-0"/>
      <button type="button" onclick="ekSchritt('${esc(a.id)}',1)" aria-label="mehr" class="w-8 h-8 text-emerald-600 font-bold active:scale-90">+</button>
    </div>
  </div>`;
}
function ekArt(id) { return EINKAUF.find(x => x.id === id); }
// −/+ : Menge ist Text (z. B. "2 Kisten"); nur reine Zahlen werden hoch-/runtergezählt.
function ekSchritt(artId, d) {
  const p = ekPos(artId);
  const alt = p ? String(p.menge).replace(",", ".") : "0";
  const n = Number(alt);
  if (!Number.isFinite(n)) return;
  const neu = Math.max(0, n + d);
  ekSetzen(ekArt(artId), neu ? String(neu) : "");
}
function ekFreiZeileHtml(p) {
  const an = p.status === "gekauft";
  return `<div class="flex items-center gap-3 px-4 py-3">
    <button type="button" onclick="ekGekauft(posById('${esc(p.id)}'),${!an})" aria-label="gekauft"
      class="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center ${an ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-transparent"}">${IC.check}</button>
    <span class="min-w-0 flex-1 ${an ? "line-through opacity-40" : ""}">
      <span class="block font-bold text-sm text-slate-900 truncate">${esc(p.freitext)}</span>
      <span class="block text-[11px] font-medium text-slate-400 mt-0.5">${esc(p.menge || "")} · eigener Artikel</span>
    </span>
  </div>`;
}
function fokusEk() { const el = $("ekSuche"); if (el && document.activeElement !== el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} } }
function posById(id) { return S.einkaufPos.find(p => p.id === id); }

async function start() {
  $("app").innerHTML = `<div class="flex-1 flex items-center justify-center text-sm font-semibold text-slate-400">Wird geladen …</div>`;
  try { await lade(); }
  catch (e) {
    const fehlt = /liefertermine|einkauf_positionen|liefer_datum|freitext|abgehakt/i.test(e.message);
    $("app").innerHTML = `<div class="flex-1 flex flex-col justify-center px-6 text-center">
      <p class="text-base font-extrabold text-slate-900">Daten konnten nicht geladen werden</p>
      <p class="mt-2 text-xs text-slate-500">${esc(fehlt ? "Die Tabellen für /store fehlen in der Datenbank – bitte zuerst die Migration ausführen." : e.message)}</p>
      <button type="button" onclick="start()" class="mt-4 mx-auto px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold">Erneut versuchen</button>
    </div>`;
    return;
  }
  S.name = localStorage.getItem(NAME_KEY) || "";
  S.admin = localStorage.getItem(ADMIN_KEY) === "1";
  if (!S.name) nameMaske(); else zeichne();
}
start();
