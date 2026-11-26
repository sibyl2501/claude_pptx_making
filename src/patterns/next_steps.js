// D3 次の行動：左に「決めていただきたいこと」、右に行動の一覧（担当・期限）
// decisions: [{ title, body?, due? }]  actions: [{ title, body?, owner, due }]

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme } = ctx;
  const box = f.box;
  const lw = box.w * (spec.leftWidth || 0.42);
  let left = S.subhead(ctx, f.slide, { ...box, w: lw }, spec.decisionsLabel || "決めていただきたいこと", ctx.colors.accentText);
  const lb = S.rowsOf(left, spec.decisions.length);
  const plans = spec.decisions.map((d, i) => C.planCard(ctx, f.slide, lb[i], { num: i + 1, title: d.title, body: [].concat(d.body || []).concat(d.due ? [`==期限：${d.due}==`] : []) }, { fill: theme.accentTint, label: d.title }));
  C.renderGroup(ctx, f.rec, plans);
  let right = S.subhead(ctx, f.slide, { ...box, x: box.x + lw + S.GAP, w: box.w - lw - S.GAP }, spec.actionsLabel || "次の行動");
  const rows = spec.actions.map((a) => [a.body ? [`**${a.title}**`, ...[].concat(a.body)] : a.title, a.owner || "", a.due || ""]);
  C.table(ctx, f.slide, f.rec, right, { headers: ["行動", "担当", "期限"], rows, widths: [3.2, 1.2, 0.9] });
  S.finish(ctx, f, spec);
}

module.exports = { key: "next_steps", id: "D3", label: "次の行動", use: "決めてほしいことと、行動・担当・期限の一覧", required: ["title", "decisions", "actions"], render };
