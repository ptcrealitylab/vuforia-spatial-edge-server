const utilities = require('./utilities');
const Link = require('../models/Link');
var linkController;
// Pointers populated from server.js with setup()
var objects = {};
var sceneGraph = {};

exports.setup = function (_objects, _sceneGraph, _knownObjects, _socketArray, _globalVariables, _hardwareAPI, objectsPath, _linkController) {
    objects = _objects;
    sceneGraph = _sceneGraph;
    linkController = _linkController;
};

exports.deepCopy = utilities.deepCopy;

exports.searchNodeByType = function (nodeType, _object, tool, node, callback) {
    let thisObjectKey = _object;
    if (!(_object in objects)) {
        thisObjectKey = utilities.getObjectIdFromTargetOrObjectFile(_object);
    }
    let thisObject = utilities.getObject(objects, thisObjectKey);
    if (!tool && !node) {
        utilities.forEachFrameInObject(thisObject, function (thisTool, toolKey) {
            utilities.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
                if (thisNode.type === nodeType) callback(thisObjectKey, toolKey, nodeKey);
            });
        });
    } else if (!node) {
        let thisTool = utilities.getFrame(objects, thisObjectKey, tool);
        if (!thisTool) {
            thisTool = utilities.getFrame(objects, thisObjectKey, thisObjectKey + tool);
        }
        utilities.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
            if (thisNode.type === nodeType) {
                callback(thisObjectKey, tool, nodeKey);
            }
        });

    } else if (!tool) {
        utilities.forEachFrameInObject(thisObject, function (tool, toolKey) {
            let thisNode = utilities.getFrame(objects, thisObjectKey, toolKey, node);
            if (!thisNode) {
                if (thisNode.type === nodeType) callback(thisObjectKey, toolKey, node);
            }
        });
    }
};

exports.createLink = function (originObject, _originTool, originNode, destinationObject, destinationTool, destinationNode) {

    let originTool = _originTool;
    if (!utilities.getFrame(objects, originObject, _originTool)) {
        originTool = originObject + _originTool;
    }
    var linkBody = new Link();
    linkBody.objectA = originObject;
    linkBody.frameA = originTool;
    linkBody.nodeA = originNode;
    linkBody.objectB = destinationObject;
    linkBody.frameB = destinationTool;
    linkBody.nodeB = destinationNode;
    linkController.newLink(originObject, originTool, 'link' + utilities.uuidTime(), linkBody);
};

exports.deleteLink = function (object, tool, link) {
    linkController.deleteLink(object, tool, link, 'server');
};

exports.getWorldObject = function (object) {
    let thisObject = utilities.getObject(objects, object);
    if (thisObject) {
        if (thisObject.hasOwnProperty('worldId')) {
            return thisObject.worldId;
        }
    }
    return null;
};

exports.getWorldLocation = function (objectID) {
    return sceneGraph.getWorldPosition(objectID);
};

