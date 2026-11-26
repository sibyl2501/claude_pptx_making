// 回帰テスト: npm test
// 見本を全設定で生成し、壊れたファイル・はみ出し・仕様違反が出ていないことを確かめる。

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("../src/build");
const { PATTERNS } = require("../src/patterns");
const { validateDeck } = require("../src/schema");
const { runsOf, plain, toParagraphs } = require("../src/markup");
const { measure } = require("../src/textfit");
const { FONTS } = require("../src/config");

const EX = path.join(__dirname, "..", "examples");
const examples = ["nn_math", "business_report", "catalog"];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pptx-test-"));
const warnings = (ctx) => ctx.report.flatMap((r) => r.warn.map((w) => `${r.no}: ${w}`));

for (const name of examples) {
  test(`${name}: 仕様（JSON Schema）に合っている`, () => {
    const spec = JSON.parse(fs.readFileSync(path.join(EX, `${name}.json`), "utf8"));
    assert.deepStrictEqual(validateDeck(spec), []);
  });

  test(`${name}: 既定の設定で生成でき、はみ出しがない`, async () => {
    const ctx = await build(path.join(EX, `${name}.json`), path.join(tmp, `${name}.pptx`));
    const overflow = warnings(ctx).filter((w) => /収まりません|高さがありません/.test(w));
    assert.deepStrictEqual(overflow, []);
  });
}

for (const [label, opts] of [
  ["16:9", { size: "16:9" }],
  ["発表向け", { density: "present" }],
  ["navy", { theme: "navy" }],
  ["burgundy", { theme: "burgundy" }],
  ["游ゴシック", { font: "yu-gothic" }],
]) {
  test(`catalog: ${label} でも壊れたファイルにならない`, async () => {
    // build は負の大きさの図形があると例外を投げる
    await build(path.join(EX, "catalog.json"), path.join(tmp, `catalog-${label}.pptx`), opts);
  });
}

test("catalog: 全パターンを1回以上使っている", () => {
  const spec = JSON.parse(fs.readFileSync(path.join(EX, "catalog.json"), "utf8"));
  const used = new Set(spec.slides.map((s) => s.pattern));
  assert.deepStrictEqual(Object.keys(PATTERNS).filter((k) => !used.has(k)), []);
});

test("仕様: 書き間違えた項目名をエラーにする", () => {
  const errs = validateDeck({ deck: {}, slides: [{ pattern: "card_grid", title: "t", cardz: [] }] });
  assert.ok(errs.some((e) => /cardz/.test(e)));
  assert.ok(errs.some((e) => /cards が必要/.test(e)));
});

test("ミニ記法: 強調の中の数式も解析する", () => {
  const ctx = { fonts: FONTS.hiragino, colors: { primary: "111111", accentText: "222222" } };
  const runs = runsOf("**転置 $W^{T}$ で流れる**", ctx, {});
  assert.ok(runs.every((r) => r.options.bold));
  assert.ok(runs.some((r) => r.text === "T" && r.options.superscript && r.options.fontFace === "Cambria"));
  assert.strictEqual(plain("==曲率 $λ = x^{2}$=="), "曲率 λ = x2");
});

test("収まり: 幅が狭いほど行数が増え、1〜2文字の最終行を検出する", () => {
  const paras = toParagraphs(["あいうえおかきくけこさしすせそ"]);
  const wide = measure(paras, 3, 12), narrow = measure(paras, 1, 12);
  assert.ok(narrow.lines > wide.lines);
  // 12pt で 13 文字分の幅 → 15 文字は 2 文字だけ次の行に出る
  const m = measure(paras, (13 * 12) / 72 + 0.01, 12);
  assert.strictEqual(m.orphans.length, 1);
});
