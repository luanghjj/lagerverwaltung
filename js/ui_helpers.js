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