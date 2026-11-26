#!/bin/bash
# 指定したパターンの実例を、全パターン見本（examples/catalog.json）から1枚だけ取り出して表示する。
#   使い方: example.sh <pattern>      例: example.sh logic_tree
#   引数なしでパターン名の一覧を表示
set -euo pipefail
KIT="${PPTX_KIT_DIR:-$HOME/claude_pptx_making}"
node -e '
const fs = require("fs");
const spec = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const want = process.argv[2];
if (!want) { console.log([...new Set(spec.slides.map((s) => s.pattern))].join("\n")); process.exit(0); }
const s = spec.slides.find((x) => x.pattern === want);
if (!s) { console.error(`パターン "${want}" の実例はありません。引数なしで一覧を表示できます`); process.exit(1); }
console.log(JSON.stringify(s, null, 2));
' "$KIT/examples/catalog.json" "${1:-}"
