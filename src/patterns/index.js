// パターン一覧。1パターン = 1ファイル。
// 各ファイルは { key, id, label, use, required, render(ctx, spec, section, baseDir) } を書き出す。
// 新しいパターンを足すときは、ファイルを作ってこの一覧に加え、schema と examples/catalog.json も更新する。

const files = [
  "cover", "agenda", "section", "exec_summary",
  "pillars", "card_grid", "comparison", "matrix_2x2", "logic_tree", "process", "before_after",
  "chart_insight", "two_charts", "kpi_dashboard", "data_table", "waterfall",
  "roadmap", "issues_actions", "next_steps",
  "concept_map", "chart_cards", "derivation", "cheat_sheet", "exercises",
  "references",
];

const PATTERNS = {};
for (const f of files) {
  const p = require(`./${f}`);
  PATTERNS[p.key] = p;
}

module.exports = { PATTERNS };
