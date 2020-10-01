const utilities = require('../libraries/utilities');
const Node = require('../models/Node');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var objectsPath;

/**
 * Creates a node on the frame specified frame.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {*} req
 * @param {*} res
 * @todo don't pass in req and res, instead callback that triggers status code / err / res
 */
const addNodeToFrame = function (objectKey, frameKey, nodeKey, body, callback) {
    var errorMessage = null;

    var foundObject = utilities.getObject(objects, objectKey);
    if (foundObject) {
        var foundFrame = utilities.getFrame(objects, objectKey, frameKey);
        if (foundFrame) {
            let node = new Node(body.name, body.type, objectKey, frameKey, nodeKey);

            // copy over any additionally-defined properties (node position)
            if (typeof body.x !== 'undefined') {
                node.x = body.x;
            }
            if (typeof body.y !== 'undefined') {
                node.y = body.y;
            }
            if (typeof body.scale !== 'undefined') {
                node.scale = body.scale;
            }
            if (typeof body.matrix !== 'undefined') {
                node.matrix = body.matrix;
            }

            foundFrame.nodes[nodeKey] = node;
            utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: body.lastEditor});
        } else {
            errorMessage = 'Object ' + objectKey + ' frame ' + frameKey + ' not found';
        }
    } else {
        errorMessage = 'Object ' + objectKey + ' not found';
    }

    if (errorMessage) {
        callback(404, {failure: true, error: errorMessage});
    } else {
        callback(200, {success: 'true'});
    }
};

/**
 * Sets a lock password on the specified node.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {{lockPassword: string, lockType: string}} body
 */
const addNodeLock = function (objectKey, frameKey, nodeKey, body) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectKey, frameKey, nodeKey);
    if (foundNode) {
        var previousLockPassword = foundNode.lockPassword;
        var newLockPassword = body.lockPassword;
        var previousLockType = foundNode.lockType;
        var newLockType = body.lockType;

        var isLockActionAllowed = (!previousLockPassword && !!newLockPassword) ||
            (!!newLockPassword && previousLockPassword === newLockPassword && newLockType !== previousLockType);

        if (isLockActionAllowed) {
            foundNode.lockPassword = newLockPassword;
            foundNode.lockType = newLockType;

            utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadNode: {object: objectKey, frame: frameKey, node: nodeKey}});

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
 * Removes the lock on the specified node if using the correct password.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} password
 */
const deleteNodeLock = function (objectKey, frameKey, nodeKey, password) {
    var updateStatus = 'nothing happened';

    var foundNode = utilities.getNode(objects, objectKey, frameKey, nodeKey);
    if (foundNode) {
        if (password === foundNode.lockPassword || (globalVariables.debug && password === 'DEBUG')) { // TODO: remove DEBUG mode
            foundNode.lockPassword = null;
            foundNode.lockType = null;

            var object = utilities.getObject(objects, objectKey);
            utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadNode: {object: objectKey, frame: frameKey, node: nodeKey}});

            updateStatus = 'deleted';
        } else {
            updateStatus = 'not authorized to delete';
        }
    }

    return updateStatus;
};

/**
 * Updates the x, y, scale, and/or matrix for the specified frame or node
 * @todo this function is a mess, fix it up
 */
const changeSize = function (objectID, frameID, nodeID, body, callback) { // eslint-disable-line no-inner-declarations
    console.log('changing Size for :' + objectID + ' : ' + frameID + ' : ' + nodeID);

    utilities.getFrameOrNode(objects, objectID, frameID, nodeID, function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        var activeVehicle = node || frame; // use node if it found one, frame otherwise

        // console.log('really changing size for ... ' + activeVehicle.uuid, body);

        // console.log("post 2");
        var updateStatus = 'nothing happened';

        // the reality editor will overwrite all properties from the new frame except these.
        // useful to not overwrite AR position when sending pos or scale from screen.
        var propertiesToIgnore = [];

        // TODO: this is a hack to fix ar/screen synchronization, fix it
        // for frames, the position data is inside "ar" or "screen"
        if (activeVehicle.hasOwnProperty('visualization')) {
            if (activeVehicle.visualization === 'ar') {
                activeVehicle = activeVehicle.ar;
                propertiesToIgnore.push('screen');
            } else if (activeVehicle.visualization === 'screen') {
                if (typeof body.scale === 'number' && typeof body.scaleARFactor === 'number') {
                    activeVehicle.ar.scale = body.scale / body.scaleARFactor;
                }
                activeVehicle = activeVehicle.screen;
                propertiesToIgnore.push('ar.x', 'ar.y'); // TODO: decoding this is currently hard-coded in the editor, make generalized
            }
        }

        var didUpdate = false;

        // check that the numbers are valid numbers..
        if (typeof body.x === 'number' && typeof body.y === 'number' && typeof body.scale === 'number') {

            // if the object is equal the datapoint id, the item is actually the object it self.
            activeVehicle.x = body.x;
            activeVehicle.y = body.y;
            activeVehicle.scale = body.scale;

            if (typeof body.arX === 'number' && typeof body.arY === 'number') {
                frame.ar.x = body.arX;
                frame.ar.y = body.arY;
            }

            // console.log(req.body);
            // ask the devices to reload the objects
            didUpdate = true;
        }

        if (typeof body.matrix === 'object' && activeVehicle.hasOwnProperty('matrix')) {
            activeVehicle.matrix = body.matrix;
            didUpdate = true;
        }

        if (didUpdate) {
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({
                reloadFrame: {
                    object: objectID,
                    frame: frameID,
                    propertiesToIgnore: propertiesToIgnore,
                    wasTriggeredFromEditor: body.wasTriggeredFromEditor
                }, lastEditor: body.lastEditor
            });
            updateStatus = 'updated position and/or scale';
        }
        callback(200, updateStatus);
    });
};

const getNode = function (objectID, frameID, nodeID) {
    return utilities.getNode(objects, objectID, frameID, nodeID);
};

const setup = function (objects_, globalVariables_, objectsPath_) {
    objects = objects_;
    globalVariables = globalVariables_;
    objectsPath = objectsPath_;
};

module.exports = {
    addNodeToFrame: addNodeToFrame,
    addNodeLock: addNodeLock,
    deleteNodeLock: deleteNodeLock,
    changeSize: changeSize,
    getNode: getNode,
    setup: setup
};
