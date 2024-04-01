const {startSyncIfNotSyncing} = require('./synchronize.js');

module.exports = class SyncInterval {
    constructor(delayMs = 10000) {
        this.delayMs = delayMs;
        this.interval = null;
    }

    start() {
        if (this.interval) {
            this.stop();
        }
        this.interval = setInterval(() => {
            startSyncIfNotSyncing();
        }, this.delayMs);
    }

    stop() {
        if (!this.interval) {
            return;
        }
        clearInterval(this.interval);
        this.interval = null;
    }
};
