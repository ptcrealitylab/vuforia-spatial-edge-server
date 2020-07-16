const fs = require('fs');
const formidable = require('formidable');
const utilities = require('../libraries/utilities');
const EdgeBlock = require('../models/EdgeBlock');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var objectsPath;
var identityFolderName;
var Jimp;

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
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        utilities.actionSender({
            reloadNode: {object: objectID, frame: frameID, node: nodeID},
            lastEditor: body.lastEditor
        });

        console.log('added logic node: ' + nodeID);
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
        console.log('deleted node: ' + nodeID);

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

        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
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

    console.log('changing Size for :' + objectID + ' : ' + nodeID);

    utilities.getNodeAsync(objects, objectID, frameID, nodeID, function (error, object, frame, node) {
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
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({
                reloadObject: {object: objectID, frame: frameID, node: nodeID},
                lastEditor: body.lastEditor
            });
        }

        callback(200, updateStatus);
    });
}

function rename(objectID, frameID, nodeID, body, callback) {
    console.log('received name for', objectID, frameID, nodeID);

    utilities.getNodeAsync(objects, objectID, frameID, nodeID, function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        node.name = body.nodeName;

        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        callback(200, {success: true});
    });
}

function uploadIconImage(objectID, frameID, nodeID, req, callback) {
    console.log('received icon image for', objectID, frameID, nodeID);

    utilities.getNodeAsync(objects, objectID, frameID, nodeID, function (error, object, frame, node) {
        if (error) {
            callback(404, error);
            return;
        }

        var iconDir = objectsPath + '/' + object.name + '/' + identityFolderName + '/logicNodeIcons';
        if (!fs.existsSync(iconDir)) {
            fs.mkdirSync(iconDir);
        }

        var form = new formidable.IncomingForm({
            uploadDir: iconDir,
            keepExtensions: true,
            accept: 'image/jpeg'
        });

        console.log('created form');

        form.on('error', function (err) {
            callback(500, err);
            return;
        });

        var rawFilepath = form.uploadDir + '/' + nodeID + '_fullSize.jpg';

        if (fs.existsSync(rawFilepath)) {
            console.log('deleted old raw file');
            fs.unlinkSync(rawFilepath);
        }

        form.on('fileBegin', function (name, file) {
            console.log('fileBegin loading', name, file);
            file.path = rawFilepath;
        });

        console.log('about to parse');

        form.parse(req, function (err, fields) {
            console.log('successfully created icon image', err, fields);

            var resizedFilepath = form.uploadDir + '/' + nodeID + '.jpg';
            console.log('attempting to write file to ' + resizedFilepath);

            if (fs.existsSync(resizedFilepath)) {
                console.log('deleted old resized file');
                fs.unlinkSync(resizedFilepath);
            }

            // copied fullsize file into resized image file as backup, in case resize operation fails
            fs.copyFileSync(rawFilepath, resizedFilepath);

            if (Jimp) {
                Jimp.read(rawFilepath).then(image => {
                    return image.resize(200, 200).write(resizedFilepath);
                }).then(() => {
                    console.log('done resizing');

                    if (node) {
                        node.iconImage = 'custom'; //'http://' + object.ip + ':' + serverPort + '/logicNodeIcon/' + object.name + '/' + nodeID + '.jpg';
                        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
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
                }).catch(err => {
                    console.log('error resizing', err);
                    callback(500, err);
                });
            }
        });
    });
}

const setup = function(objects_, globalVariables_, objectsPath_, identityFolderName_, Jimp_) {
    objects = objects_;
    globalVariables = globalVariables_;
    objectsPath = objectsPath_;
    identityFolderName = identityFolderName_;
    Jimp = Jimp_;
};

module.exports = {
    addLogicNode: addLogicNode,
    deleteLogicNode: deleteLogicNode,
    changeNodeSize: changeNodeSize,
    rename: rename,
    uploadIconImage: uploadIconImage,
    setup: setup
};
