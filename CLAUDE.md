# CLAUDE.md — このキットで資料を作るときの手順

## 資料を作る手順

1. **目的と読み手を確認する。** 読む資料か発表か（`density`）、印刷か画面か（`size`）、どのテーマか。指定がなければ A4 横・dense・用途に合うテーマ（学習＝forest、報告＝navy、技術＝graphite、経営＝burgundy）。
2. **ストーリーを先に組む。** 1枚1メッセージ。結論を先に（表紙 → 要約 → 章ごとの根拠 → 計画）。見出し（`title`）は「〜する」「〜だった」と結論を言い切り、1行に収める。
3. **パターンを選ぶ。** `node src/build.js --catalog`。同じパターンを続けすぎない。迷ったら：
   - 並列の論点 → `card_grid`／案の比較 → `comparison`／数値の推移 → `chart_insight`・`kpi_dashboard`
   - 計画 → `roadmap`／概念の整理 → `concept_map`／式・図・表を組み合わせる解説 → `derivation`
4. **JSON を書く。** 書き方は README と `examples/` を真似る。数値・事実は元資料に基づき、出典を `source` に書く。架空の値を使うときは出典欄に明記する。
5. **検査する。** `node src/build.js --check deck.json`。
   - 「収まりません」→ 文を短くする、箇条を減らす、ページを分ける
   - 「空きが多め」「中身が少ない枠」→ 根拠・数値・具体例を足す、カードの少ない grid にする
6. **生成して目で確認する。** `node src/build.js deck.json out.pptx` → `qa/render.sh out.pptx render/` → 全ページの PNG を見る。はみ出し、1〜2文字だけの最終行、重なり、空きすぎを直す。

## コードを変えるとき

- 座標・文字サイズ・字幅は `src/config.js`、色は `src/themes.js` に集約する。パターンの中に数値を直書きしない（間隔は `GAP`）。
- 新しいパターンは `src/patterns.js` の `PATTERNS` に `id / label / use / required / render` を登録し、`examples/` に見本を追加して README の表を更新する。
- 変更後は両方の見本を生成し直し、`qa/render.sh` で確認してから `docs/images/` の一覧画像と `dist/` を更新する。
- 書き出した pptx は Office の検査（pptx スキルの `validate.py`）を通す。
