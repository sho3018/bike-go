#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js が見つかりません。先に Node.js をインストールしてください。"
  echo "手順は「README.txt」を見てください。"
  exit 1
fi
if [ -f serviceAccountKey.json ] && [ ! -d node_modules/firebase-admin ]; then
  echo "First time setup: installing Firebase library. Please wait..."
  npm install --no-audit --no-fund || { echo "npm install failed. Check your internet connection and try again."; exit 1; }
fi
echo "バイクGO! サーバーを起動します。この画面は閉じないでください。"
node server.js
