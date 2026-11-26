# claude_pptx_making

JSON で書いた仕様から、**密度が高く、PowerPoint でそのまま編集できる pptx** を生成するテンプレートキットです。
Claude に「〇〇の資料を pptx で作って」と頼むときに、毎回ゼロから組まずにこのキットを使うことを想定しています。

- 既定は **A4 横**・**ヒラギノ角ゴシック**・**読む資料向けの高密度**（本文 9.5〜12pt を自動調整）
- グラフは PowerPoint の**ネイティブグラフ**、表は**ネイティブ表**。数値も見た目も PowerPoint で直せます
- テーマの配色・フォントは pptx のテーマにも書き込まれます
- 生成時に、**文字のはみ出し**と**本文の空きすぎ（充填率）**をページごとに検査します

> 現在は Phase 1（土台＋代表 10 パターン）です。全体の設計は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

## 見本

| 学習・解説（Forest テーマ） | 報告・提案（Navy テーマ、架空の事例） |
|---|---|
| ![NN 資料の見本](docs/images/nn_math-sheet.png) | ![報告書の見本](docs/images/business_report-sheet.png) |
| [examples/nn_math.json](examples/nn_math.json) → [dist/nn_math.pptx](dist/nn_math.pptx) | [examples/business_report.json](examples/business_report.json) → [dist/business_report.pptx](dist/business_report.pptx) |

## 使い方

Node.js 18 以降が必要です。

```bash
npm install
node src/build.js examples/nn_math.json dist/nn_math.pptx
```

```bash
node src/build.js --check examples/nn_math.json     # 書き出さずに検査だけ
node src/build.js --catalog                          # パターンとテーマの一覧
node src/build.js deck.json out.pptx --theme navy --size 16:9 --density present --font yu-gothic
```

生成すると、ページごとに使った本文の文字サイズ・充填率・警告が表示されます。

```
 3  card_grid      本文11       pt  充填  72%  線形代数：1つの層は…
 5  derivation     本文12/11.5  pt  充填  82%  誤差逆伝播：2層ネットを…
      ⚠ 中身が少ない枠: 「なぜこうなる？」44%
```

見た目の確認（PDF と PNG、一覧画像）:

```bash
pip install pymupdf Pillow
qa/render.sh dist/nn_math.pptx render/
```

LibreOffice があればそれを、なければ Mac の PowerPoint を使って PDF にします。

## パターン（Phase 1）

| ID | `pattern` | 用途 | 主な項目 |
|---|---|---|---|
| A1 | `cover` | 表紙 | `title` `subtitle` `points[{title, body}]` `date` `org` |
| A3 | `section` | 章扉 | `number` `title` `lead` `points[{title, body}]` |
| A4 | `exec_summary` | 結論 → 根拠 → 次の行動 | `conclusion` `reasons[{title, body, stat}]` `actions[{title, body, owner, due}]` |
| B2 | `card_grid` | カードの格子（＋右にパネル） | `grid: "3x2"` `cards[{title, body}]` `panel{title, body}` `conclusion` |
| B3 | `comparison` | 案 × 評価軸の比較 | `options[]` `criteria[{name, values[]}]` `recommend` `conclusion` |
| C1 | `chart_insight` | グラフ＋考察 | `chart{...}` `insights[{title, body}]` `conclusion` |
| C3 | `kpi_dashboard` | KPI タイル＋推移 | `kpis[{label, value, unit, delta, good, note}]` `chart{...}` `panel` |
| D1 | `roadmap` | ガント＋到達点 | `periods[]` `tasks[{name, owner, start, end, label, highlight, milestone}]` `goals[]` |
| E1 | `concept_map` | 対応表＋流れ | `headers[]` `rows[[]]` `widths[]` `tagColors{}` `flow[{title, body}]` |
| E3 | `derivation` | 列にブロックを積む自由構成 | `columns[{width, blocks[{type: card / panel / table / chart / diagram / kpi / image / message}]}]` |

すべての通常ページに共通: `chapter`（章ラベル）、`title`（結論を言い切る見出し・1行）、`lead`（リード文・1行）、`source`（出典）、`notes`（スピーカーノート）。

### 文字の書き方（ミニ記法）

| 書き方 | 表示 |
|---|---|
| `**強調**` | 太字 |
| `==強調==` | アクセント色の太字 |
| `[[3.0℃]]` | 主色の太字（数値の強調） |
| `$W^{T}x + b_{i}$` | 数式フォント（Cambria）と上付き・下付き |
| 行頭 `- ` ／ `  - ` | 箇条書き ／ 2段目 |

本文（`body`）は文字列の配列で書き、1要素が1段落です。

### グラフ

```json
{ "type": "bar", "title": "…", "categories": ["A", "B"], "series": [{ "name": "件数", "values": [3, 5] }],
  "highlight": 1, "min": 0, "max": 10, "unit": "件", "format": "0.0" }
```

`type`: `bar` `hbar` `stacked` `hstacked` `line` `area` `pie` `doughnut`。系列が1つの棒グラフでは `highlight` の項目だけアクセント色になります。

## 構成

```
src/
  build.js       CLI（入力検査・生成・検査結果の表示）
  deck.js        用紙・テーマ・スライドレイアウト・見出し
  patterns.js    10 パターン
  components.js  カード・パネル・結論帯・表・グラフ・KPI・手順・ガント・層の図・画像
  blocks.js      列にブロックを積む配置（derivation で使用）
  markup.js      ミニ記法
  textfit.js     文字の収まりの見積もり（ヒラギノの実測値）
  themes.js      forest / navy / graphite / burgundy
  theme-xml.js   pptx のテーマに配色と和文フォントを書き込む
  config.js      用紙・文字サイズ・フォント・字幅
qa/              描画確認（render.sh, contact_sheet.py）
examples/        見本の入力 JSON
dist/            見本の pptx
docs/            設計書と見本画像
```

## Claude に頼むとき

このリポジトリの URL と、資料の目的・読み手・元の資料を渡して、次のように依頼します。

> claude_pptx_making の README と examples を読み、1枚1メッセージでストーリーを組んでから、各ページに合う pattern を選んで JSON を書いてください。`--check` の警告（はみ出し・空きすぎ）をなくしてから pptx を生成し、`qa/render.sh` で全ページを画像で確認してください。

Claude 向けの作業規約は [CLAUDE.md](CLAUDE.md) にあります。
