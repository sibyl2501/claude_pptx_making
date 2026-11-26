// E1 概念の対応表＋下に流れ

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const box = f.box;
  const fh = spec.flow && spec.flow.length ? spec.flowHeight || 1.0 : 0;
  C.table(ctx, f.slide, f.rec, { ...box, h: box.h - (fh ? fh + S.GAP : 0) }, { headers: spec.headers, rows: spec.rows, widths: spec.widths, align: spec.align, tagColors: spec.tagColors });
  if (fh) {
    const plan = C.planStepFlow(ctx, f.slide, { x: box.x, y: box.y + box.h - fh, w: box.w, h: fh }, spec.flow, { emphasize: spec.flowEmphasize });
    C.renderGroup(ctx, f.rec, [plan]);
  }
  S.finish(ctx, f, spec);
}

module.exports = { key: "concept_map", id: "E1", label: "概念の対応表", use: "概念と役割の対応表＋下に流れ", required: ["title", "headers", "rows"], render };
