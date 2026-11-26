// E5 演習：問題とヒント（解答はスピーカーノートへ自動で入れる）＋学習ロードマップ
// questions: [{ q, hint?, answer? }]  roadmap: [{ title, body }]（任意）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const answers = spec.questions.filter((q) => q.answer).map((q) => `Q${spec.questions.indexOf(q) + 1}. ${q.answer}`);
  const notes = [spec.notes, answers.length ? "解答\n" + answers.join("\n") : ""].filter(Boolean).join("\n\n");
  const f = S.frame(ctx, { ...spec, notes }, section);
  const { theme } = ctx;
  const box = f.box;
  const qw = spec.roadmap && spec.roadmap.length ? box.w * (spec.questionsWidth || 0.6) : box.w;
  const qbox = S.subhead(ctx, f.slide, { ...box, w: qw }, spec.questionsLabel || (answers.length ? "演習問題（解答はスライドノート）" : "演習問題"));
  const qb = S.rowsOf(qbox, spec.questions.length, 0.1);
  const plans = spec.questions.map((q, i) => C.planRow(ctx, f.slide, qb[i], { label: `Q${i + 1}`, body: [q.q, ...(q.hint ? [`==ヒント：==${q.hint}`] : [])] }, { labelW: 0.7, labelSize: 16 }));
  if (qw < box.w) {
    const rbox = S.subhead(ctx, f.slide, { ...box, x: box.x + qw + S.GAP, w: box.w - qw - S.GAP }, spec.roadmapLabel || "学習ロードマップ");
    const rb = S.rowsOf(rbox, spec.roadmap.length, 0.1);
    spec.roadmap.forEach((r, i) => plans.push(C.planRow(ctx, f.slide, rb[i], { label: String(i + 1), title: r.title, body: r.body }, { labelW: 0.55, labelSize: 16, fill: theme.white, line: theme.rule })));
  }
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "exercises", id: "E5", label: "演習", use: "問題とヒント（解答はノートへ）＋学習ロードマップ", required: ["title", "questions"], render };
