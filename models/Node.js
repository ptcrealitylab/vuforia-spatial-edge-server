const Data = require('./Data.js');

/**
 * @desc Constructor used to define every nodes generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 */
module.exports = function Node() {
    // the name of each link. It is used in the Reality Editor to show the IO name.
    this.name = "";
    // the ID of the containing object.
    this.objectId = null;
    // the ID of the containing frame.
    this.frameId = null;
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
    this.type = "node";
    // defines the origin Hardware interface of the IO Point. For example if this is arduinoYun the Server associates
    // this IO Point with the Arduino Yun hardware interface.
    //this.type = "arduinoYun"; // todo "arduinoYun", "virtual", "edison", ... make sure to define yours in your internal_module file
    // indicates how much calls per second is happening on this node
    this.stress = 0;

    this.privateData = {};
    this.publicData = {};
};
