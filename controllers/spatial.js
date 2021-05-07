// These may be needed when we add more APIs
// const fs = require('fs');
// const path = require('path');
// const formidable = require('formidable');
// const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var hardwareAPI;
// These may be needed when we add more APIs
var objects = {};
var _globalVariables;
var sceneGraph;

const getSceneGraph = function() {
    console.log('GET /spatial/sceneGraph');
    return hardwareAPI.getSceneGraph();
};

// @todo: implement similarly to searchFrames, to return a list of all objects matching certain
//        spatial criteria or other metadata criteria
const searchObjects = function(queryParams, callback) {
    console.log(queryParams);
    callback(null, {
        code: 500,
        message: 'unimplemented'
    });
};

/**
 * Returns the validAddresses of all frames matching the queryParams.
 * Currently supported queryParams:
 *
 * (interdependent "spatial" params):
 * maxDistance: tools further away than this (in mm) will be excluded
 * worldId: tools not localized within this world will be excluded
 * clientX|clientY|clientZ: the origin (camera position) against which distance is measured
 *
 * (independent metadata params):
 * publicData: a set of requirements on the publicData of any node on the tool. negative matches are excluded.
 *   (example: publicData.mentions.includes=@Ben)
 *   (supported operators: includes, beginsWith, equals)
 *
 * @param queryParams
 * @param callback
 */
const searchFrames = function(queryParams, callback) {
    console.log(queryParams);

    // there are a specific set of possible search query params, enumerated here:
    let maxDistance = parseFloat(queryParams.maxDistance); // in mm (e.g. 2000 = 2 meters)

    let worldId = queryParams.worldId; // which world the client is localized within

    // make sure that (0,0,0) is truthy
    let isClientPositionSpecified = typeof queryParams.clientX !== 'undefined' &&
        typeof queryParams.clientY !== 'undefined' &&
        typeof queryParams.clientZ !== 'undefined';

    let clientX = parseFloat(queryParams.clientX); // their x, y, z location within that world
    let clientY = parseFloat(queryParams.clientY);
    let clientZ = parseFloat(queryParams.clientZ);

    let src = queryParams.src; // the type of the frame (e.g. communication)

    // parse all params with publicData.value.operator into usable structure
    let publicDataRequirements = [];
    Object.keys(queryParams).filter(function(key) {
        return key.indexOf('publicData.') === 0;
    }).forEach(function(key) {
        let components = key.split('.');
        if (components.length !== 3) { return; } // must have correct format
        publicDataRequirements.push({
            dataName: components[1],
            operator: components[2],
            specifiedValue: queryParams[key]
        });
    });
    // console.log(publicDataRequirements);

    let validAddresses = [];
    for (let objectKey in objects) {
        let thisObject = objects[objectKey];
        for (let frameKey in thisObject.frames) {
            let thisFrame = thisObject.frames[frameKey];
            let anyConditionUnsatisfied = false;

            // src fails if not exactly the type you're looking for
            if (src && thisFrame.src !== src) {
                anyConditionUnsatisfied = true;
                continue; // short circuit
            }

            // distance fails if too far away, or if not localized or not in same world
            if (maxDistance && isClientPositionSpecified) {
                if (worldId && worldId === thisObject.worldId) {
                    let distance = sceneGraph.getDistanceNodeToPoint(frameKey, clientX, clientY, clientZ);
                    console.log(frameKey, distance);
                    if (distance > maxDistance) {
                        anyConditionUnsatisfied = true;
                        continue;
                    }
                } else {
                    anyConditionUnsatisfied = true;
                    continue;
                }
            }

            // check all publicData requirements
            // 1. collect all publicData from this frame's nodes
            let publicData = {};
            Object.keys(thisFrame.nodes).forEach(function(nodeKey) {
                let thisNode = thisFrame.nodes[nodeKey];
                for (let key in thisNode.publicData) {
                    publicData[key] = JSON.parse(JSON.stringify(thisNode.publicData[key]));
                    // todo: this has the assumption that multiple nodes on the same tool don't have same key in their public data
                }
            });

            publicDataRequirements.forEach(function(requirement) {
                let dataName = requirement.dataName;
                let operator = requirement.operator;
                let specifiedValue = requirement.specifiedValue;

                if (typeof publicData[dataName] === 'undefined') {
                    anyConditionUnsatisfied = true;
                } else {
                    if (operator === 'includes') {
                        if (!publicData[dataName].includes(specifiedValue)) {
                            anyConditionUnsatisfied = true;
                        }
                    } if (operator === 'beginsWith') {
                        if (!publicData[dataName].indexOf(specifiedValue) === 0) {
                            anyConditionUnsatisfied = true;
                        }
                    } else if (operator === 'equals') { // haven't tested this yet
                        if (publicData[dataName] !== specifiedValue) {
                            anyConditionUnsatisfied = true;
                        }
                    }
                }

                console.log(requirement, publicData, !anyConditionUnsatisfied);
            });

            if (!anyConditionUnsatisfied) {
                validAddresses.push({
                    objectId: objectKey,
                    frameId: frameKey
                });
            }
        }
    }

    callback({validAddresses: validAddresses}, null);
};

const setup = function (objects_, globalVariables_, hardwareAPI_, sceneGraph_) {
    objects = objects_;
    _globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    sceneGraph = sceneGraph_;
};

module.exports = {
    getSceneGraph: getSceneGraph,
    searchObjects: searchObjects,
    searchFrames: searchFrames,
    setup: setup
};
