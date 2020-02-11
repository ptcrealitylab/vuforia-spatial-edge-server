const Data = require('./Data.js');

/**
 * @desc Constructor used to define special blocks that are connecting the logic crafting with the outside system.
 */
module.exports = function EdgeBlock() {
    // name of the block
    this.name = "";
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = [new Data(), new Data(), new Data(), new Data()];
    // indicates how much calls per second is happening on this block
    this.stress = 0;
    this.type = "default";
};
