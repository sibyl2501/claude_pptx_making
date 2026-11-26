// E2 グラフ＋カード：左にグラフと「読み方」のパネル、右にカードの格子
// chart, panel: { title, body }, cards: [{ title, body }], grid?: "2x3"

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  const lw = box.w * (spec.chartWidth || 0.44);
  const ch = spec.panel ? (box.h - S.GAP) * (spec.chartHeight || 0.58) : box.h;
  C.chart(ctx, f.slide, f.rec, { x: box.x, y: box.y, w: lw, h: ch }, spec.chart);
  const plans = [];
  if (spec.panel) plans.push(C.planPanel(ctx, f.slide, { x: box.x, y: box.y + ch + S.GAP, w: lw, h: box.h - ch - S.GAP }, spec.panel));
  const right = { x: box.x + lw + S.GAP, y: box.y, w: box.w - lw - S.GAP, h: box.h };
  const grid = spec.grid || (spec.cards.length <= 3 ? `1x${spec.cards.length}` : `2x${Math.ceil(spec.cards.length / 2)}`);
  const boxes = S.gridOf(right, grid, spec.cards.length);
  spec.cards.forEach((c, i) => plans.push(C.planCard(ctx, f.slide, boxes[i], { num: spec.numbered === false ? undefined : i + 1, ...c })));
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "chart_cards", id: "E2", label: "グラフ＋カード", use: "左にグラフと読み方、右に解説カードの格子", required: ["title", "chart", "cards"], render };
