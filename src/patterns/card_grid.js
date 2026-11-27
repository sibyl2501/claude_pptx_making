// B2 カードの格子（＋任意で右にパネル）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  let box = f.box;
  const plans = [];
  if (spec.panel) {
    // パネルはカードと別に文字サイズを決める（パネルが詰まっていてもカードの文字を小さくしない）
    const pw = spec.panel.width || Math.min(3.6, box.w * 0.32);
    C.renderGroup(ctx, f.rec, [C.planPanel(ctx, f.slide, { x: box.x + box.w - pw, y: box.y, w: pw, h: box.h }, spec.panel)]);
    box = { ...box, w: box.w - pw - S.GAP };
  }
  const boxes = S.gridOf(box, spec.grid || S.defaultGrid(spec.cards.length), spec.cards.length);
  spec.cards.forEach((c, i) => plans.push(C.planCard(ctx, f.slide, boxes[i], { num: spec.numbered === false ? undefined : i + 1, ...c })));
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "card_grid", id: "B2", label: "カードの格子", use: "並列の論点・要素を2×2〜3×3で。右にパネルも置ける", required: ["title", "cards"], render };
