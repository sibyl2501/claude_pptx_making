// B5 ロジックツリー：課題を2〜3段に分解して線でつなぐ
// root: { title, body? }
// children: [{ title, body?, children?: [{ title, body? }] }]
// levels: 各段の見出し（任意。例 ["課題", "要因", "打ち手"]）

const C = require("../components");
const S = require("./_shared");
const { runsOf, buildRuns, toParagraphs } = require("../markup");
const { fitSize, measure } = require("../textfit");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme, fonts } = ctx;
  let box = f.box;
  const depth = spec.children.some((c) => c.children && c.children.length) ? 3 : 2;
  const conn = 0.36;
  const ratios = spec.ratios || (depth === 3 ? [0.2, 0.3, 0.5] : [0.28, 0.72]);
  const usable = box.w - conn * (depth - 1);
  const colW = ratios.map((r) => usable * r);
  const colX = [box.x];
  for (let i = 1; i < depth; i++) colX.push(colX[i - 1] + colW[i - 1] + conn);
  if (spec.levels) {
    spec.levels.slice(0, depth).forEach((t, i) => f.slide.addText(t, { x: colX[i], y: box.y, w: colW[i], h: 0.3, fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.muted, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("level") }));
    box = { ...box, y: box.y + 0.38, h: box.h - 0.38 };
  }
  // 末端の枠を縦に並べ、親はその範囲にまたがる
  const slots = spec.children.map((c) => (depth === 3 ? Math.max(1, (c.children || []).length) : 1));
  const total = slots.reduce((a, b) => a + b, 0);
  const g = 0.1;
  const slotH = (box.h - g * (total - 1)) / total;
  const plans = [];
  const mids = [];
  let k = 0;
  spec.children.forEach((c, ci) => {
    const top = box.y + k * (slotH + g);
    const h = slots[ci] * slotH + (slots[ci] - 1) * g;
    // 中段の箱は中身に合わせた高さにし、受け持つ範囲の中央に置く
    const titleLines = measure([{ text: c.title, bullet: false, level: 0 }], colW[1] - 0.28, ctx.sizes.cardTitle, 0).lines;
    const need = measure(toParagraphs(c.body), colW[1] - 0.28, ctx.sizes.body[0]).height + (titleLines * ctx.sizes.cardTitle * 1.2) / 72 + 0.45;
    const h1 = depth === 3 ? Math.min(h, Math.max(0.9, need)) : h;
    plans.push(C.planCard(ctx, f.slide, { x: colX[1], y: top + (h - h1) / 2, w: colW[1], h: h1 }, c, { fill: theme.primaryTint, label: c.title }));
    const childMids = [];
    if (depth === 3) {
      (c.children && c.children.length ? c.children : [null]).forEach((gc, gi) => {
        const y = top + gi * (slotH + g);
        if (gc) {
          plans.push(C.planCard(ctx, f.slide, { x: colX[2], y, w: colW[2], h: slotH }, gc, { fill: theme.white, line: theme.rule, label: gc.title }));
          childMids.push(y + slotH / 2);
        }
      });
    }
    mids.push({ y: top + h / 2, childMids });
    k += slots[ci];
  });
  C.renderGroup(ctx, f.rec, plans);
  // 根（主色の箱）
  const rh = Math.min(box.h, Math.max(1.5, box.h * 0.42));
  const rb = { x: colX[0], y: box.y + (box.h - rh) / 2, w: colW[0], h: rh };
  f.slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { ...rb, rectRadius: 0.06, fill: { color: theme.primary }, line: { type: "none" }, objectName: ctx.nm("root") });
  const rp = [{ text: spec.root.title, bullet: false, level: 0 }];
  const rbody = toParagraphs(spec.root.body);
  const rs = fitSize(rp.concat(rbody), rb.w - 0.3, rb.h - 0.3, [15, 11]).size;
  const runs = runsOf(spec.root.title, ctx, { fontSize: rs + 1, bold: true, color: theme.white });
  if (rbody.length) { runs[runs.length - 1].options.breakLine = true; runs.push(...buildRuns(rbody, ctx, { fontSize: rs - 1, color: theme.white, paraAfter: 2 })); }
  f.slide.addText(runs, { x: rb.x + 0.15, y: rb.y + 0.15, w: rb.w - 0.3, h: rb.h - 0.3, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("root-text") });
  f.rec.areas.push({ area: rb.w * rb.h, fill: 1, label: "根" });
  // 枝の線（親の右端 → 中間で縦 → 子の左端）
  const col = theme.muted;
  const link = (px, py, cx, cys) => {
    const mx = px + (cx - px) / 2;
    C.hline(ctx, f.slide, px, mx, py, col);
    const lo = Math.min(py, ...cys), hi = Math.max(py, ...cys);
    if (hi - lo > 0.01) C.vline(ctx, f.slide, mx, lo, hi, col);
    cys.forEach((y) => C.hline(ctx, f.slide, mx, cx, y, col));
  };
  link(rb.x + rb.w, rb.y + rb.h / 2, colX[1], mids.map((m) => m.y));
  if (depth === 3) mids.forEach((m) => { if (m.childMids.length) link(colX[1] + colW[1], m.y, colX[2], m.childMids); });
  S.finish(ctx, f, spec);
}

module.exports = { key: "logic_tree", id: "B5", label: "ロジックツリー", use: "課題・要因・打ち手を2〜3段に分解して線でつなぐ", required: ["title", "root", "children"], render };
