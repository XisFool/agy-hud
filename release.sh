#!/bin/bash

# agy-hud Official Release Script
set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
echo "📦 Preparing release v$VERSION..."

# 1. Run tests first
npm test

# 2. Create standardized npm package (.tgz)
echo "🗜️  Creating standardized .tgz package..."
npm pack
# Rename the generated tarball to a predictable name for the 'latest' link
mv agy-hud-$VERSION.tgz agy-hud.tgz

# 3. Create GitHub Release
echo "🚀 Uploading to GitHub..."
# Delete existing 'latest' release if needed, or just use versioned releases
# GitHub's 'latest' link always points to the most recent tagged release
gh release create "v$VERSION" agy-hud.tgz --title "Release v$VERSION" --notes "Official agy-hud plugin release in standard .tgz format."

echo "✅ Release v$VERSION is now live!"
echo "🔗 Permanent 'Latest' Install URL:"
echo "agy plugin install https://github.com/icebear0828/agy-hud/releases/latest/download/agy-hud.tgz"

echo "✅ Release v$VERSION is now live!"
echo "🔗 Install using:"
echo "agy plugin install https://github.com/icebear0828/agy-hud/releases/download/v$VERSION/agy-hud.zip"
