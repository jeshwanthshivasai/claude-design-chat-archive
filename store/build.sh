#!/usr/bin/env sh
# Builds the Chrome Web Store package: extension files only, no tests, docs or git metadata.
set -eu
cd "$(dirname "$0")/.."
version=$(node -p "require('./manifest.json').version")
out="store/design-chat-archive-$version.zip"
rm -f "$out"
zip -q -r "$out" manifest.json popup.html popup.js src icons LICENSE -x '*.DS_Store'
echo "built $out"
unzip -l "$out"
