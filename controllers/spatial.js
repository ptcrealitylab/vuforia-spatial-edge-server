// These may be needed when we add more APIs
// const fs = require('fs');
// const path = require('path');
// const formidable = require('formidable');
// const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var hardwareAPI;
// These may be needed when we add more APIs
var _objects = {};
var _globalVariables;
var _sceneGraph;

const getSceneGraph = function() {
    console.log('GET /spatial/sceneGraph');
    return hardwareAPI.getSceneGraph();
};

const setup = function (objects_, globalVariables_, hardwareAPI_, sceneGraph_) {
    _objects = objects_;
    _globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    _sceneGraph = sceneGraph_;
};

module.exports = {
    getSceneGraph: getSceneGraph,
    setup: setup
};
