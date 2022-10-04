
class StaleObjectCleaner {
    constructor(objects, deleteObjectCallback) {
        this.objectsRef = objects;
        this.intervals = {};
        this.deleteObjectCallback = deleteObjectCallback;
        this.lastUpdates = {};
    }

    createCleanupInterval(intervalLengthMs, expirationTimeMs, objectTypesToCheck) {
        const intervalHandle = setInterval(() => {
            this.cleanupStaleObjects(expirationTimeMs, objectTypesToCheck);
        }, intervalLengthMs);

        this.intervals[intervalHandle] = {
            expirationTime: expirationTimeMs,
            objectTypesToCheck: objectTypesToCheck
        };
    }

    resetObjectTimeout(objectKey) {
        this.lastUpdates[objectKey] = Date.now();
    }

    getLastUpdateTime(objectKey) {
        if (typeof this.lastUpdates[objectKey] === 'undefined') {
            // if it hasn't been updated yet, measure the timeout against the first time it is checked
            this.resetObjectTimeout(objectKey);
        }
        return this.lastUpdates[objectKey];
    }

    cleanupStaleObjects(expirationTimeMs, objectTypesToCheck) {
        for (const [objectKey, object] of Object.entries(this.objectsRef)) {
            if (!objectTypesToCheck.includes(object.type)) {
                continue;
            }

            // get time of last update for this object
            let lastUpdateTime = this.getLastUpdateTime(objectKey);
            let currentTime = Date.now();

            // delete the object if it hasn't been updated recently
            if (lastUpdateTime && (currentTime - lastUpdateTime > expirationTimeMs)) {
                console.log('StaleObjectCleaner deleted object (last updated ' + (currentTime - lastUpdateTime) + ' ms ago)', objectKey);
                this.deleteObjectCallback(objectKey);
            }
        }
    }
}

module.exports = StaleObjectCleaner;
