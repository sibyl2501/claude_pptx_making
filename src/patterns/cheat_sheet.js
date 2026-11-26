// E4 早見表：公式・用語・手順を4〜8列の高密度な列で一覧にする
// columns: [{ title, body }]  highlight: 強調する列の番号（任意）
// 6列を超えると2段に折り返す

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme } = ctx;
  const n = spec.columns.length;
  const grid = spec.grid || (n > 6 ? `${Math.ceil(n / 2)}x2` : `${n}x1`);
  const boxes = S.gridOf(f.box, grid, n);
  const plans = spec.columns.map((c, i) => {
    const hl = spec.highlight === i;
    return C.planCard(ctx, f.slide, boxes[i], c, { fill: hl ? theme.accentTint : theme.primaryTint, header: { fill: hl ? theme.accent : theme.primary, color: hl ? theme.primaryDark : theme.white }, label: c.title });
  });
  C.renderGroup(ctx, f.rec, plans, ctx.sizes.table, { boost: false });
  S.finish(ctx, f, spec);
}

module.exports = { key: "cheat_sheet", id: "E4", label: "早見表", use: "公式・用語・手順を4〜8列の高密度な一覧に", required: ["title", "columns"], render };
