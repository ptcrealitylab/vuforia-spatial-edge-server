// eslint-disable-next-line no-unused-vars
/* global workerId */

/**
 * @fileOverview
 *
 * object.js provides the SpatialInterface API, forming a bridge between the
 * tool and the containing user interface. Calling a method on the
 * SpatialInterface usually calls postMessage to send a message from the tool
 * iframe to the user interface which will then take an action on behalf of the
 * tool.
 */
(function(exports) {
    /* eslint no-inner-declarations: "off" */
    // makes sure this only gets loaded once per iframe
    if (typeof exports.spatialObject !== 'undefined') {
        return;
    }

    // Hardcoded for now, host of the internet of screens.
    var iOSHost = 'https://localhost:5000';

    // Keeps track of all state related to this frame and its API interactions
    var spatialObject = {
        alreadyLoaded: false,
        node: '',
        frame: '',
        object: '',
        publicData: {},
        modelViewMatrix: [],
        serverIp: '127.0.0.1',
        serverPort: '8080',
        matrices: {
            modelView: [],
            projection: [],
            groundPlane: [],
            anchoredModelView: [],
            devicePose: [],
            allObjects: {}
        },
        projectionMatrix: [],
        visibility: 'visible',
        sendMatrix: false,
        sendMatrices: {
            modelView: false,
            devicePose: false,
            groundPlane: false,
            anchoredModelView: false,
            allObjects: false
        },
        sendScreenPosition: false,
        sendDeviceDistance: false,
        sendAcceleration: false,
        sendFullScreen: false,
        sendScreenObject: false,
        sendObjectPositions: {},
        fullscreenZPosition: 0,
        sendSticky: false,
        isFullScreenExclusive: false,
        attachesTo: null,
        wasToolJustCreated: null,
        isPinned: true,
        alwaysFaceCamera: false,
        height: '100%',
        width: '100%',
        socketIoScript: {},
        socketIoRequest: {},
        socketIoUrl: '',
        style: document.createElement('style'),
        messageCallBacks: {},
        interface: 'gui',
        version: 170,
        moveDelay: 400,
        visibilityDistance: 2.0,
        customInteractionMode: false, // this is how frames used to respond to touches. change to true and add class realityInteraction to certain divs to make only some divs interactable
        invertedInteractionMode: false, // if true, inverts the behavior of customInteractionMode. divs with realityInteraction are the only ones that can move the frame, all others are interactable
        eventObject: {
            version: null,
            object: null,
            frame: null,
            node: null,
            x: 0,
            y: 0,
            type: null},
        touchDecider: null,
        touchDeciderRegistered: false,
        unacceptedTouchInProgress: false,
        ignoreAllTouches: false,
        // onFullScreenEjected: null,
        onload: null
    };

    /**
     * Generates a random 12 character unique identifier using uppercase, lowercase, and numbers (e.g. "OXezc4urfwja")
     * @return {string}
     */
    function uuidTime () {
        var dateUuidTime = new Date();
        var abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + '' + dateUuidTime.getTime()).toString(36);
        while (stampUuidTime.length < 11) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
        return '_' + stampUuidTime;
    }

    var sessionUuid = uuidTime(); // prevents this application from sending itself data

    console.log('fullscreen reset for new frame ' + spatialObject.sendFullScreen);

    // adding css styles nessasary for acurate 3D transformations.
    spatialObject.style.type = 'text/css';
    spatialObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0; overflow: hidden;}';
    document.getElementsByTagName('head')[0].appendChild(spatialObject.style);

    // this will be initialized once the frame creates a new SpatialInterface()
    var realityInterface = null;

    /**
     * Network configuration loaded in loadObjectSocketIO from window.location
     * based on the /n/:networkId/s/:secret/i/:destinationId format
     */
    let urlObj = {
        n: null, // Network identifier
        i: null, // Destination identifier
        s: null, // Network secret used for write access
    };

    /**
     * Given a normal socket io title (message topic), adds all available
     * network specifiers to the title.
     *
     * These include network id (n), secret (s), and destination id (i).
     *
     * For example, "/object/readPublicData" becomes
     * "/n/asdf/s/secret/i/destId/object/readPublicData"
     *
     * @param {string} title
     * @return {string} title with additional information from urlObj prepended
     */
    function getIoTitle (title) {
        if (urlObj.n) {
            if (title.charAt(0) !== '/') title = '/' + title;
            let network = null;
            let destinationIdentifier = null;
            let secret = null;
            if (urlObj.n) network = urlObj.n;
            if (urlObj.s) secret = urlObj.s;
            if (urlObj.i) destinationIdentifier = urlObj.i;

            let returnUrl = '';
            if (network) returnUrl += '/n/' + network;
            if (destinationIdentifier) returnUrl += '/i/' + destinationIdentifier;
            if (secret) returnUrl += '/s/' + secret;
            if (title) returnUrl += title;
            return returnUrl;
        } else {
            return title;
        }
    }

    /**
     * automatically injects the socket.io script into the page once the editor has posted frame info into the page
     * @param {{ip: string}} object - data object containing the server IP of the object
     */
    function loadObjectSocketIo(object) {
        var script = document.createElement('script');
        script.type = 'text/javascript';

        let defaultPort = '8080';
        if (object.hasOwnProperty('port')) defaultPort = object.port;

        var url = null;
        let urlSplit = null;
        if (parseInt(Number(defaultPort))) {
            if (object.ip === spatialObject.serverIp) {
                url = location.protocol + '//localhost:' + defaultPort;
            } else {
                url = location.protocol + '//' + object.ip + ':' + defaultPort;
            }
        } else {
            urlSplit = location.pathname.split('/');
            for (let i = 0; i < urlSplit.length; i++) {
                if (['n', 'i', 's'].includes(urlSplit[i])) {
                    if (urlSplit[i + 1])
                        urlObj[urlSplit[i]] = urlSplit[i + 1];
                    i++;
                }
            }

            url = location.protocol + '//' + object.ip + ':';
            if (location.protocol === 'https:' || location.protocol === 'wss:') url +=  '' + 443; else url += '' + 80;
            if (urlObj.n) url += '/n/' + urlObj.n;
            if (urlObj.i) url += '/i/' + urlObj.i;
            if (urlObj.s) url += '/s/' + urlObj.s;
        }

        spatialObject.serverPort = defaultPort;

        spatialObject.socketIoUrl = url;
        script.src = url + '/objectDefaultFiles/toolsocket.js';

        script.addEventListener('load', function() {
            if (realityInterface) {
                // adds the API methods related to sending/receiving socket messages
                realityInterface.injectSocketIoAPI();
            }
        });

        document.body.appendChild(script);
    }

    /**
     * Triggers all messageCallbacks functions.
     * spatialObject.messageCallBacks.mainCall is the primary function always triggered by this, but additional
     * messageCallbacks are added by calling the methods in realityInterface.injectMessageListenerAPI
     */
    window.addEventListener('message', function (MSG) {
        if (!MSG.data) { return; }
        if (typeof MSG.data !== 'string') { return; }
        var msgContent = JSON.parse(MSG.data);
        for (var key in spatialObject.messageCallBacks) {
            spatialObject.messageCallBacks[key](msgContent);
        }
    }, false);

    // TODO: DEBUG what this really does and why it's needed
    function tryResend() {
        var windowMatches = window.location.search.match(/nodeKey=([^&]+)/);
        if (!windowMatches) {
            return;
        }
        var nodeKey = windowMatches[1];
        parent.postMessage(JSON.stringify({resendOnElementLoad: true, nodeKey: nodeKey}), '*');
    }
    tryResend();

    /**
     * Helper function that posts entire basic state of spatialObject to parent
     */
    function postAllDataToParent() {
        console.log('check: ' + spatialObject.frame + ' fullscreen = ' + spatialObject.sendFullScreen);

        if (typeof spatialObject.node !== 'undefined' || typeof spatialObject.frame !== 'undefined') {
            parent.postMessage(JSON.stringify(
                {
                    version: spatialObject.version,
                    node: spatialObject.node,
                    frame: spatialObject.frame,
                    object: spatialObject.object,
                    height: spatialObject.height,
                    width: spatialObject.width,
                    sendMatrix: spatialObject.sendMatrix,
                    sendMatrices: spatialObject.sendMatrices,
                    sendScreenPosition: spatialObject.sendScreenPosition,
                    sendAcceleration: spatialObject.sendAcceleration,
                    fullScreen: spatialObject.sendFullScreen,
                    fullscreenZPosition: spatialObject.fullscreenZPosition,
                    stickiness: spatialObject.sendSticky,
                    sendScreenObject: spatialObject.sendScreenObject,
                    moveDelay: spatialObject.moveDelay
                }), '*');  // this needs to contain the final interface source
        }
    }

    /**
     * Helper function that posts object/frame/node/version to parent along with whatever custom properties you want to send
     * @param {object} additionalProperties - JSON object containing any additional key/value pairs to send
     */
    function postDataToParent(additionalProperties) {
        if (typeof spatialObject.node !== 'undefined' || typeof spatialObject.frame !== 'undefined') {
            var dataToSend = {
                version: spatialObject.version,
                node: spatialObject.node,
                frame: spatialObject.frame,
                object: spatialObject.object
            };
            if (additionalProperties) {
                for (var key in additionalProperties) {
                    dataToSend[key] = additionalProperties[key];
                }
            }
            parent.postMessage(JSON.stringify(dataToSend), '*');
        }
    }

    /**
     * receives POST messages from parent to change spatialObject state
     * @param {object} msgContent - JSON contents received by the iframe's contentWindow.postMessage listener
     */
    spatialObject.messageCallBacks.mainCall = function (msgContent) {

        if (typeof msgContent.sendMessageToFrame !== 'undefined') {
            return; // TODO: fix this bug in a cleaner way (github issue #17)
        }

        // Adds the socket.io connection and adds the related API methods
        if (msgContent.objectData) { // objectData contains the IP necessary to load the socket script
            if (!spatialObject.socketIoUrl) {
                loadObjectSocketIo(msgContent.objectData);
            }
        }

        if (typeof msgContent.firstInitialization !== 'undefined') {
            spatialObject.wasToolJustCreated = msgContent.firstInitialization;
        }

        // initialize spatialObject for frames and add additional API methods
        if (typeof msgContent.node !== 'undefined') {

            if (!spatialObject.alreadyLoaded) {

                if (spatialObject.sendFullScreen === false) {
                    spatialObject.height = document.body.scrollHeight;
                    spatialObject.width = document.body.scrollWidth;
                }

                spatialObject.node = msgContent.node;
                spatialObject.frame = msgContent.frame;
                spatialObject.object = msgContent.object;

                // Post the default state of this frame to the parent application
                postAllDataToParent();

                if (realityInterface) {
                    // adds the API methods not reliant on the socket.io connection
                    realityInterface.injectAllNonSocketAPIs();
                }

                // triggers the onRealityInterfaceLoaded function
                if (spatialObject.onload) {
                    spatialObject.onload();
                    spatialObject.onload = null;
                }
            }

            if (spatialObject.sendScreenObject) {
                if (realityInterface) {
                    realityInterface.activateScreenObject(); // make sure it gets sent with updated object,frame,node
                }
            }

            spatialObject.alreadyLoaded = true;

            // initialize spatialObject for logic block settings menus, which declare a new RealityLogic()
        } else if (typeof msgContent.logic !== 'undefined') {

            parent.postMessage(JSON.stringify(
                {
                    version: spatialObject.version,
                    block: msgContent.block,
                    logic: msgContent.logic,
                    frame: msgContent.frame,
                    object: msgContent.object,
                    publicData: msgContent.publicData
                }
            )
            // this needs to contain the final interface source
            , '*');

            spatialObject.block = msgContent.block;
            spatialObject.logic = msgContent.logic;
            spatialObject.frame = msgContent.frame;
            spatialObject.object = msgContent.object;
            spatialObject.publicData = msgContent.publicData;

            if (spatialObject.sendScreenObject) {
                if (realityInterface) {
                    realityInterface.activateScreenObject(); // make sure it gets sent with updated object,frame,node
                }
            }
        }

        // Add some additional message listeners which keep the spatialObject updated with application state
        // TODO: should these only be added when specific message listeners have been registered via the API?

        if (typeof msgContent.modelViewMatrix !== 'undefined') {
            spatialObject.modelViewMatrix = msgContent.modelViewMatrix;
            spatialObject.matrices.modelView = msgContent.modelViewMatrix;
        }

        if (typeof msgContent.projectionMatrix !== 'undefined') {
            spatialObject.projectionMatrix = msgContent.projectionMatrix;
            spatialObject.matrices.projection = msgContent.projectionMatrix;
        }

        if (typeof msgContent.allObjects !== 'undefined') {
            spatialObject.matrices.allObjects = msgContent.allObjects;
        }

        if (typeof msgContent.devicePose !== 'undefined') {
            spatialObject.matrices.devicePose = msgContent.devicePose;
        }

        if (typeof msgContent.groundPlaneMatrix !== 'undefined') {
            spatialObject.matrices.groundPlane = msgContent.groundPlaneMatrix;
        }

        if (typeof msgContent.anchoredModelView !== 'undefined') {
            spatialObject.matrices.anchoredModelView = msgContent.anchoredModelView;
        }

        // receives visibility state (changes when guiState changes or frame gets unloaded due to outside of view)
        if (typeof msgContent.visibility !== 'undefined') {
            spatialObject.visibility = msgContent.visibility;

            // reload public data when it becomes visible
            if (realityInterface && spatialObject.ioObject) {
                realityInterface.reloadPublicData();
            }

            // ensure sticky fullscreen state gets sent to parent when it becomes visible
            if (spatialObject.visibility === 'visible') {
                if (typeof spatialObject.node !== 'undefined') {
                    if (spatialObject.sendSticky) {
                        // postAllDataToParent();
                        postDataToParent({
                            fullScreen: spatialObject.sendFullScreen,
                            fullscreenZPosition: spatialObject.fullscreenZPosition,
                            stickiness: spatialObject.sendSticky
                        });
                    }
                }
            }
        }

        // receives the guiState / "mode" that the app is in, e.g. ui, node, logic, etc...
        if (typeof msgContent.interface !== 'undefined') {
            spatialObject.interface = msgContent.interface;
        }

        // can be triggered by real-time system to refresh public data when editor received a message from another client
        if (typeof msgContent.reloadPublicData !== 'undefined') {
            realityInterface.reloadPublicData();
        }

        // handle synthetic touch events and pass them into the page contents
        if (typeof msgContent.event !== 'undefined' && typeof msgContent.event.pointerId !== 'undefined') {

            // eventData looks like {type: "pointerdown", pointerId: 29887780, pointerType: "touch", x: 334, y: 213}
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
                screenY: eventData.y,
                button: eventData.button,
            });

            if (typeof eventData.projectedZ !== 'undefined') {
                event.projectedZ = eventData.projectedZ;
            }
            if (typeof eventData.worldIntersectPoint !== 'undefined') {
                event.worldIntersectPoint = eventData.worldIntersectPoint;
            }

            // send unacceptedTouch message if this interface wants touches to pass through it
            if (spatialObject.touchDeciderRegistered && eventData.type === 'pointerdown') {
                var touchAccepted = spatialObject.touchDecider(eventData);
                if (!touchAccepted) {
                    // console.log('didn\'t touch anything acceptable... propagate to next frame (if any)');
                    postDataToParent({
                        unacceptedTouch: eventData
                    });
                    spatialObject.unacceptedTouchInProgress = true;
                    return;
                }
            }

            if (spatialObject.touchDeciderRegistered && spatialObject.unacceptedTouchInProgress) {
                postDataToParent({
                    unacceptedTouch: eventData
                });
                if (eventData.type === 'pointerup') {
                    spatialObject.unacceptedTouchInProgress = false;
                }
                return;
            }

            // if it wasn't unaccepted, dispatch a touch event into the page contents
            var elt = document.elementFromPoint(eventData.x, eventData.y) || document.body;

            function forElementAndParentsRecursively(element, callback) {
                callback(element);
                if (element.parentNode && element.parentNode.tagName !== 'HTML' && element.parentNode !== document) {
                    forElementAndParentsRecursively(element.parentNode, callback);
                }
            }

            function elementOrRecursiveParentIsOfClass(element, className) {
                var foundClassOnAnyElement = false;
                forElementAndParentsRecursively(element, function(thatElement) {
                    if (thatElement.classList.contains(className)) {
                        foundClassOnAnyElement = true;
                    }
                });
                return foundClassOnAnyElement;
            }

            // see if it is a realityInteraction div
            if (eventData.type === 'pointerdown') {
                if (spatialObject.customInteractionMode) {

                    if (!spatialObject.invertedInteractionMode) {

                        if (elementOrRecursiveParentIsOfClass(elt, 'realityInteraction')) {
                            // if (elt.classList.contains('realityInteraction')) {
                            if (elt) elt.dispatchEvent(event);

                            postDataToParent({
                                pointerDownResult: 'interaction'
                            });
                        } else {
                            postDataToParent({
                                pointerDownResult: 'nonInteraction'
                            });
                        }

                    } else {

                        // do the opposite for each condition
                        if (elementOrRecursiveParentIsOfClass(elt, 'realityInteraction')) {
                            postDataToParent({
                                pointerDownResult: 'nonInteraction'
                            });
                        } else {
                            if (elt) elt.dispatchEvent(event);

                            postDataToParent({
                                pointerDownResult: 'interaction'
                            });
                        }

                    }



                } else {
                    if (elt) elt.dispatchEvent(event);
                }

            } else {
                if (elt) elt.dispatchEvent(event);
            }


            // send acceptedTouch message to stop the touch propagation
            if (eventData.type === 'pointerdown') {
                postDataToParent({
                    acceptedTouch: eventData
                });
            }
        }

        // can be triggered by real-time system to refresh public data when editor received a message from another client
        if (typeof msgContent.workerId !== 'undefined') {
            console.log('set workerId to ' + msgContent.workerId);
            // eslint-disable-next-line no-global-assign
            workerId = msgContent.workerId;
        }
    };

    /**
     * Defines the SpatialInterface object
     * A reality interface provides a SocketIO API, a Post Message API, and several other APIs
     * All supported methods are listed in this constructor, but the implementation of most methods are separated
     * into each category (socket, post message, listener, etc) in subsequent SpatialInterface "inject__API" functions
     * @constructor
     */
    function SpatialInterface() {
        this.publicData = spatialObject.publicData;
        this.pendingSends = [];
        this.pendingIos = [];
        this.iosObject = undefined;
        this.ioCallback = undefined;

        var self = this;

        this.spatialInterfaceLoadedCallbacks = [];

        /**
         * Adds an onload callback that will wait until this SpatialInterfaces receives its object/frame data
         * @param {function} callback
         */
        this.onRealityInterfaceLoaded = function(callback) {
            if (spatialObject.object && spatialObject.frame) {
                callback();
            } else {
                this.spatialInterfaceLoadedCallbacks.push(callback);
            }
        };

        this.onSpatialInterfaceLoaded = this.onRealityInterfaceLoaded;
        spatialObject.onload = () => this.spatialInterfaceLoadedCallbacks.forEach(cb => cb());

        // Adds the API functions that allow a frame to send and receive socket messages (e.g. write and addReadListener)
        if (typeof io !== 'undefined') {
            this.injectSocketIoAPI();
        } else {
            this.ioObject = {
                on: function() {
                    console.log('ioObject.on stub called, please don\'t');
                }
            };
            /**
             * If you call a SocketIO API function before that API has been initialized, it will get queued up as a stub
             * and executed as soon as that API is fully loaded
             * @param {string} name - the name of the function that should be called
             * @return {Function}
             */
            function makeIoStub(name) {
                return function() {
                    self.pendingIos.push({name: name, args: arguments});
                };
            }
            // queue-up calls to function stubs that will get called for real when the socket is created
            this.write = makeIoStub('write');
            this.addReadListener = makeIoStub('addReadListener');
            this.readPublicData = makeIoStub('readPublicData');
            this.addReadPublicDataListener = makeIoStub('addReadPublicDataListener');
            this.writePublicData = makeIoStub('writePublicData');
            this.reloadPublicData = makeIoStub('reloadPublicData');
            this.addScreenObjectListener = makeIoStub('addScreenObjectListener');
            this.addScreenObjectReadListener = makeIoStub('addScreenObjectReadListener');
            // deprecated or unimplemented methods
            this.read = makeIoStub('read');
            this.readRequest = makeIoStub('readRequest');
            this.writePrivateData = makeIoStub('writePrivateData');

            /**
             * Internet of Screens APIs
             */
            {
                this.setIOCallback = makeIoStub('setIOCallback');
                this.setIOSInterface = makeIoStub('setIOSInterface');
            }
        }

        if (spatialObject.object) {
            // Adds the additional API functions that aren't dependent on the socket
            this.injectAllNonSocketAPIs();
        } else {
            /**
             * If you call a Post Message API function before that API has been initialized, it will get queued up as a stub
             * and executed as soon as that API is fully loaded
             * @param {string} name - the name of the function that should be called
             * @return {Function}
             */
            function makeSendStub(name) {
                return function() {
                    self.pendingSends.push({name: name, args: arguments});
                };
            }

            /**
             * Post Message APIs
             */
            {
                this.sendGlobalMessage = makeSendStub('sendGlobalMessage');
                this.sendMessageToFrame = makeSendStub('sendMessageToFrame');
                this.sendMessageToTool = makeSendStub('sendMessageToTool');
                this.sendEnvelopeMessage = makeSendStub('sendEnvelopeMessage');
                this.initNodeWithOptions = makeSendStub('initNodeWithOptions');
                this.initNode = makeSendStub('initNode');
                this.sendCreateNode = makeSendStub('sendCreateNode');
                this.sendMoveNode = makeSendStub('sendMoveNode');
                this.sendResetNodes = makeSendStub('sendResetNodes');
                this.subscribeToMatrix = makeSendStub('subscribeToMatrix');
                this.subscribeToModelAndView = makeSendStub('subscribeToModelAndView');
                this.subscribeToScreenPosition = makeSendStub('subscribeToScreenPosition');
                this.subscribeToDevicePoseMatrix = makeSendStub('subscribeToDevicePoseMatrix');
                this.subscribeToAllMatrices = makeSendStub('subscribeToAllMatrices');
                this.subscribeToGroundPlaneMatrix = makeSendStub('subscribeToGroundPlaneMatrix');
                this.subscribeToAnchoredModelView = makeSendStub('subscribeToAnchoredModelView');
                this.subscribeToDeviceDistance = makeSendStub('subscribeToDeviceDistance');
                this.subscribeToAcceleration = makeSendStub('subscribeToAcceleration');
                this.setFullScreenOn = makeSendStub('setFullScreenOn');
                this.setFullScreenOff = makeSendStub('setFullScreenOff');
                this.setStickyFullScreenOn = makeSendStub('setStickyFullScreenOn');
                this.setStickinessOff = makeSendStub('setStickinessOff');
                this.setExclusiveFullScreenOn = makeSendStub('setExclusiveFullScreenOn');
                this.setExclusiveFullScreenOff = makeSendStub('setExclusiveFullScreenOff');
                this.isExclusiveFullScreenOccupied = makeSendStub('isExclusiveFullScreenOccupied');
                this.stickNodeToScreen = makeSendStub('stickNodeToScreen');
                this.unstickNodeFromScreen = makeSendStub('unstickNodeFromScreen');
                this.setAlwaysFaceCamera = makeSendStub('setAlwaysFaceCamera');
                this.startVideoRecording = makeSendStub('startVideoRecording');
                this.stopVideoRecording = makeSendStub('stopVideoRecording');
                this.createVideoPlayback = makeSendStub('createVideoPlayback');
                this.disposeVideoPlayback = makeSendStub('disposeVideoPlayback');
                this.setVideoPlaybackCurrentTime = makeSendStub('setVideoPlaybackCurrentTime');
                this.playVideoPlayback = makeSendStub('playVideoPlayback');
                this.pauseVideoPlayback = makeSendStub('pauseVideoPlayback');
                this.startVirtualizerRecording = makeSendStub('startVirtualizerRecording');
                this.stopVirtualizerRecording = makeSendStub('stopVirtualizerRecording');
                this.getScreenshotBase64 = makeSendStub('getScreenshotBase64');
                this.openKeyboard = makeSendStub('openKeyboard');
                this.closeKeyboard = makeSendStub('closeKeyboard');
                this.onKeyboardClosed = makeSendStub('onKeyboardClosed');
                this.onKeyUp = makeSendStub('onKeyUp');
                this.setMoveDelay = makeSendStub('setMoveDelay');
                this.setVisibilityDistance = makeSendStub('setVisibilityDistance');
                this.activateScreenObject = makeSendStub('activateScreenObject');
                this.enableCustomInteractionMode = makeSendStub('enableCustomInteractionMode');
                this.enableCustomInteractionModeInverted = makeSendStub('enableCustomInteractionModeInverted');
                this.setInteractableDivs = makeSendStub('setInteractableDivs');
                this.disableCustomInteractionMode = makeSendStub('disableCustomInteractionMode');
                this.subscribeToFrameCreatedEvents = makeSendStub('subscribeToFrameCreatedEvents');
                this.subscribeToFrameDeletedEvents = makeSendStub('subscribeToFrameDeletedEvents');
                this.subscribeToToolCreatedEvents = makeSendStub('subscribeToToolCreatedEvents');
                this.subscribeToToolDeletedEvents = makeSendStub('subscribeToToolDeletedEvents');
                this.announceVideoPlay = makeSendStub('announceVideoPlay');
                this.subscribeToVideoPauseEvents = makeSendStub('subscribeToVideoPauseEvents');
                this.ignoreAllTouches = makeSendStub('ignoreAllTouches');
                this.changeFrameSize = makeSendStub('changeFrameSize');
                this.changeToolSize = makeSendStub('changeToolSize');
                this.onWindowResized = makeSendStub('onWindowResized');
                this.prefersAttachingToWorld = makeSendStub('prefersAttachingToWorld');
                this.prefersAttachingToObjects = makeSendStub('prefersAttachingToObjects');
                this.subscribeToWorldId = makeSendStub('subscribeToWorldId');
                this.subscribeToPositionInWorld = makeSendStub('subscribeToPositionInWorld');
                this.getPositionInWorld = makeSendStub('getPositionInWorld');
                this.subscribeToObjectsOfType = makeSendStub('subscribeToObjectsOfType');
                this.errorNotification = makeSendStub('errorNotification');
                this.useWebGlWorker = makeSendStub('useWebGlWorker');
                this.wasToolJustCreated = makeSendStub('wasToolJustCreated');
                this.setPinned = makeSendStub('setPinned');
                this.promptForArea = makeSendStub('promptForArea');
                this.getEnvironmentVariables = makeSendStub('getEnvironmentVariables');
                this.getUserDetails = makeSendStub('getUserDetails');

                this.analyticsOpen = makeSendStub('analyticsOpen');
                this.analyticsClose = makeSendStub('analyticsClose');
                this.analyticsFocus = makeSendStub('analyticsFocus');
                this.analyticsBlur = makeSendStub('analyticsBlur');
                this.analyticsSetCursorTime = makeSendStub('analyticsSetCursorTime');
                this.analyticsSetHighlightRegion = makeSendStub('analyticsSetHighlightRegion');
                this.analyticsSetDisplayRegion = makeSendStub('analyticsSetDisplayRegion');
                this.analyticsHydrateRegionCards = makeSendStub('analyticsHydrateRegionCards');
                this.analyticsSetLens = makeSendStub('analyticsSetLens');
                this.analyticsSetLensDetail = makeSendStub('analyticsSetLensDetail');
                this.analyticsSetSpaghettiAttachPoint = makeSendStub('analyticsSetSpaghettiAttachPoint');
                this.analyticsSetSpaghettiVisible = makeSendStub('analyticsSetSpaghettiVisible');
                this.analyticsSetAllClonesVisible = makeSendStub('analyticsSetAllClonesVisible');

                // deprecated methods
                this.sendToBackground = makeSendStub('sendToBackground');
            }

            /**
             * Message Listener APIs
             */
            {
                this.addGlobalMessageListener = makeSendStub('addGlobalMessageListener');
                this.addFrameMessageListener = makeSendStub('addFrameMessageListener');
                this.addToolMessageListener = makeSendStub('addToolMessageListener');
                this.addMatrixListener = makeSendStub('addMatrixListener');
                this.addModelAndViewListener = makeSendStub('addModelAndViewListener');
                this.addAllObjectMatricesListener = makeSendStub('addAllObjectMatricesListener');
                this.addDevicePoseMatrixListener = makeSendStub('addDevicePoseMatrixListener');
                this.addGroundPlaneMatrixListener = makeSendStub('addGroundPlaneMatrixListener');
                this.addAnchoredModelViewListener = makeSendStub('addAnchoredModelViewListener');
                this.addScreenPositionListener = makeSendStub('addScreenPositionListener');
                this.cancelScreenPositionListener = makeSendStub('cancelScreenPositionListener');
                this.addVisibilityListener = makeSendStub('addVisibilityListener');
                this.addInterfaceListener = makeSendStub('addInterfaceListener');
                this.addIsMovingListener = makeSendStub('addIsMovingListener');
                // deprecated or unimplemented methods
                this.addAccelerationListener = makeSendStub('addAccelerationListener');
            }

            /**
             * Setter/Getter APIs
             */
            {
                // Getters
                this.getVisibility = makeSendStub('getVisibility'); // TODO: getters don't make sense as stubs
                this.getInterface = makeSendStub('getInterface'); // TODO: but maybe OK to keep here for consistency
                this.getPositionX = makeSendStub('getPositionX');
                this.getPositionY = makeSendStub('getPositionY');
                this.getPositionZ = makeSendStub('getPositionZ');
                this.getProjectionMatrix = makeSendStub('getProjectionMatrix');
                this.getModelViewMatrix = makeSendStub('getModelViewMatrix');
                this.getGroundPlaneMatrix = makeSendStub('getGroundPlaneMatrix');
                this.getAnchoredModelView = makeSendStub('getAnchoredModelView');
                this.getDevicePoseMatrix = makeSendStub('getDevicePoseMatrix');
                this.getAllObjectMatrices = makeSendStub('getAllObjectMatrices');
                this.getUnitValue = makeSendStub('getUnitValue');
                this.getScreenDimensions = makeSendStub('getScreenDimensions');
                this.getMoveDelay = makeSendStub('getMoveDelay');
                // deprecated getters
                this.search = makeSendStub('search');

                // Setters
                this.registerTouchDecider = makeSendStub('registerTouchDecider');
                this.unregisterTouchDecider = makeSendStub('unregisterTouchDecider');
            }

        }

        realityInterface = this;
    }

    SpatialInterface.prototype.injectAllNonSocketAPIs = function() {
        // Adds the API functions that allow a frame to post messages to its parent (e.g. setFullScreenOn and subscribeToMatrix)
        this.injectPostMessageAPI();

        // Adds the API functions that allow a frame to add message listeners (e.g. addGlobalMessageListener and addMatrixListener)
        this.injectMessageListenerAPI();

        // Adds the API functions that only change or retrieve values from spatialObject (e.g. getVisibility and registerTouchDecider)
        this.injectSetterGetterAPI();

        for (var i = 0; i < this.pendingSends.length; i++) {
            var pendingSend = this.pendingSends[i];
            this[pendingSend.name].apply(this, pendingSend.args);
        }
        this.pendingSends = [];

        // console.log('All non-socket APIs are loaded and injected into the object.js API');
    };

    SpatialInterface.prototype.injectSocketIoAPI = function() {
        var self = this;

        this.ioObject = io.connect(spatialObject.socketIoUrl);

        // Adds the custom API functions that allow a frame to connect to the Internet of Screens application
        this.injectInternetOfScreensAPI();

        // keeps track of previous values of nodes so we don't re-send unnecessarily
        this.oldNumberList = {};

        // reload a frame if its socket reconnects
        this.ioObject.on('reconnect', function() {
            console.log('reconnect');
            window.location.reload();

            // notify the containing application that a frame socket reconnected, for additional optional behavior (e.g. make the screen reload)
            if (spatialObject.object && spatialObject.frame) {
                parent.postMessage(JSON.stringify({
                    version: spatialObject.version,
                    node: spatialObject.node,
                    frame: spatialObject.frame,
                    object: spatialObject.object,
                    socketReconnect: true
                }), '*');
            }
        });

        this.ioObject.on('close', function() {
            console.log('frame socket closed');
        });

        /**
         * Subscribes this socket to data values being written to nodes on this frame
         */
        this.sendRealityEditorSubscribe = function () {
            var timeoutFunction = function() {
                if (spatialObject.object) {
                    // console.log('emit sendRealityEditorSubscribe');
                    self.ioObject.emit(getIoTitle('/subscribe/realityEditor'), JSON.stringify({
                        object: spatialObject.object,
                        frame: spatialObject.frame,
                        protocol: spatialObject.protocol
                    }));
                }
            };
            // Call it a few times to help ensure it succeeds
            setTimeout(timeoutFunction, 10);
            setTimeout(timeoutFunction, 50);
            setTimeout(timeoutFunction, 100);
            setTimeout(timeoutFunction, 1000);
        };
        this.sendRealityEditorSubscribe();

        /**
         * @param {string} node - the name of the node
         * @param {number} value - the new value you are writing to it
         * @param mode - optional
         * @param unit - optional
         * @param unitMin - optional
         * @param unitMax - optional
         * @param {boolean|undefined} forceWrite - optional. if true, sends the value even if it hasn't changed since the last write
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
                self.ioObject.emit(getIoTitle('object'), JSON.stringify({
                    object: spatialObject.object,
                    frame: spatialObject.frame,
                    node: spatialObject.frame + node,
                    data: data
                }));
            }
            self.oldNumberList[node] = value;
        };

        /**
         * Adds a callback function for when new data arrives at the specified node
         * @param {string} node - node name
         * @param {function} callback
         */
        this.addReadListener = function (node, callback) {
            // TODO: add getIoTitle?
            self.ioObject.on('object', function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.node !== 'undefined') {
                    if (thisMsg.node === spatialObject.frame + node) {
                        if (thisMsg.data) {
                            callback(thisMsg.data);
                        }
                    }
                }
            });
        };

        /**
         * Returns the current value of this node's publicData (without making a new network request)
         * @param {string} node - node name
         * @param {string} valueName - name of the property to read
         * @param {*|undefined} value - default value for the property if it doesn't exist yet
         * @return {*}
         */
        this.readPublicData = function (node, valueName, value) {
            if (!value)  value = 0;

            if (typeof spatialObject.publicData[node] === 'undefined') {
                spatialObject.publicData[node] = {};
            }

            if (typeof spatialObject.publicData[node][valueName] === 'undefined') {
                spatialObject.publicData[node][valueName] = value;
                return value;
            } else {
                return spatialObject.publicData[node][valueName];
            }
        };

        // TODO: this function implementation is different in the server and the userinterface... standardize it
        /**
         * Adds a callback function that will be triggered whenever the specified property of the node's publicData
         * is written to (and also when a /subscribe/realityEditorPublicData message is sent)
         * @param {string} node
         * @param {string} valueName
         * @param {function} callback
         */
        this.addReadPublicDataListener = function (node, valueName, callback) {
            // TODO: add getIoTitle?
            self.ioObject.on('object/publicData', function (msg) {
                var thisMsg = JSON.parse(msg);

                if (typeof thisMsg.sessionUuid !== 'undefined') {
                    if (thisMsg.sessionUuid === sessionUuid) {
                        console.log('ignoring message sent by self (publicData)');
                        return;
                    }
                }

                if (typeof thisMsg.publicData === 'undefined')  return;
                if (thisMsg.node !== spatialObject.frame + node) return;
                if (typeof thisMsg.publicData[node] === 'undefined') {
                    // convert format if possible, otherwise return
                    if (typeof thisMsg.publicData[valueName] !== 'undefined') {
                        var publicDataKeys = Object.keys(thisMsg.publicData);
                        thisMsg.publicData[node] = {};
                        publicDataKeys.forEach(function(existingKey) {
                            thisMsg.publicData[node][existingKey] = thisMsg.publicData[existingKey];
                        });
                        // console.warn('converted incorrect publicData format in object/publicData listener');
                    } else {
                        return;
                    }
                }
                if (typeof thisMsg.publicData[node][valueName] === 'undefined') return;

                var isUnset =   (typeof spatialObject.publicData[node] === 'undefined') ||
                    (typeof spatialObject.publicData[node][valueName] === 'undefined');

                // only trigger the callback if there is new public data, otherwise infinite loop possible
                if (isUnset || JSON.stringify(thisMsg.publicData[node][valueName]) !== JSON.stringify(spatialObject.publicData[node][valueName])) {

                    if (typeof spatialObject.publicData[node] === 'undefined') {
                        spatialObject.publicData[node] = {};
                    }
                    spatialObject.publicData[node][valueName] = thisMsg.publicData[node][valueName];

                    parent.postMessage(JSON.stringify(
                        {
                            version: spatialObject.version,
                            object: spatialObject.object,
                            frame: spatialObject.frame,
                            node: spatialObject.frame + node,
                            publicData: thisMsg.publicData[node]
                        }
                    ), '*');

                    callback(thisMsg.publicData[node][valueName]);
                }

            });
        };

        /**
         * Emits a socket message with a new value for the specified property of the node's publicData
         * Also posts it to the parent window (so that e.g. when a frame moves between servers the editor can transfer publicData from one to another using the data it receives here)
         * @param {string} node
         * @param {string} valueName
         * @param {*} value
         * @param {boolean} realtimeOnly - doesn't send a post message to reload object, allows rapid stream
         */
        this.writePublicData = function (node, valueName, value, realtimeOnly) {

            if (typeof spatialObject.publicData[node] === 'undefined') {
                spatialObject.publicData[node] = {};
            }

            spatialObject.publicData[node][valueName] = value;

            this.ioObject.emit(getIoTitle('object/publicData'), JSON.stringify({
                object: spatialObject.object,
                frame: spatialObject.frame,
                node: spatialObject.frame + node,
                publicData: spatialObject.publicData[node],
                sessionUuid: sessionUuid
            }));

            if (!realtimeOnly) {
                parent.postMessage(JSON.stringify(
                    {
                        version: spatialObject.version,
                        object: spatialObject.object,
                        frame: spatialObject.frame,
                        node: spatialObject.frame + node,
                        publicData: spatialObject.publicData[node]
                    }
                ), '*');
            }

        };

        /**
         * Can be called to request the most recent publicData for this frame from the server
         */
        this.reloadPublicData = function() {
            // reload public data when it becomes visible
            this.ioObject.emit(getIoTitle('/subscribe/realityEditorPublicData'), JSON.stringify({object: spatialObject.object, frame: spatialObject.frame}));
        };

        // Routing the messages via Server for Screen
        this.addScreenObjectListener = function () {
            spatialObject.messageCallBacks.screenObjectCall = function (msgContent) {
                if (spatialObject.visibility !== 'visible') return;
                if (typeof msgContent.screenObject !== 'undefined') {
                    self.ioObject.emit(getIoTitle('/object/screenObject'), JSON.stringify(msgContent.screenObject));
                }
            };
        };

        this.addScreenObjectReadListener = function () {
            // TODO: add getIoTitle?
            self.ioObject.on('/object/screenObject', function (msg) {
                if (spatialObject.visibility !== 'visible') return;
                var thisMsg = JSON.parse(msg);
                if (!thisMsg.object) thisMsg.object = null;
                if (!thisMsg.frame) thisMsg.frame = null;
                if (!thisMsg.node) thisMsg.node = null;

                postDataToParent({
                    screenObject: {
                        object: thisMsg.object,
                        frame: thisMsg.frame,
                        node: thisMsg.node,
                        touchOffsetX: thisMsg.touchOffsetX,
                        touchOffsetY: thisMsg.touchOffsetY
                    }
                });
            });
        };

        this.addScreenObjectListener();
        this.addScreenObjectReadListener();

        /**
         * @todo currently not supported yet. use publicData instead
         * @param node
         * @param valueName
         * @param value
         */
        this.writePrivateData = function (node, valueName, value) {
            console.warn('privateData is not fully supported yet. use publicData instead.');

            var thisItem = {};
            thisItem[valueName] = value;

            this.ioObject.emit(getIoTitle('object/privateData'), JSON.stringify({
                object: spatialObject.object,
                frame: spatialObject.frame,
                node: spatialObject.frame + node,
                privateData: thisItem
            }));
        };

        /**
         * @deprecated
         *
         * Backwards compatible for UI requesting a socket message with the value of a certain node
         * @param {string} node - node name
         */
        this.readRequest = function (node) {
            this.ioObject.emit(getIoTitle('/object/readRequest'), JSON.stringify({object: spatialObject.object, frame: spatialObject.frame, node: spatialObject.frame + node}));
        };

        /**
         * @deprecated
         *
         * Backwards compatible for reading the value of a node out of a JSON message
         * @param {string} node - node name
         * @param {object} msg
         * @return {number|undefined}
         */
        this.read = function (node, msg) {
            if (msg.node === spatialObject.frame + node) {
                return msg.item[0].number;
            } else {
                return undefined;
            }
        };

        console.log('socket.io is loaded and injected into the object.js API');

        for (var i = 0; i < this.pendingIos.length; i++) {
            var pendingIo = this.pendingIos[i];
            this[pendingIo.name].apply(this, pendingIo.args);
        }
        this.pendingIos = [];
    };

    SpatialInterface.prototype.injectPostMessageAPI = function() {
        this.sendGlobalMessage = function (ohMSG) {
            postDataToParent({
                globalMessage: ohMSG
            });
        };

        this.sendMessageToFrame = function (frameUuid, msgContent) {
            // console.log(spatialObject.frame + ' is sending a message to ' + frameId);

            postDataToParent({
                sendMessageToFrame: {
                    sourceFrame: spatialObject.frame,
                    destinationFrame: frameUuid,
                    msgContent: msgContent
                }
            });
        };

        this.sendMessageToTool = this.sendMessageToFrame;

        this.sendEnvelopeMessage = function (msgContent) {
            postDataToParent({
                envelopeMessage: msgContent
            });
        };

        /**
         * Updated API to init a node. initNode and sendCreateNode invoke this.
         * @param {string} name
         * @param {Object} options
         */
        this.initNodeWithOptions = function(name, options = {}) {
            if (typeof name === 'undefined') {
                console.error('initNode must specify a name');
                return;
            }

            const {
                type = 'node',
                x,
                y,
                scaleFactor,
                defaultValue,
                attachToGroundPlane
            } = options;

            let nodeData = { name, type, x, y, scaleFactor, defaultValue, attachToGroundPlane };

            postDataToParent({
                initNode: {
                    nodeData: nodeData
                }
            });
        }

        /**
         * @deprecated - use initNodeWithOptions instead
         * Declares a new node that should be created for this frame.
         * @param {string} name - required
         * @param type - required. (default type should be "node")
         * @param {number|undefined} x - optional. defaults to random between (-100, 100)
         * @param {number|undefined} y - optional. defaults to random between (-100, 100)
         * @param {number|undefined} scaleFactor - optional. defaults to 1
         * @param {number|undefined} defaultValue - optional. defaults to 0
         */
        this.initNode = function(name, type, x, y, scaleFactor, defaultValue) {
            if (typeof name === 'undefined' || typeof type === 'undefined') {
                console.error('initNode must specify a name and a type');
            }
            this.initNodeWithOptions(name, { type, x, y, scaleFactor, defaultValue });
        };

        /**
         * @deprecated – use initNodeWithOptions instead
         */
        this.sendCreateNode = function (name, x, y, attachToGroundPlane, nodeType, _noDuplicate, defaultValue) {
            if (typeof name === 'undefined' || typeof type === 'undefined') {
                console.error('initNode must specify a name and a type');
            }
            this.initNodeWithOptions(name, { type: nodeType, x, y, attachToGroundPlane, defaultValue });
        };

        this.sendMoveNode = function (name, x, y) {
            postDataToParent({
                moveNode: {
                    name: name,
                    x: x,
                    y: y
                }
            });
        };

        this.sendResetNodes = function () {
            //removes all nodes from the frame
            postDataToParent({
                resetNodes: true
            });
        };

        // subscriptions
        this.subscribeToMatrix = function() {
            spatialObject.sendMatrix = true;
            spatialObject.sendMatrices.modelView = true;
            // if (spatialObject.sendFullScreen === false) {
            //     spatialObject.height = document.body.scrollHeight;
            //     spatialObject.width = document.body.scrollWidth;
            // }
            // postAllDataToParent();
            postDataToParent({
                sendMatrix: spatialObject.sendMatrix,
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToModelAndView = function() {
            spatialObject.sendMatrices.model = true;
            spatialObject.sendMatrices.view = true;
            postDataToParent({
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToScreenPosition = function() {
            spatialObject.sendScreenPosition = true;
            // postAllDataToParent();
            postDataToParent({
                sendScreenPosition: spatialObject.sendScreenPosition
            });
        };

        this.subscribeToDevicePoseMatrix = function () {
            spatialObject.sendMatrices.devicePose = true;
            // postAllDataToParent();
            postDataToParent({
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToAllMatrices = function () {
            spatialObject.sendMatrices.allObjects = true;
            // postAllDataToParent();
            postDataToParent({
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToGroundPlaneMatrix = function () {
            spatialObject.sendMatrices.groundPlane = true;
            // postAllDataToParent();
            postDataToParent({
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToAnchoredModelView = function () {
            spatialObject.sendMatrices.anchoredModelView = true;
            postDataToParent({
                sendMatrices: spatialObject.sendMatrices
            });
        };

        this.subscribeToDeviceDistance = function (callback) {
            spatialObject.messageCallBacks.deviceDistanceCall = function (msgContent) {
                if (typeof msgContent.deviceDistance !== 'undefined') {
                    callback(msgContent.deviceDistance);
                }
            };

            spatialObject.sendDeviceDistance = true;
            postDataToParent({
                sendDeviceDistance: spatialObject.sendDeviceDistance
            });
        };

        let objectPositionSubscriptions = {};
        this.subscribeToObjectsOfType = function (type, callback) {
            if (typeof objectPositionSubscriptions[type] === 'undefined') {
                objectPositionSubscriptions[type] = [];
            }
            objectPositionSubscriptions[type].push(callback);
            spatialObject.messageCallBacks['objectSubscriptionCall_' + type] = function (msgContent) {
                if (typeof msgContent.objectPositions !== 'undefined') {
                    objectPositionSubscriptions[type].forEach(cb => cb(msgContent.objectPositions[type]));
                }
            };
            spatialObject.sendObjectPositions[type] = true;
            postDataToParent({
                sendObjectPositions: spatialObject.sendObjectPositions
            });
        };

        // subscriptions
        this.subscribeToAcceleration = function () {
            spatialObject.sendAcceleration = true;
            // postAllDataToParent();
            postDataToParent({
                sendAcceleration: spatialObject.sendAcceleration
            });
        };

        this.setFullScreenOn = function(zPosition) {
            spatialObject.sendFullScreen = true;
            // console.log(spatialObject.frame + ' fullscreen = ' + spatialObject.sendFullScreen);
            // spatialObject.height = '100%';
            // spatialObject.width = '100%';
            if (zPosition !== undefined) {
                spatialObject.fullscreenZPosition = zPosition;
            }
            // postAllDataToParent();
            postDataToParent({
                fullScreen: spatialObject.sendFullScreen,
                fullscreenZPosition: spatialObject.fullscreenZPosition,
                stickiness: spatialObject.sendSticky
            });
        };

        this.setFullScreenOff = function (params) {
            spatialObject.sendFullScreen = false;
            // console.log(spatialObject.frame + ' fullscreen = ' + spatialObject.sendFullScreen);
            // spatialObject.height = document.body.scrollHeight;
            // spatialObject.width = document.body.scrollWidth;
            // postAllDataToParent();

            var dataToPost = {
                fullScreen: spatialObject.sendFullScreen,
                fullscreenZPosition: spatialObject.fullscreenZPosition,
                stickiness: spatialObject.sendSticky
            };

            if (params && typeof params.animated !== 'undefined') {
                dataToPost.fullScreenAnimated = params.animated;
            }

            postDataToParent(dataToPost);
        };

        this.setStickyFullScreenOn = function (params) {
            spatialObject.sendFullScreen = 'sticky';
            // console.log(spatialObject.frame + ' fullscreen = ' + spatialObject.sendFullScreen);
            spatialObject.sendSticky = true;
            // spatialObject.height = "100%";
            // spatialObject.width = "100%";
            // postAllDataToParent();

            var dataToPost = {
                fullScreen: spatialObject.sendFullScreen,
                fullscreenZPosition: spatialObject.fullscreenZPosition,
                stickiness: spatialObject.sendSticky
            };

            if (params && typeof params.animated !== 'undefined') {
                dataToPost.fullScreenAnimated = params.animated;
            }
            if (params && typeof params.full2D !== 'undefined') {
                dataToPost.fullScreenFull2D = params.full2D;
            }

            postDataToParent(dataToPost);
        };

        this.setStickinessOff = function () {
            spatialObject.sendSticky = false;
            // postAllDataToParent();
            postDataToParent({
                fullScreen: spatialObject.sendFullScreen,
                fullscreenZPosition: spatialObject.fullscreenZPosition,
                stickiness: spatialObject.sendSticky
            });
        };

        /**
         * Exclusive means that there can't be another exclusive fullscreen frame visible at the same time.
         * This function doesn't actually make this frame fullscreen, just toggles on this setting.
         */
        this.setExclusiveFullScreenOn = function (onEjectedCallback) {
            spatialObject.isFullScreenExclusive = true;

            if (typeof onEjectedCallback !== 'undefined') {
                spatialObject.messageCallBacks.fullScreenEjectedCall = function (msgContent) {
                    if (typeof msgContent.fullScreenEjectedEvent !== 'undefined') {
                        onEjectedCallback(msgContent.fullScreenEjectedEvent);
                    }
                };
            }

            postDataToParent({
                isFullScreenExclusive: spatialObject.isFullScreenExclusive
            });
        };

        this.setExclusiveFullScreenOff = function () {
            spatialObject.isFullScreenExclusive = false;
            postDataToParent({
                isFullScreenExclusive: spatialObject.isFullScreenExclusive
            });
        };

        this.isExclusiveFullScreenOccupied = function(callback) {
            if (typeof callback !== 'undefined') {
                spatialObject.messageCallBacks.fullScreenOccupiedCall = function (msgContent) {
                    if (typeof msgContent.fullScreenOccupiedStatus !== 'undefined') {
                        callback(msgContent.fullScreenOccupiedStatus);
                    }
                };
            }

            postDataToParent({
                getIsExclusiveFullScreenOccupied: true
            });
        };

        this.stickNodeToScreen = function(name) {
            postDataToParent({
                nodeName: name,
                nodeIsFullScreen: true
            });
        };

        this.unstickNodeFromScreen = function(name) {
            postDataToParent({
                nodeName: name,
                nodeIsFullScreen: false
            });
        };

        this.setAlwaysFaceCamera = function(value) {
            spatialObject.alwaysFaceCamera = value;
            postDataToParent({
                alwaysFaceCamera: value
            });
        };

        this.startVideoRecording = function() {
            postDataToParent({
                videoRecording: true
            });
        };

        this.stopVideoRecording = function(callback) {
            spatialObject.messageCallBacks.stopVideoRecording = function (msgContent) {
                if (typeof msgContent.videoFilePath !== 'undefined') {
                    callback(msgContent.videoFilePath);
                }
            };

            postDataToParent({
                videoRecording: false
            });
        };

        const VideoPlaybackStates = {
            LOADING: 'LOADING',
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED'
        };
        const videoPlaybacks = [];
        class VideoPlayback {
            constructor(spatialInterface) {
                this.spatialInterface = spatialInterface;
                this.onStateChangeCallbacks = [];
                this.id = Math.random().toString();
                this.state = VideoPlaybackStates.LOADING;
                this.playbackStartTime = 0; // Date.now()
                this.playbackStartCurrentTime = 0; // Progress through video
                this.videoLength = 0;
                videoPlaybacks.push(this);
            }
            dispose() {
                this.spatialInterface.disposeVideoPlayback(this.id);
                videoPlaybacks.splice(videoPlaybacks.indexOf(this), 1);
            }
            get currentTime() {
                if (this.state === VideoPlaybackStates.PAUSED) {
                    return this.playbackStartCurrentTime;
                } else {
                    return (Date.now() - this.playbackStartTime + this.playbackStartCurrentTime) % this.videoLength;
                }
            }
            set currentTime(currentTime) {
                this.spatialInterface.setVideoPlaybackCurrentTime(this.id, currentTime);
            }
            play() {
                this.spatialInterface.playVideoPlayback(this.id);
            }
            pause() {
                this.spatialInterface.pauseVideoPlayback(this.id);
            }
            onStateChange(callback) {
                this.onStateChangeCallbacks.push(callback);
            }
            setState(state) {
                this.state = state;
                this.onStateChangeCallbacks.forEach(cb => cb(state));
            }
            onVideoMetadata(metadata) {
                this.videoLength = metadata.videoLength;
            }
        }

        spatialObject.messageCallBacks.onVideoStateChange = function (msgContent) {
            if (typeof msgContent.onVideoStateChange !== 'undefined') {
                const videoPlayback = videoPlaybacks.find(vp => vp.id === msgContent.id);
                videoPlayback.setState(msgContent.onVideoStateChange);
                videoPlayback.playbackStartTime = Date.now();
                videoPlayback.playbackStartCurrentTime = msgContent.currentTime;
            }
        };

        spatialObject.messageCallBacks.onVideoMetadata = function (msgContent) {
            if (typeof msgContent.onVideoMetadata !== 'undefined') {
                videoPlaybacks.find(vp => vp.id === msgContent.id).onVideoMetadata(msgContent.onVideoMetadata);
            }
        };

        this.createVideoPlayback = function(urls) {
            const videoPlayback = new VideoPlayback(this);
            postDataToParent({
                createVideoPlayback: {
                    id: videoPlayback.id,
                    urls: urls,
                    frameKey: spatialObject.frame
                }
            });
            return videoPlayback;
        };

        this.disposeVideoPlayback = function(videoPlaybackID) {
            postDataToParent({
                disposeVideoPlayback: {
                    id: videoPlaybackID
                }
            });
        };

        this.setVideoPlaybackCurrentTime = function(videoPlaybackID, currentTime) {
            postDataToParent({
                setVideoPlaybackCurrentTime: {
                    id: videoPlaybackID,
                    currentTime: currentTime
                }
            });
        };

        this.playVideoPlayback = function(videoPlaybackID) {
            postDataToParent({
                playVideoPlayback: {
                    id: videoPlaybackID
                }
            });
        };

        this.pauseVideoPlayback = function(videoPlaybackID) {
            postDataToParent({
                pauseVideoPlayback: {
                    id: videoPlaybackID
                }
            });
        };

        this.startVirtualizerRecording = function() {
            postDataToParent({
                virtualizerRecording: true
            });
        };

        this.stopVirtualizerRecording = function(callback) {
            spatialObject.messageCallBacks.stopVirtualizerRecording = function (msgContent) {
                if (typeof msgContent.virtualizerRecordingData !== 'undefined') {
                    callback(msgContent.virtualizerRecordingData.baseUrl, msgContent.virtualizerRecordingData.recordingId, msgContent.virtualizerRecordingData.deviceId);
                }
            };

            postDataToParent({
                virtualizerRecording: false
            });
        };

        this.analyticsOpen = function analyticsOpen() {
            postDataToParent({
                analyticsOpen: {
                    frame: spatialObject.frame,
                },
            });
        };

        this.analyticsClose = function analyticsClose() {
            postDataToParent({
                analyticsClose: {
                    frame: spatialObject.frame,
                },
            });
        };

        this.analyticsFocus = function analyticsFocus() {
            postDataToParent({
                analyticsFocus: {
                    frame: spatialObject.frame,
                },
            });
        };

        this.analyticsBlur = function analyticsBlur() {
            postDataToParent({
                analyticsBlur: {
                    frame: spatialObject.frame,
                },
            });
        };

        /**
         * @param {number} time - cursor time in ms
         */
        this.analyticsSetCursorTime = function analyticsSetCursorTime(time) {
            postDataToParent({
                analyticsSetCursorTime: {
                    frame: spatialObject.frame,
                    time,
                },
            });
        };

        /**
         * @param {TimeRegion} highlightRegion
         */
        this.analyticsSetHighlightRegion = function analyticsSetHighlightRegion(highlightRegion) {
            postDataToParent({
                analyticsSetHighlightRegion: {
                    frame: spatialObject.frame,
                    highlightRegion,
                },
            });
        };

        /**
         * @param {TimeRegion} displayRegion
         */
        this.analyticsSetDisplayRegion = function analyticsSetDisplayRegion(displayRegion) {
            postDataToParent({
                analyticsSetDisplayRegion: {
                    frame: spatialObject.frame,
                    displayRegion,
                },
            });
        };

        /**
         * @param {Array<{startTime: number, endTime: number}>} regionCards
         */
        this.analyticsHydrateRegionCards = function analyticsHydrateRegionCards(regionCards) {
            postDataToParent({
                analyticsHydrateRegionCards: {
                    frame: spatialObject.frame,
                    regionCards,
                },
            });
        };

        /**
         * @param {"reba"|"motion"} lens
         */
        this.analyticsSetLens = function analyticsSetLens(lens) {
            postDataToParent({
                analyticsSetLens: {
                    frame: spatialObject.frame,
                    lens,
                },
            });
        };

        /**
         * @param {"bone"|"pose"} lensDetail
         */
        this.analyticsSetLensDetail = function analyticsSetLensDetail(lensDetail) {
            postDataToParent({
                analyticsSetLensDetail: {
                    frame: spatialObject.frame,
                    lensDetail,
                },
            });
        };

        /**
         * @param {string} spaghettiAttachPoint - joint id
         */
        this.analyticsSetSpaghettiAttachPoint = function analyticsSetSpaghettiAttachPoint(spaghettiAttachPoint) {
            postDataToParent({
                analyticsSetSpaghettiAttachPoint: {
                    frame: spatialObject.frame,
                    spaghettiAttachPoint,
                },
            });
        };

        /**
         * @param {boolean} allClonesVisible
         */
        this.analyticsSetSpaghettiVisible = function analyticsSetSpaghettiVisible(spaghettiVisible) {
            postDataToParent({
                analyticsSetSpaghettiVisible: {
                    frame: spatialObject.frame,
                    spaghettiVisible,
                },
            });
        };

        /**
         * @param {boolean} allClonesVisible
         */
        this.analyticsSetAllClonesVisible = function analyticsSetAllClonesVisible(allClonesVisible) {
            postDataToParent({
                analyticsSetAllClonesVisible: {
                    frame: spatialObject.frame,
                    allClonesVisible,
                },
            });
        };

        this.getScreenshotBase64 = function(callback) {
            spatialObject.messageCallBacks.screenshotBase64 = function (msgContent) {
                if (typeof msgContent.screenshotBase64 !== 'undefined') {
                    callback(msgContent.screenshotBase64);
                }
            };

            postDataToParent({
                getScreenshotBase64: true
            });
        };

        /**
         * Programmatically opens device keyboard.
         * This is preferred compared to directly opening keyboard by focusing on a frame element, because there is
         * a bug in the webkit browser where the keyboard will keep opening again on random user interactions
         *  (in particular, can't properly close if the iframe gets deleted before manually un-focusing.)
         */
        this.openKeyboard = function() {
            postDataToParent({
                openKeyboard: true
            });
        };

        /**
         * Programmatically closes device keyboard.
         */
        this.closeKeyboard = function() {
            postDataToParent({
                openKeyboard: false
            });
        };

        /**
         * Listens for when the device keyboard was closed.
         * @param {function} callback
         */
        this.onKeyboardClosed = function(callback) {
            spatialObject.messageCallBacks.keyboardHiddenEvent = function(msgContent) {
                if (typeof msgContent.keyboardHiddenEvent !== 'undefined') {
                    callback();
                }
            };
        };

        /**
         * Listens to each character typed into the device keyboard.
         * It receives the keyboard event via a post message, because directly interacting with the keyboard from within
         * the iframe leads to an open webkit bug where the keyboard will keep opening again on random user interactions
         * @param {function} callback
         */
        this.onKeyUp = function(callback) {
            spatialObject.messageCallBacks.keyboardUpEvent = function(msgContent) {
                if (typeof msgContent.keyboardUpEvent !== 'undefined') {
                    callback(msgContent.keyboardUpEvent);
                }
            };
        };

        /**
         * sets how long you need to tap and hold on the frame in order to start moving it.
         * @param {number} delayInMilliseconds - if value < 0, disables movement
         */
        this.setMoveDelay = function(delayInMilliseconds) {
            spatialObject.moveDelay = delayInMilliseconds;
            postDataToParent({
                moveDelay: delayInMilliseconds
            });
        };

        /**
         * set the distance a frame is visible in space.
         * @param {number} distance in meter
         */
        this.setVisibilityDistance = function(distance) {
            spatialObject.visibilityDistance = distance;
            postDataToParent({
                visibilityDistance: distance
            });
        };

        /**
         * Enable frames to be pushed into screen or pulled into AR for this object
         */
        this.activateScreenObject = function() {
            spatialObject.sendScreenObject = true;
            postDataToParent({
                sendScreenObject: true
            });
            // this.addScreenObjectListener();
            // this.addScreenObjectReadListener();
        };

        /**
         * If enabled, touches on this frame will not be sent into the DOM of the iframe, instead they will immediately
         * start moving the frame in the reality editor. Only frames with the class 'realityInteraction' will actually
         * accept a pointerdown event and begin interaction within the frame contents. Touches on divs with
         * 'realityInteraction' will still trigger moving after the moveDelay if not enough distance traveled.
         */
        this.enableCustomInteractionMode = function() {
            spatialObject.customInteractionMode = true;
        };

        this.enableCustomInteractionModeInverted = function() {
            spatialObject.customInteractionMode = true;
            spatialObject.invertedInteractionMode = true;
        };

        /**
         * Only use if also enableCustomInteractionMode
         * A helper function to add the 'realityInteraction' class to a list of divs. Only these divs (and their children)
         * will receive pointerevents, and touches on all other divs will immediately trigger moving the frame.
         * @param {Array.<HTMLElement>} divList
         */
        this.setInteractableDivs = function(divList) {
            if (!spatialObject.customInteractionMode) {
                console.warn('trying to set custom interactable divs without first enabling customInteractionMode');
            }
            divList.forEach(function(div) {
                if (div) {
                    div.classList.add('realityInteraction');
                }
            });
        };

        /**
         * Resets state from enableCustomInteractionMode and enableCustomInteractionModeInverted
         */
        this.disableCustomInteractionMode = function() {
            spatialObject.customInteractionMode = false;
            spatialObject.invertedInteractionMode = false;
        };

        /**
         * Add a callback that will be triggered anytime another new frame is created while this frame is loaded in the DOM
         * The callback will be passed the frameId (uuid of the frame) and the frame type (e.g. graph, slider, loto, etc)
         * This is useful to create relationships between frames and store the frameId for future message passing
         * @param {function} callback - arguments is an object {frameId: string, frameType: string}
         */
        this.subscribeToFrameCreatedEvents = function(callback) {
            spatialObject.messageCallBacks.frameCreatedCall = function (msgContent) {
                if (spatialObject.visibility !== 'visible') return;
                if (typeof msgContent.frameCreatedEvent !== 'undefined') {
                    console.log(spatialObject.frame + ' learned about the creation of frame ' + msgContent.frameCreatedEvent.frameId + ' (type ' + msgContent.frameCreatedEvent.frameType + ')');
                    callback(msgContent.frameCreatedEvent);
                }
            };
        };

        this.subscribeToToolCreatedEvents =  this.subscribeToFrameCreatedEvents;

        /**
         * Similar to subscribeToFrameCreatedEvents, but gets triggered whenever another frame is deleted while this frame is loaded in the DOM
         * @param {function} callback
         */
        this.subscribeToFrameDeletedEvents = function(callback) {
            spatialObject.messageCallBacks.frameDeletedCall = function (msgContent) {
                if (spatialObject.visibility !== 'visible') return;
                if (typeof msgContent.frameDeletedEvent !== 'undefined') {
                    console.log(spatialObject.frame + ' learned about the deletion of frame ' + msgContent.frameDeletedEvent.frameId + ' (type ' + msgContent.frameDeletedEvent.frameType + ')');
                    callback(msgContent.frameDeletedEvent);
                }
            };
        };

        this.subscribeToToolDeletedEvents = this.subscribeToFrameDeletedEvents;

        /**
         * Broadcasts a standardized message when a video plays, that will automatically pause videos in all other frames
         * The event that is sent
         */
        this.announceVideoPlay = function() {
            var messageToSend = 'pauseOtherVideosExcept' + spatialObject.frame;
            this.sendGlobalMessage(messageToSend);
        };

        /**
         * Adds a callback that will be triggered if a video from any other frames calls realityInterface.announceVideoPlay
         * In the callback, you should call .pause() on your video // TODO: accept video as argument and pause it in here?
         * @param {function} callback
         */
        this.subscribeToVideoPauseEvents = function(callback) {
            this.addGlobalMessageListener(function(e) {
                // the 'except' part ensures we don't pause our own video when it starts to play
                if (e.indexOf('pauseOtherVideosExcept') > -1 && e !== 'pauseOtherVideosExcept' + spatialObject.frame) {
                    callback(e);
                }
            });
        };


        /**
         * Pass in true (or omit the argument) to make the frame set pointer-events none so all touches pass through un-altered
         * Pass in false to reset this functionality so it accepts touches again
         * @param {boolean} newValue
         */
        this.ignoreAllTouches = function(newValue) {
            if (newValue !== spatialObject.ignoreAllTouches) {
                spatialObject.ignoreAllTouches = newValue;
                postDataToParent({
                    ignoreAllTouches: newValue
                });
            }
        };

        /**
         * Adjust the size of the frame's touch overlay element to match the current size of this frame.
         * @param {number} newWidth
         * @param {number} newHeight
         */
        this.changeFrameSize = function(newWidth, newHeight) {
            if (spatialObject.width === newWidth && spatialObject.height === newHeight) {
                return;
            }
            spatialObject.width = newWidth;
            spatialObject.height = newHeight;
            postDataToParent({
                changeFrameSize: {
                    width: newWidth,
                    height: newHeight
                }
            });
        };

        this.changeToolSize = this.changeFrameSize;

        let windowResizedCallbackCount = 0;
        this.onWindowResized = function(callback) {
            windowResizedCallbackCount++;
            spatialObject.messageCallBacks[`onWindowResizedCall${windowResizedCallbackCount}`] = (msgContent) => {
                if (typeof msgContent.onWindowResized === 'undefined') return;
                callback({
                    width: msgContent.onWindowResized.width,
                    height: msgContent.onWindowResized.height
                });
            }

            postDataToParent({
                sendWindowResize: true
            });
        }

        /**
         * Asynchronously query the screen width and height from the parent application, as the iframe itself can't access that
         * @param {function} callback
         */
        this.getScreenDimensions = function(callback) {

            spatialObject.messageCallBacks.screenDimensionsCall = function (msgContent) {
                if (spatialObject.visibility !== 'visible') return;
                if (typeof msgContent.screenDimensions !== 'undefined') {
                    callback(msgContent.screenDimensions.width, msgContent.screenDimensions.height);
                    delete spatialObject.messageCallBacks['screenDimensionsCall']; // only trigger it once
                }
            };

            postDataToParent({
                getScreenDimensions: true
            });

        };

        this.useWebGlWorker = function() {
            postDataToParent({
                useWebGlWorker: true
            });
        };

        this.prefersAttachingToWorld = function() {
            spatialObject.attachesTo = ['world'];

            postDataToParent({
                attachesTo: spatialObject.attachesTo
            });
        };

        this.prefersAttachingToObjects = function() {
            spatialObject.attachesTo = ['object'];

            postDataToParent({
                attachesTo: spatialObject.attachesTo
            });
        };

        this.subscribeToWorldId = function(callback) {
            spatialObject.messageCallBacks.worldIdCall = function (msgContent) {
                if (typeof msgContent.updateWorldId !== 'undefined') {
                    if (spatialObject.object === msgContent.updateWorldId.objectId) {
                        callback(msgContent.updateWorldId.worldId);
                    }
                }
            };

            postDataToParent({
                getWorldId: true
            });
        };

        this.subscribeToPositionInWorld = function(callback) {
            spatialObject.messageCallBacks.positionInWorldCall = function (msgContent) {
                if (typeof msgContent.positionInWorld !== 'undefined') {
                    if (spatialObject.object === msgContent.positionInWorld.objectId) {
                        callback(msgContent.positionInWorld.worldMatrix, msgContent.positionInWorld.worldId);
                    }
                }
            };

            postDataToParent({
                sendPositionInWorld: true
            });
        };

        this.getPositionInWorld = function(callback) {
            spatialObject.messageCallBacks.getPositionInWorldCall = function (msgContent) {
                if (typeof msgContent.getPositionInWorld !== 'undefined') {
                    if (spatialObject.object === msgContent.getPositionInWorld.objectId) {
                        callback(msgContent.getPositionInWorld.worldMatrix, msgContent.getPositionInWorld.worldId);
                    }
                }
            };

            postDataToParent({
                getPositionInWorld: true
            });
        };

        let toolCreationCallbackCount = 0;
        this.wasToolJustCreated = function(callback) {
            if (typeof spatialObject.wasToolJustCreated === 'boolean') {
                callback(spatialObject.wasToolJustCreated);
                return;
            }

            let callbackName = 'toolCreationCall' + toolCreationCallbackCount;
            spatialObject.messageCallBacks[callbackName] = function (msgContent) {
                if (typeof msgContent.firstInitialization !== 'undefined') {
                    spatialObject.wasToolJustCreated = msgContent.firstInitialization;
                    callback(msgContent.firstInitialization);
                    delete spatialObject.messageCallBacks[callbackName]; // only trigger it once
                }
            };
        };

        this.setPinned = function(isPinned) {
            spatialObject.isPinned = isPinned;
            postDataToParent({
                setPinned: isPinned
            });
        };

        this.promptForArea = function(options) {
            if (!options) {
                options = {};
            }
            postDataToParent({promptForArea: {options: options, frameKey: spatialObject.frame}});
            return new Promise((resolve, reject) => {
                spatialObject.messageCallBacks.areaPromptResult = function (msgContent) {
                    if (typeof msgContent.area != 'undefined') {
                        if (!msgContent.canceled) {
                            resolve(msgContent.area);
                            delete spatialObject.messageCallBacks['areaPromptResult']; // only trigger it once
                        } else {
                            reject();
                            delete spatialObject.messageCallBacks['areaPromptResult']; // only trigger it once
                        }
                    }
                };
            });
        };

        this.errorNotification = function(errorMessageText) {
            postDataToParent({
                errorNotification: errorMessageText
            });
        };

        this.getEnvironmentVariables = function() {
            postDataToParent({
                getEnvironmentVariables: true
            });
            return new Promise((resolve, _reject) => {
                spatialObject.messageCallBacks.environmentVariableResult = function (msgContent) {
                    if (typeof msgContent.environmentVariables !== 'undefined') {
                        resolve(msgContent.environmentVariables);
                        delete spatialObject.messageCallBacks['environmentVariableResult']; // only trigger it once
                    }
                };
            });
        }

        /**
         * Get the user's name and any other details about their session that the app knows
         */
        this.getUserDetails = function() {
            postDataToParent({
                getUserDetails: true
            });
            return new Promise((resolve, _reject) => {
                spatialObject.messageCallBacks.userDetailsResult = function (msgContent) {
                    if (typeof msgContent.userDetails !== 'undefined') {
                        resolve(msgContent.userDetails);
                        delete spatialObject.messageCallBacks['userDetailsResult']; // only trigger it once
                    }
                };
            });
        }

        /**
         * Stubbed here for backwards compatibility of API. In previous versions:
         * Hides the frame itself and instead populates a background context within the editor with this frame's contents
         */
        this.sendToBackground = function() {
            console.warn('The API function "sendToBackground" is no longer supported.');
        };
    };

    SpatialInterface.prototype.injectMessageListenerAPI = function() {
        // ensures each callback has a unique name
        var callBackCounter = {
            numMatrixCallbacks: 0,
            numModelAndViewCallbacks: 0,
            numAllMatricesCallbacks: 0,
            numWorldMatrixCallbacks: 0,
            numGroundPlaneMatrixCallbacks: 0,
            numAnchoredModelViewCallbacks: 0
        };

        this.addGlobalMessageListener = function(callback) {
            spatialObject.messageCallBacks.globalMessageCall = function (msgContent) {
                if (typeof msgContent.globalMessage !== 'undefined') {
                    callback(msgContent.globalMessage);
                }
            };
        };

        this.addFrameMessageListener = function(callback) {
            spatialObject.messageCallBacks.frameMessageCall = function (msgContent) {
                if (typeof msgContent.sendMessageToFrame !== 'undefined') {
                    callback(msgContent.sendMessageToFrame);
                }
            };
        };

        this.addToolMessageListener = this.addFrameMessageListener;

        this.addMatrixListener = function (callback) {
            if (!spatialObject.sendMatrices.modelView) {
                this.subscribeToMatrix();
            }
            callBackCounter.numMatrixCallbacks++;
            spatialObject.messageCallBacks['matrixCall' + callBackCounter.numMatrixCallbacks] = function (msgContent) {
                if (typeof msgContent.modelViewMatrix !== 'undefined') {
                    callback(msgContent.modelViewMatrix, spatialObject.matrices.projection);
                }
            }.bind(this);
        };

        this.addModelAndViewListener = function(callback) {
            if (!spatialObject.sendMatrices.model || !spatialObject.sendMatrices.view) {
                this.subscribeToModelAndView();
            }
            callBackCounter.numModelAndViewCallbacks++;
            spatialObject.messageCallBacks['matrixCall' + callBackCounter.numModelAndViewCallbacks] = function (msgContent) {
                if (typeof msgContent.modelMatrix !== 'undefined' && typeof msgContent.viewMatrix !== 'undefined') {
                    callback(msgContent.modelMatrix, msgContent.viewMatrix, spatialObject.matrices.projection);
                }
            }.bind(this);
        };

        this.addAllObjectMatricesListener = function (callback) {
            if (!spatialObject.sendMatrices.allObjects) {
                this.subscribeToAllMatrices();
            }
            callBackCounter.numAllMatricesCallbacks++;
            spatialObject.messageCallBacks['allMatricesCall' + callBackCounter.numAllMatricesCallbacks] = function (msgContent) {
                if (typeof msgContent.allObjects !== 'undefined') {
                    callback(msgContent.allObjects, spatialObject.matrices.projection);
                }
            };
        };

        this.addDevicePoseMatrixListener = function (callback) {
            if (!spatialObject.sendMatrices.devicePose) {
                this.subscribeToDevicePoseMatrix();
            }
            callBackCounter.numWorldMatrixCallbacks++;
            spatialObject.messageCallBacks['worldMatrixCall' + callBackCounter.numWorldMatrixCallbacks] = function (msgContent) {
                if (typeof msgContent.devicePose !== 'undefined') {
                    callback(msgContent.devicePose, spatialObject.matrices.projection);
                }
            };
        };

        this.addGroundPlaneMatrixListener = function (callback) {
            if (!spatialObject.sendMatrices.groundPlane) {
                this.subscribeToGroundPlaneMatrix();
            }
            callBackCounter.numGroundPlaneMatrixCallbacks++;
            spatialObject.messageCallBacks['groundPlaneMatrixCall' + callBackCounter.numGroundPlaneMatrixCallbacks] = function (msgContent) {
                if (typeof msgContent.groundPlaneMatrix !== 'undefined') {
                    callback(msgContent.groundPlaneMatrix, spatialObject.matrices.projection, msgContent.floorOffset);
                }
            };
        };

        this.addAnchoredModelViewListener = function (callback) {
            if (!spatialObject.sendMatrices.anchoredModelView) {
                this.subscribeToAnchoredModelView();
            }
            callBackCounter.numAnchoredModelViewCallbacks++;
            spatialObject.messageCallBacks['anchoredModelViewCall' + callBackCounter.numAnchoredModelViewCallbacks] = function (msgContent) {
                if (typeof msgContent.anchoredModelView !== 'undefined') {
                    callback(msgContent.anchoredModelView, spatialObject.matrices.projection);
                }
            };
        };

        var numScreenPositionCallbacks = 0;
        this.addScreenPositionListener = function(callback) {
            if (!spatialObject.sendScreenPosition) {
                this.subscribeToScreenPosition();
            }
            numScreenPositionCallbacks++;
            spatialObject.messageCallBacks['screenPositionCall' + numScreenPositionCallbacks] = function (msgContent) {
                if (typeof msgContent.frameScreenPosition !== 'undefined') {
                    callback(msgContent.frameScreenPosition);
                }
            };
            return 'screenPositionCall' + numScreenPositionCallbacks; // returns a handle that can be used to cancel the listener
        };

        this.cancelScreenPositionListener = function(handle) {
            if (handle.indexOf('screenPositionCall') === -1) {
                console.warn('improperly formatted handle for a screenPositionListener. refusing to cancel.');
                return;
            }
            if (spatialObject.messageCallBacks[handle]) {
                delete spatialObject.messageCallBacks['screenPositionCall' + numScreenPositionCallbacks];
                numScreenPositionCallbacks--;
            }
        };

        this.addAccelerationListener = function (callback) {
            this.subscribeToAcceleration();
            spatialObject.messageCallBacks.AccelerationCall = function (msgContent) {
                if (typeof msgContent.acceleration !== 'undefined') {
                    callback(msgContent.acceleration);
                }
            };
        };

        this.addVisibilityListener = function (callback) {
            spatialObject.messageCallBacks.visibilityCall = function (msgContent) {
                if (typeof msgContent.visibility !== 'undefined') {
                    callback(msgContent.visibility);
                }
            };
        };

        this.addInterfaceListener = function (callback) {
            spatialObject.messageCallBacks.interfaceCall = function (msgContent) {
                if (typeof msgContent.interface !== 'undefined') {
                    callback(msgContent.interface);
                }
            };
        };

        var numMovingCallbacks = 0;
        this.addIsMovingListener = function(callback) {
            numMovingCallbacks++;
            spatialObject.messageCallBacks['frameIsMovingCall' + numMovingCallbacks] = function (msgContent) {
                if (typeof msgContent.frameIsMoving !== 'undefined') {
                    callback(msgContent.frameIsMoving);
                }
            };
        };
    };

    SpatialInterface.prototype.injectSetterGetterAPI = function() {
        this.getVisibility = function () {
            return spatialObject.visibility;
        };

        this.getInterface = function () {
            return spatialObject.interface;
        };

        this.getPositionX = function () {
            if (typeof spatialObject.matrices.modelView[12] !== 'undefined') {
                return spatialObject.matrices.modelView[12];
            } else return undefined;
        };

        this.getPositionY = function () {
            if (typeof spatialObject.matrices.modelView[13] !== 'undefined') {
                return spatialObject.matrices.modelView[13];
            } else return undefined;
        };

        this.getPositionZ = function () {
            if (typeof spatialObject.matrices.modelView[14] !== 'undefined') {
                return spatialObject.matrices.modelView[14];
            } else return undefined;
        };

        this.getProjectionMatrix = function () {
            if (typeof spatialObject.matrices.projection !== 'undefined') {
                return spatialObject.matrices.projection;
            } else return undefined;
        };

        this.getModelViewMatrix = function () {
            if (typeof spatialObject.matrices.modelView !== 'undefined') {
                return spatialObject.matrices.modelView;
            } else return undefined;
        };

        this.getGroundPlaneMatrix = function () {
            if (typeof spatialObject.matrices.groundPlane !== 'undefined') {
                return spatialObject.matrices.groundPlane;
            } else return undefined;
        };

        this.getAnchoredModelView = function () {
            if (typeof spatialObject.matrices.anchoredModelView !== 'undefined') {
                return spatialObject.matrices.anchoredModelView;
            } else return undefined;
        };

        this.getDevicePoseMatrix = function () {
            if (typeof spatialObject.matrices.devicePose !== 'undefined') {
                return spatialObject.matrices.devicePose;
            } else return undefined;
        };

        this.getAllObjectMatrices = function () {
            if (typeof spatialObject.matrices.allObjects !== 'undefined') {
                return spatialObject.matrices.allObjects;
            } else return undefined;
        };

        this.getUnitValue = function(dataPackage) {
            return {
                value: (dataPackage.value * (dataPackage.unitMax - dataPackage.unitMin)) + dataPackage.unitMin,
                unit: dataPackage.unit
            };
        };

        /**
         * @deprecated
         * Used for the Target grocery demo
         *
         * @param ingredients
         * @param userList
         * @return {boolean}
         */
        this.search = function (ingredients, userList) {
            console.warn('deprecated, might be removed');
            for (var key in userList) {

                if (userList[key].state === false) {
                    if (typeof ingredients[key] !== 'undefined') {
                        if (ingredients[key].state === true) {
                            return false;
                        }
                    }
                }

                if (userList[key].state === true) {
                    if (typeof ingredients[key] !== 'undefined') {
                        if (ingredients[key].state === false) {
                            return false;
                        }
                    } else return false;
                }
            }
            return true;
        };

        this.registerTouchDecider = function(callback) {
            spatialObject.touchDecider = callback;
            spatialObject.touchDeciderRegistered = true;
        };

        // by default, register a touch decider that ignores touches if they hit a transparent body background
        this.registerTouchDecider(function(eventData) {
            var elt = document.elementFromPoint(eventData.x, eventData.y);
            return !(elt === document.body || elt === document.body.parentElement);
        });

        this.unregisterTouchDecider = function() {
            // touchDecider is passed by reference, so setting touchDecider to null would alter the function definition
            spatialObject.touchDeciderRegistered = false; // instead just set a flag to not use the callback anymore
        };

        this.getMoveDelay = function() {
            return spatialObject.moveDelay;
        };
    };

    SpatialInterface.prototype.injectInternetOfScreensAPI = function() {
        /**
         * Callback function for Internet of screens
         * @param callback
         */
        this.setIOCallback = function(callback) {
            this.ioCallback = callback;
            this.initializeIOSSocket();
        };

        /**
         * Socket connection for internet of screens
         * @param o
         */
        this.setIOSInterface = function(o) {
            this.iosObject = o;
        };

        this.initializeIOSSocket = function() {
            // TODO: this should only happen if an API call was made to turn it on
            // Connect this frame to the internet of screens.
            if (!this.iosObject) {
                console.log('ios socket connected.', iOSHost);
                this.iosObject = io.connect(iOSHost);
                if (this.ioCallback !== undefined) {
                    this.ioCallback();
                }
            }
        };
    };

    function isDesktop() {
        const userAgent = window.navigator.userAgent;
        const isWebView = userAgent.includes('Mobile') && !userAgent.includes('Safari');
        const isIpad = /Macintosh/i.test(navigator.userAgent) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints > 1;

        return !isWebView && !isIpad;
    }

    exports.spatialObject = spatialObject;
    exports.realityObject = spatialObject;
    exports.RealityInterface = SpatialInterface;
    exports.HybridObject = SpatialInterface;
    exports.SpatialInterface = SpatialInterface;

    exports.isDesktop = isDesktop;

})(window);
