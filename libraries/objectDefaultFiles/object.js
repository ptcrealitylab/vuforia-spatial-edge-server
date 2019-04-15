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
(function(exports) {
    if (typeof exports.realityObject !== 'undefined') {
        return;
    }

    var realityObject = {
        node: '',
        frame: '',
        object: '',
        publicData: {},
        modelViewMatrix: [],
    serverIp:"127.0.0,1",
        matrices:{
            modelView : [],
            projection : [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1], // in case it doesn't get set, use identity as placeholder
            groundPlane : [],
            devicePose : [],
            allObjects : {}
        },
        projectionMatrix: [],
        visibility: 'visible',
        sendMatrix: false,
        sendMatrices: {
            modelView : false,
            devicePose : false,
            groundPlane : false,
            allObjects : false
        },
        sendAcceleration: false,
        sendFullScreen: false,
        fullscreenZPosition: 0,
        sendSticky : false,
        height: '100%',
        width: '100%',
        socketIoScript: {},
        socketIoRequest: {},
        socketIoUrl: '',
        style: document.createElement('style'),
        messageCallBacks: {},
        interface : "gui",
        version: 170,
        moveDelay: 400,
        eventObject : {
            version : null,
            object: null,
            frame : null,
            node : null,
            x: 0,
            y: 0,
            type: null},
        touchDecider: null,
        touchDeciderRegistered: false,
        onload: null
    };

    // adding css styles nessasary for acurate 3D transformations.
    realityObject.style.type = 'text/css';
    realityObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0; overflow: hidden;}';
    document.getElementsByTagName('head')[0].appendChild(realityObject.style);

    var realityInterfaces = [];

    function loadObjectSocketIo(object) {
        var script = document.createElement('script');
        script.type = 'text/javascript';

        var url = 'http://' + object.ip + ':8080';
        realityObject.socketIoUrl = url;
        script.src = url + '/socket.io/socket.io.js';

        script.addEventListener('load', function() {
            for (var i = 0; i < realityInterfaces.length; i++) {
                var ho = realityInterfaces[i];
                ho.injectIo();
            }
        });

        document.body.appendChild(script);
    }

    /**
     ************************************************************
     */

    // function for resizing the windows.

    window.addEventListener('message', function (MSG) {
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

        if (msgContent.objectData) {
            if (!realityObject.node) {
                loadObjectSocketIo(msgContent.objectData);
            }
        }

        if (typeof msgContent.node !== 'undefined') {

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
                , '*');

            var alreadyLoaded = !!realityObject.node;
            realityObject.node = msgContent.node;
            realityObject.frame = msgContent.frame;
            realityObject.object = msgContent.object;

            if (!alreadyLoaded) {
                for (var i = 0; i < realityInterfaces.length; i++) {
                    realityInterfaces[i].injectPostMessage();
                }

                if (realityObject.onload) {
                    realityObject.onload();
                }
            }
        } else if (typeof msgContent.logic !== "undefined") {


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

        if (typeof msgContent.modelViewMatrix !== 'undefined') {
            realityObject.modelViewMatrix = msgContent.modelViewMatrix;
            realityObject.matrices.modelView = msgContent.modelViewMatrix;
        }

        if (typeof msgContent.projectionMatrix !== 'undefined') {
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

        if (typeof msgContent.visibility !== 'undefined') {
            realityObject.visibility = msgContent.visibility;

            // reload public data when it becomes visible
            for (var i = 0; i < realityInterfaces.length; i++) {
                if (typeof realityInterfaces[i].ioObject.emit !== 'undefined') {
                    realityInterfaces[i].ioObject.emit('/subscribe/realityEditorPublicData', JSON.stringify({object: realityObject.object, frame: realityObject.frame}));
                }
            }

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
                                stickiness: realityObject.sendSticky
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
        this.pendingSends = [];
        this.pendingIos = [];

        var self = this;
        function makeSendStub(name) {
            return function() {
                self.pendingSends.push({name: name, args: arguments});
            };
        }

        function makeIoStub(name) {
            return function() {
                self.pendingIos.push({name: name, args: arguments});
            };
        }

        if (realityObject.object) {
            this.injectPostMessage();
        } else {
            this.sendGlobalMessage = makeSendStub('sendGlobalMessage');
            this.sendCreateNode = makeSendStub('sendCreateNode');
            this.subscribeToMatrix = makeSendStub('subscribeToMatrix');
            this.subscribeToAcceleration = makeSendStub('subscribeToAcceleration');
            this.setFullScreenOn = makeSendStub('setFullScreenOn');
            this.setFullScreenOff = makeSendStub('setFullScreenOff');
        }

        this.addGlobalMessageListener = function(callback) {
            realityObject.messageCallBacks.globalMessageCall = function (msgContent) {
                if (typeof msgContent.globalMessage !== 'undefined') {
                    callback(msgContent.globalMessage);
                }
            };
        };

        // ensures each callback has a unique name
        var callBackCounter = {
            numMatrixCallbacks : 0,
            numAllMatricesCallbacks :0,
            numWorldMatrixCallbacks :0,
            numGroundPlaneMatrixCallbacks :0
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
                if (typeof msgContent.acceleration !== 'undefined') {
                    callback(msgContent.acceleration);
                }
            };
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
                if (typeof msgContent.visibility !== 'undefined') {
                    callback(msgContent.visibility);
                }
            };
        };

        /**
         ************************************************************
         */

        this.getInterface = function () {
            return realityObject.interface;
        };

        /**
         ************************************************************
         */

        this.addInterfaceListener = function (callback) {
            realityObject.messageCallBacks.interfaceCall = function (msgContent) {
                if (typeof msgContent.interface !== "undefined") {
                    callback(msgContent.interface);
                }
            };
        };

        /**
         ************************************************************
         */

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
         * sets how long you need to tap and hold on the frame in order to start moving it.
         * @param {number} delayInMilliseconds - if value < 0, disables movement
         */
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

        if (typeof io !== 'undefined') {
            this.injectIo();
        } else {
            this.ioObject = {
                on: function() {
                    console.log('ioObject.on stub called, please don\'t');
                }
            };
            this.write = makeIoStub('write');
            this.read = makeIoStub('read');
            this.readRequest = makeIoStub('readRequest');
            this.addReadListener = makeIoStub('addReadListener');
            this.readPublicData = makeIoStub('readPublicData');
            this.addReadPublicDataListener = makeIoStub('addReadPublicDataListener');
            this.writePublicData = makeIoStub('writePublicData');
            this.writePrivateData = makeIoStub('writePrivateData');
            this.reloadPublicData = makeIoStub('reloadPublicData');
        }

        realityInterfaces.push(this);
    }

    RealityInterface.prototype.injectIo = function() {
        var self = this;

        this.ioObject = io.connect(realityObject.socketIoUrl);
        this.oldNumberList = {};

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

        this.sendRealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                self.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, frame: realityObject.frame}));
                clearInterval(self.sendRealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */


        this.write = function (node, value, mode, unit, unitMin, unitMax, forceWrite) {
            mode = mode || 'f';
            unit = unit || false;
            unitMin = unitMin || 0;
            unitMax = unitMax || 1;

            var data = {value: value, mode: mode, unit: unit, unitMin: unitMin, unitMax: unitMax};
            if (!(node in self.oldNumberList)) {
                self.oldNumberList[node] = null;
            }

            if (self.oldNumberList[node] !== value || forceWrite) {
                this.ioObject.emit('object', JSON.stringify({
                    object: realityObject.object,
                    frame: realityObject.frame,
                    node: realityObject.frame + node,
                    data: data
                }));
            }
            self.oldNumberList[node] = value;
        };

        /**
         ************************************************************
         */

        this.readRequest = function (node) {
            this.ioObject.emit('/object/readRequest', JSON.stringify({object: realityObject.object, frame: realityObject.frame, node: realityObject.frame + node}));
        };

        /**
         ************************************************************
         */

        this.read = function (node, msg) {
            if (msg.node === realityObject.frame + node) {
                return msg.item[0].number;
            } else {
                return undefined;
            }
        };

        /**
         ************************************************************
         */

        this.addReadListener = function (node, callback) {
            self.ioObject.on('object', function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.node !== 'undefined') {
                    if (thisMsg.node === realityObject.frame + node) {
                        if (thisMsg.data) {
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
            self.ioObject.on("object/publicData", function (msg) {

                var thisMsg = JSON.parse(msg);

                console.log("------------------   thisMsg: ", thisMsg);

                if (typeof thisMsg.publicData === "undefined"){
                    console.log("------------------   Entire public data UNDEFINED!");
                    return;
                } 

                if (thisMsg.node !== realityObject.frame+node){
                    console.log("------------------   realityObject.frame+node ??!", realityObject.frame+node);
                    return;
                } 

                if (typeof thisMsg.publicData[valueName] === "undefined"){
                    console.log("------------------   UNDEFINED!");
                    return;
                } 

                if(typeof realityObject.publicData[node] === "undefined") {
                    console.log("------------------   Create empty publicData!");
                    realityObject.publicData[node] = {};
                }

                if(typeof realityObject.publicData[node][valueName] === "undefined") {
                    console.log("------------------   Create empty value!");
                    realityObject.publicData[node][valueName]  = {};
                }


                // only trigger the callback if there is new public data, otherwise infinite loop possible
                // todo this is a very time consuming calculation
                if (JSON.stringify(thisMsg.publicData[valueName]) !== JSON.stringify(realityObject.publicData[node][valueName])) {

                    console.log("------------------   There is new public data!");

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

            this.ioObject.emit('object/publicData', JSON.stringify({
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

            this.ioObject.emit('object/privateData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.frame + node,
                privateData: thisItem
            }));
        };

        this.reloadPublicData = function() {
            // reload public data when it becomes visible
            for (var i = 0; i < realityInterfaces.length; i++) {
                if (typeof realityInterfaces[i].ioObject.emit !== 'undefined') {
                    realityInterfaces[i].ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, frame: realityObject.frame})); //TODO: change to subscribe/realityEditorPublicData ??
                }
            }
        };

        console.log('socket.io is loaded and injected');

        for (var i = 0; i < this.pendingIos.length; i++) {
            var pendingIo = this.pendingIos[i];
            this[pendingIo.name].apply(this, pendingIo.args);
        }
        this.pendingIos = [];
    };

    RealityInterface.prototype.injectPostMessage = function() {
        this.sendGlobalMessage = function (ohMSG) {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                globalMessage: ohMSG
            }), '*');
        };

        this.sendCreateNode = function (name) {
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                createNode: {name: name}
            }), '*');
        };

        // subscriptions
        this.subscribeToMatrix = function() {
            realityObject.sendMatrix = true;
            realityObject.sendMatrices.modelView = true;
            if (typeof realityObject.node !== 'undefined' || typeof realityObject.frame !== 'undefined') {

                if (realityObject.sendFullScreen === false) {
                    realityObject.height = document.body.scrollHeight;
                    realityObject.width = document.body.scrollWidth;
                }

                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
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
                        sendMatrices : realityObject.sendMatrices,
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
                        sendMatrices : realityObject.sendMatrices,
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
                        sendMatrices : realityObject.sendMatrices,
                        sendAcceleration: realityObject.sendAcceleration,
                        fullScreen: realityObject.sendFullScreen,
                        stickiness: realityObject.sendSticky
                    }), "*");
            }
        };

        // subscriptions
        this.subscribeToAcceleration = function () {
            realityObject.sendAcceleration = true;
            parent.postMessage(JSON.stringify({
                version: realityObject.version,
                node: realityObject.node,
                frame: realityObject.frame,
                object: realityObject.object,
                height: realityObject.height,
                width: realityObject.width,
                sendMatrix: realityObject.sendMatrix,
                sendMatrices : realityObject.sendMatrices,
                sendAcceleration: realityObject.sendAcceleration,
                stickiness: realityObject.sendSticky,
                fullScreen: realityObject.sendFullScreen
            }), '*');
        };

        this.setFullScreenOn = function(zPosition) {
            realityObject.sendFullScreen = true;
            console.log('fullscreen is loaded');
            if (typeof realityObject.node !== "undefined" || typeof realityObject.frame !== "undefined") {

                realityObject.height = '100%';
                realityObject.width = '100%';
                if (zPosition !== undefined) {
                    realityObject.fullscreenZPosition = zPosition;
                }

                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    fullscreenZPosition: realityObject.fullscreenZPosition,
                    stickiness: realityObject.sendSticky
                }), '*');
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

                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    height: realityObject.height,
                    width: realityObject.width,
                    sendMatrix: realityObject.sendMatrix,
                    sendMatrices : realityObject.sendMatrices,
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    stickiness: realityObject.sendSticky
                }), '*');
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
                        sendMatrices : realityObject.sendMatrices,
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
                        sendMatrices : realityObject.sendMatrices,
                        sendAcceleration: realityObject.sendAcceleration,
                        fullScreen: realityObject.sendFullScreen,
                        stickiness: false
                    }), "*");
            }

        };

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

        for (var i = 0; i < this.pendingSends.length; i++) {
            var pendingSend = this.pendingSends[i];
            this[pendingSend.name].apply(this, pendingSend.args);
        }
        this.pendingSends = [];
    };

    window.onload = function() {

        window.addEventListener('message', function (msg) {

            var msgContent = JSON.parse(msg.data);

            if (msgContent.reloadPublicData) {
                console.log('frame reload public data from post message');
                realityInterface.reloadPublicData();
            }

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
                if (realityObject.touchDeciderRegistered) {
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
                parent.postMessage(JSON.stringify({
                    version: realityObject.version,
                    node: realityObject.node,
                    frame: realityObject.frame,
                    object: realityObject.object,
                    acceptedTouch : eventData
                }), '*');
            }
        });
    };

    function isDesktop() {
        return window.navigator.userAgent.indexOf('Mobile') === -1 || window.navigator.userAgent.indexOf('Macintosh') > -1;
    }

    exports.realityObject = realityObject;
    exports.RealityInterface = RealityInterface;
    exports.HybridObject = RealityInterface;

    exports.isDesktop = isDesktop;

})(window);
