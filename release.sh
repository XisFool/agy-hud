#!/bin/bash

# agy-hud Official Release Script
set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
REPO_URL=$(node -e "
  const r = require('./package.json').repository;
  if (!r || !r.url) { console.error('package.json missing repository.url'); process.exit(1); }
  console.log(r.url.replace(/^git\+/, '').replace(/\.git\$/, ''));
")
echo "📦 Preparing release v$VERSION..."

# 1. Rebuild the inline bootstrap hook so hooks.json mirrors inline-bootstrap.js
node hooks/build-hook.js

# 2. Run tests
npm test

# 2. Create standardized flattened .zip package
echo "🗜️  Creating flattened .zip package..."
rm -rf release_tmp
mkdir -p release_tmp
# Copy only whitelisted files (now from root and extensions)
cp plugin.json package.json README.md gemini-extension.json release_tmp/
[ -d extensions ] && cp -r extensions release_tmp/ || true
[ -d skills ] && cp -r skills release_tmp/ || true
[ -d hooks ] && cp -r hooks release_tmp/ || true

cd release_tmp
rm -f ../agy-hud.zip
zip -r ../agy-hud.zip .
cd ..
rm -rf release_tmp

# 3. Create GitHub Release
if [ "$1" == "--local" ] || [ "$SKIP_GH_RELEASE" == "true" ]; then
  echo "⚠️  Skipping GitHub Release upload (local build only)."
  exit 0
fi

echo "🚀 Uploading to GitHub..."
gh release delete "v$VERSION" --yes || true
git tag -d "v$VERSION" || true
git push origin :refs/tags/v$VERSION || true

gh release create "v$VERSION" agy-hud.zip --title "Release v$VERSION" --notes "Official agy-hud plugin release in flattened .zip format."

echo "✅ Release v$VERSION is now live!"
echo "🔗 Permanent 'Latest' Install URL:"
echo "agy plugin install $REPO_URL/releases/latest/download/agy-hud.zip"
echo "🔗 Versioned Install URL:"
echo "agy plugin install $REPO_URL/releases/download/v$VERSION/agy-hud.zip"
