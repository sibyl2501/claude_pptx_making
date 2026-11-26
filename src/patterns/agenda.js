// A2 目次：章ごとの要点とページ
// items: [{ title, body?, page? }]  current: 強調する章の番号（0始まり、任意）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const gap = spec.items.length > 6 ? 0.1 : S.GAP;
  const boxes = S.rowsOf(f.box, spec.items.length, gap);
  const plans = spec.items.map((it, i) => C.planRow(ctx, f.slide, boxes[i], {
    label: String(i + 1).padStart(2, "0"),
    title: it.title,
    body: it.body,
    meta: it.page !== undefined ? `p.${it.page}` : undefined,
  }, { fill: spec.current === i ? ctx.theme.accentTint : ctx.theme.primaryTint, labelColor: spec.current === i ? ctx.colors.accentText : ctx.theme.primary }));
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "agenda", id: "A2", label: "目次", use: "章ごとの要点とページ番号（3〜8章）", required: ["title", "items"], render };
