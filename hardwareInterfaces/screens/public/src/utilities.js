createNameSpace("realityEditor.utilities");

realityEditor.utilities.getEditingVehicle = function() {
    if (editingState.frameKey) {
        return frames[editingState.frameKey];
    }
};

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
    editingState.touchOffset = {
        x: 0,
        y: 0
    };
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
 * Very simply polyfill for webkitConvertPointFromPageToNode - but only works for divs with no 3D transformation
 * @param {HTMLElement} elt - the div whose coordinate space you are converting into
 * @param {number} pageX
 * @param {number} pageY
 * @return {{x: number, y: number}} matching coordinates within the elt's frame of reference
 */
realityEditor.utilities.convertPointFromPageToNode = function(elt, pageX, pageY) {
    var eltRect = elt.getClientRects()[0];
    var nodeX = (pageX - eltRect.left) / eltRect.width * parseFloat(elt.style.width);
    var nodeY = (pageY - eltRect.top) / eltRect.height * parseFloat(elt.style.height);
    return {
        x: nodeX,
        y: nodeY
    }
};

/**
 * Post a fake PointerEvent into the provided frame or node's iframe.
 * @param {PointerEvent} event
 * @param {string} frameKey
 * @param {string|undefined} nodeKey
 */
realityEditor.utilities.postEventIntoIframe = function(event, frameKey, nodeKey) {
    var iframe = document.getElementById('iframe' + (nodeKey || frameKey));

    // Convert the mouse point into iframe coordinates using our polyfill or the default webkit function
    // if (typeof webkitConvertPointFromPageToNode !== "undefined" && typeof WebKitPoint !== "undefined") {
    //     var newCoords = webkitConvertPointFromPageToNode(iframe, new WebKitPoint(mouseX, mouseY));
    // }

    var newCoords = this.convertPointFromPageToNode(iframe, mouseX, mouseY);

    iframe.contentWindow.postMessage(JSON.stringify({
        event: {
            type: event.type,
            pointerId: event.pointerId || 1,
            pointerType: event.pointerType || "touch",
            x: newCoords.x,
            y: newCoords.y
        }
    }), '*');
};

/**
 * Show visual feedback about the current mouse position
 * @param {number|undefined} whichFinger - if 2 passed in, moves touchOverlaySecondFinger instead
 */
realityEditor.utilities.showTouchOverlay = function(whichFinger) {
    console.log(whichFinger);
    if (whichFinger && whichFinger === 2) {
        touchOverlaySecondFinger.style.left = secondMouseDown.x + 'px';
        touchOverlaySecondFinger.style.top = secondMouseDown.y + 'px';
        touchOverlaySecondFinger.style.display = 'inline';
    } else if (whichFinger && whichFinger === 1) {
        touchOverlay.style.left = firstMouseDown.x + 'px';
        touchOverlay.style.top = firstMouseDown.y + 'px';
        touchOverlay.style.display = 'inline';
    } else {
        touchOverlay.style.left = mouseX + 'px';
        touchOverlay.style.top = mouseY + 'px';
        touchOverlay.style.display = 'inline';
    }
};

/**
 * Hide visual feedback when the mouse is released
 * @param {number|undefined} whichFinger - if 2 passed in, moves touchOverlaySecondFinger instead
 */
realityEditor.utilities.hideTouchOverlay = function(whichFinger) {
    if (whichFinger && whichFinger === 2) {
        touchOverlaySecondFinger.style.display = 'none';
    } else {
        touchOverlay.style.display = 'none';
    }
};

/**
 * Scales the editing frame (if there is one currently) using the first two touches.
 * The new scale starts at the initial scale and varies linearly with the changing touch radius.
 * @param {Object.<x,y>} centerTouch the first touch event, where the scale is centered from
 * @param {Object.<x,y>} outerTouch the other touch, where the scale extends to
 * @param {number|undefined} scaleSpeed - adjust how much it scales per distance pinched. defaults to 1.0 if omitted
 */
realityEditor.utilities.scaleEditingVehicle = function(centerTouch, outerTouch, scaleSpeed) {
    if (typeof scaleSpeed === 'undefined') scaleSpeed = 1.0;

    console.log(centerTouch, outerTouch);

    var activeVehicle = this.getEditingVehicle();
    if (!activeVehicle) {
        console.warn('no currently editing vehicle');
        return;
    }

    if (!centerTouch || !outerTouch || !centerTouch.x || !centerTouch.y || !outerTouch.x || !outerTouch.y) {
        console.warn('trying to scale vehicle using improperly formatted touches');
        return;
    }

    var dx = centerTouch.x - outerTouch.x;
    var dy = centerTouch.y - outerTouch.y;
    var radius = Math.sqrt(dx * dx + dy * dy);

    var positionData = activeVehicle.screen;

    if (!initialScaleData) {
        initialScaleData = {
            radius: radius,
            scale: positionData.scale
        };
        return;
    }

    // calculate the new scale based on the radius between the two touches
    var newScale = initialScaleData.scale + (radius - initialScaleData.radius) / (300 * windowToEditorRatio / scaleSpeed);
    if (typeof newScale !== 'number') return;

    // manually calculate positionData.x and y to keep centerTouch in the same place relative to the vehicle
    // var frameContainerDom = document.querySelector('#object'+activeVehicle.uuid);
    // if (frameContainerDom && editingState.touchOffset) {
    //     var touchOffsetFromCenter = {
    //         x: frameContainerDom.clientWidth/2 - editingState.touchOffset.x,
    //         y: frameContainerDom.clientHeight/2 - editingState.touchOffset.y
    //     };
    //     var scaleDifference = Math.max(0.2, newScale) - positionData.scale;
    //     positionData.x += touchOffsetFromCenter.x * scaleDifference;
    //     positionData.y += touchOffsetFromCenter.y * scaleDifference;
    // }

    positionData.scale = Math.max(0.2, newScale); // 0.2 is the minimum scale allowed

    // redraw circles to visualize the new scaling
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);

    // draw a blue circle visualizing the initial radius
    var circleCenterCoordinates = [centerTouch.x, centerTouch.y];
    var circleEdgeCoordinates = [outerTouch.x, outerTouch.y];
    realityEditor.draw.drawBlue(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, initialScaleData.radius);

    // draw a red or green circle visualizing the new radius
    if (radius < initialScaleData.radius) {
        realityEditor.draw.drawRed(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, radius);
    } else {
        realityEditor.draw.drawGreen(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, radius);
    }
};

/**
 * Robust system for adding callbacks that run on window resize without losing performance.
 * Example usage:
 * realityEditor.utilities.optimizedResize.add(function() { console.log(window.innerWidth, window.innerHeight); })
 * @type {{add}}
 */
realityEditor.utilities.optimizedResize = (function() {

    var callbacks = [],
        running = false;

    // fired on resize event
    function resize() {

        if (!running) {
            running = true;

            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(runCallbacks);
            } else {
                setTimeout(runCallbacks, 66);
            }
        }

    }

    // run the actual callbacks
    function runCallbacks() {

        callbacks.forEach(function(callback) {
            callback.callbackFunction.apply(null, callback.callbackArguments);
        });

        running = false;
    }

    // adds callback to loop
    function addCallback(callback, arguments) {

        arguments = arguments || [];

        if (callback) {
            callbacks.push({callbackFunction: callback, callbackArguments: arguments});
        }

    }

    return {
        // public method to add additional callback
        add: function(callback) {
            if (!callbacks.length) {
                window.addEventListener('resize', resize);
            }
            addCallback(callback);
        }
    }
}());

realityEditor.utilities.calculateScaleFactor = function() {
    scaleRatio = window.innerWidth / targetSize.width;
    console.log(scaleRatio);
};

realityEditor.utilities.resetScreenFramePositions = function() {
    console.log('reset screen frames\' positions');
    getScreenFrames().forEach(function(frame, i) {
        frame.screen.x = i * 50;
        frame.screen.y = i * 50;
        frame.screen.scale = 0.5 * scaleRatio;
    });
};

realityEditor.utilities.resetFramesIfTripleTap = function() {
    if (listenDoubleTap) {
        if (listenTripleTap) {
            realityEditor.utilities.resetScreenFramePositions();
            clearTimeout(tripleTapTimer);
            listenTripleTap = false;
        } else {
            console.log('listen for triple tap');
            listenTripleTap = true;
            tripleTapTimer = setTimeout(function() {
                console.log('stop waiting triple tap');
                listenTripleTap = false;
            }, 300);
        }
    } else {
        console.log('listen for double tap');
        listenDoubleTap = true;
        doubleTapTimer = setTimeout(function() {
            console.log('stop waiting double tap');
            listenDoubleTap = false;
        }, 300);
    }
};
