import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const BAT_PATH = '/sys/class/power_supply/qcom-battmgr-bat';
const UCSI_PATH = '/sys/class/power_supply/ucsi-source-psy-pmic_glink.ucsi.01';
const UPDATE_INTERVAL = 5; // seconds

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
        const capacityStr = readSysfs(`${BAT_PATH}/capacity`);
        const powerStr = readSysfs(`${BAT_PATH}/power_now`);
        const statusStr = readSysfs(`${BAT_PATH}/status`);
        const ucsiCurrentStr = readSysfs(`${UCSI_PATH}/current_now`);

        if (!capacityStr || !powerStr) {
            this._label.set_text('--% --W');
            return;
        }

        const percent = parseInt(capacityStr, 10);
        const battPowerUw = parseInt(powerStr, 10);
        const battWatts = (battPowerUw / 1000000).toFixed(1);

        // Estimate total input power from UCSI current (assumes 20V PD)
        const ucsiCurrentUa = ucsiCurrentStr ? parseInt(ucsiCurrentStr, 10) : 0;
        const totalInputW = ucsiCurrentUa > 0
            ? (ucsiCurrentUa / 1000000 * 20).toFixed(0)
            : null;

        let text = '';
        if (statusStr === 'Charging') {
            if (totalInputW && parseInt(totalInputW) > 0)
                text = `\uD83D\uDD0B${battWatts}W \u26A1${totalInputW}W`;
            else
                text = `\uD83D\uDD0B${battWatts}W`;
        } else if (statusStr === 'Discharging') {
            text = `\uD83D\uDD0B-${battWatts}W`;
        } else {
            text = `\uD83D\uDD0B`;
        }

        this._label.set_text(text);
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
