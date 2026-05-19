#!/bin/bash

# agy-hud Official Release Script
set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
echo "📦 Preparing release v$VERSION..."

# 1. Run tests first
npm test

# 2. Create flattened archives
echo "🗜️  Creating flattened archives..."
rm -rf release_tmp
mkdir -p release_tmp
cp -r src hooks skills plugin.json agy-hud.config.json package.json README.md release_tmp/

cd release_tmp
zip -r ../agy-hud.zip . *
tar -czvf ../agy-hud.tar.gz . *
cd ..
rm -rf release_tmp

# 3. Create GitHub Release
echo "🚀 Uploading to GitHub..."
gh release create "v$VERSION" agy-hud.zip agy-hud.tar.gz --title "Release v$VERSION" --notes "Official agy-hud plugin release with multiple formats."

echo "✅ Release v$VERSION is now live!"
echo "🔗 Install using:"
echo "agy plugin install https://github.com/icebear0828/agy-hud/releases/download/v$VERSION/agy-hud.zip"
