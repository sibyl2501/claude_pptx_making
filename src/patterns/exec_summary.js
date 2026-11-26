// A4 エグゼクティブサマリー：結論 → 根拠（2〜4）→ 次の行動

const C = require("../components");
const { contentSlide } = require("../deck");
const { MSG_H, GAP } = require("./_shared");

function render(ctx, spec, sectionTitle) {
  const { slide, rec } = contentSlide(ctx, spec, sectionTitle);
  const b = ctx.page.body;
  C.keyMessage(ctx, slide, rec, { x: b.x, y: b.y, w: b.w, h: MSG_H }, spec.conclusion, spec.conclusionLabel || "結論");
  const actH = spec.actions && spec.actions.length ? 1.35 : 0;
  const midY = b.y + MSG_H + GAP;
  const midH = b.h - MSG_H - GAP - (actH ? actH + GAP : 0);
  const n = spec.reasons.length, w = (b.w - GAP * (n - 1)) / n;
  const plans = spec.reasons.map((r, i) => C.planCard(ctx, slide, { x: b.x + i * (w + GAP), y: midY, w, h: midH }, { num: i + 1, ...r }));
  const actPlans = [];
  if (actH) {
    const ay = b.y + b.h - actH;
    const lw = 1.25;
    slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: b.x, y: ay, w: lw, h: actH, rectRadius: 0.06, fill: { color: ctx.theme.primary }, line: { type: "none" }, objectName: ctx.nm("actions-label-bg") });
    slide.addText(spec.actionsLabel || "次の行動", { x: b.x, y: ay, w: lw, h: actH, fontFace: ctx.fonts.jp, fontSize: 13, bold: true, color: ctx.theme.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("actions-label") });
    const m = spec.actions.length, aw = (b.w - lw - GAP * m) / m;
    spec.actions.forEach((a, i) => {
      const item = typeof a === "string" ? { title: "", body: a } : a;
      const meta = [item.owner, item.due].filter(Boolean).join("／");
      const body = [].concat(item.body || []);
      if (meta) body.push(`==${meta}==`);
      actPlans.push(C.planCard(ctx, slide, { x: b.x + lw + GAP + i * (aw + GAP), y: ay, w: aw, h: actH }, { title: item.title, body }, { fill: ctx.theme.accentTint, label: item.title || "次の行動" }));
    });
  }
  // 根拠カードは要約ページの主役なので、通常より大きい文字まで許す
  const [bmax, bmin] = ctx.sizes.body;
  C.renderGroup(ctx, rec, plans, [bmax + 2, bmin]);
  if (actPlans.length) C.renderGroup(ctx, rec, actPlans);
}

module.exports = { key: "exec_summary", id: "A4", label: "エグゼクティブサマリー", use: "結論 → 根拠（2〜4）→ 次の行動", required: ["title", "conclusion", "reasons"], render };
