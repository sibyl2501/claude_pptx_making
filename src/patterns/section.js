// A3 章扉：章の番号・タイトル・リード文・この章で答える問い

const { startRecord } = require("../deck");
const { runsOf, buildRuns, toParagraphs } = require("../markup");

function render(ctx, spec, sectionTitle) {
  const { pres, page, theme, fonts } = ctx;
  const slide = pres.addSlide({ masterName: "SECTION", sectionTitle });
  const rec = startRecord(ctx, spec);
  if (spec.number !== undefined) slide.addText(String(spec.number).padStart(2, "0"), { x: 0.75, y: 1.55, w: 3, h: 1.0, fontFace: fonts.jp, fontSize: 60, bold: true, color: theme.accent, margin: 0, valign: "bottom", isTextBox: true, objectName: ctx.nm("section-no") });
  slide.addText(runsOf(spec.title, ctx, { fontSize: 28, bold: true, color: theme.white }), { placeholder: "title" });
  if (spec.lead) slide.addText(buildRuns(toParagraphs(spec.lead), ctx, { fontSize: 14, color: theme.onDarkMuted, paraAfter: 4 }), { x: 0.75, y: 4.15, w: 5.9, h: 1.6, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("section-lead") });
  if (spec.points && spec.points.length) {
    const x = page.width * 0.6, w = page.width - x - 0.75, y0 = 1.6, hAll = page.height - y0 - 1.3;
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

module.exports = { key: "section", id: "A3", label: "章扉", use: "章の番号・タイトル・この章で答える問い", required: ["title"], render };
