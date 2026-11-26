// ミニ記法 → pptxgenjs のテキストラン
//
//   **太字**        ==アクセント色==        [[数値の強調]]（太字＋主色）
//   $数式$          数式の中で ^{上付き} _{下付き}
//   行頭 "- "       箇条書き     行頭 "  - " 2段目の箇条書き
//
// 本文は文字列か文字列の配列で書く。配列の1要素が1段落。

const TOKEN = /(\*\*.+?\*\*|==.+?==|\[\[.+?\]\]|\$[^$]+\$)/;

function toParagraphs(body) {
  if (body == null) return [];
  const arr = Array.isArray(body) ? body : String(body).split("\n");
  return arr.map((line) => {
    const m = /^(\s*)- (.*)$/.exec(line);
    if (m) return { text: m[2], bullet: true, level: m[1].length >= 2 ? 1 : 0 };
    return { text: line, bullet: false, level: 0 };
  });
}

// 1段落の文字列をランに分ける。ctx = { fonts, colors, base }
function runsOf(text, ctx, base = {}) {
  const runs = [];
  const parts = String(text).split(TOKEN).filter((p) => p.length);
  for (const p of parts) {
    if (p.startsWith("$") && p.endsWith("$") && p.length > 1) {
      const inner = p.slice(1, -1);
      for (const q of inner.split(/(\^\{[^}]*\}|_\{[^}]*\})/).filter((x) => x.length)) {
        if (q.startsWith("^{")) runs.push({ text: q.slice(2, -1), options: { ...base, fontFace: ctx.fonts.math, superscript: true } });
        else if (q.startsWith("_{")) runs.push({ text: q.slice(2, -1), options: { ...base, fontFace: ctx.fonts.math, subscript: true } });
        else runs.push({ text: q, options: { ...base, fontFace: ctx.fonts.math } });
      }
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

// 段落の配列 → 1つのテキストボックス用のラン配列
// opts: { fontSize, color, paraAfter(pt), bold }
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
    first.paraSpaceAfter = opts.paraAfter ?? 3;
    if (para.bullet) {
      first.bullet = { indent: Math.round(opts.fontSize * 0.95) };
      if (para.level) first.indentLevel = para.level;
    }
    if (i < paragraphs.length - 1) runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  });
  return out;
}

// 文字幅の計算用：記法を取り除いたプレーンテキスト
function plain(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/==(.+?)==/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .replace(/\$([^$]+)\$/g, (_, m) => m.replace(/[\^_]\{([^}]*)\}/g, "$1"));
}

module.exports = { toParagraphs, runsOf, buildRuns, plain };
