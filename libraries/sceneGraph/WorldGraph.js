let SceneNode = require('./SceneNode');
let SceneGraph = require('./SceneGraph');
let utils = require('./utils');

/**
 * The world graph has a localGraph, which is the sceneGraph of this server, and zero or more knownGraphs
 * discovered from other servers, and is able to combine them into the compiledGraph
 */
class WorldGraph {
    constructor(localGraph) {
        this.localGraph = localGraph;
        this.localGraph.onUpdate(this.triggerUpdateCallbacks.bind(this));
        this.knownGraphs = {};
        this.compiledGraph = null;
        this.updateCallbacks = [];
    }

    compile() {
        // first add each part of the localGraph into the compiledGraph
        this.compiledGraph = new SceneGraph(false);

        // Add a root element to hold all objects, tools, nodes, etc
        // this.rootNode = new SceneNode(this.NAMES.ROOT);
        // this.graph[this.NAMES.ROOT] = this.rootNode;

        let localGraphCopy = this.localGraph.getSerializableCopy();
        console.log('localGraph:');
        // console.log(localGraphCopy);

        this.compiledGraph.addDataFromSerializableGraph(localGraphCopy);

        // then add each part of each knownGraph into the compiledGraph
        for (let ip in this.knownGraphs) {
            let thatGraph = this.knownGraphs[ip];
            let knownGraphCopy = thatGraph.getSerializableCopy();

            console.log('knownGraph (' + ip + '):');
            // console.log(knownGraphCopy);

            this.compiledGraph.addDataFromSerializableGraph(knownGraphCopy);
        }

        // console.log(this.compiledGraph);
        console.log('finished compiling graphs');

        return this.compiledGraph;
    }

    addKnownGraph(graphId, knownGraphData) {
        console.log('need to convert knownGraphData into a sceneGraph');
        // maybe add an optional constructor param to SceneGraph that allows it to init from serializedCopy
        let knownGraph = new SceneGraph(false);
        knownGraph.onUpdate(this.triggerUpdateCallbacks.bind(this));
        knownGraph.addDataFromSerializableGraph(knownGraphData);

        this.knownGraphs[graphId] = knownGraph;

        this.compile();
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
    
    handleMessage(message) {
        const graph = this.knownGraphs[message.ip];
        if (!graph) {
            console.warn(`WorldGraph.handleMessage: Failed to find known graph for IP: ${message.ip}`);
            return;
        }
        graph.handleMessage(message);
    }
}

module.exports = WorldGraph;
