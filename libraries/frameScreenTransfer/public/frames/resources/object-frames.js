var sendTouchEvents = false;
(function(exports) {

    if (typeof exports.realityObject !== 'undefined') {
        return;
    }

    var realityObject = {
        node: '',
        frame: '',
        object: '',
        modelViewMatrix: [],
        projectionMatrix: [],
        visibility: 'visible',
        sendMatrix: false,
        sendAcceleration: false,
        sendFullScreen: false,
        fullscreenZPosition: 0,
        height: '100%',
        width: '100%',
        socketIoScript: {},
        socketIoRequest: {},
        socketIoUrl: '',
        style: document.createElement('style'),
        messageCallBacks: {},
        version: 170,
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
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen
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
        }

        if (typeof msgContent.projectionMatrix !== 'undefined') {
            realityObject.projectionMatrix = msgContent.projectionMatrix;
        }

        if (typeof msgContent.visibility !== 'undefined') {
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
                                stickiness: realityObject.sendSticky
                            }), "*");
                    }
                }
            }
        }

    };

    /**
     ************************************************************
     */

    function RealityInterface() {
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

        this.addMatrixListener = function(callback) {
            realityObject.messageCallBacks.matrixCall = function (msgContent) {
                if (typeof msgContent.modelViewMatrix !== 'undefined') {
                    callback(msgContent.modelViewMatrix, realityObject.projectionMatrix);
                }
            };
        };

        this.addAccelerationListener = function (callback) {
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
            return realityObject.projectionMatrix;
        };

        /**
         ************************************************************
         */

        this.getModelViewMatrix = function () {
            return realityObject.modelViewMatrix;
        };

        this.setMoveDelay = function(delayInMilliseconds) {
            realityObject.moveDelay = delayInMilliseconds
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
        }

        realityInterfaces.push(this);
    }

    RealityInterface.prototype.injectIo = function() {
        var self = this;

        this.ioObject = io.connect(realityObject.socketIoUrl);
        this.oldNumberList = {};

        this.sendRealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                self.ioObject.emit('/subscribe/realityEditor', JSON.stringify({object: realityObject.object, frame: realityObject.frame}));
                clearInterval(self.sendRealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */


        this.write = function (node, value, mode, unit, unitMin, unitMax) {
            mode = mode || 'f';
            unit = unit || false;
            unitMin = unitMin || 0;
            unitMax = unitMax || 1;

            var data = {value: value, mode: mode, unit: unit, unitMin: unitMin, unitMax: unitMax};
            if (!(node in self.oldNumberList)) {
                self.oldNumberList[node] = null;
            }

            if (self.oldNumberList[node] !== value) {
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
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen
                }), '*');
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
                sendAcceleration: realityObject.sendAcceleration,
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
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen,
                    fullscreenZPosition: realityObject.fullscreenZPosition
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
                    sendAcceleration: realityObject.sendAcceleration,
                    fullScreen: realityObject.sendFullScreen
                }), '*');
            }
        };

        for (var i = 0; i < this.pendingSends.length; i++) {
            var pendingSend = this.pendingSends[i];
            this[pendingSend.name].apply(this, pendingSend.args);
        }
        this.pendingSends = [];
    };

    var touchTimer = null;
    // var sendTouchEvents = false;
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
    
    window.onload = function() {
        document.body.addEventListener('touchstart', function() {
            sendEventObject(event);
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
            if (msg.origin === "https://www.youtube.com") return; // TODO: make a more generalized solution for this...

            var msgContent = JSON.parse(msg.data);
            if (msgContent.stopTouchEditing) {
                sendTouchEvents = false;
            }

            if (msgContent.event) {
                var eventData = msgContent.event;
               var event = new PointerEvent(eventData.type, {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                event.pointerId = eventData.pointerId;
                event.pointerType = eventData.pointerType;
                event.x = eventData.x;
                event.y = eventData.y;
                event.clientX = eventData.x;
                event.clientY = eventData.y;
                event.pageX = eventData.x;
                event.pageY = eventData.y;
                event.screenX = eventData.x;
                event.screenY = eventData.y;

                var elt = document.elementFromPoint(eventData.x, eventData.y) || document.body;
                elt.dispatchEvent(event);
            }
        });
    };

    exports.realityObject = realityObject;
    exports.RealityInterface = RealityInterface;
    exports.HybridObject = RealityInterface;

}(window));
