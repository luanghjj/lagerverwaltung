// ═══ LOGIN (PIN-only, from Supabase) ═══
function renderLogin() {
  let h = `<div class="lg-w"><div class="lg-b"><div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px"><div class="theme-sw"><button class="theme-btn ${THEME === "light" ? "on" : ""}" onclick="setTheme('light')">☀</button><button class="theme-btn ${THEME === "dark" ? "on" : ""}" onclick="setTheme('dark')">🌙</button></div><div class="lang-sw"><button class="lang-btn ${LANG === "de" ? "on" : ""}" onclick="setLang('de')">🇩🇪 DE</button><button class="lang-btn ${LANG === "vi" ? "on" : ""}" onclick="setLang('vi')">🇻🇳 VI</button></div></div><div class="lg-t">${esc(D.einstellungen.firmenname)}</div><div style="font-size:11px;color:var(--t3);margin-bottom:14px">${t("l.login")}</div>`;
  h += `<input class="inp" type="password" id="pinInput" placeholder="PIN" maxlength="6" inputmode="numeric" onkeydown="if(event.key==='Enter')doLogin()" style="margin-bottom:6px;text-align:center;letter-spacing:6px;font-size:18px;font-family:var(--m)">`;
  h += `<div id="pinError" style="color:var(--rd);font-size:11px;margin-bottom:6px;display:none"></div>`;
  h += `<button class="btn btn-p" style="width:100%" onclick="doLogin()">${t("l.login")}</button>`;
  h += `</div></div>`;
  $("#app").innerHTML = h;
  setTimeout(() => { const inp = $("#pinInput"); if (inp) inp.focus(); }, 100);
}

async function doLogin() {
  const pin = $("#pinInput").value;
  if (!pin) return;
  const btn = $(".btn-p");
  if (btn) { btn.disabled = true; btn.textContent = "..."; }

  const user = await sbLoginByPin(pin);
  if (user) {
    startSession(user);
  } else {
    $("#pinError").style.display = "block";
    $("#pinError").textContent = t("l.wrongpin");
    if (btn) { btn.disabled = false; btn.textContent = t("l.login"); }
    $("#pinInput").value = "";
    $("#pinInput").focus();
  }
}

// Đăng nhập được giữ trên máy: mở lại app sau nhiều ngày vẫn vào thẳng, không hỏi PIN.
const SESSION_KEY = "lager_session";
function saveSession() { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: U.id, name: U.name, email: U.email || "", role: U.role, pin: U.pin, standorte: U.standorte, bereiche: U.bereiche, perms: U.perms || null })); } catch {} }
function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }
function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } }

// restored = true: phiên cũ được khôi phục khi mở app → không ghi log "login", initPush do init.js gọi
function startSession(user, restored) {
  U = user;
  saveSession();
  PAGE = U.role === "staff" && can(U.role, "bereiche.view") ? "rst_ma" : can(U.role, "dashboard") ? "dashboard" : "artikel";
  // Offene Inventur (vor Reload/Browser-Neustart) → direkt dort weiterzählen
  if (typeof invRestoreDraft === "function" && invRestoreDraft()) PAGE = "inventur";
  if (restored) return;
  if (typeof logActivity === "function") logActivity("login", U.name, { role: U.role });
  render();
  if (typeof initPush === "function") setTimeout(() => initPush(), 2000);
}

// Beim App-Start: gespeicherte Sitzung übernehmen, wenn der Benutzer noch existiert und der PIN gleich ist
function restoreSession() {
  const s = loadSession();
  if (!s || !s.id) return;
  const fresh = (D.users || []).find(u => u.id === s.id);
  if (!fresh || fresh.pin !== s.pin) { clearSession(); return; }
  startSession(fresh, true);
}

function logout() { if (typeof logActivity === "function" && U) logActivity("logout", U.name); U = null; clearSession(); render(); }

// ═══ NAVIGATION ═══