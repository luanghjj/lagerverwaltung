// Mitarbeiter-Auffüllung. Die App läuft komplett offline: die supabase-js-CDN wird
// durch einen Stub ersetzt, der JEDEN Zugriff nur protokolliert. Es darf kein
// Request an *.supabase.co gehen und nichts in die Produktions-Datenbank geschrieben werden.
// Eigenständiger Runner (playwright core, kein @playwright/test nötig): node tests/auffuellung_ma.spec.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

function serve() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
      fs.createReadStream(p).pipe(res);
    });
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Staff mit Zugriff auf Küche (br2) und Service (br1) am Standort s1.
const STAFF = { id: "u-demo", name: "Demo Mitarbeiter", email: "", role: "staff", pin: "575757", standorte: ["s1"], bereiche: ["br2", "br1"], perms: null };
const ADMIN = { id: "u-admin", name: "Admin Test", email: "", role: "admin", pin: "111111", standorte: ["all"], bereiche: ["all"], perms: null };

const STUB = `window.supabase = { createClient: () => ({
  from: (name) => { const t = { select(){return t}, insert(){window.__writes.push(["insert",name]);return t}, upsert(){window.__writes.push(["upsert",name]);return t}, update(){window.__writes.push(["update",name]);return t}, delete(){window.__writes.push(["delete",name]);return t}, eq(){return t}, neq(){return t}, is(){return t}, in(){return t}, order(){return t}, limit(){return t}, range(){return t}, single(){return t}, maybeSingle(){return t}, then(fn){return Promise.resolve({data:[],error:null}).then(fn)} }; return t; },
  channel: () => ({ on(){return this}, subscribe(){return this} }), removeChannel(){}
}) };`;

async function openAs(page, base, user) {
  const blocked = [];
  page.on("request", r => { if (/supabase\.co/.test(r.url())) blocked.push(r.url()); });
  await page.route("**/*supabase.co*", route => route.abort());
  // supabase-js-CDN durch Stub ersetzen: sb.from() liest/schreibt nie wirklich.
  await page.route("**/supabase-js@2*", route => route.fulfill({ contentType: "text/javascript", body: STUB }));
  await page.addInitScript(() => { window.__writes = []; });
  await page.goto(base);
  await page.waitForSelector("#pinInput", { timeout: 15000 });
  // Offline-Fallback: Demo-Daten (DEF) sind geladen. U/PAGE/D sind let-Variablen im
  // klassischen Script-Scope, nicht auf window — daher über ein injiziertes Script setzen.
  await page.evaluate(u => {
    const sc = document.createElement("script");
    sc.textContent = `U = ${JSON.stringify(u)}; PAGE = "rst_ma"; render();`;
    document.body.appendChild(sc);
  }, user);
  await page.waitForTimeout(300);
  return blocked;
}

// Liest einen Ausdruck im Script-Scope der App (D/U/PAGE sind let-Variablen, nicht auf window).
function appVal(page, expr) {
  return page.evaluate(e => {
    const sc = document.createElement("script");
    sc.textContent = `window.__v = JSON.parse(JSON.stringify(${e} ?? null));`;
    document.body.appendChild(sc);
    sc.remove();
    return window.__v;
  }, expr);
}

function appRun(page, code) {
  return page.evaluate(c => {
    const sc = document.createElement("script");
    sc.textContent = c;
    document.body.appendChild(sc);
    sc.remove();
  }, code);
}

const SHOTS = path.join(ROOT, "tests", "shots");

async function runStaff(browser, base, name, vp) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  const blocked = await openAs(page, base, STAFF);

  // Nhân viên cơ bản: không có thanh tab dọc, chỉ nút 3 gạch; menu chỉ có Auffüllung
  assert(await page.locator(".app.sb-off").count() === 1, "sb-off gesetzt");
  assert(await page.locator(".hb").isVisible(), "Hamburger sichtbar");
  const sbBox = await page.locator("#sbEl").boundingBox();
  assert(sbBox.x + sbBox.width <= 0, "Sidebar außerhalb des Bildschirms, x=" + sbBox.x);
  assert(await page.locator(".sb-i").count() === 1, "Menü nur Auffüllung, war: " + await page.locator(".sb-i").count());
  assert((await page.locator(".sb-i").textContent()).includes("Auffüllung"), "Menüpunkt Auffüllung");

  if (vp.width < 768) {
    assert(await page.locator(".ma-br").count() === 2, "phone: 2 Bereiche");
    await page.locator(".ma-br", { hasText: "Küche" }).click();
    assert((await page.locator(".ma-tab").first().textContent()).includes("Alle"), "phone: Kategorie Alle");
  } else {
    assert(await page.locator(".ma-ipad").isVisible(), "ipad: 3-Spalten-Layout");
    assert(await page.locator(".ma-bb").count() === 2, "ipad: 2 Bereiche");
    await page.locator(".ma-bb", { hasText: "Küche" }).click();
    assert((await page.locator(".ma-kt").first().textContent()).includes("Alle"), "ipad: Kategorie Alle");
  }

  // Bestand + Einheit + Umrechnung sichtbar, Foto-Box auch ohne Bild
  const reis = page.locator(".ma-it", { hasText: "Sushi-Reis" });
  assert(await reis.isVisible(), "Artikel sichtbar");
  const stock = await reis.locator(".ma-stock .v").textContent();
  assert(stock.includes("45"), "Istbestand 45, war: " + stock);
  assert(stock.includes("kg"), "Einheit kg, war: " + stock);
  assert((await reis.locator(".ma-conv").textContent()).includes("4 Sack"), "Umrechnung 4 Sack");
  assert(await reis.locator(".ma-pic").count() === 1, "Foto-Box vorhanden");

  // Auswahl bleibt über Kategorie-Wechsel erhalten
  await reis.locator(".ma-add").click();
  assert((await page.locator(".ma-go").textContent()).includes("1"), "1 Artikel gewählt");
  await page.locator(".ma-st button.p").click();
  assert(await page.locator(".ma-q").inputValue() === "2", "Menge 2");
  const tab = vp.width < 768 ? ".ma-tab" : ".ma-kt";
  await page.locator(tab).nth(1).click();
  await page.locator(tab).first().click();
  assert(await page.locator(".ma-q").inputValue() === "2", "Auswahl bleibt über Kategorie-Wechsel");

  // Über Bestand hinaus tippen wird auf den Lagerbestand geklemmt
  await page.locator(".ma-q").fill("999");
  await page.locator(".ma-q").dispatchEvent("change");
  await page.waitForTimeout(100);
  assert(await page.locator(".ma-q").inputValue() === "45", "Menge auf Bestand geklemmt");

  // Nichts wird rechts abgeschnitten (Karten + Stepper im Viewport)
  for (const sel of [".ma-it", ".ma-st"]) {
    const els = await page.locator(sel).all();
    for (const el of els) {
      const b = await el.boundingBox();
      if (b) assert(b.x + b.width <= vp.width + 1, `${sel} abgeschnitten: rechts ${Math.round(b.x + b.width)} > ${vp.width}`);
    }
  }
  // Suche wird vom Hamburger nicht verdeckt
  const hb = await page.locator(".hb").boundingBox();
  const sr = await page.locator("#maSearch").boundingBox();
  assert(sr.x + sr.width <= hb.x || sr.y >= hb.y + hb.height, "Suche unter dem Hamburger");

  // Phone: +/− darf die Tastatur nicht öffnen — nur das Suchfeld und die Mengeneingabe
  if (vp.width < 768) {
    await page.locator(".ma-st button.p").click();
    assert(await page.evaluate(() => document.activeElement.tagName !== "INPUT"), "Stepper öffnet keine Tastatur");
    await page.locator("#maSearch").click();
    await page.keyboard.type("R");
    await page.locator(".ma-st button.p").click();
    assert(await page.evaluate(() => document.activeElement.id !== "maSearch"), "Suche bleibt nach + nicht fokussiert");
    await page.locator("#maSearch").fill("");
    await page.locator("#maSearch").dispatchEvent("input");
    await page.waitForTimeout(100);
    // Auswahl-Panel über den 🧺-Button, Menge dort änderbar
    await page.locator(".ma-cart").click();
    assert(await page.locator(".ma-pn").isVisible(), "Panel geöffnet");
    await page.locator(".ma-pn .ma-st button.p").click();
    assert(await page.locator(".ma-pn .ma-q").inputValue() === "45", "Menge im Panel auf Bestand geklemmt");
    await page.locator(".ma-pn-bd").click({ position: { x: 8, y: 200 } });
    assert(await page.locator(".ma-pn").count() === 0, "Panel über Hintergrund geschlossen");
  }

  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });

  // Auffüllen bucht lokal ab; die Schreibfunktionen laufen nur gegen den Stub
  const vorher = await appVal(page, 'D.artikel.find(a => a.id === "a1").istBestand["s1"]');
  await page.locator(".ma-go").click();
  await page.locator("#maCfOv .ma-cf-btn .btn-p").click();
  await page.waitForTimeout(400);
  const nachher = await appVal(page, 'D.artikel.find(a => a.id === "a1").istBestand["s1"]');
  assert(nachher === vorher - 45, `Bestand ${vorher} → ${nachher}, erwartet ${vorher - 45}`);
  const anf = await appVal(page, "D.anforderungen[0]");
  assert(anf && anf.status === "erledigt", "Anforderung erledigt");
  assert(anf.bereichId === "br2", "Bereich Küche");
  const bew = await appVal(page, 'D.bewegungen.find(b => String(b.referenz || "").startsWith("RST-"))');
  assert(!!bew, "Bewegung mit RST-Referenz");

  assert(blocked.length === 0, "Request an Supabase: " + blocked.join(", "));
  assert(errors.length === 0, "Seitenfehler: " + errors.join("\n"));
  await page.close();
}

// Nhân viên có quyền tuỳ chỉnh: Auffüllung + Inventur → thấy đúng 2 mục, vẫn không có tab dọc
async function runStaffCustom(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await openAs(page, base, { ...STAFF, perms: ["bereiche.view", "inventur"] });
  assert(await page.locator(".app.sb-off").count() === 1, "custom: sb-off");
  assert(await page.locator(".sb-i").count() === 2, "custom: 2 Menüpunkte, war: " + await page.locator(".sb-i").count());
  await page.locator(".hb").click();
  await page.waitForTimeout(400);
  await page.locator(".sb-i", { hasText: "Inventur" }).click();
  await page.waitForTimeout(200);
  assert(await appVal(page, "PAGE") === "inventur", "custom: Inventur geöffnet");
  await appRun(page, 'PAGE = "artikel"; render();');
  assert((await page.locator(".mn-t").first().textContent()).includes("🚫"), "custom: Artikel gesperrt");
  await page.close();
}

async function runAdmin(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openAs(page, base, ADMIN);
  await appRun(page, 'PAGE = "dashboard"; render();');
  await page.waitForTimeout(200);
  assert(await page.locator(".sb-i", { hasText: "Bereiche" }).isVisible(), "Admin sieht Bereiche");
  // Beide Seiten heißen "Auffüllung": der Admin darf nur die alte haben.
  assert(await page.locator(".sb-i", { hasText: "Auffüllung" }).count() === 1, "Admin hat genau eine Auffüllung");
  await page.locator(".sb-i", { hasText: "Auffüllung" }).click();
  await page.waitForTimeout(200);
  assert(await appVal(page, "PAGE") === "rst_auffuellung", "Admin landet auf alter Auffüllung, war: " + await appVal(page, "PAGE"));
  assert(await page.locator(".ma-phone, .ma-ipad").count() === 0, "Admin sieht das Mitarbeiter-Layout nicht");
  assert(await page.locator(".app.sb-off").count() === 0, "Admin behält die Sidebar");
  await page.close();
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  fs.mkdirSync(SHOTS, { recursive: true });
  const cases = [
    ["phone", { width: 390, height: 844 }],
    ["ipad-land", { width: 1180, height: 820 }],
    ["ipad-port", { width: 820, height: 1180 }]
  ];
  let failed = 0;
  for (const [name, vp] of cases) {
    try { await runStaff(browser, base, name, vp); console.log("✓ " + name); }
    catch (e) { failed++; console.error("✗ " + name + ": " + e.message); }
  }
  try { await runStaffCustom(browser, base); console.log("✓ staff+inventur"); }
  catch (e) { failed++; console.error("✗ staff+inventur: " + e.message); }
  try { await runAdmin(browser, base); console.log("✓ admin"); }
  catch (e) { failed++; console.error("✗ admin: " + e.message); }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
