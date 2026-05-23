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

# 1. Run tests
npm test

# 2. Create standardized flattened .zip package
echo "🗜️  Creating flattened .zip package..."
rm -rf release_tmp
mkdir -p release_tmp
# Copy only whitelisted files.
# plugin.json + skills/ are the only things agy actually stages from the zip;
# runtime/ + scripts/ are downloaded fresh by bootstrap on each install,
# so they are bundled in the zip only as a fallback source.
cp plugin.json gemini-extension.json package.json README.md README_zh.md release_tmp/
[ -d runtime ] && cp -r runtime release_tmp/ || true
[ -d scripts ] && cp -r scripts release_tmp/ || true
[ -d skills ] && cp -r skills release_tmp/ || true

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
