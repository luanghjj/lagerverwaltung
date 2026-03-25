// ═══ TELEGRAM NOTIFICATIONS ═══
function sendTG(eventType, msg, standortId) {
  const s = D.einstellungen;
  if (!s.telegramBenachrichtigung) return;
  if (!s.tgEvents) s.tgEvents = {bestellung:true,eingang:true,ausgang:true,transfer:true,inventur:true,kritisch:true};
  if (!s.tgEvents[eventType]) return;
  if (!s.tgChannels || !s.tgChannels.length) return;
  const fullMsg = `🏢 *${s.firmenname}*\n${msg}`;

  // Send to all matching channels
  s.tgChannels.forEach(ch => {
    if (!ch.token || !ch.chatId) return;
    // Check standort assignment
    const matchStandort = !standortId || !ch.standorte || ch.standorte.includes("all") || ch.standorte.includes(standortId);
    if (!matchStandort) return;
    fetch(`https://api.telegram.org/bot${ch.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: ch.chatId, text: fullMsg, parse_mode: "Markdown" })
    }).catch(() => {});
  });
}

function testTgChannel(idx) {
  const ch = D.einstellungen.tgChannels?.[idx];
  if (!ch || !ch.token || !ch.chatId) {
    toast(LANG==="vi"?"Vui lòng nhập Token và Chat ID":"Bitte Token und Chat ID eingeben","e"); return;
  }
  const stNames = ch.standorte?.includes("all") ? (LANG==="vi"?"Tất cả":"Alle") : (ch.standorte||[]).map(sId=>D.standorte.find(s=>s.id===sId)?.name||"?").join(", ");
  const msg = `🧪 *Test: ${esc(ch.name||"Kanal")}*\n\n✅ Verbindung funktioniert!\n📍 ${D.einstellungen.firmenname}\n🏪 ${stNames}\n👤 ${U?.name||"?"}\n🕐 ${nw()}`;
  toast(LANG==="vi"?"Đang gửi...":"Sende...","i");
  fetch(`https://api.telegram.org/bot${ch.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: ch.chatId, text: msg, parse_mode: "Markdown" })
  }).then(r=>r.json()).then(data => {
    if (data.ok) toast(`✅ ${ch.name||"Kanal"}: ${LANG==="vi"?"OK":"Gesendet"}!`,"s");
    else toast(`❌ ${ch.name}: ${data.description||"Fehler"}`,"e");
  }).catch(e => {
    if (window.self !== window.top) toast(`⚠ ${LANG==="vi"?"Preview blockiert":"Im Preview blockiert"}`,"e");
    else toast(`❌ ${e.message||"Fehler"}`,"e");
  });
}

function editTgChannel(idx) {
  const isNew = idx < 0;
  const ch = isNew ? {id:uid(),name:"",token:"",chatId:"",standorte:["all"]} : JSON.parse(JSON.stringify(D.einstellungen.tgChannels[idx]));
  window._tgChForm = ch;
  window._tgChIdx = idx;

  let h = `<div class="mo-ov" onclick="closeModal()"><div class="mo" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti">${isNew?(LANG==="vi"?"Thêm kênh":"Kanal hinzufügen"):(LANG==="vi"?"Chỉnh sửa kênh":"Kanal bearbeiten")}</div><button class="bi" onclick="closeModal()">✕</button></div><div class="mo-b">`;
  h += `<div class="fg"><label>${t("c.name")} *</label><input class="inp" id="tgch_name" value="${esc(ch.name)}" placeholder="${LANG==="vi"?"VD: Origami Stuttgart":"z.B. Origami Stuttgart"}"></div>`;
  h += `<div class="fg"><label>Bot Token *</label><input class="inp" id="tgch_token" value="${esc(ch.token)}" placeholder="123456789:AAH..." style="font-family:var(--m);font-size:11px"></div>`;
  h += `<div class="fg"><label>Chat ID *</label><input class="inp" id="tgch_chatid" value="${esc(ch.chatId)}" placeholder="-100123456789" style="font-family:var(--m);font-size:11px"></div>`;

  // Standort assignment
  h += `<div class="fg"><label>${LANG==="vi"?"Gán cho chi nhánh":"Zugewiesen an Standorte"}</label>`;
  h += `<div class="mc" id="tgch_standorte">`;
  h += renderTgChStandorte(ch);
  h += `</div></div>`;

  h += `<div style="padding:6px 8px;background:var(--b3);border-radius:6px;font-size:10.5px;color:var(--t2);margin-top:4px">💡 ${LANG==="vi"?"Mỗi kênh nhận thông báo chỉ cho các chi nhánh được chọn. Chọn 'Alle' để nhận tất cả.":"Jeder Kanal erhält nur Benachrichtigungen für die zugewiesenen Standorte. 'Alle' = alles empfangen."}</div>`;

  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeModal()">${t("c.cancel")}</button><button class="btn btn-p" onclick="saveTgChannel()">${t("c.save")}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
}

function renderTgChStandorte(ch) {
  const allOn = (ch.standorte||["all"]).includes("all");
  let h = `<div class="mc-it ${allOn?"checked":""}" onclick="tgChTogSt('all')">${allOn?"✓":"○"} ${LANG==="vi"?"Tất cả":"Alle Standorte"}</div>`;
  if (!allOn) {
    D.standorte.forEach(s => {
      const on = (ch.standorte||[]).includes(s.id);
      h += `<div class="mc-it ${on?"checked":""}" onclick="tgChTogSt('${s.id}')">${on?"✓":"○"} ${esc(s.name)}</div>`;
    });
  }
  return h;
}

function tgChTogSt(sId) {
  const ch = window._tgChForm;
  if (!ch.standorte) ch.standorte = ["all"];
  if (sId === "all") {
    ch.standorte = ch.standorte.includes("all") ? [] : ["all"];
  } else {
    ch.standorte = ch.standorte.filter(x=>x!=="all");
    const idx = ch.standorte.indexOf(sId);
    if (idx >= 0) ch.standorte.splice(idx,1); else ch.standorte.push(sId);
  }
  const container = document.getElementById("tgch_standorte");
  if (container) container.innerHTML = renderTgChStandorte(ch);
}

function saveTgChannel() {
  const ch = window._tgChForm;
  const idx = window._tgChIdx;
  ch.name = document.getElementById("tgch_name")?.value?.trim()||"";
  ch.token = document.getElementById("tgch_token")?.value?.trim()||"";
  ch.chatId = document.getElementById("tgch_chatid")?.value?.trim()||"";
  if (!ch.token || !ch.chatId) { toast(LANG==="vi"?"Vui lòng nhập Token và Chat ID":"Bitte Token und Chat ID eingeben","e"); return; }
  if (!ch.name) ch.name = `Kanal ${(D.einstellungen.tgChannels?.length||0)+1}`;
  if (!D.einstellungen.tgChannels) D.einstellungen.tgChannels = [];
  if (idx < 0) D.einstellungen.tgChannels.push(ch);
  else D.einstellungen.tgChannels[idx] = ch;
  save(); closeModal(); render();
  toast("✓","s");
}

function removeTgChannel(idx) {
  const ch = D.einstellungen.tgChannels?.[idx];
  cConfirm(`${LANG==="vi"?"Xóa kênh":"Kanal löschen"} "${ch?.name||""}"?`, () => {
    D.einstellungen.tgChannels.splice(idx,1);
    save(); render(); toast("✓","i");
  });
}

function testTelegram() {
  // Legacy: test first channel
  if (D.einstellungen.tgChannels?.length) testTgChannel(0);
  else toast(LANG==="vi"?"Chưa có kênh":"Kein Kanal konfiguriert","e");
}

function tgCheckKritisch() {
  // Send per-Standort so each channel only gets its own
  D.standorte.forEach(s => {
    const kritisch = [];
    D.artikel.forEach(a => {
      const ist = a.istBestand[s.id]||0;
      const min = a.mindestmenge[s.id]||0;
      if (min > 0 && ist <= min && ist > 0) kritisch.push(`⚠ ${artN(a)}: ${ist}/${min} ${a.einheit}`);
      else if (min > 0 && ist === 0) kritisch.push(`🔴 ${artN(a)}: LEER (Min ${min})`);
    });
    if (kritisch.length) {
      sendTG("kritisch", `🔴 *${kritisch.length} ${LANG==="vi"?"SP tồn kho thấp":"kritische Bestände"}*\n📍 ${s.name}\n\n${kritisch.slice(0,15).join("\n")}${kritisch.length>15?"\n... +"+(kritisch.length-15)+" weitere":""}`, s.id);
    }
  });
}
