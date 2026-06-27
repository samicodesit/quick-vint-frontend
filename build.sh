#!/bin/bash

# AutoLister AI - Build Script for Chrome Extension Release
# Usage: ./build.sh [version]
# Example: ./build.sh 1.2.3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION=${1:-""}

# Files and folders to include in the ZIP
INCLUDE_LIST=(
    "manifest.json"
    "language-defaults.js"
    "content.js"
    "background.js"
    "popup.html"
    "popup.js"
    "callback.html"
    "callback.js"
    "preview.html"
    "lib/"
    "icons/"
    "images/onboard.png"
    "_locales/"
)

# Files to exclude (even if they match patterns above)
EXCLUDE_LIST=(
    "*.md"
    "*.zip"
    ".*"
    "node_modules"
    "store-descriptions"
)

echo -e "${GREEN}🏗️  AutoLister AI - Release Builder${NC}"
echo "===================================="

# Validate manifest.json exists
if [ ! -f "$SCRIPT_DIR/manifest.json" ]; then
    echo -e "${RED}❌ Error: manifest.json not found${NC}"
    exit 1
fi

# Get current version from manifest
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$SCRIPT_DIR/manifest.json" | cut -d'"' -f4)
echo -e "📦 Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# If version provided, update manifest.json
if [ -n "$VERSION" ]; then
    if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}❌ Invalid version format. Use semantic versioning (e.g., 1.2.3)${NC}"
        exit 1
    fi

    node "$SCRIPT_DIR/scripts/release-version.js" check-version "$VERSION"

    echo -e "📝 Updating version to: ${YELLOW}$VERSION${NC}"
    sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$VERSION\"/" "$SCRIPT_DIR/manifest.json"
    rm -f "$SCRIPT_DIR/manifest.json.bak"
    CURRENT_VERSION=$VERSION
fi

node "$SCRIPT_DIR/scripts/release-version.js" check

# Create dist directory
DIST_DIR="$SCRIPT_DIR/dist"
mkdir -p "$DIST_DIR"

# Output filename
OUTPUT_FILE="$DIST_DIR/autolister-ai-v$CURRENT_VERSION.zip"

# Remove old zip if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "🗑️  Removing old package..."
    rm "$OUTPUT_FILE"
fi

# Build exclude arguments for zip
EXCLUDE_ARGS=""
for item in "${EXCLUDE_LIST[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS -x '$item'"
done

# Create temp directory for staging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy files to temp directory
echo "📂 Staging files..."
for item in "${INCLUDE_LIST[@]}"; do
    if [ -e "$SCRIPT_DIR/$item" ]; then
        cp -r "$SCRIPT_DIR/$item" "$TEMP_DIR/"
    else
        echo -e "${YELLOW}⚠️  Warning: $item not found, skipping${NC}"
    fi
done

# Create ZIP from temp directory
echo "🗜️  Creating package..."
cd "$TEMP_DIR"

# Use zip command if available, otherwise fallback to python
if command -v zip &> /dev/null; then
    zip -r "$OUTPUT_FILE" . -x "*.md" -x "*.zip" -x ".*" -x "*/.*" 2>/dev/null
else
    python3 -c "
import zipfile
import os

with zipfile.ZipFile('$OUTPUT_FILE', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if not file.startswith('.') and not file.endswith('.md'):
                filepath = os.path.join(root, file)
                zipf.write(filepath, filepath)
"
fi

# Verify output
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Package created successfully!${NC}"
    echo -e "📍 Location: ${YELLOW}$OUTPUT_FILE${NC}"
    echo -e "📊 Size: ${YELLOW}$FILE_SIZE${NC}"
    echo ""
    echo "📋 Package contents:"
    unzip -l "$OUTPUT_FILE" | tail -n +4 | head -n -2
    node "$SCRIPT_DIR/scripts/release-version.js" mark-pending "$CURRENT_VERSION"
else
    echo -e "${RED}❌ Failed to create package${NC}"
    exit 1
fi
