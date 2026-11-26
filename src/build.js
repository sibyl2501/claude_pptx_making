#!/usr/bin/env node
// 使い方:
//   node src/build.js deck.json out.pptx      生成して検査結果を表示
//   node src/build.js --check deck.json       入力と収まり・密度だけ検査（ファイルは書かない）
//   node src/build.js --catalog               パターン一覧
// 上書き: --theme forest|navy|graphite|burgundy  --size a4|16:9  --density dense|present  --font hiragino|yu-gothic|meiryo

const fs = require("fs");
const path = require("path");
const { createDeck } = require("./deck");
const { PATTERNS } = require("./patterns");
const { applyThemeXml } = require("./theme-xml");
const { THEMES } = require("./themes");

const LOW_FILL = 0.55; // ページの文字領域の充填率がこれ未満なら「空きが多い」と警告

function parseArgs(argv) {
  const opts = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") opts.check = true;
    else if (a === "--catalog") opts.catalog = true;
    else if (a.startsWith("--")) opts[a.slice(2)] = argv[++i];
    else opts.files.push(a);
  }
  return opts;
}

function validate(spec) {
  const errs = [];
  if (!spec.deck) errs.push("最上位に deck がありません");
  if (!Array.isArray(spec.slides) || !spec.slides.length) errs.push("slides が空です");
  (spec.slides || []).forEach((s, i) => {
    const where = `slides[${i}]${s.title ? `「${s.title}」` : ""}`;
    const p = PATTERNS[s.pattern];
    if (!p) { errs.push(`${where}: pattern "${s.pattern}" はありません（--catalog で一覧）`); return; }
    for (const k of p.required) if (s[k] === undefined || s[k] === null || s[k] === "") errs.push(`${where}: ${k} が必要です`);
  });
  return errs;
}

function summarize(ctx) {
  const lines = [];
  let warnCount = 0;
  for (const r of ctx.report) {
    const total = r.areas.reduce((a, x) => a + x.area, 0) || 1;
    const fill = r.areas.reduce((a, x) => a + x.area * Math.min(1, x.fill), 0) / total;
    const sizes = [...r.sizes].sort((a, b) => b - a).join("/") || "-";
    if (fill < LOW_FILL) r.warn.push(`本文の空きが多めです（充填率 ${(fill * 100).toFixed(0)}%）。内容を足すか、カードの少ない型に変えてください`);
    const thin = r.areas.filter((a) => a.fill < 0.45 && a.label !== "表");
    if (thin.length) r.warn.push(`中身が少ない枠: ${thin.map((a) => `「${a.label}」${(a.fill * 100).toFixed(0)}%`).join("、")}`);
    warnCount += r.warn.length;
    lines.push(`${String(r.no).padStart(2)}  ${r.pattern.padEnd(14)} 本文${String(sizes).padEnd(9)}pt  充填 ${String((fill * 100).toFixed(0)).padStart(3)}%  ${r.title.slice(0, 34)}`);
    for (const w of r.warn) lines.push(`      ⚠ ${w}`);
  }
  return { text: lines.join("\n"), warnCount };
}

async function build(input, output, overrides = {}) {
  const spec = JSON.parse(fs.readFileSync(input, "utf8"));
  const errs = validate(spec);
  if (errs.length) {
    const e = new Error("入力エラー:\n  " + errs.join("\n  "));
    e.code = "INPUT";
    throw e;
  }
  const meta = { ...spec.deck };
  for (const k of ["theme", "size", "density", "font"]) if (overrides[k]) meta[k] = overrides[k];
  const ctx = createDeck(meta);
  const baseDir = path.dirname(path.resolve(input));
  let sectionTitle = meta.firstSection || "はじめに";
  let sectionOpened = false;
  for (const s of spec.slides) {
    if (s.pattern === "section" || !sectionOpened) {
      sectionTitle = s.pattern === "section" ? s.title : sectionTitle;
      ctx.pres.addSection({ title: sectionTitle });
      sectionOpened = true;
    }
    PATTERNS[s.pattern].render(ctx, s, sectionTitle, baseDir);
  }
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    await ctx.pres.writeFile({ fileName: output });
    await applyThemeXml(output, ctx.theme, ctx.fonts);
  }
  return ctx;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.catalog) {
    console.log("パターン一覧（Phase 1）");
    for (const [k, p] of Object.entries(PATTERNS)) console.log(`  ${p.id.padEnd(3)} ${k.padEnd(14)} ${p.label}：${p.use}`);
    console.log("\nテーマ: " + Object.entries(THEMES).map(([k, t]) => `${k}（${t.label}）`).join("、"));
    return;
  }
  const [input, output] = opts.files;
  if (!input || (!output && !opts.check)) {
    console.error("使い方: node src/build.js deck.json out.pptx  |  node src/build.js --check deck.json  |  node src/build.js --catalog");
    process.exit(2);
  }
  try {
    const ctx = await build(input, opts.check ? null : output, opts);
    const { text, warnCount } = summarize(ctx);
    console.log(`${ctx.report.length} 枚（${ctx.size} / ${ctx.theme.name} / ${ctx.densityName}）`);
    console.log(text);
    if (output && !opts.check) console.log(`\n書き出し: ${output}`);
    console.log(warnCount ? `\n警告 ${warnCount} 件。PowerPoint で該当ページを確認してください。` : "\n警告なし");
  } catch (e) {
    console.error(e.code === "INPUT" ? e.message : e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { build };
