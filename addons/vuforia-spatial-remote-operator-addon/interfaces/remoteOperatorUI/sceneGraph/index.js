/*
* Created by Ben Reynolds on 07/13/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * This is the new positioning API for objects, tools, and nodes
 * Scene Graph implementation was inspired by:
 * https://webglfundamentals.org/webgl/lessons/webgl-scene-graph.html
 */

const SceneNode = require('./SceneNode.js');

let sceneGraph = {};
let rootNode;
let cameraNode;
let groundPlaneNode;

// TODO ben: use this enum in other modules instead of having any string names
const NAMES = Object.freeze({
    ROOT: 'ROOT',
    CAMERA: 'CAMERA',
    GROUNDPLANE: 'GROUNDPLANE'
});

const TAGS = Object.freeze({
    OBJECT: 'object',
    TOOL: 'tool',
    NODE: 'node',
    ROTATE_X: 'rotateX'
});

function initService() {
    // create root node for scene located at phone's (0,0,0) coordinate system
    rootNode = new SceneNode(NAMES.ROOT);
    sceneGraph[NAMES.ROOT] = rootNode;

    // create node for camera outside the tree of the main scene
    cameraNode = new SceneNode(NAMES.CAMERA);
    sceneGraph[NAMES.CAMERA] = cameraNode;

    // create a node representing the ground plane coordinate system
    groundPlaneNode = new SceneNode(NAMES.GROUNDPLANE);
    groundPlaneNode.needsRotateX = true;
    addRotateX(groundPlaneNode, NAMES.GROUNDPLANE, true);
    sceneGraph[NAMES.GROUNDPLANE] = groundPlaneNode;
}

function setCameraPosition(cameraMatrix) {
    if (!cameraNode) { return; }
    cameraNode.setLocalMatrix(cameraMatrix);
}

function setGroundPlanePosition(groundPlaneMatrix) {
    groundPlaneNode.setLocalMatrix(groundPlaneMatrix);
}

/**
 * @param {string} id
 * @return {SceneNode}
 */
function getSceneNodeById(id) {
    return sceneGraph[id];
}

/************ Private Functions ************/
function addRotateX(sceneNodeObject, objectId, groundPlaneVariation) {
    let sceneNodeRotateX;
    let thisNodeId = objectId + 'rotateX';
    if (typeof sceneGraph[thisNodeId] !== 'undefined') {
        sceneNodeRotateX = sceneGraph[thisNodeId];
    } else {
        sceneNodeRotateX = new SceneNode(thisNodeId);
        sceneNodeRotateX.addTag(TAGS.ROTATE_X);
        sceneGraph[thisNodeId] = sceneNodeRotateX;
    }

    sceneNodeRotateX.setParent(sceneNodeObject);

    // image target objects require one coordinate system rotation. ground plane requires another.
    if (groundPlaneVariation) {
        sceneNodeRotateX.setLocalMatrix(makeGroundPlaneRotationX(-(Math.PI / 2)));
    } else {
        sceneNodeRotateX.setLocalMatrix([ // transform coordinate system by rotateX
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
}

function makeGroundPlaneRotationX(theta) {
    var c = Math.cos(theta), s = Math.sin(theta);
    return [    1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1];
}

module.exports = {
    // public init method
    initService,

    // public methods to update the positions of things in the sceneGraph
    setCameraPosition,
    setGroundPlanePosition,
    // TODO: can we get rid of full/direct access to sceneGraph?
    getSceneNodeById,

    NAMES,
    TAGS,
};
