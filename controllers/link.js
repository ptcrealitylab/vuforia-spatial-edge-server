const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var objects = {};
var knownObjects = {};
var socketArray = {};
var globalVariables;
var hardwareAPI;
var objectsPath;
var socketUpdater;
var engine;

/**
 * Extracts a nicely structured set of data about the link
 * @param {Link} fullEntry
 * @param wasAdded
 * @return {*}
 */
function getLinkData(fullEntry, wasAdded) {
    var linkAddedData = null;

    if (fullEntry) {
        // console.log('getLinkData', fullEntry);

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
const newLink = function (objectID, frameID, linkID, body) {

    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectID, frameID);
    if (foundFrame) {
        console.log('found frame to add link to');

        // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
        // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
        body.loop = (body.objectA === body.objectB &&
            body.frameA === body.frameB &&
            body.nodeA === body.nodeB);

        utilities.forEachLinkInFrame(utilities.getFrame(objects, body.objectA, body.frameA), function (thisLink) {
            if (!body.loop) {
                console.log('link already exists');
                body.loop = (body.objectA === thisLink.objectA &&
                    body.objectB === thisLink.objectB &&
                    body.frameA === thisLink.frameA &&
                    body.frameB === thisLink.frameB &&
                    body.nodeA === thisLink.nodeA &&
                    body.nodeB === thisLink.nodeB
                );
            }
        });


        if (!body.loop) {
            foundFrame.links[linkID] = body;
            console.log('added link: ' + linkID);
            // write the object state to the permanent storage.
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            // check if link is complex data type. If yes trigger engine only for this single link
            if (foundFrame.nodes.hasOwnProperty(body.nodeA)) {
                let thisNode = foundFrame.nodes[body.nodeA];
                if (thisNode.data.hasOwnProperty('mode')) {
                    if (thisNode.data.mode === 'c') {
                        engine.trigger(body.objectA, body.frameA, body.nodeA, thisNode, linkID);
                    }
                }
            }

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
            setTimeout(function() {
                utilities.actionSender({reloadLink: {object: objectID, frame: frameID}, lastEditor: body.lastEditor});
            }, 100);

            updateStatus = 'added';
        } else {
            updateStatus = 'found endless Loop';
        }
    }
    return updateStatus;
};

/**
 * Deletes a regular link from the frame it begins from.
 * Also delete the websocket to this link's destination server IP if it was the last link from this server to that one.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {string} editorID
 */
const deleteLink = function (objectKey, frameKey, linkKey, editorID) {
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
};

/**
 * Sets a lock password on the specified link.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {{lockPassword: string, lockType: string}} body
 */
const addLinkLock = function (objectKey, frameKey, linkKey, body) {
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
};

/**
 * Removes the lock on the specified link if using the correct password.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {string} password
 */
const deleteLinkLock = function (objectKey, frameKey, linkKey, password) {
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
};

const setup = function (objects_, knownObjects_, socketArray_, globalVariables_, hardwareAPI_, objectsPath_, socketUpdater_, engine_) {
    objects = objects_;
    knownObjects = knownObjects_;
    socketArray = socketArray_;
    globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    objectsPath = objectsPath_;
    socketUpdater = socketUpdater_;
    engine = engine_;
};

module.exports = {
    newLink: newLink,
    deleteLink: deleteLink,
    addLinkLock: addLinkLock,
    deleteLinkLock: deleteLinkLock,
    setup: setup
};
