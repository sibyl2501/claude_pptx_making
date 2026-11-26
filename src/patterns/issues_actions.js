// D2 課題 → 影響 → 対策 → 担当 の対応表
// rows: [{ issue, detail?, priority?（高・中・低）, impact, action, owner }]

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const hasPri = spec.rows.some((r) => r.priority);
  const L = { issue: "課題", priority: "優先度", impact: "影響", action: "対策", owner: "担当・期限", ...(spec.labels || {}) };
  const headers = [L.issue, ...(hasPri ? [L.priority] : []), L.impact, L.action, L.owner];
  const rows = spec.rows.map((r) => [
    r.detail ? [`**${r.issue}**`, r.detail] : r.issue,
    ...(hasPri ? [r.priority || ""] : []),
    r.impact, r.action, r.owner,
  ]);
  const widths = spec.widths || [2.4, ...(hasPri ? [0.75] : []), 2.2, 3.4, 1.4];
  const align = hasPri ? ["left", "center", "left", "left", "left"] : undefined;
  C.table(ctx, f.slide, f.rec, f.box, { headers, rows, widths, align, tagColors: { 高: "negative", 中: "accentText", 低: "muted" } });
  S.finish(ctx, f, spec);
}

module.exports = { key: "issues_actions", id: "D2", label: "課題と対策", use: "課題ごとに影響・対策・担当（・優先度）を対応づける", required: ["title", "rows"], render };
