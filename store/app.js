// ═══ /store — Lieferung + Einkauf ═══
// Spricht Supabase direkt an. Kein Login: Name einmal fragen, auf dem Gerät merken.
// "1234" schaltet den Admin-Modus frei (Liefertage setzen).
//
// Lieferung: transfers mit status "geplant" (berührt den Bestand nicht).
// "Lieferung abgeschlossen": angehakte Positionen → Bestand Quelle minus, Ziel plus,
// Bewegungen umbuchung + eingang, Status "empfangen". Nicht angehakt → aus dem Schein entfernen.
// Freitext-Zeilen berühren den Bestand nie.

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
  name: "", admin: false, tab: "lieferung",
  standorte: [], artikel: [], bestand: {}, termine: [],
  scheine: [], einkaufPos: [],
  // Entwurf eines neuen Lieferscheins
  von: "", nach: "", suche: "", zeilen: [],
  // Einkauf
  ekStandort: "", ekSuche: "",
  busy: false, fehler: ""
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const heute = () => new Date().toISOString().slice(0, 10);
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const standort = id => S.standorte.find(s => s.id === id);
const nameOf = id => standort(id)?.name || "?";

function datumLang(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}
function naechsterTermin() {
  const t = heute();
  return S.termine.map(x => x.datum).filter(d => d >= t).sort()[0] || "";
}

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
    alle(() => sb.from("artikel").select("id,name,einheit,status,deleted_at").order("id")),
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
  if (!S.von) S.von = S.standorte[0]?.id || "";
  if (!S.nach) S.nach = S.standorte[1]?.id || "";
  if (!S.ekStandort) S.ekStandort = S.standorte[0]?.id || "";
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
    `Noch ${offen.length} ${offen.length === 1 ? "Artikel" : "Artikel"} nicht abgehakt`,
    `<p>Diese Positionen werden aus dem Lieferschein entfernt und nicht gebucht:</p><ul class="plain">${offen.map(z => `<li>${esc(zeilenName(z))}</li>`).join("")}</ul>`,
    "Entfernen & abschließen")) return;

  const gebucht = schein.items.filter(z => z.abgehakt && z.artId);
  const knapp = gebucht.filter(z => bestandVon(z.artId, schein.von_id) < num(z.menge))
    .map(z => ({ z, ist: bestandVon(z.artId, schein.von_id) }));
  if (knapp.length && !await frage(
    "Bestand reicht nicht",
    `<p>Bei ${knapp.length === 1 ? "dieser Position" : "diesen Positionen"} wird der Bestand negativ:</p><ul class="plain">${knapp.map(k => `<li>${esc(artikelName(k.z.artId))}: Bestand ${k.ist}, Lieferung ${num(k.z.menge)}</li>`).join("")}</ul>`,
    "Trotzdem buchen")) return;

  S.busy = true; zeichne();
  try {
    // Bestand direkt vor dem Buchen neu lesen — zwischen Laden und Abschließen kann gebucht worden sein
    const ids = [...new Set(gebucht.map(z => z.artId))];
    const { data: frisch, error: fErr } = await sb.from("artikel_bestand")
      .select("artikel_id,standort_id,ist_bestand,soll_bestand,lagerort,lagerort_split").in("artikel_id", ids);
    if (fErr) throw new Error(fErr.message);
    (frisch || []).forEach(b => { (S.bestand[b.artikel_id] = S.bestand[b.artikel_id] || {})[b.standort_id] = b; });

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
    schein.status = "empfangen";
    S.scheine = S.scheine.filter(s => s.id !== schein.id);
    toast(`✓ Lieferung gebucht: ${gebucht.length} Positionen, ${nameOf(schein.von_id)} → ${nameOf(schein.nach_id)}`);
  } catch (e) {
    S.fehler = "Buchen fehlgeschlagen: " + e.message + " — bitte prüfen, ob alles angekommen ist.";
  } finally {
    S.busy = false; zeichne();
  }
}

function zeilenName(z) { return z.artId ? artikelName(z.artId) : (z.freitext || "—"); }
function artikelName(id) { return S.artikel.find(a => a.id === id)?.name || "—"; }

// ── Neuen Schein speichern (geplant, ohne Bestandsänderung) ──
async function scheinSpeichern() {
  const zeilen = S.zeilen.filter(z => z.artId || z.freitext.trim());
  if (!zeilen.length || S.von === S.nach) return;
  const termin = naechsterTermin();
  if (!termin) { S.fehler = "Kein Liefertag gesetzt. Admin muss zuerst einen Liefertag wählen."; zeichne(); return; }
  S.busy = true; zeichne();
  try {
    const id = uid();
    const { error } = await sb.from("transfers").insert({
      id, von_id: S.von, nach_id: S.nach, datum: new Date().toISOString(),
      benutzer: S.name, status: "geplant", liefer_datum: termin
    });
    if (error) throw new Error(error.message);
    const rows = zeilen.map(z => ({
      id: uid(), transfer_id: id, artikel_id: z.artId || null,
      freitext: z.artId ? "" : z.freitext.trim(), einheit: z.einheit || "",
      menge: num(z.menge) || 0, abgehakt: false
    }));
    const { error: iErr } = await sb.from("transfer_items").insert(rows);
    if (iErr) throw new Error(iErr.message);
    S.scheine.unshift({ id, von_id: S.von, nach_id: S.nach, benutzer: S.name, status: "geplant", liefer_datum: termin, datum: new Date().toISOString(), items: rows.map(zeileAusDb) });
    S.zeilen = []; S.suche = "";
    toast("Lieferschein gespeichert");
  } catch (e) {
    S.fehler = "Speichern fehlgeschlagen: " + e.message;
  } finally { S.busy = false; zeichne(); }
}

async function scheinLoeschen(schein) {
  if (!await frage("Lieferschein löschen?", `<p>${esc(nameOf(schein.von_id))} → ${esc(nameOf(schein.nach_id))}, ${esc(datumLang(schein.liefer_datum))}</p><p>Noch nichts wurde gebucht.</p>`, "Löschen")) return;
  const { error: e1 } = await sb.from("transfer_items").delete().eq("transfer_id", schein.id);
  const { error: e2 } = await sb.from("transfers").delete().eq("id", schein.id);
  if (e1 || e2) { S.fehler = (e1 || e2).message; zeichne(); return; }
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
function ekPos(artId) {
  return S.einkaufPos.find(p => p.standort_id === S.ekStandort && p.liefer_datum === naechsterTermin() && p.einkauf_artikel_id === artId);
}
async function ekSetzen(art, menge) {
  const termin = naechsterTermin();
  if (!termin) { S.fehler = "Kein Liefertag gesetzt."; zeichne(); return; }
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
  p.status = an ? "gekauft" : "offen"; zeichne();
  const { error } = await sb.from("einkauf_positionen").update({ status: p.status, benutzer: S.name }).eq("id", p.id);
  if (error) { p.status = an ? "offen" : "gekauft"; S.fehler = error.message; zeichne(); }
}
async function ekFrei(text, menge) {
  const termin = naechsterTermin();
  const t = text.trim();
  if (!termin || !t) return;
  const neu = { id: uid(), standort_id: S.ekStandort, liefer_datum: termin, einkauf_artikel_id: null, freitext: t, menge: String(menge || "").trim(), status: "offen", benutzer: S.name };
  S.einkaufPos.push(neu);
  const { error } = await sb.from("einkauf_positionen").insert(neu);
  if (error) { S.einkaufPos = S.einkaufPos.filter(p => p.id !== neu.id); S.fehler = error.message; }
  zeichne();
}

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
}

// ── Dialoge ──
function frage(titel, html, okText) {
  return new Promise(res => {
    const ov = document.createElement("div");
    ov.className = "ov";
    ov.innerHTML = `<div class="sheet"><h3>${esc(titel)}</h3>${html}<div class="acts"><button class="btn ghost" id="qNo">Abbrechen</button><button class="btn" id="qYes">${esc(okText || "OK")}</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector("#qNo").onclick = () => { ov.remove(); res(false); };
    ov.querySelector("#qYes").onclick = () => { ov.remove(); res(true); };
  });
}
let toastTimer;
function toast(text) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3200);
}

// ── Oberfläche ──
function zeichne() {
  const app = $("app");
  if (!S.name) { app.innerHTML = nameMaske(); return; }
  const termin = naechsterTermin();
  app.innerHTML = `
    <header class="app"><div class="wrap" style="padding-bottom:8px">
      <div class="row">
        <h1>Store</h1>
        <button class="who" onclick="nameAendern()">👤 ${esc(S.name)}${S.admin ? " · Admin" : ""}</button>
      </div>
      <div class="next ${termin ? "" : "none"}">${termin ? "Nächste Lieferung: " + esc(datumLang(termin)) : "Kein Liefertag gesetzt"}</div>
    </div></header>
    <div class="wrap">
      ${S.fehler ? `<div class="err">${esc(S.fehler)}</div>` : ""}
      <div class="tabs">
        <button class="${S.tab === "lieferung" ? "on" : ""}" onclick="tab('lieferung')">📦 Lieferung</button>
        <button class="${S.tab === "einkauf" ? "on" : ""}" onclick="tab('einkauf')">🛒 Einkauf</button>
        ${S.admin ? `<button class="${S.tab === "admin" ? "on" : ""}" onclick="tab('admin')">📅 Tage</button>` : ""}
      </div>
      ${S.tab === "einkauf" ? einkaufHtml(termin) : S.tab === "admin" ? adminHtml() : lieferungHtml(termin)}
    </div>`;
}

function nameMaske() {
  return `<div class="center"><div class="card">
    <h2>Wie heißt du?</h2>
    <p class="sub">Dein Name wird bei jeder Buchung gespeichert. Einmal eingeben, das Gerät merkt ihn sich.</p>
    <label class="f">Name</label>
    <input class="inp" id="nm" autofocus onkeydown="if(event.key==='Enter')nameOk()">
    <button class="btn block" style="margin-top:12px" onclick="nameOk()">Weiter</button>
  </div></div>`;
}
function nameOk() {
  const v = ($("nm")?.value || "").trim();
  if (v === ADMIN_PIN) {
    S.admin = true; try { localStorage.setItem(ADMIN_KEY, "1"); } catch {}
    toast("Admin-Modus an");
    $("nm").value = "";
    return;
  }
  if (!v) return;
  S.name = v;
  try { localStorage.setItem(NAME_KEY, v); } catch {}
  zeichne();
}
function nameAendern() {
  const v = prompt("Name ändern — oder 1234 für den Admin-Modus:", S.name);
  if (v == null) return;
  const t = v.trim();
  if (t === ADMIN_PIN) { S.admin = !S.admin; try { localStorage.setItem(ADMIN_KEY, S.admin ? "1" : ""); } catch {} toast(S.admin ? "Admin-Modus an" : "Admin-Modus aus"); zeichne(); return; }
  if (!t) return;
  S.name = t; try { localStorage.setItem(NAME_KEY, t); } catch {}
  zeichne();
}
function tab(t) { S.tab = t; S.fehler = ""; zeichne(); }

function lieferungHtml(termin) {
  const scheine = S.scheine.filter(s => !termin || s.liefer_datum === termin);
  const suche = S.suche.trim().toLowerCase();
  const treffer = suche ? S.artikel.filter(a => a.name.toLowerCase().includes(suche)).slice(0, 12) : [];
  return `
    <div class="card">
      <h2>Neuer Lieferschein ${termin ? "" : "· gesperrt"}</h2>
      <div class="row2">
        <div><label class="f">Von</label><select class="sel" onchange="S.von=this.value;zeichne()">${S.standorte.map(s => `<option value="${esc(s.id)}" ${s.id === S.von ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
        <div><label class="f">Nach</label><select class="sel" onchange="S.nach=this.value;zeichne()">${S.standorte.map(s => `<option value="${esc(s.id)}" ${s.id === S.nach ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
      </div>
      ${S.von === S.nach ? `<div class="err">Von und Nach müssen verschieden sein.</div>` : ""}
      <label class="f">Artikel suchen</label>
      <div class="searchbox">
        <input class="inp" id="suche" placeholder="Name…" value="${esc(S.suche)}" oninput="S.suche=this.value;zeichne();fokusSuche()">
        ${treffer.length ? `<div class="hits">${treffer.map(a => `<button onclick="zeileArtikel('${esc(a.id)}')"><span class="nm">${esc(a.name)}</span><span class="meta">${esc(a.einheit || "")} · ${bestandVon(a.id, S.von)} im Lager</span></button>`).join("")}</div>` : ""}
      </div>
      <label class="f">Oder freie Zeile (z. B. Eiswürfel — ohne Lagerwirkung)</label>
      <div class="row2">
        <input class="inp" id="freiText" placeholder="Bezeichnung">
        <input class="inp" id="freiMenge" placeholder="Menge" style="max-width:110px">
      </div>
      <button class="btn ghost sm" style="margin-top:8px" onclick="zeileFrei()">+ Freie Zeile</button>
      ${S.zeilen.length ? `<div style="margin-top:8px">${S.zeilen.map((z, i) => `
        <div class="line">
          <div class="nm"><b>${esc(z.artId ? artikelName(z.artId) : z.freitext)}</b><span>${z.artId ? esc(S.artikel.find(a => a.id === z.artId)?.einheit || "") + " · Bestand " + bestandVon(z.artId, S.von) : "freie Zeile"}</span></div>
          <input class="inp qty" type="number" min="0" step="any" value="${esc(z.menge)}" onchange="S.zeilen[${i}].menge=this.value">
          <button class="x" onclick="S.zeilen.splice(${i},1);zeichne()">✕</button>
        </div>`).join("")}
        <button class="btn block" style="margin-top:10px" ${S.busy || S.von === S.nach ? "disabled" : ""} onclick="scheinSpeichern()">Für ${esc(termin ? datumLang(termin) : "—")} planen</button>` : `<div class="empty">Noch keine Position.</div>`}
    </div>
    <h2 style="font-size:14px;margin:14px 4px 8px">Geplante Lieferungen${termin ? " · " + esc(datumLang(termin)) : ""} (${scheine.length})</h2>
    ${scheine.length ? scheine.map(scheinHtml).join("") : `<div class="card empty">Nichts geplant.</div>`}`;
}

function scheinHtml(s) {
  const gehakt = s.items.filter(z => z.abgehakt).length;
  return `<div class="card">
    <h2>${esc(nameOf(s.von_id))} → ${esc(nameOf(s.nach_id))} <span class="badge plan">geplant</span></h2>
    <div class="sub" style="margin-bottom:6px">${esc(s.benutzer || "")} · ${gehakt}/${s.items.length} abgehakt</div>
    ${s.items.map(z => `
      <div class="line ${z.abgehakt ? "ticked" : ""}">
        <button class="check ${z.abgehakt ? "on" : ""}" onclick="haken(scheinById('${esc(s.id)}'),zeileById('${esc(s.id)}','${esc(z.id)}'),${!z.abgehakt})">${z.abgehakt ? "✓" : ""}</button>
        <div class="nm"><b>${esc(zeilenName(z))}</b><span>${z.artId ? esc(S.artikel.find(a => a.id === z.artId)?.einheit || "") : "freie Zeile" + (z.einheit ? " · " + esc(z.einheit) : "")}</span></div>
        <b>${esc(z.menge)}</b>
      </div>`).join("")}
    <div class="row2" style="margin-top:10px">
      <button class="btn ghost sm" onclick="scheinLoeschen(scheinById('${esc(s.id)}'))">Löschen</button>
      <button class="btn sm" ${S.busy || !gehakt ? "disabled" : ""} onclick="abschliessen(scheinById('${esc(s.id)}'))">Lieferung abgeschlossen</button>
    </div>
  </div>`;
}
function scheinById(id) { return S.scheine.find(s => s.id === id); }
function zeileById(sid, zid) { return scheinById(sid)?.items.find(z => z.id === zid); }

function zeileArtikel(id) {
  if (S.zeilen.some(z => z.artId === id)) { S.suche = ""; zeichne(); return; }
  const a = S.artikel.find(x => x.id === id);
  S.zeilen.push({ artId: id, freitext: "", einheit: a?.einheit || "", menge: 1 });
  S.suche = ""; zeichne();
}
function zeileFrei() {
  const t = ($("freiText")?.value || "").trim();
  if (!t) return;
  S.zeilen.push({ artId: "", freitext: t, einheit: "", menge: ($("freiMenge")?.value || "").trim() || 1 });
  zeichne();
}
function fokusSuche() { const el = $("suche"); if (el && document.activeElement !== el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }

function einkaufHtml(termin) {
  if (!termin) return `<div class="card empty">Kein Liefertag gesetzt — Einkauf ist gesperrt.</div>`;
  const q = S.ekSuche.trim().toLowerCase();
  const liste = EINKAUF.filter(a => !q || a.name.toLowerCase().includes(q));
  const pos = S.einkaufPos.filter(p => p.standort_id === S.ekStandort && p.liefer_datum === termin);
  const gekauft = pos.filter(p => p.status === "gekauft").length;
  return `
    <div class="card">
      <h2>Einkauf <span class="sub">${gekauft}/${pos.length} gekauft</span></h2>
      <label class="f">Für welchen Standort?</label>
      <select class="sel" onchange="S.ekStandort=this.value;zeichne()">${S.standorte.map(s => `<option value="${esc(s.id)}" ${s.id === S.ekStandort ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <div class="sub" style="margin-top:6px">Lieferung ${esc(datumLang(termin))} · ohne Lagerwirkung</div>
    </div>
    <div class="card">
      <input class="inp" placeholder="Artikel suchen…" value="${esc(S.ekSuche)}" oninput="S.ekSuche=this.value;zeichne()">
      ${liste.map(a => {
        const p = ekPos(a.id);
        return `<div class="line ${p?.status === "gekauft" ? "ticked" : ""}">
          ${p ? `<button class="check ${p.status === "gekauft" ? "on" : ""}" onclick="ekGekauft(posById('${esc(p.id)}'),${p.status !== "gekauft"})">${p.status === "gekauft" ? "✓" : ""}</button>` : `<span class="check" style="visibility:hidden"></span>`}
          <div class="nm"><b>${esc(a.name)}</b><span>${esc(a.einheit)}${a.wo ? " · " + esc(a.wo) : ""}${a.hinweis ? " · " + esc(a.hinweis) : ""}</span></div>
          <input class="inp qty" inputmode="decimal" placeholder="Menge" value="${esc(p?.menge || "")}" onchange="ekSetzen(EINKAUF.find(x=>x.id==='${esc(a.id)}'),this.value)">
        </div>`;
      }).join("")}
    </div>
    ${pos.some(p => p.freitext) ? `<div class="card"><h2>Eigene Zeilen</h2>${pos.filter(p => p.freitext).map(p => `
      <div class="line ${p.status === "gekauft" ? "ticked" : ""}">
        <button class="check ${p.status === "gekauft" ? "on" : ""}" onclick="ekGekauft(posById('${esc(p.id)}'),${p.status !== "gekauft"})">${p.status === "gekauft" ? "✓" : ""}</button>
        <div class="nm"><b>${esc(p.freitext)}</b></div><b>${esc(p.menge)}</b>
      </div>`).join("")}</div>` : ""}
    <div class="card">
      <h2>Eigene Zeile</h2>
      <div class="row2">
        <input class="inp" id="ekFreiText" placeholder="Was sonst noch?">
        <input class="inp" id="ekFreiMenge" placeholder="Menge" style="max-width:110px">
      </div>
      <button class="btn ghost sm" style="margin-top:8px" onclick="ekFrei($('ekFreiText').value,$('ekFreiMenge').value)">+ Hinzufügen</button>
    </div>`;
}
function posById(id) { return S.einkaufPos.find(p => p.id === id); }

function adminHtml() {
  const tage = [];
  const start = new Date(); start.setHours(12, 0, 0, 0);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    tage.push({ iso, label: d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }), an: S.termine.some(t => t.datum === iso) });
  }
  const kommende = S.termine.map(t => t.datum).filter(d => d >= heute()).sort();
  return `<div class="card">
    <h2>Liefertage</h2>
    <div class="sub" style="margin-bottom:8px">Angehakte Tage sind Liefertage. Oben steht immer der nächste.</div>
    ${tage.map(t => `<div class="line">
      <button class="check ${t.an ? "on" : ""}" onclick="terminSetzen('${t.iso}',${!t.an})">${t.an ? "✓" : ""}</button>
      <div class="nm"><b>${esc(t.label)}</b></div>
    </div>`).join("")}
    ${kommende.length ? `<div class="sub" style="margin-top:8px">Gesetzt: ${kommende.map(d => esc(datumLang(d))).join(", ")}</div>` : ""}
  </div>`;
}

// ── Start ──
async function start() {
  try { S.name = localStorage.getItem(NAME_KEY) || ""; S.admin = localStorage.getItem(ADMIN_KEY) === "1"; } catch {}
  $("app").innerHTML = `<div class="center"><div class="card"><h2>Laden…</h2></div></div>`;
  try {
    await lade();
  } catch (e) {
    const fehlt = /liefertermine|einkauf_positionen|liefer_datum|freitext|abgehakt/i.test(e.message);
    $("app").innerHTML = `<div class="center"><div class="card"><h2>Daten nicht erreichbar</h2><div class="err">${esc(e.message)}</div>${fehlt ? `<p class="sub">Die Migration <b>20261118_store_lieferung.sql</b> wurde im Supabase SQL Editor noch nicht ausgeführt.</p>` : ""}</div></div>`;
    return;
  }
  zeichne();
}
document.addEventListener("DOMContentLoaded", start);
