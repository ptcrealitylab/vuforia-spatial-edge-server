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
    projectionMatrix: [],
    visibility: "visible",
    sendMatrix: false,
    sendAcceleration: false,
    sendFullScreen: false,
    sendScreenObject : false,
    fullscreenZPosition: 0,
    sendSticky : false,
    height: "100%",
    width: "100%",
    socketIoScript: {},
    socketIoRequest: {},
    style: document.createElement('style'),
    messageCallBacks: {},
    interface : "gui",
    version: 200,
    moveDelay: 1000,
    eventObject : {
        version : null,
        object: null,
        frame : null,
        node : null,
        x: 0,
        y: 0,
        type: null}
};

// adding css styles nessasary for acurate 3D transformations.
realityObject.style.type = 'text/css';
realityObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(realityObject.style);

// Load socket.io.js synchronous so that it is available by the time the rest of the code is executed.
realityObject.socketIoRequest = new XMLHttpRequest();
realityObject.socketIoRequest.open('GET', "/socket.io/socket.io.js", false);
realityObject.socketIoRequest.send();

//Only add script if fetch was successful
if (realityObject.socketIoRequest.status === 200) {
    realityObject.socketIoScript = document.createElement('script');
    realityObject.socketIoScript.type = "text/javascript";
    realityObject.socketIoScript.text = realityObject.socketIoRequest.responseText;
    document.getElementsByTagName('head')[0].appendChild(realityObject.socketIoScript);
} else {
    console.log("Error XMLHttpRequest HTTP status: " + realityObject.socketIoRequest.status);
}

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

realityObject.messageCallBacks.mainCall = function (msgContent) {

    // console.log("------------------------------");
    // console.log(msgContent);

    if (msgContent.newObject) {
        realityObject.object = msgContent.newObject;
        // update sockets / callbacks

    }

    if (msgContent.newFrame) {
        realityObject.frame = msgContent.newFrame;
        // update sockets / callbacks

    }

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
                sendAcceleration: realityObject.sendAcceleration,
                fullScreen: realityObject.sendFullScreen,
                stickiness: realityObject.sendSticky
            }
            )
            // this needs to contain the final interface source
            , "*");

        realityObject.node = msgContent.node;
        realityObject.frame = msgContent.frame;
        realityObject.object = msgContent.object;
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
    }

    if (typeof msgContent.modelViewMatrix !== "undefined") {
        realityObject.modelViewMatrix = msgContent.modelViewMatrix;
    }

    if (typeof msgContent.projectionMatrix !== "undefined") {
        realityObject.projectionMatrix = msgContent.projectionMatrix;
    }

    if (typeof msgContent.visibility !== "undefined") {
        realityObject.visibility = msgContent.visibility;

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

function HybridObject() {

    /**
     ************************************************************
     */

    this.sendGlobalMessage = function (ohMSG) {
        if (typeof realityObject.node !== "undefined") {
            var msgg = JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    globalMessage: ohMSG
                });
            window.parent.postMessage(msgg
                , "*");
        }
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

    this.addMatrixListener = function (callback) {
        realityObject.messageCallBacks.matrixCall = function (msgContent) {
            if (typeof msgContent.modelViewMatrix !== "undefined") {
                callback(msgContent.modelViewMatrix, realityObject.projectionMatrix);
            }
        }
    };

    this.addAccelerationListener = function (callback) {
        console.log("got this");
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
        if (typeof realityObject.node !== "undefined") {

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
        if (typeof realityObject.node !== "undefined") {

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
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: false
                }), "*");
        }

    };

    this.activateScreenObject = function() {
        realityObject.sendScreenObject = true;
        parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            sendScreenObject : true
        }), '*');
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
    }

    this.getPositionX = function () {
        if (typeof realityObject.modelViewMatrix[12] !== "undefined") {
            return realityObject.modelViewMatrix[12];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPositionY = function () {
        if (typeof realityObject.modelViewMatrix[13] !== "undefined") {
            return realityObject.modelViewMatrix[13];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPositionZ = function () {
        if (typeof realityObject.modelViewMatrix[14] !== "undefined") {
            return realityObject.modelViewMatrix[14];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getProjectionMatrix = function () {
        if (typeof realityObject.projectionMatrix !== "undefined") {
            return realityObject.projectionMatrix;
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getModelViewMatrix = function () {
        if (typeof realityObject.modelViewMatrix !== "undefined") {
            return realityObject.modelViewMatrix;
        } else return undefined;
    };

    this.setMoveDelay = function(delayInMilliseconds) {
        realityObject.moveDelay = delayInMilliseconds
    };

    if (typeof io !== "undefined") {
        var _this = this;

        this.ioObject = io.connect();
        this.oldValueList = {};

        this.sendEealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                _this.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, protocol: realityObject.protocol}));
                clearInterval(_this.sendEealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */


        this.write = function (node, value, mode, unit, unitMin, unitMax) {
            if (!mode)  mode = "f";
            if (!unit)  unit = false;
            if (!unitMin)  unitMin = 0;
            if (!unitMax)  unitMax = 1;

            var thisData = {value: value, mode: mode, unit: unit, unitMin: unitMin, unitMax: unitMax};
            if (!node in _this.oldValueList) {
                _this.oldValueList[node] = null;
            }

            if (_this.oldValueList[node] !== value) {
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
                if (typeof msgContent.screenObject !== "undefined") {
                    _this.ioObject.emit('/object/screenObject', JSON.stringify(msgContent.screenObject));
                }
            };
        };

        this.addScreenObjectReadListener = function () {
            _this.ioObject.on("/object/screenObject", function (msg) {
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
                        node: thisMsg.node
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
            this.ioObject.emit('/object/readRequest', JSON.stringify({object: realityObject.object, frame: realityObject.object+realityObject.frame, node: realityObject.object+realityObject.frame+node}));
        };

        /**
         ************************************************************
         */

        this.read = function (node, msg) {
            if (msg.node === realityObject.object+realityObject.frame+node) {
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
                    if (thisMsg.node === realityObject.object+realityObject.frame+node) {
                        if (typeof thisMsg.data !== "undefined")
                            callback(thisMsg.data.value);
                    }
                }
            });
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

function HybridLogic() {
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



        this.sendEealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                _this.ioObject.emit('/subscribe/realityEditorBlock', JSON.stringify(
                    {
                        object: realityObject.object,
                        frame: realityObject.frame,
                        logic:realityObject.logic,
                        block: realityObject.block
                    }));
                clearInterval(_this.sendEealityEditorSubscribe);
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
                logic: realityObject.logic,
                block: realityObject.block,
                publicData: realityObject.publicData
            }));

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    block: realityObject.block,
                    logic: realityObject.logic,
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

document.addEventListener('DOMContentLoaded', function() {
    var touchTimer = null;
    var sendTouchEvents = false;
    var startCoords = {
        x: 0,
        y: 0
    };
    var touchMoveTolerance = 100;

    function getTouchX(event) {
        return event.changedTouches[0].screenX;
    }

    function getTouchY(event) {
        return event.changedTouches[0].screenY;
    }

    function getScreenPosition(event) {
        realityObject.eventObject.version = realityObject.version;
        realityObject.eventObject.object = realityObject.object;
        realityObject.eventObject.frame = realityObject.frame;
        realityObject.eventObject.node = realityObject.node;
        realityObject.eventObject.x = event.changedTouches[0].screenX;
        realityObject.eventObject.y = event.changedTouches[0].screenY;
        realityObject.eventObject.type = event.type;
        return realityObject.eventObject;
    }

    function sendEventObject(event) {

        parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            eventObject: getScreenPosition(event)
        }), '*');
    }


    function sendTouchEvent(event) {
        parent.postMessage(JSON.stringify({
            version: realityObject.version,
            node: realityObject.node,
            frame: realityObject.frame,
            object: realityObject.object,
            touchEvent: {
                type: event.type,
                x: getTouchX(event),
                y: getTouchY(event)
            }
        }), '*');
    }

    document.body.addEventListener('touchstart', function(event) {
        sendEventObject(event);
        if (!realityObject.width) {
            return;
        }

        if (touchTimer) {
            return;
        }

        startCoords.x = getTouchX(event);
        startCoords.y = getTouchY(event);

        touchTimer = setTimeout(function() {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                beginTouchEditing: true
            }), '*');
            sendTouchEvents = true;
            touchTimer = null;
        }, realityObject.moveDelay);
    });


    document.body.addEventListener('touchmove', function(event) {
        sendEventObject(event);

        if (sendTouchEvents) {
            sendTouchEvent(event);
        } else if (touchTimer) {
            var dx = getTouchX(event) - startCoords.x;
            var dy = getTouchY(event) - startCoords.y;
            if (dx * dx + dy * dy > touchMoveTolerance) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }
    });

    document.body.addEventListener('touchend', function(event) {
        sendEventObject(event);
        if (sendTouchEvents) {
            sendTouchEvent(event);
        }
        clearTimeout(touchTimer);
        touchTimer = null;
    });

    window.addEventListener('message', function (msg) {
        var msgContent = JSON.parse(msg.data);
        if (msgContent.stopTouchEditing) {
            sendTouchEvents = false;
        }
    });
}, false);
