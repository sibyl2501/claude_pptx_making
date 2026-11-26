// B7 現状 → あるべき姿：観点ごとに左右を対応させて比べる
// rows: [{ label, before, after }]  beforeLabel / afterLabel: 列の見出し（任意）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme, fonts } = ctx;
  const box = f.box;
  const hasLabel = spec.rows.some((r) => r.label);
  const lw = hasLabel ? spec.labelWidth || 1.5 : 0;
  const aw = 0.42;
  const cw = (box.w - lw - aw - (hasLabel ? S.GAP : 0)) / 2;
  const bx = box.x + lw + (hasLabel ? S.GAP : 0), ax = bx + cw, afx = ax + aw;
  const hh = 0.42;
  const head = (x, text, fill, color) => {
    f.slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x, y: box.y, w: cw, h: hh, rectRadius: 0.06, fill: { color: fill }, line: { type: "none" }, objectName: ctx.nm("ba-head") });
    f.slide.addText(text, { x, y: box.y, w: cw, h: hh, fontFace: fonts.jp, fontSize: 13, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("ba-head-text") });
  };
  head(bx, spec.beforeLabel || "現状", theme.rule, theme.ink);
  head(afx, spec.afterLabel || "あるべき姿", theme.primary, theme.white);
  const rowsBox = { ...box, y: box.y + hh + 0.1, h: box.h - hh - 0.1 };
  const rb = S.rowsOf(rowsBox, spec.rows.length, 0.1);
  const plans = [];
  spec.rows.forEach((r, i) => {
    const b = rb[i];
    if (hasLabel) {
      f.slide.addText(require("../markup").runsOf(r.label || "", ctx, { fontSize: 12, bold: true, color: theme.primaryDark }), { x: box.x, y: b.y, w: lw, h: b.h, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("ba-label") });
    }
    plans.push(C.planCard(ctx, f.slide, { x: bx, y: b.y, w: cw, h: b.h }, { body: r.before }, { fill: theme.neutralTint, label: `${r.label || i + 1}（現状）` }));
    plans.push(C.planCard(ctx, f.slide, { x: afx, y: b.y, w: cw, h: b.h }, { body: r.after }, { fill: theme.primaryTint, label: `${r.label || i + 1}（あるべき姿）` }));
    C.arrowRight(ctx, f.slide, ax + aw / 2, b.y + b.h / 2, 0.24, theme.accent);
  });
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "before_after", id: "B7", label: "現状 → あるべき姿", use: "観点ごとに現状とあるべき姿（課題と解決策）を左右で対比", required: ["title", "rows"], render };
