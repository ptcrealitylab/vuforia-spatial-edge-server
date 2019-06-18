createNameSpace("realityEditor.touchEvents");

/**
 * A set of arrays of callbacks that other modules can register to be notified of touchEvents actions.
 * Contains a property for each method name in touchEvents.js that can trigger events in other modules.
 * The value of each property is an array containing pointers to the callback functions that should be
 *  triggered when that function is called.
 * @type {{beginTouchEditing: Array.<function>, onMouseDown: Array.<function>, onMouseMove: Array.<function>, onMouseUp: Array.<function>, }}
 */
realityEditor.touchEvents.callbacks = {
    beginTouchEditing: [],
    onMouseDown: [],
    onMouseMove: [],
    onMouseUp: []
};

/**
 * Adds a callback function that will be invoked when the realityEditor.touchEvents.[functionName] is called
 * @param {string} functionName
 * @param {function} callback
 */
realityEditor.touchEvents.registerCallback = function(functionName, callback) {
    if (typeof this.callbacks[functionName] === 'undefined') {
        this.callbacks[functionName] = [];
    }

    this.callbacks[functionName].push(callback);
};

/**
 * Utility for iterating calling all callbacks that other modules have registered for the given function
 * @param {string} functionName
 * @param {object|undefined} params
 */
realityEditor.touchEvents.triggerCallbacks = function(functionName, params) {
    if (typeof this.callbacks[functionName] === 'undefined') return;

    // iterates over all registered callbacks to trigger events in various modules
    this.callbacks[functionName].forEach(function(callback) {
        callback(params);
    });
};

realityEditor.touchEvents.addTouchListeners = function() {
    document.addEventListener('pointerdown', realityEditor.touchEvents.onMouseDown);
    document.addEventListener('pointermove', realityEditor.touchEvents.onMouseMove);
    document.addEventListener('pointerup', realityEditor.touchEvents.onMouseUp);
};

realityEditor.touchEvents.beginTouchEditing = function(objectKey, frameKey, nodeKey) {
    isMouseDown = true; // set here in case we start moving programmatically
    editingState.objectKey = objectKey;
    editingState.frameKey = frameKey;
    editingState.nodeKey = nodeKey;
    var iFrame = realityEditor.utilities.getEditingElement();
    editingState.touchOffset = {
        x: iFrame.getBoundingClientRect().left - mouseX,
        y: iFrame.getBoundingClientRect().top - mouseY
    };

    realityEditor.trash.showTrash(editingState.frameKey, editingState.nodeKey);

    realityEditor.touchEvents.triggerCallbacks('beginTouchEditing', {objectKey: objectKey, frameKey: frameKey, nodeKey: nodeKey});

    console.log(editingState);
};

realityEditor.touchEvents.simulateMouseEvent = function(x,y,eventName,multiTouchList) {
    mouseX = x;
    mouseY = y;

    var ev = new MouseEvent(eventName, {
        'view': window,
        'bubbles': true,
        'cancelable': true,
        'pageX': x,
        'pageY': y,
        'touches': multiTouchList
    });
    ev.simulated = true;
    ev.simulatedPageX = x;
    ev.simulatedPageY = y;

    // el is null if x,y is outside window boundaries
    var el = document.elementFromPoint(x, y);
    if (el) {
        el.dispatchEvent(ev);
    } else {
        document.dispatchEvent(ev); // if you are outside the bounds, still try to move it
    }
};

realityEditor.touchEvents.onMouseDown = function(e) {
    e.preventDefault();

    if (e.simulated && firstMouseDown) return; // don't start a simulated gesture if you are doing one already on the touchscreen
    if (!e.simulated && isMouseDown && isCurrentGestureSimulated) return; // don't start touchscreen gesture if you are already simulating one

    mouseX = e.pageX;
    mouseY = e.pageY;

    if (e.simulated) {
        mouseX = e.simulatedPageX;
        mouseY = e.simulatedPageY;
        realityEditor.utilities.showTouchOverlay();
        isCurrentGestureSimulated = true;
    }

    if (!e.simulated) {

        if (secondMouseDown) return; // we only work with the first two fingers on the screen

        if (isMouseDown) {
            secondMouseDown = {
                x: mouseX,
                y: mouseY,
                pointerId: e.pointerId
            };
            realityEditor.utilities.showTouchOverlay(2);

        } else {
            firstMouseDown = {
                x: mouseX,
                y: mouseY,
                pointerId: e.pointerId
            };
            realityEditor.utilities.showTouchOverlay(1);
        }
        isCurrentGestureSimulated = false;
    }
    isMouseDown = true;

    var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
    if (clickedElement) {
        var editingKeys = realityEditor.utilities.getKeysFromElement(clickedElement);

        // Post event into iframe
        if (realityEditor.utilities.shouldPostEventsIntoIframe()) {
            realityEditor.utilities.postEventIntoIframe(e, editingKeys.frameKey, editingKeys.nodeKey);
        }

        var clickedVehicle = editingKeys.nodeKey ? (frames[editingKeys.frameKey].nodes[editingKeys.nodeKey]) : frames[editingKeys.frameKey]; // TODO: turn this into a safe, reusable utility function

        var defaultMoveDelay = defaultFrameMoveDelay;
        if (editingKeys.nodeKey) {
            defaultMoveDelay = defaultNodeMoveDelay;
        }

        var moveDelay = clickedVehicle.moveDelay || defaultMoveDelay;
        // after a certain amount of time, start editing this element
        var timeoutFunction = setTimeout(function () {

            realityEditor.touchEvents.beginTouchEditing(editingKeys.objectKey, editingKeys.frameKey, editingKeys.nodeKey);

            if (editingKeys.frameKey && !editingKeys.nodeKey) {
                var editingFrame = realityEditor.utilities.getEditingVehicle();
                var touchOffsetPercentX = -1 * editingState.touchOffset.x / (parseFloat(editingFrame.width) * editingFrame.screen.scale);
                var touchOffsetPercentY = -1 * editingState.touchOffset.y / (parseFloat(editingFrame.height) * editingFrame.screen.scale);

                if (e.simulated) {
                    socket.emit('writeScreenObject', {
                        objectKey: editingState.objectKey,
                        frameKey: editingState.frameKey,
                        nodeKey: editingState.nodeKey,
                        touchOffsetX: touchOffsetPercentX,
                        touchOffsetY: touchOffsetPercentY,
                        lastEditor: tempUuid
                    });
                }
            }

        }, moveDelay);

        // trigger this in its own scope to maintain
        // moveDelayTimeout(editingKeys, editingState, e.simulated);

        touchEditingTimer = {
            startX: mouseX,
            startY: mouseY,
            moveTolerance: 100,
            timeoutFunction: timeoutFunction
        };
    }

    realityEditor.touchEvents.triggerCallbacks('onMouseDown', {event: e});
};

// function moveDelayTimeout(editingKeys, editingState, simulated) {
//
// }

realityEditor.touchEvents.onMouseMove = function(e) {

    e.preventDefault();

    if (!isMouseDown) { return; } // only do these calculations if we're actually pressing down

    if (e.simulated && !isCurrentGestureSimulated) return;
    if (!e.simulated && isCurrentGestureSimulated) return;

    mouseX = e.pageX;
    mouseY = e.pageY;

    if (e.simulated) {
        mouseX = e.simulatedPageX;
        mouseY = e.simulatedPageY;
        realityEditor.utilities.showTouchOverlay();
    } else {

        if (!firstMouseDown) return; // ignore bug events that happen when mouse is on screen

        if (e.pointerId === firstMouseDown.pointerId) {
            firstMouseDown.x = mouseX;
            firstMouseDown.y = mouseY;
            realityEditor.utilities.showTouchOverlay(1);
        } else if (e.pointerId === secondMouseDown.pointerId) {
            secondMouseDown.x = mouseX;
            secondMouseDown.y = mouseY;
            realityEditor.utilities.showTouchOverlay(2);
        }
    }

    // cancel the touch hold timer if you move more than a negligible amount
    if (touchEditingTimer) {

        var dx = mouseX - touchEditingTimer.startX;
        var dy = mouseY - touchEditingTimer.startY;
        if (dx * dx + dy * dy > touchEditingTimer.moveTolerance) {
            realityEditor.utilities.clearTouchTimer();
        }

    }

    if (realityEditor.utilities.shouldPostEventsIntoIframe()) {

        var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
        if (clickedElement) {
            var editingKeys = realityEditor.utilities.getKeysFromElement(clickedElement);
            realityEditor.utilities.postEventIntoIframe(e, editingKeys.frameKey, editingKeys.nodeKey);
        }

    } else {

        if (e.simulated) {

            moveEditingVehicleToMousePos();

        } else {
            // if touched directly on screen, one finger gesture = drag, two fingers = scale
            if (firstMouseDown) {
                if (e.pointerId === firstMouseDown.pointerId) {

                    // drag with one or two finger gesture, but make sure it sticks to the first mouse
                    moveEditingVehicleToMousePos();

                    // if (editingState.frameKey) {
                    //     var frame = frames[editingState.frameKey];
                    //     frame.screen.x = mouseX + (editingState.touchOffset.x);
                    //     frame.screen.y = mouseY + (editingState.touchOffset.y);
                    // }
                }

                if (secondMouseDown) {

                    realityEditor.utilities.scaleEditingVehicle({x: firstMouseDown.x, y: firstMouseDown.y}, {x: secondMouseDown.x, y: secondMouseDown.y}, 2.0);

                }
            }

        }

    }

    realityEditor.touchEvents.triggerCallbacks('onMouseMove', {event: e});
};

// TODO: move to appropriate module
function moveEditingVehicleToMousePos() {
    var editingVehicle = realityEditor.utilities.getEditingVehicle();
    if (editingVehicle) {
        if (!editingState.nodeKey) {
            editingVehicle.screen.x = mouseX + (editingState.touchOffset.x);
            editingVehicle.screen.y = mouseY + (editingState.touchOffset.y);

            // also move group objects too
            realityEditor.groupBehavior.moveGroupedVehiclesIfNeeded(editingVehicle, mouseX, mouseY);

        } else {
            var parentFrameCenter = realityEditor.frameRenderer.getFrameCenter(editingState.frameKey);

            editingVehicle.x = mouseX - parentFrameCenter.x + (editingVehicle.width * editingVehicle.scale * scaleRatio)/2 + (editingState.touchOffset.x);
            editingVehicle.y = mouseY - parentFrameCenter.y + (editingVehicle.height * editingVehicle.scale * scaleRatio)/2 + (editingState.touchOffset.y);
        }
    }
}

realityEditor.touchEvents.onMouseUp = function(e) {

    e.preventDefault();

    realityEditor.network.postPositionAndSize(editingState.objectKey, editingState.frameKey, editingState.nodeKey, e.simulated);

    if (realityEditor.utilities.shouldPostEventsIntoIframe()) {
        var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
        if (clickedElement) {
            var editingKeys = realityEditor.utilities.getKeysFromElement(clickedElement);
            realityEditor.utilities.postEventIntoIframe(e, editingKeys.frameKey, editingKeys.nodeKey);
        }
    }

    if (e.simulated) {
        // only reset dragging if last touch
        if (multiTouchList.length < 2) {
            isMouseDown = false;

            realityEditor.utilities.resetEditingState();
            realityEditor.utilities.clearTouchTimer();
            realityEditor.utilities.hideTouchOverlay();
        }
    } else {

        // only reset dragging if last touch
        if (secondMouseDown) {
            if (firstMouseDown && e.pointerId === firstMouseDown.pointerId) {
                firstMouseDown.x = secondMouseDown.x;
                firstMouseDown.y = secondMouseDown.y;
                firstMouseDown.pointerId = secondMouseDown.pointerId;
                var iFrame = realityEditor.utilities.getEditingElement();
                if (iFrame) {
                    editingState.touchOffset = {
                        x: iFrame.getBoundingClientRect().left - secondMouseDown.x,
                        y: iFrame.getBoundingClientRect().top - secondMouseDown.y
                    };
                }
            }
            secondMouseDown = null;
            realityEditor.utilities.hideTouchOverlay(2);
        } else {
            isMouseDown = false;
            firstMouseDown = null;
            realityEditor.utilities.resetEditingState();
            realityEditor.utilities.clearTouchTimer();
            realityEditor.utilities.hideTouchOverlay(1);
        }
    }

    // reset scaling regardless
    initialScaleData = null;
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);

    // TODO: reset position within screen bounds or send to AR if outside of bounds

    realityEditor.touchEvents.triggerCallbacks('onMouseUp', {event: e});
};