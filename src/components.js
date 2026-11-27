// 部品。すべての部品は box = {x, y, w, h}（インチ）を受け取り、テーマの色だけを使う。
//
// 文字を含む部品は「計画（plan）→ 文字サイズの一括決定（renderGroup）→ 描画」の順で処理する。
// 同じページのカード同士は同じ文字サイズにそろえるため。

const { toParagraphs, buildRuns, runsOf, linesToRuns, plain } = require("./markup");
const { measure, fitSize, fitsOneLine, breakHeading, headingLines } = require("./textfit");
const { GAP, METRICS } = require("./config");

const PAD = 0.14; // 枠の内側の余白
const PARA_AFTER = 3; // 段落の後ろの間隔（pt）
const BOLD_W = 0.93; // 太字は字幅が広いので、見出しの改行位置を決めるときは幅をこの割合で見積もる

// ---------------------------------------------------------------- 計画と一括描画
// plan = { areas: [{w, h, paras}], draw(size) }
// opts.boost = false で「空きが多いときに大きくする」処理を止める（細い列の早見表など）
function renderGroup(ctx, rec, plans, range, opts = {}) {
  const [max, min] = range || ctx.sizes.body;
  const pick = (hi) => {
    let s = hi;
    for (const p of plans) for (const a of p.areas) {
      if (!a.paras.length) continue;
      s = Math.min(s, fitSize(a.paras, a.w, a.h, [hi, min], PARA_AFTER).size);
    }
    return s;
  };
  let size = pick(max);
  const orphanCount = (s) => plans.reduce((n, p) => n + p.areas.reduce((m, a) => m + (a.paras.length ? measure(a.paras, a.w, s, PARA_AFTER).orphans.length : 0), 0), 0);
  // 最大サイズでも枠に空きが多いときは、最も詰まった枠が 8 割を超えない範囲で 3pt まで大きくする。
  // 大きくして最終行が1〜2文字の段落が増えるサイズは選ばない
  const fullest = (s) => Math.max(0, ...plans.flatMap((p) => p.areas.filter((a) => a.paras.length).map((a) => measure(a.paras, a.w, s, PARA_AFTER).height / a.h)));
  const cap = ctx.sizes.body[0] + 3;
  if (opts.boost !== false && size === max) {
    const base = orphanCount(max);
    for (let s = max + 0.5; s <= cap && fullest(s) <= 0.8; s += 0.5) if (orphanCount(s) <= base) size = s;
  }
  // 最終行が1〜2文字になる段落が減るなら、0.5〜1pt 小さくする
  let best = size, bestN = orphanCount(size);
  for (const s of [size - 0.5, size - 1]) {
    if (s < min || !bestN) break;
    const n = orphanCount(s);
    if (n < bestN) { best = s; bestN = n; }
  }
  size = best;
  // 文字が枠の上半分に集まらないように、空きの多い枠は段落の間と行間を広げる。
  // 並んだ枠で行間がばらつかないよう、行間の倍率は全枠で最も小さい値にそろえる
  const all = plans.flatMap((p) => p.areas).filter((a) => a.paras.length);
  for (const a of all) a.spacing = opts.spread === false ? null : spreadOf(a, size);
  const common = Math.min(...all.map((a) => (a.spacing ? a.spacing.lineSpacing : 1)));
  for (const a of all) if (a.spacing) a.spacing = { paraAfter: a.spacing.paraAfter, lineSpacing: common };
  for (const p of plans) {
    // 文字が枠の上半分に集まらないように、空きの多い枠は段落の間と行間を広げる
    p.draw(size);
    for (const a of p.areas) {
      if (!a.paras.length) continue;
      const m = measure(a.paras, a.w, size, PARA_AFTER);
      rec.areas.push({ area: a.w * a.h, fill: m.height / a.h, label: a.label });
      if (m.height > a.h * 1.02) rec.warn.push(`「${a.label}」が枠に収まりません（必要 ${m.height.toFixed(2)}in / 枠 ${a.h.toFixed(2)}in）。文を短くするか分割してください`);
      for (const o of m.orphans) rec.warn.push(`「${a.label}」の「${o.slice(0, 18)}…」は最終行が1〜2文字になる可能性があります。言い回しを少し変えてください`);
    }
  }
  rec.sizes.add(size);
  return size;
}

// 枠の 8 割ほどまで文字が広がるように、段落の後ろの間隔（pt）と行間の倍率を決める。
// 段落の間を先に広げ（文字サイズの 0.9 倍まで）、足りなければ行間を 1.3 倍まで広げる。
function spreadOf(a, size) {
  const m = measure(a.paras, a.w, size, PARA_AFTER);
  if (m.height >= a.h * 0.7) return null;
  const target = a.h * 0.8, n = a.paras.length;
  const linesH = m.height - (n * PARA_AFTER) / 72;
  const gapPt = n > 1 ? Math.min(size * 0.9, PARA_AFTER + ((target - m.height) * 72) / n) : PARA_AFTER;
  let lineSpacing = 1;
  const rest = target - (n * gapPt) / 72;
  if (linesH > 0 && rest > linesH) lineSpacing = Math.min(1.3, rest / linesH);
  return { paraAfter: Math.round(gapPt * 2) / 2, lineSpacing: Math.round(lineSpacing * 100) / 100 };
}

// 本文のラン（枠ごとの間隔の調整を反映する）
// 本文中の太字だけの段落（**小見出し**）も、見出しと同じく読みやすい位置で改行する
function bodyRuns(ctx, area, size, color) {
  const sp = area.spacing || {};
  const paras = area.paras.flatMap((p) => {
    const m = !p.bullet && !p.display && /^\*\*([^*]+)\*\*$/.exec(p.text.trim());
    if (!m) return [p];
    const lines = breakHeading(m[1], area.w * BOLD_W, size, 3);
    return lines.map((t, i) => ({ ...p, text: `**${t}**`, after: i < lines.length - 1 ? 0 : undefined }));
  });
  return buildRuns(paras, ctx, { fontSize: size, color, paraAfter: sp.paraAfter ?? PARA_AFTER, lineSpacing: sp.lineSpacing });
}

// 見出しのラン：読みやすい位置で行を分ける（かっこ書きが長ければかっこの前で改行）
function headRuns(ctx, text, w, fontSize, base, maxLines = 3) {
  return linesToRuns(breakHeading(text, base.bold ? w * BOLD_W : w, fontSize, maxLines), ctx, { fontSize, ...base });
}

// 文字のない部品（グラフ・図・表）は面積を満たしたものとして記録する
function recordSolid(rec, box, label) {
  rec.areas.push({ area: box.w * box.h, fill: 1, label });
}

function textBox(ctx, slide, box, runs, opt = {}) {
  // 負の大きさは PowerPoint で「修復」が必要なファイルになるため、最小値で止める
  slide.addText(runs, { x: box.x, y: box.y, w: Math.max(0.05, box.w), h: Math.max(0.05, box.h), margin: 0, valign: opt.valign || "top", align: opt.align || "left", isTextBox: true, objectName: ctx.nm(opt.name || "text"), fit: "none" });
}

// 丸数字。円と数字を1つの図形にして、動かしても数字がずれないようにする
function badge(ctx, slide, x, y, num, d = 0.3) {
  const { theme, fonts } = ctx;
  slide.addText(String(num), { shape: ctx.pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: theme.accent }, line: { type: "none" }, fontFace: fonts.jp, fontSize: d > 0.32 ? 13 : 11, bold: true, color: theme.primaryDark, align: "center", valign: "middle", margin: 0, objectName: ctx.nm("badge") });
}

// ---------------------------------------------------------------- カード
// spec: { title, body, num?, stat?: {value, label} }
// opt: { fill, label, line（枠線の色）, header: {fill, color}（見出しを色帯にする） }
function planCard(ctx, slide, box, spec, opt = {}) {
  const { theme, sizes } = ctx;
  const hasNum = spec.num !== undefined && spec.num !== null;
  const tx = box.x + (hasNum ? 0.52 : PAD);
  const tw = box.x + box.w - tx - PAD;
  const titleLines = !spec.title ? 0 : Math.min(3, headingLines(spec.title, tw * BOLD_W, sizes.cardTitle));
  const titleH = titleLines ? (titleLines * sizes.cardTitle * METRICS.lineHeight) / 72 + 0.06 : 0;
  const headH = opt.header && spec.title ? Math.max(titleH, hasNum ? 0.32 : 0) + 0.2 : 0;
  let y = box.y + 0.11 + Math.max(titleH, hasNum ? 0.32 : 0) + 0.05 + (headH ? 0.08 : 0);
  let statH = 0;
  if (spec.stat) statH = (sizes.kpiValue * 0.95 * 1.25) / 72 + 0.05;
  const area = { x: box.x + PAD, y: y + statH, w: box.w - 2 * PAD, h: box.y + box.h - (y + statH) - 0.1, paras: toParagraphs(spec.body), label: spec.title || opt.label || "カード" };
  return {
    areas: [area],
    draw(size) {
      slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: opt.fill || theme.primaryTint }, line: opt.line ? { color: opt.line, width: 0.75 } : { type: "none" }, objectName: ctx.nm("card") });
      if (headH) {
        // 上の角だけ丸い色帯（丸角の帯の下半分を四角で覆う）
        slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: headH, rectRadius: 0.06, fill: { color: opt.header.fill }, line: { type: "none" }, objectName: ctx.nm("card-head") });
        slide.addShape(ctx.pres.shapes.RECTANGLE, { x: box.x, y: box.y + headH / 2, w: box.w, h: headH / 2, fill: { color: opt.header.fill }, line: { type: "none" }, objectName: ctx.nm("card-head-base") });
      }
      if (hasNum) badge(ctx, slide, box.x + 0.12, box.y + 0.11, spec.num);
      if (spec.title) textBox(ctx, slide, { x: tx, y: box.y + 0.1, w: tw, h: Math.max(titleH, 0.32) }, headRuns(ctx, spec.title, tw, sizes.cardTitle, { bold: true, color: headH ? opt.header.color : theme.primaryDark }), { valign: "middle", name: "card-title" });
      if (spec.stat) {
        const s = sizes.kpiValue * 0.95;
        textBox(ctx, slide, { x: area.x, y, w: area.w, h: statH }, [
          { text: String(spec.stat.value), options: { fontFace: ctx.fonts.jp, fontSize: s, bold: true, color: theme.primary } },
          { text: spec.stat.label ? "  " + spec.stat.label : "", options: { fontFace: ctx.fonts.jp, fontSize: Math.max(size, 10), color: theme.muted } },
        ], { valign: "bottom", name: "card-stat" });
      }
      textBox(ctx, slide, area, bodyRuns(ctx, area, size, theme.ink), { name: "card-body" });
    },
  };
}

// ---------------------------------------------------------------- パネル（白地＋主色の枠線）
function planPanel(ctx, slide, box, spec) {
  const { theme, sizes } = ctx;
  const tw = box.w - 2 * PAD - 0.04;
  const titleLines = spec.title ? Math.min(3, headingLines(spec.title, tw * BOLD_W, sizes.cardTitle)) : 0;
  const titleH = spec.title ? (titleLines * sizes.cardTitle * METRICS.lineHeight) / 72 + 0.08 : 0;
  const area = { x: box.x + PAD + 0.02, y: box.y + 0.12 + titleH, w: tw, h: box.h - 0.22 - titleH, paras: toParagraphs(spec.body), label: spec.title || "パネル" };
  return {
    areas: [area],
    draw(size) {
      slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.white }, line: { color: theme.primary, width: 1 }, objectName: ctx.nm("panel") });
      if (spec.title) textBox(ctx, slide, { x: area.x, y: box.y + 0.1, w: area.w, h: titleH }, headRuns(ctx, spec.title, area.w, sizes.cardTitle, { bold: true, color: theme.primary }), { valign: "middle", name: "panel-title" });
      textBox(ctx, slide, area, bodyRuns(ctx, area, size, theme.ink), { name: "panel-body" });
    },
  };
}

// ---------------------------------------------------------------- 結論帯（So what）
function keyMessage(ctx, slide, rec, box, text, label = "結論") {
  const { theme, fonts } = ctx;
  slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.accentTint }, line: { type: "none" }, objectName: ctx.nm("key-message") });
  const lw = 0.95;
  slide.addText(label, { x: box.x + 0.14, y: box.y + (box.h - 0.3) / 2, w: lw - 0.1, h: 0.3, fontFace: fonts.jp, fontSize: 10.5, bold: true, color: theme.white, align: "center", valign: "middle", margin: 0, fill: { color: theme.primary }, isTextBox: true, objectName: ctx.nm("key-label") });
  const area = { x: box.x + 0.14 + lw + 0.1, y: box.y + 0.06, w: box.w - lw - 0.38, h: box.h - 0.12 };
  const fit = fitSize(toParagraphs(text), area.w * BOLD_W, area.h, [15, 11], 0);
  // 2行になるときは読みやすい位置で分ける
  const lines = [].concat(...[].concat(text).map((t) => breakHeading(t, area.w * BOLD_W, fit.size, 2)));
  textBox(ctx, slide, area, buildRuns(toParagraphs(lines), ctx, { fontSize: fit.size, color: theme.primaryDark, bold: true, paraAfter: 0 }), { valign: "middle", name: "key-text" });
  if (!fit.fits) rec.warn.push("結論帯の文が長すぎます。2行以内にしてください");
  rec.areas.push({ area: box.w * box.h, fill: 1, label: "結論帯" });
}

// ---------------------------------------------------------------- 表
// spec: { headers: [], rows: [[...]], widths?: [比率], align?: [], highlight?: 列番号, firstColBold?: true, tagColors?: {値: 色トークン} }
const MARKS = { "◎": "positive", "○": "positive", "〇": "positive", "△": "accentText", "×": "negative", "✕": "negative" };

function table(ctx, slide, rec, box, spec, opt = {}) {
  const { theme, fonts } = ctx;
  const ncol = spec.headers.length;
  const ratio = spec.widths || Array(ncol).fill(1);
  const sum = ratio.reduce((a, b) => a + b, 0);
  const colW = ratio.map((r) => (box.w * r) / sum);
  const padX = 0.08, padY = 0.05;
  const rawParas = (v) => toParagraphs(typeof v === "object" && v !== null && !Array.isArray(v) ? v.text : v);
  // 見出し行と1列目（行の見出し）は、読みやすい位置で改行する
  const cellParas = (v, i, j, s) => {
    const paras = rawParas(v);
    if (!(i === 0 || j === 0) || paras.length !== 1 || paras[0].bullet || paras[0].display) return paras;
    return breakHeading(paras[0].text, (colW[j] - 2 * padX) * BOLD_W, s).map((t) => ({ text: t, bullet: false, level: 0 }));
  };
  const rowsAll = [spec.headers, ...spec.rows];
  const range = opt.range || ctx.sizes.table;
  // 表全体が枠に収まる最大の文字サイズ
  const heights = (s) => rowsAll.map((r, i) => Math.max(...r.map((v, j) => measure(cellParas(v, i, j, s), colW[j] - 2 * padX, s, 0).height)) + 2 * padY);
  let size = range[1];
  for (let s = range[0]; s >= range[1] - 1e-9; s -= 0.5) {
    if (heights(s).reduce((a, b) => a + b, 0) <= box.h) { size = s; break; }
  }
  const nat = heights(size);
  const natTotal = nat.reduce((a, b) => a + b, 0);
  if (natTotal > box.h * 1.02) rec.warn.push(`表「${spec.headers.join("/")}」が枠に収まりません。行を減らすか分割してください`);
  // 余った高さは本文行に配分して、表で枠を満たす
  const extra = Math.max(0, box.h - natTotal);
  const bodyNat = nat.slice(1).reduce((a, b) => a + b, 0) || 1;
  const rowH = nat.map((h, i) => (i === 0 ? h : h + (extra * h) / bodyNat));
  rec.areas.push({ area: box.w * box.h, fill: Math.min(1, natTotal / box.h + 0.25), label: "表" });
  rec.sizes.add(size);

  const markColor = (m) => ({ positive: theme.positive, negative: theme.negative, accentText: ctx.colors.accentText }[MARKS[m]]);
  const cellRuns = (v, base, i, j) => {
    const paras = cellParas(v, i, j, size);
    // 先頭の評価記号（◎○△×）を色分けする
    const runs = buildRuns(paras, ctx, { ...base, paraAfter: 0 });
    for (const r of runs) {
      const m = r.text && r.text[0];
      if (MARKS[m]) {
        const rest = r.text.slice(1);
        const idx = runs.indexOf(r);
        runs.splice(idx, 1, { text: m, options: { ...r.options, color: markColor(m), bold: true, breakLine: rest ? false : r.options.breakLine } }, ...(rest ? [{ text: rest, options: { ...r.options, paraSpaceAfter: undefined, bullet: undefined } }] : []));
        break;
      }
    }
    return runs;
  };
  const tagColor = (v) => {
    const t = spec.tagColors && typeof v !== "object" && spec.tagColors[plain(v)];
    return t ? theme[t] || ctx.colors[t] || t : null;
  };
  const rows = rowsAll.map((r, i) => r.map((v, j) => {
    const isHead = i === 0;
    const hl = spec.highlight === j;
    const zebra = i % 2 === 0 ? theme.primaryTint : theme.white;
    const fill = isHead ? (hl ? theme.accent : theme.primary) : hl ? theme.accentTint : zebra;
    const color = isHead ? (hl ? theme.primaryDark : theme.white) : tagColor(v) || theme.ink;
    const bold = isHead || (j === 0 && spec.firstColBold !== false) || !!tagColor(v);
    const obj = typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
    return {
      text: cellRuns(v, { fontSize: size, color, bold }, i, j),
      options: { fill: { color: obj.fill ? theme[obj.fill] || obj.fill : fill }, align: obj.align || (spec.align && spec.align[j]) || "left", valign: "middle" },
    };
  }));
  slide.addTable(rows, {
    x: box.x, y: box.y, w: box.w, colW, rowH,
    fontFace: fonts.jp, fontSize: size,
    border: { type: "solid", pt: 0.75, color: theme.white },
    margin: [padY, padX, padY, padX],
    objectName: ctx.nm("table"),
  });
  return size;
}

// ---------------------------------------------------------------- グラフ（PowerPoint のネイティブグラフ）
// spec: { type: bar|hbar|stacked|line|area|pie|doughnut, title, categories: [], series: [{name, values}],
//         unit?, highlight?: 系列が1つのときに強調する項目の番号, min?, max?, valueLabels?: true, format?: "0.0" }
// 滝グラフ（増減の分解）: { type: "waterfall", start: {label, value}, steps: [{label, value}], endLabel }
// 透明な土台の系列を持つ積み上げ棒で作る。途中の累計が負にならない前提。
function waterfallSpec(ctx, spec) {
  const cats = [spec.start.label], base = [0], inc = [0], dec = [0], total = [spec.start.value];
  let run = spec.start.value;
  for (const s of spec.steps) {
    cats.push(s.label);
    if (s.value >= 0) { base.push(run); inc.push(s.value); dec.push(0); }
    else { base.push(run + s.value); inc.push(0); dec.push(-s.value); }
    total.push(0);
    run += s.value;
  }
  cats.push(spec.endLabel || "合計"); base.push(0); inc.push(0); dec.push(0); total.push(run);
  const round = (a) => a.map((v) => Math.round(v * 1000) / 1000);
  // 費用・損失のように「増えると悪い」ときは invert: true で色を入れ替える
  const t = ctx.theme;
  const [up, down] = spec.invert ? [t.negative, t.positive] : [t.positive, t.negative];
  // 棒が細すぎて数値が読めない項目はラベルを出さない（最大値の 6% 未満）
  const peak = Math.max(spec.start.value, run, ...base.map((b, i) => b + inc[i] + dec[i]));
  return {
    ...spec,
    type: "stacked",
    categories: cats,
    series: [
      { name: "基準", values: round(base) },
      { name: spec.increaseLabel || "増加", values: round(inc) },
      { name: spec.decreaseLabel || "減少", values: round(dec) },
      { name: spec.totalLabel || "合計", values: round(total) },
    ],
    _colors: [t.white, up, down, t.primary],
    _waterfall: true,
    _labelMin: Math.round(peak * 0.06 * 1000) / 1000,
  };
}

function chart(ctx, slide, rec, box, spec) {
  const { pres, theme, fonts } = ctx;
  // グラフの中には数式を置けないので、$…$ は代替テキスト（Unicode の文字列）にする
  const { replaceMath } = require("./math");
  spec = { ...spec, title: spec.title && replaceMath(spec.title) };
  if (spec.categories) spec.categories = spec.categories.map((c) => replaceMath(String(c)));
  if (spec.series) spec.series = spec.series.map((s) => ({ ...s, name: replaceMath(s.name) }));
  if (spec.type === "waterfall") spec = waterfallSpec(ctx, spec);
  if (spec.title && !fitsOneLine(spec.title, box.w * 0.9, 11)) rec.warn.push(`グラフの題名「${spec.title.slice(0, 20)}…」が1行に収まりません。短くするか、単位は unit に移してください`);
  const t = spec.type || "bar";
  const data = spec.series.map((s) => ({ name: s.name, labels: spec.categories, values: s.values }));
  const single = data.length === 1;
  let colors = theme.series.slice();
  if (single && (t === "bar" || t === "hbar") && spec.highlight !== undefined) {
    colors = spec.categories.map((_, i) => (i === spec.highlight ? theme.accent : theme.primary));
  }
  const labelColor = "4A5550";
  const base = {
    x: box.x, y: box.y, w: box.w, h: box.h,
    chartColors: colors,
    showTitle: !!spec.title, title: spec.title || "", titleFontFace: fonts.jp, titleFontSize: 11, titleColor: theme.primaryDark,
    showLegend: !single || t === "pie" || t === "doughnut", legendPos: "b", legendFontFace: fonts.jp, legendFontSize: 9.5, legendColor: labelColor,
    catAxisLabelFontFace: fonts.jp, catAxisLabelFontSize: 9.5, catAxisLabelColor: labelColor,
    valAxisLabelFontFace: fonts.jp, valAxisLabelFontSize: 9, valAxisLabelColor: labelColor,
    valGridLine: { color: "E2E8E5", size: 0.5 }, catGridLine: { style: "none" },
    catAxisLineShow: true, valAxisLineShow: false,
    dataLabelFontFace: fonts.jp, dataLabelFontSize: 9, dataLabelColor: labelColor,
    objectName: ctx.nm("chart"),
  };
  if (spec.min !== undefined) base.valAxisMinVal = spec.min;
  if (spec.max !== undefined) base.valAxisMaxVal = spec.max;
  if (spec.majorUnit !== undefined) base.valAxisMajorUnit = spec.majorUnit;
  if (spec.unit) { base.showValAxisTitle = true; base.valAxisTitle = spec.unit; base.valAxisTitleFontSize = 9; base.valAxisTitleColor = labelColor; base.valAxisTitleFontFace = fonts.jp; }
  if (spec.format) { base.valAxisLabelFormatCode = spec.format; base.dataLabelFormatCode = spec.format; }
  const showVal = spec.valueLabels !== undefined ? spec.valueLabels : single && (t === "bar" || t === "hbar");
  let type;
  if (t === "bar" || t === "hbar" || t === "stacked" || t === "hstacked") {
    type = pres.charts.BAR;
    base.barDir = t.startsWith("h") ? "bar" : "col";
    base.barGapWidthPct = 60;
    if (t.includes("stacked")) base.barGrouping = "stacked";
    if (showVal) { base.showValue = true; base.dataLabelPosition = t.includes("stacked") ? "ctr" : "outEnd"; if (t.includes("stacked")) base.dataLabelColor = "FFFFFF"; }
  } else if (t === "line" || t === "area") {
    type = t === "line" ? pres.charts.LINE : pres.charts.AREA;
    base.lineSize = 2.25; base.lineDataSymbol = spec.markers ? "circle" : "none"; base.lineDataSymbolSize = 6;
    if (showVal) { base.showValue = true; base.dataLabelPosition = "t"; }
  } else if (t === "pie" || t === "doughnut") {
    type = t === "pie" ? pres.charts.PIE : pres.charts.DOUGHNUT;
    base.showPercent = true; base.showValue = false; base.dataLabelColor = "FFFFFF"; base.dataLabelPosition = "ctr";
    base.chartColors = theme.series.concat([theme.rule]);
  } else {
    throw new Error(`グラフの type "${t}" は未対応です（bar, hbar, stacked, hstacked, line, area, pie, doughnut）`);
  }
  if (spec._waterfall) {
    // 土台は白（背景と同化）、目盛線なし、0 のラベルは表示しない
    base.chartColors = spec._colors;
    base.valGridLine = { style: "none" };
    base.showLegend = false;
    base.showValue = true;
    base.dataLabelPosition = "ctr";
    base.dataLabelColor = "FFFFFF";
    base.dataLabelFormatCode = `[<${spec._labelMin}]"";${spec.format || "#,##0"}`;
    base.barGapWidthPct = 40;
  }
  slide.addChart(type, data, base);
  recordSolid(rec, box, "グラフ");
}

// ---------------------------------------------------------------- 一覧の行（目次・演習・次の行動など）
// spec: { label（左の大きな番号）, title, body, meta（右端の補足） }  opt: { fill, labelW, line }
function planRow(ctx, slide, box, spec, opt = {}) {
  const { theme, sizes, fonts } = ctx;
  const labelW = spec.label !== undefined ? opt.labelW || 0.85 : 0;
  const metaW = spec.meta ? opt.metaW || 1.1 : 0;
  const x = box.x + (labelW || PAD);
  const w = box.w - (labelW || PAD) - metaW - PAD;
  const hasBody = spec.body && [].concat(spec.body).length;
  const titleH = spec.title ? (sizes.cardTitle * METRICS.lineHeight) / 72 + (hasBody ? 0.06 : 0) : 0;
  const area = { x, y: box.y + 0.08 + titleH, w, h: box.h - 0.16 - titleH, paras: hasBody ? toParagraphs(spec.body) : [], label: spec.title || String(spec.label || "行") };
  return {
    areas: [area],
    draw(size) {
      slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: opt.fill || theme.primaryTint }, line: opt.line ? { color: opt.line, width: 0.75 } : { type: "none" }, objectName: ctx.nm("row") });
      if (labelW) {
        const ls = Math.min(opt.labelSize || 22, Math.max(12, box.h * 72 * 0.42));
        slide.addText(String(spec.label), { x: box.x, y: box.y, w: labelW, h: box.h, fontFace: fonts.jp, fontSize: ls, bold: true, color: opt.labelColor || theme.primary, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("row-label") });
      }
      if (spec.title) {
        const ty = hasBody ? box.y + 0.08 : box.y;
        const th = hasBody ? titleH : box.h;
        textBox(ctx, slide, { x, y: ty, w, h: th }, headRuns(ctx, spec.title, w, sizes.cardTitle, { bold: true, color: theme.primaryDark }, hasBody ? 1 : 2), { valign: hasBody ? "top" : "middle", name: "row-title" });
      }
      if (hasBody) textBox(ctx, slide, area, bodyRuns(ctx, area, size, theme.ink), { name: "row-body", valign: spec.title ? "top" : "middle" });
      if (metaW) slide.addText(runsOf(spec.meta, ctx, { fontSize: 11, bold: true, color: theme.muted }), { x: box.x + box.w - metaW - PAD, y: box.y, w: metaW, h: box.h, align: "right", valign: "middle", margin: 0, isTextBox: true, objectName: ctx.nm("row-meta") });
    },
  };
}

// ---------------------------------------------------------------- 線・矢印
function hline(ctx, slide, x1, x2, y, color, width = 1.25, arrow = false) {
  slide.addShape(ctx.pres.shapes.LINE, { x: Math.min(x1, x2), y, w: Math.abs(x2 - x1), h: 0, flipH: x2 < x1, line: { color, width, endArrowType: arrow ? "triangle" : undefined }, objectName: ctx.nm("hline") });
}
function vline(ctx, slide, x, y1, y2, color, width = 1.25, arrow = false) {
  slide.addShape(ctx.pres.shapes.LINE, { x, y: Math.min(y1, y2), w: 0, h: Math.abs(y2 - y1), flipV: y2 < y1, line: { color, width, endArrowType: arrow ? "triangle" : undefined }, objectName: ctx.nm("vline") });
}
function arrowRight(ctx, slide, cx, cy, size, color) {
  slide.addShape(ctx.pres.shapes.ISOSCELES_TRIANGLE, { x: cx - size / 2, y: cy - size / 2, w: size, h: size, rotate: 90, fill: { color }, line: { type: "none" }, objectName: ctx.nm("arrow") });
}

// ---------------------------------------------------------------- KPI タイル
// spec: { label, value, unit?, delta?, good?: "up"|"down", note? }
function kpiTile(ctx, slide, rec, box, spec) {
  const { theme, fonts, sizes } = ctx;
  slide.addShape(ctx.pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("kpi") });
  const iw = box.w - 2 * PAD;
  slide.addText(runsOf(spec.label, ctx, { fontSize: 10.5, bold: true, color: theme.muted }), { x: box.x + PAD, y: box.y + 0.1, w: iw, h: 0.26, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("kpi-label") });
  let vs = sizes.kpiValue;
  const valStr = String(spec.value), unit = spec.unit || "";
  while (vs > 18 && !fitsOneLine(valStr + unit, iw, vs * 0.92)) vs -= 2;
  const vh = (vs * 1.25) / 72;
  slide.addText([
    { text: valStr, options: { fontFace: fonts.jp, fontSize: vs, bold: true, color: theme.primary } },
    { text: unit, options: { fontFace: fonts.jp, fontSize: Math.round(vs * 0.42), bold: true, color: theme.primary } },
  ], { x: box.x + PAD, y: box.y + 0.38, w: iw, h: vh, margin: 0, valign: "bottom", isTextBox: true, objectName: ctx.nm("kpi-value") });
  let y = box.y + 0.38 + vh + 0.04;
  if (spec.delta) {
    const up = /^[+＋▲↑]/.test(spec.delta);
    const good = spec.good ? (spec.good === "up") === up : true;
    slide.addText(spec.delta, { x: box.x + PAD, y, w: iw, h: 0.26, fontFace: fonts.jp, fontSize: 11, bold: true, color: good ? theme.positive : theme.negative, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("kpi-delta") });
    y += 0.28;
  }
  if (spec.note && box.y + box.h - y - 0.08 < 0.18) {
    rec.warn.push(`KPI「${spec.label}」の注記を入れる高さがありません。タイルを高くするか注記を外してください`);
  } else if (spec.note) {
    const area = { x: box.x + PAD, y, w: iw, h: box.y + box.h - y - 0.08 };
    const paras = toParagraphs(spec.note);
    const fit = fitSize(paras, area.w, area.h, [10.5, 9], 0);
    slide.addText(buildRuns(paras, ctx, { fontSize: fit.size, color: theme.ink, paraAfter: 0 }), { ...area, margin: 0, valign: "top", isTextBox: true, objectName: ctx.nm("kpi-note") });
    if (!fit.fits) rec.warn.push(`KPI「${spec.label}」の注記が長すぎます`);
  }
  recordSolid(rec, box, "KPI");
}

// ---------------------------------------------------------------- 手順・流れ（横並びの箱と矢印）
// steps: [{ title, body? }]
function planStepFlow(ctx, slide, box, steps, opt = {}) {
  const { theme, sizes } = ctx;
  const n = steps.length;
  const arrowW = 0.26;
  const w = (box.w - arrowW * (n - 1)) / n;
  const plans = steps.map((s, i) => {
    const b = { x: box.x + i * (w + arrowW), y: box.y, w, h: box.h };
    const fill = opt.emphasize === i ? theme.accentTint : theme.primaryTint;
    return planCard(ctx, slide, b, { num: i + 1, title: s.title, body: s.body }, { fill, label: s.title });
  });
  return {
    areas: plans.flatMap((p) => p.areas),
    draw(size) {
      plans.forEach((p, i) => {
        p.draw(size);
        if (i < n - 1) {
          const ax = box.x + (i + 1) * w + i * arrowW + 0.04;
          slide.addShape(ctx.pres.shapes.ISOSCELES_TRIANGLE, { x: ax, y: box.y + box.h / 2 - 0.13, w: arrowW - 0.08, h: 0.26, rotate: 90, fill: { color: theme.primary }, line: { type: "none" }, objectName: ctx.nm("flow-arrow") });
        }
      });
    },
  };
}

// ---------------------------------------------------------------- ガントチャート
// spec: { periods: [], tasks: [{ name, owner?, start, end, label?, highlight?, milestone? }] }
// start / end は periods の番号（0始まり、end を含む）。小数も可（0.5 = 期間の中ほど）。
function gantt(ctx, slide, rec, box, spec) {
  const { theme, fonts, pres } = ctx;
  const np = spec.periods.length, nt = spec.tasks.length;
  const labelW = Math.min(3.0, box.w * 0.27);
  const headH = 0.36;
  const rowH = (box.h - headH) / nt;
  const gx = box.x + labelW, gw = box.w - labelW, pw = gw / np;
  // 見出し行
  slide.addShape(pres.shapes.RECTANGLE, { x: box.x, y: box.y, w: box.w, h: headH, fill: { color: theme.primary }, line: { type: "none" }, objectName: ctx.nm("gantt-head") });
  slide.addText(spec.taskHeader || "作業・担当", { x: box.x + 0.1, y: box.y, w: labelW - 0.1, h: headH, fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.white, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-h") });
  spec.periods.forEach((p, i) => slide.addText(p, { x: gx + i * pw, y: box.y, w: pw, h: headH, fontFace: fonts.jp, fontSize: 11, bold: true, color: theme.white, align: "center", margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-p") }));
  // 行と縦線
  const nameSize = Math.min(12, Math.max(10, rowH * 72 * 0.3));
  spec.tasks.forEach((t, i) => {
    const y = box.y + headH + i * rowH;
    slide.addShape(pres.shapes.RECTANGLE, { x: box.x, y, w: box.w, h: rowH, fill: { color: i % 2 ? theme.white : theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("gantt-row") });
    const runs = [{ text: t.name, options: { fontFace: fonts.jp, fontSize: nameSize, bold: true, color: theme.ink, breakLine: !!t.owner } }];
    if (t.owner) runs.push({ text: t.owner, options: { fontFace: fonts.jp, fontSize: nameSize - 1.5, color: theme.muted } });
    slide.addText(runs, { x: box.x + 0.1, y, w: labelW - 0.15, h: rowH, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-name") });
  });
  for (let i = 1; i < np; i++) slide.addShape(pres.shapes.LINE, { x: gx + i * pw, y: box.y + headH, w: 0, h: box.h - headH, line: { color: theme.rule, width: 0.75, dashType: "dash" }, objectName: ctx.nm("gantt-grid") });
  // バーとマイルストーン
  spec.tasks.forEach((t, i) => {
    const y = box.y + headH + i * rowH;
    if (t.milestone !== undefined) {
      const mx = gx + (t.milestone + 0.5) * pw;
      const d = Math.min(0.3, rowH * 0.5);
      slide.addShape(pres.shapes.DIAMOND, { x: mx - d / 2, y: y + (rowH - d) / 2, w: d, h: d, fill: { color: theme.accent }, line: { type: "none" }, objectName: ctx.nm("milestone") });
      if (t.label) {
        // 右側に入らなければ菱形の左に右寄せで置く
        const rightW = gx + gw - (mx + d / 2 + 0.05);
        const right = fitsOneLine(t.label, rightW, 10);
        slide.addText(t.label, { x: right ? mx + d / 2 + 0.05 : gx, y, w: right ? rightW : mx - d / 2 - 0.05 - gx, h: rowH, fontFace: fonts.jp, fontSize: 10, bold: true, color: theme.ink, align: right ? "left" : "right", margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("milestone-label") });
      }
      return;
    }
    const bx = gx + t.start * pw + 0.04, bw = (t.end - t.start + 1) * pw - 0.08;
    const bh = Math.min(0.42, rowH * 0.58);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: y + (rowH - bh) / 2, w: bw, h: bh, rectRadius: 0.05, fill: { color: t.highlight ? theme.accent : theme.primary }, line: { type: "none" }, objectName: ctx.nm("gantt-bar") });
    if (t.label) {
      const inside = fitsOneLine(t.label, bw - 0.16, 10);
      slide.addText(t.label, { x: inside ? bx + 0.08 : bx + bw + 0.06, y: y + (rowH - bh) / 2, w: inside ? bw - 0.16 : Math.max(1.0, gx + gw - (bx + bw) - 0.1), h: bh, fontFace: fonts.jp, fontSize: 10, bold: true, color: inside ? (t.highlight ? theme.primaryDark : theme.white) : theme.ink, margin: 0, valign: "middle", isTextBox: true, objectName: ctx.nm("gantt-label") });
    }
  });
  recordSolid(rec, box, "ガント");
}

// ---------------------------------------------------------------- 層構造の図（ニューラルネット・構成図）
// spec: { layers: [3, 4, 2], labels?: ["入力", "隠れ層", "出力"], edgeLabels?: ["W1", "W2"] }
function layerDiagram(ctx, slide, rec, box, spec) {
  const { theme, fonts, pres } = ctx;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.06, fill: { color: theme.primaryTint }, line: { type: "none" }, objectName: ctx.nm("diagram-bg") });
  const L = spec.layers, n = L.length;
  const top = box.y + 0.4, bottom = box.y + box.h - 0.42;
  const xs = L.map((_, i) => box.x + 0.45 + (i * (box.w - 0.9)) / (n - 1));
  const r = Math.min(0.16, ((bottom - top) / Math.max(...L)) * 0.32);
  const pos = L.map((k, li) => [...Array(k).keys()].map((j) => [xs[li], top + ((j + 0.5) * (bottom - top)) / k]));
  for (let li = 0; li < n - 1; li++) for (const a of pos[li]) for (const b of pos[li + 1]) {
    const x1 = a[0] + r, x2 = b[0] - r;
    slide.addShape(pres.shapes.LINE, { x: x1, y: Math.min(a[1], b[1]), w: x2 - x1, h: Math.abs(b[1] - a[1]) || 0.001, flipV: b[1] < a[1], line: { color: theme.rule, width: 0.75 }, objectName: ctx.nm("edge") });
  }
  const fills = [theme.accent, theme.primary, theme.negative, theme.muted];
  pos.forEach((layer, li) => layer.forEach(([x, y]) => slide.addShape(pres.shapes.OVAL, { x: x - r, y: y - r, w: 2 * r, h: 2 * r, fill: { color: li === 0 ? fills[0] : li === n - 1 ? fills[2] : fills[1] }, line: { color: theme.white, width: 1 }, objectName: ctx.nm("node") })));
  const lab = (t, cx, y) => slide.addText(runsOf(t, ctx, { fontSize: 10, bold: true, color: theme.primaryDark }), { x: cx - 0.7, y, w: 1.4, h: 0.26, align: "center", margin: 0, isTextBox: true, objectName: ctx.nm("diagram-label") });
  (spec.labels || []).forEach((t, i) => lab(t, xs[i], box.y + box.h - 0.34));
  (spec.edgeLabels || []).forEach((t, i) => lab(t, (xs[i] + xs[i + 1]) / 2, box.y + 0.08));
  recordSolid(rec, box, "図");
}

// ---------------------------------------------------------------- 画像
function image(ctx, slide, rec, box, spec, baseDir) {
  const path = require("path");
  slide.addImage({ path: path.resolve(baseDir, spec.path), x: box.x, y: box.y, w: box.w, h: box.h, sizing: { type: spec.fit || "contain", w: box.w, h: box.h }, altText: spec.alt || "", objectName: ctx.nm("image") });
  recordSolid(rec, box, "画像");
}

module.exports = { PAD, GAP, headRuns, renderGroup, recordSolid, textBox, badge, planCard, planPanel, planRow, keyMessage, table, chart, kpiTile, planStepFlow, gantt, layerDiagram, image, hline, vline, arrowRight };
