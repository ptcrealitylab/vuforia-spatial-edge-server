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

// Load socket.io.js synchronous so that it is available by the time the rest of the code is executed.
var xhr = new XMLHttpRequest();
xhr.open('GET', "/socket.io/socket.io.js", false);
xhr.send();

//Only add script if fetch was successful
if (xhr.status == 200) {
    var objectNodeScript = document.createElement('script');
    objectNodeScript.type = "text/javascript";
    objectNodeScript.text = xhr.responseText;
    document.getElementsByTagName('head')[0].appendChild(objectNodeScript);
} else {
    console.log("Error XMLHttpRequest HTTP status: " + xhr.status);
}
var objectVersion = "1.0";
var objects = {};
objects.modelViewMatrix = [];
objects.projectionMatrix = [];
objects.visibility = "visible";
var objectsSendMatrix = false;
var objectsSendFullScreen = false;
var objectsHeight ="100%";
var objectsWidth = "100%";

// function for resizing the windows.
window.addEventListener("message", function (MSG) {
    var msg = JSON.parse(MSG.data);

    if (typeof msg.node !== "undefined") {

        if(objectsSendFullScreen === false){
            objectsHeight = document.body.scrollHeight;
            objectsWidth = document.body.scrollWidth;
        }

        parent.postMessage(JSON.stringify(
            {
                "node": msg.node,
                "object": msg.object,
                "height": objectsHeight,
                "width":objectsWidth,
                "sendMatrix" : objectsSendMatrix,
                "fullScreen" : objectsSendFullScreen
            }
            )
            // this needs to contain the final interface source
            , "*");

        objects.node = msg.node;
        objects.object = msg.object;
    }

    if (typeof msg.modelViewMatrix !== "undefined") {
        objects.modelViewMatrix = msg.modelViewMatrix;
    }

    if (typeof msg.projectionMatrix !== "undefined") {
        objects.projectionMatrix = msg.projectionMatrix;
    }

    if (typeof msg.visibility !== "undefined") {
        objects.visibility = msg.visibility;
    }

}, false);

// adding css styles nessasary for acurate 3D transformations.
var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = 'body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(style);


function HybridObject() {


    this.sendGlobalMessage = function(ohMSG) {
        if (typeof objects.node !== "undefined") {
            var msgg = JSON.stringify(
                {
                    "node": objects.node,
                    "object": objects.object,
                    "ohGlobalMessage" : ohMSG
                });
            window.parent.postMessage(msgg
                , "*");
         }
    };

    this.addGlobalMessageListener = function (callback) {

        window.addEventListener("message", function (MSG) {
            var msg = JSON.parse(MSG.data);
            if (typeof msg.ohGlobalMessage !== "undefined") {
                callback(msg.ohGlobalMessage);
            }
        }, false);

    };

    this.addMatrixListener = function (callback) {
        window.addEventListener("message", function (MSG) {
            var msg = JSON.parse(MSG.data);
            if (typeof msg.modelViewMatrix !== "undefined") {
                callback(msg.modelViewMatrix, objects.projectionMatrix);
            }
        }, false);

    };

    // subscriptions
    this.subscribeToMatrix = function() {
        objectsSendMatrix = true;
        if (typeof objects.node !== "undefined") {

            if(objectsSendFullScreen === false){
                objectsHeight = document.body.scrollHeight;
                objectsWidth = document.body.scrollWidth;
            }

            parent.postMessage(JSON.stringify(
                {
                    "node": objects.node,
                    "object": objects.object,
                    "height": objectsHeight,
                    "width": objectsWidth,
                    "sendMatrix": objectsSendMatrix,
                    "fullScreen": objectsSendFullScreen
                }), "*");
        }
    };

    this.setFullScreenOn = function() {
        objectsSendFullScreen = true;
        console.log("fullscreen is loaded");
        if (typeof objects.node !== "undefined") {

            objectsHeight = "100%";
            objectsWidth = "100%";

            parent.postMessage(JSON.stringify(
                {
                    "node": objects.node,
                    "object": objects.object,
                    "height": objectsHeight,
                    "width": objectsWidth,
                    "sendMatrix": objectsSendMatrix,
                    "fullScreen": objectsSendFullScreen
                }), "*");
        }
    };

    this.setFullScreenOff = function() {
        objectsSendFullScreen = false;
        if (typeof objects.node !== "undefined") {

             objectsHeight = document.body.scrollHeight;
             objectsWidth = document.body.scrollWidth;

            parent.postMessage(JSON.stringify(
                {
                    "node": objects.node,
                    "object": objects.object,
                    "height": objectsHeight,
                    "width": objectsWidth,
                    "sendMatrix": objectsSendMatrix,
                    "fullScreen": objectsSendFullScreen
                }), "*");
        }
    };

    this.getVisibility = function() {
        return objects.visibility;
    };

    this.addVisibilityListener = function (callback) {
        window.addEventListener("message", function (MSG) {
            var msg = JSON.parse(MSG.data);
            if (typeof msg.visibility !== "undefined") {
                callback(msg.visibility);
            }
        }, false);
    };
    
    this.getPossitionX = function() {
        if (typeof objects.modelViewMatrix[12] !== "undefined") {
            return objects.modelViewMatrix[12];
        } else return undefined;
    };

    this.getPossitionY = function() {
        if (typeof objects.modelViewMatrix[13] !== "undefined") {
            return objects.modelViewMatrix[13];
        } else return undefined;
    };

    this.getPossitionZ = function() {
        if (typeof objects.modelViewMatrix[14] !== "undefined") {
            return objects.modelViewMatrix[14];
        } else return undefined;
    };

    this.getProjectionMatrix = function() {
        if (typeof objects.projectionMatrix !== "undefined") {
            return objects.projectionMatrix;
        } else return undefined;
    };

    this.getModelViewMatrix = function() {
        if (typeof objects.modelViewMatrix !== "undefined") {
            return objects.modelViewMatrix;
        } else return undefined;
    };
    
    if (typeof io !== "undefined") {
        var thisOHObjectIdentifier = this;

        this.object = io.connect();
        this.oldValueList = {};

            this.sendServerSubscribe = setInterval(function() {
                if(objects.object) {
                    thisOHObjectIdentifier.object.emit('/subscribe/realityEditor', JSON.stringify({object: objects.object}));
                    clearInterval(thisOHObjectIdentifier.sendServerSubscribe);
                }
            }, 10);

        this.write = function (node, number, mode, unit, unitMin, unitMax) {
                if(typeof mode !== 'undefined')  mode = "f";
                if(typeof unit !== 'undefined')  unit = false;
                if(typeof unitMin !== 'undefined')  unitMin = 0;
                if(typeof unitMax !== 'undefined')  unitMax = 1;

            var nodeData = {number:number, mode:mode, unit:unit, unitMin:unitMin, unitMax:unitMax};

            if(!node in thisOHObjectIdentifier.oldValueList){
                thisOHObjectIdentifier.oldValueList[node]= null;
            }

            if(thisOHObjectIdentifier.oldValueList[node] !== number) {
                this.object.emit('object', JSON.stringify({object: objects.object, node: node, block: "R0C0", data: nodeData}));
            }
            thisOHObjectIdentifier.oldValueList[node] = number;
        };

        this.readRequest = function (node) {
            this.object.emit('/object/value', JSON.stringify({object: objects.object, node: node, block:"R0C0"}));
        };

        this.read = function (node, data) {
            if (data.node === node) {
                return data.data.number;
            } else {
                return undefined;
            }
        };

        this.addReadListener = function (node, callback) {
            thisOHObjectIdentifier.object.on("object", function (msg) {
                var data = JSON.parse(msg);

                if (typeof data.node !== "undefined") {
                    if (data.node === node) {
                        if (typeof data.data.number !== "undefined")
                            callback(data.data.number);
                    }
                }
            });
        };
        
        console.log("socket.io is loaded");
    }
    else {
        this.object = {
            on: function (x, cb) {
            }
        };
        this.write = function (node, number, mode) {
        };
        this.read = function (node, data) {
            return undefined;
        };
        this.readRequest = function (node) {
        };
        console.log("socket.io is not working. This is normal when you work offline.");
    }
}