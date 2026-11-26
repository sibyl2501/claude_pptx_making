// 文字の収まりの見積もり。PowerPoint の実際の折り返しとは数％ずれるため、METRICS.safety で余裕を持たせる。

const { METRICS } = require("./config");
const { plain } = require("./markup");

function charEm(ch) {
  const c = ch.codePointAt(0);
  if (c === 0x200b) return 0;
  if (c >= 0x2e80 && c <= 0x9fff) return METRICS.cjk; // かな・漢字・記号
  if (c >= 0xff00 && c <= 0xffef) return METRICS.cjk; // 全角英数・記号
  if (c >= 0x3000 && c <= 0x303f) return METRICS.cjk;
  if (c >= 0x2190 && c <= 0x22ff) return 0.9; // 矢印・数学記号
  if (ch === " ") return METRICS.space;
  if (/[0-9]/.test(ch)) return METRICS.digit;
  if (/[A-Z]/.test(ch)) return METRICS.upper;
  if (/[a-z]/.test(ch)) return METRICS.lower;
  if (/[.,:;'"!|()[\]{}\-/]/.test(ch)) return METRICS.punct;
  return METRICS.other;
}

function textEm(text) {
  let em = 0;
  for (const ch of plain(text)) em += charEm(ch);
  return em * METRICS.safety;
}

// paragraphs: markup.toParagraphs の結果。w は文字の入る幅（インチ）。
// 戻り値: 必要な高さ（インチ）と行数
function measure(paragraphs, w, fontSize, paraAfterPt = 3) {
  const sizeIn = fontSize / 72;
  let lines = 0;
  for (const p of paragraphs) {
    const indent = p.bullet ? sizeIn * (0.95 + p.level * 1.2) : 0;
    const avail = Math.max(0.3, w - indent);
    const em = textEm(p.text);
    lines += Math.max(1, Math.ceil((em * sizeIn) / avail - 1e-9));
  }
  const h = lines * sizeIn * METRICS.lineHeight + paragraphs.length * (paraAfterPt / 72);
  return { height: h, lines };
}

// [max, min] の範囲で、高さ h に収まる最大の文字サイズ（0.5pt 刻み）
function fitSize(paragraphs, w, h, [max, min], paraAfterPt = 3) {
  for (let s = max; s >= min - 1e-9; s -= 0.5) {
    const m = measure(paragraphs, w, s, paraAfterPt);
    if (m.height <= h) return { size: s, height: m.height, fits: true };
  }
  const m = measure(paragraphs, w, min, paraAfterPt);
  return { size: min, height: m.height, fits: false };
}

// 1行に収まるか（見出し用）
function fitsOneLine(text, w, fontSize) {
  return (textEm(text) * fontSize) / 72 <= w;
}

module.exports = { measure, fitSize, fitsOneLine, textEm };
