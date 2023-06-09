/**
 * The BlockLink constructor for Blocks is used every time a new logic Link is stored in the logic Node.
 * The block link does not need to keep its own ID since it is created with the link ID as Object name.
 *
 * @constructor
 */
function BlockLink() {
    // origin block UUID
    this.nodeA = null;
    // item in that block
    this.logicA = 0;
    // destination block UUID
    this.nodeB = null;
    // item in that block
    this.logicB = 0;
    // check if the links are looped.
    this.loop = false;
    // Will be used to test if a link is still able to find its destination.
    // It needs to be discussed what to do if a link is not able to find the destination and for what time span.
    this.health = 0; // todo use this to test if link is still valid. If not able to send for some while, kill link.
}

module.exports = BlockLink;
