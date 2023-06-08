// Periodically checks each object of specific types (e.g. avatars or human pose) and deletes them if they haven't been
// updated in the last X seconds (or refreshed with a keepObjectAlive UDP action message)
class StaleObjectCleaner {
    constructor(objects, deleteObjectCallback) {
        this.objectsRef = objects;
        this.deleteObjectCallback = deleteObjectCallback;
        this.lastUpdates = {};
    }

    // starts the periodic checking of objects
    // note: the same StaleObjectCleaner can manage multiple intervals, for example if you want to check avatar objects
    // at one frequency, and human pose objects at another frequency
    createCleanupInterval(intervalLengthMs, expirationTimeMs, objectTypesToCheck) {
        setInterval(() => {
            this.cleanupStaleObjects(expirationTimeMs, objectTypesToCheck);
        }, intervalLengthMs);
    }

    // call this externally anytime the object is updated so that we give it more time to live
    resetObjectTimeout(objectKey) {
        this.lastUpdates[objectKey] = Date.now();
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

    getLastUpdateTime(objectKey) {
        if (typeof this.lastUpdates[objectKey] === 'undefined') {
            // if it hasn't been updated yet, measure the timeout against the first time it is checked
            this.resetObjectTimeout(objectKey);
        }
        return this.lastUpdates[objectKey];
    }
}

module.exports = StaleObjectCleaner;
