#!/usr/bin/env bash
set -euo pipefail

VINTED_NEW_ITEM_URL="${VINTED_NEW_ITEM_URL:-https://www.vinted.nl/items/new}"

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome "$VINTED_NEW_ITEM_URL" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium "$VINTED_NEW_ITEM_URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$VINTED_NEW_ITEM_URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$VINTED_NEW_ITEM_URL"
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "Start-Process '$VINTED_NEW_ITEM_URL'"
elif command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /C start "" "$VINTED_NEW_ITEM_URL"
else
  echo "No supported browser opener found. Open this URL manually: $VINTED_NEW_ITEM_URL" >&2
  exit 1
fi
