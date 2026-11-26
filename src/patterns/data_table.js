// C4 詳細表：行が多い表。入りきらなければ見出し行付きで次のページへ自動で分ける
// headers, rows, widths?, align?, highlight?, rowsPerPage?（1ページの行数を固定したいとき）

const C = require("../components");
const S = require("./_shared");
const { toParagraphs } = require("../markup");
const { measure } = require("../textfit");

function render(ctx, spec, section) {
  const pages = paginate(ctx, spec);
  pages.forEach((rows, p) => {
    const title = p === 0 ? spec.title : `${spec.title}（続き ${p + 1}/${pages.length}）`;
    const last = p === pages.length - 1;
    const f = S.frame(ctx, { ...spec, title, conclusion: last ? spec.conclusion : undefined, notes: p === 0 ? spec.notes : undefined }, section);
    C.table(ctx, f.slide, f.rec, f.box, { headers: spec.headers, rows, widths: spec.widths, align: spec.align, highlight: spec.highlight, tagColors: spec.tagColors });
    S.finish(ctx, f, last ? spec : {});
  });
}

// 標準サイズの文字で1ページに入る行数ずつに分ける
function paginate(ctx, spec) {
  if (spec.rowsPerPage) {
    const out = [];
    for (let i = 0; i < spec.rows.length; i += spec.rowsPerPage) out.push(spec.rows.slice(i, i + spec.rowsPerPage));
    return out;
  }
  const body = ctx.page.body;
  const boxH = body.h - (spec.conclusion ? S.MSG_H + S.GAP : 0);
  const ncol = spec.headers.length;
  const ratio = spec.widths || Array(ncol).fill(1);
  const sum = ratio.reduce((a, b) => a + b, 0);
  const colW = ratio.map((r) => (body.w * r) / sum);
  const size = (ctx.sizes.table[0] + ctx.sizes.table[1]) / 2 + 0.5;
  const cellText = (v) => (typeof v === "object" && v !== null && !Array.isArray(v) ? v.text : v);
  const rowH = (r) => Math.max(...r.map((v, j) => measure(toParagraphs(cellText(v)), colW[j] - 0.16, size, 0).height)) + 0.1;
  const headH = rowH(spec.headers);
  const heights = spec.rows.map(rowH);
  // まず詰めて必要なページ数を出し、そのページ数で行をなるべく均等に分ける（最後のページだけ数行、を避ける）
  let count = 1, used = headH;
  for (const h of heights) {
    if (used + h > boxH && used > headH) { count++; used = headH; }
    used += h;
  }
  const per = Math.ceil(spec.rows.length / count);
  const pages = [];
  for (let i = 0; i < spec.rows.length; i += per) pages.push(spec.rows.slice(i, i + per));
  // 均等に分けた結果どこかのページがあふれるなら、詰める分け方に戻す
  const fits = pages.every((p, k) => headH + heights.slice(k * per, k * per + p.length).reduce((a, b) => a + b, 0) <= boxH);
  if (fits) return pages;
  const greedy = [[]];
  used = headH;
  spec.rows.forEach((r, i) => {
    if (used + heights[i] > boxH && greedy[greedy.length - 1].length) { greedy.push([]); used = headH; }
    greedy[greedy.length - 1].push(r);
    used += heights[i];
  });
  return greedy;
}

module.exports = { key: "data_table", id: "C4", label: "詳細表", use: "行の多い表。入りきらなければ見出し付きで自動で改ページ", required: ["title", "headers", "rows"], render };
