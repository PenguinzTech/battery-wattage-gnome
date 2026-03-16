# Battery Wattage — GNOME Shell Extension

Shows real-time battery and charger wattage in the GNOME top panel. Designed for Qualcomm Snapdragon X Elite (X1E80100) laptops but works on any Linux laptop with standard power supply sysfs.

## What It Shows

| State | Display | Meaning |
|-------|---------|---------|
| Charging (PD) | `🔋38.5W ⚡86W` | 38.5W to battery, 86W total from charger |
| Charging (no UCSI) | `🔋38.5W` | Battery power only |
| Discharging | `🔋-12.3W` | 12.3W power draw from battery |
| Full/Idle | `🔋` | Plugged in, not charging |

- **🔋** = power going to/from the battery
- **⚡** = total power from the charger (estimated from UCSI current × 20V)

## Screenshots

```
┌──────────────────────────────────────────────────────┐
│  Activities    🔋38.5W ⚡86W     🔊  🌐  ⏻  3:42 PM │
└──────────────────────────────────────────────────────┘
```

## Installation

### Quick Install

```bash
git clone https://github.com/PenguinzTech/battery-wattage-gnome.git
cd battery-wattage-gnome
./install.sh
```

Then **log out and back in**, and enable:

```bash
gnome-extensions enable battery-wattage@x1e-pd-fix
```

### Manual Install

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/battery-wattage@x1e-pd-fix
cp extension.js metadata.json ~/.local/share/gnome-shell/extensions/battery-wattage@x1e-pd-fix/
# Log out and back in
gnome-extensions enable battery-wattage@x1e-pd-fix
```

### Uninstall

```bash
./uninstall.sh
# Log out and back in
```

## Configuration

Edit `extension.js` to customize:

| Constant | Default | Description |
|----------|---------|-------------|
| `BAT_PATH` | `/sys/class/power_supply/qcom-battmgr-bat` | Battery sysfs path. Change for non-Qualcomm laptops (e.g. `BAT0`). |
| `UCSI_PATH` | `/sys/class/power_supply/ucsi-source-psy-pmic_glink.ucsi.01` | UCSI charger sysfs path for total wattage calculation. |
| `UPDATE_INTERVAL` | `5` | Refresh interval in seconds. |

### For Non-Snapdragon Laptops

Change `BAT_PATH` to your battery's sysfs path:

```bash
# Find your battery path
ls /sys/class/power_supply/ | grep -i bat
# Usually: BAT0, BAT1, or similar
```

Then edit `extension.js`:
```javascript
const BAT_PATH = '/sys/class/power_supply/BAT0';
```

## Requirements

- GNOME Shell 49+ (Ubuntu 25.10)
- Standard Linux power supply sysfs (`/sys/class/power_supply/`)

## How It Works

Reads `/sys/class/power_supply/*/power_now` directly from sysfs every 5 seconds. For the total charger wattage, it reads the UCSI (USB Type-C System Interface) current draw and multiplies by 20V (standard USB PD voltage).

No dependencies, no polling daemons, no UPower — just direct sysfs reads from a lightweight GJS extension.

## Related

- [x1e-pd-fix](https://github.com/PenguinzTech/x1e-pd-fix) — Fix slow USB-C PD charging on Snapdragon X Elite laptops (12W → 61W)

## License

GPL-2.0-only
