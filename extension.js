import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const BAT_PATH = '/sys/class/power_supply/qcom-battmgr-bat';
const UCSI_PATHS = [
    '/sys/class/power_supply/ucsi-source-psy-pmic_glink.ucsi.01',
    '/sys/class/power_supply/ucsi-source-psy-pmic_glink.ucsi.02',
];
const THERMAL_BASE = '/sys/class/thermal';
const UPDATE_INTERVAL = 5; // seconds

/*
 * Temperature thresholds (°C)
 *
 * CPU:  Snapdragon X Elite throttles around 95°C
 *   Cool:  < 70    (idle / light load)
 *   Warm:  70-85   (sustained load, normal)
 *   Hot:   85-95   (heavy load, approaching throttle)
 *   Crit:  > 95    (throttling)
 *
 * Battery: Li-ion safe charging range
 *   Cool:  < 30    (normal)
 *   Warm:  30-38   (fast charging, normal)
 *   Hot:   38-45   (charging may throttle)
 *   Crit:  > 45    (charging should stop)
 */
function cpuTempIcon(temp) {
    if (temp >= 95) return '\uD83D\uDD25'; // 🔥 throttling
    if (temp >= 85) return '\uD83D\uDFE0'; // 🟠 hot
    if (temp >= 70) return '\uD83D\uDFE1'; // 🟡 warm
    return '\uD83D\uDFE2';                  // 🟢 cool
}

function battTempIcon(temp) {
    if (temp >= 45) return '\uD83D\uDD25'; // 🔥 danger
    if (temp >= 38) return '\uD83D\uDFE0'; // 🟠 hot
    if (temp >= 30) return '\uD83D\uDFE1'; // 🟡 warm
    return '\uD83D\uDFE2';                  // 🟢 cool
}

function readSysfs(path) {
    try {
        const [ok, contents] = GLib.file_get_contents(path);
        if (ok) {
            const decoder = new TextDecoder();
            return decoder.decode(contents).trim();
        }
    } catch (e) {
        // ignore
    }
    return null;
}

function getAvgCpuTemp() {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < 50; i++) {
        const zoneType = readSysfs(`${THERMAL_BASE}/thermal_zone${i}/type`);
        if (!zoneType)
            continue;
        if (/^cpu\d+-\d+-top-thermal$/.test(zoneType)) {
            const temp = readSysfs(`${THERMAL_BASE}/thermal_zone${i}/temp`);
            if (temp) {
                sum += parseInt(temp, 10);
                count++;
            }
        }
    }
    return count > 0 ? Math.round(sum / count / 1000) : null;
}

function getBattTemp() {
    const temp = readSysfs(`${BAT_PATH}/temp`);
    if (temp)
        return Math.round(parseInt(temp, 10) / 10);
    return null;
}

const BatteryWattageIndicator = GObject.registerClass(
class BatteryWattageIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Battery Wattage');

        this._label = new St.Label({
            text: '',
            y_align: 2, // CENTER
            style_class: 'panel-button',
        });
        this.add_child(this._label);

        this._update();
        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL, () => {
                this._update();
                return GLib.SOURCE_CONTINUE;
            });
    }

    _update() {
        const powerStr = readSysfs(`${BAT_PATH}/power_now`);
        const statusStr = readSysfs(`${BAT_PATH}/status`);
        const battPowerUw = powerStr ? parseInt(powerStr, 10) : 0;
        const battWatts = (battPowerUw / 1000000).toFixed(1);

        // Read UCSI current from whichever port is active (highest value wins)
        let ucsiCurrentUa = 0;
        for (const ucsiPath of UCSI_PATHS) {
            const val = readSysfs(`${ucsiPath}/current_now`);
            if (val) {
                const parsed = parseInt(val, 10);
                if (parsed > ucsiCurrentUa)
                    ucsiCurrentUa = parsed;
            }
        }
        const totalInputW = ucsiCurrentUa > 0
            ? (ucsiCurrentUa / 1000000 * 20).toFixed(0)
            : null;

        // Temps with color-coded icons
        const cpuTemp = getAvgCpuTemp();
        const battTemp = getBattTemp();
        const tempParts = [];
        if (cpuTemp !== null)
            tempParts.push(`${cpuTempIcon(cpuTemp)}\uD83D\uDCBB${cpuTemp}\u00B0`);
        if (battTemp !== null)
            tempParts.push(`${battTempIcon(battTemp)}\uD83D\uDD0B${battTemp}\u00B0`);
        const tempStr = tempParts.join(' ');

        // Power
        let powerText = '';
        if (statusStr === 'Charging') {
            if (totalInputW && parseInt(totalInputW) > 0)
                powerText = `\uD83D\uDD0B${battWatts}W \u26A1${totalInputW}W`;
            else
                powerText = `\uD83D\uDD0B${battWatts}W`;
        } else if (statusStr === 'Discharging') {
            powerText = `\uD83D\uDD0B-${battWatts}W`;
        } else {
            powerText = `\uD83D\uDD0B`;
        }

        const parts = [powerText, tempStr].filter(Boolean);
        this._label.set_text(parts.join(' \u2502 '));
    }

    destroy() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
        super.destroy();
    }
});

export default class BatteryWattageExtension extends Extension {
    enable() {
        this._indicator = new BatteryWattageIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
