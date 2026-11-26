#!/bin/bash
# 指定したパターンの「使える項目の一覧」と「実例1枚」を表示する（全パターン見本 examples/catalog.json から）。
#   使い方: example.sh <pattern>      例: example.sh logic_tree
#   引数なしでパターン名の一覧を表示
set -euo pipefail
KIT="${PPTX_KIT_DIR:-$HOME/claude_pptx_making}"
cd "$KIT"
node -e '
const fs = require("fs");
const { PATTERN_PROPS } = require("./src/schema");
const spec = JSON.parse(fs.readFileSync("examples/catalog.json", "utf8"));
const want = process.argv[1];
if (!want) { console.log(Object.keys(PATTERN_PROPS).join("\n")); process.exit(0); }
if (!PATTERN_PROPS[want]) { console.error(`パターン "${want}" はありません。引数なしで一覧を表示できます`); process.exit(1); }
const [props, required] = PATTERN_PROPS[want];
const desc = (s) => s.const ? JSON.stringify(s.const) : s.enum ? s.enum.join("|") : s.oneOf ? s.oneOf.map(desc).join(" または ") : s.type === "array" ? `[${s.items ? desc(s.items) : ""}]` : s.type === "object" && s.properties ? `{${Object.keys(s.properties).join(", ")}}` : [].concat(s.type || "値").join("|");
console.log(`# ${want} の項目（* は必須）。共通: chapter, title, lead, source, notes, conclusion`);
for (const [k, s] of Object.entries(props)) console.log(`  ${required.includes(k) ? "*" : " "} ${k}: ${desc(s)}`);
const ex = spec.slides.find((x) => x.pattern === want);
console.log(`\n# 実例（examples/catalog.json）\n` + JSON.stringify(ex, null, 2));
' "${1:-}"
