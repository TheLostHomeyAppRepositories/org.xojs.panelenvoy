'use strict';

const Homey = require("homey");
const Enphase = require("enphaseenvoy");

const INTERVAL = 60 * 1000;

module.exports = class IQDriver extends Homey.Driver {

    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('IQDriver has been initialized');
        this.api = null;
        this.username = null;
        this.password = null;
    }

    async onPair(session) {
        let username;
        let password;
        let api;
        session.setHandler("login", async (data) => {
            try {
                const api = await Enphase(data.username, data.password);
                username = data.username;
                password = data.password;
                this.log("Auth success");
                return true;
            }
            catch (e) {
                this.log("Auth failed", e);
                return false;
            }
        });
        session.setHandler("list_devices", async () => {
            const res = this.getDiscoveryStrategy().getDiscoveryResults();
            const values = Object.values(res);
            const devices = [];
            for (let i = 0; i < values.length; i++) {
                const v = values[i];
                const api = await Enphase(username, password, v.address, v.id);
                const inverters = await api.getInverterInventory();
                inverters.forEach(inv => {
                    devices.push({
                        name: `IQ ${inv.serialNumber}`,
                        data: {
                            serialnr: inv.serialNumber
                        },
                        settings: {
                            username: username,
                            password: password,
                            address: v.address,
                            id: v.id
                        }
                    });
                });
            }
            return devices;
        });
    }

    setInterval(interval) {
        this.homey.clearInterval(this.interval);
        if (interval) {
            this.interval = this.homey.setInterval(() => this.update(), interval);
        }
    }

    async deviceStarted(device) {
        this.log('IQDriver has deviceStarted');
        const settings = device.getSettings();
        if (this.username != settings.username || this.password != settings.password) {
            this.api = null;
            this.username = settings.username;
            this.password = settings.password;
            this.setInterval();
            this.log('IQDriver has started api');
            this.api = await Enphase(this.username, this.password, settings.address, settings.id);
            this.setInterval(INTERVAL);
            // Update the settings in all the other devices
            const devices = this.getDevices();
            for (let i = 0; i < devices.length; i++) {
                devices[i].setSettings(settings);
            }
        }
        await this.update();
    }

    async deviceStopped(device) {
        this.log("IQDriver has deviceStopped");
        const devices = this.getDevices();
        if (!devices.length) {
            this.setInterval();
        }
    }

    async update() {
        this.log("IQDriver update");
        const devices = this.getDevices();
        if (this.api && devices.length) {
            this.log("IQDriver calling getInverterProduction");
            const production = await this.api.getInverterProduction();
            const mapping = {};
            production.forEach(p => mapping[p.serialNumber] = p.lastReportWatts);
            for (let i = 0; i < devices.length; i++) {
                const p = mapping[devices[i].getData().serialnr];
                if (typeof(p) === "number") {
                    devices[i].updateProduction(p).catch(this.error);
                }
            }
        }
    }

};
