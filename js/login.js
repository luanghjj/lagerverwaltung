// ═══ LOGIN (PIN-only, from Supabase) ═══
function renderLogin() {
  let h = `<div class="lg-w"><div class="lg-b"><div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px"><div class="theme-sw"><button class="theme-btn ${THEME==="light"?"on":""}" onclick="setTheme('light')">☀</button><button class="theme-btn ${THEME==="dark"?"on":""}" onclick="setTheme('dark')">🌙</button></div><div class="lang-sw"><button class="lang-btn ${LANG==="de"?"on":""}" onclick="setLang('de')">🇩🇪 DE</button><button class="lang-btn ${LANG==="vi"?"on":""}" onclick="setLang('vi')">🇻🇳 VI</button></div></div><div class="lg-t">${esc(D.einstellungen.firmenname)}</div><div style="font-size:11px;color:var(--t3);margin-bottom:14px">${t("l.login")}</div>`;
  h += `<input class="inp" type="password" id="pinInput" placeholder="6-stelliger PIN" maxlength="6" onkeydown="if(event.key==='Enter')doLogin()" style="margin-bottom:6px;text-align:center;letter-spacing:6px;font-size:18px;font-family:var(--m)">`;
  h += `<div id="pinError" style="color:var(--rd);font-size:11px;margin-bottom:6px;display:none"></div>`;
  h += `<button class="btn btn-p" style="width:100%" onclick="doLogin()">${t("l.login")}</button>`;
  h += `</div></div>`;
  $("#app").innerHTML = h;
  setTimeout(() => { const inp = $("#pinInput"); if (inp) inp.focus(); }, 100);
}

async function doLogin() {
  const pin = $("#pinInput").value;
  if (!pin) return;
  // Show loading
  const btn = $(".btn-p");
  if (btn) { btn.disabled = true; btn.textContent = "..."; }

  const user = await sbLoginByPin(pin);
  if (user) {
    U = user;
    PAGE = can(U.role, "dashboard") ? "dashboard" : "artikel";
    if (typeof logActivity === "function") logActivity("login", U.name, {role:U.role});
    render();
    // Đăng ký push notification
    if (typeof initPush === 'function') setTimeout(() => initPush(), 2000);
  } else {
    $("#pinError").style.display = "block";
    $("#pinError").textContent = t("l.wrongpin");
    if (btn) { btn.disabled = false; btn.textContent = t("l.login"); }
    $("#pinInput").value = "";
    $("#pinInput").focus();
  }
}

function logout() { if (typeof logActivity === "function" && U) logActivity("logout", U.name); U = null; render(); }

// ═══ NAVIGATION ═══