// B4 2×2 マトリクス：縦軸・横軸で4象限に分け、項目を位置づける
// xAxis / yAxis: { label, low, high }
// quadrants: 4つを読む順（左上・右上・左下・右下）で { title, body, highlight? }
// items: [{ label, x: 0〜1, y: 0〜1, highlight? }]（任意。右上が x=1, y=1）
// panel: { title, body }（任意。右側に解説）

const C = require("../components");
const S = require("./_shared");
const { runsOf } = require("../markup");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme, fonts } = ctx;
  const box = f.box;
  const plans = [];
  const mw = spec.panel ? box.w * (spec.matrixWidth || 0.64) : box.w;
  const axis = 0.42;
  const gx = box.x + axis, gy = box.y, gw = mw - axis, gh = box.h - axis;
  const q = 0.06;
  const qw = (gw - q) / 2, qh = (gh - q) / 2;
  const qBoxes = [
    { x: gx, y: gy, w: qw, h: qh }, { x: gx + qw + q, y: gy, w: qw, h: qh },
    { x: gx, y: gy + qh + q, w: qw, h: qh }, { x: gx + qw + q, y: gy + qh + q, w: qw, h: qh },
  ];
  const hasItems = spec.items && spec.items.length;
  // 項目の点を置くときは、象限の地を先に塗り、文字は上半分だけに入れる（点は下半分に置く想定）
  spec.quadrants.forEach((qd, i) => {
    const fill = qd.highlight ? theme.accentTint : theme.primaryTint;
    let b = qBoxes[i];
    if (hasItems) {
      f.slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { ...b, rectRadius: 0.06, fill: { color: fill }, line: { type: "none" }, objectName: ctx.nm("quadrant") });
      b = { ...b, h: b.h * 0.5 };
    }
    plans.push(C.planCard(ctx, f.slide, b, qd, { fill, label: qd.title }));
  });
  if (spec.panel) plans.push(C.planPanel(ctx, f.slide, { x: box.x + mw + S.GAP, y: box.y, w: box.w - mw - S.GAP, h: box.h }, spec.panel));
  C.renderGroup(ctx, f.rec, plans);
  // 軸（矢印）と軸ラベル
  const ax = gx - 0.12, ay = gy + gh + 0.12;
  C.vline(ctx, f.slide, ax, ay, gy, theme.muted, 1.5, true);
  C.hline(ctx, f.slide, ax, gx + gw, ay, theme.muted, 1.5, true);
  const axisText = (a) => `${a.low || "低"}　←　${a.label}　→　${a.high || "高"}`;
  f.slide.addText(runsOf(axisText(spec.xAxis), ctx, { fontSize: 11, bold: true, color: theme.primaryDark }), { x: gx, y: ay + 0.04, w: gw, h: axis - 0.16, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("x-axis") });
  f.slide.addText(runsOf(axisText(spec.yAxis), ctx, { fontSize: 11, bold: true, color: theme.primaryDark }), { x: box.x + 0.14 - gh / 2, y: gy + gh / 2 - 0.15, w: gh, h: 0.3, rotate: 270, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("y-axis") });
  // 項目の点
  (spec.items || []).forEach((it) => {
    const cx = gx + it.x * gw, cy = gy + (1 - it.y) * gh, d = 0.2;
    f.slide.addShape(ctx.pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: it.highlight ? theme.accent : theme.primary }, line: { color: theme.white, width: 1 }, objectName: ctx.nm("item") });
    f.slide.addText(runsOf(it.label, ctx, { fontSize: 10.5, bold: true, color: theme.ink }), { x: cx + d / 2 + 0.04, y: cy - 0.14, w: 1.8, h: 0.28, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("item-label") });
  });
  S.finish(ctx, f, spec);
}

module.exports = { key: "matrix_2x2", id: "B4", label: "2×2 マトリクス", use: "2つの軸で4象限に分けて位置づける（優先度・ポートフォリオ）", required: ["title", "xAxis", "yAxis", "quadrants"], render };
