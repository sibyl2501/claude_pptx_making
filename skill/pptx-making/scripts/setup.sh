#!/bin/bash
# キット（claude_pptx_making）を使える状態にする。何度実行してもよい。
#   - 無ければ GitHub から取得、あれば最新に更新（手元に変更があるとき、または --no-update のときは更新しない）
#   - Node の依存をインストール（無いときだけ）
#   - 描画確認用の Python 環境（pymupdf, Pillow）を $KIT/.venv に用意（無いときだけ）
# 場所は環境変数 PPTX_KIT_DIR で変えられる（既定: ~/claude_pptx_making）
set -euo pipefail
KIT="${PPTX_KIT_DIR:-$HOME/claude_pptx_making}"
REPO="https://github.com/sibyl2501/claude_pptx_making.git"
UPDATE=1
[ "${1:-}" = "--no-update" ] && UPDATE=0

if [ ! -d "$KIT/.git" ]; then
  git clone -q "$REPO" "$KIT"
  echo "取得しました: $KIT"
elif [ "$UPDATE" = 0 ]; then
  echo "更新せずに使います: $KIT"
elif [ -z "$(git -C "$KIT" status --porcelain)" ]; then
  git -C "$KIT" pull -q --ff-only 2>/dev/null && echo "最新にしました: $KIT" || echo "更新を確認できませんでした（手元の版を使います）: $KIT"
else
  echo "手元に変更があるため更新しません: $KIT"
fi

if [ ! -d "$KIT/node_modules/pptxgenjs" ] || [ ! -d "$KIT/node_modules/ajv" ]; then
  (cd "$KIT" && npm install --silent >/dev/null 2>&1) && echo "Node の依存をインストールしました"
fi

if [ ! -x "$KIT/.venv/bin/python" ]; then
  python3 -m venv "$KIT/.venv" && "$KIT/.venv/bin/pip" -q install pymupdf Pillow >/dev/null 2>&1 && echo "描画確認用の Python 環境を用意しました"
fi

echo "KIT=$KIT"
