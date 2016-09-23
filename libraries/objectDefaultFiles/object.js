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
    object: "",
    modelViewMatrix: [],
    projectionMatrix: [],
    visibility: "visible",
    sendMatrix: false,
    sendFullScreen: false,
    height: "100%",
    width: "100%",
    socketIoScript: {},
    socketIoRequest: {},
    style: document.createElement('style'),
    messageCallBacks: {},
    version: 170
};

// adding css styles nessasary for acurate 3D transformations.
realityObject.style.type = 'text/css';
realityObject.style.innerHTML = 'body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(realityObject.style);

// Load socket.io.js synchronous so that it is available by the time the rest of the code is executed.
realityObject.socketIoRequest = new XMLHttpRequest();
realityObject.socketIoRequest.open('GET', "/socket.io/socket.io.js", false);
realityObject.socketIoRequest.send();

//Only add script if fetch was successful
if (realityObject.socketIoRequest.status == 200) {
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

    if (typeof msgContent.node !== "undefined") {

        if (realityObject.sendFullScreen === false) {
            realityObject.height = document.body.scrollHeight;
            realityObject.width = document.body.scrollWidth;
        }

        parent.postMessage(JSON.stringify(
            {
                version: realityObject.version,
                node: msgContent.node,
                object: msgContent.object,
                height: realityObject.height,
                width: realityObject.width,
                sendMatrix: realityObject.sendMatrix,
                fullScreen: realityObject.sendFullScreen
            }
            )
            // this needs to contain the final interface source
            , "*");

        realityObject.node = msgContent.node;
        realityObject.object = msgContent.object;
    }

    if (typeof msgContent.modelViewMatrix !== "undefined") {
        realityObject.modelViewMatrix = msgContent.modelViewMatrix;
    }

    if (typeof msgContent.projectionMatrix !== "undefined") {
        realityObject.projectionMatrix = msgContent.projectionMatrix;
    }

    if (typeof msgContent.visibility !== "undefined") {
        realityObject.visibility = msgContent.visibility;
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

    /**
     ************************************************************
     */
    // subscriptions
    this.subscribeToMatrix = function () {
        realityObject.sendMatrix = true;
        if (typeof realityObject.node !== "undefined") {

            if (realityObject.sendFullScreen === false) {
                realityObject.height = document.body.scrollHeight;
                realityObject.width = document.body.scrollWidth;
            }

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    fullScreen: realityObject.sendFullScreen
                }), "*");
        }
    };

    /**
     ************************************************************
     */

    this.setFullScreenOn = function () {
        realityObject.sendFullScreen = true;
        console.log("fullscreen is loaded");
        if (typeof realityObject.node !== "undefined") {

            realityObject.height = "100%";
            realityObject.width = "100%";

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    node: realityObject.node,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    fullScreen: realityObject.sendFullScreen
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
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    fullScreen: realityObject.sendFullScreen
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

    this.getPossitionX = function () {
        if (typeof realityObject.modelViewMatrix[12] !== "undefined") {
            return realityObject.modelViewMatrix[12];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPossitionY = function () {
        if (typeof realityObject.modelViewMatrix[13] !== "undefined") {
            return realityObject.modelViewMatrix[13];
        } else return undefined;
    };

    /**
     ************************************************************
     */

    this.getPossitionZ = function () {
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

    if (typeof io !== "undefined") {
        var _this = this;

        this.ioObject = io.connect();
        this.oldNumberList = {};

        this.sendEealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                _this.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object}));
                clearInterval(_this.sendEealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */


        this.write = function (node, number, mode, unit, unitMin, unitMax) {
            if (!mode)  mode = "f";
            if (!unit)  unit = false;
            if (!unitMin)  unitMin = 0;
            if (!unitMax)  unitMax = 1;

            var thisItem = [{number: number, mode: mode, unit: unit, unitMin: unitMin, unitMax: unitMax}];
            if (!node in _this.oldNumberList) {
                _this.oldNumberList[node] = null;
            }

            if (_this.oldNumberList[node] !== number) {
                this.ioObject.emit('object', JSON.stringify({
                    object: realityObject.object,
                    node: realityObject.object+node,
                    item: thisItem
                }));
            }
            _this.oldNumberList[node] = number;
        };

        /**
         ************************************************************
         */

        this.readRequest = function (node) {
            this.ioObject.emit('/object/readRequest', JSON.stringify({object: realityObject.object, node: realityObject.object+node}));
        };

        /**
         ************************************************************
         */

        this.read = function (node, msg) {
            if (msg.node === realityObject.object+node) {
                return msg.item[0].number;
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
                    if (thisMsg.node === realityObject.object+node) {
                        if (typeof thisMsg.item !== "undefined")
                            callback(thisMsg.item[0].number);
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
        this.write = function (node, number, mode) {
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