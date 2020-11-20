let SceneNode = require('./SceneNode');
let SceneGraph = require('./SceneGraph');
let utils = require('./utils');
/**
 * The scene graph stores and computes the locations of all known objects, tools, and nodes.
 * It mirrors the information collected by Spatial Toolbox clients and can be used to perform
 * spatial computations on the server about the relative locations of various elements.
 */
class WorldGraph {
    constructor() {
        this.localGraph = null;
        this.knownGraphs = {};
        this.compiledGraph = null;

        // // Add a root element to hold all objects, tools, nodes, etc
        // this.rootNode = new SceneNode(this.NAMES.ROOT);
        // this.graph[this.NAMES.ROOT] = this.rootNode;

        this.updateCallbacks = [];
    }

    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    triggerUpdateCallbacks() {
        this.updateCallbacks.forEach(function(callback) {
            callback();
        });
    }
}

module.exports = WorldGraph;
