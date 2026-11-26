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

// 行頭に来られない文字（禁則）。前の文字と一緒に折り返す
const NO_LINE_START = "、。，．,.・：；:;？！?!）」』】〕］｝〉》)]}ー…‥ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ%％";

// 折り返しの単位に分ける：英単語・数値（10,000 や 3.5% など）はひとかたまり、和文は1文字ずつ
function tokenize(text) {
  const raw = plain(text).match(/[A-Za-z0-9][A-Za-z0-9.,%'’+\-]*|\s+|./gu) || [];
  const out = [];
  for (const t of raw) {
    if (out.length && t.length === 1 && NO_LINE_START.includes(t)) out[out.length - 1] += t;
    else out.push(t);
  }
  return out;
}

// 1段落を幅 cap（em）で折り返したときの行数と、最終行の文字数
function wrap(tokens, capEm, scale) {
  let lines = 1, cur = 0, lastChars = 0;
  for (const t of tokens) {
    let w = 0;
    for (const ch of t) w += charEm(ch);
    w *= scale;
    if (/^\s+$/.test(t)) { if (cur > 0 && cur + w <= capEm) { cur += w; } continue; }
    if (cur + w <= capEm) { cur += w; lastChars += [...t].length; continue; }
    if (w > capEm) {
      // 1行に入らない長い語は文字単位で折る
      for (const ch of t) {
        const cw = charEm(ch) * scale;
        if (cur + cw > capEm && cur > 0) { lines++; cur = 0; lastChars = 0; }
        cur += cw; lastChars++;
      }
      continue;
    }
    lines++; cur = w; lastChars = [...t].length;
  }
  return { lines, lastChars };
}

// paragraphs: markup.toParagraphs の結果。w は文字の入る幅（インチ）。
// 戻り値: 必要な高さ（インチ）、行数、最終行が1〜2文字になる段落
function measure(paragraphs, w, fontSize, paraAfterPt = 3) {
  const sizeIn = fontSize / 72;
  let lines = 0;
  const orphans = [];
  for (const p of paragraphs) {
    const indent = p.bullet ? sizeIn * (0.95 + p.level * 1.2) : 0;
    const capEm = Math.max(0.3, w - indent) / sizeIn;
    const toks = tokenize(p.text);
    // 高さは余裕を含めた字幅で、最終行の判定は実際に近い字幅で見積もる
    lines += wrap(toks, capEm, METRICS.safety).lines;
    const real = wrap(toks, capEm, 1);
    if (real.lines > 1 && real.lastChars <= 2) orphans.push(plain(p.text));
  }
  const h = lines * sizeIn * METRICS.lineHeight + paragraphs.length * (paraAfterPt / 72);
  return { height: h, lines, orphans };
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
