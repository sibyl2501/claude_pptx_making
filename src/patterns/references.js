// F1 参考文献・用語集
// glossary: [{ term, desc }]（任意）  references: ["著者（年）『書名』…"]（任意）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  const hasG = spec.glossary && spec.glossary.length;
  const hasR = spec.references && spec.references.length;
  const gw = hasG && hasR ? box.w * (spec.glossaryWidth || 0.55) : box.w;
  if (hasG) {
    const gb = S.subhead(ctx, f.slide, { ...box, w: gw }, spec.glossaryLabel || "用語集");
    C.table(ctx, f.slide, f.rec, gb, { headers: ["用語", "意味"], rows: spec.glossary.map((g) => [g.term, g.desc]), widths: [1, 2.6] });
  }
  if (hasR) {
    const rb = hasG ? { ...box, x: box.x + gw + S.GAP, w: box.w - gw - S.GAP } : box;
    const body = spec.references.map((r, i) => `[${i + 1}] ${r}`);
    C.renderGroup(ctx, f.rec, [C.planPanel(ctx, f.slide, rb, { title: spec.referencesLabel || "参考文献", body })], ctx.sizes.table);
  }
  S.finish(ctx, f, spec);
}

module.exports = { key: "references", id: "F1", label: "参考文献・用語集", use: "用語集の表と参考文献の一覧", required: ["title"], render };
