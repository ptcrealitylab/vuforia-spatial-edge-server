createNameSpace("realityEditor.utilities");

realityEditor.utilities.getEditingVehicle = function() {
    if (editingState.frameKey) {
        if (editingState.nodeKey) {
            return frames[editingState.frameKey].nodes[editingState.nodeKey];
        }
        return frames[editingState.frameKey];
    }
};

realityEditor.utilities.getEditingElement = function() {
    if (editingState.nodeKey) {
        return document.querySelector('#iframe' + editingState.nodeKey);
    } else if (editingState.frameKey) {
        return document.querySelector('#iframe' + editingState.frameKey);
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

    realityEditor.trash.hideTrash();
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
    return !(editingVehicle /*|| touchEditingTimer*/);
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

realityEditor.utilities.isIPad = function () {
    return window.navigator.userAgent.indexOf('iPad') > -1;
};

/**
 * Generates a random 12 character unique identifier using uppercase, lowercase, and numbers (e.g. "OXezc4urfwja")
 * @return {string}
 */
realityEditor.utilities.uuidTime = function () {
    var dateUuidTime = new Date();
    var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
    while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
};

/**
 * Generates a random 8 character unique identifier using uppercase, lowercase, and numbers (e.g. "jzY3y338")
 * @return {string}
 */
realityEditor.utilities.uuidTimeShort = function () {
    var dateUuidTime = new Date();
    var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var stampUuidTime = parseInt("" + dateUuidTime.getMilliseconds() + dateUuidTime.getMinutes() + dateUuidTime.getHours() + dateUuidTime.getDay()).toString(36);
    while (stampUuidTime.length < 8) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
};

/**
 * Generates a random number between the two inputs, inclusive.
 * @param {number} min - The minimum possible value.
 * @param {number} max - The maximum possible value.
 */
realityEditor.utilities.randomIntInc = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

// avoids serializing cyclic data structures by only including minimal information needed for node iframe
// (keys such as grid and links sometimes contain cyclic references)
realityEditor.utilities.getNodesJsonForIframes = function(nodes) {
    var simpleNodes = {};
    var keysToExclude = ["links", "blocks", "grid", "guiState"];
    for (var node in nodes) {
        if (!nodes.hasOwnProperty(node)) continue;
        simpleNodes[node] = {};
        for (var key in nodes[node]) {
            if (!nodes[node].hasOwnProperty(key)) continue;
            if (keysToExclude.indexOf(key) === -1) {
                simpleNodes[node][key] = nodes[node][key];
            }
        }
    }
    return simpleNodes;
};

/**
 * Updates the timing object with the current timestamp and delta since last frame.
 * @param {{delta: number, now: number, then: number}} timing - reference to the timing object to modify
 */
realityEditor.utilities.timeSynchronizer = function(timing) {
    timing.now = Date.now();
    timing.delta = (timing.now - timing.then) / 198;
    timing.then = timing.now;
};

/**
 * Rescales x from the original range (in_min, in_max) to the new range (out_min, out_max)
 * @example map(5, 0, 10, 100, 200) would return 150, because 5 is halfway between 0 and 10, so it finds the number halfway between 100 and 200
 *
 * @param {number} x
 * @param {number} in_min
 * @param {number} in_max
 * @param {number} out_min
 * @param {number} out_max
 * @return {number}
 */
realityEditor.utilities.map = function(x, in_min, in_max, out_min, out_max) {
    if (x > in_max) x = in_max;
    if (x < in_min) x = in_min;
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

/**
 * unknownKey is an objectKey, frameKey, or nodeKey
 * @param {string} unknownKey
 * @return {{objectKey: string|null, frameKey: string|null, nodeKey: string|null}}
 */
realityEditor.utilities.getKeysFromKey = function(unknownKey) {
    var keys = {
        objectKey: null,
        frameKey: null,
        nodeKey: null
    };

    if (unknownKey.indexOf(getObjectId()) > -1) {
        keys.objectKey = getObjectId();
        realityEditor.database.forEachFrame(function(frameKey) {
            if (unknownKey.indexOf(frameKey) > -1) {
                keys.frameKey = frameKey;
                realityEditor.database.forEachNodeInFrame(frameKey, function(nodeKey) {
                    if (unknownKey.indexOf(nodeKey) > -1) {
                        keys.nodeKey = nodeKey;
                    }
                });
            }
        });
    }

    return keys;
};

/**
 * Checks if the line (x11,y11) -> (x12,y12) intersects with the line (x21,y21) -> (x22,y22)
 * @param {number} x11
 * @param {number} y11
 * @param {number} x12
 * @param {number} y12
 * @param {number} x21
 * @param {number} y21
 * @param {number} x22
 * @param {number} y22
 * @param {number} w - width of canvas
 * @param {number} h - height of canvas (ignores intersections outside of canvas
 * @return {boolean}
 */
realityEditor.utilities.checkLineCross = function(x11, y11, x12, y12, x21, y21, x22, y22, w, h) {
    var l1 = this.lineEq(x11, y11, x12, y12),
        l2 = this.lineEq(x21, y21, x22, y22);

    var interX = this.calculateX(l1, l2); //calculate the intersection X value
    if (interX > w || interX < 0) {
        return false; //false if intersection of lines is output of canvas
    }
    var interY = this.calculateY(l1, interX);
    // cout("interX, interY",interX, interY);

    if (!interY || !interX) {
        return false;
    }
    if (interY > h || interY < 0) {
        return false; //false if intersection of lines is output of canvas
    }
    //  cout("point on line --- checking on segment now");
    return (this.checkBetween(x11, x12, interX) && this.checkBetween(y11, y12, interY)
        && this.checkBetween(x21, x22, interX) && this.checkBetween(y21, y22, interY));
};

/**
 * Given two end points of the segment and some other point p,
 * return true if p is between the two segment points.
 * (utility that helps with e.g. checking if two lines cross)
 * @param {number} e1
 * @param {number} e2
 * @param {number} p
 * @return {boolean}
 */
realityEditor.utilities.checkBetween = function (e1, e2, p) {
    var marg2 = 2;

    if (e1 - marg2 <= p && p <= e2 + marg2) {
        return true;
    }
    if (e2 - marg2 <= p && p <= e1 + marg2) {
        return true;
    }

    return false;
};

/**
 * function for calculating the line equation given the endpoints of a line.
 * returns [m, b], where this corresponds to y = mx + b
 * y = [(y1-y2)/(x1-x2), -(y1-y2)/(x1-x2)*x1 + y1]
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @return {Array.<number>} - length 2 array. first entry is m (slope), seconds is b (y-intercept)
 */
realityEditor.utilities.lineEq = function (x1, y1, x2, y2) {
    var m = this.slopeCalc(x1, y1, x2, y2);
    // if(m == 'vertical'){
    //     return ['vertical', 'vertical'];
    // }
    return [m, -1 * m * x1 + y1];
};

/**
 * Calculates the slope of the line defined by the provided endpoints (x1,y1) -> (x2,y2)
 * slope has to be multiplied by -1 because the y-axis value increases we we go down
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @return {number}
 */
realityEditor.utilities.slopeCalc = function (x1, y1, x2, y2) {
    if ((x1 - x2) === 0) {
        return 9999; //handle cases when slope is infinity
    }
    return (y1 - y2) / (x1 - x2);
};

/**
 * calculate the intersection x value given two line segment
 * @param {Array.<number>} seg1 - [slope of line 1, y-intercept of line 1]
 * @param {Array.<number>} seg2 - [slope of line 2, y-intercept of line 2]
 * @return {number} - the x value of their intersection
 */
realityEditor.utilities.calculateX = function (seg1, seg2) {
    return (seg2[1] - seg1[1]) / (seg1[0] - seg2[0]);
};

/**
 * calculate y given x and the line equation
 * @param {Array.<number>} seg1 - [slope of line 1, y-intercept of line 1]
 * @param {number} x
 * @return {number} - returns (y = mx + b)
 */
realityEditor.utilities.calculateY = function (seg1, x) {
    return seg1[0] * x + seg1[1];
};