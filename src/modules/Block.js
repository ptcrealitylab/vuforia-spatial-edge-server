const Data = require('./Data.js');

/**
 * Constructor used to define every block within the logicNode.
 * The block does not need to keep its own ID since it is created with the link ID as Object name.
 * @constructor
 */
function Block() {
    // name of the block
    this.name = '';
    // local ID given to a used block.
    this.id = null;

    this.x = null;
    this.y = null;
    // amount of elements the IO point is created of. Single IO nodes have the size 1.
    this.blockSize = 1;
    // the category for the editor
    this.category = 1;
    // the global / world wide id of the actual reference block design. // checksum of the block??
    this.globalId = null;
    // the checksum should be identical with the checksum for the persistent package files of the reference block design.
    this.checksum = null; // checksum of the files for the program
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = [new Data(), new Data(), new Data(), new Data()];
    // experimental. This are objects for data storage. Maybe it makes sense to store data in the general object
    // this would allow the the packages to be persistent. // todo discuss usability with Ben.
    this.privateData = {};
    this.publicData = {};

    // IO for logic
    // define how many inputs are active.
    this.activeInputs = [true, false, false, false];
    // define how many outputs are active.
    this.activeOutputs = [true, false, false, false];
    // define the names of each active IO
    this.nameInput = ['', '', '', ''];
    this.nameOutput = ['', '', '', ''];
    // A specific icon for the node, png or jpg.
    this.iconImage = null;
    // Text within the node, if no icon is available.
    // indicates how much calls per second is happening on this block
    this.stress = 0;
    // this is just a compatibility with the original engine. Maybe its here to stay
    this.type = 'default';
}

module.exports = Block;
