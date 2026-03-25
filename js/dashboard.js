// ═══ DASHBOARD v2 — Full Redesign ═══

function renderDashboard(vS, aS) {
  const sids = aS ? [aS] : vS.map(s => s.id);

  // ─── Compute KPIs (filtered by sids) ───
  const totalArt = D.artikel.length;
  const wert = D.artikel.reduce((s, a) => {
    const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
    return s + sids.reduce((x, sid) => x + (a.istBestand[sid] || 0), 0) * bp;
  }, 0);
  const tBew = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum?.slice(0, 10) === td());
  const tWE = tBew.filter(b => b.typ === "eingang").reduce((s, b) => s + (b.menge || 0), 0);
  const tWA = tBew.filter(b => b.typ === "ausgang").reduce((s, b) => s + (b.menge || 0), 0);
  const fS = vS.filter(s => sids.includes(s.id)); // filtered standorte
  const crit = D.artikel.filter(a => fS.some(s => {
    const ist = a.istBestand[s.id] || 0, min = a.mindestmenge[s.id] || 0;
    return min > 0 && ist <= min;
  }));
  const openOrders = D.bestellungen.filter(b => b.status === "bestellt" && sids.includes(b.standortId)).length;
  const pendingTransfers = (D.transfers || []).filter(tf => tf.status === "unterwegs" && (sids.includes(tf.vonId) || sids.includes(tf.nachId))).length;
  const openAnforderungen = (D.anforderungen || []).filter(a => a.status === "offen").length;

  // ─── 7-day movement data ───
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const k = dt.toISOString().slice(0, 10);
    const dayBew = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum?.slice(0, 10) === k);
    days7.push({
      date: k,
      label: dt.toLocaleDateString(LANG === "vi" ? "vi-VN" : "de-DE", { weekday: "short" }),
      dayNum: dt.getDate(),
      we: dayBew.filter(b => b.typ === "eingang").reduce((s, b) => s + b.menge, 0),
      wa: dayBew.filter(b => b.typ === "ausgang").reduce((s, b) => s + b.menge, 0),
      total: dayBew.length
    });
  }

  // ─── Stock health ───
  let hOK = 0, hWarn = 0, hCrit = 0, hEmpty = 0;
  D.artikel.forEach(a => {
    sids.forEach(sid => {
      const ist = a.istBestand[sid] || 0, soll = a.sollBestand[sid] || 0, min = a.mindestmenge[sid] || 0;
      if (min > 0 && ist === 0) hEmpty++;
      else if (min > 0 && ist <= min) hCrit++;
      else if (soll > 0 && ist < soll * 0.7) hWarn++;
      else hOK++;
    });
  });
  const hTotal = hOK + hWarn + hCrit + hEmpty;

  // ─── Category breakdown ───
  const catData = D.kategorien.map(k => {
    const arts = D.artikel.filter(a => a.kategorien.includes(k.id));
    const val = arts.reduce((s, a) => {
      const bp = a.lieferanten.length ? Math.min(...a.lieferanten.map(l => l.preis)) : 0;
      return s + sids.reduce((x, sid) => x + (a.istBestand[sid] || 0), 0) * bp;
    }, 0);
    return { id: k.id, name: katN(k), farbe: k.farbe, count: arts.length, wert: val };
  }).filter(c => c.count > 0).sort((a, b) => b.wert - a.wert);
  const maxCatWert = Math.max(...catData.map(c => c.wert), 1);

  // ─── Top movers (7d) ───
  const cut7 = new Date(); cut7.setDate(cut7.getDate() - 7);
  const bew7 = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum >= cut7.toISOString());
  const topOut = {};
  bew7.filter(b => b.typ === "ausgang").forEach(b => { topOut[b.artikelId] = (topOut[b.artikelId] || 0) + b.menge; });
  const topMovers = Object.entries(topOut).map(([id, m]) => ({ art: D.artikel.find(x => x.id === id), menge: m })).filter(x => x.art).sort((a, b) => b.menge - a.menge).slice(0, 6);
  const maxMover = topMovers.length ? topMovers[0].menge : 1;

  // ─── Yesterday comparison ───
  const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
  const yK = yDate.toISOString().slice(0, 10);
  const yBew = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum?.slice(0, 10) === yK);
  const yWE = yBew.filter(b => b.typ === "eingang").reduce((s, b) => s + b.menge, 0);
  const yWA = yBew.filter(b => b.typ === "ausgang").reduce((s, b) => s + b.menge, 0);

  // ═══════════════════════════════════════
  // BUILD HTML
  // ═══════════════════════════════════════

  let h = `<div class="mn-h"><div class="mn-t">${t("nav.dashboard")}</div><div class="mn-a">`;
  if (can(U.role, "export")) {
    h += `<button class="btn btn-o btn-sm" onclick="exportExcel()">⬇ ${t("x.excel")}</button>`;
    h += `<button class="btn btn-o btn-sm" onclick="exportPDF()">⬇ ${t("x.pdf")}</button>`;
  }
  h += `</div></div><div class="mn-c">`;

  // ═══ ROW 1: KPI CARDS (colored backgrounds like reference design) ═══
  h += `<div class="sg dash-kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:14px">`;

  // Total articles — Blue (always visible)
  h += kpiCard(t("d.totalart"), totalArt, "", "#3B82F6", `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10"/></svg>`);

  // Stock value — Green (hide on mobile)
  if (canP()) h += kpiCard(t("d.stockval"), fC(wert), "", "#10B981", `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6a2 2 0 010 4H9"/></svg>`, false, "kpi-secondary");

  // Critical — Red / Green (always visible)
  h += kpiCard(t("d.critical"), crit.length, "", crit.length ? "#EF4444" : "#10B981", crit.length ? `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>` : `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>`, crit.length > 0);

  // Open orders — Amber (hide on mobile)
  h += kpiCard(LANG === "vi" ? "Đơn đang chờ" : "Offene Best.", openOrders, "", "#F59E0B", `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`, false, "kpi-secondary");

  // WE today — Teal (always visible)
  h += kpiCard(t("d.intoday"), `+${tWE}`, trendBadge(tWE, yWE), "#14B8A6", "↓", false);

  // WA today — Rose (always visible)
  h += kpiCard(t("d.outtoday"), `−${tWA}`, trendBadge(tWA, yWA), "#F43F5E", "↑", false);

  h += `</div>`;

  // ═══ ROW 2: CHARTS AREA ═══
  h += `<div style="display:grid;grid-template-columns:1fr 280px;gap:10px;margin-bottom:14px" class="dash-charts">`;

  // ─── LEFT: 7-Day Area Chart (SVG) ───
  h += `<div class="sc" style="padding:14px">`;
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  h += `<div style="font-size:14px;font-weight:700">${LANG === "vi" ? "Bestandsbewegungen (7 ngày)" : "Bestandsbewegungen (Letzte 7 Tage)"}</div>`;
  h += `<div style="display:flex;gap:12px;font-size:11px"><span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#10B981"></span> ${LANG === "vi" ? "Nhập" : "Ein"}</span><span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#EF4444"></span> ${LANG === "vi" ? "Xuất" : "Aus"}</span></div>`;
  h += `</div>`;

  // SVG Area Chart
  const svgW = 700, svgH = 280, padL = 45, padR = 20, padT = 35, padB = 50;
  const chartW = svgW - padL - padR, chartH = svgH - padT - padB;
  const maxVal = Math.max(...days7.map(d => Math.max(d.we, d.wa)), 10);
  // Scale: zero line at center, positive up, negative down
  const zeroY = padT + chartH / 2;
  const scaleY = (chartH / 2) / maxVal;
  const stepX = chartW / (days7.length - 1 || 1);

  // Build point arrays
  const wePoints = days7.map((d, i) => ({ x: padL + i * stepX, y: zeroY - d.we * scaleY, val: d.we }));
  const waPoints = days7.map((d, i) => ({ x: padL + i * stepX, y: zeroY + d.wa * scaleY, val: d.wa }));

  // Build SVG path for smooth curves (catmull-rom to bezier)
  function svgAreaPath(pts, baseY) {
    if (pts.length < 2) return "";
    let path = `M${pts[0].x},${baseY} L${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    path += ` L${pts[pts.length - 1].x},${baseY} Z`;
    return path;
  }
  function svgLinePath(pts) {
    if (pts.length < 2) return "";
    let path = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  }

  // Y-axis grid values
  const gridSteps = [maxVal, Math.round(maxVal / 2), 0, -Math.round(maxVal / 2), -maxVal];

  h += `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;display:block">`;
  h += `<defs><linearGradient id="grnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10B981" stop-opacity=".35"/><stop offset="100%" stop-color="#10B981" stop-opacity=".05"/></linearGradient>`;
  h += `<linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EF4444" stop-opacity=".05"/><stop offset="100%" stop-color="#EF4444" stop-opacity=".35"/></linearGradient></defs>`;

  // Grid lines + Y labels
  gridSteps.forEach(v => {
    const y = zeroY - v * scaleY;
    const isZero = v === 0;
    h += `<line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="${isZero ? "var(--bd2)" : "var(--bd)"}" stroke-width="${isZero ? 1.5 : 0.5}" ${isZero ? "" : 'stroke-dasharray="4,4"'}/>`;
    h += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="var(--t3)" font-size="10" font-family="var(--m)">${v > 0 ? "+" : ""}${v}</text>`;
  });

  // Green area (Eingang — above zero)
  h += `<path d="${svgAreaPath(wePoints, zeroY)}" fill="url(#grnGrad)"/>`;
  h += `<path d="${svgLinePath(wePoints)}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>`;

  // Red area (Ausgang — below zero)
  h += `<path d="${svgAreaPath(waPoints, zeroY)}" fill="url(#redGrad)"/>`;
  h += `<path d="${svgLinePath(waPoints)}" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round"/>`;

  // Data points + value labels
  wePoints.forEach((p, i) => {
    if (p.val > 0) {
      h += `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#10B981" stroke="#fff" stroke-width="2"/>`;
      h += `<text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700" font-family="var(--m)">+${p.val}</text>`;
    }
  });
  waPoints.forEach((p, i) => {
    if (p.val > 0) {
      h += `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#EF4444" stroke="#fff" stroke-width="2"/>`;
      h += `<text x="${p.x}" y="${p.y + 18}" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700" font-family="var(--m)">−${p.val}</text>`;
    }
  });

  // X-axis labels (day names)
  days7.forEach((d, i) => {
    const x = padL + i * stepX;
    const isToday = d.date === td();
    h += `<text x="${x}" y="${svgH - 22}" text-anchor="middle" fill="${isToday ? "var(--ac)" : "var(--t2)"}" font-size="${isToday ? 13 : 11}" font-weight="${isToday ? 800 : 500}" font-family="var(--f)">${d.label}</text>`;
    h += `<text x="${x}" y="${svgH - 8}" text-anchor="middle" fill="var(--t3)" font-size="10" font-family="var(--m)">${d.dayNum}.</text>`;
  });

  h += `</svg>`;

  // Summary line
  const sum7WE = days7.reduce((s, d) => s + d.we, 0);
  const sum7WA = days7.reduce((s, d) => s + d.wa, 0);
  h += `<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:8px;border-top:1px solid var(--bd);font-size:11px;color:var(--t2)">`;
  h += `<span>Σ <b style="color:var(--gn)">+${sum7WE}</b> ${LANG === "vi" ? "nhập" : "Ein"} / <b style="color:var(--rd)">−${sum7WA}</b> ${LANG === "vi" ? "xuất" : "Aus"}</span>`;
  h += `<span>Ø ${(days7.reduce((s, d) => s + d.total, 0) / 7).toFixed(1)} ${LANG === "vi" ? "lần/ngày" : "Buch./Tag"}</span>`;
  h += `</div></div>`;

  // ─── RIGHT: Stock Health Ring ───
  h += `<div class="sc" style="padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center">`;
  h += `<div style="font-size:13px;font-weight:700;margin-bottom:10px;align-self:flex-start">${LANG === "vi" ? "Tình trạng kho" : "Lagergesundheit"}</div>`;

  // SVG Donut
  const radius = 54, stroke = 12, circ = 2 * Math.PI * radius;
  const segments = [
    { count: hOK, color: "var(--gn)", label: "OK" },
    { count: hWarn, color: "var(--yl)", label: LANG === "vi" ? "Thấp" : "Niedrig" },
    { count: hCrit, color: "var(--rd)", label: LANG === "vi" ? "Nguy hiểm" : "Kritisch" },
    { count: hEmpty, color: "#7F1D1D", label: LANG === "vi" ? "Hết" : "Leer" },
  ];
  let offset = 0;
  h += `<svg width="140" height="140" viewBox="0 0 140 140" style="transform:rotate(-90deg)">`;
  segments.forEach(seg => {
    if (seg.count === 0) return;
    const pct = seg.count / hTotal;
    const dashLen = circ * pct;
    h += `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dashLen} ${circ - dashLen}" stroke-dashoffset="-${offset}"/>`;
    offset += dashLen;
  });
  h += `</svg>`;
  h += `<div style="position:relative;margin-top:-95px;margin-bottom:45px;text-align:center">`;
  h += `<div style="font-size:22px;font-weight:800;font-family:var(--m);color:${hCrit + hEmpty > 0 ? "var(--rd)" : hWarn > 0 ? "var(--yl)" : "var(--gn)"}">${hTotal > 0 ? Math.round(hOK / hTotal * 100) : 100}%</div>`;
  h += `<div style="font-size:9px;color:var(--t3)">${LANG === "vi" ? "bình thường" : "im Soll"}</div>`;
  h += `</div>`;

  // Legend
  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;width:100%">`;
  segments.forEach(seg => {
    if (seg.count === 0 && seg.label !== "OK") return;
    h += `<div style="display:flex;align-items:center;gap:4px;font-size:10.5px">`;
    h += `<span style="width:8px;height:8px;border-radius:2px;background:${seg.color};flex-shrink:0"></span>`;
    h += `<span style="color:var(--t2)">${seg.label}</span>`;
    h += `<span style="font-weight:700;margin-left:auto;font-family:var(--m)">${seg.count}</span>`;
    h += `</div>`;
  });
  h += `</div></div>`;

  h += `</div>`; // end charts row

  // ═══ ROW 3: QUICK ACTIONS (large, prominent) ═══
  h += `<div style="margin-bottom:14px">`;
  h += `<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">${LANG === "vi" ? "Thao tác nhanh" : "Schnellaktionen"}</div>`;
  h += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" class="dash-qa-grid">`;

  if (can(U.role, "eingang")) {
    h += qaBtn("↓ " + t("nav.goodsin"), "#10B981", "goPage('eingang')", `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>`);
  }
  if (can(U.role, "ausgang")) {
    h += qaBtn("↑ " + t("nav.goodsout"), "#F43F5E", "goPage('ausgang')", `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 21V9m0 0l4 4m-4-4l-4 4M5 3h14"/></svg>`);
  }
  if (can(U.role, "bestellliste")) h += qaBtn((LANG === "vi" ? "Đặt hàng" : "Bestellen") + (crit.length ? ` (${crit.length} ⚠)` : ""), "#3B82F6", "goPage('bestellliste')", `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`);
  if (can(U.role, "transfer")) h += qaBtn("⇄ " + (LANG === "vi" ? "Chuyển kho" : "Umbuchen"), "#8B5CF6", "goPage('transfer')", `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 12h16m0 0l-4-4m4 4l-4 4"/></svg>`, "qa-hide-mob");
  if (can(U.role, "inventur")) h += qaBtn("📋 " + (LANG === "vi" ? "Kiểm kê" : "Inventur"), "#F59E0B", "goPage('inventur')", `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12l2 2 4-4"/></svg>`);

  h += `</div></div>`;

  // ═══ ROW 4: TWO COLUMNS ═══
  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px" class="dash-cols">`;

  // ─── LEFT: Category Breakdown ───
  h += `<div class="sc" style="padding:14px">`;
  h += `<div style="font-size:13px;font-weight:700;margin-bottom:8px">${LANG === "vi" ? "Theo danh mục" : "Kategorien"}</div>`;
  catData.forEach(c => {
    const pct = c.wert / maxCatWert * 100;
    h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">`;
    h += `<div style="width:4px;height:22px;border-radius:2px;background:${c.farbe};flex-shrink:0"></div>`;
    h += `<div style="flex:1;min-width:0">`;
    h += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</span><span style="color:var(--t3);flex-shrink:0;margin-left:4px">${c.count} ${LANG === "vi" ? "SP" : "Art."}</span></div>`;
    h += `<div style="height:5px;background:var(--b4);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${c.farbe};border-radius:3px;opacity:.7"></div></div>`;
    if (canP()) h += `<div style="font-size:9px;color:var(--t3);margin-top:1px;font-family:var(--m)">${fC(c.wert)}</div>`;
    h += `</div></div>`;
  });
  h += `</div>`;

  // ─── RIGHT: Top Movers (7d consumption) ───
  h += `<div class="sc" style="padding:14px">`;
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
  h += `<div style="font-size:13px;font-weight:700">${LANG === "vi" ? "Xuất nhiều nhất (7 ngày)" : "Top-Verbrauch (7T)"}</div>`;
  h += `<span style="font-size:9px;color:var(--t3)">↑ ${LANG === "vi" ? "Xuất kho" : "Ausgang"}</span>`;
  h += `</div>`;

  if (topMovers.length) {
    topMovers.forEach((tm, i) => {
      const pct = tm.menge / maxMover * 100;
      const a = tm.art;
      h += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;cursor:pointer" onclick="showArtikelDetail('${a.id}')">`;
      h += `<div style="width:18px;font-size:11px;font-weight:700;color:var(--t3);text-align:right">${i + 1}.</div>`;
      h += `<div class="th" style="width:24px;height:24px">${a.bilder?.length ? `<img src="${esc(a.bilder[0])}">` : ""}</div>`;
      h += `<div style="flex:1;min-width:0">`;
      h += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(artN(a))}</span><span style="font-family:var(--m);font-weight:700;color:var(--rd);flex-shrink:0;margin-left:4px">−${tm.menge}</span></div>`;
      h += `<div style="height:4px;background:var(--b4);border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--rd);border-radius:2px;opacity:.6"></div></div>`;
      h += `</div></div>`;
    });
  } else {
    h += `<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">${LANG === "vi" ? "Chưa có xuất kho" : "Keine Ausgänge"}</div>`;
  }

  // Pending info
  if (pendingTransfers > 0 || openAnforderungen > 0) {
    h += `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--bd)">`;
    if (pendingTransfers > 0) h += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:3px"><span style="color:var(--pu)">⇄</span> <span>${pendingTransfers} ${LANG === "vi" ? "đang vận chuyển" : "Transfer unterwegs"}</span></div>`;
    if (openAnforderungen > 0) h += `<div style="display:flex;align-items:center;gap:6px;font-size:11px"><span style="color:var(--yl)">📋</span> <span>${openAnforderungen} ${LANG === "vi" ? "yêu cầu mở" : "offene Anforderungen"}</span></div>`;
    h += `</div>`;
  }

  h += `</div>`;
  h += `</div>`; // end two cols

  // ═══ ROW 5: CRITICAL ARTICLES ═══
  if (crit.length) {
    h += `<div style="margin-bottom:14px">`;
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
    h += `<h3 style="font-size:13px;font-weight:700;color:var(--rd);display:flex;align-items:center;gap:4px"><span style="animation:pulse 2s infinite">🔴</span> ${t("d.belowmin")} (${crit.length})</h3>`;
    if (can(U.role, "bestellliste")) h += `<button class="btn btn-d btn-sm" onclick="goPage('bestellliste')">${LANG === "vi" ? "Đặt hàng" : "Bestellen"}</button>`;
    h += `</div>`;

    h += `<div class="tw"><table><thead><tr><th style="width:30px"></th><th>${t("c.article")}</th><th class="mob-hide">${t("c.location")}</th><th class="mob-hide">${t("c.storageloc")}</th><th style="text-align:right">${t("a.stock")}</th><th class="mob-hide" style="text-align:right">Min</th><th style="text-align:center">${t("c.status")}</th></tr></thead><tbody>`;
    crit.forEach(a => fS.filter(s => {
      const ist = a.istBestand[s.id] || 0, min = a.mindestmenge[s.id] || 0;
      return min > 0 && ist <= min;
    }).forEach(s => {
      const ist = a.istBestand[s.id] || 0;
      const min = a.mindestmenge[s.id] || 0;
      const soll = a.sollBestand[s.id] || 0;
      const isOrdered = D.bestellungen.some(b => b.artikelId === a.id && b.standortId === s.id && b.status === "bestellt");
      const isEmpty = ist === 0;
      h += `<tr class="art-row" onclick="showArtikelDetail('${a.id}')" style="${isEmpty ? "background:var(--rA)" : ""}">`;
      h += `<td><div class="th" style="width:26px;height:26px">${a.bilder?.length ? `<img src="${esc(a.bilder[0])}">` : ""}</div></td>`;
      h += `<td><div style="font-weight:600">${esc(artN(a))}</div><div style="font-size:9px;color:var(--t3);font-family:var(--m)">${esc(a.sku)}</div></td>`;
      h += `<td class="mob-hide">${esc(s.name)}</td>`;
      h += `<td class="mob-hide"><span class="loc-tag">${esc(a.lagerort?.[s.id] || "—")}</span></td>`;
      h += `<td style="text-align:right;font-family:var(--m);font-weight:700;color:${isEmpty ? "var(--rd)" : "var(--yl)"}">${ist} <span style="font-weight:400;color:var(--t3)">/ ${soll}</span></td>`;
      h += `<td class="mob-hide" style="text-align:right;font-family:var(--m);color:var(--t3)">${min}</td>`;
      h += `<td style="text-align:center">${isEmpty ? `<span class="bp" style="background:var(--rA);color:var(--rd)">${LANG === "vi" ? "HẾT" : "LEER"}</span>` : isOrdered ? `<span class="bp" style="background:var(--aA);color:var(--ac)">📦 ${LANG === "vi" ? "Đã đặt" : "Bestellt"}</span>` : `<span class="bp" style="background:var(--yA);color:var(--yl)">⚠ ${LANG === "vi" ? "Thấp" : "Niedrig"}</span>`}${!isOrdered && can(U.role,"bestellliste") ? `<button class="btn btn-d btn-sm" onclick="event.stopPropagation();dashQuickOrder('${a.id}','${s.id}')" style="margin-left:4px;padding:2px 6px;font-size:9px">🛒</button>` : ""}</td>`;
      h += `</tr>`;
    }));
    h += `</tbody></table></div></div>`;
  }

  // ═══ ROW 6: RECENT MOVEMENTS ═══
  h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`;
  h += `<h3 style="font-size:13px;font-weight:700">${t("d.recentmov")}</h3>`;
  if (can(U.role, "bewegungen")) h += `<button class="btn btn-o btn-sm" onclick="goPage('bewegungen')">${LANG === "vi" ? "Xem tất cả" : "Alle anzeigen"} →</button>`;
  h += `</div>`;

  h += `<div class="tw"><table><thead><tr><th>${t("c.date")}</th><th>${t("c.type")}</th><th>${t("c.article")}</th><th class="mob-hide">${t("c.location")}</th><th style="text-align:right">${t("c.quantity")}</th><th class="mob-hide">${LANG === "vi" ? "NV" : "MA"}</th></tr></thead><tbody>`;
  D.bewegungen.slice(0, 10).forEach(b => {
    const bt = BT[b.typ] || { s: "?", c: "#666", i: "?" };
    const a = D.artikel.find(x => x.id === b.artikelId);
    const s = D.standorte.find(x => x.id === b.standortId);
    const usr = D.users.find(x => x.id === b.benutzer);
    const plus = ["eingang", "korrektur_plus"].includes(b.typ);
    const minus = ["ausgang", "korrektur_minus"].includes(b.typ);
    const conv = a ? formatUnitConv(b.menge, a) : "";
    const isToday = b.datum?.slice(0, 10) === td();
    h += `<tr style="${isToday ? "background:rgba(59,130,246,.03)" : ""}">`;
    h += `<td style="font-family:var(--m);font-size:10px;white-space:nowrap">${fDT(b.datum)}</td>`;
    h += `<td><span class="bwt" style="background:${bt.c}18;color:${bt.c}">${bt.i} ${bt.s}</span></td>`;
    h += `<td style="font-weight:600;cursor:pointer" onclick="event.stopPropagation();showArtikelDetail('${b.artikelId}')">${esc(artN(a))}</td>`;
    h += `<td class="mob-hide">${esc(s?.name || "")}${b.zielStandortId ? ` → ${esc(D.standorte.find(x => x.id === b.zielStandortId)?.name || "")}` : ""}</td>`;
    h += `<td style="text-align:right;font-family:var(--m);font-weight:700;color:${plus ? "var(--gn)" : minus ? "var(--rd)" : "var(--pu)"}">${plus ? "+" : minus ? "−" : "⇄"}${b.menge}${conv ? `<span class="unit-conv"> = ${esc(conv)}</span>` : ""}</td>`;
    h += `<td class="mob-hide" style="font-size:10.5px">${usr ? `<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:16px;height:16px;border-radius:3px;background:${ROLES[usr.role]?.color || "#666"};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff">${usr.name[0]}</span>${esc(usr.name)}</span>` : ""}</td>`;
    h += `</tr>`;
  });
  h += `</tbody></table></div>`;

  h += `</div>`;
  return h;
}

// ─── Helper: KPI Card (colored background) ───
function kpiCard(label, value, trend, color, icon, pulse, cssClass) {
  return `<div style="background:${color};border-radius:var(--r);padding:14px 16px;position:relative;overflow:hidden" class="${cssClass||""}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.3px">${label}</div>
        <div style="font-size:24px;font-weight:800;color:#fff;font-family:var(--m);margin-top:2px;${pulse ? "animation:pulse 2s infinite" : ""}">${value}</div>
        ${trend ? `<div style="color:rgba(255,255,255,.8)">${trend}</div>` : ""}
      </div>
      <div style="opacity:.3;color:#fff">${icon}</div>
    </div>
  </div>`;
}

// ─── Helper: Trend Badge (white text for colored cards) ───
function trendBadge(cur, prev) {
  if (!prev && !cur) return "";
  if (!prev) return cur > 0 ? `<div style="font-size:9px;margin-top:1px">↑ neu</div>` : "";
  const pct = ((cur - prev) / prev * 100).toFixed(0);
  const up = pct > 0, down = pct < 0;
  return `<div style="font-size:9px;margin-top:1px">${up ? "↑" : down ? "↓" : "→"} ${Math.abs(pct)}% ${LANG === "vi" ? "so với hôm qua" : "vs. gestern"}</div>`;
}

// ─── Helper: Quick Action Button (large with icon) ───
function qaBtn(label, color, action, icon, cssClass) {
  return `<button onclick="${action}" class="${cssClass||""}" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:var(--r);border:none;cursor:pointer;background:${color};color:#fff;font-family:var(--f);font-size:13px;font-weight:700;transition:all .15s;box-shadow:0 2px 8px ${color}40" onmouseenter="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseleave="this.style.opacity='1';this.style.transform=''">${icon||""}<span>${label}</span></button>`;
}

// ─── Dashboard: Quick order single critical article ───
function dashQuickOrder(artId, stId) {
  const a = D.artikel.find(x=>x.id===artId);
  if (!a) return;
  const soll = a.sollBestand[stId]||0, ist = a.istBestand[stId]||0;
  const qty = Math.max(1, soll - ist);
  const bestL = a.lieferanten.length ? a.lieferanten.reduce((b,l)=>l.preis<b.preis?l:b, a.lieferanten[0]) : null;
  const exists = D.bestellliste.find(bl=>bl.artikelId===artId&&bl.standortId===stId);
  if (exists) { exists.menge += qty; }
  else { D.bestellliste.push({id:uid(), artikelId:artId, standortId:stId, menge:qty, lieferantId:bestL?.lieferantId||""}); }
  save(); render();
  toast(`${artN(a)} ×${qty} → ${t("nav.orderlist")}`,"s");
}
