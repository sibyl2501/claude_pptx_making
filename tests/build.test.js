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

test("ミニ記法: 強調の中の数式も解析し、数式の目印を記録する", () => {
  const ctx = { fonts: FONTS.hiragino, colors: { primary: "111111", accentText: "222222" }, math: [] };
  const runs = runsOf("**転置 $W^{T}$ で流れる**", ctx, {});
  assert.ok(runs.every((r) => r.options.bold));
  assert.deepStrictEqual(ctx.math, [{ tex: "W^{T}", display: false }]);
  assert.ok(runs.some((r) => r.text === "\uE0000\uE001"));
  assert.strictEqual(plain("==曲率 $λ = x^{2}$=="), "曲率 λ=x^2");
});

test("数式: TeX を PowerPoint の数式（OMML）と代替テキストにする", () => {
  const { parseTex, toOmml } = require("../src/math");
  const r = parseTex("\\frac{1}{n}\\sum_{i=1}^{n} x_{i}^{2}");
  assert.ok(!r.error);
  assert.match(r.xml, /<m:f>/);
  assert.match(r.xml, /<m:nary><m:naryPr><m:chr m:val="∑"\/>/);
  assert.match(r.xml, /<m:sSubSup>/);
  assert.strictEqual(r.lin, "1/n∑_(i=1)^n x_i^2");
  assert.match(toOmml("\\theta", '<a:rPr sz="1200"/>', false), /^<a14:m><m:oMath xmlns:m=.*<a:rPr sz="1200"\/><m:t xml:space="preserve">θ<\/m:t>/);
  assert.match(parseTex("\\foo{x}").error, /未対応の命令/);
  assert.match(parseTex("\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}").xml, /<m:m>.*<m:mr>.*<m:mr>/);
});

test("数式: 書き出したファイルで数式が OMML になり、文字の言語が日本語になる", async () => {
  const JSZip = require("jszip");
  const deck = { deck: { title: "t" }, slides: [{ pattern: "card_grid", title: "数式の確認", cards: [
    { title: "文中の数式", body: ["- 平均は $\\frac{1}{n}\\sum_{i} x_{i}$ で求める"] },
    { title: "段落の数式", body: ["$$\\nabla_{θ} L = X^{\\top}(ŷ − y)$$"] },
  ] }] };
  const inp = path.join(tmp, "math.json"), out = path.join(tmp, "math.pptx");
  fs.writeFileSync(inp, JSON.stringify(deck));
  await build(inp, out);
  const xml = await (await JSZip.loadAsync(fs.readFileSync(out))).file("ppt/slides/slide1.xml").async("string");
  assert.match(xml, /<mc:AlternateContent[^>]*><mc:Choice [^>]*Requires="a14">/);
  assert.match(xml, /<a14:m><m:oMath xmlns:m=/);
  assert.match(xml, /<a14:m><m:oMathPara /);
  assert.ok(!xml.includes("\uE000"));
  assert.ok(!/lang="en-US"(?! altLang)/.test(xml.replace(/ altLang="en-US"/g, "")));
});

test("数式: 解釈できない数式はそのページの警告にする", async () => {
  const deck = { deck: { title: "t" }, slides: [{ pattern: "card_grid", title: "警告の確認", cards: [{ title: "a", body: ["$\\unknowncmd{x}$"] }] }] };
  const inp = path.join(tmp, "math-bad.json");
  fs.writeFileSync(inp, JSON.stringify(deck));
  const ctx = await build(inp, null);
  assert.ok(warnings(ctx).some((w) => /数式「\\unknowncmd\{x\}」を解釈できません/.test(w)));
});

test("見出し: かっこ書きが長いときはかっこの前で改行する", () => {
  const { breakHeading } = require("../src/textfit");
  // 12pt で全角 16 字ほどの幅
  const w = (16 * 12) / 72;
  assert.deepStrictEqual(breakHeading("多値分類（ラベルを当てる問題）", w, 12), ["多値分類（ラベルを当てる問題）"]);
  assert.deepStrictEqual(breakHeading("誤差逆伝播法の考え方（連鎖律で出力側から順に勾配を求める）", w, 12), ["誤差逆伝播法の考え方", "（連鎖律で出力側から順に勾配を求める）"]);
  assert.deepStrictEqual(breakHeading("表現力の高いモデルから出発し、推定誤差と最適化誤差を減らす", w, 12), ["表現力の高いモデルから出発し、", "推定誤差と最適化誤差を減らす"]);
});

test("見出し: 「〜だ」で終わる見出しを警告する", async () => {
  const deck = { deck: { title: "t" }, slides: [
    { pattern: "card_grid", title: "怖いのは局所解ではなく鞍点だ", cards: [{ title: "a", body: ["b"] }] },
    { pattern: "card_grid", title: "怖いのは局所解ではなく鞍点", cards: [{ title: "a", body: ["b"] }] },
  ] };
  const inp = path.join(tmp, "taigen.json");
  fs.writeFileSync(inp, JSON.stringify(deck));
  const ctx = await build(inp, null);
  assert.ok(ctx.report[0].warn.some((w) => /体言止め/.test(w)));
  assert.ok(!ctx.report[1].warn.some((w) => /体言止め/.test(w)));
});

test("丸数字: 円と数字を1つの図形にする", async () => {
  const JSZip = require("jszip");
  const out = path.join(tmp, "catalog.pptx");
  if (!fs.existsSync(out)) await build(path.join(EX, "catalog.json"), out);
  const zip = await JSZip.loadAsync(fs.readFileSync(out));
  const xml = await zip.file("ppt/slides/slide4.xml").async("string");
  assert.ok(!/name="badge-num/.test(xml));
  assert.match(xml, /name="badge-\d+"[\s\S]*?<a:prstGeom prst="ellipse">[\s\S]*?<a:t>1<\/a:t>/);
});

test("余白: 空きの多い枠は段落の間と行間を広げる", () => {
  const { toParagraphs } = require("../src/markup");
  const C = require("../src/components");
  const ctx = { sizes: { body: [12, 9.5] }, fonts: FONTS.hiragino, colors: {} };
  const area = { w: 3, h: 4, paras: toParagraphs(["- 短い箇条1", "- 短い箇条2", "- 短い箇条3"]) };
  const drawn = [];
  const rec = { areas: [], warn: [], sizes: new Set() };
  C.renderGroup(ctx, rec, [{ areas: [area], draw: (s) => drawn.push(s) }]);
  assert.ok(area.spacing && area.spacing.paraAfter > 3);
  assert.ok(drawn[0] > 12, "空きが多いので最大サイズより大きくする");
});

test("収まり: 幅が狭いほど行数が増え、1〜2文字の最終行を検出する", () => {
  const paras = toParagraphs(["あいうえおかきくけこさしすせそ"]);
  const wide = measure(paras, 3, 12), narrow = measure(paras, 1, 12);
  assert.ok(narrow.lines > wide.lines);
  // 12pt で 13 文字分の幅 → 15 文字は 2 文字だけ次の行に出る
  const m = measure(paras, (13 * 12) / 72 + 0.01, 12);
  assert.strictEqual(m.orphans.length, 1);
});
