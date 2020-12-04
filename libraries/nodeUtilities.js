const utilities = require('./utilities');
const Link = require('../models/Link');
var linkController;
// Pointers populated from server.js with setup()
var objects = {};
var knownObjects = {};
var socketArray = {};
var globalVariables = {};
var hardwareAPI = {};
var objectsPath = {};

exports.setup = function (_objects, _knownObjects, _socketArray, _globalVariables, _hardwareAPI, _objectsPath, _linkController) {
    objects = _objects;
    knownObjects = _knownObjects;
    socketArray = _socketArray;
    globalVariables = _globalVariables;
    hardwareAPI = _hardwareAPI;
    objectsPath = _objectsPath;
    linkController = _linkController;
};

exports.deepCopy = utilities.deepCopy;

exports.searchNodeByType = function (nodeType, object, tool, node, callback) {

    let thisObject = utilities.getObject(objects, object);

    if (!tool && !node) {
        utilities.forEachFrameInObject(thisObject, function (thisTool, toolKey) {
            utilities.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
                if (thisNode.type === nodeType) callback(object, toolKey, nodeKey);
            });
        });
    } else if (!node) {
        let thisTool = utilities.getFrame(objects, object, tool);
        utilities.forEachNodeInFrame(thisTool, function (thisNode, nodeKey) {
            if (thisNode.type === nodeType) callback(object, tool, nodeKey);
        });

    } else if (!tool) {
        utilities.forEachFrameInObject(thisObject, function (tool, toolKey) {
            let thisNode = utilities.getFrame(objects, toolKey, node);
            if (!thisNode) {
                if (thisNode.type === nodeType) callback(object, toolKey, node);
            }
        });
    }
};

exports.createLink = function (originObject, originTool, originNode, destinationObject, destinationTool, destinationNode) {
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

