const express = require('express');
const router = express.Router();

const blockController = require('../controllers/block.js');
const blockLinkController = require('../controllers/blockLink.js');
const logicNodeController = require('../controllers/logicNode.js');

// Variables populated from server.js with setup()
var globalVariables;

// logic links
router.delete('/*/*/link/*/lastEditor/*/', function (req, res) {
    res.send(blockLinkController.deleteLogicLink(req.params[0], req.params[0], req.params[1], req.params[2], req.params[3]));
});
router.post('/*/*/link/*/', function (req, res) {
    res.send(blockLinkController.addLogicLink(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
});

// logic blocks
router.post('/*/*/block/*/', function (req, res) {
    res.send(blockController.addNewBlock(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
});
// router.delete('/*/*/*/block/*/lastEditor/*/', function (req, res) {
//     res.send(blockController.deleteBlock(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3], req.params[4]));
// });
router.post('/*/*/blockPosition/*/', function (req, res) {
    res.send(blockController.postBlockPosition(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
});

// logic nodes
router.post('/*/*/node/', function (req, res) {
    res.send(logicNodeController.addLogicNode(req.params[0], req.params[0], req.params[1], req.body));
});
router.delete('/*/*/node/lastEditor/*/', function (req, res) {
    res.send(logicNodeController.deleteLogicNode(req.params[0], req.params[0], req.params[1], req.params[2]));
});
router.post('/*/*/nodeSize/', function (req, res) {
    logicNodeController.changeNodeSize(req.params[0], req.params[0], req.params[1], req.body, function (statusCode, responseContents) {
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