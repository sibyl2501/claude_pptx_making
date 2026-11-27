// 文字の収まりの見積もり。PowerPoint の実際の折り返しとは数％ずれるため、METRICS.safety で余裕を持たせる。

const { METRICS } = require("./config");
const { plain, plainForWidth, mathTall } = require("./markup");

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
  for (const ch of plainForWidth(text)) em += charEm(ch);
  return em * METRICS.safety;
}

// 行頭に来られない文字（禁則）。前の文字と一緒に折り返す
const NO_LINE_START = "、。，．,.・：；:;？！?!）」』】〕］｝〉》)]}ー…‥ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ%％";

// 折り返しの単位に分ける：英単語・数値（10,000 や 3.5% など）はひとかたまり、和文は1文字ずつ
function tokenize(text) {
  const raw = plainForWidth(text).match(/[A-Za-z0-9][A-Za-z0-9.,%'’+\-]*|\s+|./gu) || [];
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
// lineSpacing は行間の倍率（1 = 単一行間）。
// 戻り値: 必要な高さ（インチ）、行数、最終行が1〜2文字になる段落
function measure(paragraphs, w, fontSize, paraAfterPt = 3, lineSpacing = 1) {
  const sizeIn = fontSize / 72;
  let lines = 0;
  const orphans = [];
  for (const p of paragraphs) {
    const indent = p.bullet ? sizeIn * (0.95 + p.level * 1.2) : 0;
    const capEm = Math.max(0.3, w - indent) / sizeIn;
    const toks = tokenize(p.text);
    // 高さは余裕を含めた字幅で、最終行の判定は実際に近い字幅で見積もる
    // 分数や総和を含む行は高くなるので、その分を足す
    lines += wrap(toks, capEm, METRICS.safety).lines + (mathTall(p.text) - 1);
    const real = wrap(toks, capEm, 1);
    if (real.lines > 1 && real.lastChars <= 2) orphans.push(plain(p.text));
  }
  const h = lines * sizeIn * METRICS.lineHeight * lineSpacing + paragraphs.length * (paraAfterPt / 72);
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

// ---------------------------------------------------------------- 見出しの改行位置
// 見出し・小見出しが1行に入らないとき、PowerPoint に任せると語の途中やかっこの直後で折れる。
// 読みやすい位置で行を分けて返す（配列の1要素が1行）。
//   1. はみ出す位置がかっこ書き（「（…）」）の中なら、かっこの直前で改行する
//   2. それ以外は、はみ出す位置より前の最後の区切り（、。：」）の後・「（の前・空白）で改行する
//   3. 区切りがなければ分けない（PowerPoint の折り返しに任せる）
const OPEN = "（(「『【〈《［";
const AFTER = "、。，．：:；;」』】〉》）)・／/ 　";

function protectedRanges(text) {
  const out = [];
  const re = /\*\*.+?\*\*|==.+?==|\[\[.+?\]\]|\$\$[^$]+\$\$|\$[^$]+\$/g;
  let m;
  while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]);
  return out;
}

function breakHeading(text, w, fontSize, maxLines = 3) {
  text = String(text);
  if (maxLines <= 1 || fitsOneLine(text, w, fontSize)) return [text];
  const prot = protectedRanges(text);
  const inside = (i) => prot.some(([a, b]) => i > a && i < b);
  // はみ出し始める位置
  let over = text.length;
  for (let i = 1; i <= text.length; i++) {
    if (!fitsOneLine(text.slice(0, i), w, fontSize)) { over = i - 1; break; }
  }
  // かっこ書きの中ではみ出すなら、かっこの直前で分ける
  let depth = 0, openAt = -1;
  for (let i = 0; i < over; i++) {
    const ch = text[i];
    if ("（(".includes(ch)) { if (depth === 0) openAt = i; depth++; }
    else if ("）)".includes(ch) && depth > 0) { depth--; if (depth === 0) openAt = -1; }
  }
  let pos = -1;
  const paren = depth > 0 && openAt > 0 && !inside(openAt);
  if (paren) pos = openAt;
  if (pos < 0) {
    for (let i = over; i > 0; i--) {
      if (inside(i)) continue;
      const prev = text[i - 1], ch = text[i];
      if (ch === undefined) continue;
      if (NO_LINE_START.includes(ch)) continue;
      if (AFTER.includes(prev) || OPEN.includes(ch)) { pos = i; break; }
    }
  }
  if (pos <= 0) return [text];
  const head = text.slice(0, pos).trimEnd(), rest = text.slice(pos).trimStart();
  const lines = [head, ...breakHeading(rest, w, fontSize, maxLines - 1)];
  // かっこの前で分ける場合は、1行目が短くても、行が増えても分ける（かっこ書きをまとめて読めるように）。
  // それ以外は、1行目が短すぎる（3割未満）か、分けると行数が増える場合は分けない
  if (!paren) {
    const natural = Math.ceil((textEm(text) * fontSize) / 72 / w);
    if ((textEm(head) * fontSize) / 72 < w * 0.3 || countLines(lines, w, fontSize) > natural) return [text];
  }
  return lines;
}

function countLines(lines, w, fontSize) {
  return lines.reduce((n, line) => n + Math.max(1, Math.ceil((textEm(line) * fontSize) / 72 / w)), 0);
}

// 見出しが何行になるか（分けた行の中でさらに折り返す分も数える）
function headingLines(text, w, fontSize, maxLines = 3) {
  return countLines(breakHeading(text, w, fontSize, maxLines), w, fontSize);
}

module.exports = { measure, fitSize, fitsOneLine, textEm, breakHeading, headingLines };
