const utilities = require('../libraries/utilities');
const Block = require('../models/Block');

// Variables populated from server.js with setup()
var objects = {};
var blockModules;
var globalVariables;
var engine;

/**
 * Adds a new block with the provided blockID to the specified node.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {string} blockID
 * @param {Block} body
 * @return {string}
 */
const addNewBlock = function (objectID, frameID, nodeID, blockID, body) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);
    if (foundNode) {

        var thisBlocks = foundNode.blocks;
        thisBlocks[blockID] = new Block();

        // todo activate when system is working to increase security
        /* var thisMessage = req.body;

         var thisModule = {};

         var breakPoint = false;

         if (thisMessage.type in blockFolderList) {
         thisModule = blockModules[thisMessage.type];

         for (var thisKey in thisMessage.publicData) {
         if (typeof thisMessage.publicData[thisKey] !== typeof thisModule.publicData[thisKey]) {
         breakPoint = true;
         }
         }

         for (var thisKey in thisMessage.privateData) {
         if (typeof thisMessage.privateData[thisKey] !== typeof thisModule.privateData[thisKey]) {
         breakPoint = true;
         }
         }
         }
         else {
         breakPoint = true;
         }

         if (!breakPoint)*/

        thisBlocks[blockID] = body;

        // todo this can be removed once the system runs smoothly
        if (typeof thisBlocks[blockID].type === 'undefined') {
            thisBlocks[blockID].type = thisBlocks[blockID].name;
        }

        // call an action that asks all devices to reload their links, once the links are changed.
        utilities.actionSender({
            reloadNode: {object: objectID, frame: frameID, node: nodeID},
            lastEditor: body.lastEditor
        });
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);

        updateStatus = 'added';
    }
    return updateStatus;
};

/**
 * Deletes a block with the provided blockID from the specified node.
 * Also deletes any links connected to that block.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {string} blockID
 * @param {string} lastEditor
 * @return {string}
 */
const deleteBlock = function (objectID, frameID, nodeID, blockID, lastEditor) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);

    if (foundNode) {

        delete foundNode.blocks[blockID];

        var thisLinks = foundNode.links;
        // Make sure that no links are connected to deleted blocks
        for (var linkCheckerKey in thisLinks) {
            if (!thisLinks.hasOwnProperty(linkCheckerKey)) continue;
            if (thisLinks[linkCheckerKey].nodeA === blockID || thisLinks[linkCheckerKey].nodeB === blockID) { // TODO: do we need to check blockLinks?
                delete foundNode.links[linkCheckerKey];
            }
        }

        utilities.actionSender({
            reloadNode: {object: objectID, frame: nodeID, node: nodeID},
            lastEditor: lastEditor
        });
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
        updateStatus = 'deleted: ' + blockID + ' in blocks for object: ' + objectID;
    }
    return updateStatus;
};

/**
 * Sets a new grid position for the specified block
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {string} blockID
 * @param {{x: number, y: number, lastEditor: string}} body
 * @return {string}
 */
const postBlockPosition = function (objectID, frameID, nodeID, blockID, body) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);

    if (foundNode) {
        var foundBlock = foundNode.blocks[blockID];
        if (foundBlock) {
            // check that the numbers are valid numbers..
            if (typeof body.x === 'number' && typeof body.y === 'number') {

                foundBlock.x = body.x;
                foundBlock.y = body.y;

                utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
                utilities.actionSender({
                    reloadNode: {object: objectID, frame: frameID, node: nodeID},
                    lastEditor: body.lastEditor
                });
                updateStatus = 'ok';
            }
        }
    }
    return updateStatus;
};

const triggerBlockSearch = function (blockID, body, callback) {
    var foundBlock = false;
    utilities.forEachObject(objects, function (object, objectKey) {
        utilities.forEachFrameInObject(object, function (frame, frameKey) {
            utilities.forEachNodeInFrame(frame, function (node, nodeKey) {
                if (typeof node.blocks !== 'undefined') {
                    var block = node.blocks[blockID];
                    // keep iterating until you find a block with that ID
                    if (block) {
                        foundBlock = true;
                        callback(200, triggerBlock(objectKey, frameKey, nodeKey, blockID, body));
                    }
                }
            });
        });
    });
    if (!foundBlock) {
        callback(404, {success: false, error: 'no block with ID ' + blockID + ' exists'});
    }
};

const triggerBlock = function (objectID, frameID, nodeID, blockID, body) {
    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);
    if (foundNode) {
        var block = foundNode.blocks[blockID];
        block.data[0].value = body.value;
        engine.blockTrigger(objectID, frameID, nodeID, blockID, 0, block);
    }
    return {success: true, error: null};
};

/**
 * Utility function that traverses all the blockModules and creates a new entry for each.
 * @return {Object.<string, Block>}
 */
const getLogicBlockList = function () {
    var blockList = {};

    // Create a objects list with all IO-Points code.
    const blockFolderList = Object.keys(blockModules);
    for (let i = 0; i < blockFolderList.length; i++) {

        // make sure that each block contains all default property keys.
        blockList[blockFolderList[i]] = new Block();

        // overwrite the properties of that block with those stored in the matching blockModule
        var thisBlock = blockModules[blockFolderList[i]].properties;
        for (let key in thisBlock) {
            blockList[blockFolderList[i]][key] = thisBlock[key];
        }
        // this makes sure that the type of the block is set.
        blockList[blockFolderList[i]].type = blockFolderList[i];

    }
    return blockList;
};

const setup = function (objects_, blockModules_, globalVariables_, engine_) {
    objects = objects_;
    blockModules = blockModules_;
    globalVariables = globalVariables_;
    engine = engine_;
};

module.exports = {
    addNewBlock: addNewBlock,
    deleteBlock: deleteBlock,
    postBlockPosition: postBlockPosition,
    triggerBlockSearch: triggerBlockSearch,
    triggerBlock: triggerBlock,
    getLogicBlockList: getLogicBlockList,
    setup: setup
};
