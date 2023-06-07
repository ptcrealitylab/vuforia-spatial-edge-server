class NodeUtilities {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.deepCopy
     * @param {function} dependencies.uuidTime
     * @param {object} dependencies.fileAccess
     * @param {object} dependencies.memoryAccess
     * @param {object} dependencies.network
     * @param {object} dependencies.objects
     * @param {object} dependencies.sceneGraph
     * @param {object} dependencies.knownObjects
     * @param {object} dependencies.socketArray
     * @param {object} dependencies.globalVariables
     * @param {object} dependencies.hardwareAPI
     * @param {object} dependencies.objectsPath
     * @param {object} dependencies.linkController
     * @param {function} dependencies.Link
     **/
    constructor(dependencies) {
        this.deepCopy = dependencies.deepCopy;
        this.uuidTime = dependencies.uuidTime;
        this.fileAccess = dependencies.fileAccess;
        this.memoryAccess = dependencies.memoryAccess;
        this.network = dependencies.network;
        this.objects = dependencies.objects;
        this.sceneGraph = dependencies.sceneGraph;
        this.knownObjects = dependencies.knownObjects;
        this.socketArray = dependencies.socketArray;
        this.globalVariables = dependencies.globalVariables;
        this.hardwareAPI = dependencies.hardwareAPI;
        this.objectsPath = dependencies.objectsPath;
        this.linkController = dependencies.linkController;
        this.Link = dependencies.Link;
    }

    searchNodeByType(nodeType, _object, tool, node, callback) {
        let thisObjectKey = _object;
        if (!(_object in this.objects)) {
            thisObjectKey = this.fileAccess.getObjectIdFromTargetOrObjectFile(_object, this.objectsPath);
        }
        let thisObject = this.memoryAccess.getObject(this.objects, thisObjectKey);
        if (!tool && !node) {
            this.memoryAccess.forEachFrameInObject(thisObject, function (thisTool, toolKey) {
                this.memoryAccess.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
                    if (thisNode.type === nodeType) callback(thisObjectKey, toolKey, nodeKey);
                });
            });
        } else if (!node) {
            let thisTool = this.memoryAccess.getFrame(this.objects, thisObjectKey, tool);
            if (!thisTool) {
                thisTool = this.memoryAccess.getFrame(this.objects, thisObjectKey, thisObjectKey + tool);
            }
            this.memoryAccess.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
                if (thisNode.type === nodeType) {
                    callback(thisObjectKey, tool, nodeKey);
                }
            });

        } else if (!tool) {
            this.memoryAccess.forEachFrameInObject(thisObject, function (thisTool, toolKey) {
                let thisNode = this.memoryAccess.getFrame(this.objects, thisObjectKey, toolKey, node);
                if (!thisNode) {
                    if (thisNode.type === nodeType) callback(thisObjectKey, toolKey, node);
                }
            });
        }
    }

    createLink(originObject, _originTool, originNode, destinationObject, destinationTool, destinationNode) {

        let originTool = _originTool;
        if (!this.memoryAccess.getFrame(this.objects, originObject, _originTool)) {
            originTool = originObject + _originTool;
        }
        let linkBody = new this.Link();
        linkBody.objectA = originObject;
        linkBody.frameA = originTool;
        linkBody.nodeA = originNode;
        linkBody.objectB = destinationObject;
        linkBody.frameB = destinationTool;
        linkBody.nodeB = destinationNode;
        this.linkController.newLink(originObject, originTool, 'link' + this.uuidTime(), linkBody);
    }

    deleteLink(object, tool, link) {
        this.linkController.deleteLink(object, tool, link, 'server');
    }

    getWorldObject(object) {
        let thisObject = this.memoryAccess.getObject(this.objects, object);
        if (thisObject) {
            if (thisObject.hasOwnProperty('worldId')) {
                return thisObject.worldId;
            }
        }
        return null;
    }

    getWorldLocation(objectID) {
        return this.sceneGraph.getWorldPosition(objectID);
    }
}

module.exports = NodeUtilities;








