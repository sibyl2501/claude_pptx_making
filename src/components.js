// 部品。すべての部品は box = {x, y, w, h}（インチ）を受け取り、テーマの色だけを使う。
//
// 文字を含む部品は「計画（plan）→ 文字サイズの一括決定（renderGroup）→ 描画」の順で処理する。
// 同じページのカード同士は同じ文字サイズにそろえるため。

const { toParagraphs, buildRuns, runsOf, plain } = require("./markup");
const { measure, fitSize, fitsOneLine } = require("./textfit");
const { GAP, METRICS } = require("./config");

const PAD = 0.14; // 枠の内側の余白
const PARA_AFTER = 3; // 段落の後ろの間隔（pt）

// ---------------------------------------------------------------- 計画と一括描画
// plan = { areas: [{w, h, paras}], draw(size) }
function renderGroup(ctx, rec, plans, range) {
  const [max, min] = range || ctx.sizes.body;
  let size = max;
  for (const p of plans) for (const a of p.areas) {
    if (!a.paras.length) continue;
    size = Math.min(size, fitSize(a.paras, a.w, a.h, [max, min], PARA_AFTER).size);
  }
  for (const p of plans) {
    p.draw(size);
    for (const a of p.areas) {
      if (!a.paras.length) continue;
      const m = measure(a.paras, a.w, size, PARA_AFTER);
      rec.areas.push({ area: a.w * a.h, fill: m.height / a.h, label: a.label });
      if (m.height > a.h * 1.02) rec.warn.push(`「${a.label}」が枠に収まりません（必要 ${m.height.toFixed(2)}in / 枠 ${a.h.toFixed(2)}in）。文を短くするか分割してください`);
    }
  }
  rec.sizes.add(size);
  return size;
}

// 文字のない部品（グラフ・図・表）は面積を満たしたものとして記録する
function recordSolid(rec, box, label) {
  rec.areas.push({ area: box.w * box.h, fill: 1, label });
}

function textBox(ctx, slide, box, runs, opt = {}) {
  slide.addText(runs, { x: box.x, y: box.y, w: box.w, h: box.h, margin: 0, valign: opt.valign || "top", align: opt.align || "left", isTextBox: true, objectName: ctx.nm(opt.name || "text"), fit: "none" });
}

function badge(ctx, slide, x, y, num, d = 0.3) {
  const { theme, fonts } = ctx;
  slide.addShape(ctx.pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: theme.accent }, line: { type: "none" }, objectName: ctx.nm("badge") });
  slide.addText(String(num), { x, y, w: d, h: d, fontFace: fonts.jp, fontSize: d > 0.32 ? 13 : 11, bold: true, color: theme.primaryDark, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("badge-num") });
}

// ---------------------------------------------------------------- カード
// spec: { title, body, num?, stat?: {value, label} }  opt: { fill, label }
function planCard(ctx, slide, box, spec, opt = {}) {
  const { theme, sizes } = ctx;
  const hasNum = spec.num !== undefined && spec.num !== null;
  const tx = box.x + (hasNum ? 0.52 : PAD);
  const tw = box.x + box.w - tx - PAD;
  const titleLines = !spec.title ? 0 : fitsOneLine(spec.title, tw, sizes.cardTitle) ? 1 : 2;
  const titleH = titleLines ? (titleLines * sizes.cardTitle * METRICS.lineHeight) / 72 + 0.06 : 0;
  let y = box.y + 0.11 + Math.max(titleH, hasNum ? 0.32 : 0) + 0.05;
  let statH = 0;
  if (spec.stat) statH = (sizes.kpiValue * 0.95 * 1.25) / 72 + 0.05;
  const area = { x: box.x + PAD, y: y + statH, w: box.w - 2 * PAD, h: box.y + box.h - (y + statH) - 0.1, paras: toParagraphs(spec.body), label: spec.title || opt.label || "カード" };
  return {
    areas: [area],
    draw(size) {
      slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: opt.fill || theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("card") });
      if (hasNum) badge(ctx, slide, box.x + 0.12, box.y + 0.11, spec.num);
      if (spec.title) textBox(ctx, slide, { x: tx, y: box.y + 0.1, w: tw, h: Math.max(titleH, 0.32) }, runsOf(spec.title, ctx, { fontSize: sizes.cardTitle, bold: true, color: theme.primaryDark }), { valign: "middle", name: "card-title" });
      if (spec.stat) {
        const s = sizes.kpiValue * 0.95;
        textBox(ctx, slide, { x: area.x, y, w: area.w, h: statH }, [
          { text: String(spec.stat.value), options: { fontFace: ctx.fonts.jp, fontSize: s, bold: true, color: theme.primary } },
          { text: spec.stat.label ? "  " + spec.stat.label : "", options: { fontFace: ctx.fonts.jp, fontSize: Math.max(size, 10), color: theme.muted } },
        ], { valign: "bottom", name: "card-stat" });
      }
      textBox(ctx, slide, area, buildRuns(area.paras, ctx, { fontSize: size, color: theme.ink, paraAfter: PARA_AFTER }), { name: "card-body" });
    },
  };
}

// ---------------------------------------------------------------- パネル（白地＋主色の枠線）
function planPanel(ctx, slide, box, spec) {
  const { theme, sizes } = ctx;
  const titleH = spec.title ? (sizes.cardTitle * METRICS.lineHeight) / 72 + 0.08 : 0;
  const area = { x: box.x + PAD + 0.02, y: box.y + 0.12 + titleH, w: box.w - 2 * PAD - 0.04, h: box.h - 0.22 - titleH, paras: toParagraphs(spec.body), label: spec.title || "パネル" };
  return {
    areas: [area],
    draw(size) {
      slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.white }, line: { color: theme.primary, width: 1 }, objectName: ctx.nm("panel") });
      if (spec.title) textBox(ctx, slide, { x: area.x, y: box.y + 0.1, w: area.w, h: titleH }, runsOf(spec.title, ctx, { fontSize: sizes.cardTitle, bold: true, color: theme.primary }), { valign: "middle", name: "panel-title" });
      textBox(ctx, slide, area, buildRuns(area.paras, ctx, { fontSize: size, color: theme.ink, paraAfter: PARA_AFTER }), { name: "panel-body" });
    },
  };
}

// ---------------------------------------------------------------- 結論帯（So what）
function keyMessage(ctx, slide, rec, box, text, label = "結論") {
  const { theme, fonts } = ctx;
  slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.accentTint }, line: { type: "none" }, objectName: ctx.nm("key-message") });
  const lw = 0.95;
  slide.addText(label, { x: box.x + 0.14, y: box.y + (box.h - 0.3) / 2, w: lw - 0.1, h: 0.3, fontFace: fonts.jp, fontSize: 10.5, bold: true, color: theme.white, align: "center", valign: "middle", margin: 0, fill: { color: theme.primary }, isTextBox: true, objectName: ctx.nm("key-label") });
  const area = { x: box.x + 0.14 + lw + 0.1, y: box.y + 0.06, w: box.w - lw - 0.38, h: box.h - 0.12 };
  const paras = toParagraphs(text);
  const fit = fitSize(paras, area.w, area.h, [15, 11], 0);
  textBox(ctx, slide, area, buildRuns(paras, ctx, { fontSize: fit.size, color: theme.primaryDark, bold: true, paraAfter: 0 }), { valign: "middle", name: "key-text" });
  if (!fit.fits) rec.warn.push("結論帯の文が長すぎます。2行以内にしてください");
  rec.areas.push({ area: box.w * box.h, fill: 1, label: "結論帯" });
}

// ---------------------------------------------------------------- 表
// spec: { headers: [], rows: [[...]], widths?: [比率], align?: [], highlight?: 列番号, firstColBold?: true, tagColors?: {値: 色トークン} }
const MARKS = { "◎": "positive", "○": "positive", "〇": "positive", "△": "accentText", "×": "negative", "✕": "negative" };

function table(ctx, slide, rec, box, spec, opt = {}) {
  const { theme, fonts } = ctx;
  const ncol = spec.headers.length;
  const ratio = spec.widths || Array(ncol).fill(1);
  const sum = ratio.reduce((a, b) => a + b, 0);
  const colW = ratio.map((r) => (box.w * r) / sum);
  const padX = 0.08, padY = 0.05;
  const cellParas = (v) => toParagraphs(typeof v === "object" && v !== null && !Array.isArray(v) ? v.text : v);
  const rowsAll = [spec.headers, ...spec.rows];
  const range = opt.range || ctx.sizes.table;
  // 表全体が枠に収まる最大の文字サイズ
  const heights = (s) => rowsAll.map((r) => Math.max(...r.map((v, j) => measure(cellParas(v), colW[j] - 2 * padX, s, 0).height)) + 2 * padY);
  let size = range[1];
  for (let s = range[0]; s >= range[1] - 1e-9; s -= 0.5) {
    if (heights(s).reduce((a, b) => a + b, 0) <= box.h) { size = s; break; }
  }
  const nat = heights(size);
  const natTotal = nat.reduce((a, b) => a + b, 0);
  if (natTotal > box.h * 1.02) rec.warn.push(`表「${spec.headers.join("/")}」が枠に収まりません。行を減らすか分割してください`);
  // 余った高さは本文行に配分して、表で枠を満たす
  const extra = Math.max(0, box.h - natTotal);
  const bodyNat = nat.slice(1).reduce((a, b) => a + b, 0) || 1;
  const rowH = nat.map((h, i) => (i === 0 ? h : h + (extra * h) / bodyNat));
  rec.areas.push({ area: box.w * box.h, fill: Math.min(1, natTotal / box.h + 0.25), label: "表" });
  rec.sizes.add(size);

  const markColor = (m) => ({ positive: theme.positive, negative: theme.negative, accentText: ctx.colors.accentText }[MARKS[m]]);
  const cellRuns = (v, base) => {
    const paras = cellParas(v);
    // 先頭の評価記号（◎○△×）を色分けする
    const runs = buildRuns(paras, ctx, { ...base, paraAfter: 0 });
    for (const r of runs) {
      const m = r.text && r.text[0];
      if (MARKS[m]) {
        const rest = r.text.slice(1);
        const idx = runs.indexOf(r);
        runs.splice(idx, 1, { text: m, options: { ...r.options, color: markColor(m), bold: true, breakLine: rest ? false : r.options.breakLine } }, ...(rest ? [{ text: rest, options: { ...r.options, paraSpaceAfter: undefined, bullet: undefined } }] : []));
        break;
      }
    }
    return runs;
  };
  const tagColor = (v) => spec.tagColors && spec.tagColors[plain(v)] ? theme[spec.tagColors[plain(v)]] || spec.tagColors[plain(v)] : null;
  const rows = rowsAll.map((r, i) => r.map((v, j) => {
    const isHead = i === 0;
    const hl = spec.highlight === j;
    const zebra = i % 2 === 0 ? theme.primaryTint : theme.white;
    const fill = isHead ? (hl ? theme.accent : theme.primary) : hl ? theme.accentTint : zebra;
    const color = isHead ? (hl ? theme.primaryDark : theme.white) : tagColor(v) || theme.ink;
    const bold = isHead || (j === 0 && spec.firstColBold !== false) || !!tagColor(v);
    const obj = typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
    return {
      text: cellRuns(v, { fontSize: size, color, bold }),
      options: { fill: { color: obj.fill ? theme[obj.fill] || obj.fill : fill }, align: obj.align || (spec.align && spec.align[j]) || "left", valign: "middle" },
    };
  }));
  slide.addTable(rows, {
    x: box.x, y: box.y, w: box.w, colW, rowH,
    fontFace: fonts.jp, fontSize: size,
    border: { type: "solid", pt: 0.75, color: theme.white },
    margin: [padY, padX, padY, padX],
    objectName: ctx.nm("table"),
  });
  return size;
}

// ---------------------------------------------------------------- グラフ（PowerPoint のネイティブグラフ）
// spec: { type: bar|hbar|stacked|line|area|pie|doughnut, title, categories: [], series: [{name, values}],
//         unit?, highlight?: 系列が1つのときに強調する項目の番号, min?, max?, valueLabels?: true, format?: "0.0" }
function chart(ctx, slide, rec, box, spec) {
  const { pres, theme, fonts } = ctx;
  const t = spec.type || "bar";
  const data = spec.series.map((s) => ({ name: s.name, labels: spec.categories, values: s.values }));
  const single = data.length === 1;
  let colors = theme.series.slice();
  if (single && (t === "bar" || t === "hbar") && spec.highlight !== undefined) {
    colors = spec.categories.map((_, i) => (i === spec.highlight ? theme.accent : theme.primary));
  }
  const labelColor = "4A5550";
  const base = {
    x: box.x, y: box.y, w: box.w, h: box.h,
    chartColors: colors,
    showTitle: !!spec.title, title: spec.title || "", titleFontFace: fonts.jp, titleFontSize: 11, titleColor: theme.primaryDark,
    showLegend: !single || t === "pie" || t === "doughnut", legendPos: "b", legendFontFace: fonts.jp, legendFontSize: 9.5, legendColor: labelColor,
    catAxisLabelFontFace: fonts.jp, catAxisLabelFontSize: 9.5, catAxisLabelColor: labelColor,
    valAxisLabelFontFace: fonts.jp, valAxisLabelFontSize: 9, valAxisLabelColor: labelColor,
    valGridLine: { color: "E2E8E5", size: 0.5 }, catGridLine: { style: "none" },
    catAxisLineShow: true, valAxisLineShow: false,
    dataLabelFontFace: fonts.jp, dataLabelFontSize: 9, dataLabelColor: labelColor,
    objectName: ctx.nm("chart"),
  };
  if (spec.min !== undefined) base.valAxisMinVal = spec.min;
  if (spec.max !== undefined) base.valAxisMaxVal = spec.max;
  if (spec.majorUnit !== undefined) base.valAxisMajorUnit = spec.majorUnit;
  if (spec.unit) { base.showValAxisTitle = true; base.valAxisTitle = spec.unit; base.valAxisTitleFontSize = 9; base.valAxisTitleColor = labelColor; base.valAxisTitleFontFace = fonts.jp; }
  if (spec.format) { base.valAxisLabelFormatCode = spec.format; base.dataLabelFormatCode = spec.format; }
  const showVal = spec.valueLabels !== undefined ? spec.valueLabels : single && (t === "bar" || t === "hbar");
  let type;
  if (t === "bar" || t === "hbar" || t === "stacked" || t === "hstacked") {
    type = pres.charts.BAR;
    base.barDir = t.startsWith("h") ? "bar" : "col";
    base.barGapWidthPct = 60;
    if (t.includes("stacked")) base.barGrouping = "stacked";
    if (showVal) { base.showValue = true; base.dataLabelPosition = t.includes("stacked") ? "ctr" : "outEnd"; if (t.includes("stacked")) base.dataLabelColor = "FFFFFF"; }
  } else if (t === "line" || t === "area") {
    type = t === "line" ? pres.charts.LINE : pres.charts.AREA;
    base.lineSize = 2.25; base.lineDataSymbol = spec.markers ? "circle" : "none"; base.lineDataSymbolSize = 6;
    if (showVal) { base.showValue = true; base.dataLabelPosition = "t"; }
  } else if (t === "pie" || t === "doughnut") {
    type = t === "pie" ? pres.charts.PIE : pres.charts.DOUGHNUT;
    base.showPercent = true; base.showValue = false; base.dataLabelColor = "FFFFFF"; base.dataLabelPosition = "ctr";
    base.chartColors = theme.series.concat([theme.rule]);
  } else {
    throw new Error(`グラフの type "${t}" は未対応です（bar, hbar, stacked, hstacked, line, area, pie, doughnut）`);
  }
  slide.addChart(type, data, base);
  recordSolid(rec, box, "グラフ");
}

// ---------------------------------------------------------------- KPI タイル
// spec: { label, value, unit?, delta?, good?: "up"|"down", note? }
function kpiTile(ctx, slide, rec, box, spec) {
  const { theme, fonts, sizes } = ctx;
  slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("kpi") });
  const iw = box.w - 2 * PAD;
  slide.addText(runsOf(spec.label, ctx, { fontSize: 10.5, bold: true, color: theme.muted }), { x: box.x + PAD, y: box.y + 0.1, w: iw, h: 0.26, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("kpi-label") });
  let vs = sizes.kpiValue;
  const valStr = String(spec.value), unit = spec.unit || "";
  while (vs > 18 && !fitsOneLine(valStr + unit, iw, vs * 0.92)) vs -= 2;
  const vh = (vs * 1.25) / 72;
  slide.addText([
    { text: valStr, options: { fontFace: fonts.jp, fontSize: vs, bold: true, color: theme.primary } },
    { text: unit, options: { fontFace: fonts.jp, fontSize: Math.round(vs * 0.42), bold: true, color: theme.primary } },
  ], { x: box.x + PAD, y: box.y + 0.38, w: iw, h: vh, margin: 0, valign: "bottom", isTextBox: true, objectName: ctx.nm("kpi-value") });
  let y = box.y + 0.38 + vh + 0.04;
  if (spec.delta) {
    const up = /^[+＋▲↑]/.test(spec.delta);
    const good = spec.good ? (spec.good === "up") === up : true;
    slide.addText(spec.delta, { x: box.x + PAD, y, w: iw, h: 0.26, fontFace: fonts.jp, fontSize: 11, bold: true, color: good ? theme.positive : theme.negative, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("kpi-delta") });
    y += 0.28;
  }
  if (spec.note) {
    const area = { x: box.x + PAD, y, w: iw, h: box.y + box.h - y - 0.08 };
    const paras = toParagraphs(spec.note);
    const fit = fitSize(paras, area.w, area.h, [10.5, 9], 0);
    slide.addText(buildRuns(paras, ctx, { fontSize: fit.size, color: theme.ink, paraAfter: 0 }), { ...area, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("kpi-note") });
    if (!fit.fits) rec.warn.push(`KPI「${spec.label}」の注記が長すぎます`);
  }
  recordSolid(rec, box, "KPI");
}

// ---------------------------------------------------------------- 手順・流れ（横並びの箱と矢印）
// steps: [{ title, body? }]
function planStepFlow(ctx, slide, box, steps, opt = {}) {
  const { theme, sizes } = ctx;
  const n = steps.length;
  const arrowW = 0.26;
  const w = (box.w - arrowW * (n - 1)) / n;
  const plans = steps.map((s, i) => {
    const b = { x: box.x + i * (w + arrowW), y: box.y, w, h: box.h };
    const fill = opt.emphasize === i ? theme.accentTint : theme.primaryTint;
    return planCard(ctx, slide, b, { num: i + 1, title: s.title, body: s.body }, { fill, label: s.title });
  });
  return {
    areas: plans.flatMap((p) => p.areas),
    draw(size) {
      plans.forEach((p, i) => {
        p.draw(size);
        if (i < n - 1) {
          const ax = box.x + (i + 1) * w + i * arrowW + 0.04;
          slide.addShape(ctx.pres.shapes.ISOSCELES_TRIANGLE, { x: ax, y: box.y + box.h / 2 - 0.13, w: arrowW - 0.08, h: 0.26, rotate: 90, fill: { color: theme.primary }, line: { type: "none" }, objectName: ctx.nm("flow-arrow") });
        }
      });
    },
  };
}

// ---------------------------------------------------------------- ガントチャート
// spec: { periods: [], tasks: [{ name, owner?, start, end, label?, highlight?, milestone? }] }
// start / end は periods の番号（0始まり、end を含む）。小数も可（0.5 = 期間の中ほど）。
function gantt(ctx, slide, rec, box, spec) {
  const { theme, fonts, pres } = ctx;
  const np = spec.periods.length, nt = spec.tasks.length;
  const labelW = Math.min(3.0, box.w * 0.27);
  const headH = 0.36;
  const rowH = (box.h - headH) / nt;
  const gx = box.x + labelW, gw = box.w - labelW, pw = gw / np;
  // 見出し行
  slide.addShape(pres.shapes.RECTANGLE, { x: box.x, y: box.y, w: box.w, h: headH, fill: { color: theme.primary }, line: { type: "none" }, objectName: ctx.nm("gantt-head") });
  slide.addText(spec.taskHeader || "作業・担当", { x: box.x + 0.1, y: box.y, w: labelW - 0.1, h: headH, fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.white, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-h") });
  spec.periods.forEach((p, i) => slide.addText(p, { x: gx + i * pw, y: box.y, w: pw, h: headH, fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.white, align: "center", margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-p") }));
  // 行と縦線
  const nameSize = Math.min(12, Math.max(10, rowH * 72 * 0.3));
  spec.tasks.forEach((t, i) => {
    const y = box.y + headH + i * rowH;
    slide.addShape(pres.shapes.RECTANGLE, { x: box.x, y, w: box.w, h: rowH, fill: { color: i % 2 ? theme.white : theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("gantt-row") });
    const runs = [{ text: t.name, options: { fontFace: fonts.jp, fontSize: nameSize, bold: true, color: theme.ink, breakLine: !!t.owner } }];
    if (t.owner) runs.push({ text: t.owner, options: { fontFace: fonts.jp, fontSize: nameSize - 1.5, color: theme.muted } });
    slide.addText(runs, { x: box.x + 0.1, y, w: labelW - 0.15, h: rowH, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-name") });
  });
  for (let i = 1; i < np; i++) slide.addShape(pres.shapes.LINE, { x: gx + i * pw, y: box.y + headH, w: 0, h: box.h - headH, line: { color: theme.rule, width: 0.75, dashType: "dash" }, objectName: ctx.nm("gantt-grid") });
  // バーとマイルストーン
  spec.tasks.forEach((t, i) => {
    const y = box.y + headH + i * rowH;
    if (t.milestone !== undefined) {
      const mx = gx + (t.milestone + 0.5) * pw;
      const d = Math.min(0.3, rowH * 0.5);
      slide.addShape(pres.shapes.DIAMOND, { x: mx - d / 2, y: y + (rowH - d) / 2, w: d, h: d, fill: { color: theme.accent }, line: { type: "none" }, objectName: ctx.nm("milestone") });
      if (t.label) {
        // 右側に入らなければ菱形の左に右寄せで置く
        const rightW = gx + gw - (mx + d / 2 + 0.05);
        const right = fitsOneLine(t.label, rightW, 10);
        slide.addText(t.label, { x: right ? mx + d / 2 + 0.05 : gx, y, w: right ? rightW : mx - d / 2 - 0.05 - gx, h: rowH, fontFace: fonts.jp, fontSize: 10, bold: true, color: theme.ink, align: right ? "left" : "right", margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("milestone-label") });
      }
      return;
    }
    const bx = gx + t.start * pw + 0.04, bw = (t.end - t.start + 1) * pw - 0.08;
    const bh = Math.min(0.42, rowH * 0.58);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: y + (rowH - bh) / 2, w: bw, h: bh, rectRadius: 0.05, fill: { color: t.highlight ? theme.accent : theme.primary }, line: { type: "none" }, objectName: ctx.nm("gantt-bar") });
    if (t.label) {
      const inside = fitsOneLine(t.label, bw - 0.16, 10);
      slide.addText(t.label, { x: inside ? bx + 0.08 : bx + bw + 0.06, y: y + (rowH - bh) / 2, w: inside ? bw - 0.16 : Math.max(1.0, gx + gw - (bx + bw) - 0.1), h: bh, fontFace: fonts.jp, fontSize: 10, bold: true, color: inside ? (t.highlight ? theme.primaryDark : theme.white) : theme.ink, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-label") });
    }
  });
  recordSolid(rec, box, "ガント");
}

// ---------------------------------------------------------------- 層構造の図（ニューラルネット・構成図）
// spec: { layers: [3, 4, 2], labels?: ["入力", "隠れ層", "出力"], edgeLabels?: ["W1", "W2"] }
function layerDiagram(ctx, slide, rec, box, spec) {
  const { theme, fonts, pres } = ctx;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("diagram-bg") });
  const L = spec.layers, n = L.length;
  const top = box.y + 0.4, bottom = box.y + box.h - 0.42;
  const xs = L.map((_, i) => box.x + 0.45 + (i * (box.w - 0.9)) / (n - 1));
  const r = Math.min(0.16, ((bottom - top) / Math.max(...L)) * 0.32);
  const pos = L.map((k, li) => [...Array(k).keys()].map((j) => [xs[li], top + ((j + 0.5) * (bottom - top)) / k]));
  for (let li = 0; li < n - 1; li++) for (const a of pos[li]) for (const b of pos[li + 1]) {
    const x1 = a[0] + r, x2 = b[0] - r;
    slide.addShape(pres.shapes.LINE, { x: x1, y: Math.min(a[1], b[1]), w: x2 - x1, h: Math.abs(b[1] - a[1]) || 0.001, flipV: b[1] < a[1], line: { color: theme.rule, width: 0.75 }, objectName: ctx.nm("edge") });
  }
  const fills = [theme.accent, theme.primary, theme.negative, theme.muted];
  pos.forEach((layer, li) => layer.forEach(([x, y]) => slide.addShape(pres.shapes.OVAL, { x: x - r, y: y - r, w: 2 * r, h: 2 * r, fill: { color: li === 0 ? fills[0] : li === n - 1 ? fills[2] : fills[1] }, line: { color: theme.white, width: 1 }, objectName: ctx.nm("node") })));
  const lab = (t, cx, y) => slide.addText(runsOf(t, ctx, { fontSize: 10, bold: true, color: theme.primaryDark }), { x: cx - 0.7, y, w: 1.4, h: 0.26, align: "center", margin: 0, isTextBox: true, objectName: ctx.nm("diagram-label") });
  (spec.labels || []).forEach((t, i) => lab(t, xs[i], box.y + box.h - 0.34));
  (spec.edgeLabels || []).forEach((t, i) => lab(t, (xs[i] + xs[i + 1]) / 2, box.y + 0.08));
  recordSolid(rec, box, "図");
}

// ---------------------------------------------------------------- 画像
function image(ctx, slide, rec, box, spec, baseDir) {
  const path = require("path");
  slide.addImage({ path: path.resolve(baseDir, spec.path), x: box.x, y: box.y, w: box.w, h: box.h, sizing: { type: spec.fit || "contain", w: box.w, h: box.h }, altText: spec.alt || "", objectName: ctx.nm("image") });
  recordSolid(rec, box, "画像");
}

module.exports = { PAD, GAP, renderGroup, recordSolid, textBox, badge, planCard, planPanel, keyMessage, table, chart, kpiTile, planStepFlow, gantt, layerDiagram, image };
