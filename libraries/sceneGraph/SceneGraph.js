let SceneNode = require('./SceneNode');
let utils = require('./utils');
const actionSender = require('../utilities').actionSender;
const { SceneGraphEvent, SceneGraphEventOpEnum, SceneGraphNetworkManager } = require('./SceneGraphNetworking');
const { getIP, resetObjectTimeouts } = require('../../server');

const EVENT_UPDATE_INTERVAL = 3000; // 3 seconds
const FULL_UPDATE_INTERVAL = 60000; // 1 minute

/**
 * The scene graph stores and computes the locations of all known objects, tools, and nodes.
 * It mirrors the information collected by Spatial Toolbox clients and can be used to perform
 * spatial computations on the server about the relative locations of various elements.
 */
class SceneGraph {
    constructor(shouldBroadcastChanges) {
        this.NAMES = Object.freeze({
            ROOT: 'ROOT',
            CAMERA: 'CAMERA', // TODO: might not need CAMERA and GROUNDPLANE on server
            GROUNDPLANE: 'GROUNDPLANE'
        });
        this.graph = {};

        // Add a root element to hold all objects, tools, nodes, etc
        this.rootNode = new SceneNode(this.NAMES.ROOT);
        this.graph[this.NAMES.ROOT] = this.rootNode;

        this.updateCallbacks = [];
        this.shouldBroadcastChanges = shouldBroadcastChanges;
        if (this.shouldBroadcastChanges) {
            this.networkManager = new SceneGraphNetworkManager(actionSender, getIP);
            this.eventUpdateInterval = setInterval(() => {
                this.networkManager.sendEventUpdates();
            }, EVENT_UPDATE_INTERVAL);
            this.fullUpdateInterval = setInterval(() => {
                this.networkManager.sendFullUpdate(this.getSerializableCopy());
            }, FULL_UPDATE_INTERVAL);
        }
    }

    addObjectAndChildren(objectId, object) {
        this.addObject(objectId, object.matrix, true);
        for (let frameId in object.frames) {
            let frame = object.frames[frameId];
            this.addFrame(objectId, frameId, frame, frame.ar.matrix);
            for (let nodeId in frame.nodes) {
                let node = frame.nodes[nodeId];
                this.addNode(objectId, frameId, nodeId, node, node.matrix);
            }
        }
    }

    addObject(objectId, initialLocalMatrix, needsRotateX) {
        if (this.shouldBroadcastChanges) {
            const addObjectEvent = SceneGraphEvent.AddObject(objectId, initialLocalMatrix, needsRotateX);
            this.networkManager.addEvent(addObjectEvent);
        }
        let sceneNode = null;
        if (typeof this.graph[objectId] !== 'undefined') {
            sceneNode = this.graph[objectId];
        } else {
            sceneNode = new SceneNode(objectId);
            this.graph[objectId] = sceneNode;
        }

        sceneNode.setParent(this.rootNode);

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNode.setLocalMatrix(initialLocalMatrix);
        }

        if (needsRotateX) {
            this.addRotateX(sceneNode);
        }

        console.log('added object ' + objectId + ' to scene graph (to parent: ' + this.NAMES.ROOT + ')');

        this.triggerUpdateCallbacks();
    }

    addFrame(objectId, frameId, linkedFrame, initialLocalMatrix) {
        if (this.shouldBroadcastChanges) {
            const addFrameEvent = SceneGraphEvent.AddFrame(objectId, frameId, linkedFrame, initialLocalMatrix);
            this.networkManager.addEvent(addFrameEvent);
        }
        let sceneNode = null;
        if (typeof this.graph[frameId] !== 'undefined') {
            sceneNode = this.graph[frameId];
        } else {
            sceneNode = new SceneNode(frameId);
            this.graph[frameId] = sceneNode;
        }

        if (typeof this.graph[objectId] !== 'undefined') {
            if (this.graph[objectId].needsRotateX) {
                sceneNode.setParent(this.graph[objectId + 'rotateX']);
            } else {
                sceneNode.setParent(this.graph[objectId]);
            }
        }

        if (typeof linkedFrame !== 'undefined') {
            sceneNode.linkedVehicle = linkedFrame;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNode.setLocalMatrix(initialLocalMatrix);
        }

        console.log('added frame ' + frameId + ' to scene graph (to parent: ' + objectId + ')');

        this.triggerUpdateCallbacks();
    }

    addNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix) {
        if (this.shouldBroadcastChanges) {
            const addNodeEvent = SceneGraphEvent.AddNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix);
            this.networkManager.addEvent(addNodeEvent);
        }
        let sceneNode = null;
        if (typeof this.graph[nodeId] !== 'undefined') {
            sceneNode = this.graph[nodeId];
        } else {
            sceneNode = new SceneNode(nodeId);
            this.graph[nodeId] = sceneNode;
        }

        if (typeof this.graph[frameId] !== 'undefined') {
            sceneNode.setParent(this.graph[frameId]);
        }

        if (typeof linkedNode !== 'undefined') {
            sceneNode.linkedVehicle = linkedNode;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNode.setLocalMatrix(initialLocalMatrix);
        }

        console.log('added node ' + nodeId + ' to scene graph (to parent: ' + frameId + ')');

        this.triggerUpdateCallbacks();
    }

    addRotateX(parentSceneNode, groundPlaneVariation) {
        parentSceneNode.needsRotateX = true;

        let sceneNode;
        let thisNodeId = parentSceneNode.id + 'rotateX';
        if (typeof this.graph[thisNodeId] !== 'undefined') {
            sceneNode = this.graph[thisNodeId];
        } else {
            sceneNode = new SceneNode(thisNodeId);
            this.graph[thisNodeId] = sceneNode;
        }

        sceneNode.setParent(parentSceneNode);

        // image target objects require one coordinate system rotation. ground plane requires another.
        if (groundPlaneVariation) {
            sceneNode.setLocalMatrix(utils.makeGroundPlaneRotationX(-(Math.PI / 2)));
        } else {
            sceneNode.setLocalMatrix([ // transform coordinate system by rotateX
                1,  0, 0, 0,
                0, -1, 0, 0,
                0,  0, 1, 0,
                0,  0, 0, 1
            ]);
        }
    }

    removeElementAndChildren(id) {
        if (this.shouldBroadcastChanges) {
            const removeElementEvent = SceneGraphEvent.RemoveElement(id);
            this.networkManager.addEvent(removeElementEvent);
        }

        let sceneNode = this.graph[id];
        if (sceneNode) {

            // remove from parent
            let parentNode = sceneNode.parent;
            if (parentNode) {
                let index = parentNode.children.indexOf(sceneNode);
                if (index > -1) {
                    parentNode.children.splice(index, 1);
                }
            }

            // delete from graph
            delete this.graph[id];

            this.triggerUpdateCallbacks();
        }
    }

    /**
     * Call this before any computations to ensure the worldMatrix of each element is up-to-date.
     * It's ok to call too many times, as the nodes will skip computations if already up-to-date.
     */
    recomputeGraph() {
        this.rootNode.updateWorldMatrix(); // recursively updates all children of rootNode
    }

    getDistanceBetween(keyA, keyB) {
        this.recomputeGraph();

        let nodeA = this.graph[keyA];
        let nodeB = this.graph[keyB];
        if (nodeA && nodeB) {
            let distance = nodeA.getDistanceTo(nodeB);
            return distance; //nodeA.getDistanceTo(nodeB);
        }
        return -1; // return a value that could only be an error
    }

    getDistanceNodeToPoint(keyA, x, y, z) {
        this.recomputeGraph();

        let nodeA = this.graph[keyA];
        if (nodeA) {
            let distance = nodeA.getDistanceToPoint(x, y, z);
            return distance;
        }
    }

    updateWithPositionData(objectId, frameId, nodeId, localMatrix, x, y, scale) {
        let id = nodeId || frameId || objectId; // gets most specific address
        let sceneNode = this.graph[id];
        if (sceneNode) {
            if (typeof x === 'undefined' && typeof y === 'undefined' && typeof scale === 'undefined' &&
                localMatrix && (localMatrix.toString() === sceneNode.localMatrix.toString())) {
                // console.log('skip update.. no changes');
                return;
            }
            sceneNode.updateVehicleXYScale(x, y, scale);
            sceneNode.setLocalMatrix(localMatrix);
            resetObjectTimeouts(objectId);
            this.triggerUpdateCallbacks();
            if (this.shouldBroadcastChanges && sceneNode.broadcastRulesSatisfied()) {
                const updatePositionEvent = SceneGraphEvent.UpdatePosition(id, localMatrix, x, y, scale);
                this.networkManager.addEvent(updatePositionEvent);
                sceneNode.onBroadcast();
            }
        } else {
            console.warn('SceneGraph.updateWithPositionData: Could not find node');
        }
    }

    updateObjectWorldId(objectId, worldId) {
        if (objectId === worldId) { return; } // don't set a node to be its own parent
        let worldNode = this.graph[worldId];
        let objectNode = this.graph[objectId];
        if (!objectNode || !worldNode) { return; } // unknown object or world
        if (this.shouldBroadcastChanges) {
            const updateObjectWorldIdEvent = SceneGraphEvent.UpdateObjectWorldId(objectId, worldId);
            this.networkManager.addEvent(updateObjectWorldIdEvent);
        }
        objectNode.setParent(worldNode);
        this.triggerUpdateCallbacks();
    }

    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    triggerUpdateCallbacks() {
        this.updateCallbacks.forEach(function(callback) {
            callback();
        });
    }

    deactivateElement(id) {
        let node = this.graph[id];
        if (node && !node.deactivated) {
            if (this.shouldBroadcastChanges) {
                const deactivateElementEvent = SceneGraphEvent.DeactivateElement(id);
                this.networkManager.addEvent(deactivateElementEvent);
            }
            node.deactivated = true;
            this.triggerUpdateCallbacks();
        }
    }

    activateElement(id) {
        let node = this.graph[id];
        if (node && node.deactivated) {
            if (this.shouldBroadcastChanges) {
                const activateElementEvent = SceneGraphEvent.ActivateElement(id);
                this.networkManager.addEvent(activateElementEvent);
            }
            node.deactivated = false;
            this.triggerUpdateCallbacks();
        }
    }

    getSerializableCopy() {
        this.recomputeGraph();
        let copy = {};
        for (var key in this.graph) {
            let sceneNode = this.graph[key];
            copy[key] = sceneNode.getSerializableCopy();
        }
        return copy;
    }

    addDataFromSerializableGraph(data, shouldUpdateConflicts) {
        let nodesToUpdate = [];

        // Add a placeholder element for each data entry in the serializable copy of the graph
        for (var key in data) {
            // // TODO: how to resolve conflicts? currently ignores nodes that already exist
            if (typeof this.graph[key] !== 'undefined' && !shouldUpdateConflicts) { continue; }

            let sceneNode = new SceneNode(key);
            this.graph[key] = sceneNode;

            nodesToUpdate.push(key);
        }

        // Copy over the correct data and assign children/parents to the new nodes
        nodesToUpdate.forEach(function(key) {
            let sceneNode = this.graph[key];
            sceneNode.initFromSerializedCopy(data[key], this);
        }.bind(this));
    }

    getWorldPosition(id) {
        this.recomputeGraph();

        let node = this.graph[id];
        if (node) {
            return node.worldMatrix;
        }
    }

    handleMessage(message) {
        const timestamp = message.timestamp;
        message.events.forEach(messageEvent => {
            console.log(`SceneGraph.handleMessage: Received operation ${messageEvent.op}.`);
            if (messageEvent.op != SceneGraphEventOpEnum.FULL_UPDATE) {
                console.log(messageEvent.data);
            }
            switch (messageEvent.op) {
            case SceneGraphEventOpEnum.ADD_OBJECT: {
                var { objectId, initialLocalMatrix, needsRotateX } = messageEvent.data;
                this.addObject(objectId, initialLocalMatrix, needsRotateX);
                break;
            }
            case SceneGraphEventOpEnum.ADD_FRAME: {
                var { objectId, frameId, linkedFrame, initialLocalMatrix } = messageEvent.data;
                this.addFrame(objectId, frameId, linkedFrame, initialLocalMatrix);
                break;
            }
            case SceneGraphEventOpEnum.ADD_NODE: {
                var { objectId, frameId, nodeId, linkedNode, initialLocalMatrix } = messageEvent.data;
                this.addNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix);
                break;
            }
            case SceneGraphEventOpEnum.REMOVE_ELEMENT: {
                var { id } = messageEvent.data;
                this.removeElementAndChildren(id);
                break;
            }
            case SceneGraphEventOpEnum.UPDATE_POSITION: {
                console.warn('SceneGraph.handleMessage: Need to implement timestamp-dependent position updates');
                var { id, localMatrix, x, y, scale } = messageEvent.data;
                this.updateWithPositionData(id, id, id, localMatrix, x, y, scale);
                break;
            }
            case SceneGraphEventOpEnum.UPDATE_OBJECT_WORLD_ID: {
                var { objectId, worldId } = messageEvent.data;
                this.updateObjectWorldId(objectId, worldId);
                break;
            }
            case SceneGraphEventOpEnum.DEACTIVATE_ELEMENT: {
                var { id } = messageEvent.data;
                this.deactivateElement(id);
                break;
            }
            case SceneGraphEventOpEnum.ACTIVATE_ELEMENT: {
                var { id } = messageEvent.data;
                this.activateElement(id);
                break;
            }
            case SceneGraphEventOpEnum.FULL_UPDATE: {
                var { serializedGraph } = messageEvent.data;
                this.addDataFromSerializableGraph(serializedGraph, true);
                break;
            }
            default: {
                console.error(`SceneGraph.handleMessage: Operation '${messageEvent.op}' is not yet implemented.`);
                break;
            }
            }
        });
    }
}

module.exports = SceneGraph;
