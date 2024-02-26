const fsProm = require('../persistence/fsProm.js');
const formidable = require('formidable');
const utilities = require('../libraries/utilities');
const {mkdirIfNotExists, unlinkIfExists} = utilities;
const EdgeBlock = require('../models/EdgeBlock');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var objectsPath;
const {identityFolderName} = require('../constants.js');
const {isLightweightMobile} = require('../isMobile.js');
let Jimp;
if (!isLightweightMobile) {
    try {
        Jimp = require('jimp');
    } catch (e) {
        console.warn('Unable to import jimp for image resizing on this platform', e);
    }
}


/**
 * Adds the Logic Node contained in the body to the specified frame.
 * Creates some state (edge blocks) necessary for the server data processing that doesn't exist in the client.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {Node} body
 * @return {string}
 */
const addLogicNode = function (objectID, frameID, nodeID, body) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectID, frameID);
    if (foundFrame) {

        foundFrame.nodes[nodeID] = body;
        var newNode = foundFrame.nodes[nodeID];

        // edge blocks are used to transition data between node links going into the red/yellow/green/blue ports...
        // ...and the corresponding blocks / block links within the crafting board
        newNode.blocks['in0'] = new EdgeBlock();
        newNode.blocks['in1'] = new EdgeBlock();
        newNode.blocks['in2'] = new EdgeBlock();
        newNode.blocks['in3'] = new EdgeBlock();

        newNode.blocks['out0'] = new EdgeBlock();
        newNode.blocks['out1'] = new EdgeBlock();
        newNode.blocks['out2'] = new EdgeBlock();
        newNode.blocks['out3'] = new EdgeBlock();

        newNode.type = 'logic';

        // call an action that asks all devices to reload their links, once the links are changed.
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
        utilities.actionSender({
            reloadNode: {object: objectID, frame: frameID, node: nodeID},
            lastEditor: body.lastEditor
        });

        updateStatus = 'added';
    }
    return updateStatus;
};

/**
 * Deletes the specified Logic Node.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {string} lastEditor
 * @return {string}
 */
const deleteLogicNode = function (objectID, frameID, nodeID, lastEditor) {
    var updateStatus = 'nothing happened';

    var foundFrame = utilities.getFrame(objects, objectID, frameID);
    if (foundFrame) {
        try {
            foundFrame.nodes[nodeID].deconstruct();
        } catch (e) {
            console.warn('(Logic) Node exists without proper prototype: ' + nodeID);
        }
        delete foundFrame.nodes[nodeID];

        //todo check all links as well in object
        // Make sure that no links are connected to deleted objects
        /*  for (var subCheckerKey in  objects[req.params[0]].links) {

              if (objects[req.params[0]].links[subCheckerKey].nodeA === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectA === req.params[0]) {
                  delete objects[req.params[0]].links[subCheckerKey];
              }
              if (objects[req.params[0]].links[subCheckerKey].nodeB === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectB === req.params[0]) {
                  delete objects[req.params[0]].links[subCheckerKey];
              }
          }*/

        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
        utilities.actionSender({
            reloadNode: {object: objectID, frame: frameID, node: nodeID},
            lastEditor: lastEditor
        });

        updateStatus = 'deleted: ' + nodeID + ' in frame: ' + frameID + ' of object: ' + objectID;
    }
    return updateStatus;
};

/**
 * Updates the position and size of a specified node.
 * @param {string} objectID
 * @param {string} frameID
 * @param {string} nodeID
 * @param {{x: number|undefined, y: number|undefined, scale: number|undefined, matrix: Array.<number>|undefined}} body
 * @param {function} callback
 */
function changeNodeSize(objectID, frameID, nodeID, body, callback) {
    var updateStatus = 'nothing happened';

    utilities.getNodeAsync(objects, objectID, frameID, nodeID, async function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        // check that the numbers are valid numbers..
        if (typeof body.x === 'number' && typeof body.y === 'number' && typeof body.scale === 'number') {
            node.x = body.x;
            node.y = body.y;
            node.scale = body.scale;
            updateStatus = 'ok';
        }

        if (typeof body.matrix === 'object') {
            node.matrix = body.matrix;
            updateStatus = 'ok';
        }

        // if anything updated, write to disk and broadcast updates to editors
        if (updateStatus === 'ok') {
            await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
            utilities.actionSender({
                reloadObject: {object: objectID, frame: frameID, node: nodeID},
                lastEditor: body.lastEditor
            });
        }

        callback(200, updateStatus);
    });
}

function rename(objectID, frameID, nodeID, body, callback) {
    utilities.getNodeAsync(objects, objectID, frameID, nodeID, async function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        node.name = body.nodeName;

        await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);

        callback(200, {success: true});
    });
}

function uploadIconImage(objectID, frameID, nodeID, req, callback) {
    utilities.getNodeAsync(objects, objectID, frameID, nodeID, async function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        var iconDir = objectsPath + '/' + object.name + '/' + identityFolderName + '/logicNodeIcons';

        await mkdirIfNotExists(iconDir);

        var form = new formidable.IncomingForm({
            uploadDir: iconDir,
            keepExtensions: true,
            accept: 'image/jpeg'
        });

        form.on('error', function (err) {
            callback(500, err);
            return;
        });

        var rawFilepath = form.uploadDir + '/' + nodeID + '_fullSize.jpg';

        await unlinkIfExists(rawFilepath);

        form.on('fileBegin', function (name, file) {
            file.path = rawFilepath;
        });

        form.parse(req, async function (err, _fields) {
            if (err) {
                console.warn('logicNode form error', err);
            }

            var resizedFilepath = form.uploadDir + '/' + nodeID + '.jpg';

            await unlinkIfExists(resizedFilepath);

            // copied fullsize file into resized image file as backup, in case resize operation fails
            await fsProm.copyFile(rawFilepath, resizedFilepath);

            if (Jimp) {
                Jimp.read(rawFilepath).then(image => {
                    return image.resize(200, 200).write(resizedFilepath);
                }).then(async () => {
                    if (node) {
                        node.iconImage = 'custom'; //'http://' + object.ip + ':' + serverPort + '/logicNodeIcon/' + object.name + '/' + nodeID + '.jpg';
                        await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
                        utilities.actionSender({
                            loadLogicIcon: {
                                object: objectID,
                                frame: frameID,
                                node: nodeID,
                                ip: object.ip,
                                iconImage: node.iconImage
                            }
                        }); // TODO: decide whether to send filepath directly or just tell it to reload the logic node from the server... sending directly is faster, fewer side effects
                    }
                    callback(200, {success: true});
                }).catch(imageErr => {
                    console.error('Error resizing image', imageErr);
                    callback(500, imageErr);
                });
            }
        });
    });
}

const setup = function(objects_, globalVariables_, objectsPath_) {
    objects = objects_;
    globalVariables = globalVariables_;
    objectsPath = objectsPath_;
};

module.exports = {
    addLogicNode: addLogicNode,
    deleteLogicNode: deleteLogicNode,
    changeNodeSize: changeNodeSize,
    rename: rename,
    uploadIconImage: uploadIconImage,
    setup: setup
};
