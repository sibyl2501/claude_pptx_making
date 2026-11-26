// パターン（スライドの型）。1パターン = 1関数。
// 各パターンは { id, label, use, required, render(ctx, spec, section, baseDir) } を持つ。
//
// Phase 1 の10パターン：
//   A1 cover / A3 section / A4 exec_summary / B2 card_grid / B3 comparison
//   C1 chart_insight / C3 kpi_dashboard / D1 roadmap / E1 concept_map / E3 derivation

const C = require("./components");
const { layoutColumns } = require("./blocks");
const { contentSlide, startRecord } = require("./deck");
const { runsOf, buildRuns, toParagraphs } = require("./markup");
const { fitSize } = require("./textfit");
const { GAP } = require("./config");

const MSG_H = 0.72; // 結論帯の高さ

// 本文領域から下端の結論帯ぶんを差し引く
function splitBottom(box, h) {
  return { main: { ...box, h: box.h - h - GAP }, bottom: { x: box.x, y: box.y + box.h - h, w: box.w, h } };
}

// ================================================================ A1 表紙
function cover(ctx, spec, section) {
  const { pres, page, theme, fonts } = ctx;
  const slide = pres.addSlide({ masterName: "COVER", sectionTitle: section });
  const rec = startRecord(ctx, spec);
  slide.addText(runsOf(spec.title, ctx, { fontSize: 32, bold: true, color: theme.white }), { placeholder: "title" });
  const x = 0.75, w = page.width - 1.5;
  if (spec.subtitle) slide.addText(runsOf(spec.subtitle, ctx, { fontSize: 15, color: theme.accent }), { x, y: 2.85, w, h: 0.5, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("subtitle") });
  if (spec.points && spec.points.length) {
    // 要点タイルは中身に合わせた高さにする（最大で日付の上まで）
    const n = spec.points.length, tw = (w - GAP * 2 * (n - 1)) / n, ty = 3.7;
    const maxH = page.height - 1.15 - ty;
    const paras = spec.points.map((p) => toParagraphs(p.body));
    let size = 15, need = 0;
    paras.forEach((ps) => { size = Math.min(size, fitSize(ps, tw - 0.36, maxH - 0.75, [15, 11]).size); });
    paras.forEach((ps) => { need = Math.max(need, require("./textfit").measure(ps, tw - 0.36, size).height); });
    const th = Math.min(maxH, Math.max(1.8, need + 0.85));
    spec.points.forEach((p, i) => {
      const tx = x + i * (tw + GAP * 2);
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx, y: ty, w: tw, h: th, rectRadius: 0.06, fill: { color: theme.onDarkPanel }, line: { type: "none" }, objectName: ctx.nm("cover-point") });
      slide.addText(runsOf(p.title, ctx, { fontSize: 14, bold: true, color: theme.accent }), { x: tx + 0.18, y: ty + 0.14, w: tw - 0.36, h: 0.4, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("cover-point-title") });
      slide.addText(buildRuns(paras[i], ctx, { fontSize: size, color: theme.white, paraAfter: 3 }), { x: tx + 0.18, y: ty + 0.6, w: tw - 0.36, h: th - 0.72, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("cover-point-body") });
    });
  }
  const meta = [spec.date, spec.org, spec.author].filter(Boolean).join("　｜　");
  if (meta) slide.addText(meta, { x, y: page.height - 0.95, w, h: 0.3, fontFace: fonts.jp, fontSize: 11, color: theme.onDarkMuted, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("cover-meta") });
  if (spec.notes) slide.addNotes(spec.notes);
  rec.areas.push({ area: 1, fill: 1, label: "表紙" });
}

// ================================================================ A3 章扉
function section(ctx, spec, sectionTitle) {
  const { pres, page, theme, fonts } = ctx;
  const slide = pres.addSlide({ masterName: "SECTION", sectionTitle });
  const rec = startRecord(ctx, spec);
  if (spec.number !== undefined) slide.addText(String(spec.number).padStart(2, "0"), { x: 0.75, y: 1.55, w: 3, h: 1.0, fontFace: fonts.jp, fontSize: 60, bold: true, color: theme.accent, margin: 0, valign: "bottom", isTextBox: true, objectName: ctx.nm("section-no") });
  slide.addText(runsOf(spec.title, ctx, { fontSize: 28, bold: true, color: theme.white }), { placeholder: "title" });
  if (spec.lead) slide.addText(buildRuns(toParagraphs(spec.lead), ctx, { fontSize: 14, color: theme.onDarkMuted, paraAfter: 4 }), { x: 0.75, y: 4.15, w: 5.9, h: 1.6, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("section-lead") });
  if (spec.points && spec.points.length) {
    const x = 7.1, w = page.width - x - 0.75, y0 = 1.6, hAll = page.height - y0 - 1.3;
    slide.addText(spec.pointsTitle || "この章で答える問い", { x, y: y0, w, h: 0.35, fontFace: fonts.jp, fontSize: 12, bold: true, color: theme.accent, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("section-points-title") });
    const n = spec.points.length, gh = 0.12, th = (hAll - 0.5 - gh * (n - 1)) / n;
    spec.points.forEach((p, i) => {
      const ty = y0 + 0.5 + i * (th + gh);
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: ty, w, h: th, rectRadius: 0.06, fill: { color: theme.onDarkPanel }, line: { type: "none" }, objectName: ctx.nm("section-point") });
      const runs = [...runsOf(p.title, ctx, { fontSize: 13, bold: true, color: theme.white })];
      runs[runs.length - 1].options.breakLine = !!p.body;
      if (p.body) runs.push(...runsOf(p.body, ctx, { fontSize: 11, color: theme.onDarkMuted }));
      slide.addText(runs, { x: x + 0.18, y: ty, w: w - 0.36, h: th, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("section-point-text") });
    });
  }
  if (spec.notes) slide.addNotes(spec.notes);
  rec.areas.push({ area: 1, fill: 1, label: "章扉" });
}

// ================================================================ A4 エグゼクティブサマリー
function exec_summary(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  const b = ctx.page.body;
  C.keyMessage(ctx, slide, rec, { x: b.x, y: b.y, w: b.w, h: MSG_H }, spec.conclusion, spec.conclusionLabel || "結論");
  const actH = spec.actions && spec.actions.length ? 1.35 : 0;
  const midY = b.y + MSG_H + GAP;
  const midH = b.h - MSG_H - GAP - (actH ? actH + GAP : 0);
  const n = spec.reasons.length, w = (b.w - GAP * (n - 1)) / n;
  const plans = spec.reasons.map((r, i) => C.planCard(ctx, slide, { x: b.x + i * (w + GAP), y: midY, w, h: midH }, { num: i + 1, ...r }));
  const actPlans = [];
  if (actH) {
    const ay = b.y + b.h - actH;
    const lw = 1.25;
    slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: b.x, y: ay, w: lw, h: actH, rectRadius: 0.06, fill: { color: ctx.theme.primary }, line: { type: "none" }, objectName: ctx.nm("actions-label-bg") });
    slide.addText(spec.actionsLabel || "次の行動", { x: b.x, y: ay, w: lw, h: actH, fontFace: ctx.fonts.jp, fontSize: 13, bold: true, color: ctx.theme.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("actions-label") });
    const m = spec.actions.length, aw = (b.w - lw - GAP * m) / m;
    spec.actions.forEach((a, i) => {
      const item = typeof a === "string" ? { title: "", body: a } : a;
      const meta = [item.owner, item.due].filter(Boolean).join("／");
      const body = [].concat(item.body || []);
      if (meta) body.push(`==${meta}==`);
      actPlans.push(C.planCard(ctx, slide, { x: b.x + lw + GAP + i * (aw + GAP), y: ay, w: aw, h: actH }, { title: item.title, body }, { fill: ctx.theme.accentTint, label: item.title || "次の行動" }));
    });
  }
  // 根拠カードは要約ページの主役なので、通常より大きい文字まで許す
  const [bmax, bmin] = ctx.sizes.body;
  C.renderGroup(ctx, rec, plans, [bmax + 2, bmin]);
  if (actPlans.length) C.renderGroup(ctx, rec, actPlans);
}

// ================================================================ B2 カードの格子（＋任意で右にパネル）
function card_grid(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body };
  let bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  const plans = [];
  if (spec.panel) {
    const pw = spec.panel.width || Math.min(3.6, box.w * 0.32);
    plans.push(C.planPanel(ctx, slide, { x: box.x + box.w - pw, y: box.y, w: pw, h: box.h }, spec.panel));
    box = { ...box, w: box.w - pw - GAP };
  }
  const [cols, rows] = (spec.grid || defaultGrid(spec.cards.length)).split("x").map(Number);
  if (cols * rows < spec.cards.length) throw new Error(`grid "${spec.grid}" にカード ${spec.cards.length} 枚は入りません`);
  const cw = (box.w - GAP * (cols - 1)) / cols, ch = (box.h - GAP * (rows - 1)) / rows;
  spec.cards.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    plans.push(C.planCard(ctx, slide, { x: box.x + col * (cw + GAP), y: box.y + row * (ch + GAP), w: cw, h: ch }, { num: spec.numbered === false ? undefined : i + 1, ...c }));
  });
  C.renderGroup(ctx, rec, plans);
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}
function defaultGrid(n) {
  return { 1: "1x1", 2: "2x1", 3: "3x1", 4: "2x2", 5: "3x2", 6: "3x2", 7: "4x2", 8: "4x2", 9: "3x3" }[n] || "3x3";
}

// ================================================================ B3 比較表
function comparison(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body }, bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  const headers = [spec.criteriaHeader || "評価軸", ...spec.options];
  const rows = spec.criteria.map((c) => [c.note ? [`**${c.name}**`, c.note] : c.name, ...c.values]);
  const widths = spec.widths || [1.15, ...spec.options.map(() => 2)];
  C.table(ctx, slide, rec, box, { headers, rows, widths, highlight: spec.recommend !== undefined ? spec.recommend + 1 : undefined });
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}

// ================================================================ C1 グラフ＋考察
function chart_insight(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body }, bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  const ratio = spec.chartWidth || 0.62;
  const cw = box.w * ratio;
  C.chart(ctx, slide, rec, { x: box.x, y: box.y, w: cw, h: box.h }, spec.chart);
  const ix = box.x + cw + GAP, iw = box.w - cw - GAP;
  const n = spec.insights.length, ih = (box.h - GAP * (n - 1)) / n;
  const plans = spec.insights.map((it, i) => C.planCard(ctx, slide, { x: ix, y: box.y + i * (ih + GAP), w: iw, h: ih }, { num: i + 1, ...it }));
  C.renderGroup(ctx, rec, plans);
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}

// ================================================================ C3 KPI ダッシュボード
function kpi_dashboard(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body }, bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  const kh = spec.kpiHeight || 1.6;
  const n = spec.kpis.length, kw = (box.w - GAP * (n - 1)) / n;
  spec.kpis.forEach((k, i) => C.kpiTile(ctx, slide, rec, { x: box.x + i * (kw + GAP), y: box.y, w: kw, h: kh }, k));
  const y = box.y + kh + GAP, h = box.h - kh - GAP;
  const cw = box.w * (spec.chartWidth || 0.62);
  C.chart(ctx, slide, rec, { x: box.x, y, w: cw, h }, spec.chart);
  C.renderGroup(ctx, rec, [C.planPanel(ctx, slide, { x: box.x + cw + GAP, y, w: box.w - cw - GAP, h }, spec.panel || { title: "読み取り", body: spec.insights })]);
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}

// ================================================================ D1 ロードマップ
function roadmap(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body }, bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  if (spec.goals && spec.goals.length) {
    const gh = spec.goalsHeight || 1.45;
    C.gantt(ctx, slide, rec, { ...box, h: box.h - gh - GAP }, spec);
    const n = spec.goals.length, gw = (box.w - GAP * (n - 1)) / n;
    const plans = spec.goals.map((g, i) => C.planCard(ctx, slide, { x: box.x + i * (gw + GAP), y: box.y + box.h - gh, w: gw, h: gh }, g));
    C.renderGroup(ctx, rec, plans);
  } else {
    C.gantt(ctx, slide, rec, box, spec);
  }
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}

// ================================================================ E1 概念の対応表＋流れ
function concept_map(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  const box = { ...ctx.page.body };
  const fh = spec.flow && spec.flow.length ? spec.flowHeight || 1.15 : 0;
  C.table(ctx, slide, rec, { ...box, h: box.h - (fh ? fh + GAP : 0) }, { headers: spec.headers, rows: spec.rows, widths: spec.widths, tagColors: spec.tagColors });
  if (fh) {
    const plan = C.planStepFlow(ctx, slide, { x: box.x, y: box.y + box.h - fh, w: box.w, h: fh }, spec.flow, { emphasize: spec.flowEmphasize });
    C.renderGroup(ctx, rec, [plan]);
  }
}

// ================================================================ E3 解説・導出（列にブロックを積む）
function derivation(ctx, spec, sectionTitle, baseDir) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  let box = { ...ctx.page.body }, bottom = null;
  if (spec.conclusion) { const s = splitBottom(box, MSG_H); box = s.main; bottom = s.bottom; }
  layoutColumns(ctx, slide, rec, box, spec.columns, baseDir);
  if (bottom) C.keyMessage(ctx, slide, rec, bottom, spec.conclusion);
}

const PATTERNS = {
  cover: { id: "A1", label: "表紙", use: "資料名・副題・要点3つ・日付", required: ["title"], render: cover },
  section: { id: "A3", label: "章扉", use: "章の番号・タイトル・この章で答える問い", required: ["title"], render: section },
  exec_summary: { id: "A4", label: "エグゼクティブサマリー", use: "結論 → 根拠（2〜4）→ 次の行動", required: ["title", "conclusion", "reasons"], render: exec_summary },
  card_grid: { id: "B2", label: "カードの格子", use: "並列の論点・要素を2×2〜3×3で。右にパネルも置ける", required: ["title", "cards"], render: card_grid },
  comparison: { id: "B3", label: "比較表", use: "案 × 評価軸。推奨案の列を強調、◎○△×を自動で色分け", required: ["title", "options", "criteria"], render: comparison },
  chart_insight: { id: "C1", label: "グラフ＋考察", use: "グラフ6割＋考察カード＋結論帯", required: ["title", "chart", "insights"], render: chart_insight },
  kpi_dashboard: { id: "C3", label: "KPI ダッシュボード", use: "KPI タイル3〜5個＋推移グラフ＋読み取り", required: ["title", "kpis", "chart"], render: kpi_dashboard },
  roadmap: { id: "D1", label: "ロードマップ", use: "ガント（担当・期間・マイルストーン）＋到達点", required: ["title", "periods", "tasks"], render: roadmap },
  concept_map: { id: "E1", label: "概念の対応表", use: "概念と役割の対応表＋下に流れ", required: ["title", "headers", "rows"], render: concept_map },
  derivation: { id: "E3", label: "解説・導出", use: "列ごとにカード・パネル・表・図・グラフを積む自由構成", required: ["title", "columns"], render: derivation },
};

module.exports = { PATTERNS };
