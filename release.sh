#!/bin/bash

# agy-hud Official Release Script
set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
echo "📦 Preparing release v$VERSION..."

# 1. Run tests first
npm test

# 2. Create standardized flattened .zip package
echo "🗜️  Creating flattened .zip package..."
rm -rf release_tmp
mkdir -p release_tmp
# Copy only whitelisted files (now from root and extensions)
cp parser.js renderer.js config.js git.js plugin.json mcp_config.json agy-hud.config.json package.json README.md gemini-extension.json release_tmp/
cp -r extensions release_tmp/
cp -r hooks release_tmp/
cp -r skills release_tmp/

cd release_tmp
rm -f ../agy-hud.zip
zip -r ../agy-hud.zip .
cd ..
rm -rf release_tmp

# 3. Create GitHub Release
echo "🚀 Uploading to GitHub..."
gh release delete "v$VERSION" --yes || true
git tag -d "v$VERSION" || true
git push origin :refs/tags/v$VERSION || true

gh release create "v$VERSION" agy-hud.zip --title "Release v$VERSION" --notes "Official agy-hud plugin release in flattened .zip format."

echo "✅ Release v$VERSION is now live!"
echo "🔗 Permanent 'Latest' Install URL:"
echo "agy plugin install https://github.com/icebear0828/agy-hud/releases/latest/download/agy-hud.tgz"

echo "✅ Release v$VERSION is now live!"
echo "🔗 Install using:"
echo "agy plugin install https://github.com/icebear0828/agy-hud/releases/download/v$VERSION/agy-hud.zip"
