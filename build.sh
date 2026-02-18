#!/bin/bash
# Build script: copy only runtime-essential files to dist/
set -e

rm -rf dist
mkdir -p dist

# Core files
cp index.html dist/

# CSS
cp -r css dist/

# JavaScript
cp -r js dist/

# Assets (only runtime-needed)
mkdir -p dist/assets/models
mkdir -p dist/assets/textures
mkdir -p dist/assets/audio/bgm
mkdir -p dist/assets/audio/sfx

cp assets/models/*.glb dist/assets/models/
cp assets/textures/*.png dist/assets/textures/
cp assets/audio/bgm/*.mp3 dist/assets/audio/bgm/ 2>/dev/null || true
cp assets/audio/sfx/*.mp3 dist/assets/audio/sfx/ 2>/dev/null || true

echo "Build complete. Contents:"
du -sh dist/

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=dragon-nest-lite
