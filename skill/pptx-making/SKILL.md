---
name: pptx-making
description: 日本語の資料・スライド・プレゼン・報告書・提案書・勉強用資料を PowerPoint（.pptx）で新しく作るときは、必ずこのスキルを使う。JSON にページの中身を書くだけで、密度が高く PowerPoint で編集できる pptx を生成する自作キット（claude_pptx_making、25パターン・自動検査つき）で作る。「資料を作って」「スライドにまとめて」「pptx で」「パワポで」「プレゼン資料」「勉強資料」「報告書をスライドに」など、ファイル形式を明言していなくてもスライド資料を新しく作る依頼なら使う。汎用の pptx スキルでゼロから組むより速く品質が安定するので、新規作成ではこちらを優先する（既存の pptx の編集・読み取り・テンプレートへの流し込みは汎用の pptx スキルを使う）。
---

# pptx-making：キットでスライド資料を作る

JSON（1ページ＝1オブジェクト）を書き、キットで pptx を生成する。レイアウト・色・文字サイズ・はみ出し検査はキットが受け持つので、**中身（ストーリーと文章）に集中する**のがこのスキルの要点。座標や pptxgenjs のコードは書かない。

## 0. 準備（会話で最初の1回）

```bash
bash "<このスキルのフォルダ>/scripts/setup.sh"
```

キットの場所（`KIT`、既定は `~/claude_pptx_making`）を表示する。無ければ取得し、あれば GitHub の最新に更新し（手元に変更があれば更新しない）、依存（Node と描画確認用の Python）が無ければ入れる。キットを更新したくないときは `--no-update` を付ける。以降のコマンドの `$KIT` はこの場所。

キットのソース（`src/`）を読む必要は基本的にない。項目は次の `example.sh` と下の「調整に使う項目」で足りる。

## 1. 目的と読み手を決める

聞かれていなければ次の既定で進め、最後に「この前提で作った」と一言添える。

| 項目 | 既定 | 変える目安 |
|---|---|---|
| `size` | `a4`（A4 横） | 画面で投影するだけなら `16:9` |
| `density` | `dense`（読む資料、本文 9.5〜14pt） | 口頭で話す発表なら `present`（1枚の情報量を半分に） |
| `theme` | 内容で選ぶ | 学習・解説＝`forest`、報告・提案＝`navy`、技術＝`graphite`、経営向け＝`burgundy` |
| `font` | `hiragino` | Windows で開く資料なら `yu-gothic` |

ユーザーは「枚数は最小限、1枚に多く詰める」資料を好む傾向がある。迷ったら枚数を減らし、1枚の中身を厚くする。

## 2. ストーリーを先に組む（JSON を書く前に）

- **1枚1メッセージ。** 各ページの `title` は結論を示す**体言止め**の1行（例：「怖いのは局所解ではなく、高次元に無数にある鞍点」「年間1.9億円の改善見込み」）。「〜だ」「〜である」「〜です」で終えない（検査で警告が出る）。A4 で全角30字程度まで（1行に収まらないと警告が出る）。
- 典型の順序：表紙 → 目次 → 要約 → 章ごとの根拠 → 計画 → 次の行動 → 付録。短い資料は目次・章扉を省く。
- 元資料の数値・事実だけを使い、出典を `source` に書く。架空の値で見本を作るときは出典欄に「架空」と明記する。

## 3. パターンを選ぶ

| 伝えたいこと | pattern |
|---|---|
| 表紙・目次・章扉 | `cover` `agenda` `section` |
| 結論と根拠と次の行動を1枚で | `exec_summary` |
| 同格の要素を並べる | `pillars`（屋根・柱・土台）、`card_grid`（2×2〜3×3、右にパネルも可） |
| 案の比較 | `comparison`（◎○△× を自動で色分け、推奨列を強調） |
| 2軸で位置づける | `matrix_2x2` |
| 原因・課題を分解する | `logic_tree` |
| 手順・流れ | `process`（3〜6段の矢羽根） |
| 変化（現状 → あるべき姿） | `before_after` |
| グラフで示す | `chart_insight`（1つ）、`two_charts`（比較）、`kpi_dashboard`（KPI＋推移）、`waterfall`（増減の分解） |
| 詳細な表 | `data_table`（入りきらなければ自動で改ページ） |
| 計画・課題・決めてほしいこと | `roadmap` `issues_actions` `next_steps` |
| 学習・解説 | `concept_map`（対応表）、`chart_cards`、`derivation`（式・図・表を自由に組む）、`cheat_sheet`（早見表）、`exercises`（演習、解答はノートへ自動） |
| 用語集・参考文献 | `references` |

同じパターンを3枚以上続けない。使うパターンごとに、**使える項目の一覧と実例1枚**を表示して真似る（見本全体やソースを読むより速い）：

```bash
bash "<このスキルのフォルダ>/scripts/example.sh" logic_tree
```

未知の項目名はエラーになるので、推測で項目を作らない（正確な定義は `$KIT/schema/deck.schema.json`）。

### 調整に使う項目（はみ出し・空きを直すときに効く）

| 項目 | パターン | 効き方 |
|---|---|---|
| `chartWidth`（0〜1） | `chart_insight` `waterfall` `kpi_dashboard` `chart_cards` | グラフの幅の割合。考察カードがあふれるなら小さく（例 0.55） |
| `widths`（比率の配列） | 表を持つパターン、`comparison` | 列幅の比。長い列を広げる |
| `grid`（"3x2" など） | `card_grid` `chart_cards` `cheat_sheet` | 列×行。カードが窮屈なら列を減らす |
| `panel.width`（インチ） | `card_grid` | 右パネルの幅 |
| `flowHeight` `kpiHeight` `goalsHeight` `insightsHeight`（インチ） | `concept_map` `kpi_dashboard` `roadmap` `two_charts` | 下段・上段の帯の高さ |
| `rowsPerPage` | `data_table` | 1ページの行数を固定 |
| `numbered: false` | `card_grid` `pillars` `chart_cards` | カードの番号を消す |
| `emphasize` / `highlight` / `recommend` / `current` | 各パターン | 1か所をアクセント色で強調 |

### `derivation` のブロック（列 `columns[{width, blocks}]` に上から積む）

`card {title, body, stat}`／`panel {title, body}`（白地＋枠線）／`table {headers, rows, widths, align}`／`chart {chart}`／`kpi {label, value, unit, delta, good, note}`／`diagram {layers: [3,4,2], labels, edgeLabels}`（層の図）／`image {path, alt}`／`message {text}`（結論帯）。どれにも `height`（固定の高さ、インチ）と `grow`（グラフ・図・画像が余白を分け合う重み）を付けられる。文字のブロックは列の高さに合わせて伸びる。

## 4. JSON を書く

作業フォルダ（ユーザーのプロジェクト内）に `deck.json` を作る。

```json
{
  "$schema": "<KIT の絶対パス>/schema/deck.schema.json",
  "deck": { "title": "…", "theme": "navy", "size": "a4", "density": "dense" },
  "slides": [
    { "pattern": "exec_summary", "chapter": "要約", "title": "結論を言い切る1行", "lead": "補足の1行",
      "conclusion": "…", "reasons": [{ "title": "…", "stat": { "value": "62%", "label": "…" }, "body": ["- …", "- …"] }],
      "source": "出典：…" }
  ]
}
```

**文字のミニ記法**：`**太字**`、`==アクセント色==`、`[[数値の強調]]`、`$…$`（文中の数式）、`$$…$$`（段落全体を中央揃えの数式に）、行頭 `- `（箇条書き）／`  - `（2段目）。本文 `body` は文字列の配列で、1要素が1段落。

**数式は TeX 記法**で書く。PowerPoint の数式（編集可能）として書き出される。JSON ではバックスラッシュを重ねる：`"$\\frac{1}{n}\\sum_{i=1}^{n} x_{i}^{2}$"`、`"$$\\frac{\\partial \\ell}{\\partial W} = \\delta x^{\\top}$$"`。関数名は `\\log` `\\exp` `\\max` `\\operatorname{softmax}`、行列は `\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}`。使える記法の一覧は README の「数式」。解釈できない数式は検査で警告される。

**グラフ**：`{ "type": "bar|hbar|stacked|line|area|pie|doughnut", "title": "…", "categories": [...], "series": [{ "name": "…", "values": [...] }], "highlight": 2, "min": 0, "max": 100, "format": "0.0" }`。滝グラフは `{ "type": "waterfall", "start": {label, value}, "steps": [{label, value}], "endLabel": "…", "invert": true }`（費用・損失のように増えると悪いものは `invert`）。

## 5. 検査して直す（警告がなくなるまで）

```bash
node "$KIT/src/build.js" --check deck.json
```

| 表示 | 直し方 |
|---|---|
| 入力エラー | 示されたスライド・項目を直す（書き間違い・必須項目の不足・個数） |
| 収まりません | 文を短くする、箇条を減らす、ページを分ける |
| 空きが多め／中身が少ない枠 | 根拠・数値・具体例を足す。足す材料がなければカードの少ない grid や別パターンにする |
| 体言止めにしてください | 見出しの「〜だ」「〜である」を除き、名詞で終える（「〜は鞍点だ」→「〜は鞍点」、「〜を防ぐ」は可） |
| 数式を解釈できません | 示された命令を直す（未対応の命令、`{}` の対応、`\\` の重ね忘れ） |
| 最終行が1〜2文字 | 語尾を削る・言い換える（「〜を確認する」→「〜を確認」） |
| 見出しが1行に収まりません | 見出しを短くし、補足はリード文 `lead` へ |

## 6. 生成して目で確かめる

```bash
node "$KIT/src/build.js" deck.json deck.pptx
PYTHON="$KIT/.venv/bin/python" "$KIT/qa/render.sh" deck.pptx render/
```

`render/deck-sheet.png`（一覧）をまず見て、気になるページだけ `render/deck-NN.png` を開く。**検査で警告がなくても必ず画像で見る**（検査は見積もりで、狭い枠の折り返しや表のセル内の改行までは完全には当たらない）。見る点：はみ出し・文字の重なり・1〜2文字だけの行・数値の途中での改行・空きすぎ・`matrix_2x2` の点と文字の重なり・グラフの読みやすさ。直したら 5 からやり直す。

- 描画確認は Mac の PowerPoint を AppleScript で使う（LibreOffice があればそちら）。作業用のコピーは PowerPoint が読める `~/Library/Caches/claude_pptx_making` で行うので、出力先 `render/` はどこでもよい。
- PDF ができないときは、表示される確認事項に従う（PowerPoint の「修復しますか」の画面や開始画面を閉じて再実行するなど）。`build.js` は壊れた図形を検出して止めるので、修復の画面は通常は出ない。
- 汎用 pptx スキルの `validate.py` は Python 3.10 以上と lxml が必要。動かない環境では省略してよい（キット側で壊れた図形と入力の検査をしている）。

## 7. 渡す

pptx の場所、枚数、前提にした設定（用紙・密度・テーマ）、残った警告があればその内容を短く伝える。`deck.json` も残しておくと、後で文章や数値だけ直して作り直せる、と添える。

## よくあるつまずき

- **発表向け（present）に読む資料の量を入れる** → はみ出し警告が大量に出る。present では1枚の箇条を半分にする。
- **`matrix_2x2` の `items`** は座標どおりに置かれる。象限の文字は各象限の上半分に入るので、点は下半分（上段の象限は y=0.5〜0.75、下段は y=0〜0.25）に置く。
- **`data_table`** は行が多いと自動で複数ページになる。見出し行は各ページに繰り返される。
- **キット自体の不具合**を見つけたら、資料作成とは別に `$KIT` で直し、`npm test` を通してからユーザーに報告する（勝手に push しない）。
