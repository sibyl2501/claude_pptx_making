// ミニ記法 → pptxgenjs のテキストラン
//
//   **太字**        ==アクセント色==        [[数値の強調]]（太字＋主色）
//   $数式$          文中の数式（TeX 記法。PowerPoint の数式になる）
//   $$数式$$        段落全体を1つの数式として中央に置く（1要素にこれだけを書く）
//   行頭 "- "       箇条書き     行頭 "  - " 2段目の箇条書き
//
// 本文は文字列か文字列の配列で書く。配列の1要素が1段落。
//
// 数式は、描画時には目印の文字（番号）として置き、書き出し後に build.js が
// PowerPoint の数式（OMML）に置き換える。目印の対応は ctx.math に記録する。

const { parseTex, texToText } = require("./math");

const TOKEN = /(\*\*.+?\*\*|==.+?==|\[\[.+?\]\]|\$\$[^$]+\$\$|\$[^$]+\$)/;
const DISPLAY = /^\s*\$\$([^$]+)\$\$\s*$/;

function toParagraphs(body) {
  if (body == null) return [];
  const arr = Array.isArray(body) ? body : String(body).split("\n");
  return arr.map((line) => {
    const d = DISPLAY.exec(line);
    if (d) return { text: line.trim(), bullet: false, level: 0, display: true };
    const m = /^(\s*)- (.*)$/.exec(line);
    if (m) return { text: m[2], bullet: true, level: m[1].length >= 2 ? 1 : 0 };
    return { text: line, bullet: false, level: 0 };
  });
}

// 数式1つ分のラン
function mathRun(tex, display, ctx, base) {
  const parsed = parseTex(tex);
  if (parsed.error) {
    if (ctx.onMathError) ctx.onMathError(tex, parsed.error);
    return { text: tex, options: { ...base, fontFace: ctx.fonts.math } };
  }
  if (!ctx.math) return { text: parsed.lin, options: { ...base, fontFace: ctx.fonts.math } };
  const id = ctx.math.push({ tex, display }) - 1;
  return { text: `${id}`, options: { ...base, fontFace: ctx.fonts.math } };
}

// 1段落の文字列をランに分ける。ctx = { fonts, colors, math? }
function runsOf(text, ctx, base = {}) {
  const runs = [];
  const parts = String(text).split(TOKEN).filter((p) => p.length);
  for (const p of parts) {
    if (p.startsWith("$$") && p.endsWith("$$") && p.length > 4) {
      runs.push(mathRun(p.slice(2, -2), true, ctx, base));
    } else if (p.startsWith("$") && p.endsWith("$") && p.length > 1) {
      runs.push(mathRun(p.slice(1, -1), false, ctx, base));
    } else if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      // 強調の中に数式があってもよいように、中身をもう一度解析する
      runs.push(...runsOf(p.slice(2, -2), ctx, { ...base, bold: true }));
    } else if (p.startsWith("==") && p.endsWith("==") && p.length > 4) {
      runs.push(...runsOf(p.slice(2, -2), ctx, { ...base, bold: true, color: ctx.colors.accentText }));
    } else if (p.startsWith("[[") && p.endsWith("]]") && p.length > 4) {
      runs.push(...runsOf(p.slice(2, -2), ctx, { ...base, bold: true, color: ctx.colors.primary }));
    } else {
      runs.push({ text: p, options: { ...base, fontFace: ctx.fonts.jp } });
    }
  }
  return runs;
}

// 複数行に分けた見出し → 1つのテキストボックス用のラン配列（行ごとに改行）
function linesToRuns(lines, ctx, base) {
  const out = [];
  lines.forEach((line, i) => {
    const runs = runsOf(line, ctx, base);
    if (i < lines.length - 1 && runs.length) runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  });
  return out;
}

// 段落の配列 → 1つのテキストボックス用のラン配列
// opts: { fontSize, color, paraAfter(pt), bold, lineSpacing（行間の倍率）, align }
function buildRuns(paragraphs, ctx, opts) {
  const out = [];
  paragraphs.forEach((para, i) => {
    const base = { fontSize: opts.fontSize, color: opts.color };
    if (opts.bold) base.bold = true;
    let runs = runsOf(para.text, ctx, base);
    if (!runs.length) runs = [{ text: " ", options: { ...base, fontFace: ctx.fonts.jp } }];
    // 箇条書き記号の書体をそろえるため、先頭に和文フォントの空ランを置く
    if (para.bullet) runs.unshift({ text: "​", options: { ...base, fontFace: ctx.fonts.jp } });
    const first = runs[0].options;
    first.paraSpaceAfter = para.after ?? opts.paraAfter ?? 3;
    if (opts.lineSpacing && opts.lineSpacing !== 1) first.lineSpacingMultiple = Math.round(opts.lineSpacing * 100) / 100;
    if (para.display) first.align = "center";
    else if (opts.align) first.align = opts.align;
    if (para.bullet) {
      first.bullet = { indent: Math.round(opts.fontSize * 0.95) };
      if (para.level) first.indentLevel = para.level;
    }
    if (i < paragraphs.length - 1) runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  });
  return out;
}

// 文字幅の計算用：記法を取り除いたプレーンテキスト（数式は代替テキストにする）
function plain(text) {
  return String(text)
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => texToText(m))
    .replace(/\$([^$]+)\$/g, (_, m) => texToText(m))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1");
}

// 字幅の見積もり用：数式は幅の目安（em）に合わせた折り返さない1語に置き換える
function plainForWidth(text) {
  const asWord = (tex) => "x".repeat(Math.max(1, Math.round(parseTex(tex).em / 0.53)));
  return String(text)
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => asWord(m))
    .replace(/\$([^$]+)\$/g, (_, m) => asWord(m))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1");
}

// 段落中の数式の高さ（1行=1）。分数・総和・行列があると行が高くなる
function mathTall(text) {
  let tall = 1;
  String(text).replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (_, d, i) => {
    tall = Math.max(tall, parseTex(d || i).tall + (d ? 0.3 : 0));
    return "";
  });
  return tall;
}

module.exports = { toParagraphs, runsOf, linesToRuns, buildRuns, plain, plainForWidth, mathTall, TOKEN };
