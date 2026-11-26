// A1 表紙：資料名・副題・要点タイル・日付

const { startRecord } = require("../deck");
const { runsOf, buildRuns, toParagraphs } = require("../markup");
const { fitSize, measure } = require("../textfit");
const { GAP } = require("../config");

function render(ctx, spec, section) {
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
    paras.forEach((ps) => { need = Math.max(need, measure(ps, tw - 0.36, size).height); });
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

module.exports = { key: "cover", id: "A1", label: "表紙", use: "資料名・副題・要点タイル（2〜4）・日付", required: ["title"], render };
