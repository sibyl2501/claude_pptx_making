// D1 ロードマップ：ガント（担当・期間・マイルストーン）＋到達点

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  if (spec.goals && spec.goals.length) {
    const gh = spec.goalsHeight || 1.45;
    C.gantt(ctx, f.slide, f.rec, { ...box, h: box.h - gh - S.GAP }, spec);
    const boxes = S.columnsOf({ ...box, y: box.y + box.h - gh, h: gh }, spec.goals.length);
    C.renderGroup(ctx, f.rec, spec.goals.map((g, i) => C.planCard(ctx, f.slide, boxes[i], g)));
  } else {
    C.gantt(ctx, f.slide, f.rec, box, spec);
  }
  S.finish(ctx, f, spec);
}

module.exports = { key: "roadmap", id: "D1", label: "ロードマップ", use: "ガント（担当・期間・マイルストーン）＋到達点", required: ["title", "periods", "tasks"], render };
