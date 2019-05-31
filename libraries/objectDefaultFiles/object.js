/**
 * @preserve
 *
 *                                     .,,,;;,'''..
 *                                 .'','...     ..',,,.
 *                               .,,,,,,',,',;;:;,.  .,l,
 *                              .,',.     ...     ,;,   :l.
 *                             ':;.    .'.:do;;.    .c   ol;'.
 *      ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *     ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *    .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *     .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *    .:;,,::co0XOko'              ....''..'.'''''''.
 *    .dxk0KKdc:cdOXKl............. .. ..,c....
 *     .',lxOOxl:'':xkl,',......'....    ,'.
 *          .';:oo:...                        .
 *               .cd,    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐   .
 *                 .l;   ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘   '
 *                   'l. ╚═╝└─┘┴└─ └┘ └─┘┴└─  '.
 *                    .o.                   ...
 *                     .''''','.;:''.........
 *                          .'  .l
 *                         .:.   l'
 *                        .:.    .l.
 *                       .x:      :k;,.
 *                       cxlc;    cdc,,;;.
 *                      'l :..   .c  ,
 *                      o.
 *                     .,
 *
 *             ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *             ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *             ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
var realityObject = {
    node: "",
    frame: "",
    object: "",
    logic: "",
    block: "",
    publicData: {},
    modelViewMatrix: [],
    serverIp:"127.0.0,1",
    matrices:{
        modelView : [],
        projection : [],
        groundPlane : [],
        devicePose : [],
        allObjects : {}
    },
    projectionMatrix: [],
    visibility: "visible",
    sendMatrix: false,
    sendMatrices: {
        modelView : false,
        devicePose : false,
        groundPlane : false,
        allObjects : false
    },
    sendScreenPosition: false,
    sendAcceleration: false,
    sendFullScreen: false,
    sendScreenObject : false,
    fullscreenZPosition: 0,
    sendSticky : false,
    height: "100%",
    width: "100%",
    socketIoScript: {},
    socketIoRequest: {},
    socketIoUrl: '',
    pointerEventsScript: {},
    pointerEventsRequest: {},
    style: document.createElement('style'),
    messageCallBacks: {},
    interface : "gui",
    version: 200,
    moveDelay: 400,
    visibilityDistance: 2.0,
    eventObject : {
        version : null,
        object: null,
        frame : null,
        node : null,
        x: 0,
        y: 0,
        type: null,
        touches:[
            {
                screenX: 0,
                screenY: 0,
                type:null
            },
            {
                screenX: 0,
                screeny: 0,
                type:null
            }
        ]
    },
    touchDecider: null,
    touchDeciderRegistered: false,
    onload: null
};

// adding css styles nessasary for acurate 3D transformations.
realityObject.style.type = 'text/css';
realityObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(realityObject.style);

// Load socket.io.js and pep.min.js synchronous so that it is available by the time the rest of the code is executed.
function loadScriptSync(url, requestObject, scriptObject) {
    requestObject = new XMLHttpRequest();
    requestObject.open('GET', url, false);
    requestObject.send();

    //Only add script if fetch was successful
    if (requestObject.status === 200) {
        scriptObject = document.createElement('script');
        scriptObject.type = "text/javascript";
        scriptObject.text = requestObject.responseText;
        document.getElementsByTagName('head')[0].appendChild(scriptObject);
    } else {
        console.log("Error XMLHttpRequest HTTP status: " + requestObject.status);
    }
}

loadScriptSync('/socket.io/socket.io.js', realityObject.socketIoRequest, realityObject.socketIoScript);
loadScriptSync('/objectDefaultFiles/pep.min.js', realityObject.pointerEventsRequest, realityObject.pointerEventsScript);


/**
 ************************************************************
 */

// function for resizing the windows.

window.addEventListener("message", function (MSG) {

    var msgContent = JSON.parse(MSG.data);
    for (var key in realityObject.messageCallBacks) {
        realityObject.messageCallBacks[key](msgContent);
    }
}, false);

function tryResend() {
    var windowMatches = window.location.search.match(/nodeKey=([^&]+)/);
    if (!windowMatches) {
        return;
    }
    var nodeKey = windowMatches[1];
    parent.postMessage(JSON.stringify({resendOnElementLoad: true, nodeKey: nodeKey}), '*');
}

tryResend();

realityObject.messageCallBacks.mainCall = function (msgContent) {

    // console.log("------------------------------");
    // console.log(msgContent);

    if (typeof msgContent.node !== "undefined") {

        if (realityObject.sendFullScreen === false) {
            realityObject.height = document.body.scrollHeight;
            realityObject.width = document.body.scrollWidth;
        }

        parent.postMessage(JSON.stringify(
            {
                version: realityObject.version,
                node: msgContent.node,
                frame: msgContent.frame,
                object: msgContent.object,
                height: realityObject.height,
                width: realityObject.width,
                sendMatrix: realityObject.sendMatrix,
                sendMatrices: realityObject.sendMatrices,
                sendAcceleration: realityObject.sendAcceleration,
                fullScreen: realityObject.sendFullScreen,
                stickiness: realityObject.sendSticky,
                moveDelay: realityObject.moveDelay
            }
            )
            // this needs to contain the final interface source
            , "*");

        var alreadyLoaded = !!realityObject.node;
        realityObject.node = msgContent.node;
        realityObject.frame = msgContent.frame;
        realityObject.object = msgContent.object;

        if (!alreadyLoaded) {
            if (realityObject.onload) {
                realityObject.onload();
            }
        }

        if (realityObject.sendScreenObject) {
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    }
    else if (typeof msgContent.logic !== "undefined") {


        parent.postMessage(JSON.stringify(
            {
                version: realityObject.version,
                block: msgContent.block,
                logic: msgContent.logic,
                frame: msgContent.frame,
                object: msgContent.object,
                publicData: msgContent.publicData
            }
            )
            // this needs to contain the final interface source
            , "*");

        realityObject.block = msgContent.block;
        realityObject.logic = msgContent.logic;
        realityObject.frame = msgContent.frame;
        realityObject.object = msgContent.object;
        realityObject.publicData = msgContent.publicData;

        if (realityObject.sendScreenObject) {
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    }

    if (typeof msgContent.modelViewMatrix !== "undefined") {
        realityObject.modelViewMatrix = msgContent.modelViewMatrix;
        realityObject.matrices.modelView = msgContent.modelViewMatrix;
    }

    if (typeof msgContent.projectionMatrix !== "undefined") {
        realityObject.projectionMatrix = msgContent.projectionMatrix;
        realityObject.matrices.projection = msgContent.projectionMatrix;
    }

    if (typeof msgContent.allObjects !== "undefined") {
        realityObject.matrices.allObjects = msgContent.allObjects;
    }

    if (typeof msgContent.devicePose !== "undefined") {
        realityObject.matrices.devicePose = msgContent.devicePose;
    }

    if (typeof msgContent.groundPlaneMatrix !== "undefined") {
        realityObject.matrices.groundPlane = msgContent.groundPlaneMatrix;
    }

    if (typeof msgContent.visibility !== "undefined") {
        realityObject.visibility = msgContent.visibility;

        // TODO: implement public data subscription in the same way as in object-frames.js
        // ioObject.emit('/subscribe/realityEditorPublicData', JSON.stringify({object: realityObject.object, frame: realityObject.frame}));


        if(realityObject.visibility === "visible"){
            if (typeof realityObject.node !== "undefined") {
                if(realityObject.sendSticky) {
                    parent.postMessage(JSON.stringify(
                        {
                            version: realityObject.version,
                            node: realityObject.node,
                            frame: realityObject.frame,
                            object: realityObject.object,
                            height: realityObject.height,
                            width: realityObject.width,
                            sendMatrix: realityObject.sendMatrix,
                            sendMatrices: realityObject.sendMatrices,
                            sendScreenPosition: realityObject.sendScreenPosition,
                            sendAcceleration: realityObject.sendAcceleration,
                            fullScreen: realityObject.sendFullScreen,
                            stickiness: realityObject.sendSticky,
                            sendScreenObject : realityObject.sendScreenObject
                        }), "*");
                }
            }
        }
    }

    if (typeof msgContent.interface !== "undefined") {
        realityObject.interface = msgContent.interface
    }
};

/**
 ************************************************************
 */

function RealityInterface() {
    this.publicData = realityObject.publicData;

    /**
     ************************************************************
     */

    this.sendGlobalMessage = function (ohMSG) {
        window.parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            globalMessage: ohMSG
        }), "*");
    };

    this.sendResetNodes = function () {
        //removes all nodes from the frame
        window.parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            resetNodes: true
        }), '*');
    };

    this.sendCreateNode = function (name, x, y, attachToGroundPlane) {
        window.parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            createNode: {
                name: name,
                x: x,
                y: y,
                attachToGroundPlane: attachToGroundPlane
            }
        }), '*');
    };

    this.sendMoveNode = function (name, x, y) {
        window.parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            moveNode: {
                name: name,
                x: x,
                y: y
            }
        }), '*');
    };


    /**
     ************************************************************
     */

    this.addGlobalMessageListener = function (callback) {

        realityObject.messageCallBacks.gloablMessageCall = function (msgContent) {
            if (typeof msgContent.globalMessage !== "undefined") {
                callback(msgContent.globalMessage);
            }
        };
    };

    /**
     ************************************************************
     */

    // ensures each callback has a unique name
    var callBackCounter = {
        numMatrixCallbacks: 0,
        numAllMatricesCallbacks: 0,
        numWorldMatrixCallbacks: 0,
        numGroundPlaneMatrixCallbacks: 0
    };
    this.addMatrixListener = function (callback) {
        if (!realityObject.sendMatrices.modelView) {
            this.subscribeToMatrix();
        }
        callBackCounter.numMatrixCallbacks++;
        realityObject.messageCallBacks['matrixCall' + callBackCounter.numMatrixCallbacks] = function (msgContent) {
            if (typeof msgContent.modelViewMatrix !== "undefined") {
                callback(msgContent.modelViewMatrix, realityObject.matrices.projection);
            }
        }.bind(this);
    };

    this.addAllObjectMatricesListener = function (callback) {
        if (!realityObject.sendMatrices.allObjects) {
            this.subscribeToAllMatrices();
        }
        callBackCounter.numAllMatricesCallbacks++;
        realityObject.messageCallBacks['allMatricesCall'+callBackCounter.numAllMatricesCallbacks] = function (msgContent) {
            if (typeof msgContent.allObjects !== "undefined") {
                callback(msgContent.allObjects, realityObject.matrices.projection);
            }
        }
    };

    this.addDevicePoseMatrixListener = function (callback) {
        if (!realityObject.sendMatrices.devicePose) {
            this.subscribeToDevicePoseMatrix();
        }
        callBackCounter.numWorldMatrixCallbacks++;
        realityObject.messageCallBacks['worldMatrixCall'+callBackCounter.numWorldMatrixCallbacks] = function (msgContent) {
            if (typeof msgContent.devicePose !== "undefined") {
                callback(msgContent.devicePose, realityObject.matrices.projection);
            }
        }
    };

    this.addGroundPlaneMatrixListener = function (callback) {
        if (!realityObject.sendMatrices.groundPlane) {
            this.subscribeToGroundPlaneMatrix();
        }
        callBackCounter.numGroundPlaneMatrixCallbacks++;
        realityObject.messageCallBacks['groundPlaneMatrixCall'+callBackCounter.numGroundPlaneMatrixCallbacks] = function (msgContent) {
            if (typeof msgContent.groundPlaneMatrix !== "undefined") {
                callback(msgContent.groundPlaneMatrix, realityObject.matrices.projection);
            }
        }
    };

    var numScreenPositionCallbacks = 0;
    this.addScreenPositionListener = function(callback) {
        if (!realityObject.sendScreenPosition) {
            this.subscribeToScreenPosition();
        }
        numScreenPositionCallbacks++;
        realityObject.messageCallBacks['screenPositionCall'+numScreenPositionCallbacks] = function (msgContent) {
            if (typeof msgContent.frameScreenPosition !== 'undefined') {
                callback(msgContent.frameScreenPosition);
            }
        };
    };

    this.addAccelerationListener = function (callback) {
        this.subscribeToAcceleration();
        realityObject.messageCallBacks.AccelerationCall = function (msgContent) {
            if (typeof msgContent.acceleration !== "undefined") {
                callback(msgContent.acceleration);
            }
        }
    };



    /**
     ************************************************************
     */
    // subscriptions
    this.subscribeToMatrix = function () {
        realityObject.sendMatrix = true;
        realityObject.sendMatrices.modelView = true;
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            if (realityObject.sendFullScreen === false) {
                realityObject.height = document.body.scrollHeight;
                realityObject.width = document.body.scrollWidth;
            }

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    this.subscribeToScreenPosition = function() {
        realityObject.sendScreenPosition = true;
        if (typeof realityObject.node !== 'undefined' || typeof realityObject.frame !== 'undefined') {

            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                height: realityObject.height,
                width: realityObject.width,
                sendMatrix: realityObject.sendMatrix,
                sendMatrices : realityObject.sendMatrices,
                sendScreenPosition: realityObject.sendScreenPosition,
                sendAcceleration: realityObject.sendAcceleration,
                fullScreen: realityObject.sendFullScreen,
                stickiness: realityObject.sendSticky
            }), '*');
        }
    };

    this.subscribeToDevicePoseMatrix = function () {
        realityObject.sendMatrices.devicePose = true;

        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");

        }
    };

    this.subscribeToAllMatrices = function () {
        realityObject.sendMatrices.allObjects = true;
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    this.subscribeToGroundPlaneMatrix = function () {
        realityObject.sendMatrices.groundPlane = true;
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    // subscriptions
    this.subscribeToAcceleration = function () {
        realityObject.sendAcceleration = true;
        if (typeof realityObject.node !== "undefined") {
            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };



    /**
     ************************************************************
     */

    this.setFullScreenOn = function (zPosition) {
        realityObject.sendFullScreen = true;
        console.log("fullscreen is loaded");
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            realityObject.height = "100%";
            realityObject.width = "100%";
            if (zPosition !== undefined) {
                realityObject.fullscreenZPosition = zPosition;
            }

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    fullscreenZPosition: realityObject.fullscreenZPosition,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    /**
     ************************************************************
     */

    this.setFullScreenOff = function () {
        realityObject.sendFullScreen = false;
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            realityObject.height = document.body.scrollHeight;
            realityObject.width = document.body.scrollWidth;

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    /**
     ************************************************************
     */

    this.setStickyFullScreenOn = function () {
        realityObject.sendFullScreen = "sticky";
        realityObject.sendSticky = true;
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

            realityObject.height = "100%";
            realityObject.width = "100%";

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), "*");
        }
    };

    /**
     ************************************************************
     */

    this.setStickinessOff = function () {
        console.log(realityObject.visibility);
        //if(realityObject.visibility === "hidden"){
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {
            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendScreenPosition: realityObject.sendScreenPosition,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: false
                }), "*");
        }

    };


    /**
     ************************************************************
     */

    this.activateScreenObject = function() {
        realityObject.sendScreenObject = true;

        if (realityObject.object && realityObject.frame) {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                sendScreenObject : true
            }), '*');
        }
    };

    /**
     ************************************************************
     */

    this.startVideoRecording = function() {
        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {
            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    videoRecording: true
                }), "*");
        }
    };

    this.stopVideoRecording = function(callback) {
        realityObject.messageCallBacks.stopVideoRecording = function (msgContent) {
            if (typeof msgContent.videoFilePath !== 'undefined') {
                callback(msgContent.videoFilePath);
            }
        };

        if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {
            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    videoRecording: false
                }), "*");
        }
    };

    /**
     ************************************************************
     */

    this.getVisibility = function () {
        return realityObject.visibility;
    };

    /**
     ************************************************************
     */

    this.addVisibilityListener = function (callback) {
        realityObject.messageCallBacks.visibilityCall = function (msgContent) {
            if (typeof msgContent.visibility !== "undefined") {
                callback(msgContent.visibility);
            }
        };
    };


    /**
     ************************************************************
     */

    this.getInterface= function () {
        return realityObject.interface;
    };

    /**
     ************************************************************
     */

    this.addInterfaceListener = function (callback) {
        realityObject.messageCallBacks.interfaceCall = function (msgContent) {
            if (typeof msgContent.interface !== "undefined" && typeof msgContent.search === "undefined") {
                callback(msgContent.interface, null);
            } else  if (typeof msgContent.interface !== "undefined" && typeof msgContent.search !== "undefined") {
                callback(msgContent.interface, msgContent.search);
            }
        };
    };

    /**
     ************************************************************
     */

    this.search = function (ingredients, userList) {
        for (var key in userList) {

            if (userList[key].state === false) {
                if(typeof ingredients[key] !== "undefined"){
                    if(ingredients[key].state === true){
                        return false;
                    }
                }
            }

            if (userList[key].state === true) {
                if(typeof ingredients[key] !== "undefined"){
                    if(ingredients[key].state === false){
                        return false;
                    }
                } else return false;
            }
        }
        return true;
    };

    this.getPositionX = function () {
        if (typeof realityObject.matrices.modelView[12] !== "undefined") {
            return realityObject.matrices.modelView[12];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPositionY = function () {
        if (typeof realityObject.matrices.modelView[13] !== "undefined") {
            return realityObject.matrices.modelView[13];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPositionZ = function () {
        if (typeof realityObject.matrices.modelView[14] !== "undefined") {
            return realityObject.matrices.modelView[14];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getProjectionMatrix = function () {
        if (typeof realityObject.matrices.projection !== "undefined") {
            return realityObject.matrices.projection;
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getModelViewMatrix = function () {
        if (typeof realityObject.matrices.modelView !== "undefined") {
            return realityObject.matrices.modelView;
        } else return undefined;
    };

    this.getGroundPlaneMatrix = function () {
        if (typeof realityObject.matrices.groundPlane !== "undefined") {
            return realityObject.matrices.groundPlane;
        } else return undefined;
    };

    this.getDevicePoseMatrix = function () {
        if (typeof realityObject.matrices.devicePose !== "undefined") {
            return realityObject.matrices.devicePose;
        } else return undefined;
    };

    this.getAllObjectMatrices = function () {
        if (typeof realityObject.matrices.allObjects !== "undefined") {
            return realityObject.matrices.allObjects;
        } else return undefined;
    };

    this.setMoveDelay = function(delayInMilliseconds) {
        realityObject.moveDelay = delayInMilliseconds;

        if (realityObject.object && realityObject.frame) {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                moveDelay : delayInMilliseconds
            }), '*');
        }
    };

    /**
     * set the distance a frame is visible in space.
     * @param {number} distance in meter
     */
    this.setVisibilityDistance = function(distance) {
        realityObject.visibilityDistance = distance;

        if (realityObject.object && realityObject.frame) {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                visibilityDistance : distance
            }), '*');
        }
    };

    this.getUnitValue = function (dataPackage){
            return {value: (dataPackage.value * (dataPackage.unitMax-dataPackage.unitMin))+dataPackage.unitMin,
                unit: dataPackage.unit};
    };

    this.registerTouchDecider = function(callback) {
        realityObject.touchDecider = callback;
        realityObject.touchDeciderRegistered = true;
    };

    this.unregisterTouchDecider = function() {
        // realityObject.touchDecider = null; // touchDecider is passed by reference, so this alters the function definition
        realityObject.touchDeciderRegistered = false; // instead just set a flag to not use the callback anymore

    };

    var numMovingCallbacks = 0;
    this.addIsMovingListener = function(callback) {
        numMovingCallbacks++;
        realityObject.messageCallBacks['frameIsMovingCall'+numMovingCallbacks] = function (msgContent) {
            if (typeof msgContent.frameIsMoving !== "undefined") {
                callback(msgContent.frameIsMoving);
            }
        };
    };

    /**
     * Hides the frame itself and instead populates a background context within the editor with this frame's contents
     */
    this.sendToBackground = function() {
        if (realityObject.sendFullScreen) {
            if (realityObject.object && realityObject.frame) {
                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    sendToBackground : true
                }), '*');
            }
        }
    };

    /**
     * Adds an onload callback that will wait until this RealityInterfaces receives its object/frame data
     * @param {function} callback
     */
    this.onRealityInterfaceLoaded = function(callback) {
        if (realityObject.object && realityObject.frame) {
            callback();
        } else {
            realityObject.onload = callback;
        }
    };

    if (typeof io !== "undefined") {
        var _this = this;

        this.ioObject = io.connect();
        this.oldValueList = {};

        this.ioObject.on('reconnect', function() {
            console.log('reconnect');
            window.location.reload();

            // notify the containing application that a frame socket reconnected, for additional optional behavior (e.g. make the screen reload)
            if (realityObject.object && realityObject.frame) {
                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    socketReconnect : true
                }), '*');
            }
        });

        this.sendRealityEditorSubscribe = function () {
            var timeoutFunction = function(){
                if (realityObject.object) {
                    console.log("emit sendRealityEditorSubscribe");
                    _this.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, frame: realityObject.frame, protocol: realityObject.protocol}));
                }
            };
            setTimeout(timeoutFunction, 10);
            setTimeout(timeoutFunction, 50);
            setTimeout(timeoutFunction, 100);
            setTimeout(timeoutFunction, 1000);
        };

        /**
         ************************************************************
         */


        this.write = function (node, value, mode, unit, unitMin, unitMax, forceWrite) {
            if (!mode)  mode = "f";
            if (!unit)  unit = false;
            if (!unitMin)  unitMin = 0;
            if (!unitMax)  unitMax = 1;

            var thisData = {value: value, mode: mode, unit: unit, unitMin: unitMin, unitMax: unitMax};
            if (!node in _this.oldValueList) {
                _this.oldValueList[node] = null;
            }

            if (_this.oldValueList[node] !== value || forceWrite) {
                this.ioObject.emit('object', JSON.stringify({
                    object: realityObject.object,
                    frame: realityObject.object+realityObject.frame,
                    node: realityObject.object+realityObject.frame+node,
                    data: thisData
                }));
            }
            _this.oldValueList[node] = value;
        };

// Routing the messages via Server for Screen

        this.addScreenObjectListener = function () {
            realityObject.messageCallBacks.screenObjectCall = function (msgContent) {
                if(realityObject.visibility !== "visible") return;
                if (typeof msgContent.screenObject !== "undefined") {
                    _this.ioObject.emit('/object/screenObject', JSON.stringify(msgContent.screenObject));
                }
            };
        };

        this.addScreenObjectReadListener = function () {
            _this.ioObject.on("/object/screenObject", function (msg) {
                if(realityObject.visibility !== "visible") return;
                var thisMsg = JSON.parse(msg);
                if (!thisMsg.object) thisMsg.object = null;
                if (!thisMsg.frame) thisMsg.frame = null;
                if (!thisMsg.node) thisMsg.node = null;

                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    screenObject: {
                        object: thisMsg.object,
                        frame: thisMsg.frame,
                        node: thisMsg.node,
                        touchOffsetX: thisMsg.touchOffsetX,
                        touchOffsetY: thisMsg.touchOffsetY
                    }
                }), '*');
            });
        };

        this.addScreenObjectListener();
        this.addScreenObjectReadListener();

        /**
         ************************************************************
         */

        this.readRequest = function (node) {
            _this.ioObject.emit('/object/readRequest', JSON.stringify({object: realityObject.object, frame: realityObject.object+realityObject.frame, node: realityObject.object+realityObject.frame+node}));
        };

        /**
         ************************************************************
         */

        this.read = function (node, msg) {
            if (msg.node === realityObject.frame + node) {
                return msg.data.value;
            } else {
                return undefined;
            }
        };

        /**
         ************************************************************
         */

        this.addReadListener = function (node, callback) {
            _this.ioObject.on("object", function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.node !== "undefined") {
                    if (thisMsg.node === realityObject.frame + node) {
                        if (typeof thisMsg.data !== "undefined") {
                            callback(thisMsg.data);
                        }
                    }
                }
            });
        };

        this.readPublicData = function (node, valueName, value) {
            console.log(realityObject.publicData);
            if (!value)  value = 0;

            if(typeof realityObject.publicData[node] === "undefined") {
                realityObject.publicData[node] = {};
            }

            if (typeof realityObject.publicData[node][valueName] === "undefined") {
                realityObject.publicData[node][valueName] = value;
                return value;
            } else {
                return realityObject.publicData[node][valueName];
            }
        };

        this.addReadPublicDataListener = function (node, valueName, callback) {
            _this.ioObject.on("object/publicData", function (msg) {

                var thisMsg = JSON.parse(msg);

                if (typeof thisMsg.publicData === "undefined")  return;
                if (thisMsg.node !== realityObject.frame+node) return;
                if (typeof thisMsg.publicData[valueName] === "undefined") return;

                if(typeof realityObject.publicData[node] === "undefined") {
                    realityObject.publicData[node] = {};
                }

                if(typeof realityObject.publicData[node][valueName] === "undefined") {
                    realityObject.publicData[node][valueName]  = {};
                }


                // only trigger the callback if there is new public data, otherwise infinite loop possible
                // todo this is a very time consuming calculation
                if (JSON.stringify(thisMsg.publicData[valueName]) !== JSON.stringify(realityObject.publicData[node][valueName])) {

                    realityObject.publicData[node][valueName] = thisMsg.publicData[valueName];

                    parent.postMessage(JSON.stringify(
                        {
                            version: realityObject.version,
                            object: realityObject.object,
                            frame: realityObject.frame,
                            node: realityObject.frame + node,
                            publicData: thisMsg.publicData[node]
                        }
                    ), "*");

                    callback(thisMsg.publicData[valueName]);
                }

            });
        };

        this.writePublicData = function (node, valueName, value) {

            if(typeof realityObject.publicData[node] === "undefined") {
                realityObject.publicData[node] = {};
            }

            realityObject.publicData[node][valueName] = value;

            _this.ioObject.emit('object/publicData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.frame + node,
                publicData: realityObject.publicData[node]
            }));

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    object: realityObject.object,
                    frame: realityObject.frame,
                    node: realityObject.frame + node,
                    publicData: realityObject.publicData[node]
                }
            ), "*");
        };

        this.writePrivateData = function (node, valueName, value) {

            var thisItem = {};
            thisItem[valueName] = value;

            _this.ioObject.emit('object/privateData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.frame + node,
                privateData: thisItem
            }));
        };

        this.reloadPublicData = function() {
            // reload public data when it becomes visible
            _this.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, frame: realityObject.frame})); //TODO: change to subscribe/realityEditorPublicData ??
        };

        console.log("socket.io is loaded");
    }
    else {

        /**
         ************************************************************
         */
        this.ioObject = {
            on: function (x, cb) {
            }
        };

        /**
         ************************************************************
         */
        this.write = function (node, value, mode) {
        };

        /**
         ************************************************************
         */
        this.read = function (node, data) {
            return undefined;
        };

        /**
         ************************************************************
         */
        this.readRequest = function (node) {
        };

        /**
         ************************************************************
         */
        this.addReadListener = function (node, callback) {

        };

        console.log("socket.io is not working. This is normal when you work offline.");
    }
}




// these are functions used for the setup of logic blocks

function RealityLogic() {
    this.publicData = realityObject.publicData;



    this.readPublicData = function (valueName, value) {
        if (!value)  value = 0;

        if (typeof realityObject.publicData[valueName] === "undefined") {
            realityObject.publicData[valueName] = value;
            return value;
        } else {
            return realityObject.publicData[valueName];
        }
    };

    if (typeof io !== "undefined") {
        var _this = this;

        this.ioObject = io.connect();
        this.oldValueList = {};

        this.addReadPublicDataListener = function (valueName, callback) {
            _this.ioObject.on("block", function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.publicData !== "undefined") {
                    if (typeof thisMsg.publicData[valueName] !== "undefined") {
                        callback(thisMsg.publicData[valueName]);
                    }
                }
            });
        };

        this.sendRealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                _this.ioObject.emit('/subscribe/realityEditorBlock', JSON.stringify(
                    {
                        object: realityObject.object,
                        frame: realityObject.frame,
                        logic:realityObject.logic,
                        block: realityObject.block
                    }));
                clearInterval(_this.sendRealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */

        this.writePublicData = function (valueName, value) {

            realityObject.publicData[valueName] = value;

            this.ioObject.emit('block/publicData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.logic,
                block: realityObject.block,
                publicData: realityObject.publicData
            }));

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    block: realityObject.block,
                    node: realityObject.logic,
                    object: realityObject.object,
                    frame: realityObject.frame,
                    publicData: realityObject.publicData
                }
            ), "*");
        };

        this.writePrivateData = function (valueName, value) {

            var thisItem = {};
            thisItem[valueName] = value;

            this.ioObject.emit('block/privateData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                logic: realityObject.logic,
                block: realityObject.block,
                privateData: thisItem
            }));
        };

        console.log("socket.io is loaded");
    }
    else {

        this.addReadPublicDataListener = function (valueName, callback) {

            realityObject.messageCallBacks.updateLogicGUI = function (msgContent) {
                if (typeof msgContent.publicData !== "undefined") {
                    if (typeof msgContent.publicData[valueName] !== "undefined") {
                        callback(msgContent.publicData[valueName]);
                    }
                }
            };
        };

        /**
         ************************************************************
         */
        this.ioObject = {
            on: function (x, cb) {
            }
        };

        /**
         ************************************************************
         */
        this.writePrivateData = function (valueName, value) {
        };

        /**
         ************************************************************
         */
        this.writePublicData = function (valueName, value) {
        };

        console.log("socket.io is not working. This is normal when you work offline.");
    }

}

var HybridObject = RealityInterface;
var HybridLogic = RealityLogic;

window.addEventListener('load', function() {

    window.addEventListener('message', function (msg) {

        var msgContent = JSON.parse(msg.data);

        if (msgContent.event && msgContent.event.pointerId) {

            var eventData = msgContent.event;
            var event = new PointerEvent(eventData.type, {
                view: window,
                bubbles: true,
                cancelable: true,
                pointerId: eventData.pointerId,
                pointerType: eventData.pointerType,
                x: eventData.x,
                y: eventData.y,
                clientX: eventData.x,
                clientY: eventData.y,
                pageX: eventData.x,
                pageY: eventData.y,
                screenX: eventData.x,
                screenY: eventData.y
            });

            // send unacceptedTouch message if this interface wants touches to pass through it
            if (realityObject.touchDeciderRegistered && eventData.type === 'pointerdown') {
                var touchAccepted = realityObject.touchDecider(eventData);
                if (!touchAccepted) {
                    // console.log('didn\'t touch anything acceptable... propagate to next frame (if any)');
                    if (realityObject.object && realityObject.frame) {

                        parent.postMessage(JSON.stringify({
                            version: realityObject.version,
                            node: realityObject.node,
                            frame: realityObject.frame,
                            object: realityObject.object,
                            unacceptedTouch : eventData
                        }), '*');
                        return;
                    }
                }
            }

            var elt = document.elementFromPoint(eventData.x, eventData.y) || document.body;
            elt.dispatchEvent(event);

            // otherwise send acceptedTouch message to stop the touch propagation
            if (eventData.type === 'pointerdown') {
                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    acceptedTouch : eventData
                }), '*');
            }
        }
    });
});
