createNameSpace("realityEditor.touchEvents");

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
    if (!clickedElement) {
        return;
    }
    var editingKeys = realityEditor.utilities.getKeysFromElement(clickedElement);

    // Post event into iframe
    if (realityEditor.utilities.shouldPostEventsIntoIframe()) {
        realityEditor.utilities.postEventIntoIframe(e, editingKeys.frameKey, editingKeys.nodeKey);
    }

    var moveDelay = 400;
    // after a certain amount of time, start editing this element
    var timeoutFunction = setTimeout(function () {

        realityEditor.touchEvents.beginTouchEditing(editingKeys.objectKey, editingKeys.frameKey, editingKeys.nodeKey);

        var editingFrame = realityEditor.utilities.getEditingVehicle();
        var touchOffsetPercentX = -1 * editingState.touchOffset.x / (parseFloat(editingFrame.width) * editingFrame.screen.scale);
        var touchOffsetPercentY = -1 * editingState.touchOffset.y / (parseFloat(editingFrame.height) * editingFrame.screen.scale);

        socket.emit('writeScreenObject', {
            objectKey: editingState.objectKey,
            frameKey: editingState.frameKey,
            nodeKey: editingState.nodeKey,
            touchOffsetX: touchOffsetPercentX,
            touchOffsetY: touchOffsetPercentY
        });

    }, moveDelay);

    touchEditingTimer = {
        startX: mouseX,
        startY: mouseY,
        moveTolerance: 100,
        timeoutFunction: timeoutFunction
    };

};

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
            if (editingState.frameKey) {
                var frame = frames[editingState.frameKey];
                frame.screen.x = mouseX + (editingState.touchOffset.x);
                frame.screen.y = mouseY + (editingState.touchOffset.y);
            }
        } else {
            // if touched directly on screen, one finger gesture = drag, two fingers = scale
            if (firstMouseDown) {
                if (e.pointerId === firstMouseDown.pointerId) {

                    // drag with one or two finger gesture, but make sure it sticks to the first mouse
                    if (editingState.frameKey) {
                        var frame = frames[editingState.frameKey];
                        frame.screen.x = mouseX + (editingState.touchOffset.x);
                        frame.screen.y = mouseY + (editingState.touchOffset.y);
                    }
                }

                if (secondMouseDown) {

                    realityEditor.utilities.scaleEditingVehicle({x: firstMouseDown.x, y: firstMouseDown.y}, {x: secondMouseDown.x, y: secondMouseDown.y}, 2.0);

                }
            }


        }

    }
};

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
};