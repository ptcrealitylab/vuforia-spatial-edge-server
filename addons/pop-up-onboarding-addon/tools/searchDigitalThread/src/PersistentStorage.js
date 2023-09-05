(function(exports) {
    class PersistentStorage {
        constructor(spatialInterface, storageNodeName) {
            this.spatialInterface = spatialInterface;
            this.storageNodeName = storageNodeName;
            this.listenCallbacks = {};
            this.cachedValues = {};
        }
        write(key, value) {
            this.spatialInterface.writePublicData(this.storageNodeName, key, value);
            this.cachedValues[key] = value;
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
                    this.cachedValues[key] = e;
                    this.listenCallbacks[key].forEach(function(cb) {
                        cb(e);
                    });
                }.bind(this));
            }
        }
        getCachedValue(key) {
            return this.cachedValues[key];
        }
        load() {
            this.spatialInterface.reloadPublicData();
        }
    }
    function init(spatialInterface, storageNodeName) {
        exports.storage = new PersistentStorage(spatialInterface, storageNodeName);
    }
    exports.initStorage = init;
})(window);
