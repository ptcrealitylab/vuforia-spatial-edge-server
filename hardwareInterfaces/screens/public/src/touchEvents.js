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
        x: iFrame.getBoundingClientRect().x - mouseX,
        y: iFrame.getBoundingClientRect().y - mouseY
    };

};

realityEditor.touchEvents.onMouseDown = function(e) {

    isMouseDown = true;

    if (e.pointerType === 'mouse') { // hack to let us reposition things with the mouse too
        mouseX = e.pageX;
        mouseY = e.pageY;
    } else {
        mouseX = e.screenX;
        mouseY = e.screenY;
    }

    realityEditor.utilities.showTouchOverlay();

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
        socket.emit('writeScreenObject', {objectKey: editingState.objectKey, frameKey: editingState.frameKey, nodeKey: editingState.nodeKey, touchOffsetX: editingState.touchOffset.x, touchOffsetY: editingState.touchOffset.y});

    }, moveDelay);

    touchEditingTimer = {
        startX: mouseX,
        startY: mouseY,
        moveTolerance: 100,
        timeoutFunction: timeoutFunction
    };

};

realityEditor.touchEvents.onMouseMove = function(e) {

    if (!isMouseDown) { return; } // only do these calculations if we're actually pressing down

    if (e.pointerType === 'mouse') { // hack to let us reposition things with the mouse too
        mouseX = e.pageX;
        mouseY = e.pageY;
    } else {
        mouseX = e.screenX;
        mouseY = e.screenY;
    }

    realityEditor.utilities.showTouchOverlay();

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

        if (editingState.frameKey) {
            var frame = frames[editingState.frameKey];
            frame.screen.x = mouseX + (editingState.touchOffset.x || 0);
            frame.screen.y = mouseY + (editingState.touchOffset.y || 0);
        }

    }
};

realityEditor.touchEvents.onMouseUp = function(e) {

    realityEditor.network.postPositionAndSize(editingState.objectKey, editingState.frameKey, editingState.nodeKey);

    if (realityEditor.utilities.shouldPostEventsIntoIframe()) {
        var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
        if (clickedElement) {
            var editingKeys = realityEditor.utilities.getKeysFromElement(clickedElement);
            realityEditor.utilities.postEventIntoIframe(e, editingKeys.frameKey, editingKeys.nodeKey);
        }
    }

    // only reset dragging if last touch
    if (multiTouchList.length < 2) {
        isMouseDown = false;
        realityEditor.utilities.resetEditingState();
        realityEditor.utilities.clearTouchTimer();
        realityEditor.utilities.hideTouchOverlay();
    }

    // reset scaling regardless
    initialScaleData = null;
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);

    // TODO: reset position within screen bounds or send to AR if outside of bounds
};