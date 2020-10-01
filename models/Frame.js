const Node = require('./Node.js');

/**
 * A frame is a component of an object with its own UI and nodes
 *
 * @constructor
 */
function Frame(objectId, frameId) {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = objectId;
    // Stores its own unique ID
    this.uuid = frameId;
    // The name for the object used for interfaces.
    this.name = '';
    // which visualization mode it should use right now ("ar" or "screen")
    this.visualization = 'ar';
    // position data for the ar visualization mode
    this.ar = {
        // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
        x: 0,
        // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
        y: 0,
        // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
        scale: 1,
        // Unconstrained positioning in 3D space
        matrix: []
    };
    // position data for the screen visualization mode
    this.screen = {
        // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
        x: 0,
        // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
        y: 0,
        // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
        scale: 1
    };
    // Used internally from the reality editor to indicate if an object should be rendered or not.
    this.visible = false;
    // Used internally from the reality editor to trigger the visibility of naming UI elements.
    this.visibleText = false;
    // Used internally from the reality editor to indicate the editing status.
    this.visibleEditing = false;
    // every object holds the developer mode variable. It indicates if an object is editable in the Reality Editor.
    this.developer = true;
    // Stores all the links that emerge from within the object. If a IOPoint has new data,
    // the server looks through the Links to find if the data has influence on other IOPoints or Objects.
    this.links = {};
    // Stores all IOPoints. These points are used to keep the state of an object and process its data.
    this.nodes = {};
    // local or global. If local, node-name is exposed to hardware interface
    this.location = 'local';
    // source
    this.src = 'editor';

    this.privateData = {};
    this.publicData = {};
    // if true, cannot move the frame but copies are made from it when you pull into unconstrained
    this.staticCopy = false;
    // the maximum distance (in meters) to the camera within which it will be rendered
    this.distanceScale = 1.0;
    // Indicates what group the frame belongs to; null if none
    this.groupID = null;
}

/**
 * Should be called before deleting the frame in order to properly destroy it
 * Gives all this frame's nodes the chance to deconstruct when the frame is deconstructed
 */
Frame.prototype.deconstruct = function() {
    for (let nodeKey in this.nodes) {
        if (typeof this.nodes[nodeKey].deconstruct === 'function') {
            this.nodes[nodeKey].deconstruct();
        } else {
            console.warn('Node exists without proper prototype: ' + nodeKey);
        }
    }
};

/**
 * Sets the properties of this frame based on a JSON blob, recursively constructing
 * its nodes and casting their JSON data to Node instances
 * @param {JSON} frame
 */
Frame.prototype.setFromJson = function(frame) {
    Object.assign(this, frame);
    this.setNodesFromJson(frame.nodes);
};

/**
 * Parses a json blob of a set of nodes' data into properly constructed Nodes attached to this frame
 * Should be used instead of frame.nodes = nodes
 * @param {JSON} nodes
 */
Frame.prototype.setNodesFromJson = function(nodes) {
    this.nodes = {};
    for (let nodeKey in nodes) {
        let name = nodes[nodeKey].name;
        let type = nodes[nodeKey].type;
        let newNode = new Node(name, type, this.objectId, this.uuid, nodeKey);
        Object.assign(newNode, nodes[nodeKey]);
        this.nodes[nodeKey] = newNode;
    }
};

module.exports = Frame;
