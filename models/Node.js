const Data = require('./Data.js');
const availableModules = require('../libraries/availableModules');

/**
 * Constructor used to define every nodes generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 *
 * @constructor
 */
function Node(name, type, objectId, frameId, nodeId) {
    // the name of each link. It is used in the Reality Editor to show the IO name.
    this.name = name || '';
    // the ID of the containing object.
    this.objectId = objectId;
    // the ID of the containing frame.
    this.frameId = frameId;
    // the ID of this node.
    this.uuid = nodeId;
    // the actual data of the node
    this.data = new Data();
    // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // defines the nodeInterface that is used to process data of this type. It also defines the visual representation
    // in the Reality Editor. Such data points interfaces can be found in the nodeInterface folder.
    this.type = type || 'node';
    // defines the origin Hardware interface of the IO Point. For example if this is arduinoYun the Server associates
    // this IO Point with the Arduino Yun hardware interface.
    //this.type = "arduinoYun"; // todo "arduinoYun", "virtual", "edison", ... make sure to define yours in your internal_module file
    // indicates how much calls per second is happening on this node
    this.stress = 0;

    // load the publicData/privateData from the properties defined by this node type
    let nodeTypes = availableModules.getNodes();
    if (typeof nodeTypes[type] === 'undefined') {
        console.warn('Trying to create an unsupported node type (' + type + ')');
        this.privateData = {};
        this.publicData = {};
    } else {
        let nodeTemplate = nodeTypes[type];
        this.privateData = nodeTemplate.properties.privateData || {};
        this.publicData = nodeTemplate.properties.publicData || {};
    }

    this.setupProgram();
}

/**
 * Triggers the exports.setup function defined in the add-on for this node type
 */
Node.prototype.setupProgram = function() {
    let nodeTypes = availableModules.getNodes();
    if (typeof nodeTypes[this.type] === 'undefined') {
        console.warn('Trying to setup an unsupported node type (' + this.type + ')');
    } else {
        let nodeTemplate = nodeTypes[this.type];
        if (typeof nodeTemplate.setup === 'function') {
            nodeTemplate.setup(this.objectId, this.frameId, this.uuid, this);
        }
    }
};

/**
 * Should be called before deleting this node
 * Triggers the exports.onRemove function defined in the add-on for this node type
 */
Node.prototype.deconstruct = function() {
    let nodeTypes = availableModules.getNodes();
    if (typeof nodeTypes[this.type] === 'undefined') {
        console.warn('Trying to deconstruct an unsupported node type (' + this.type + ')');
    } else {
        let nodeTemplate = nodeTypes[this.type];
        if (typeof nodeTemplate.onRemove === 'function') {
            nodeTemplate.onRemove(this.objectId, this.frameId, this.uuid, this);
        }
    }
};

module.exports = Node;
