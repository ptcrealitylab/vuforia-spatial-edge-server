/*
* Copyright © 2021 PTC
*/

class NetworkSettings {
    constructor() {
        this.cachedSettings = {};

        this.fetchSettings = this.fetchSettings.bind(this);
        this.fetchSettingsInterval = setInterval(this.fetchSettings, 1000);
        this.onChangeFns = [];
    }

    addOnChange(handler, noInitialRun) {
        this.onChangeFns.push(handler);
        if (!noInitialRun) {
            handler(this.cachedSettings);
        }
    }

    removeOnChange(handler) {
        this.onChangeFns = this.onChangeFns.filter(fn => fn !== handler);
    }

    async fetchSettings() {
        const localSettingsHost = `127.0.0.1:${realityEditor.device.environment.getLocalServerPort()}`;
        if (window.location.host.split(':')[0] !== localSettingsHost.split(':')[0]) {
            this.fetchSettingsRemote();
            return;
        }
        let settings;
        try {
            let res = await fetch(`http://${localSettingsHost}/hardwareInterface/edgeAgent/settings`);
            settings = await res.json();
        } catch (e) {
            console.warn('unable to fetch settings', e);
            return;
        }
        let anyChanged =
            (this.cachedSettings.isConnected !== settings.isConnected) ||
            (this.cachedSettings.serverUrl !== settings.serverUrl) ||
            (this.cachedSettings.networkUUID !== settings.networkUUID) ||
            (this.cachedSettings.networkSecret !== settings.networkSecret);
        this.cachedSettings = settings;
        if (anyChanged) {
            for (let fn of this.onChangeFns) {
                fn(settings);
            }
        }
    }

    fetchSettingsRemote() {
        this.cachedSettings.isConnected = true;
        this.cachedSettings.serverUrl = window.location.host;
        if (/\/n\/([^/]+)/.exec(window.location.pathname)) {
            this.cachedSettings.networkUUID = /\/n\/([^/]+)/.exec(window.location.pathname)[1];
        }
        if (/\/s\/([^/]+)/.exec(window.location.pathname)) {
            this.cachedSettings.networkSecret = /\/s\/([^/]+)/.exec(window.location.pathname)[1];
        }
        for (let fn of this.onChangeFns) {
            fn(this.cachedSettings);
        }
        clearInterval(this.fetchSettingsInterval);
        this.fetchSettingsInterval = null;
    }
}

export const sharedNetworkSettings = new NetworkSettings();
