const express = require('express');
const router = express.Router();

const blockController = require('../controllers/block.js');
const blockLinkController = require('../controllers/blockLink.js');
const logicNodeController = require('../controllers/logicNode.js');
const utilities = require('../libraries/utilities');
const dataStreamAPI = require("../libraries/dataStreamInterfaces");

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

// APIs for programmatically connecting nodes of the system to external data streams, at runtime
// This enables functionality like: searching a ThingWorx server for sensor values, and adding new tools to visualize those values
// Much of the heavy-lifting of these APIs must be taken care of in the corresponding hardwareInterface implementation

// gets the list of dataSources (from hardware interfaces) which are URL endpoints containing many dataStreams, e.g. a ThingWorx Thing REST API
router.get('/availableDataSources/', function (req, res) {
    let allAvailableDataSources = dataStreamAPI.getAllAvailableDataSources();
    res.json({
        dataSources: allAvailableDataSources
    });
});

// gets the list of individual data streams that can be bound to nodes (e.g. a sensor value, signal emitter, or weather data stream)
router.get('/availableDataStreams/', function(req, res) {
    let allAvailableDataStreams = dataStreamAPI.getAllAvailableDataStreams();
    res.json({
        dataStreams: allAvailableDataStreams
    });
});

// tells the specified hardwareInterface to stream values from the specified dataStream to the specified node
router.post('/bindNodeToDataStream/', function(req, res) {
    console.log('bindNodeToDataStream', req.body);
    dataStreamAPI.bindNodeToDataStream(req.body);
    res.status(200).json({ success: true, error: null });
});

// adds and stores the provided URL + authentication as a dataSource on the specified hardwareInterface
router.post('/addDataSourceToInterface/', function(req, res) {
    console.log('addDataSourceToInterface', req.body);
    dataStreamAPI.addDataSourceToInterface(req.body.interfaceName, req.body.dataSource);
    res.status(200).json({ success: true, error: null });
});

// removes the specified dataSource from the specified hardwareInterface
router.delete('/deleteDataSourceFromInterface/', function(req, res) {
    console.log('deleteDataSourceFromInterface', req.body);
    dataStreamAPI.deleteDataSourceFromInterface(req.body.interfaceName, req.body.dataSource);
    res.status(200).json({ success: true, error: null });
});

const setup = function() {
};

module.exports = {
    router: router,
    setup: setup
};
