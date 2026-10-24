// ═══ UI HELPERS: Toast, Confirm, Print, Download, Debounce, Offline ═══

// ═══ DEBOUNCE LOCK (prevent double-click on critical actions) ═══
let _actionLock = false;
function withLock(fn) {
  if (_actionLock) return;
  _actionLock = true;
  try { fn(); } finally { setTimeout(() => { _actionLock = false; }, 1500); }
}

// ═══ TOAST ═══
function openPrintHTML(html) {
  // Show in modal with print button
  let mh = `<div class="mo-ov" onclick="closeModal()" style="z-index:200"><div class="mo mo-xl" onclick="event.stopPropagation()" style="max-height:95vh;display:flex;flex-direction:column"><div class="mo-h"><div class="mo-ti">🖨 ${LANG==="vi"?"Xem trước in":"Druckvorschau"}</div><div style="display:flex;gap:4px"><button class="btn btn-p btn-sm" onclick="document.getElementById('printFrame').contentWindow.print()">🖨 ${LANG==="vi"?"In":"Drucken"}</button><button class="bi" onclick="closeModal()">✕</button></div></div><div style="flex:1;overflow:hidden;padding:0"><iframe id="printFrame" style="width:100%;height:100%;border:none;min-height:500px"></iframe></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", mh);
  const frame = document.getElementById("printFrame");
  frame.srcdoc = html;
}

function dlFile(content, filename, mimeType) {
  try {
    // Try blob download first
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch(e) {
    // Fallback: data URI
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const a = document.createElement("a");
    a.href = `data:${mimeType};base64,${b64}`;
    a.download = filename; a.click();
  }
}

function toast(msg, type="s") {
  const d = document.createElement("div"); d.className = `tst tst-${type}`; d.textContent = msg;
  $("#toasts").appendChild(d); setTimeout(() => d.remove(), 3000);
}

// Custom confirm (replaces native confirm which is blocked in iframes)
function cConfirm(msg, onYes) {
  let h = `<div class="mo-ov" id="cConfirmOv" style="z-index:300"><div class="mo" style="max-width:400px" onclick="event.stopPropagation()"><div class="mo-b" style="padding:20px;text-align:center">`;
  h += `<div style="font-size:28px;margin-bottom:8px">⚠</div>`;
  h += `<div style="font-size:13px;font-weight:500;color:var(--tx);white-space:pre-line;line-height:1.5;margin-bottom:16px">${esc(msg)}</div>`;
  h += `<div style="display:flex;gap:6px;justify-content:center"><button class="btn btn-o" style="min-width:80px" id="cConfirmNo">${t("c.cancel")}</button><button class="btn btn-p" style="min-width:80px" id="cConfirmYes">${LANG==="vi"?"Xác nhận":"Bestätigen"}</button></div>`;
  h += `</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
  document.getElementById("cConfirmNo").onclick = () => { document.getElementById("cConfirmOv")?.remove(); };
  document.getElementById("cConfirmYes").onclick = () => { document.getElementById("cConfirmOv")?.remove(); onYes(); };
  document.getElementById("cConfirmOv").onclick = () => { document.getElementById("cConfirmOv")?.remove(); };
}
// ═══ BUCHUNGS-ZUSAMMENFASSUNG (kopierbarer Text nach Buchung) ═══
// Menge im eingestellten Artikel-Format: Gebinde (z.B. "4 Karton", "2 Karton + 3 Stk.") oder Basis-Einheit
function fmtQtyUnit(qty, a) {
  return formatUnitConv(qty, a) || `${qty} ${a?.einheit || ""}`.trim();
}
// Lokale Zeit (nw() liefert UTC ohne "Z")
function bookNowStr() {
  return new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
// blocks: [{title, lines:[{a, menge}], changes:[{a, alt, neu}], extra:[string]}]
function buildBookingText(blocks) {
  const chgL = LANG==="vi" ? "Thay đổi tồn kho" : "Bestandsänderung";
  return blocks.filter(b => b.lines.length || b.extra?.length).map(b => {
    let s = `${b.title}:\n` + b.lines.map(l => `•  ${artN(l.a)} ${fmtQtyUnit(l.menge, l.a)}`).join("\n");
    if (b.extra?.length) s += "\n" + b.extra.join("\n");
    if (b.changes?.length) s += `\n\n${chgL}:\n` + b.changes.map(c => `•  ${artN(c.a)}: ${c.alt} → ${c.neu} ${c.a?.einheit||""}`.trimEnd()).join("\n");
    return s;
  }).join("\n\n────────\n\n");
}
function showBookingSummary(text) {
  if (!text) return;
  document.getElementById("bookSumOv")?.remove();
  let h = `<div class="mo-ov" id="bookSumOv" style="z-index:250"><div class="mo mo-w" onclick="event.stopPropagation()"><div class="mo-h"><div class="mo-ti"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:4px"><polyline points="20 6 9 17 4 12"/></svg>${LANG==="vi"?"Đã ghi nhận":"Buchung abgeschlossen"}</div><button class="bi" onclick="closeBookingSummary()">✕</button></div><div class="mo-b">`;
  h += `<textarea class="inp" id="bookSumText" readonly style="width:100%;min-height:240px;font-family:var(--m);font-size:13px;line-height:1.5;resize:vertical;white-space:pre"></textarea>`;
  h += `</div><div class="mo-f"><button class="btn btn-o" onclick="closeBookingSummary()">${LANG==="vi"?"Đóng":"Schließen"}</button><button class="btn btn-p" onclick="copyBookingText()"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:4px"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>${LANG==="vi"?"Sao chép":"Kopieren"}</button></div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", h);
  document.getElementById("bookSumText").value = text;
}
function closeBookingSummary() { document.getElementById("bookSumOv")?.remove(); }
function copyBookingText() {
  const ta = document.getElementById("bookSumText");
  if (!ta) return;
  const ok = () => toast(LANG==="vi"?"Đã sao chép ✓":"Kopiert ✓","s");
  const fallback = () => {
    ta.removeAttribute("readonly"); ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
    let done = false; try { done = document.execCommand("copy"); } catch {}
    ta.setAttribute("readonly", "");
    done ? ok() : toast(LANG==="vi"?"Không sao chép được – hãy chọn và copy thủ công":"Kopieren fehlgeschlagen – bitte manuell markieren","e");
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ta.value).then(ok).catch(fallback);
  else fallback();
}
