createNameSpace("realityEditor.utilities");

realityEditor.utilities.getEditingElement = function() {
    if (editingState.frameKey) {
        return document.querySelector('#iframe'+editingState.frameKey);
    }
};

realityEditor.utilities.getKeysFromElement = function(element) {
    // TODO: doesnt work for objects with these words in their names
    // var frameKey = element.id.replace('svg', '').replace('iframe', '').replace('object', '');
    // return frameKey;

    return {
        objectKey: element.dataset.objectKey,
        frameKey: element.dataset.frameKey,
        nodeKey: (element.dataset.nodeKey === "null") ? (null) : element.dataset.nodeKey
    }

};

realityEditor.utilities.getClickedDraggableElement = function(mouseX, mouseY) {
    var clickedDraggableElement = null;
    var allDivsHere = getAllDivsUnderCoordinate(mouseX, mouseY);
    allDivsHere.some( function(clickedElement) {
        if (realityEditor.utilities.isDraggableElement(clickedElement)) {
            clickedDraggableElement = clickedElement;
        }
        return (clickedDraggableElement); // keep iterating until you find a draggable frame
    });
    return clickedDraggableElement;
};

realityEditor.utilities.isDraggableElement = function(clickedElement) {
    return (clickedElement.classList.contains('frame') && clickedElement.style.display !== 'none');
};

realityEditor.utilities.resetEditingState = function() {
    editingState.objectKey = null;
    editingState.frameKey = null;
    editingState.nodeKey = null;
    editingState.touchOffset = null;
};

/**
 * Stop and reset the touchEditingTimer if it's in progress.
 */
realityEditor.utilities.clearTouchTimer = function() {
    if (touchEditingTimer) {
        clearTimeout(touchEditingTimer.timeoutFunction);
        touchEditingTimer = null;
    }
};

/**
 * Don't post touches into the iframe if any are true:
 * 1. we're in editing mode
 * 2. we're dragging the current vehicle around, or
 * 3. we're waiting for the touchEditing timer to either finish or be cleared by moving/releasing
 * @return {boolean}
 */
realityEditor.utilities.shouldPostEventsIntoIframe = function() {
    var editingVehicle = this.getEditingElement();
    return !(editingVehicle || touchEditingTimer);
};

/**
 * Post a fake PointerEvent into the provided frame or node's iframe.
 * @param {PointerEvent} event
 * @param {string} frameKey
 * @param {string|undefined} nodeKey
 */
realityEditor.utilities.postEventIntoIframe = function(event, frameKey, nodeKey) {
    var iframe = document.getElementById('iframe' + (nodeKey || frameKey));
    var newCoords = webkitConvertPointFromPageToNode(iframe, new WebKitPoint(event.pageX, event.pageY));
    iframe.contentWindow.postMessage(JSON.stringify({
        event: {
            type: event.type,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            x: newCoords.x,
            y: newCoords.y
        }
    }), '*');
};