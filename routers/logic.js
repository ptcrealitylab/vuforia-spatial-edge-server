const express = require('express');
const router = express.Router();

const blockController = require('../controllers/block.js');
const blockLinkController = require('../controllers/blockLink.js');
const logicNodeController = require('../controllers/logicNode.js');
const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var globalVariables;

// logic links
router.delete('/:objectName/:nodeName/link/:linkName/lastEditor/:lastEditor/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, node, or link name. Must be alphanumeric.');
        return;
    }
    res.send(blockLinkController.deleteLogicLink(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.linkName, req.params.lastEditor));
});
router.post('/:objectName/:nodeName/link/:linkName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, node, or link name. Must be alphanumeric.');
        return;
    }
    res.send(blockLinkController.addLogicLink(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.linkName, req.body));
});

// logic blocks
router.post('/:objectName/:nodeName/block/:blockName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.addNewBlock(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.blockName, req.body));
});
// router.delete('/:objectName/:nodeName/block/:blockName/lastEditor/:lastEditor/', function (req, res) {
//     res.send(blockController.deleteBlock(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.blockName, req.params.lastEditor));
// });
router.post('/:objectName/:nodeName/blockPosition/:blockName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.postBlockPosition(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.blockName, req.body));
});

// logic nodes
router.post('/:objectName/:nodeName/node/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object or node name. Must be alphanumeric.');
        return;
    }
    res.send(logicNodeController.addLogicNode(req.params.objectName, req.params.objectName, req.params.nodeName, req.body));
});
router.delete('/:objectName/:nodeName/node/lastEditor/:lastEditor/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object or node name. Must be alphanumeric.');
        return;
    }
    res.send(logicNodeController.deleteLogicNode(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.lastEditor));
});
router.post('/:objectName/:nodeName/nodeSize/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object or node name. Must be alphanumeric.');
        return;
    }
    logicNodeController.changeNodeSize(req.params.objectName, req.params.objectName, req.params.nodeName, req.body, function (statusCode, responseContents) {
        res.status(statusCode).send(responseContents);
    });
});

const setup = function(globalVariables_) {
    globalVariables = globalVariables_;
};

module.exports = {
    router: router,
    setup: setup
};