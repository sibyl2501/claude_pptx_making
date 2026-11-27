# CLAUDE.md — このキットで資料を作るときの手順

## 資料を作る手順

1. **目的と読み手を確認する。** 読む資料か発表か（`density`）、印刷か画面か（`size`）、どのテーマか。指定がなければ A4 横・dense・用途に合うテーマ（学習＝forest、報告＝navy、技術＝graphite、経営＝burgundy）。
2. **ストーリーを先に組む。** 1枚1メッセージ。結論を先に（表紙 → 目次 → 要約 → 章ごとの根拠 → 計画 → 次の行動）。見出し（`title`）は結論を示す体言止めにし（「〜だ」「〜である」で終えない）、1行に収める（A4 で全角30字程度まで）。数式は TeX 記法で `$…$`／`$$…$$` に書く（README「数式」）。
3. **パターンを選ぶ。** `node src/build.js --catalog`、実例は `examples/catalog.json`。同じパターンを続けすぎない。迷ったら：
   - 結論と根拠 → `exec_summary`／同格の要素 → `pillars`・`card_grid`／案の比較 → `comparison`
   - 位置づけ → `matrix_2x2`／原因の分解 → `logic_tree`／流れ → `process`／変化 → `before_after`
   - 数値 → `chart_insight`・`two_charts`・`kpi_dashboard`・`waterfall`・`data_table`
   - 計画 → `roadmap`・`issues_actions`・`next_steps`
   - 学習 → `concept_map`・`chart_cards`・`derivation`・`cheat_sheet`・`exercises`・`references`
4. **JSON を書く。** 項目は `schema/deck.schema.json` に従う（未知の項目名はエラーになる）。数値・事実は元資料に基づき、出典を `source` に書く。架空の値を使うときは出典欄に明記する。
5. **検査する。** `node src/build.js --check deck.json`。
   - 「入力エラー」→ 示された項目を直す
   - 「収まりません」→ 文を短くする、箇条を減らす、ページを分ける
   - 「空きが多め」「中身が少ない枠」→ 根拠・数値・具体例を足す、カードの少ない grid にする
   - 「最終行が1〜2文字」→ 言い回しを少し変える（語尾を削る・言い換える）
6. **生成して目で確認する。** `node src/build.js deck.json out.pptx` → `qa/render.sh out.pptx render/` → 全ページの PNG を見る。はみ出し、重なり、空きすぎ、図の点と文字の重なり（`matrix_2x2` の `items`）を直す。

## コードを変えるとき

- 座標・文字サイズ・字幅は `src/config.js`、色は `src/themes.js` に集約する。パターンの中に数値を直書きしない（間隔は `GAP`）。
- 新しいパターンは `src/patterns/` にファイルを作り、`src/patterns/index.js` の一覧、`src/schema.js` の `P`、`examples/catalog.json`、README の表に加える。
- 変更後は `npm test`（全見本を全設定で生成して検査）を通し、`npm run examples` と `qa/render.sh` で目で確認してから、`docs/images/` の一覧画像と `dist/` を更新する。
- 文字の調整は部品側で自動で行う。見出し・小見出し・表の見出し行と1列目・結論帯は `textfit.breakHeading` で読みやすい位置（かっこ書きが長ければかっこの前）で改行し、本文は空きが多い枠ほど文字を大きくして段落の間と行間を広げる（`components.renderGroup`）。丸数字は円と数字を1つの図形にする。
- 書き出し後に `src/slide-xml.js` が文字の言語を ja-JP にし（日本語の禁則処理を効かせる）、本文の数式の目印を OMML に置き換える。数式の解釈は `src/math.js`。
- 図形の大きさが負になると PowerPoint が「修復」を求める。`build.js` が検出して止めるので、出たら該当の枠の高さ計算を直す。
- 書き出した pptx は、動く環境なら Office の検査（pptx スキルの `validate.py`、Python 3.10 以上と lxml が必要）も通す。
