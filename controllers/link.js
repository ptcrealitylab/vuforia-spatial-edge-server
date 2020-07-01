const utilities = require('../libraries/utilities');

/**
 * Extracts a nicely structured set of data about the link
 * @param {Link} fullEntry
 * @param wasAdded
 * @return {*}
 */
function getLinkData(fullEntry, wasAdded) {
    var linkAddedData = null;

    if (fullEntry) {
        console.log('getLinkData', fullEntry);

        var linkObjectA = fullEntry['objectA'];
        var linkObjectB = fullEntry['objectB'];
        var linkFrameA = fullEntry['frameA'];
        var linkFrameB = fullEntry['frameB'];
        var linkNodeA = fullEntry['nodeA'];
        var linkNodeB = fullEntry['nodeB'];

        var objectAName = fullEntry['namesA'][0];
        var objectBName = fullEntry['namesB'][0];
        var frameAName = fullEntry['namesA'][1];
        var frameBName = fullEntry['namesB'][1];
        var nodeAName = fullEntry['namesA'][2]; // TODO: implement a single, safe way to get the object/frame/node (like in the editor) and return null if not found (instead of crashing)
        var nodeBName = fullEntry['namesB'][2];

        linkAddedData = {
            added: wasAdded,
            idObjectA: linkObjectA,
            idObjectB: linkObjectB,
            idFrameA: linkFrameA,
            idFrameB: linkFrameB,
            idNodeA: linkNodeA,
            idNodeB: linkNodeB,
            nameObjectA: objectAName,
            nameObjectB: objectBName,
            nameFrameA: frameAName,
            nameFrameB: frameBName,
            nameNodeA: nodeAName,
            nameNodeB: nodeBName
        };

    } else {
        console.log('thisObject does not exist');
    }
    return linkAddedData;
}

/**
 * Creates a link on the frame containing the node that the link starts from.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} linkID
 * @param {Link} body
 */
const newLink = function (objects, globalVariables, objectsPath, hardwareAPI, socketUpdater, objectID, frameID, linkID, body) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectID, frameID);
    if (foundFrame) {
        console.log('found frame to add link to');

        // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
        // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
        body.loop = (body.objectA === body.objectB &&
            body.frameA === body.frameB &&
            body.nodeA === body.nodeB);

        foundFrame.links[linkID] = body;

        if (!body.loop) {
            console.log('added link: ' + linkID);
            // write the object state to the permanent storage.
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            // check if there are new connections associated with the new link.
            socketUpdater();

            // notify subscribed interfaces that a new link was DELETED // TODO: make sure this is the right place for this
            var newLink = foundFrame.links[linkID];
            var linkAddedData = getLinkData(newLink, true);
            if (linkAddedData) {
                hardwareAPI.connectCall(linkAddedData.idObjectA, linkAddedData.idFrameA, linkAddedData.idNodeA, linkAddedData);
                hardwareAPI.connectCall(linkAddedData.idObjectB, linkAddedData.idFrameB, linkAddedData.idNodeB, linkAddedData);
            }

            // call an action that asks all devices to reload their links, once the links are changed.
            utilities.actionSender({reloadLink: {object: objectID, frame: frameID}, lastEditor: body.lastEditor});

            updateStatus = 'added';
        } else {
            updateStatus = 'found endless Loop';
        }
    }
    return updateStatus;
}

/**
 * Deletes a regular link from the frame it begins from.
 * Also delete the websocket to this link's destination server IP if it was the last link from this server to that one.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {string} editorID
 */
const deleteLink = function (objects, knownObjects, socketArray, globalVariables, objectsPath, hardwareAPI, objectKey, frameKey, linkKey, editorID) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectKey, frameKey);

    if (foundFrame) {
        var foundLink = foundFrame.links[linkKey];
        var destinationIp = knownObjects[foundLink.objectB];

        // notify subscribed interfaces that a new link was DELETED // TODO: make sure this is the right place for this
        var linkAddedData = getLinkData(foundLink, false);
        if (linkAddedData) {
            hardwareAPI.connectCall(linkAddedData.idObjectA, linkAddedData.idFrameA, linkAddedData.idNodeA, linkAddedData);
            hardwareAPI.connectCall(linkAddedData.idObjectB, linkAddedData.idFrameB, linkAddedData.idNodeB, linkAddedData);
        }

        delete foundFrame.links[linkKey];

        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
        utilities.actionSender({reloadLink: {object: objectKey, frame: frameKey}, lastEditor: editorID});

        // iterate over all frames in all objects to see if the destinationIp is still used by another link after this was deleted
        var checkIfIpIsUsed = false;
        utilities.forEachObject(objects, function (thisObject) {
            utilities.forEachFrameInObject(thisObject, function (thisFrame) {
                for (var linkCheckerKey in thisFrame.links) {
                    if (thisFrame.links[linkCheckerKey].objectB === foundLink.objectB) {
                        checkIfIpIsUsed = true;
                    }
                }
            });
        });

        // if the destinationIp isn't linked to at all anymore, delete the websocket to that server
        if (foundLink.objectB !== foundLink.objectA && !checkIfIpIsUsed) {
            delete socketArray[destinationIp];
        }

        console.log('deleted link: ' + linkKey);
        updateStatus = 'deleted: ' + linkKey + ' in object: ' + objectKey + ' frame: ' + frameKey;
    }
    return updateStatus;
}

/**
 * Sets a lock password on the specified link.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {{lockPassword: string, lockType: string}} body
 */
const addLinkLock = function (objects, globalVariables, objectsPath, objectKey, frameKey, linkKey, body) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectKey, frameKey);
    if (foundFrame) {
        var foundLink = foundFrame.links[linkKey];

        var previousLockPassword = foundLink.lockPassword;
        var newLockPassword = body.lockPassword;
        var previousLockType = foundLink.lockType;
        var newLockType = body.lockType;

        var isLockActionAllowed = (!previousLockPassword && !!newLockPassword) ||
            (!!newLockPassword && previousLockPassword === newLockPassword && newLockType !== previousLockType);

        if (isLockActionAllowed) {
            foundLink.lockPassword = newLockPassword;
            foundLink.lockType = newLockType;

            var object = utilities.getObject(objects, objectKey);
            utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadLink: {object: object}});

            updateStatus = 'added';

        } else {
            if (previousLockPassword === newLockPassword) {
                updateStatus = 'already locked by this user';
            } else {
                updateStatus = 'not authorized to add';
            }
        }
    }
    return updateStatus;
}

/**
 * Removes the lock on the specified link if using the correct password.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {string} password
 */
const deleteLinkLock = function (objects, globalVariables, objectsPath, objectKey, frameKey, linkKey, password) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectKey, frameKey);
    if (foundFrame) {
        var foundLink = foundFrame.links[linkKey];
        if (password === foundLink.lockPassword || password === 'DEBUG') { // TODO: remove DEBUG mode
            foundLink.lockPassword = null;
            foundLink.lockType = null;

            var object = utilities.getObject(objects, objectKey);
            utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadLink: {object: objectKey}});

            updateStatus = 'deleted';
        } else {
            updateStatus = 'not authorized to delete';
        }
    }
    return updateStatus;
}

module.exports = {
    newLink: newLink,
    deleteLink: deleteLink,
    addLinkLock: addLinkLock,
    deleteLinkLock: deleteLinkLock
};