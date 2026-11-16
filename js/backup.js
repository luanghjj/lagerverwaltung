// ═══ DATEN SICHERN — xuất bản dữ liệu đang lưu trên máy (localStorage) ra file ═══
// Dùng khi server không tải được: mỗi máy từng mở app còn giữ một bản sao trong bộ nhớ trình duyệt.
// Chỉ đọc localStorage, không sửa dữ liệu, không gửi lên server.

function backupInfo() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SK) || "null"); } catch {}
  if (!d) return null;
  const last = (d.bewegungen || []).map(b => b.datum).filter(Boolean).sort().pop() || "";
  // Máy chưa từng tải dữ liệu thật thì app tự lưu dữ liệu mẫu (DEF, kho "s1"/"s2") → không phải bản sao thật
  const demo = (d.standorte || []).every(s => /^s\d+$/.test(s.id));
  return { artikel: (d.artikel || []).length, bewegungen: (d.bewegungen || []).length, standorte: (d.standorte || []).length, last, demo };
}

function backupLabel() {
  const i = backupInfo();
  if (!i) return LANG === "vi" ? "Máy này không có dữ liệu" : "Keine Daten auf diesem Gerät";
  if (i.demo) return LANG === "vi" ? "⚠ Máy này chỉ có dữ liệu mẫu (demo), không phải dữ liệu thật" : "⚠ Nur Demo-Daten auf diesem Gerät, keine echten Daten";
  const day = i.last ? i.last.slice(0, 10) : "?";
  return `${i.artikel} Artikel · ${i.bewegungen} ${LANG === "vi" ? "Bewegung" : "Bewegungen"} · ${LANG === "vi" ? "mới nhất" : "zuletzt"} ${day}`;
}

async function backupLocalData() {
  const i = backupInfo();
  if (!i || i.demo) { toast(backupLabel(), "e"); return; }
  const all = {};
  for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); all[key] = localStorage.getItem(key); }
  all._backup_meta = JSON.stringify({ erstellt: new Date().toISOString(), userAgent: navigator.userAgent, ...i });
  const day = i.last ? i.last.slice(0, 10) : "x";
  const name = `lager-backup-${new Date().toISOString().slice(0, 10)}-stand-${day}.json`;
  const json = JSON.stringify(all);
  try {
    const file = new File([json], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name, text: backupLabel() });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // người dùng tự đóng hộp chia sẻ
  }
  dlFile(json, name, "application/json");
}

// Nút nổi khi app đang chạy bằng dữ liệu cũ trên máy (server không tải được)
function showBackupFab() {
  if (document.getElementById("backupFab")) return;
  const b = document.createElement("button");
  b.id = "backupFab";
  b.onclick = backupLocalData;
  b.textContent = "💾 " + (LANG === "vi" ? "Sao lưu dữ liệu" : "Daten sichern");
  b.style.cssText = "position:fixed;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:10001;padding:10px 14px;border:0;border-radius:20px;background:var(--rd,#ef4444);color:#fff;font-weight:700;font-size:13px;font-family:var(--f);box-shadow:0 4px 16px rgba(0,0,0,.35)";
  document.body.appendChild(b);
}
