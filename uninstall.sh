#!/bin/bash
set -e

EXT_UUID="battery-wattage@x1e-pd-fix"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

gnome-extensions disable "$EXT_UUID" 2>/dev/null || true
rm -rf "$EXT_DIR"
echo "Uninstalled. Log out and back in to complete removal."
