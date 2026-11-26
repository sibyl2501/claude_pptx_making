// B3 比較表：案 × 評価軸。推奨案の列を強調、◎○△×を自動で色分け

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const headers = [spec.criteriaHeader || "評価軸", ...spec.options];
  const rows = spec.criteria.map((c) => [c.note ? [`**${c.name}**`, c.note] : c.name, ...c.values]);
  const widths = spec.widths || [1.15, ...spec.options.map(() => 2)];
  C.table(ctx, f.slide, f.rec, f.box, { headers, rows, widths, highlight: spec.recommend !== undefined ? spec.recommend + 1 : undefined });
  S.finish(ctx, f, spec);
}

module.exports = { key: "comparison", id: "B3", label: "比較表", use: "案 × 評価軸。推奨案の列を強調、◎○△×を自動で色分け", required: ["title", "options", "criteria"], render };
