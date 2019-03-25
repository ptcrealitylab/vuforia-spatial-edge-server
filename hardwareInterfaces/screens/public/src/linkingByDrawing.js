createNameSpace("realityEditor.linkingByDrawing");

(function(exports) {

    var guiState;
    var selectedNode = null;
    var cutLineStart = null;
    // var startNodeColor = null;
    // var endNodeColor = null;

    /**
     * @type {{start: number|boolean, end: number|boolean}}
     */
    var linkColors = {
        start: false,
        end: false
    };

    /**
     * Initializes the DOM and touch event listeners for the trash
     */

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

        realityEditor.touchEvents.registerCallback('onMouseDown', onMouseDown);
        realityEditor.touchEvents.registerCallback('onMouseMove', onMouseMove);
        realityEditor.touchEvents.registerCallback('onMouseUp', onMouseUp);
        realityEditor.touchEvents.registerCallback('beginTouchEditing', beginTouchEditing);
    }

    function onMouseDown(params) {
        if (guiState !== 'node') return;

        if (params.event && params.event.target) {
            var nodeKey = realityEditor.nodeRenderer.getNodeKeyFromTouchedElement(params.event.target);
            if (nodeKey) {
                console.log('clicked down on node: ' + nodeKey);
                selectedNode = nodeKey;
                linkColors = {
                    start: false,
                    end: false
                };
                realityEditor.nodeRenderer.enableLogicNodeHighlighting(true);
            } else {
                // console.log(params);

                // if touched down on background, start drawing a cut line
                if (params.event.target.classList.contains('background')) {
                    cutLineStart = {
                        x: mouseX,
                        y: mouseY
                    };
                }

            }
        }
    }

    function onMouseMove(params) {
        if (guiState !== 'node') return;

        if (selectedNode) {

            var linkEndX = mouseX;
            var linkEndY = mouseY;

            // snap link to overlapping node if we mouse over a valid destination
            // also set the colors ?
            var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
            var doesLinkAlreadyExist = false; // TODO: implement in reusable way, same as onMouseUp and/or database.createLink calculations
            if (clickedElement /*&& clickedElement.dataset.nodeKey !== selectedNode*/ && !doesLinkAlreadyExist) {
                var endNodeCenter = realityEditor.nodeRenderer.getNodeCenter(clickedElement.dataset.frameKey, clickedElement.dataset.nodeKey);
                linkEndX = endNodeCenter.x;
                linkEndY = endNodeCenter.y;

                // console.log('set rendering for node: ' + clickedElement.dataset.nodeKey);

                var destinationNode = realityEditor.database.getNode(clickedElement.dataset.frameKey, clickedElement.dataset.nodeKey);

                // if you mouse over a logic node, set color of link to color of port you go over
                if (destinationNode.type === 'logic') {

                    var colorCode = realityEditor.nodeRenderer.getSelectedPort(clickedElement.dataset.frameKey, clickedElement.dataset.nodeKey, mouseX, mouseY);
                    console.log('get color for logic: ' + colorCode);

                    if (clickedElement.dataset.nodeKey === selectedNode) {
                        linkColors.start = colorCode;
                    } else {
                        linkColors.end = colorCode;
                    }

                } else {

                    // if you mouse over a non-logic node, set color of link to white
                    if (clickedElement.dataset.nodeKey === selectedNode) {
                        linkColors.start = false;
                    } else {
                        linkColors.end = false;
                    }
                }

            }

            realityEditor.linkRenderer.setIncompleteLink(selectedNode, linkEndX, linkEndY, linkColors);
        }

        if (cutLineStart) {
            realityEditor.linkRenderer.setCutLine(cutLineStart.x, cutLineStart.y, mouseX, mouseY);
        }

    }

    function onMouseUp(params) {
        // if (guiState !== 'node') return; // let this happen anyways, to ensure reset/cleanup happens regardless

        // console.log(params);

        var newNodeKey = null;

        var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
        if (clickedElement) {
            newNodeKey = clickedElement.dataset.nodeKey;
        }

        var doesLinkAlreadyExist = false; // TODO: implement

        if (selectedNode) {
            if (newNodeKey && newNodeKey !== selectedNode && !doesLinkAlreadyExist) {
                createLink(selectedNode, newNodeKey);
            } else {
                stopCreatingLink();
            }
        }

        if (cutLineStart) {
            console.log('cut links intersecting the cut line');
            deleteIntersectingLinks(cutLineStart.x, cutLineStart.y, mouseX, mouseY);
            resetCutLine();
        }
    }

    function createLink(startNodeKey, endNodeKey) {
        console.log('create new link from ' + startNodeKey + ' to ' + endNodeKey);
        realityEditor.database.createLink(startNodeKey, endNodeKey, linkColors.start, linkColors.end);
        stopCreatingLink();
    }

    function beginTouchEditing(params) {
        if (params.nodeKey === selectedNode) {
            stopCreatingLink();
        }
    }

    function stopCreatingLink() {
        selectedNode = null;
        startNodeColor = null;
        endNodeColor = null;
        realityEditor.linkRenderer.resetIncompleteLink();
        realityEditor.nodeRenderer.enableLogicNodeHighlighting(false);
    }

    function resetCutLine() {
        cutLineStart = null;
        realityEditor.linkRenderer.resetCutLine();
    }

    function deleteIntersectingLinks(cutStartX, cutStartY, cutEndX, cutEndY) {
        realityEditor.database.forEachLinkInAllFrames(function(frameKey, linkKey, link) {

            var startNode = realityEditor.database.getNode(link.frameA, link.nodeA);
            var endNode = realityEditor.database.getNode(link.frameB, link.nodeB);

            if (!startNode || !endNode) { return; } // TODO: make this work even if one of the nodes is on another object, using memory pointers etc

            var startNodeCenter = realityEditor.nodeRenderer.getNodeCenter(link.frameA, link.nodeA);
            var endNodeCenter = realityEditor.nodeRenderer.getNodeCenter(link.frameB, link.nodeB);

            if (realityEditor.utilities.checkLineCross(cutStartX, cutStartY, cutEndX, cutEndY, startNodeCenter.x, startNodeCenter.y, endNodeCenter.x, endNodeCenter.y, globalCanvas.width, globalCanvas.height)) {
                console.log('cut link ' + linkKey);
                // var startFrame = realityEditor.database.getFrame(frameKey);
                realityEditor.database.deleteLink(frameKey, linkKey);
            }

        });

        // if (realityEditor.utilities.checkLineCross(start.screenX, start.screenY, end.screenX, end.screenY, cutLine.start.x, cutLine.start.y, cutLine.end.x, cutLine.end.y)) {
        //
        // }
    }

    exports.initFeature = initFeature;

})(realityEditor.linkingByDrawing);