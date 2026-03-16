#!/bin/bash
set -e

EXT_UUID="battery-wattage@x1e-pd-fix"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "=== Battery Wattage GNOME Extension Installer ==="
echo ""

mkdir -p "$EXT_DIR"
cp extension.js metadata.json "$EXT_DIR/"

echo "Installed to $EXT_DIR"
echo ""
echo "You must log out and back in for GNOME to discover the extension."
echo "Then enable it with:"
echo ""
echo "  gnome-extensions enable $EXT_UUID"
echo ""
echo "Or enable it from GNOME Extensions app."
