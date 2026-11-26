// B6 手順・プロセス：矢羽根の見出し（3〜6段）と、段ごとの詳細
// steps: [{ title, subtitle?, body }]  emphasize: 強調する段の番号（任意）

const C = require("../components");
const S = require("./_shared");
const { runsOf } = require("../markup");

function render(ctx, spec, section) {
  const f = S.frame(ctx, spec, section);
  const { theme, pres } = ctx;
  const box = f.box;
  const n = spec.steps.length;
  const hh = 0.62, notch = 0.22, gap = 0.04;
  const w = (box.w + notch * (n - 1) - gap * (n - 1)) / n;
  const plans = [];
  const cardBoxes = S.columnsOf({ ...box, y: box.y + hh + 0.12, h: box.h - hh - 0.12 }, n);
  spec.steps.forEach((s, i) => {
    const x = box.x + i * (w - notch + gap);
    const em = spec.emphasize === i;
    f.slide.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, { x, y: box.y, w, h: hh, fill: { color: em ? theme.accent : theme.primary }, line: { type: "none" }, objectName: ctx.nm("step-head") });
    const tx = x + (i === 0 ? 0.14 : notch + 0.06), tw = w - notch - (i === 0 ? 0.14 : notch + 0.06);
    f.slide.addText([
      { text: `${i + 1}  `, options: { fontFace: ctx.fonts.jp, fontSize: 15, bold: true, color: em ? theme.primaryDark : theme.accent } },
      ...runsOf(s.title, ctx, { fontSize: 12.5, bold: true, color: em ? theme.primaryDark : theme.white }),
    ], { x: tx, y: box.y, w: tw, h: hh, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("step-title") });
    // 詳細カードは矢羽根の位置に関係なく等幅・等間隔に並べる
    const cb = cardBoxes[i];
    plans.push(C.planCard(ctx, f.slide, cb, { title: s.subtitle, body: s.body }, { fill: em ? theme.accentTint : theme.primaryTint, label: s.title }));
  });
  C.renderGroup(ctx, f.rec, plans);
  S.finish(ctx, f, spec);
}

module.exports = { key: "process", id: "B6", label: "手順・プロセス", use: "矢羽根で3〜6段の流れと、各段の詳細", required: ["title", "steps"], render };
