// C3 KPI ダッシュボード：KPI タイル＋推移グラフ＋読み取り

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  const kh = spec.kpiHeight || 1.6;
  S.columnsOf({ ...box, h: kh }, spec.kpis.length).forEach((b, i) => C.kpiTile(ctx, f.slide, f.rec, b, spec.kpis[i]));
  const y = box.y + kh + S.GAP, h = box.h - kh - S.GAP;
  const cw = box.w * (spec.chartWidth || 0.62);
  C.chart(ctx, f.slide, f.rec, { x: box.x, y, w: cw, h }, spec.chart);
  C.renderGroup(ctx, f.rec, [C.planPanel(ctx, f.slide, { x: box.x + cw + S.GAP, y, w: box.w - cw - S.GAP, h }, spec.panel || { title: "読み取り", body: spec.insights })]);
  S.finish(ctx, f, spec);
}

module.exports = { key: "kpi_dashboard", id: "C3", label: "KPI ダッシュボード", use: "KPI タイル3〜5個＋推移グラフ＋読み取り", required: ["title", "kpis", "chart"], render };
