createNameSpace("realityEditor.linkRenderer");

(function(exports) {

    var linkCanvas;
    var linkCanvasContext;
    var guiState;
    var timeCorrection = {delta: 0, now: 0, then: 0};

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
        guiState = realityEditor.modeToggle.getGuiState();
        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });
    }

    function renderLinks() {
        if (guiState !== 'node') return;

        realityEditor.utilities.timeSynchronizer(timeCorrection);

        // erases anything on the background canvas
        if (globalCanvas.hasContent === true) {
            globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
            globalCanvas.hasContent = false;
        }

        console.log('render links');

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
            var linkColorCode = 4; // white

            drawLine(globalCanvas.context, [nodeACenter.x, nodeACenter.y], [nodeBCenter.x, nodeBCenter.y], linkWidth, linkWidth, link, timeCorrection,linkColorCode,linkColorCode);

        });

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
        if(!speed) speed = 1;
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
     * Renders all links who start from a node on the given frame, drawn onto the provided HTML canvas context reference.
     * @param {Frame} thisFrame
     * @param {CanvasRenderingContext2D} context
     */
    function drawAllLines(thisFrame, context) {

        // if (globalStates.editingMode || (realityEditor.device.editingState.node && realityEditor.device.currentScreenTouches.length > 1)) {
        //     return;
        // }

        if(!thisFrame) return;
        for (var linkKey in thisFrame.links) {
            if (!thisFrame.links.hasOwnProperty(linkKey)) continue;

            var link = thisFrame.links[linkKey];
            var frameA = thisFrame;
            var frameB = realityEditor.getFrame(link.objectB, link.frameB);
            var objectA = realityEditor.getObject(link.objectA);
            var objectB = realityEditor.getObject(link.objectB);
            var nodeASize = 0;
            var nodeBSize = 0;

            if (isNaN(link.ballAnimationCount)) {
                link.ballAnimationCount = 0;
            }

            if (!frameA || !frameB) {
                continue; // should not be undefined
            }

            var nodeA = frameA.nodes[link.nodeA];
            var nodeB = frameB.nodes[link.nodeB];

            if (!nodeA || !nodeB) {
                continue; // should not be undefined
            }

            // Don't draw off-screen lines
            if (!frameB.objectVisible && !frameA.objectVisible) {
                continue;
            }

            if (!frameB.objectVisible) {
                if (objectB.memory && Object.keys(objectB.memory).length > 0) {
                    var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectB); // TODO: frameId or objectId?
                    if (!memoryPointer) {
                        memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, false);
                    }

                    nodeB.screenX = memoryPointer.x;
                    nodeB.screenY = memoryPointer.y;
                    nodeB.screenZ = nodeA.screenZ;

                    if (memoryPointer.memory.imageLoaded && memoryPointer.memory.image.naturalWidth === 0 && memoryPointer.memory.image.naturalHeight === 0) {
                        nodeB.screenX = nodeA.screenX;
                        nodeB.screenY = -10;
                        delete objectB.memory;
                    } else {
                        memoryPointer.draw();
                    }
                } else {
                    nodeB.screenX = nodeA.screenX;
                    nodeB.screenY = -10;
                    nodeB.screenZ = nodeA.screenZ;
                }
                nodeB.screenZ = nodeA.screenZ;
                nodeB.screenLinearZ = nodeA.screenLinearZ;
                nodeBSize = objectA.averageScale;
            }

            if (!frameA.objectVisible) {
                if (objectA.memory && Object.keys(objectA.memory).length > 0) {
                    var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectA);
                    if (!memoryPointer) {
                        memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, true);
                    }

                    nodeA.screenX = memoryPointer.x;
                    nodeA.screenY = memoryPointer.y;

                    if (memoryPointer.memory.imageLoaded && memoryPointer.memory.image.naturalWidth === 0 && memoryPointer.memory.image.naturalHeight === 0) {
                        nodeA.screenX = nodeB.screenX;
                        nodeB.screenY = -10;
                        delete objectA.memory;
                    } else {
                        memoryPointer.draw();
                    }
                } else {
                    nodeA.screenX = nodeB.screenX;
                    nodeA.screenY = -10;
                    nodeA.screenZ = nodeB.screenZ;
                }
                nodeA.screenZ = nodeB.screenZ;
                nodeA.screenLinearZ = nodeB.screenLinearZ;
                nodeASize = objectB.averageScale
            }
            if(!nodeASize) nodeASize = objectA.averageScale;
            if(!nodeBSize) nodeBSize = objectB.averageScale;

            // linearize a non linear zBuffer (see index.js)
            var nodeAScreenZ =   nodeA.screenLinearZ*(nodeASize*1.5);
            var nodeBScreenZ = nodeB.screenLinearZ*(nodeBSize*1.5);

            var logicA;
            if (link.logicA == null || link.logicA === false) {
                logicA = 4;
            } else {
                logicA = link.logicA;
            }

            var logicB;
            if (link.logicB == null || link.logicB === false) {
                logicB = 4;
            } else {
                logicB = link.logicB;
            }

            this.drawLine(context, [nodeA.screenX, nodeA.screenY], [nodeB.screenX, nodeB.screenY], nodeAScreenZ, nodeBScreenZ, link, timeCorrection,logicA,logicB);
        }
        // context.fill();

        globalCanvas.hasContent = true;
    }

    exports.initFeature = initFeature;
    exports.renderLinks = renderLinks;

})(realityEditor.linkRenderer);