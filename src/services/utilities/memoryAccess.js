class MemoryAccess {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.fs
     * @param {object} dependencies.path
     * @param {object} dependencies.network
     **/
    constructor(dependencies) {
        // node Modules
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.network = dependencies.network;
    }

    // todo memory
    writeObject(objectLookup, folder, id) {
        objectLookup[folder] = {id: id};
    }

    // todo memory
    readObject(objectLookup, folder) {
        if (objectLookup.hasOwnProperty(folder)) {
            return objectLookup[folder].id;
        } else {
            return null;
        }
    }

    // todo memory
    deleteObject(objectName, objects, objectsPath, objectLookup, activeHeartbeats, knownObjects, sceneGraph, setAnchors) {
        console.log('Deleting object: ' + objectName);

        let objectFolderPath = this.path.join(objectsPath, objectName);
        if (this.fs.existsSync(objectFolderPath)) {
            this.fs.rmdirSync(objectFolderPath, {recursive: true});
        }

        let objectKey = this.readObject(objectLookup, objectName);

        if (objectKey && objects[objectKey]) {
            // remove object from tree

            if (activeHeartbeats[objectKey]) {
                clearInterval(activeHeartbeats[objectKey]);
                delete activeHeartbeats[objectKey];
            }
            try {
                // deconstructs frames and nodes of this object, too
                objects[objectKey].deconstruct();
            } catch (e) {
                console.warn('Object exists without proper prototype: ' + objectKey, e);
            }
            delete objects[objectKey];
            delete knownObjects[objectKey];
            delete objectLookup[objectName];

            sceneGraph.removeElementAndChildren(objectKey);
        }

        console.log('i deleted: ' + objectKey);
        setAnchors();

        this.network.actionSender({reloadObject: {object: objectKey}});
    }

    // memory
    doesObjectExist(objects, objectKey) {
        return objects.hasOwnProperty(objectKey);
    }

    // memory
    getObject(objects, objectKey) {
        if (this.doesObjectExist(objects, objectKey)) {
            return objects[objectKey];
        }
        return null;
    }

    // memory
    doesFrameExist(objects, objectKey, frameKey) {
        if (this.doesObjectExist(objects, objectKey)) {
            let foundObject = this.getObject(objects, objectKey);
            if (foundObject) {
                return foundObject.frames.hasOwnProperty(frameKey);
            }
        }
        return false;
    }

    // memory
    getFrame(objects, objectKey, frameKey) {
        if (this.doesFrameExist(objects, objectKey, frameKey)) {
            let foundObject = this.getObject(objects, objectKey);
            if (foundObject) {
                return foundObject.frames[frameKey];
            }
        }
        return null;
    }

    // memory
    doesNodeExist(objects, objectKey, frameKey, nodeKey) {
        if (this.doesFrameExist(objects, objectKey, frameKey)) {
            let foundFrame = this.getFrame(objects, objectKey, frameKey);
            if (foundFrame) {
                return foundFrame.nodes.hasOwnProperty(nodeKey);
            }
        }
        return false;
    }

    // memory
    getNode(objects, objectKey, frameKey, nodeKey) {
        if (this.doesNodeExist(objects, objectKey, frameKey, nodeKey)) {
            let foundFrame = this.getFrame(objects, objectKey, frameKey);
            if (foundFrame) {
                return foundFrame.nodes[nodeKey];
            }
        }
        return null;
    }

    // memory
    /**
     * @param objects
     * @param objectKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object)
     */
    getObjectAsync(objects, objectKey, callback) {
        if (!objects.hasOwnProperty(objectKey)) {
            callback({failure: true, error: 'Object ' + objectKey + ' not found'});
            return;
        }
        let object = objects[objectKey];
        callback(null, object);
    }

    // memory
    /**
     * @param objects
     * @param objectKey
     * @param frameKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object, frame)
     */
    getFrameAsync(objects, objectKey, frameKey, callback) {
        this.getObjectAsync(objects, objectKey, function (error, object) {
            if (error) {
                callback(error);
                return;
            }
            if (!object.frames.hasOwnProperty(frameKey)) {
                callback({failure: true, error: 'Frame ' + frameKey + ' not found'});
                return;
            }
            let frame = object.frames[frameKey];
            callback(null, object, frame);
        });
    }

    // memory
    /**
     * @param objects
     * @param objectKey
     * @param frameKey
     * @param nodeKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object, frame)
     */
    getNodeAsync(objects, objectKey, frameKey, nodeKey, callback) {
        this.getFrameAsync(objects, objectKey, frameKey, function (error, object, frame) {
            if (error) {
                callback(error);
                return;
            }
            if (!frame.nodes.hasOwnProperty(nodeKey)) {
                callback({failure: true, error: 'Node ' + nodeKey + ' not found'});
                return;
            }
            let node = frame.nodes[nodeKey];
            callback(null, object, frame, node);
        });
    }

    /**
     * Returns node if a nodeKey is provided, otherwise the frame
     * @param objects
     * @param objectKey
     * @param frameKey
     * @param nodeKey
     * @param callback
     */
    // memory
    getFrameOrNode(objects, objectKey, frameKey, nodeKey, callback) {
        this.getFrameAsync(objects, objectKey, frameKey, function (error, object, frame) {
            if (error) {
                callback(error);
                return;
            }

            let node = null;

            if (nodeKey && nodeKey !== 'null') {
                if (!frame.nodes.hasOwnProperty(nodeKey)) {
                    callback({failure: true, error: 'Node ' + nodeKey + ' not found'});
                    return;
                }
                node = frame.nodes[nodeKey];
            }

            callback(null, object, frame, node);
        });
    }

    // memory
    forEachObject(objects, callback) {
        for (let objectKey in objects) {
            if (!objects.hasOwnProperty(objectKey)) continue;
            callback(objects[objectKey], objectKey);
        }
    }

    // memory
    forEachFrameInObject(object, callback) {
        if (!object) return;
        for (let frameKey in object.frames) {
            if (!object.frames.hasOwnProperty(frameKey)) continue;
            callback(object.frames[frameKey], frameKey);
        }
    }

    // memory
    forEachNodeInFrame(frame, callback) {
        if (!frame) return;
        for (let nodeKey in frame.nodes) {
            if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
            callback(frame.nodes[nodeKey], nodeKey);
        }
    }

    // memory
    forEachLinkInFrame(frame, callback) {
        if (!frame) return;
        for (let nodeKey in frame.links) {
            if (!frame.links.hasOwnProperty(nodeKey)) continue;
            callback(frame.links[nodeKey], nodeKey);
        }
    }
}

module.exports = MemoryAccess;
