// デッキ全体の土台：用紙・テーマ・フォント・スライドレイアウト・見出し・検査記録

const pptxgen = require("pptxgenjs");
const { PAGES, DENSITY, FONTS } = require("./config");
const { getTheme } = require("./themes");
const { fitsOneLine } = require("./textfit");
const { runsOf } = require("./markup");

function createDeck(meta) {
  const size = meta.size || "a4";
  const page = PAGES[size];
  if (!page) throw new Error(`size "${size}" は未対応です（a4 / 16:9）`);
  const densityName = meta.density || "dense";
  const sizes = DENSITY[densityName];
  if (!sizes) throw new Error(`density "${densityName}" は未対応です（dense / present）`);
  const fonts = FONTS[meta.font || "hiragino"];
  if (!fonts) throw new Error(`font "${meta.font}" は未対応です（${Object.keys(FONTS).join(" / ")}）`);
  const theme = getTheme(meta.theme || "forest");

  const pres = new pptxgen();
  pres.defineLayout({ name: page.name, width: page.width, height: page.height });
  pres.layout = page.name;
  pres.title = meta.title || "";
  pres.author = meta.author || "";
  pres.subject = meta.subject || "";
  pres.theme = { headFontFace: fonts.jp, bodyFontFace: fonts.jp };

  const ctx = {
    pres, page, size, sizes, fonts, theme, densityName,
    colors: { primary: theme.primary, accentText: darkerAccent(theme) },
    slideNo: 0,
    report: [], // スライドごとの検査結果
    objN: 0,
    math: [], // 本文の数式（目印の番号 → TeX）。書き出し後に PowerPoint の数式に置き換える
  };
  // 解釈できない数式は、そのページの警告にする
  ctx.onMathError = (tex, msg) => {
    const rec = ctx.report[ctx.report.length - 1];
    const w = `数式「${tex.slice(0, 30)}」を解釈できません：${msg}`;
    if (rec && !rec.warn.includes(w)) rec.warn.push(w);
  };
  ctx.nm = (s) => `${s}-${++ctx.objN}`;
  defineLayouts(ctx);
  return ctx;
}

// 白地の文字に使うアクセント色（明るすぎるアクセントは少し暗くする）
function darkerAccent(theme) {
  const v = parseInt(theme.accent, 16);
  const lum = 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
  if (lum < 150) return theme.accent;
  const { mix } = require("./themes");
  return mix(theme.accent, "000000", 0.28);
}

function defineLayouts(ctx) {
  const { pres, page, sizes, fonts, theme } = ctx;
  const b = page.body;
  pres.defineSlideMaster({
    title: "COVER",
    background: { color: theme.primaryDark },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 0.95, w: page.width - 1.5, h: 1.75, fontFace: fonts.jp, fontSize: 32, bold: true, color: theme.white, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "SECTION",
    background: { color: theme.primaryDark },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 2.75, w: 5.9, h: 1.3, fontFace: fonts.jp, fontSize: 28, bold: true, color: theme.white, valign: "top", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: page.width - 1.05, y: page.footerY, w: 0.6, h: 0.22, fontFace: fonts.jp, fontSize: sizes.source, color: theme.onDarkMuted, align: "right" },
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: theme.white },
    objects: [
      { placeholder: { options: { name: "chapter", type: "body", x: b.x, y: 0.2, w: b.w, h: 0.22, fontFace: fonts.jp, fontSize: sizes.chapter, bold: true, color: theme.primary, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: b.x, y: 0.42, w: b.w, h: 0.5, fontFace: fonts.jp, fontSize: sizes.title[ctx.size], bold: true, color: theme.primaryDark, valign: "middle", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "lead", type: "body", x: b.x, y: 0.94, w: b.w, h: 0.3, fontFace: fonts.jp, fontSize: sizes.lead.size, color: theme.muted, valign: "top", align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "source", type: "body", x: b.x, y: page.footerY, w: b.w - 0.8, h: 0.22, fontFace: fonts.jp, fontSize: sizes.source, color: theme.muted, valign: "middle", align: "left", margin: 0 }, text: "" } },
    ],
    slideNumber: { x: b.x + b.w - 0.6, y: page.footerY, w: 0.6, h: 0.22, fontFace: fonts.jp, fontSize: sizes.source, color: theme.muted, align: "right" },
  });
}

// 通常ページを作り、章ラベル・見出し・リード文・出典を入れる
function contentSlide(ctx, spec, section) {
  const { pres, page, sizes, theme, fonts } = ctx;
  const slide = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  const rec = startRecord(ctx, spec);
  if (spec.chapter) slide.addText(spec.chapter, { placeholder: "chapter" });
  // 見出しは1行に収める。入らなければ最小サイズまで縮め、それでも入らなければ警告
  const tMax = sizes.title[ctx.size], tMin = sizes.title.min;
  let ts = tMax;
  while (ts > tMin && !fitsOneLine(spec.title, page.body.w, ts)) ts -= 1;
  if (!fitsOneLine(spec.title, page.body.w, ts)) rec.warn.push(`見出しが長く1行に収まりません（${spec.title.length}字）。短くしてください`);
  checkTaigen(rec, spec.title, "見出し");
  slide.addText(runsOf(spec.title, ctx, { fontSize: ts, bold: true, color: theme.primaryDark }), { placeholder: "title" });
  if (spec.lead) {
    let ls = sizes.lead.size;
    while (ls > sizes.lead.min && !fitsOneLine(spec.lead, page.body.w, ls)) ls -= 0.5;
    if (!fitsOneLine(spec.lead, page.body.w, ls)) rec.warn.push("リード文が1行に収まりません。短くしてください");
    slide.addText(runsOf(spec.lead, ctx, { fontSize: ls, color: theme.muted }), { placeholder: "lead" });
  }
  if (spec.source) slide.addText(runsOf(spec.source, ctx, { fontSize: sizes.source, color: theme.muted }), { placeholder: "source" });
  if (spec.notes) slide.addNotes(spec.notes);
  return { slide, rec };
}

// 見出しは体言止めにする（「〜だ」「〜である」「〜です」で終えない）
const DA_ENDING = /(だ|である|であった|だった|です|でした|ます|ました)[。．.！!]?$/;
function checkTaigen(rec, title, label) {
  const t = String(title || "").replace(/\*\*|==|\[\[|\]\]/g, "").trim();
  if (DA_ENDING.test(t)) rec.warn.push(`${label}は体言止めにしてください（「…${t.slice(-8)}」→ 例：「〜だ」を除いて名詞で終える）`);
  else if (/[。．]$/.test(t)) rec.warn.push(`${label}の末尾の句点「。」は不要です`);
}

function startRecord(ctx, spec) {
  ctx.slideNo += 1;
  const rec = { no: ctx.slideNo, pattern: spec.pattern, title: spec.title || "", areas: [], warn: [], sizes: new Set() };
  ctx.report.push(rec);
  return rec;
}

module.exports = { createDeck, contentSlide, startRecord, checkTaigen };
