// パターン共通の部品：通常ページの枠、結論帯、グラフ＋考察の配置など

const C = require("../components");
const { contentSlide } = require("../deck");
const { GAP } = require("../config");

const MSG_H = 0.72; // 結論帯の高さ

// 通常ページを作り、本文領域（結論帯があればその分を除いた範囲）を返す
function frame(ctx, spec, section) {
  const { slide, rec } = contentSlide(ctx, spec, section);
  let box = { ...ctx.page.body };
  let bottom = null;
  if (spec.conclusion) {
    bottom = { x: box.x, y: box.y + box.h - MSG_H, w: box.w, h: MSG_H };
    box = { ...box, h: box.h - MSG_H - GAP };
  }
  return { slide, rec, box, bottom };
}

function finish(ctx, f, spec) {
  if (f.bottom) C.keyMessage(ctx, f.slide, f.rec, f.bottom, spec.conclusion, spec.conclusionLabel || "結論");
}

// 左にグラフ、右に番号付きの考察カードを縦に並べる
function chartWithInsights(ctx, slide, rec, box, chartSpec, insights, ratio = 0.62) {
  const cw = box.w * ratio;
  C.chart(ctx, slide, rec, { x: box.x, y: box.y, w: cw, h: box.h }, chartSpec);
  const ix = box.x + cw + GAP, iw = box.w - cw - GAP;
  const n = insights.length, ih = (box.h - GAP * (n - 1)) / n;
  const plans = insights.map((it, i) => C.planCard(ctx, slide, { x: ix, y: box.y + i * (ih + GAP), w: iw, h: ih }, { num: i + 1, ...it }));
  C.renderGroup(ctx, rec, plans);
}

// 横に n 等分した箱
function columnsOf(box, n, gap = GAP) {
  const w = (box.w - gap * (n - 1)) / n;
  return [...Array(n).keys()].map((i) => ({ x: box.x + i * (w + gap), y: box.y, w, h: box.h }));
}

// 縦に n 等分した箱
function rowsOf(box, n, gap = GAP) {
  const h = (box.h - gap * (n - 1)) / n;
  return [...Array(n).keys()].map((i) => ({ x: box.x, y: box.y + i * (h + gap), w: box.w, h }));
}

function defaultGrid(n) {
  return { 1: "1x1", 2: "2x1", 3: "3x1", 4: "2x2", 5: "3x2", 6: "3x2", 7: "4x2", 8: "4x2", 9: "3x3" }[n] || "3x3";
}

// "3x2" → 列3・行2 の格子の箱
function gridOf(box, grid, count) {
  const [cols, rows] = grid.split("x").map(Number);
  if (cols * rows < count) throw new Error(`grid "${grid}" に ${count} 個は入りません`);
  const cw = (box.w - GAP * (cols - 1)) / cols, ch = (box.h - GAP * (rows - 1)) / rows;
  return [...Array(count).keys()].map((i) => ({ x: box.x + (i % cols) * (cw + GAP), y: box.y + Math.floor(i / cols) * (ch + GAP), w: cw, h: ch }));
}

// 小見出し（本文領域の中の見出し行）
function subhead(ctx, slide, box, text, color) {
  slide.addText(text, { x: box.x, y: box.y, w: box.w, h: 0.32, fontFace: ctx.fonts.jp, fontSize: 13, bold: true, color: color || ctx.theme.primary, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("subhead") });
  return { ...box, y: box.y + 0.38, h: box.h - 0.38 };
}

module.exports = { MSG_H, GAP, frame, finish, chartWithInsights, columnsOf, rowsOf, defaultGrid, gridOf, subhead };
