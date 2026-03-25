// ═══ SUPABASE CLIENT + DATA LAYER ═══
const SUPABASE_URL = "https://wetpcdsiaodnoeaekitu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHBjZHNpYW9kbm9lYWVraXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDc3NjksImV4cCI6MjA4Njk4Mzc2OX0.Rod__xCzdTYt7bnd77nYHJ6yNFwgArt1MACqSuQgSCg";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Generic fetch helper ──
async function sbFetch(table, query) {
  const { data, error } = await sb.from(table).select(query || "*");
  if (error) { console.error(`[sb] ${table}:`, error.message); return []; }
  return data || [];
}

// ── Login by PIN ──
async function sbLoginByPin(pin) {
  const { data, error } = await sb.from("users").select("*").eq("pin", pin).is("deleted_at", null).limit(1);
  if (error || !data || data.length === 0) return null;
  const u = data[0];
  return { id: u.id, name: u.name, email: u.email || "", role: u.role, pin: u.pin,
    standorte: u.standorte || ["all"], bereiche: u.bereiche || ["all"],
    perms: (u.perms && u.perms.length > 0) ? u.perms : null };
}

// ══════════════════════════════════════════
// sbLoadAll() — Load ALL data from Supabase → build D object
// ══════════════════════════════════════════
async function sbLoadAll() {
  try {
    console.time("[sbLoadAll]");

    // Parallel fetch all 16 queries (some tables joined)
    const [standorte, kategorien, users, lieferanten,
           artikel, bestand, artKat, artLief,
           bewegungen, bestellungen, bestellliste,
           transfers, transferItems,
           bereiche, bereichArtikel,
           anforderungen, anforderungItems, auffuellungen,
           bestellVorlagen, vorlageItems,
           lagerplaetze, inventurProtokolle, inventurItems,
           preisHistorie, einstellungen
    ] = await Promise.all([
      sbFetch("standorte"),
      sbFetch("kategorien"),
      sbFetch("users"),
      sbFetch("lieferanten"),
      sbFetch("artikel"),
      sbFetch("artikel_bestand"),
      sbFetch("artikel_kategorien"),
      sbFetch("artikel_lieferanten"),
      sbFetch("bewegungen"),
      sbFetch("bestellungen"),
      sbFetch("bestellliste"),
      sbFetch("transfers"),
      sbFetch("transfer_items"),
      sbFetch("bereiche"),
      sbFetch("bereich_artikel"),
      sbFetch("anforderungen"),
      sbFetch("anforderung_items"),
      sbFetch("auffuellungen"),
      sbFetch("bestell_vorlagen"),
      sbFetch("vorlage_items"),
      sbFetch("lagerplaetze"),
      sbFetch("inventur_protokolle"),
      sbFetch("inventur_items"),
      sbFetch("preis_historie"),
      sbFetch("einstellungen"),
    ]);

    const result = {};

    // ── Standorte ──
    result.standorte = standorte.filter(s => s.aktiv !== false).map(s => ({
      id: s.id, name: s.name, adresse: s.adresse || "", aktiv: s.aktiv !== false, lagerplaetze: []
    }));

    // ── Kategorien ──
    result.kategorien = kategorien.map(k => ({
      id: k.id, name: k.name, name_vi: k.name_vi || "", farbe: k.farbe || "#6B7280"
    }));

    // ── Users (exclude soft-deleted) ──
    result.users = users.filter(u => !u.deleted_at).map(u => ({
      id: u.id, name: u.name, email: u.email || "", role: u.role, pin: u.pin,
      standorte: u.standorte || ["all"], bereiche: u.bereiche || ["all"],
      perms: (u.perms && u.perms.length > 0) ? u.perms : null
    }));

    // ── Lieferanten (exclude soft-deleted) ──
    result.lieferanten = lieferanten.filter(l => !l.deleted_at).map(l => ({
      id: l.id, name: l.name, kontakt: l.kontakt || "", telefon: l.telefon || "",
      email: l.email || "", adresse: l.adresse || "", notiz: l.notiz || "",
      liefertage: l.liefertage || [], rhythmus: l.rhythmus || "weekly", vorlaufzeit: l.vorlaufzeit || 0
    }));

    // ── Artikel (complex: join bestand + kategorien + lieferanten) ──
    const bestandByArt = {}, katByArt = {}, liefByArt = {};
    bestand.forEach(b => {
      if (!bestandByArt[b.artikel_id]) bestandByArt[b.artikel_id] = [];
      bestandByArt[b.artikel_id].push(b);
    });
    artKat.forEach(ak => {
      if (!katByArt[ak.artikel_id]) katByArt[ak.artikel_id] = [];
      katByArt[ak.artikel_id].push(ak.kategorie_id);
    });
    artLief.forEach(al => {
      if (!liefByArt[al.artikel_id]) liefByArt[al.artikel_id] = [];
      liefByArt[al.artikel_id].push({ lieferantId: al.lieferant_id, preis: parseFloat(al.preis) || 0, artNr: al.art_nr || "" });
    });

    result.artikel = artikel.filter(a => !a.deleted_at).map(a => {
      const bs = bestandByArt[a.id] || [];
      const istBestand = {}, sollBestand = {}, mindestmenge = {}, lagerort = {};
      bs.forEach(b => {
        istBestand[b.standort_id] = b.ist_bestand || 0;
        sollBestand[b.standort_id] = b.soll_bestand || 0;
        mindestmenge[b.standort_id] = b.mindestmenge || 0;
        lagerort[b.standort_id] = b.lagerort || "";
      });
      return {
        id: a.id, name: a.name, name_vi: a.name_vi || "", sku: a.sku || "",
        barcodes: a.barcodes || [], kategorien: katByArt[a.id] || [],
        bilder: a.bilder || [], lagerort, istBestand, sollBestand, mindestmenge,
        einheit: a.einheit || "Stk.", packUnit: a.pack_unit || "", packSize: a.pack_size || 0,
        lieferanten: liefByArt[a.id] || [],
        beschreibung: a.beschreibung || "", beschreibung_vi: a.beschreibung_vi || ""
      };
    });

    // ── Bewegungen (sort newest first) ──
    result.bewegungen = bewegungen.map(b => ({
      id: b.id, typ: b.typ, artikelId: b.artikel_id, standortId: b.standort_id,
      zielStandortId: b.ziel_standort_id || "", menge: b.menge || 0,
      datum: b.datum || b.created_at, benutzer: b.benutzer || "",
      referenz: b.referenz || "", notiz: b.notiz || "", lieferantId: b.lieferant_id || ""
    })).sort((a, b) => new Date(b.datum) - new Date(a.datum));

    // ── Bestellungen ──
    result.bestellungen = bestellungen.map(b => ({
      id: b.id, artikelId: b.artikel_id, lieferantId: b.lieferant_id,
      standortId: b.standort_id, menge: b.menge || 0,
      empfangen: b.empfangen, fehlmenge: b.fehlmenge,
      status: b.status || "bestellt", datum: b.datum, erstelltVon: b.erstellt_von || ""
    }));

    // ── Bestellliste ──
    result.bestellliste = bestellliste.map(b => ({
      id: b.id, artikelId: b.artikel_id, standortId: b.standort_id,
      menge: b.menge || 1, lieferantId: b.lieferant_id || ""
    }));

    // ── Transfers (join with items) ──
    const tfItemsByTf = {};
    transferItems.forEach(ti => {
      if (!tfItemsByTf[ti.transfer_id]) tfItemsByTf[ti.transfer_id] = [];
      tfItemsByTf[ti.transfer_id].push({
        artId: ti.artikel_id, menge: ti.menge || 0,
        empfangen: ti.empfangen, diff: ti.diff
      });
    });
    result.transfers = transfers.map(t => ({
      id: t.id, vonId: t.von_id, nachId: t.nach_id,
      datum: t.datum || t.created_at, benutzer: t.benutzer || "",
      status: t.status || "unterwegs", items: tfItemsByTf[t.id] || []
    }));

    // ── Bereiche (join with bereich_artikel) ──
    const baByBereich = {};
    bereichArtikel.forEach(ba => {
      if (!baByBereich[ba.bereich_id]) baByBereich[ba.bereich_id] = [];
      baByBereich[ba.bereich_id].push({ artikelId: ba.artikel_id, soll: ba.soll || 1 });
    });
    result.bereiche = bereiche.map(b => ({
      id: b.id, name: b.name, name_vi: b.name_vi || "",
      standortId: b.standort_id, farbe: b.farbe || "#3B82F6", icon: b.icon || "🍽",
      artikel: baByBereich[b.id] || []
    }));

    // ── Anforderungen (join with items) ──
    const anfItemsByAnf = {};
    anforderungItems.forEach(ai => {
      if (!anfItemsByAnf[ai.anforderung_id]) anfItemsByAnf[ai.anforderung_id] = [];
      anfItemsByAnf[ai.anforderung_id].push({ artikelId: ai.artikel_id, menge: ai.menge || 1 });
    });
    result.anforderungen = anforderungen.map(a => ({
      id: a.id, bereichId: a.bereich_id, standortId: a.standort_id,
      erstelltVon: a.erstellt_von || "", datum: a.datum || "",
      status: a.status || "offen", erledigt_von: a.erledigt_von, erledigt_am: a.erledigt_am,
      items: anfItemsByAnf[a.id] || []
    }));

    // ── Auffuellungen ──
    result.auffuellungen = auffuellungen.map(a => ({
      id: a.id, bereichId: a.bereich_id || "", artikelId: a.artikel_id,
      menge: a.menge || 0, datum: a.datum || "",
      benutzer: a.benutzer || "", anforderungId: a.anforderung_id || ""
    }));

    // ── Bestellvorlagen (join with items) ──
    const viByVorlage = {};
    vorlageItems.forEach(vi => {
      if (!viByVorlage[vi.vorlage_id]) viByVorlage[vi.vorlage_id] = [];
      viByVorlage[vi.vorlage_id].push({ artikelId: vi.artikel_id, menge: vi.menge || 1 });
    });
    result.bestellVorlagen = bestellVorlagen.map(v => ({
      id: v.id, name: v.name, lieferantId: v.lieferant_id || "",
      items: viByVorlage[v.id] || []
    }));

    // ── Lagerplaetze ──
    result.lagerplaetze = lagerplaetze.map(l => ({
      id: l.id, name: l.name, name_vi: l.name_vi || "",
      standortId: l.standort_id, zone: l.zone || "",
      temperatur: l.temperatur || "normal",
      kapazitaet: l.kapazitaet || "", beschreibung: l.beschreibung || ""
    }));

    // ── Inventur Protokolle (join with items) ──
    const invItemsByProt = {};
    inventurItems.forEach(ii => {
      if (!invItemsByProt[ii.protokoll_id]) invItemsByProt[ii.protokoll_id] = [];
      invItemsByProt[ii.protokoll_id].push({
        artikelId: ii.artikel_id, gezaehlt: ii.gezaehlt || 0,
        system: ii.system_bestand || 0, diff: ii.diff || 0
      });
    });
    result.inventurProtokolle = inventurProtokolle.map(p => ({
      id: p.id, standortId: p.standort_id, datum: p.datum,
      benutzer: p.benutzer || "", items: invItemsByProt[p.id] || []
    }));

    // ── Preis Historie ──
    result.preisHistorie = preisHistorie.map(p => ({
      id: p.id, artikelId: p.artikel_id, lieferantId: p.lieferant_id,
      alt: parseFloat(p.alt) || 0, neu: parseFloat(p.neu) || 0, datum: p.datum
    }));

    // ── Einstellungen ──
    const ein = einstellungen[0] || {};
    result.einstellungen = {
      firmenname: ein.firmenname || "Okyu Gastro Group",
      telegramBenachrichtigung: ein.data?.telegramBenachrichtigung || false,
      tgChannels: ein.data?.tgChannels || [],
      tgEvents: ein.data?.tgEvents || { bestellung:true, eingang:true, ausgang:true, transfer:true, inventur:true, kritisch:true },
      emailBenachrichtigung: false,
    };

    console.timeEnd("[sbLoadAll]");
    console.log(`✅ sbLoadAll: ${result.artikel.length} Artikel, ${result.bewegungen.length} Bewegungen, ${result.standorte.length} Standorte`);
    return result;
  } catch (e) {
    console.error("[sbLoadAll] Error:", e);
    return null;
  }
}

// ══════════════════════════════════════════
// WRITE-BACK helpers (sync D changes → Supabase)
// ══════════════════════════════════════════

// Upsert single record
async function sbUpsert(table, data) {
  const { error } = await sb.from(table).upsert(data, { onConflict: "id" });
  if (error) console.error(`[sbUpsert] ${table}:`, error.message);
  return !error;
}

// Delete single record
async function sbDelete(table, id) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error(`[sbDelete] ${table}:`, error.message);
  return !error;
}

// Save artikel + bestand + kategorien + lieferanten
async function sbSaveArtikel(a) {
  // 1. Upsert artikel
  await sb.from("artikel").upsert({
    id: a.id, name: a.name, name_vi: a.name_vi || "", sku: a.sku || "",
    barcodes: a.barcodes || [], bilder: a.bilder || [],
    beschreibung: a.beschreibung || "", beschreibung_vi: a.beschreibung_vi || "",
    einheit: a.einheit || "Stk.", pack_unit: a.packUnit || "", pack_size: a.packSize || 0
  });
  // 2. Upsert bestand per standort
  for (const [sid, ist] of Object.entries(a.istBestand || {})) {
    await sb.from("artikel_bestand").upsert({
      artikel_id: a.id, standort_id: sid,
      ist_bestand: ist, soll_bestand: (a.sollBestand || {})[sid] || 0,
      mindestmenge: (a.mindestmenge || {})[sid] || 0,
      lagerort: (a.lagerort || {})[sid] || ""
    }, { onConflict: "artikel_id,standort_id" });
  }
  // 3. Replace kategorien
  await sb.from("artikel_kategorien").delete().eq("artikel_id", a.id);
  if (a.kategorien?.length) {
    await sb.from("artikel_kategorien").insert(
      a.kategorien.map(kid => ({ artikel_id: a.id, kategorie_id: kid }))
    );
  }
  // 4. Replace lieferanten
  await sb.from("artikel_lieferanten").delete().eq("artikel_id", a.id);
  if (a.lieferanten?.length) {
    await sb.from("artikel_lieferanten").insert(
      a.lieferanten.map(l => ({ artikel_id: a.id, lieferant_id: l.lieferantId, preis: l.preis || 0, art_nr: l.artNr || "" }))
    );
  }
}

// Save bewegung
async function sbSaveBewegung(b) {
  await sb.from("bewegungen").upsert({
    id: b.id, typ: b.typ, artikel_id: b.artikelId, standort_id: b.standortId,
    ziel_standort_id: b.zielStandortId || null, menge: b.menge, datum: b.datum,
    benutzer: b.benutzer || null, referenz: b.referenz || "", notiz: b.notiz || "",
    lieferant_id: b.lieferantId || null
  });
}

// Save bestellung
async function sbSaveBestellung(b) {
  await sb.from("bestellungen").upsert({
    id: b.id, artikel_id: b.artikelId, lieferant_id: b.lieferantId,
    standort_id: b.standortId, menge: b.menge, empfangen: b.empfangen,
    fehlmenge: b.fehlmenge, status: b.status, datum: b.datum,
    erstellt_von: b.erstelltVon || null
  });
}

// Save transfer + items
async function sbSaveTransfer(t) {
  await sb.from("transfers").upsert({
    id: t.id, von_id: t.vonId, nach_id: t.nachId, datum: t.datum,
    benutzer: t.benutzer || null, status: t.status
  });
  await sb.from("transfer_items").delete().eq("transfer_id", t.id);
  if (t.items?.length) {
    await sb.from("transfer_items").insert(
      t.items.map(i => ({ id: uid(), transfer_id: t.id, artikel_id: i.artId, menge: i.menge, empfangen: i.empfangen, diff: i.diff }))
    );
  }
}

// Save user to Supabase staff_pins
async function sbSaveUser(u) {
  const { error } = await sb.from("users").upsert({
    id: u.id, name: u.name, email: u.email || "", role: u.role, pin: u.pin,
    standorte: u.standorte || ["all"], bereiche: u.bereiche || ["all"],
    perms: u.perms || []
  }, { onConflict: "id" });
  if (error) console.error("[sbSaveUser]", error.message);
}

// Soft-delete user from Supabase
async function sbDeleteUser(id) {
  await sb.from("users").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

// Save bereich + bereich_artikel
async function sbSaveBereich(br) {
  await sb.from("bereiche").upsert({
    id: br.id, name: br.name, name_vi: br.name_vi || "",
    standort_id: br.standortId, farbe: br.farbe || "#3B82F6", icon: br.icon || "🍽"
  }, { onConflict: "id" });
  // Replace bereich_artikel
  await sb.from("bereich_artikel").delete().eq("bereich_id", br.id);
  if (br.artikel?.length) {
    await sb.from("bereich_artikel").insert(
      br.artikel.map(ba => ({ bereich_id: br.id, artikel_id: ba.artikelId, soll: ba.soll || 1 }))
    );
  }
}

// Delete bereich from Supabase
async function sbDeleteBereich(id) {
  await sb.from("bereich_artikel").delete().eq("bereich_id", id);
  await sb.from("bereiche").delete().eq("id", id);
}

// Save lieferant
async function sbSaveLieferant(l) {
  await sb.from("lieferanten").upsert({
    id: l.id, name: l.name, kontakt: l.kontakt || "", telefon: l.telefon || "",
    email: l.email || "", adresse: l.adresse || "", notiz: l.notiz || "",
    website: l.website || "", kundennummer: l.kundennummer || "",
    zahlungsziel: l.zahlungsziel || "", mindestbestellwert: l.mindestbestellwert || 0,
    lieferzeit: l.lieferzeit || "", bewertung: l.bewertung || 0
  }, { onConflict: "id" });
}

// Soft-delete lieferant
async function sbDeleteLieferant(id) {
  await sb.from("lieferanten").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

// Save kategorie
async function sbSaveKategorie(k) {
  await sb.from("kategorien").upsert({
    id: k.id, name: k.name, name_vi: k.name_vi || "", farbe: k.farbe || "#6B7280"
  }, { onConflict: "id" });
}

// Delete kategorie
async function sbDeleteKategorie(id) {
  await sb.from("artikel_kategorien").delete().eq("kategorie_id", id);
  await sb.from("kategorien").delete().eq("id", id);
}

// Save standort
async function sbSaveStandort(s) {
  await sb.from("standorte").upsert({
    id: s.id, name: s.name, adresse: s.adresse || "", aktiv: s.aktiv !== false
  }, { onConflict: "id" });
}

// Save lagerplatz
async function sbSaveLagerplatz(lp) {
  await sb.from("lagerplaetze").upsert({
    id: lp.id, name: lp.name, name_vi: lp.name_vi || "",
    standort_id: lp.standortId, zone: lp.zone || "",
    temperatur: lp.temperatur || "normal", kapazitaet: lp.kapazitaet || "",
    beschreibung: lp.beschreibung || ""
  }, { onConflict: "id" });
}

// Delete lagerplatz
async function sbDeleteLagerplatz(id) {
  await sb.from("lagerplaetze").delete().eq("id", id);
}

// Save bestellliste item
async function sbSaveBestelllisteItem(item) {
  await sb.from("bestellliste").upsert({
    id: item.id, artikel_id: item.artikelId, standort_id: item.standortId,
    menge: item.menge, lieferant_id: item.lieferantId || null
  }, { onConflict: "id" });
}

// Delete bestellliste item
async function sbDeleteBestelllisteItem(id) {
  await sb.from("bestellliste").delete().eq("id", id);
}

// Clear all bestellliste
async function sbClearBestellliste() {
  await sb.from("bestellliste").delete().neq("id", "___none___");
}

// Save einstellungen
async function sbSaveEinstellungen() {
  await sb.from("einstellungen").upsert({
    id: 1, firmenname: D.einstellungen.firmenname,
    data: {
      telegramBenachrichtigung: D.einstellungen.telegramBenachrichtigung,
      tgChannels: D.einstellungen.tgChannels || [],
      tgEvents: D.einstellungen.tgEvents || {}
    }
  }, { onConflict: "id" });
}

// Save inventur protokoll + items
async function sbSaveInventur(prot, items) {
  await sb.from("inventur_protokolle").upsert({
    id: prot.id, standort_id: prot.standortId, datum: prot.datum, benutzer: prot.benutzer
  }, { onConflict: "id" });
  if (items?.length) {
    await sb.from("inventur_items").delete().eq("protokoll_id", prot.id);
    await sb.from("inventur_items").insert(
      items.map(it => ({ id: uid(), protokoll_id: prot.id, artikel_id: it.artikelId, gezaehlt: it.gezaehlt, system_bestand: it.systemBestand, diff: it.diff }))
    );
  }
}

// Save anforderung + items
async function sbSaveAnforderung(anf) {
  await sb.from("anforderungen").upsert({
    id: anf.id, bereich_id: anf.bereichId, standort_id: anf.standortId,
    erstellt_von: anf.erstelltVon, datum: anf.datum, status: anf.status,
    erledigt_von: anf.erledigtVon || null, erledigt_am: anf.erledigtAm || null
  }, { onConflict: "id" });
  await sb.from("anforderung_items").delete().eq("anforderung_id", anf.id);
  if (anf.items?.length) {
    await sb.from("anforderung_items").insert(
      anf.items.map(it => ({ id: uid(), anforderung_id: anf.id, artikel_id: it.artikelId, menge: it.menge }))
    );
  }
}

// Delete anforderung
async function sbDeleteAnforderung(id) {
  await sb.from("anforderung_items").delete().eq("anforderung_id", id);
  await sb.from("anforderungen").delete().eq("id", id);
}

// Save auffuellung
async function sbSaveAuffuellung(auf) {
  await sb.from("auffuellungen").upsert({
    id: auf.id, bereich_id: auf.bereichId || null, artikel_id: auf.artikelId,
    menge: auf.menge, datum: auf.datum, benutzer: auf.benutzer || null,
    anforderung_id: auf.anforderungId || null
  }, { onConflict: "id" });
}

// Upload product image to Supabase Storage
async function sbUploadImage(file, artikelName) {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = artikelName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_${Date.now()}.${ext}`;
    // Compress
    const compressed = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width, h = img.height;
          if (w > 800) { h = Math.round(h * 800 / w); w = 800; }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(blob => resolve(blob || file), "image/jpeg", 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    const { data, error } = await sb.storage.from("product-images").upload(fileName, compressed, { cacheControl: "3600", upsert: true });
    if (error) { console.error("[sbUploadImage]", error.message); return ""; }
    const { data: urlData } = sb.storage.from("product-images").getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (e) { console.error("[sbUploadImage]", e); return ""; }
}

console.log("✅ Supabase client ready:", SUPABASE_URL);
