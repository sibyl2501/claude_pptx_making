// B1 3〜5本柱：上に結論（屋根）、同格の柱、下に土台
// pillars: [{ title, body, stat? }]  roof: 結論の文（必須）  foundation: 土台の文（任意）

const C = require("../components");
const S = require("./_shared");

function render(ctx, spec, section) {
  const f = S.frame(ctx, { ...spec, conclusion: undefined }, section);
  const { theme, fonts } = ctx;
  let box = f.box;
  C.keyMessage(ctx, f.slide, f.rec, { ...box, h: S.MSG_H }, spec.roof, spec.roofLabel || "目指す姿");
  box = { ...box, y: box.y + S.MSG_H + S.GAP, h: box.h - S.MSG_H - S.GAP };
  if (spec.foundation) {
    const fh = 0.55;
    const fb = { x: box.x, y: box.y + box.h - fh, w: box.w, h: fh };
    f.slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { ...fb, rectRadius: 0.06, fill: { color: theme.neutralTint }, line: { type: "none" }, objectName: ctx.nm("foundation") });
    f.slide.addText([
      { text: (spec.foundationLabel || "土台") + "　", options: { fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.muted } },
      ...require("../markup").runsOf(spec.foundation, ctx, { fontSize: 12, bold: true, color: theme.primaryDark }),
    ], { ...fb, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("foundation-text") });
    f.rec.areas.push({ area: fb.w * fb.h, fill: 1, label: "土台" });
    box = { ...box, h: box.h - fh - S.GAP };
  }
  const boxes = S.columnsOf(box, spec.pillars.length);
  const plans = spec.pillars.map((p, i) => C.planCard(ctx, f.slide, boxes[i], { num: spec.numbered === false ? undefined : i + 1, ...p }, { header: { fill: theme.primary, color: theme.white } }));
  C.renderGroup(ctx, f.rec, plans);
}

module.exports = { key: "pillars", id: "B1", label: "本柱（屋根と土台）", use: "目指す姿を支える3〜5本の同格の柱と、共通の土台", required: ["title", "roof", "pillars"], render };
