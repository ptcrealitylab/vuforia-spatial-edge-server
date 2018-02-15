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

    var currentlyDraggedFrame = null;
    var isCurrentFrameInScreen = true;

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

    /**
     * Setup a drag-and-drop model that lets you move frames around, and tracks the current frame being moved and where it is.
     *
     * @param {createDraggedFrameCallback} createDraggedFrameCallback - callback to create a new screen frame element, triggered when you drag out from the palette.
     */
    function initializeDragInterface(createDraggedFrameCallback) {

        console.log('initializeDragInterface');

        // 1. create local variables

        var timer;
        var clickedFrameContainer = null;
        var interactionState = getStates().NONE;

        // 2. add event listeners for mouse down, up, move, (cancel?)
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
//        document.addEventListener('mouseout', onMouseUpdate, false);


        function onMouseDown() {
            interactionState = performAction(getActions().MOUSE_DOWN, interactionState);
        }

        function onMouseMove(e) {

            // remote touch came from phone
            if (e.simulated) {
                mouseX = e.screenX * 2.0; // TODO: scale here or while generating event?
                mouseY = e.screenY * 2.0;
            } else {
                mouseX = e.pageX;
                mouseY = e.pageY;
            }

            interactionState = performAction(getActions().MOUSE_MOVE, interactionState);

            // console.log(currentlyDraggedFrame);
            if (currentlyDraggedFrame) {
                currentlyDraggedFrame.style.top = mouseY + dragOffsetY + "px"; // + 20
                currentlyDraggedFrame.style.left = mouseX + dragOffsetX + "px"; // + 20
            }
        }

        function onMouseUp(e) {
            console.log("mouseup", interactionState);
            interactionState = performAction(getActions().MOUSE_UP, interactionState);
        }

        // maintain a state machine that triggers actions upon entering each state

        function getStates() {
            return {
                NONE: 0,
                CLICK: 1,
                HOLD: 3,
                DRAG: 5
            };
        }

        function getActions() {
            return {
                NONE: 0,
                MOUSE_DOWN: 1,
                MOUSE_MOVE: 2,
                MOUSE_UP: 3,
                MOUSE_CANCEL: 4,
                TIME_PASSED: 5
            };
        }

        function getEvents() {
            return {
                MOUSE_START_CLICK: 0,
                MOUSE_STOP_CLICK: 1,
                MOUSE_START_HOLD: 2,
                MOUSE_STOP_HOLD: 3,
                MOUSE_START_DRAG: 4,
                MOUSE_STOP_DRAG: 5
            };
        }

        function performAction(action, currentState) {

            if (action === getActions().MOUSE_DOWN) {
                if (currentState === getStates().NONE) {
                    triggerEvent(getEvents().MOUSE_START_CLICK);
                    return getStates().CLICK;
                }

            } else if (action === getActions().TIME_PASSED) {
                if (currentState === getStates().CLICK) {
                    triggerEvent(getEvents().MOUSE_START_HOLD);
                    return getStates().HOLD;
                }

            } else if (action === getActions().MOUSE_MOVE) {
                if (currentState === getStates().CLICK || currentState === getStates().HOLD) {
                    triggerEvent(getEvents().MOUSE_START_DRAG);
                    return getStates().DRAG;
                }

            } else if (action === getActions().MOUSE_UP || action === getActions().MOUSE_CANCEL) {
                if (currentState === getStates().CLICK) {
                    triggerEvent(getEvents().MOUSE_STOP_CLICK)
                } else if (currentState === getStates().HOLD) {
                    triggerEvent(getEvents().MOUSE_START_HOLD);
                } else if (currentState === getStates().DRAG) {
                    triggerEvent(getEvents().MOUSE_STOP_DRAG);
                }

                return getStates().NONE;

            }
            return currentState;
        }

        function triggerEvent(event) {
            clearTimeout(timer);
            switch (event) {
                case getEvents().MOUSE_START_CLICK:
                    startClick();
                    timer = setTimeout(function(){
                        interactionState = performAction(getActions().TIME_PASSED, interactionState);
                    }, 1000);
                    break;
                case getEvents().MOUSE_START_HOLD:
                    startHoldOrDrag();
                    break;
                case getEvents().MOUSE_START_DRAG:
                    startHoldOrDrag();
                    break;
                case getEvents().MOUSE_STOP_CLICK:
                    break;
                case getEvents().MOUSE_STOP_HOLD:
                case getEvents().MOUSE_STOP_DRAG:
                    stopHoldOrDrag();
                    break;
                default:
                    console.log("shouldn't happen");
            }
        }

        function startClick() {
            clickedFrameContainer = null;
            var allDivsHere = getAllDivsUnderCoordinate(mouseX, mouseY);
            allDivsHere.some( function(clickedElement) {
                if (clickedElement.classList.contains('sidebarPanel')) {
                    clickedFrameContainer = clickedElement;
                    dragOffsetX = clickedFrameContainer.getBoundingClientRect().x - mouseX;
                    dragOffsetY = clickedFrameContainer.getBoundingClientRect().y - mouseY;
                }
                return (!!clickedFrameContainer);
            });
        }

        function startHoldOrDrag() {
            if (!currentlyDraggedFrame && clickedFrameContainer) {
                currentlyDraggedFrame = createDraggedFrameCallback(clickedFrameContainer.id);
                startDragZ = mostRecentZ || DEFAULT_START_DRAG_Z;
                clickedFrameContainer = null;
            }
        }

        function stopHoldOrDrag() {
            if (currentlyDraggedFrame) {
                // get panel it's on top of
                var allDivsHere = getAllDivsUnderCoordinate(mouseX, mouseY);
                allDivsHere.forEach( function(element) {
                    if (element.classList.contains('region') &&  element.id.startsWith('panel_') && element.id !== 'panel_row0_col0') {
                        console.log('released on panel');
                        panelVisualizationTypes[element.id] = currentlyDraggedFrame.id;
                        setPanelDisplay(element, currentlyDraggedFrame.id);
                    }
                });

                document.getElementsByTagName('body')[0].removeChild(currentlyDraggedFrame);
                currentlyDraggedFrame = null;
            }
        }

        function getAllDivsUnderCoordinate(x, y) {
            var res = [];

            var ele = document.elementFromPoint(x,y);
            while(ele && ele.tagName !== "BODY" && ele.tagName !== "HTML"){
                res.push(ele);
                ele.style.display = "none";
                ele = document.elementFromPoint(x,y);
            }

            for(var i = 0; i < res.length; i++){
                res[i].style.display = "";  // TODO: more correct if you set back to original display type
            }
            console.log(res);
            return res;
        }
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
    function getDraggedFramePos() {
        var offsetX = parseFloat(dragOffsetX) || 0;
        var offsetY = parseFloat(dragOffsetY) || 0;
        var draggedFrameX = parseInt(currentlyDraggedFrame.style.left) + offsetX;
        var draggedFrameY = parseInt(currentlyDraggedFrame.style.top) + offsetY;
        return {
            x: draggedFrameX,
            y: draggedFrameY
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