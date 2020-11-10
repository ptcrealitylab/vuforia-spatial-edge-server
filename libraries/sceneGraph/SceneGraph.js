let SceneNode = require('./SceneNode');
let utils = require('./utils');
/**
 * The scene graph stores and computes the locations of all known objects, tools, and nodes.
 * It mirrors the information collected by Spatial Toolbox clients and can be used to perform
 * spatial computations on the server about the relative locations of various elements.
 */
class SceneGraph {
    constructor() {
        this.NAMES = Object.freeze({
            ROOT: 'ROOT',
            CAMERA: 'CAMERA', // TODO: might not need CAMERA and GROUNDPLANE on server
            GROUNDPLANE: 'GROUNDPLANE'
        });
        this.graph = {};

        // Add a root element to hold all objects, tools, nodes, etc
        this.rootNode = new SceneNode(this.NAMES.ROOT);
        this.graph[this.NAMES.ROOT] = this.rootNode;
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
    }

    addFrame(objectId, frameId, linkedFrame, initialLocalMatrix) {
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
    }

    addNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix) {
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
            sceneNode.setLocalMatrix(utils.makeGroundPlaneRotationX(-(Math.PI/2)));
        } else {
            sceneNode.setLocalMatrix([ // transform coordinate system by rotateX
                1,  0, 0, 0,
                0, -1, 0, 0,
                0,  0, 1, 0,
                0,  0, 0, 1
            ]);
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

    updateWithPositionData(objectId, frameId, nodeId, localMatrix, x, y, scale) {
        let id = nodeId || frameId || objectId; // gets most specific address
        let sceneNode = this.graph[id];
        if (sceneNode) {
            sceneNode.updateVehicleXYScale(x, y, scale);
            sceneNode.setLocalMatrix(localMatrix);
        }
    }
}

module.exports = SceneGraph;
