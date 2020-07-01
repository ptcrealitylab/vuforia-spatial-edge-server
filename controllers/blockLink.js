const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var objectsPath;

/**
 * Adds a new link with the provided linkID to the specified node.
 * Doesn't add it if it detects an infinite loop.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {string} linkID
 * @param {Link} body
 * @return {string}
 */
const addLogicLink = function (objectID, frameID, nodeID, linkID, body) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);
    if (foundNode) {
        foundNode.links[linkID] = body;
        var thisLink = foundNode.links[linkID];

        thisLink.loop = false;
        // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
        // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
        if (thisLink.nodeA === thisLink.nodeB && thisLink.logicA === thisLink.logicB) {
            thisLink.loop = true;
        }

        if (!thisLink.loop) {
            // call an action that asks all devices to reload their links, once the links are changed.
            utilities.actionSender({
                reloadNode: {object: objectID, frame: frameID, node: nodeID},
                lastEditor: body.lastEditor
            });
            // check if there are new connections associated with the new link.
            // write the object state to the permanent storage.
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            console.log('added link: ' + linkID);
            updateStatus = 'added';
        } else {
            updateStatus = 'found endless Loop';
        }
    }
    return updateStatus;
}

const deleteLogicLink = function (objectID, frameID, nodeID, linkID, lastEditor) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectID, frameID, nodeID);
    if (foundNode) {
        delete foundNode.links[linkID];

        utilities.actionSender({
            reloadNode: {object: objectID, frame: frameID, node: nodeID},
            lastEditor: lastEditor
        });
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        console.log('deleted link: ' + linkID);
        updateStatus = 'deleted: ' + linkID + ' in logic ' + nodeID + ' in frame: ' + frameID + ' from object: ' + objectID;
    }
    return updateStatus;
}

const setup = function (objects_, globalVariables_, objectsPath_) {
    objects = objects_;
    globalVariables = globalVariables_;
    objectsPath = objectsPath_;
}

module.exports = {
    addLogicLink: addLogicLink,
    deleteLogicLink: deleteLogicLink,
    setup: setup
};