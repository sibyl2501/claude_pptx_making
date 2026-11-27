#!/bin/bash
# 使い方: qa/render.sh deck.pptx [出力フォルダ]
# PPTX を PDF に変換し、ページごとの PNG と一覧画像（<名前>-sheet.png）を作る。
# LibreOffice があればそれを使い、なければ Mac の PowerPoint を AppleScript で使う。
#
# PowerPoint はサンドボックスのため、/tmp など読めない場所のファイルを開けないことがある。
# そのため作業用のコピーは PowerPoint が読み書きできる場所（既定: ~/Library/Caches/claude_pptx_making/work）で行う。
# 場所は環境変数 PPTX_RENDER_WORK で変えられる（その下の work フォルダを使う）。
#
# 作業フォルダは毎回同じ場所を使い回す。PowerPoint はフォルダごとにアクセスの許可を覚えるため、
# 毎回別のフォルダを作ると、そのたびに「ファイル アクセスを許可」の確認が出てしまう。
# 初回だけ確認が出たら「選択…」で claude_pptx_making フォルダを選んで許可すると、以後は出ない。
set -euo pipefail
SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="${2:-$(dirname "$SRC")/render}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
NAME="$(basename "$SRC" .pptx)"
BASE="${PPTX_RENDER_WORK:-$HOME/Library/Caches/claude_pptx_making}"
WORK="$BASE/work"
mkdir -p "$WORK"
# 前回の残りを消してから使う（フォルダ自体は残して、許可を引き継ぐ）
rm -f "$WORK/$NAME.pptx" "$WORK/$NAME.pdf"
trap 'rm -f "$WORK/$NAME.pptx" "$WORK/$NAME.pdf"' EXIT
cp "$SRC" "$WORK/$NAME.pptx"

if command -v soffice >/dev/null 2>&1; then
  soffice --headless --convert-to pdf --outdir "$WORK" "$WORK/$NAME.pptx" >/dev/null
elif [ -d "/Applications/Microsoft PowerPoint.app" ]; then
  # 同じ名前の資料が開いたままだと、新しいファイルではなく古いほうを PDF にしてしまう。
  # PDF に保存した後は presentation の参照が使えなくなることがあるため、閉じるときは名前で探して番号で閉じる。
  osascript <<OSA || true
on closeByName(nm)
  tell application "Microsoft PowerPoint"
    repeat with k from (count of presentations) to 1 by -1
      if name of presentation k is nm then close presentation k saving no
    end repeat
  end tell
end closeByName
with timeout of 280 seconds
closeByName("$NAME.pptx")
tell application "Microsoft PowerPoint"
  open POSIX file "$WORK/$NAME.pptx"
  delay 4
  save presentation "$NAME.pptx" in POSIX file "$WORK/$NAME.pdf" as save as PDF
end tell
closeByName("$NAME.pptx")
end timeout
OSA
else
  echo "LibreOffice も PowerPoint も見つかりません" >&2; exit 1
fi

if [ ! -f "$WORK/$NAME.pdf" ]; then
  cat >&2 <<MSG
PDF を作れませんでした。次を確認してください:
  - PowerPoint に「修復しますか」や開始画面（テンプレートの一覧）が出ていないか（出ていれば閉じて再実行）
  - 作業場所 $BASE を PowerPoint が読み書きできるか（PPTX_RENDER_WORK で変更可）
  - node src/build.js が警告なしで終わっているか（壊れた図形があると PowerPoint が開けない）
MSG
  exit 1
fi
cp "$WORK/$NAME.pdf" "$OUT/$NAME.pdf"
PY="${PYTHON:-python3}"
"$PY" "$(dirname "$0")/contact_sheet.py" "$OUT/$NAME.pdf" "$OUT"
