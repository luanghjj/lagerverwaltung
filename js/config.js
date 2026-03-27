// ═══ CONFIG: Constants, i18n, Helpers ═══
// ═══════════════════════════════════════════════════════════
// LAGERVERWALTUNG v5 — Standalone HTML
// ═══════════════════════════════════════════════════════════

const SK = "lager_v7_html";
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const td = () => new Date().toISOString().slice(0, 10);
const nw = () => new Date().toISOString().slice(0, 16);
const fDT = d => { try { return new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch { return d; } };
const fC = v => (v||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const canP = () => !U || can(U.role,"preise");
const prc = (v,fallback) => canP() ? (typeof v==="string"?v:fC(v)) : (fallback||"•••");
const esc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const norm = s => String(s??"").normalize("NFD").replace(/[\u0300-\u036f\u0111\u0110]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const WDAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const WDAYS_S = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const WDAYS_VI = ["T2","T3","T4","T5","T6","T7","CN"];
const APP_VERSION = "v1.9.9";
/* CHANGELOG
  v1.6.1 (24.03.2026)
  - Inventur: Gruppierung nach Lagerort oder Kategorie (mit farbigen Headern + Zähler)
  - Inventur: Sortierung nach Lagerort, Name (A-Z), Status (Offen zuerst)
  - Inventur: Lagerort-Spalte auf Mobile ausgeblendet (mob-hide)
  - Inventur: renderInvTable() als wiederverwendbare Tabellen-Funktion
  v1.6.0 (24.03.2026)
  - Fix: Scroll-Position wird bei render() gespeichert und wiederhergestellt
  - Fix: Scroll-Reset nur bei Seitenwechsel (goPage), nicht bei Datenänderung
  - Fix: Doppelklick-Schutz (withLock) für buchenAlle, quickBook, doSubmitGroup, confirmAnforderung
  - Offline-Indikator: Gelbes "⚠ Offline"-Badge in Sidebar wenn Supabase nicht erreichbar
  - Offline: Automatische Erkennung über online/offline Events + Init-Check
  - Buchungs-Zusammenfassung: Toast zeigt jetzt Artikelliste nach WE/WA (statt nur "3 Artikel ✓")
  - Bestellungen: Suchfeld (Artikel, SKU, Lieferant, Referenz durchsuchen)
  - Bestellungen: "Heute" Quick-Filter Tab (zeigt nur Bestellungen von heute)
  - Lieferanten: Suchfeld (Name, Kontakt, E-Mail durchsuchen)
  - Inventur: Fortschrittsbalken mit gezählt/gesamt und Differenzen-Zähler
  - Transfer: "Alles OK" Quick-Empfang Button (alle Mengen = gesendet, direkt bestätigen)
  - Dashboard Kritisch-Tabelle: Inline 🛒 Quick-Order Button pro Zeile
  - Keyboard-Shortcuts: E=Eingang, A=Ausgang, B=Bestellliste, D=Dashboard, /=Suche, Esc=Modal/Sidebar
  v1.5.4 (24.03.2026)
  - Wareneingang und Warenausgang getrennte Berechtigungen (eingang / ausgang)
  - Benutzer-Editor: 2 separate Checkboxen "↓ Wareneingang" + "↑ Warenausgang"
  - Dashboard Quick-Actions, Artikel-Detail ±1, buchenAlle() prüfen jeweils eigene Permission
  - bewegungen.create aufgelöst — alte Custom-Perms werden nicht mehr erkannt
  v1.5.3 (24.03.2026)
  - PIN auf 6-stellig geändert (Login, Benutzer-Editor, Validierung, Auto-Generierung)
  - Demo-PINs aktualisiert (123456, 234567, 345678, 456789, 567890)
  - Login-Feld: maxlength=6, Monospace-Font, Placeholder "6-stelliger PIN"
  v1.5.2 (24.03.2026)
  - Benutzer-Editor: ALLE Sidebar-Berechtigungen einzeln konfigurierbar
  - Neue Permissions: standorte, benutzer, einstellungen im User-Editor
  - Permission-Liste gruppiert nach Sektionen (Übersicht, Lager, Einkauf, Restaurant, Admin)
  - Section-Headers in der individuellen Berechtigungsliste
  v1.5.1 (24.03.2026)
  - Fix: Dashboard alle KPIs filtern nach Standort (Kritisch, WE/WA, Bestellungen, Gestern-Vergleich)
  - Fix: Export nur für Admin+Manager (Staff entfernt)
  - Fix: Bereiche+Auffüllung filtern nach Standort UND User-Bereichszuordnung (U.bereiche)
  - Fix: Auffüllung pendingCount, Erledigt-heute, Historie respektieren Standort+Bereiche
  - Fix: canAccessBereich() prüft User-Bereiche vor Auffüllen-Modal
  - Fix: Admin-Seiten (Standorte, Benutzer, Kategorien, Lagerplätze, Einstellungen) mit can() Guards
  - Hierarchie: Staff sieht nur zugewiesene Bereiche an zugewiesenen Standorten
  v1.5.0 (23.03.2026)
  - Mobile: Bewegungen Card-Layout auf <540px (Tabelle → kompakte Karten)
  - Mobile: Artikel-Tabelle Spalten ausgeblendet (Kategorie, Lagerort, Gebinde)
  - Mobile: Dashboard Tabellen-Spalten ausgeblendet (Standort, Lagerort, Min, MA)
  - Mobile: Lieferant Quick-Order SKU+Preis-Spalten ausgeblendet
  - Mobile: Inventur-Inputs größer (80px, 18px Font via inv-input CSS)
  - Mobile: KPI-Karten 2×2 Grid, sekundäre ausgeblendet
  - Mobile: Quick-Actions 2×2, Umbuchen ausgeblendet
  - Workflow: WE/WA "Zuletzt gebucht" Quick-Buttons (letzte 6 Artikel)
  - Workflow: Artikel-Detail +1/−1 Schnellbuchung direkt am Bestandsbalken
  - Workflow: quickBook() mit sofortigem Modal-Refresh
  v1.4.0 (23.03.2026)
  - Dashboard: Komplett-Redesign mit farbigen KPI-Karten, SVG Area-Chart, Lagergesundheits-Ring
  - Dashboard: Große Schnellaktionen-Buttons mit Icons (WE, WA, Bestellen, Umbuchen, Inventur)
  - Dashboard: Kategorie-Breakdown, Top-Verbrauch (7T), Trend vs. gestern
  - Lieferant-Detail: Schnellbestellung (Mengen eingeben → direkt bestellen)
  - Lieferant-Detail: Quick-Fill Buttons (Auto/Nur kritische/Alle leeren), Standort-Auswahl
  - Artikel-Detail: Bewegungshistorie (letzte 10 Buchungen) mit Link zu allen
  - Artikel-Detail: Bildergalerie mit ‹/›-Navigation + klickbare Thumbnails
  - Bestellliste: Lieferant-Dropdown Quick-Add Panel (alle Artikel eines Lieferanten)
  - Bewegungen-Tabelle: Thumbnails + klickbare Artikelnamen
  - Wareneingang/Warenausgang: Heute-Tabelle mit Artikelbildern
  - Inventur: Artikelbilder in der Zählliste
  - Auswertung: Thumbnails bei Top-Eingang, Top-Ausgang, Bestellturnus
  - Restaurant Auffüllen: Sortierfunktion (Kategorie/Name/Bestand/Fehlmenge)
  - Restaurant Auffüllen: Gruppierung nach Kategorie mit farbigen Headern
  - Restaurant Auffüllen: Artikelbilder + Fehlmengen-Badge
  - Standort-Filter: Funktioniert jetzt in ALLEN Tabs (Bewegungen, Bestellungen, Bestellliste, Transfer, Export, Kritisch-Banner)
  - Backup: Selektives Backup (9 Bereiche einzeln wählbar, Größenanzeige, Presets, Zeitfilter)
  - Import: Selektiv mit Merge-Option (Ersetzen oder Zusammenführen)
  - SKU-Duplikat-Check beim Artikel-Speichern (blockiert), Name-Duplikat-Warnung
  - Bestellen-Button: Einkaufswagen-Icon entfernt (cleaner)
  v1.3.2 (22.03.2026)
  - QR-Scan: Öffnet jetzt "Nach Lagerort"-Ansicht statt nur Suchfeld
  v1.3.1 (22.03.2026)
  - Lagerplätze: QR-Codes pro Lagerplatz (📱 Button auf Karte)
  - Lagerplätze: Bulk QR-Codes anzeigen, drucken (3×n Grid, A4), einzeln downloaden
  v1.3.0 (22.03.2026)
  - NEU: Eigener Menüpunkt "Lagerplätze" unter Administration
  - Lagerplätze mit Zone, Temperatur (Normal/Kühl/TK/Warm), Kapazität, Beschreibung
  - Gruppierung nach Standort und Zone, farbige Temperatur-Indikatoren
  - CRUD: Erstellen, Bearbeiten, Löschen mit Auto-Rename in Artikeln
  - Zweisprachig (DE/VI)
  - Artikel-Count pro Lagerplatz
  - Migration: Alte Standort-Lagerplätze werden automatisch zu Objekten konvertiert
  - Artikel-Editor nutzt jetzt D.lagerplaetze als Dropdown-Quelle
  v1.2.0 (22.03.2026)
  - Fix: Bestellliste Auto-Add prüft ob Artikel bereits bestellt (status=bestellt)
  - Bereits bestellte Artikel werden nicht erneut in Bestellliste aufgenommen
  - "Kritische hinzufügen" ignoriert bereits bestellte Artikel
  - Kritisch-Badge-Zähler berücksichtigt offene Bestellungen
  v1.1.8 (22.03.2026)
  - Umbuchen: Richtung korrigiert → sendet VON aktuellem Standort AN ausgewählten
  - Umbuchen: sichtbar solange aktueller Standort Bestand hat (ist > 0)
  - Umbuchen: zeigt alle anderen Standorte mit aktuellem Bestand
  v1.1.7 (22.03.2026)
  - Fix: Umbuchen im Artikel-Detail immer sichtbar (nicht nur bei Bestand < Soll)
  v1.1.6 (22.03.2026)
  - Artikel-Detail: Separates Mengen-Feld für Umbuchen (eigener Input statt geteiltem)
  v1.1.5 (22.03.2026)
  - Artikel-Detail: Umbuchen-Dropdown größer (12px, flex, 120px min)
  - Artikel-Detail: Umbuchen-Button mit vollem Text (⇄ Umbuchen/Chuyển kho)
  - Artikel-Detail: flex-wrap für mobile Darstellung
  v1.1.4 (22.03.2026)
  - Artikel-Detail: Bestell-Button größer, grün, mit Text (🛒 Bestellen)
  - Artikel-Detail: Umbuchen-Button größer mit Text (⇄ Umbuchen)
  - Artikel-Detail: Input-Feld für Menge größer (15px, fett)
  - Artikel-Detail: Lieferant-Dropdown besser lesbar
  v1.1.3 (22.03.2026)
  - Fix: 3 fehlende Übersetzungen (c.contact, c.color, c.user)
  - Fix: 6 nicht-übersetzte Vietnamese Texte (Transfer, Auffüllung)
  - Fix: inventurProtokolle Migration für alte localStorage-Daten
  v1.1.2 (22.03.2026)
  - Vietnamesisch-Suche: Diakritik-unabhängig (gao → gạo, nuoc → nước)
  - norm() Funktion für alle Suchfelder (NFD + Combining Marks entfernen)
  v1.1.1 (22.03.2026)
  - Telex/IME-Eingabe: Suche wartet bis Zeichen fertig komponiert ist
  - Vietnamesisch-Suche in Wareneingang Enter-Taste und Bereiche-Filter ergänzt
  v1.1.0 (22.03.2026)
  - Wareneingang: Lagerort-Spalte in Batch-Liste
  - Benutzerrechte: Dashboard, Auswertung, Inventur, Umbuchen, Bewegungen, Export, Bereiche.manage einzeln wählbar
  - can() Fix: Kind-Recht gewährt nicht mehr Eltern-Recht
  - Sidebar: alle Menüpunkte mit Permission-Check (pm)
  - Bereiche: Suche, Lagerort, Auffüllen statt Verbrauch, Einheit bei Input, Card-Layout
  - Bereiche CRUD nur für Manager+ (bereiche.manage)
  - Auffüllung (2/2): editierbare Empfangen-Spalte, Lagerort, Fehlmengen
  - Umbuchen: Standort-Namen statt Emoji in Suchergebnissen
  - Bestellliste: Vorlagen-System (erstellen, laden, bearbeiten)
  - Bestellliste: Kritische hinzufügen Button + globaler roter Banner
  - Bestellungen: editierbare Empfangen-Spalte, Fehlmengen-Dokumentation
  - Bestellungen: Alle bestätigen Bulk pro Lieferant
  - Bestellungen: Umbuchen-Tab mit offenen Transfers
  - Bestellungen: Aufklappbare Lieferanten-Gruppen
  - Wareneingang: Bestellung laden (1-Klick Übernahme offener Bestellungen)
  - Artikel: Barcode-Spalte entfernt, neuer Tab Nach Lagerort
  - Export-Buttons nur mit export-Berechtigung sichtbar
  - Standort-Zugriff: Fix Doppelklick-Bug (mc-it statt label+checkbox)
  - Rotes Badge in Sidebar bei kritischen Artikeln
  - Hamburger-Menü: Padding-Fix für Banner/Standort-Bar
  - Demo-Daten: 55 Artikel, 11 Kategorien, 6 Lieferanten, 5 User, 7 Bereiche, 3 Vorlagen
  - Versionsnummer in Sidebar
  - Telegram: Console-Spam bei fehlender Konfiguration behoben
  v1.0.0 (20.03.2026)
  - Erstveröffentlichung: 177+ Funktionen, 17 Seiten, DE/VI, localStorage, PWA
*/
const ROLES = {admin:{label:"Administrator",color:"#DC2626"},manager:{label:"Filialleiter",color:"#2563EB"},staff:{label:"Mitarbeiter",color:"#6B7280"}};

// i18n
const T = {
"nav.dashboard":{de:"Dashboard",vi:"Bảng điều khiển"},"nav.articles":{de:"Artikel",vi:"Sản phẩm"},"nav.goodsin":{de:"Wareneingang",vi:"Nhập kho"},"nav.goodsout":{de:"Warenausgang",vi:"Xuất kho"},"nav.movements":{de:"Bewegungen",vi:"Biến động"},"nav.orderlist":{de:"Bestellliste",vi:"DS đặt hàng"},"nav.orders":{de:"Bestellungen",vi:"Đơn hàng"},"nav.suppliers":{de:"Lieferanten",vi:"Nhà cung cấp"},"nav.locations":{de:"Standorte",vi:"Chi nhánh"},"nav.users":{de:"Benutzer",vi:"Người dùng"},"nav.categories":{de:"Kategorien",vi:"Danh mục"},"nav.settings":{de:"Einstellungen",vi:"Cài đặt"},"nav.warehouse":{de:"Lagerverwaltung",vi:"Quản lý kho"},"nav.purchase":{de:"Einkauf",vi:"Mua hàng"},"nav.admin":{de:"Administration",vi:"Quản trị"},"nav.overview":{de:"Übersicht",vi:"Tổng quan"},
"c.save":{de:"Speichern",vi:"Lưu"},"c.cancel":{de:"Abbrechen",vi:"Hủy"},"c.delete":{de:"Löschen",vi:"Xóa"},"c.edit":{de:"Bearbeiten",vi:"Chỉnh sửa"},"c.new":{de:"Neu",vi:"Thêm mới"},"c.search":{de:"Suche...",vi:"Tìm kiếm..."},"c.all":{de:"Alle",vi:"Tất cả"},"c.name":{de:"Name",vi:"Tên"},"c.location":{de:"Standort",vi:"Chi nhánh"},"c.quantity":{de:"Menge",vi:"Số lượng"},"c.price":{de:"Preis",vi:"Giá"},"c.date":{de:"Datum",vi:"Ngày"},"c.status":{de:"Status",vi:"Trạng thái"},"c.note":{de:"Notiz",vi:"Ghi chú"},"c.article":{de:"Artikel",vi:"Sản phẩm"},"c.supplier":{de:"Lieferant",vi:"NCC"},"c.total":{de:"Gesamt",vi:"Tổng"},"c.today":{de:"Heute",vi:"Hôm nay"},"c.value":{de:"Wert",vi:"Giá trị"},"c.storageloc":{de:"Lagerort",vi:"Vị trí kho"},"c.categories":{de:"Kategorien",vi:"Danh mục"},"c.reference":{de:"Referenz",vi:"Tham chiếu"},"c.type":{de:"Typ",vi:"Loại"},"c.active":{de:"Aktiv",vi:"Hoạt động"},"c.contact":{de:"Kontakt",vi:"Liên hệ"},"c.color":{de:"Farbe",vi:"Màu sắc"},"c.user":{de:"Benutzer",vi:"Người dùng"},
"d.totalart":{de:"Artikel gesamt",vi:"Tổng SP"},"d.stockval":{de:"Lagerwert",vi:"Giá trị kho"},"d.critical":{de:"Kritisch",vi:"Cần bổ sung"},"d.intoday":{de:"WE heute",vi:"Nhập hôm nay"},"d.outtoday":{de:"WA heute",vi:"Xuất hôm nay"},"d.belowmin":{de:"Unter Mindestmenge",vi:"Dưới mức tối thiểu"},"d.recentmov":{de:"Letzte Bewegungen",vi:"Biến động gần đây"},
"a.stock":{de:"Ist",vi:"Tồn"},"a.target":{de:"Soll",vi:"Chuẩn"},"a.minimum":{de:"Min",vi:"Min"},"a.bestprice":{de:"EK",vi:"Giá"},"a.namede":{de:"Name (DE)",vi:"Tên (Đức)"},"a.namevi":{de:"Name (VI)",vi:"Tên (Việt)"},"a.packunit":{de:"Gebinde",vi:"Đóng gói"},
"m.bookall":{de:"Alle buchen",vi:"Nhập/Xuất tất cả"},"m.addcritical":{de:"Kritische hinzufügen",vi:"Thêm SP thiếu"},"m.batchlist":{de:"Buchungsliste",vi:"Danh sách"},"m.searchmode":{de:"Suche",vi:"Tìm kiếm"},"m.barcodemode":{de:"Barcode / SKU",vi:"Mã vạch / SKU"},"m.scanready":{de:"Scan-bereit",vi:"Sẵn sàng"},"m.reason":{de:"Grund",vi:"Lý do"},
"o.ordered":{de:"Bestellt",vi:"Đã đặt"},"o.delivered":{de:"Geliefert",vi:"Đã giao"},"o.cancelled":{de:"Storniert",vi:"Đã hủy"},"o.bylief":{de:"Nach Lieferant",vi:"Theo NCC"},"o.allitems":{de:"Gesamtliste",vi:"Tất cả"},"o.submitorder":{de:"Bestellen",vi:"Đặt hàng"},"o.emptylist":{de:"Liste ist leer",vi:"DS trống"},
"x.excel":{de:"Excel",vi:"Excel"},"x.pdf":{de:"PDF",vi:"PDF"},"x.importpdf":{de:"PDF Import",vi:"Nhập PDF"},
"r.admin":{de:"Administrator",vi:"Quản trị viên"},"r.manager":{de:"Filialleiter",vi:"Quản lý CN"},"r.staff":{de:"Mitarbeiter",vi:"Nhân viên"},
"l.login":{de:"Anmelden",vi:"Đăng nhập"},"l.wrongpin":{de:"Falscher PIN",vi:"Sai PIN"},
"set.language":{de:"Sprache",vi:"Ngôn ngữ"},"set.reset":{de:"Zurücksetzen",vi:"Đặt lại"},
"rst.restaurant":{de:"Restaurant",vi:"Nhà hàng"},"rst.bereiche":{de:"Bereiche",vi:"Khu vực"},"rst.auffuellung":{de:"Auffüllung",vi:"Bổ sung"},"rst.service":{de:"Service",vi:"Phục vụ"},"rst.kueche":{de:"Küche",vi:"Bếp"},"rst.sushi":{de:"Sushi-Theke",vi:"Quầy Sushi"},"rst.bar":{de:"Bar / Getränke",vi:"Bar / Đồ uống"},"rst.sollbestand":{de:"Soll-Bestand",vi:"Mức chuẩn"},"rst.fehlmenge":{de:"Fehlmenge",vi:"Số thiếu"},"rst.auffuellen":{de:"Auffüllen",vi:"Bổ sung"},"rst.auffuellall":{de:"Alle auffüllen",vi:"Bổ sung tất cả"},"rst.bereich":{de:"Bereich",vi:"Khu vực"},"rst.voll":{de:"Voll",vi:"Đủ"},"rst.nachfuellen":{de:"Nachfüllen",vi:"Cần bổ sung"},"rst.leer":{de:"Leer",vi:"Hết"},"rst.anforderung":{de:"Anforderung erstellen",vi:"Tạo yêu cầu"},"rst.bestaetigen":{de:"Bestätigen & Abbuchen",vi:"Xác nhận & Xuất kho"},"rst.lagerverfuegbar":{de:"Lager verfügbar",vi:"Kho còn"},
};
let LANG = "de";
const t = k => T[k]?.[LANG] || T[k]?.de || k;
const artN = (a) => a ? (LANG === "vi" && a.name_vi ? a.name_vi : a.name) : "—";
const artD = (a) => a ? (LANG === "vi" && a.beschreibung_vi ? a.beschreibung_vi : (a.beschreibung||"")) : "";
const katN = (k) => k ? (LANG === "vi" && k.name_vi ? k.name_vi : k.name) : "";
const dayL = () => LANG === "vi" ? WDAYS_VI : WDAYS_S;

function formatUnitConv(qty, a) {
  if (!a || !a.packSize || a.packSize <= 1) return "";
  const p = Math.floor(qty / a.packSize), r = qty % a.packSize;
  const pu = a.packUnit || "Geb.";
  if (p === 0) return "";
  return r > 0 ? `${p} ${pu} + ${r} ${a.einheit}` : `${p} ${pu}`;
}

function nextDelivery(l){if(!l.liefertage?.length)return null;const n=new Date(),dm={Montag:1,Dienstag:2,Mittwoch:3,Donnerstag:4,Freitag:5,Samstag:6,Sonntag:0},ts=l.liefertage.map(d=>dm[d]).filter(d=>d!==undefined);if(!ts.length)return null;for(let i=0;i<14;i++){const c=new Date(n);c.setDate(c.getDate()+i);if(ts.includes(c.getDay())){if(i===0&&n.getHours()>=12)continue;return c.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});}}return null;}

function stkSt(ist,soll,min){if(ist<=min)return{c:"var(--rd)",p:Math.max(5,(ist/Math.max(soll,1))*100)};if(ist<soll*.7)return{c:"var(--yl)",p:(ist/Math.max(soll,1))*100};return{c:"var(--gn)",p:Math.min(100,(ist/Math.max(soll,1))*100)};}
function stkBar(ist,soll,min,u){const s=stkSt(ist,soll,min);return`<div class="stk-w"><div class="stk-b"><div class="stk-f" style="width:${s.p}%;background:${s.c}"></div></div><div class="stk-i"><span style="color:${s.c}">${ist}/${soll} ${u||""}</span><span style="color:var(--t3)">Min:${min}</span></div></div>`;}

const BT={eingang:{s:"WE",c:"#10B981",i:"↓"},ausgang:{s:"WA",c:"#EF4444",i:"↑"},korrektur_plus:{s:"K+",c:"#3B82F6",i:"±"},korrektur_minus:{s:"K−",c:"#F59E0B",i:"±"},umbuchung:{s:"UB",c:"#8B5CF6",i:"⇄"}};
const ROLE_PERMS={admin:["all"],manager:["dashboard","auswertung","artikel","bestellungen","bewegungen","transfer","inventur","lieferanten","lieferanten.detail","kategorien","bestellliste","export","bereiche","preise","eingang","ausgang"],staff:["dashboard","artikel.read","eingang","ausgang","bestellungen.create","lieferanten.read","bestellliste","bereiche.view"]};
const can=(r,a)=>{const userPerms=U?.perms;const p=userPerms||ROLE_PERMS[r]||[];return p.includes("all")||p.some(x=>a===x||a.startsWith(x+"."));};