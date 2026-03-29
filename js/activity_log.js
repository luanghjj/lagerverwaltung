// ═══ ACTIVITY LOG — Lịch sử hoạt động ═══
// Ghi lại ai làm gì, lúc nào

const LOG_ACTIONS = {
  login:       { icon: "🔑", color: "var(--ac)", de: "Anmeldung",         vi: "Đăng nhập" },
  logout:      { icon: "🚪", color: "var(--t3)", de: "Abmeldung",         vi: "Đăng xuất" },
  eingang:     { icon: "↓",  color: "var(--gn)", de: "Wareneingang",      vi: "Nhập kho" },
  ausgang:     { icon: "↑",  color: "var(--rd)", de: "Warenausgang",      vi: "Xuất kho" },
  "art.create":{ icon: "➕", color: "var(--ac)", de: "Artikel erstellt",   vi: "Tạo SP" },
  "art.edit":  { icon: "✎",  color: "var(--yl)", de: "Artikel bearbeitet", vi: "Sửa SP" },
  "art.delete":{ icon: "🗑", color: "var(--rd)", de: "Artikel gelöscht",   vi: "Xóa SP" },
  "order.create":{ icon:"📋", color:"var(--ac)", de: "Bestellung erstellt", vi: "Tạo đơn" },
  "order.confirm":{ icon:"✓", color:"var(--gn)", de: "Bestellung bestätigt", vi: "Xác nhận đơn" },
  "order.cancel":{ icon:"✕", color:"var(--rd)", de: "Bestellung storniert", vi: "Hủy đơn" },
  transfer:    { icon: "⇄",  color: "var(--pu)", de: "Umbuchung",         vi: "Chuyển kho" },
  inventur:    { icon: "📋", color: "var(--ac)", de: "Inventur",           vi: "Kiểm kê" },
  korrektur:   { icon: "±",  color: "var(--yl)", de: "Korrektur",          vi: "Điều chỉnh" },
  quick:       { icon: "⚡", color: "var(--ac)", de: "Schnellbuchung",     vi: "Nhập/xuất nhanh" },
  auffuellung: { icon: "📦", color: "var(--gn)", de: "Auffüllung",         vi: "Bổ sung" },
  settings:    { icon: "⚙",  color: "var(--t2)", de: "Einstellungen",      vi: "Cài đặt" },
};

// ── Write log entry ──
async function logActivity(action, description, details) {
  if (!U) return;
  const entry = {
    user_id: U.id,
    user_name: U.name,
    action,
    description,
    details: details || {},
    standort_id: STF !== "all" ? STF : ""
  };

  // Save to Supabase (fire & forget)
  if (typeof sb !== "undefined") {
    sb.from("activity_log").insert(entry).then(({ error }) => {
      if (error) console.warn("[Log]", error.message);
    });
  }
}

// ── Render Activity Log page ──
function renderActivityLog(vS, aS) {
  let h = `<div class="mn-h"><div class="mn-t">📜 ${LANG==="vi"?"Lịch sử hoạt động":"Aktivitätsprotokoll"}</div><div class="mn-a"></div></div><div class="mn-c">`;

  // Filter controls
  h += `<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">`;
  h += `<select class="sel" id="logFilterAction" onchange="renderLogTable()" style="min-width:120px"><option value="">${LANG==="vi"?"Tất cả":"Alle"}</option>`;
  Object.entries(LOG_ACTIONS).forEach(([k, v]) => {
    h += `<option value="${k}">${v.icon} ${LANG==="vi"?v.vi:v.de}</option>`;
  });
  h += `</select>`;
  h += `<select class="sel" id="logFilterUser" onchange="renderLogTable()" style="min-width:120px"><option value="">${LANG==="vi"?"Tất cả NV":"Alle MA"}</option>`;
  D.users.forEach(u => { h += `<option value="${u.id}">${esc(u.name)}</option>`; });
  h += `</select>`;
  h += `<select class="sel" id="logFilterDays" onchange="renderLogTable()" style="min-width:80px">
    <option value="1">${LANG==="vi"?"Hôm nay":"Heute"}</option>
    <option value="3" selected>3 ${LANG==="vi"?"ngày":"Tage"}</option>
    <option value="7">7 ${LANG==="vi"?"ngày":"Tage"}</option>
    <option value="30">30 ${LANG==="vi"?"ngày":"Tage"}</option>
  </select>`;
  h += `</div>`;

  // Table container
  h += `<div id="logTableWrap"><div style="text-align:center;padding:20px;color:var(--t3)">⏳ ${LANG==="vi"?"Đang tải...":"Laden..."}</div></div>`;

  h += `</div>`;

  // Auto-load after render
  setTimeout(() => renderLogTable(), 100);

  return h;
}

async function renderLogTable() {
  const wrap = document.getElementById("logTableWrap");
  if (!wrap) return;

  const actionFilter = document.getElementById("logFilterAction")?.value || "";
  const userFilter = document.getElementById("logFilterUser")?.value || "";
  const days = parseInt(document.getElementById("logFilterDays")?.value) || 3;

  const since = new Date();
  since.setDate(since.getDate() - days);

  wrap.innerHTML = `<div style="text-align:center;padding:20px;color:var(--t3)">⏳</div>`;

  try {
    let query = sb.from("activity_log").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(200);
    if (actionFilter) query = query.eq("action", actionFilter);
    if (userFilter) query = query.eq("user_id", userFilter);
    const { data, error } = await query;
    if (error) throw error;

    if (!data?.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:30px;color:var(--t3)">— ${LANG==="vi"?"Chưa có hoạt động":"Keine Aktivitäten"} —</div>`;
      return;
    }

    let h = `<div class="tw"><table><thead><tr>`;
    h += `<th style="width:140px">${t("c.date")}</th>`;
    h += `<th style="width:100px">${LANG==="vi"?"NV":"MA"}</th>`;
    h += `<th style="width:100px">${LANG==="vi"?"Hành động":"Aktion"}</th>`;
    h += `<th>${LANG==="vi"?"Chi tiết":"Details"}</th>`;
    h += `</tr></thead><tbody>`;

    // Group by date
    let lastDate = "";
    data.forEach(log => {
      const dt = new Date(log.created_at);
      const dateStr = dt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeStr = dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (dateStr !== lastDate) {
        h += `<tr><td colspan="4" style="background:var(--b3);font-weight:700;font-size:11px;padding:6px 8px;color:var(--ac)">📅 ${dateStr}</td></tr>`;
        lastDate = dateStr;
      }

      const act = LOG_ACTIONS[log.action] || { icon: "•", color: "var(--t2)", de: log.action, vi: log.action };
      const user = D.users.find(u => u.id === log.user_id);
      const roleBg = user ? (ROLES[user.role]?.color || "var(--t3)") : "var(--t3)";

      h += `<tr style="border-bottom:1px solid var(--bd)">`;
      h += `<td style="font-family:var(--m);font-size:10.5px;white-space:nowrap;color:var(--t2)">${timeStr}</td>`;
      h += `<td><span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:${roleBg};display:inline-block"></span><span style="font-size:11px;font-weight:600">${esc(log.user_name || "?")}</span></span></td>`;
      h += `<td><span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:2px 6px;border-radius:4px;background:${act.color}15;color:${act.color};font-weight:600">${act.icon} ${LANG==="vi"?act.vi:act.de}</span></td>`;
      h += `<td style="font-size:11.5px;color:var(--t2)">${esc(log.description || "")}</td>`;
      h += `</tr>`;
    });

    h += `</tbody></table></div>`;
    h += `<div style="margin-top:8px;font-size:10px;color:var(--t3);text-align:right">${data.length} ${LANG==="vi"?"hoạt động":"Einträge"}</div>`;

    wrap.innerHTML = h;
  } catch (e) {
    wrap.innerHTML = `<div style="text-align:center;padding:20px;color:var(--rd)">❌ ${e.message}</div>`;
  }
}
