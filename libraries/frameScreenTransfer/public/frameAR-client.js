(function(exports) {

    var markerElement;
    var markerPath = '/resources/marker.jpg';
    var AR_MARKER_SIZE = 300.0;
    // var frames = [];
    var mouseX;
    var mouseY;

    var mostRecentZ;
    var startDragZ;
    var DEFAULT_START_DRAG_Z = 500;

    var isCurrentFrameInScreen = true;
    var framePullOutThreshold = 300;

    var publicState = {
        mouseX: undefined,
        mouseY: undefined,
        mostRecentZ: undefined,
        startDragZ: undefined
    };

    function setMarkerPath(path) {
        markerPath = path;
        updateMarkerElementPath();
    }

    function updateMarkerElementPath() {
        if (markerElement) {
            markerElement.style.backgroundImage = 'url(\'' + markerPath + '\')';
        }
    }

    function getMarkerElement(path, additionalStyles) {
        console.log('getMarkerElement');
        if (!markerElement) {
            markerElement = document.createElement('div');
            markerElement.className = 'paletteMarker';
            if (additionalStyles) {
                Object.keys(additionalStyles).forEach(function (styleName) {
                    markerElement.style[styleName] = additionalStyles[styleName];
                });
            }
            if (path) {
                setMarkerPath(path || markerPath);
            }
        }
        return markerElement;
    }

    /**
     * An element in the DOM tree.
     *
     * @external DOMElement
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement DOMElement}
     */

    /**
     * Creates and returns a DOM element for a new frame of a given type.
     * @param {string} frameType - Type of UI to load into the frame (e.g. decimal, gauge, graph, light), used to locate html file with same name.
     * @return {DOMElement}
     */
    function createFrame(frameType) {
        var frameDomElement = document.createElement('iframe');
        frameDomElement.classList.add('controlFrame');
        frameDomElement.frameType = frameType;
        frameDomElement.id = frameType + 'Frame';
        frameDomElement.src = '/frames/' + frameType + '.html';
        frameDomElement.scrolling = 'no';
        frameDomElement.style.border = '0px solid transparent';
        frameDomElement.onload = function() {
            frameDomElement.contentWindow.postMessage({value: defaultValue}, 'http://localhost:' + PORT); // TODO: change localhost in production?
        };
        return frameDomElement;
    }

    function initializeDragInterface() {
        console.log('initializeDragInterface');
    }

    /**
     * Creates the socket.io connection and listens for remote touch and frame transferring messages.
     * Functionality must be customized to your app's logic and UI by passing in callbacks.
     *
     * @param {frameReceivedCallback} frameReceivedCallback - a callback triggered receiving a frameReceived socket message.
     * @param {frameSendFilter} frameSendFilter - a callback within the zPosition socket message that determines whether to send the frame to AR.
     * @param {frameSendCallback} frameSendCallback - a callback within the zPosition socket message that removes the screen frame and returns data needed to generate AR frame on server.
     */
    function createSocketListeners(frameReceivedCallback, frameSendFilter, frameSendCallback) {

        var socket = io();

        console.log('createSocketListeners');

        socket.on('remoteTouchDown', function(msg) {
            simulateMouseEvent(msg.pageX, msg.pageY, 'mousedown'); // TODO: add 2.0 as final arg?
        });

        socket.on('remoteTouchMove', function(msg) {
            simulateMouseEvent(msg.pageX, msg.pageY, 'mousemove');
        });

        socket.on('remoteTouchUp', function(msg) {
            isCurrentFrameInScreen = true;
            simulateMouseEvent(msg.pageX, msg.pageY, 'mouseup');
        });

        socket.on('frameReceived', function(msg) {
            frameReceivedCallback(msg);
        });

        socket.on('zPosition', function(msg) {
            mostRecentZ = msg.zPosition;
            if (frameSendFilter(msg)) {
                var msgData = frameSendCallback(msg);
                socket.emit('transportFrame', msgData);
            }
        });

        // TODO: add a direct api for triggering a frame send action??
    }

    /**
     * Utility for getting scale factor between screen coordinates and AR marker coordinates.
     * @return {number} scale factor. 1 means they are the same and 0.5 means marker in AR is half as big as marker on screen.
     */
    function getScreenScaleFactor() {
        var marker = getMarkerElement();
        var markerRect = marker.getClientRects()[0];
        return AR_MARKER_SIZE / markerRect.height;
    }

    /**
     * Utility for converting coordinates from AR space to screen space.
     * @param {number} arX - x coordinate in AR space relative to center of marker.
     * @param {number} arY - y coordinate in AR space relative to center of marker.
     * @return {{x: number, y: number}}
     */
    function getScreenPosFromARPos(arX, arY) {
        var marker = getMarkerElement();
        var markerRect = marker.getClientRects()[0];
        var scaleFactor = getScreenScaleFactor();
        var screenX = (markerRect.x + markerRect.width/2) + (arX / scaleFactor);
        var screenY = (markerRect.y + markerRect.height/2) + (arY / scaleFactor);
        return {
            x: screenX,
            y: screenY
        };
    }

    /**
     * Utility for converting coordinates from screen space to AR space.
     * @param {number} screenX - x coordinate relative to upper left of screen.
     * @param {number} screenY - y coordinate relative to upper left of screen.
     * @return {{x: number, y: number}}
     */
    function getARPosFromScreenPos(screenX, screenY) {
        var marker = getMarkerElement();
        var markerRect = marker.getClientRects()[0];
        var scaleFactor = getScreenScaleFactor();
        var arX = (screenX - (markerRect.x + markerRect.width/2)) * scaleFactor;
        var arY = (screenY - (markerRect.y + markerRect.height/2)) * scaleFactor;
        return {
            x: arX,
            y: arY
        };
    }

    /**
     * Utility for getting the location of the mouse within the dragged panel on the screen. //TODO: standardize vocabulary -> "Frame" not "Panel"
     * @return {{x: number, y: number}}
     */
    function getDraggedPanelPos() {
        var offsetX = parseFloat(dragOffsetX) || 0;
        var offsetY = parseFloat(dragOffsetY) || 0;
        var draggedPanelX = parseInt(currentlyDraggedPanel.style.left) + offsetX;
        var draggedPanelY = parseInt(currentlyDraggedPanel.style.top) + offsetY;
        return {
            x: draggedPanelX,
            y: draggedPanelY
        }
    }

    /**
     * Programmatically trigger a mouse event at the given location. Triggered event has simulated=true property so you can check source if needed.
     * @param {number} x - target x coordinate on the screen
     * @param {number} y - target y coordinate on the screen
     * @param {string} eventName - type of MouseEvent to simulate, e.g. mousedown, mousemove, mouseup (see https://www.w3.org/TR/uievents/#events-mouse-types)
     * @param {number} [scaleFactor=1] - optional scale to apply to coordinates. // TODO: remove? would be much simpler to understand without it.
     */
    function simulateMouseEvent(x, y, eventName, scaleFactor) {

        if (scaleFactor === undefined) {
            scaleFactor = 1;
        }

        mouseX = x * scaleFactor; // TODO: i have no idea why this works... scaleFactor is only applied to mouseX/mouseY, not screenX/screenY within the event
        mouseY = y * scaleFactor;

        var ev = new MouseEvent(eventName, {
            'view': window,
            'bubbles': true,
            'cancelable': true,
            'screenX': x, // TODO: remove if not used... or remove mouseX/mouseY as those shouldnt really exist
            'screenY': y
        });
        ev.simulated = true;

        var el = document.elementFromPoint(x, y);
        el.dispatchEvent(ev);
    }

    exports.frameAR = {
        setMarkerPath: setMarkerPath,
        getMarkerElement: getMarkerElement,
        createFrame: createFrame,
        initializeDragInterface: initializeDragInterface,
        createSocketListeners: createSocketListeners,
        // onFrameReceived: onFrameReceived,
        // shouldSendFrameOnZ: shouldSendFrameOnZ,
        // onFrameSend: onFrameSend,
        getScreenPosFromARPos: getScreenPosFromARPos,
        getARPosFromScreenPos: getARPosFromScreenPos,
        publicState: publicState
    }

})(window);