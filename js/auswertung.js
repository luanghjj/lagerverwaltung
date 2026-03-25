// ═══ AUSWERTUNG (Analysis & Reports) ═══

// ═══ AUSWERTUNG & ANALYSE ═══
let AW_TAB = "bew"; // "bew" | "top" | "vgl"
let AW_DAYS = 30;
let AW_KAT = "all";

function awData(vS, aS) {
  const sids = aS ? [aS] : vS.map(s=>s.id);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - AW_DAYS);
  const cutS = cutoff.toISOString();
  const prevCutoff = new Date(); prevCutoff.setDate(prevCutoff.getDate() - AW_DAYS*2);
  const prevS = prevCutoff.toISOString();
  const bew = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum >= cutS);
  const prevBew = D.bewegungen.filter(b => sids.includes(b.standortId) && b.datum >= prevS && b.datum < cutS);
  const we = bew.filter(b=>b.typ==="eingang"), wa = bew.filter(b=>b.typ==="ausgang");
  const pWe = prevBew.filter(b=>b.typ==="eingang"), pWa = prevBew.filter(b=>b.typ==="ausgang");
  const wM = we.reduce((s,b)=>s+b.menge,0), waM = wa.reduce((s,b)=>s+b.menge,0);
  const pWM = pWe.reduce((s,b)=>s+b.menge,0), pWaM = pWa.reduce((s,b)=>s+b.menge,0);
  const artWert = (b) => { const a=D.artikel.find(x=>x.id===b.artikelId); return (a?.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0)*b.menge; };
  const weW = we.reduce((s,b)=>s+artWert(b),0), waW = wa.reduce((s,b)=>s+artWert(b),0);
  return { sids, cutS, prevS, bew, prevBew, we, wa, pWe, pWa, wM, waM, pWM, pWaM, weW, waW };
}

function trend(cur, prev) {
  if (!prev) return cur>0?{v:100,s:"↑",c:"var(--gn)"}:{v:0,s:"→",c:"var(--t3)"};
  const p = ((cur-prev)/prev*100);
  return {v:Math.abs(p).toFixed(0), s:p>5?"↑":p<-5?"↓":"→", c:p>5?"var(--gn)":p<-5?"var(--rd)":"var(--t3)"};
}

function cssBar(pct, color) { return `<div style="height:8px;background:var(--b4);border-radius:4px;overflow:hidden;min-width:60px"><div style="height:100%;width:${Math.min(100,pct)}%;background:${color};border-radius:4px"></div></div>`; }

function renderAuswertung(vS, aS) {
  const d = awData(vS, aS);
  const ranges = [7,14,30,90];

  let h = `<div class="mn-h"><div class="mn-t">📊 ${LANG==="vi"?"Phân tích":"Auswertung"}</div><div class="mn-a">`;
  h += `<div class="mode-tabs">${ranges.map(r=>`<span class="mode-tab ${AW_DAYS===r?"on":""}" onclick="AW_DAYS=${r};render()">${r}${LANG==="vi"?"ng":"T"}</span>`).join("")}</div>`;
  h += `</div></div>`;

  // Tabs
  h += `<div class="st-bar"><div class="mode-tabs">`;
  h += `<span class="mode-tab ${AW_TAB==="bew"?"on":""}" onclick="AW_TAB='bew';render()">📈 ${LANG==="vi"?"Biến động":"Bewegungen"}</span>`;
  h += `<span class="mode-tab ${AW_TAB==="top"?"on":""}" onclick="AW_TAB='top';render()">🏆 ${LANG==="vi"?"Top SP":"Top Produkte"}</span>`;
  h += `<span class="mode-tab ${AW_TAB==="vgl"?"on":""}" onclick="AW_TAB='vgl';render()">🏪 ${LANG==="vi"?"So sánh":"Vergleich"}</span>`;
  h += `</div></div><div class="mn-c">`;

  if (AW_TAB==="bew") h += renderAWBew(d, vS);
  else if (AW_TAB==="top") h += renderAWTop(d, vS, aS);
  else h += renderAWVgl(d, vS);

  h += `</div>`;
  return h;
}

// ═══ TAB 1: WARENBEWEGUNG ═══
function renderAWBew(d) {
  const tWe = trend(d.wM, d.pWM), tWa = trend(d.waM, d.pWaM);
  let h = `<div class="sg"><div class="sc" style="border-left:3px solid var(--gn)"><div class="sc-l">↓ ${LANG==="vi"?"Nhập kho":"Eingang"}</div><div class="sc-v" style="color:var(--gn)">+${d.wM}</div><div style="font-size:10px;display:flex;gap:4px;margin-top:2px"><span style="color:${tWe.c};font-weight:600">${tWe.s} ${tWe.v}%</span>${canP()?`<span style="color:var(--t3)">${fC(d.weW)}</span>`:""}</div></div>`;
  h += `<div class="sc" style="border-left:3px solid var(--rd)"><div class="sc-l">↑ ${LANG==="vi"?"Xuất kho":"Ausgang"}</div><div class="sc-v" style="color:var(--rd)">−${d.waM}</div><div style="font-size:10px;display:flex;gap:4px;margin-top:2px"><span style="color:${tWa.c};font-weight:600">${tWa.s} ${tWa.v}%</span>${canP()?`<span style="color:var(--t3)">${fC(d.waW)}</span>`:""}</div></div>`;
  h += `<div class="sc"><div class="sc-l">${LANG==="vi"?"Số dư":"Saldo"}</div><div class="sc-v" style="color:${d.wM-d.waM>=0?"var(--gn)":"var(--rd)"}">${d.wM-d.waM>=0?"+":""}${d.wM-d.waM}</div></div>`;
  h += `<div class="sc"><div class="sc-l">Ø / ${LANG==="vi"?"ngày":"Tag"}</div><div class="sc-v">${(d.bew.length/AW_DAYS).toFixed(1)}</div></div></div>`;

  // Daily chart
  h += `<h3 style="font-size:13px;font-weight:700;margin:10px 0 8px">${LANG==="vi"?"Biểu đồ theo ngày":"Tagesverlauf"}</h3>`;
  const days = {};
  for (let i=0; i<Math.min(AW_DAYS,30); i++) { const dt=new Date(); dt.setDate(dt.getDate()-i); const k=dt.toISOString().slice(0,10); days[k]={we:0,wa:0}; }
  d.bew.forEach(b => { const k=b.datum?.slice(0,10); if(days[k]) { if(b.typ==="eingang") days[k].we+=b.menge; if(b.typ==="ausgang") days[k].wa+=b.menge; }});
  const maxD = Math.max(...Object.values(days).map(v=>Math.max(v.we,v.wa)),1);
  const sortedDays = Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0]));

  h += `<div style="display:flex;gap:2px;align-items:flex-end;height:120px;padding:0 4px;background:var(--b3);border-radius:8px;overflow-x:auto">`;
  sortedDays.forEach(([dt,v]) => {
    const wP = (v.we/maxD*100), aP = (v.wa/maxD*100);
    const lbl = dt.slice(8,10)+"."+dt.slice(5,7);
    h += `<div style="flex:1;min-width:14px;display:flex;flex-direction:column;align-items:center;gap:1px;justify-content:flex-end" title="${lbl}: WE +${v.we}, WA -${v.wa}">`;
    h += `<div style="display:flex;gap:1px;align-items:flex-end;height:100px">`;
    h += `<div style="width:6px;height:${Math.max(2,wP)}%;background:var(--gn);border-radius:2px 2px 0 0"></div>`;
    h += `<div style="width:6px;height:${Math.max(2,aP)}%;background:var(--rd);border-radius:2px 2px 0 0"></div>`;
    h += `</div><div style="font-size:7px;color:var(--t3);transform:rotate(-45deg);white-space:nowrap">${lbl}</div></div>`;
  });
  h += `</div><div style="display:flex;gap:12px;margin-top:4px;font-size:10px"><span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;background:var(--gn);border-radius:2px"></span>${LANG==="vi"?"Nhập":"Eingang"}</span><span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;background:var(--rd);border-radius:2px"></span>${LANG==="vi"?"Xuất":"Ausgang"}</span></div>`;

  // By type breakdown
  h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">${LANG==="vi"?"Theo loại":"Nach Typ"}</h3>`;
  const types = {};
  d.bew.forEach(b => { if(!types[b.typ]) types[b.typ]={count:0,menge:0}; types[b.typ].count++; types[b.typ].menge+=b.menge; });
  h += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
  Object.entries(types).forEach(([typ,v]) => {
    const bt=BT[typ]||{s:typ,c:"#666",i:"?"};
    h += `<div class="cd" style="min-width:140px;border-left:3px solid ${bt.c}"><div style="font-weight:700;font-size:13px;color:${bt.c}">${bt.i} ${bt.s}</div><div style="font-family:var(--m);font-size:15px;font-weight:700">${v.menge}</div><div style="font-size:10px;color:var(--t3)">${v.count} ${LANG==="vi"?"lần":"Buchungen"}</div></div>`;
  });
  h += `</div>`;

  // Bestellturnus-Vorschlag
  h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">📅 ${LANG==="vi"?"Đề xuất đặt hàng":"Bestellturnus-Vorschlag"}</h3>`;
  const turnusData = [];
  D.artikel.forEach(a => {
    const waArt = d.wa.filter(b=>b.artikelId===a.id);
    const totalVerbrauch = waArt.reduce((s,b)=>s+b.menge,0);
    if (!totalVerbrauch) return;
    const proTag = totalVerbrauch / AW_DAYS;
    d.sids.forEach(sid => {
      const ist = a.istBestand[sid]||0, min = a.mindestmenge[sid]||0;
      if (proTag > 0) {
        const tageReicht = Math.floor((ist-min) / proTag);
        const bestTurnus = Math.max(1, Math.floor((a.sollBestand[sid]||0) / proTag / 2));
        turnusData.push({ art:a, standort:D.standorte.find(s=>s.id===sid), proTag, tageReicht, bestTurnus, ist, min });
      }
    });
  });
  turnusData.sort((a,b) => a.tageReicht - b.tageReicht);
  if (turnusData.length) {
    h += `<div class="tw"><table><thead><tr><th style="width:30px"></th><th>${t("c.article")}</th><th>${t("c.location")}</th><th>${LANG==="vi"?"Ø/ngày":"Ø/Tag"}</th><th>${LANG==="vi"?"Còn đủ":"Reicht noch"}</th><th>${LANG==="vi"?"Đề xuất":"Empfehlung"}</th></tr></thead><tbody>`;
    turnusData.slice(0,10).forEach(r => {
      const urgent = r.tageReicht <= 3;
      h += `<tr><td><div class="th" style="width:24px;height:24px">${r.art.bilder?.length?`<img src="${esc(r.art.bilder[0])}">`:""}</div></td><td style="font-weight:600">${esc(artN(r.art))}</td><td style="font-size:11px">${esc(r.standort?.name||"")}</td>`;
      h += `<td style="font-family:var(--m)">${r.proTag.toFixed(1)} ${esc(r.art.einheit)}</td>`;
      h += `<td style="font-family:var(--m);font-weight:700;color:${urgent?"var(--rd)":"var(--yl)"}">${r.tageReicht} ${LANG==="vi"?"ngày":"Tage"}</td>`;
      h += `<td style="font-size:11px">${urgent?`<span style="color:var(--rd);font-weight:700">⚠ ${LANG==="vi"?"Đặt ngay":"Sofort bestellen"}</span>`:`${LANG==="vi"?"Mỗi":"Alle"} ${r.bestTurnus} ${LANG==="vi"?"ngày":"Tage"}`}</td></tr>`;
    });
    h += `</tbody></table></div>`;
  } else h += `<div style="color:var(--t3);font-size:12px;padding:10px">—</div>`;

  return h;
}

// ═══ TAB 2: TOP PRODUKTE ═══
function renderAWTop(d, vS, aS) {
  // Kategorie filter
  let h = `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--t3);font-weight:600">🏷</span>`;
  h += `<span class="st-ch ${AW_KAT==="all"?"on":""}" onclick="AW_KAT='all';render()">${t("c.all")}</span>`;
  D.kategorien.forEach(k => { h += `<span class="st-ch ${AW_KAT===k.id?"on":""}" onclick="AW_KAT='${k.id}';render()" style="${AW_KAT===k.id?"border-color:"+k.farbe:""}">${esc(katN(k))}</span>`; });
  h += `</div>`;

  const filterArt = (artId) => { if(AW_KAT==="all") return true; const a=D.artikel.find(x=>x.id===artId); return a?.kategorien.includes(AW_KAT); };

  // Top Eingang
  const weAgg = {}; d.we.filter(b=>filterArt(b.artikelId)).forEach(b => { weAgg[b.artikelId]=(weAgg[b.artikelId]||0)+b.menge; });
  const topWE = Object.entries(weAgg).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxWE = topWE[0]?.[1]||1;

  // Top Ausgang
  const waAgg = {}; d.wa.filter(b=>filterArt(b.artikelId)).forEach(b => { waAgg[b.artikelId]=(waAgg[b.artikelId]||0)+b.menge; });
  const topWA = Object.entries(waAgg).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxWA = topWA[0]?.[1]||1;

  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">`;

  // Top Eingang
  h += `<div class="cd"><div style="font-weight:700;font-size:13px;color:var(--gn);margin-bottom:8px">↓ Top ${LANG==="vi"?"nhập kho":"Eingang"}</div>`;
  if (!topWE.length) h += `<div style="color:var(--t3)">—</div>`;
  topWE.forEach(([artId,menge],i) => {
    const a=D.artikel.find(x=>x.id===artId);
    h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:var(--t3);width:16px;text-align:right;font-weight:700">${i+1}</span><div class="th" style="width:24px;height:24px">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:${i<3?"700":"500"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(artN(a))}</div>${cssBar(menge/maxWE*100,"var(--gn)")}</div><span style="font-family:var(--m);font-weight:700;font-size:12px;color:var(--gn);min-width:40px;text-align:right">+${menge}</span></div>`;
  });
  h += `</div>`;

  // Top Ausgang
  h += `<div class="cd"><div style="font-weight:700;font-size:13px;color:var(--rd);margin-bottom:8px">↑ Top ${LANG==="vi"?"xuất kho":"Ausgang"}</div>`;
  if (!topWA.length) h += `<div style="color:var(--t3)">—</div>`;
  topWA.forEach(([artId,menge],i) => {
    const a=D.artikel.find(x=>x.id===artId);
    h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:var(--t3);width:16px;text-align:right;font-weight:700">${i+1}</span><div class="th" style="width:24px;height:24px">${a?.bilder?.length?`<img src="${esc(a.bilder[0])}">`:""}</div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:${i<3?"700":"500"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(artN(a))}</div>${cssBar(menge/maxWA*100,"var(--rd)")}</div><span style="font-family:var(--m);font-weight:700;font-size:12px;color:var(--rd);min-width:40px;text-align:right">−${menge}</span></div>`;
  });
  h += `</div></div>`;

  // Wert-Umschlag
  if (canP()) {
    h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">💰 ${LANG==="vi"?"Giá trị luân chuyển":"Wert-Umschlag"}</h3>`;
    const wertAgg = {};
    d.bew.filter(b=>filterArt(b.artikelId)).forEach(b => {
      const a=D.artikel.find(x=>x.id===b.artikelId);
      const p=a?.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0;
      wertAgg[b.artikelId]=(wertAgg[b.artikelId]||0)+b.menge*p;
    });
    const topWert = Object.entries(wertAgg).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxW = topWert[0]?.[1]||1;
    h += `<div class="cd">`;
    topWert.forEach(([artId,wert],i) => {
      const a=D.artikel.find(x=>x.id===artId);
      h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:var(--t3);width:16px;text-align:right;font-weight:700">${i+1}</span><div style="flex:1"><div style="font-size:11.5px;font-weight:${i<3?"700":"500"}">${esc(artN(a))}</div>${cssBar(wert/maxW*100,"var(--ac)")}</div><span style="font-family:var(--m);font-weight:700;font-size:12px;min-width:60px;text-align:right">${fC(wert)}</span></div>`;
    });
    h += `</div>`;
  }

  // Slow Mover
  h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">🐌 Slow Mover / ${LANG==="vi"?"Hàng tồn lâu":"Ladenhüter"}</h3>`;
  const movedIds = new Set(d.bew.map(b=>b.artikelId));
  const slowMovers = D.artikel.filter(a => !movedIds.has(a.id) && (AW_KAT==="all"||a.kategorien.includes(AW_KAT)));
  if (slowMovers.length) {
    h += `<div class="tw"><table><thead><tr><th>${t("c.article")}</th><th>${t("c.categories")}</th><th>${LANG==="vi"?"Tồn kho":"Bestand"}</th>${canP()?`<th>${LANG==="vi"?"GT tồn":"Lagerwert"}</th>`:""}</tr></thead><tbody>`;
    slowMovers.forEach(a => {
      const totalIst = d.sids.reduce((s,sid)=>s+(a.istBestand[sid]||0),0);
      const bp = a.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0;
      h += `<tr><td style="font-weight:600">${esc(artN(a))}<div style="font-size:9.5px;color:var(--t3);font-family:var(--m)">${esc(a.sku)}</div></td>`;
      h += `<td>${a.kategorien.map(kId=>{const k=D.kategorien.find(x=>x.id===kId);return k?`<span class="kt" style="background:${k.farbe}22;color:${k.farbe}">${esc(katN(k))}</span>`:""}).join("")}</td>`;
      h += `<td style="font-family:var(--m)">${totalIst} ${esc(a.einheit)}</td>`;
      if (canP()) h += `<td style="font-family:var(--m);color:var(--yl)">${fC(totalIst*bp)}</td>`;
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;
  } else h += `<div style="color:var(--gn);font-size:12px;padding:8px">✓ ${LANG==="vi"?"Không có hàng tồn lâu":"Keine Ladenhüter"}</div>`;

  // Restaurant-Auffüllungen
  const rstAuf = (D.auffuellungen||[]).filter(af => af.datum >= d.cutS);
  if (rstAuf.length) {
    h += `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px">🍽 ${LANG==="vi"?"Bổ sung nhà hàng":"Restaurant-Auffüllungen"}</h3>`;
    const brAgg = {};
    rstAuf.forEach(af => { if(!brAgg[af.bereichId]) brAgg[af.bereichId]={count:0,menge:0}; brAgg[af.bereichId].count++; brAgg[af.bereichId].menge+=af.menge; });
    h += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    Object.entries(brAgg).forEach(([brId,v]) => {
      const br=D.bereiche.find(x=>x.id===brId);
      h += `<div class="cd" style="min-width:140px;border-left:3px solid ${br?.farbe||"var(--t3)"}"><div style="font-weight:700">${br?.icon||""} ${esc(br?(LANG==="vi"&&br.name_vi?br.name_vi:br.name):"?")}</div><div style="font-family:var(--m);font-size:16px;font-weight:700">${v.menge}</div><div style="font-size:10px;color:var(--t3)">${v.count} ${LANG==="vi"?"lần":"Auffüllungen"}</div></div>`;
    });
    h += `</div>`;
  }

  return h;
}

// ═══ TAB 3: STANDORT-VERGLEICH ═══
function renderAWVgl(d, vS) {
  if (vS.length < 2) return `<div style="text-align:center;padding:30px;color:var(--t3)">${LANG==="vi"?"Cần ít nhất 2 chi nhánh":"Mindestens 2 Standorte nötig"}</div>`;

  const stats = vS.map(s => {
    const bew = D.bewegungen.filter(b=>b.standortId===s.id && b.datum>=d.cutS);
    const prevBew = D.bewegungen.filter(b=>b.standortId===s.id && b.datum>=d.prevS && b.datum<d.cutS);
    const we=bew.filter(b=>b.typ==="eingang"),wa=bew.filter(b=>b.typ==="ausgang");
    const wM=we.reduce((s,b)=>s+b.menge,0),waM=wa.reduce((s,b)=>s+b.menge,0);
    const pWM=prevBew.filter(b=>b.typ==="eingang").reduce((s,b)=>s+b.menge,0);
    const pWaM=prevBew.filter(b=>b.typ==="ausgang").reduce((s,b)=>s+b.menge,0);
    const lagerW = D.artikel.reduce((sum,a)=>{const bp=a.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):0;return sum+(a.istBestand[s.id]||0)*bp;},0);
    const artCount = D.artikel.filter(a=>(a.istBestand[s.id]||0)>0).length;
    const crit = D.artikel.filter(a=>(a.istBestand[s.id]||0)<=(a.mindestmenge[s.id]||0)).length;
    const rstAuf = (D.auffuellungen||[]).filter(af=>af.datum>=d.cutS && D.bereiche.find(x=>x.id===af.bereichId)?.standortId===s.id);
    const rstM = rstAuf.reduce((s,af)=>s+af.menge,0);
    // Top 5 WA
    const waAgg={}; wa.forEach(b=>{waAgg[b.artikelId]=(waAgg[b.artikelId]||0)+b.menge;});
    const top5=Object.entries(waAgg).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return {...s, wM, waM, pWM, pWaM, lagerW, artCount, crit, bew:bew.length, rstM, rstCount:rstAuf.length, top5 };
  });

  const maxWE=Math.max(...stats.map(s=>s.wM),1), maxWA=Math.max(...stats.map(s=>s.waM),1);

  let h = `<div style="display:grid;grid-template-columns:repeat(${Math.min(stats.length,4)},1fr);gap:10px;margin-bottom:16px">`;
  stats.forEach(s => {
    const tWe=trend(s.wM,s.pWM), tWa=trend(s.waM,s.pWaM);
    h += `<div class="sc" style="border-top:3px solid var(--ac)"><div style="font-weight:700;font-size:14px;margin-bottom:8px">${esc(s.name)}</div>`;
    if (canP()) h += `<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--t3)">${LANG==="vi"?"Giá trị kho":"Lagerwert"}</div><div style="font-family:var(--m);font-weight:700;font-size:18px;color:var(--gn)">${fC(s.lagerW)}</div></div>`;
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">`;
    h += `<div style="padding:6px;background:var(--gA);border-radius:6px;text-align:center"><div style="font-size:9px;color:var(--gn);font-weight:600">↓ ${LANG==="vi"?"NHẬP":"WE"}</div><div style="font-family:var(--m);font-weight:700;font-size:16px;color:var(--gn)">${s.wM}</div><div style="font-size:9px;color:${tWe.c};font-weight:600">${tWe.s} ${tWe.v}%</div></div>`;
    h += `<div style="padding:6px;background:var(--rA);border-radius:6px;text-align:center"><div style="font-size:9px;color:var(--rd);font-weight:600">↑ ${LANG==="vi"?"XUẤT":"WA"}</div><div style="font-family:var(--m);font-weight:700;font-size:16px;color:var(--rd)">${s.waM}</div><div style="font-size:9px;color:${tWa.c};font-weight:600">${tWa.s} ${tWa.v}%</div></div>`;
    h += `</div>`;
    // Bars
    h += `<div style="margin-top:6px"><div style="display:flex;gap:3px;align-items:center;margin-bottom:2px"><span style="font-size:9px;color:var(--gn);width:12px">↓</span>${cssBar(s.wM/maxWE*100,"var(--gn)")}</div>`;
    h += `<div style="display:flex;gap:3px;align-items:center"><span style="font-size:9px;color:var(--rd);width:12px">↑</span>${cssBar(s.waM/maxWA*100,"var(--rd)")}</div></div>`;
    // Footer
    h += `<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--bd);font-size:10px">`;
    h += `<span style="color:var(--t2)">${s.artCount} ${t("c.article")}</span>`;
    h += `<span style="color:${s.crit?"var(--rd)":"var(--gn)"};font-weight:600">${s.crit} ${LANG==="vi"?"thiếu":"krit."}</span>`;
    h += `</div>`;
    if (s.rstCount) h += `<div style="font-size:10px;color:var(--pu);margin-top:3px">🍽 ${s.rstM} (${s.rstCount}×)</div>`;
    h += `</div>`;
  });
  h += `</div>`;

  // Top 5 per location side by side
  h += `<h3 style="font-size:13px;font-weight:700;margin:10px 0 8px">🏆 Top 5 ${LANG==="vi"?"xuất kho":"Ausgang"}</h3>`;
  h += `<div style="display:grid;grid-template-columns:repeat(${Math.min(stats.length,4)},1fr);gap:10px">`;
  stats.forEach(s => {
    h += `<div class="cd"><div style="font-weight:700;font-size:12px;color:var(--ac);margin-bottom:6px">${esc(s.name)}</div>`;
    if (!s.top5.length) h += `<div style="color:var(--t3);font-size:11px">—</div>`;
    s.top5.forEach(([artId,menge],i) => {
      const a=D.artikel.find(x=>x.id===artId);
      h += `<div style="display:flex;justify-content:space-between;padding:3px 0;${i<s.top5.length-1?"border-bottom:1px solid var(--bd)":""}"><span style="font-size:11px;font-weight:${i===0?"700":"500"}">${i+1}. ${esc(artN(a))}</span><span style="font-family:var(--m);font-weight:600;color:var(--rd);font-size:11px">−${menge}</span></div>`;
    });
    h += `</div>`;
  });
  h += `</div>`;

  return h;
}

// ═══ ARTIKEL ═══
let ART_VIEW = "art"; // "art" | "lief" | "kat"
let ART_SEARCH = "";
let ART_SORT = "name"; // "name" | "sku" | "ek" | "stock" | "kat"
let ART_SORT_DIR = "asc";
function artSearchInput(el) { if(_IME)return; ART_SEARCH = el.value; render(); }
function artSearchClear() { ART_SEARCH = ""; render(); }
function artSort(col) { if (ART_SORT === col) ART_SORT_DIR = ART_SORT_DIR === "asc" ? "desc" : "asc"; else { ART_SORT = col; ART_SORT_DIR = "asc"; } render(); }
function sortArtikel(fil, stC) {
  const sId = stC[0]?.id || "";
  return [...fil].sort((a, b) => {
    let v = 0;
    if (ART_SORT === "name") v = artN(a).localeCompare(artN(b));
    else if (ART_SORT === "sku") v = (a.sku||"").localeCompare(b.sku||"");
    else if (ART_SORT === "kat") { const ka = a.kategorien[0]||"", kb = b.kategorien[0]||""; const kaN = D.kategorien.find(x=>x.id===ka), kbN = D.kategorien.find(x=>x.id===kb); v = katN(kaN).localeCompare(katN(kbN)); }
    else if (ART_SORT === "stock") v = (a.istBestand[sId]||0) - (b.istBestand[sId]||0);
    else if (ART_SORT === "ek") { const pa = a.lieferanten.length?Math.min(...a.lieferanten.map(l=>l.preis)):999; const pb = b.lieferanten.length?Math.min(...b.lieferanten.map(l=>l.preis)):999; v = pa - pb; }
    return ART_SORT_DIR === "desc" ? -v : v;
  });
}
function sortIc(col) { return ART_SORT===col ? (ART_SORT_DIR==="asc"?"▲":"▼") : "⇅"; }
