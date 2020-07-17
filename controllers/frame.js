const fs = require('fs');
const path = require('path');

const utilities = require('../libraries/utilities');
const Frame = require('../models/Frame');
const Node = require('../models/Node');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var hardwareAPI;
var dirname;
var objectsPath;
var identityFolderName;
var nodeTypeModules;

/**
 * Adds a provided frame to the specified object
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {Frame} frame
 * @param {*} res
 */
const addFrameToObject = function (objectKey, frameKey, frame, callback) {
    utilities.getObjectAsync(objects, objectKey, function (error, object) {

        if (error) {
            callback(404, error);
            return;
        }

        if (!frame.src) {
            callback(500, {failure: true, error: 'frame must have src'});
            return;
        }

        if (!object.frames) {
            object.frames = {};
        }

        utilities.createFrameFolder(object.name, frame.name, dirname, objectsPath, globalVariables.debug, frame.location);

        var newFrame = new Frame(frame.objectId, frameKey);
        newFrame.name = frame.name;
        newFrame.visualization = frame.visualization;
        newFrame.ar = frame.ar;
        newFrame.screen = frame.screen;
        newFrame.visible = frame.visible;
        newFrame.visibleText = frame.visibleText;
        newFrame.visibleEditing = frame.visibleEditing;
        newFrame.developer = frame.developer;
        newFrame.links = frame.links;
        // cast JSON data to Node objects
        newFrame.setNodesFromJson(frame.nodes); // instead of newFrame.nodes = frame.nodes;
        newFrame.location = frame.location;
        newFrame.src = frame.src;
        newFrame.width = frame.width;
        newFrame.height = frame.height;

        // give default values for this node type to each node's public data, if not already assigned
        for (let key in newFrame.nodes) {
            if ((!frame.publicData || Object.keys(frame.publicData).length <= 0) && (!newFrame.nodes[key].publicData || Object.keys(newFrame.nodes[key].publicData).length <= 0)) {
                newFrame.nodes[key].publicData = JSON.parse(JSON.stringify(nodeTypeModules[newFrame.nodes[key].type].properties.publicData));
            }
        }

        object.frames[frameKey] = newFrame;

        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
        utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: frame.lastEditor});

        // notifies any open screens that a new frame was added
        hardwareAPI.runFrameAddedCallbacks(objectKey, newFrame);

        callback(200, {success: true, frameId: frameKey});
    });
};

const deletePublicData = function(objectID, frameID, callback) {
    // locate the containing frame in a safe way
    utilities.getFrameAsync(objects, objectID, frameID, function (error, object, frame) {
        if (error) {
            callback(404, error);
            return;
        }

        // reset the publicData of each node
        utilities.forEachNodeInFrame(frame, function (node) {
            node.publicData = {};
        });

        // save state to object.json
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        callback(200, {success: true});
    });
};

const addPublicData = function(objectID, frameID, body, callback) {
    var publicData = body.publicData;

    // locate the containing frame in a safe way
    utilities.getFrameAsync(objects, objectID, frameID, function (error, object, frame) {
        if (error) {
            callback(404, error);
            return;
        }

        // the keys inside publicData are the names of the node that the data belongs to
        for (var nodeName in publicData) {

            // find the node with the same name
            var nodeKey = frameID + nodeName;
            if (!frame.nodes.hasOwnProperty(nodeKey)) continue;

            var node = frame.nodes[nodeKey];
            if (node) {
                // and set its public data to the correctly indexed data
                node.publicData = publicData[nodeName];
            }
        }

        // save state to object.json
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        callback(200, {success: true});
    });
};

const copyFrame = function(objectID, frameID, body, callback) {
    console.log('making a copy of frame', frameID);

    utilities.getFrameAsync(objects, objectID, frameID, function (error, object, frame) {
        if (error) {
            callback(404, error);
            return;
        }

        if (frame.location !== 'global') {
            return;
        }

        // don't need to create a folder because we already ensured it is a global frame
        // (otherwise we would need... utilities.createFrameFolder(object.name, frame.name, ... )

        var newName = frame.src + utilities.uuidTime();
        var newFrameKey = objectID + newName;

        var newFrame = new Frame(frame.objectId, newFrameKey);
        newFrame.name = newName;
        newFrame.visualization = frame.visualization;
        // deep clone ar by value, not reference, otherwise posting new position for one might affect the other
        newFrame.ar = {
            x: frame.ar.x,
            y: frame.ar.y,
            scale: frame.ar.scale,
            matrix: frame.ar.matrix
        };
        // deep clone screen by value, not reference
        newFrame.screen = {
            x: frame.screen.x,
            y: frame.screen.y,
            scale: frame.screen.scale
        };
        newFrame.visible = frame.visible;
        newFrame.visibleText = frame.visibleText;
        newFrame.visibleEditing = frame.visibleEditing;
        newFrame.developer = frame.developer;
        newFrame.links = frame.links;

        // perform a deep clone of the nodes so it copies by value, not reference
        newFrame.nodes = {}; // adjust node keys, etc, for copy
        for (var oldNodeKey in frame.nodes) {
            if (!frame.nodes.hasOwnProperty(oldNodeKey)) continue;
            var oldNode = frame.nodes[oldNodeKey];
            var newNodeKey = newFrameKey + oldNode.name;
            var newNode = new Node(oldNode.name, oldNode.type, objectID, newFrameKey, newNodeKey);
            for (var propertyKey in oldNode) {
                if (!oldNode.hasOwnProperty(propertyKey)) continue;
                newNode[propertyKey] = oldNode[propertyKey];
            }
            newFrame.nodes[newNodeKey] = newNode;
        }

        newFrame.location = frame.location;
        newFrame.src = frame.src;
        newFrame.width = frame.width;
        newFrame.height = frame.height;
        object.frames[newFrameKey] = newFrame;

        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        // TODO: by not sending action sender, we assume this is a screen frame -- is that an ok assumption?
        // utilities.actionSender({reloadObject: {object: objectID}, lastEditor: frame.lastEditor});
        utilities.actionSender({
            reloadFrame: {object: objectID, frame: newFrameKey},
            lastEditor: body.lastEditor
        });

        hardwareAPI.runFrameAddedCallbacks(objectID, newFrame); // creates frame in screen hardware interface

        callback(200, {success: true, frameId: newFrameKey, frame: newFrame});
    });
};

const updateFrame = function(objectID, frameID, body, callback) {
    utilities.getObjectAsync(objects, objectID, function (error, object) {
        if (error) {
            callback(404, error);
            return;
        }

        var frame = body;

        if (!frame.src) {
            callback(500, {failure: true, error: 'frame must have src'});
            return;
        }

        if (!object.frames) {
            object.frames = {};
        }

        frame.loaded = false;
        // Copy over all properties of frame
        Object.assign(object.frames[frameID], frame);

        let newFrame = new Frame(frame.objectId, frame.uuid);
        newFrame.setFromJson(frame);
        object.frames[frameID] = newFrame;

        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

        utilities.actionSender({reloadObject: {object: objectID}, lastEditor: body.lastEditor});

        callback(200, {success: true});
    });
};

const deleteFrame = function(objectId, frameId, body, callback) {
    console.log('delete frame from server', objectId, frameId);

    var object = utilities.getObject(objects, objectId);
    if (!object) {
        callback(404, {failure: true, error: 'object ' + objectId + ' not found'});
        return;
    }

    var frame = object.frames[frameId];
    if (!frame) {
        callback(404, {failure: true, error: 'frame ' + frameId + ' not found'});
        return;
    }

    //delete any videos associated with the frame, if necessary
    // var isPublicDataOnFrame = frame.publicData.hasOwnProperty('data');
    var publicDataOnAllNodes = Object.keys(frame.nodes).map(function (nodeKey) {
        return frame.nodes[nodeKey].publicData;
    });
    var videoPaths = publicDataOnAllNodes.filter(function (publicData) {
        if (publicData.hasOwnProperty('data') && typeof publicData.data === 'string') {
            if (publicData.data.indexOf('http') > -1 && publicData.data.indexOf('.mp4') > -1) {
                return true;
            }
        }
        return false;
    }).map(function (publicData) {
        return publicData.data;
    });
    console.log('frame being deleted contains these video paths: ', videoPaths);
    videoPaths.forEach(function (videoPath) {
        // convert videoPath into path on local filesystem // TODO: make this independent on OS path-extensions
        var urlArray = videoPath.split('/');

        var objectName = urlArray[4];
        var videoDir = utilities.getVideoDir(objectsPath, identityFolderName, globalVariables.isMobile, objectName);
        var videoFilePath = path.join(videoDir, urlArray[6]);

        if (fs.existsSync(videoFilePath)) {
            fs.unlinkSync(videoFilePath);
        }
    });

    var objectName = object.name;
    var frameName = object.frames[frameId].name;

    try {
        object.frames[frameId].deconstruct();
    } catch (e) {
        console.warn('Frame exists without proper prototype: ' + frameId);
    }
    delete object.frames[frameId];

    // remove the frame directory from the object
    utilities.deleteFrameFolder(objectName, frameName, objectsPath);

    // Delete frame's nodes // TODO: I don't think this is updated for the current object/frame/node hierarchy
    var deletedNodes = {};
    for (var nodeId in object.nodes) {
        var node = object.nodes[nodeId];
        if (node.frame === frameId) {
            deletedNodes[nodeId] = true;
            delete object.nodes[nodeId];
        }
    }

    // Delete links involving frame's nodes
    utilities.forEachObject(objects, function (linkObject, linkObjectId) {
        var linkObjectHasChanged = false;

        for (var linkId in linkObject.links) { // TODO: this isn't updated for frames either
            var link = linkObject.links[linkId];
            if (link.objectA === objectId || link.objectB === objectId) {
                if (deletedNodes[link.nodeA] || deletedNodes[link.nodeB]) {
                    linkObjectHasChanged = true;
                    delete linkObject.links[linkId];
                }
            }
        }

        if (linkObjectHasChanged) {
            utilities.writeObjectToFile(objects, linkObjectId, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({reloadObject: {object: linkObjectId}, lastEditor: body.lastEditor});
        }
    });

    // write changes to object.json
    utilities.writeObjectToFile(objects, objectId, objectsPath, globalVariables.saveToDisk);
    utilities.actionSender({reloadObject: {object: objectId}, lastEditor: body.lastEditor});

    callback(200, {success: true});
};

const setGroup = function(objectID, frameID, body, callback) {
    var frame = utilities.getFrame(objects, objectID, frameID);
    if (frame) {
        var newGroupID = body.group;
        if (newGroupID !== frame.groupID) {
            frame.groupID = newGroupID;
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({
                reloadFrame: {object: objectID, frame: frameID},
                lastEditor: body.lastEditor
            });
            callback(200, {success: true});
            return;
        }
    }

    callback(404, {success: false, error: 'Couldn\'t find frame ' + frameID + ' to set groupID'});
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

/**
 * Sets the visualization to
 * @param objectKey
 * @param frameKey
 * @param { {visualization: string, oldVisualizationPositionData: {{x: number, y: number, scale: number, matrix: Array.<number>}}|undefined } body
 * @param res
 */
const changeVisualization = function(objectKey, frameKey, body, callback) {
    console.log('change visualization');

    var newVisualization = body.visualization;
    var oldVisualizationPositionData = body.oldVisualizationPositionData;

    var frame = utilities.getFrame(objects, objectKey, frameKey);
    if (frame) {

        // if changing from ar -> screen, optionally provide default values for ar.x, ar.y, so that it'll be there when you switch back
        // if changing from screen -> ar, sets screen.x, screen.y, etc
        if (oldVisualizationPositionData) {
            var oldVisualization = frame.visualization;
            frame[oldVisualization] = oldVisualizationPositionData;
        }
        frame.visualization = newVisualization;

        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
        callback(200, {success: true});
    } else {
        callback(404, {failure: true, error: 'frame ' + frameKey + ' not found on ' + objectKey});
    }
};

const resetPositioning = function(objectID, frameID, callback) {
    var frame = utilities.getFrame(objects, objectID, frameID);
    frame.ar = {
        x: 0,
        y: 0,
        scale: 1,
        matrix: []
    };
    // position data for the screen visualization mode
    frame.screen = {
        x: 0,
        y: 0,
        scale: 1,
        matrix: []
    };
    utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
    callback(200, 'ok');
};

const getFrame = function(objectID, frameID) {
    return utilities.getFrame(objects, objectID, frameID);
};

const setup = function (objects_, globalVariables_, hardwareAPI_, dirname_, objectsPath_, identityFolderName_, nodeTypeModules_) {
    objects = objects_;
    globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    dirname = dirname_;
    objectsPath = objectsPath_;
    identityFolderName = identityFolderName_;
    nodeTypeModules = nodeTypeModules_;
};

module.exports = {
    addFrameToObject: addFrameToObject,
    deletePublicData: deletePublicData,
    addPublicData: addPublicData,
    copyFrame: copyFrame,
    updateFrame: updateFrame,
    deleteFrame: deleteFrame,
    setGroup: setGroup,
    changeSize: changeSize,
    changeVisualization: changeVisualization,
    resetPositioning: resetPositioning,
    getFrame: getFrame,
    setup: setup
};
