// C1 グラフ＋考察：グラフ6割＋番号付きの考察カード＋結論帯

const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  S.chartWithInsights(ctx, f.slide, f.rec, f.box, spec.chart, spec.insights, spec.chartWidth || 0.62);
  S.finish(ctx, f, spec);
}

module.exports = { key: "chart_insight", id: "C1", label: "グラフ＋考察", use: "グラフ6割＋考察カード＋結論帯", required: ["title", "chart", "insights"], render };
