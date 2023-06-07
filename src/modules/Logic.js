const Data = require('./Data.js');

/**
 * Constructor used to define every logic node generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 *
 * @constructor
 */
function Logic() {
    this.name = '';
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = new Data();
    // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // if showLastSettingFirst is true then lastSetting is the name of the last block that was moved or set.
    this.lastSetting = false;

    this.lastSettingBlock = '';
    // the iconImage is in png or jpg format and will be stored within the logicBlock folder. A reference is placed here.
    this.iconImage = 'auto';
    // nameInput are the names given for each IO.
    this.nameInput = ['', '', '', ''];
    // nameOutput are the names given for each IO
    this.nameOutput = ['', '', '', ''];
    // the array of possible connections within the logicBlock.
    // if a block is set, a new Node instance is coppied in to the spot.
    this.type = 'logic';
    this.links = {};
    this.blocks = {};

    this.route = 0;
    this.routeBuffer = [0, 0, 0, 0];
}

module.exports = Logic;
