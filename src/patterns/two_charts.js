// C2 グラフ2つの比較：左右にグラフ、下に比較の考察
// charts: [グラフ, グラフ]  insights: [{ title, body }]（任意）  sameScale: true で縦軸をそろえる

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  let charts = spec.charts.map((c) => ({ ...c }));
  if (spec.sameScale) {
    const vals = charts.flatMap((c) => c.series.flatMap((s) => s.values));
    const stacked = charts.some((c) => /stacked/.test(c.type || ""));
    const max = stacked ? Math.max(...charts.flatMap((c) => c.categories.map((_, j) => c.series.reduce((a, s) => a + (s.values[j] || 0), 0)))) : Math.max(...vals);
    const min = Math.min(0, ...vals);
    charts = charts.map((c) => ({ ...c, min: c.min ?? min, max: c.max ?? niceCeil(max) }));
  }
  const ih = spec.insights && spec.insights.length ? spec.insightsHeight || box.h * 0.34 : 0;
  const top = { ...box, h: box.h - (ih ? ih + S.GAP : 0) };
  S.columnsOf(top, 2).forEach((b, i) => C.chart(ctx, f.slide, f.rec, b, charts[i]));
  if (ih) {
    const boxes = S.columnsOf({ ...box, y: box.y + box.h - ih, h: ih }, spec.insights.length);
    C.renderGroup(ctx, f.rec, spec.insights.map((it, i) => C.planCard(ctx, f.slide, boxes[i], { num: i + 1, ...it })));
  }
  S.finish(ctx, f, spec);
}

// 目盛りがきりのよい上限（1, 2, 2.5, 5 × 10^n）
function niceCeil(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

module.exports = { key: "two_charts", id: "C2", label: "グラフ2つの比較", use: "2つのグラフを並べ（縦軸をそろえられる）、下に比較の考察", required: ["title", "charts"], render };
