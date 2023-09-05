export class PersistentStorage {
    constructor(spatialInterface, storageNodeName) {
        this.spatialInterface = spatialInterface;
        this.storageNodeName = storageNodeName;
        this.listenCallbacks = {};
    }

    write(key, value) {
        this.spatialInterface.writePublicData(this.storageNodeName, key, value);
    }

    listen(key, callback) {
        let needsListener = false;
        if (!this.listenCallbacks[key]) {
            this.listenCallbacks[key] = [];
            needsListener = true;
        }
        // let needsListener = Object.keys(this.listenCallbacks).length === 0;
        this.listenCallbacks[key].push(callback);
        if (needsListener) {
            this.spatialInterface.addReadPublicDataListener(this.storageNodeName, key, function(e) {
                this.listenCallbacks[key].forEach(function(cb) {
                    cb(e);
                });
            }.bind(this));
        }
    }
    load() {
        this.spatialInterface.reloadPublicData();
    }
}
