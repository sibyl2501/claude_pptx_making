// C5 滝グラフ（増減の分解）＋考察
// waterfall: { title, start: { label, value }, steps: [{ label, value }], endLabel, unit?, format? }
// insights: [{ title, body }]

const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  S.chartWithInsights(ctx, f.slide, f.rec, f.box, { ...spec.waterfall, type: "waterfall" }, spec.insights, spec.chartWidth || 0.62);
  S.finish(ctx, f, spec);
}

module.exports = { key: "waterfall", id: "C5", label: "滝グラフ（増減の分解）", use: "始点から終点までの増減要因を分解して示す", required: ["title", "waterfall", "insights"], render };
