﻿/**
 *   Created by Carsten on 12/06/2015.
 *   Modified by Valentin Heun on 16/08/16.
 **
 *   Copyright (c) 2015 Carsten Strunk
 *
 *   This Source Code Form is subject to the terms of the Mozilla Public
 *   License, v. 2.0. If a copy of the MPL was not distributed with this
 *   file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Hybrid Objecst Hardware Interface API
 * 
 * This API is intended for users who want to create their own hardware interfaces.
 * To create a new hardware interface create a folder under hardwareInterfaces and create the file index.js.
 * You should take a look at /hardwareInterfaces/emptyExample/index.js to get started.
 */

var http = require('http');
var utilities = require(__dirname + '/utilities');
var _ = require('lodash');

//global variables, passed through from server.js
var objects = {};
var objectLookup;
var globalVariables;
var dirnameO;
var nodeAppearanceModules;
var callback;
var Node;
var hardwareObjects = {};
var callBacks = new Objects();
var _this = this;
//data structures to manage the IO points generated by the API user
function Objects() {
    this.resetCallBacks = [];
    this.shutdownCallBacks = [];
}

function Object(objectName) {
    this.name = objectName;
    this.nodes = {};

}

function EmptyNode(nodeName, appearance) {
    this.name = nodeName;
    this.appearance = appearance;
    this.callBack = {};
}

/*
 ********** API FUNCTIONS *********
 */

/**
 * @desc This function writes the values passed from the hardware interface to the HybridObjects server.
 * @param {string} objectName The name of the HybridObject
 * @param {string} nodeName The name of the IO point
 * @param {} number The value to be passed on
 * @param {string} mode specifies the datatype of value, you can define it to be whatever you want. For example 'f' could mean value is a floating point variable.
 **/
exports.write = function (objectName, nodeName, number, mode, unit, unitMin, unitMax) {
    if (typeof mode === 'undefined')  mode = "f";
    if (typeof unit === 'undefined')  unit = false;
    if (typeof unitMin === 'undefined')  unitMin = 0;
    if (typeof unitMax === 'undefined')  unitMax = 1;

    var objectKey = utilities.readObject(objectLookup, objectName); //get globally unique object id
    //  var valueKey = nodeName + objKey2;

    //console.log(objectLookup);

//    console.log("writeIOToServer obj: "+objectName + "  name: "+nodeName+ "  value: "+value+ "  mode: "+mode);

    if (objects.hasOwnProperty(objectKey)) {
        if (objects[objectKey].nodes.hasOwnProperty(nodeName)) {
            var thisItem = objects[objectKey].nodes[nodeName].item;
            thisItem.number = number;
            thisItem.mode = mode;
            thisItem.unit = unit;
            thisItem.unitMin = unitMin;
            thisItem.unitMax = unitMax;
            //callback is objectEngine in server.js. Notify data has changed.
            callback(objectKey, nodeName, thisItem, objects, nodeAppearanceModules);
        }
    }
};

/**
 * @desc clearIO() removes IO points which are no longer needed. It should be called in your hardware interface after all addIO() calls have finished.
 * @param {string} type The name of your hardware interface (i.e. what you put in the type parameter of addIO())
 **/
exports.clearObject = function (objectName) {
    var objectID = utilities.getObjectIdFromTarget(objectName, dirnameO);
    if (!_.isUndefined(objectID) && !_.isNull(objectID)) {
        for (var key in objects[objectID].nodes) {
            if (!hardwareObjects[objectName].nodes.hasOwnProperty(objects[objectID].nodes[key].name)) {
                if (globalVariables.debug) console.log("Deleting: " + objectID + "   " + key);
                delete objects[objectID].nodes[key];
            }
        }

    }
    //TODO: clear links too
    if (globalVariables.debug) console.log("object is all cleared");
};

/**
 * @desc addIO() a new IO point to the specified HybridObject
 * @param {string} objectName The name of the HybridObject
 * @param {string} nodeName The name of the nodeName
 * @param {string} appearance The name of the data conversion appearance. If you don't have your own put in "default".
 **/
exports.addNode = function (objectName, nodeName, appearance) {
    utilities.createFolder(objectName, dirnameO, globalVariables.debug);

    var objectID = utilities.getObjectIdFromTarget(objectName, dirnameO);
    if (globalVariables.debug) console.log("AddIO objectID: " + objectID);

    //objID = nodeName + objectID;

    if (!_.isUndefined(objectID) && !_.isNull(objectID)) {

        if (globalVariables.debug) console.log("I will save: " + objectName + " and: " + nodeName);

        if (objects.hasOwnProperty(objectID)) {
            objects[objectID].developer = globalVariables.developer;
            objects[objectID].name = objectName;

            if (!objects[objectID].nodes.hasOwnProperty(nodeName)) {
                var thisObject = objects[objectID].nodes[nodeName] = new Node();
                thisObject.x = utilities.randomIntInc(0, 200) - 100;
                thisObject.y = utilities.randomIntInc(0, 200) - 100;
                thisObject.frameSizeX = 47;
                thisObject.frameSizeY = 47;
            }

            var thisObj = objects[objectID].nodes[nodeName];
            thisObj.name = nodeName;
            thisObj.appearance = appearance;

            if (!hardwareObjects.hasOwnProperty(objectName)) {
                hardwareObjects[objectName] = new Object(objectName);
            }

            if (!hardwareObjects[objectName].nodes.hasOwnProperty(nodeName)) {
                hardwareObjects[objectName].nodes[nodeName] = new EmptyNode(nodeName);
                hardwareObjects[objectName].nodes[nodeName].appearance = appearance;
            }
        }
    }
    objectID = undefined;
};

exports.getObjectIdFromObjectName = function (objectName) {
    return utilities.getObjectIdFromTarget(objectName, dirnameO);
};

/**
 * @desc developerOn() Enables the developer mode for all HybridObjects and enables the developer web interface
 **/
exports.enableDeveloperUI = function (developer) {
    globalVariables.developer = developer;
    for (var objectID in objects) {
        objects[objectID].developer = developer;
    }
};

/**
 * @desc getDebug() checks if debug mode is turned on
 * @return {boolean} true if debug mode is on, false otherwise
 **/
exports.getDebug = function () {
    return globalVariables.debug;
};

/*
 ********** END API FUNCTIONS *********
 */

/**
 * @desc setup() DO NOT call this in your hardware interface. setup() is only called from server.js to pass through some global variables.
 **/
exports.setup = function (objExp, objLookup, glblVars, dir, appearances, cb, objValue) {
    objects = objExp;
    objectLookup = objLookup;
    globalVariables = glblVars;
    dirnameO = dir;
    nodeAppearanceModules = appearances;
    callback = cb;
    Node = objValue;
};

exports.reset = function (){
    for (var objectKey in objects) {
        for (var nodeKey in objects[objectKey].nodes) {
            _this.addNode(objectKey, nodeKey, objects[objectKey].nodes[nodeKey].appearance);

        }
        _this.clearObject(objectKey);
    }

    if (globalVariables.debug) console.log("sendReset");
    for (var i = 0; i < callBacks.resetCallBacks.length; i++) {
        callBacks.resetCallBacks[i]();
    }
};

exports.readCall = function (objectName, nodeName, item) {
    if (callBacks.hasOwnProperty(objectName)) {
        if (callBacks[objectName].nodes.hasOwnProperty(nodeName)) {
            callBacks[objectName].nodes[nodeName].callBack(item);
        }
    }
};

exports.addReadListener = function (objectName, nodeName, callBack) {
    var objectID = utilities.readObject(objectLookup, objectName);
    if (globalVariables.debug) console.log("Add read listener for objectID: " + objectID);

    if (!_.isUndefined(objectID) && !_.isNull(objectID)) {

        if (objects.hasOwnProperty(objectID)) {
            if (!callBacks.hasOwnProperty(objectID)) {
                callBacks[objectID] = new Object(objectID);
            }

            if (!callBacks[objectID].nodes.hasOwnProperty(nodeName)) {
                callBacks[objectID].nodes[nodeName] = new EmptyNode(nodeName);
                callBacks[objectID].nodes[nodeName].callBack = callBack;
            } else {
                callBacks[objectID].nodes[nodeName].callBack = callBack;
            }
        }
    }
};

exports.addEventListener = function (option, callBack){
    if(option === "reset") {
        if (globalVariables.debug) console.log("Add reset listener");
        callBacks.resetCallBacks.push(callBack);
    }
    if(option === "shutdown") {
        if (globalVariables.debug) console.log("Add reset listener");
        callBacks.shutdownCallBacks.push(callBack);
    }

};

exports.shutdown = function (){

    if (globalVariables.debug) console.log("call shutdowns");
    for (var i = 0; i < callBacks.shutdownCallBacks.length; i++) {
        callBacks.shutdownCallBacks[i]();
    }
};
