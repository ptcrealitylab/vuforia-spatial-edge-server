createNameSpace("realityEditor.linkRenderer");

(function(exports) {

    var linkCanvas;
    var linkCanvasContext;
    var guiState;
    var timeCorrection = {delta: 0, now: 0, then: 0};
    var incompleteLink = {ballAnimationCount: 0};

    var storedIncompleteLink = {
        startNodeKey: null,
        endX: null,
        endY: null
    };

    var storedCutLine = {
        startX: null,
        startY: null,
        endX: null,
        endY: null
    };

    function initFeature() {

        // create a drawing context for the links
        // linkCanvas = document.createElement('canvas');
        // linkCanvas.id = 'linkCanvas';
        // document.body.appendChild(linkCanvas);
        //
        // linkCanvasContext = linkCanvas.getContext('2d');

        // linkCanvasContext.beginPath();
        // linkCanvasContext.fillStyle = "rgba(255,0,0,1)";
        // linkCanvasContext.arc(100, 100, 30, 0, 2*Math.PI);
        // linkCanvasContext.fill();

        // globalCanvas.context.beginPath();
        // globalCanvas.context.fillStyle = "rgba(255,0,0,1)";
        // globalCanvas.context.arc(100, 100, 30, 0, 2*Math.PI);
        // globalCanvas.context.fill();

        // subscribe to the gui state so that we only render links in node view

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });
    }

    function renderLinks() {
        if (guiState !== 'node') return;

        realityEditor.utilities.timeSynchronizer(timeCorrection);
        console.log(timeCorrection.delta);

        // erases anything on the background canvas
        if (globalCanvas.hasContent === true) {
            globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
            globalCanvas.hasContent = false;
        }

        // console.log('render links');

        realityEditor.database.forEachLinkInAllFrames(function(frameKey, linkKey, link) {

            var objectAID = getObjectId();
            var frameA = frames[frameKey];
            var objectBID = link.objectB;
            var frameB = frames[link.frameB];

            if (objectAID !== objectBID) {
                return; // TODO: remove this and draw to visual memory pointer, in a future iteration...
            }

            if (isNaN(link.ballAnimationCount)) {
                link.ballAnimationCount = 0;
            }

            if (!frameA || !frameB) {
                return; // should not be undefined
            }

            var nodeA = frameA.nodes[link.nodeA];
            var nodeB = frameB.nodes[link.nodeB];

            if (!nodeA || !nodeB) {
                return; // should not be undefined
            }

            // TODO: insert conditional rendering for memories and logic nodes
            // ...
            // ...

            var nodeACenter = realityEditor.nodeRenderer.getNodeCenter(frameKey, link.nodeA);
            var nodeBCenter = realityEditor.nodeRenderer.getNodeCenter(link.frameB, link.nodeB);
            var linkWidth = 10;

            var startColorCode = (typeof link.logicA === 'number') ? link.logicA  : 4; // white
            var endColorCode = (typeof link.logicB === 'number') ? link.logicB  : 4;

            var startOffset = realityEditor.nodeRenderer.getOffsetForPort(startColorCode);
            var endOffset = realityEditor.nodeRenderer.getOffsetForPort(endColorCode);

            drawLine(globalCanvas.context, [nodeACenter.x + startOffset.x, nodeACenter.y + startOffset.y], [nodeBCenter.x + endOffset.x, nodeBCenter.y + endOffset.y], linkWidth, linkWidth, link, timeCorrection, startColorCode, endColorCode);

        });

        if (storedIncompleteLink.startNodeKey) {

            var startOffset = realityEditor.nodeRenderer.getOffsetForPort(storedIncompleteLink.colors.start);
            var endOffset = realityEditor.nodeRenderer.getOffsetForPort(storedIncompleteLink.colors.end);

            drawIncompleteLink(storedIncompleteLink.startNodeKey, storedIncompleteLink.endX + endOffset.x, storedIncompleteLink.endY + endOffset.y, storedIncompleteLink.colors);
        }

        if (storedCutLine.startX && storedCutLine.endX) {
            drawDotLine(globalCanvas.context, [storedCutLine.startX, storedCutLine.startY], [storedCutLine.endX, storedCutLine.endY]);
        }

    }

    /**
     * Stores the state of the link currently being drawn, so that it can be rendered each frame
     * @param startNodeKey
     * @param endX
     * @param endY
     * @param {{start: number|boolean, end: number|boolean}} colors
     */
    function setIncompleteLink(startNodeKey, endX, endY, colors) {
        storedIncompleteLink.startNodeKey = startNodeKey;
        storedIncompleteLink.endX = endX;
        storedIncompleteLink.endY = endY;
        storedIncompleteLink.colors = colors;
    }

    /**
     * Clears the state of the link being drawn so that it disappears
     */
    function resetIncompleteLink() {
        storedIncompleteLink.startNodeKey = null;
        storedIncompleteLink.endX = null;
        storedIncompleteLink.endY = null;
    }

    /**
     * Draws an animated link from a starting node to a specified x,y location
     * @param {string} startNodeKey
     * @param {number} endX
     * @param {number} endY
     * @param {{start: number|boolean, end: number|boolean}} colors
     */
    function drawIncompleteLink(startNodeKey, endX, endY, colors) {
        var startKeys = realityEditor.utilities.getKeysFromKey(startNodeKey);
        // var nodeA = frames[startKeys.frameKey].nodes[startKeys.nodeKey];
        var nodeACenter = realityEditor.nodeRenderer.getNodeCenter(startKeys.frameKey, startKeys.nodeKey);
        var linkWidth = 10;
        var startColorCode = (typeof colors.start === 'number') ? colors.start : 4; // white
        var endColorCode = (typeof colors.end === 'number') ? colors.end : 4;

        drawLine(globalCanvas.context, [nodeACenter.x, nodeACenter.y], [endX, endY], linkWidth, linkWidth, incompleteLink, timeCorrection, startColorCode, endColorCode);
    }

    /**
     * Stores the state of the cutting line so that it can be rendered each frame
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     */
    function setCutLine(startX, startY, endX, endY) {
        storedCutLine.startX = startX;
        storedCutLine.startY = startY;
        storedCutLine.endX = endX;
        storedCutLine.endY = endY;
    }

    /**
     * Clears the state of the cutting line so that it disappears
     */
    function resetCutLine() {
        storedCutLine.startX = null;
        storedCutLine.startY = null;
        storedCutLine.endX = null;
        storedCutLine.endY = null;
    }

    /**
     * Draws a link object and animates it over time.
     * @param {CanvasRenderingContext2D} context - canvas rendering context
     * @param {[number, number]} lineStartPoint - the [x, y] coordinate of the start of a line
     * @param {[number, number]} lineEndPoint - the [x, y] coordinate of the end of a line
     * @param {number} lineStartWeight - width of a line at start (used to fake 3d depth)
     * @param {number} lineEndWeight - width of a line at end (used to fake 3d depth)
     * @param {Link} linkObject - the full link data object, including an added ballAnimationCount property
     * @param {number} timeCorrector - automatically regulates the animation speed according to the frameRate
     * @param {number} startColor - white for regular links, colored for logic links (0 = Blue, 1 = Green, 2 = Yellow, 3 = Red, 4 = White)
     * @param {number} endColor - same mapping as startColor
     * @param {number|undefined} speed - optionally adjusts how quickly the animation moves
     */
    function drawLine(context, lineStartPoint, lineEndPoint, lineStartWeight, lineEndWeight, linkObject, timeCorrector, startColor, endColor, speed) {
        if(!speed) speed = 0.5; // todo: revert to 1, but fix
        var angle = Math.atan2((lineStartPoint[1] - lineEndPoint[1]), (lineStartPoint[0] - lineEndPoint[0]));
        var positionDelta = 0;
        var length1 = lineEndPoint[0] - lineStartPoint[0];
        var length2 = lineEndPoint[1] - lineStartPoint[1];
        var lineVectorLength = Math.sqrt(length1 * length1 + length2 * length2);
        var keepColor = lineVectorLength / 6;
        var spacer = 2.3;
        var ratio = 0;
        var mathPI = 2*Math.PI;
        var newColor = [255,255,255,1.0];

        // TODO: temporary solution to render lock information for this link

        if (!!linkObject.lockPassword) {
            if (linkObject.lockType === "full") {
                newColor[3] = 0.25;
            } else if (linkObject.lockType === "half") {
                newColor[3] = 0.75;
            }
        }

        var colors = [[0,255,255], // Blue
            [0,255,0],   // Green
            [255,255,0], // Yellow
            [255,0,124], // Red
            [255,255,255]]; // White

        if (linkObject.ballAnimationCount >= lineStartWeight * spacer)  linkObject.ballAnimationCount = 0;

        context.beginPath();
        context.fillStyle = "rgba("+newColor+")";
        context.arc(lineStartPoint[0],lineStartPoint[1], lineStartWeight, 0, 2*Math.PI);
        context.fill();

        while (positionDelta + linkObject.ballAnimationCount < lineVectorLength) {
            var ballPosition = positionDelta + linkObject.ballAnimationCount;

            ratio = realityEditor.utilities.map(ballPosition, 0, lineVectorLength, 0, 1);
            for (var i = 0; i < 3; i++) {
                newColor[i] = (Math.floor(parseInt(colors[startColor][i], 10) + (colors[endColor][i] - colors[startColor][i]) * ratio));
            }

            var ballSize = realityEditor.utilities.map(ballPosition, 0, lineVectorLength, lineStartWeight, lineEndWeight);

            var x__ = lineStartPoint[0] - Math.cos(angle) * ballPosition;
            var y__ = lineStartPoint[1] - Math.sin(angle) * ballPosition;
            positionDelta += ballSize * spacer;
            context.beginPath();
            context.fillStyle = "rgba("+newColor+")";
            context.arc(x__, y__, ballSize, 0, mathPI);
            context.fill();
        }

        context.beginPath();
        context.fillStyle = "rgba("+newColor+")";
        context.arc(lineEndPoint[0],lineEndPoint[1], lineEndWeight, 0, 2*Math.PI);
        context.fill();

        linkObject.ballAnimationCount += (lineStartWeight * timeCorrector.delta)+speed;

        globalCanvas.hasContent = true;
    }

    /**
     * Draws the dotted line used to cut links, between the start and end coordinates.
     * @param {CanvasRenderingContext2D} context
     * @param {[number, number]} lineStartPoint
     * @param {[number, number]} lineEndPoint
     */
    function drawDotLine(context, lineStartPoint, lineEndPoint) {
        context.beginPath();
        context.moveTo(lineStartPoint[0], lineStartPoint[1]);
        context.lineTo(lineEndPoint[0], lineEndPoint[1]);
        context.setLineDash([11]);
        context.lineWidth = 4;
        context.strokeStyle = "#ff019f";
        context.stroke();
        context.closePath();
    }

    exports.initFeature = initFeature;
    exports.renderLinks = renderLinks;
    exports.setIncompleteLink = setIncompleteLink;
    exports.resetIncompleteLink = resetIncompleteLink;
    exports.setCutLine = setCutLine;
    exports.resetCutLine = resetCutLine;

})(realityEditor.linkRenderer);