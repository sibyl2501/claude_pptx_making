#!/bin/bash
# 使い方: qa/render.sh deck.pptx [出力フォルダ]
# PPTX を PDF に変換し、ページごとの PNG と一覧画像を作る。
# LibreOffice があればそれを使い、なければ Mac の PowerPoint を AppleScript で使う。
set -euo pipefail
SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="${2:-$(dirname "$SRC")/render}"
mkdir -p "$OUT"
NAME="$(basename "$SRC" .pptx)"
WORK="$OUT/.work-$$"; mkdir -p "$WORK"
cp "$SRC" "$WORK/$NAME.pptx"
if command -v soffice >/dev/null 2>&1; then
  soffice --headless --convert-to pdf --outdir "$WORK" "$WORK/$NAME.pptx" >/dev/null
elif [ -d "/Applications/Microsoft PowerPoint.app" ]; then
  osascript <<OSA
with timeout of 280 seconds
tell application "Microsoft PowerPoint"
  open POSIX file "$WORK/$NAME.pptx"
  delay 4
  set p to presentation "$NAME.pptx"
  save p in POSIX file "$WORK/$NAME.pdf" as save as PDF
  close p saving no
end tell
end timeout
OSA
else
  echo "LibreOffice も PowerPoint も見つかりません" >&2; exit 1
fi
cp "$WORK/$NAME.pdf" "$OUT/$NAME.pdf"
PY="${PYTHON:-python3}"
"$PY" "$(dirname "$0")/contact_sheet.py" "$OUT/$NAME.pdf" "$OUT"
rm -rf "$WORK"
