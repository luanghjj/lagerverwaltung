// ═══ STATE: Load, Save, Migrate, Theme ═══
// ═══ STATE ═══
let D, U, PAGE = "dashboard", STF = "all", THEME = "dark";
let _IME = false; // Telex/IME composition active
document.addEventListener("compositionstart", () => { _IME = true; });
document.addEventListener("compositionend", (e) => { _IME = false; if (e.target?.dispatchEvent) e.target.dispatchEvent(new Event("input")); });
function load() { try { const s = localStorage.getItem(SK); D = s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEF)); } catch { D = JSON.parse(JSON.stringify(DEF)); } LANG = D.lang || "de"; THEME = D.theme || "dark"; migrate(); applyTheme(); fixMobileHeight(); }
// loadStandorte removed — sbLoadAll() in supabase.js handles all data loading
function fixMobileHeight() {
  const setH = () => { document.documentElement.style.setProperty('--vh', window.innerHeight + 'px'); };
  setH(); window.addEventListener('resize', setH);
}
function migrate() {
  if (!D.bereiche) D.bereiche = DEF.bereiche ? JSON.parse(JSON.stringify(DEF.bereiche)) : [];
  if (!D.auffuellungen) D.auffuellungen = [];
  if (!D.anforderungen) D.anforderungen = [];
  if (!D.bestellliste) D.bestellliste = [];
  if (!D.preisHistorie) D.preisHistorie = [];
  if (!D.transfers) D.transfers = [];
  D.artikel.forEach(a => { if (!a.barcodes) a.barcodes = []; a.lieferanten.forEach(al=>{if(!al.artNr)al.artNr="";}); });
  D.users.forEach(u => { if (!u.bereiche) u.bereiche = ["all"]; });
  D.standorte.forEach(s => { if (!s.lagerplaetze) { const orte = new Set(); D.artikel.forEach(a => { const lo = a.lagerort?.[s.id]; if (lo) orte.add(lo); }); s.lagerplaetze = [...orte].sort(); } });
  if (!D.einstellungen.tgEvents) D.einstellungen.tgEvents = {bestellung:true,eingang:true,ausgang:true,transfer:true,inventur:true,kritisch:true};
  if (!D.einstellungen.tgChannels) { D.einstellungen.tgChannels = []; if (D.einstellungen.telegramBotToken) { D.einstellungen.tgChannels.push({id:uid(),name:"Haupt",token:D.einstellungen.telegramBotToken,chatId:D.einstellungen.telegramChatId,standorte:["all"]}); D.einstellungen.telegramBotToken=""; D.einstellungen.telegramChatId=""; } }
  if (!D.bestellVorlagen) D.bestellVorlagen = [];
  if (!D.inventurProtokolle) D.inventurProtokolle = [];
  // Migrate lagerplaetze from standort strings to D.lagerplaetze objects
  if (!D.lagerplaetze) {
    D.lagerplaetze = [];
    D.standorte.forEach(s => {
      (s.lagerplaetze||[]).forEach(name => {
        if (!D.lagerplaetze.some(lp=>lp.name===name&&lp.standortId===s.id)) {
          const isKuehl = /kühl|kalt|cold|lạnh/i.test(name);
          const isTK = /tiefkühl|tk|frost|đông/i.test(name);
          D.lagerplaetze.push({id:uid(),name,name_vi:"",standortId:s.id,zone:"",temperatur:isTK?"tk":isKuehl?"kuehl":"normal",kapazitaet:"",beschreibung:""});
        }
      });
    });
  }
  save();
}
function save() { try { localStorage.setItem(SK, JSON.stringify(D)); if (typeof rtMarkLocalChange === "function") rtMarkLocalChange(); } catch {} }
function applyTheme() { document.documentElement.className = THEME === "light" ? "light" : ""; }
function setTheme(t) { THEME = t; D.theme = t; save(); applyTheme(); render(); }

// ═══ KEYBOARD SHORTCUTS ═══
document.addEventListener("keydown", (e) => {
  // Don't trigger if typing in input/select/textarea
  if (["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
  // Don't trigger if modal is open
  if (document.querySelector(".mo-ov")) {
    if (e.key === "Escape") { closeModal(); e.preventDefault(); }
    return;
  }
  if (!U) return; // not logged in
  if (e.key === "Escape") { closeSidebar(); return; }
  // Navigation shortcuts (no modifier keys)
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key === "e" && can(U.role,"eingang")) { goPage("eingang"); e.preventDefault(); }
  else if (e.key === "a" && can(U.role,"ausgang")) { goPage("ausgang"); e.preventDefault(); }
  else if (e.key === "b" && can(U.role,"bestellliste")) { goPage("bestellliste"); e.preventDefault(); }
  else if (e.key === "d" && can(U.role,"dashboard")) { goPage("dashboard"); e.preventDefault(); }
  else if (e.key === "/") { const s=document.getElementById("artSearch")||document.getElementById("bewSearch")||document.getElementById("bew_search"); if(s){s.focus();e.preventDefault();} }
});