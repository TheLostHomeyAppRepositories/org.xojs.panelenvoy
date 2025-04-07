'use strict';

const Homey = require('homey');

module.exports = class IQDevice extends Homey.Device {

    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('IQDevice has been initialized');
        if (!this.hasCapability("meter_power")) {
            this.addCapability("meter_power").catch(this.log);
        }
        if (!this.getStoreValue("my_meter_power")) {
            this.setStoreValue("my_meter_power", 0).catch(this.log);
        }
        this.driver.deviceStarted(this);
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('IQDevice has been added');
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('IQDevice settings where changed');
        this.driver.deviceStarted(this);
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('IQDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('IQDevice has been deleted');
    }

    async updateProduction(watts) {
        this.setCapabilityValue("measure_power", watts).catch(this.error);
        // Updated every minute, so we can calculate the meter value
        const meter = this.getStoreValue("my_meter_power") + watts / (60 * 1000);
        this.setStoreValue("my_meter_power", meter).catch(this.log);
        this.setCapabilityValue("meter_power", meter).catch(this.log);
        this.setAvailable().catch(this.error);
    }

};
