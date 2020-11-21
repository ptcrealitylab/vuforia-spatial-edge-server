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
        this.knownGraphs = {};
        this.compiledGraph = null;
        this.updateCallbacks = [];
    }

    compile() {
        // first add each part of the localGraph into the compiledGraph
        this.compiledGraph = new SceneGraph();

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

        console.log(this.compiledGraph);
        console.log('finished compiling graphs');

        return this.compiledGraph;
    }

    addKnownGraph(graphId, knownGraphData) {
        console.log('need to convert knownGraphData into a sceneGraph');
        // maybe add an optional constructor param to SceneGraph that allows it to init from serializedCopy
        let knownGraph = new SceneGraph();
        knownGraph.addDataFromSerializableGraph(knownGraphData);

        this.knownGraphs[graphId] = knownGraph;

        this.compile();
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
