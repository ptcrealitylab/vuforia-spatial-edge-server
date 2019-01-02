createNameSpace("realityEditor.trash");

(function(exports) {

    var guiState;
    var selectedNode = null;
    var cutLineStart = null;

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
            } else {
                // console.log(params);

                // if touched down on background, start drawing a cut line
                if (params.event.target.classList.contains('bg')) {
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
            realityEditor.linkRenderer.setIncompleteLink(selectedNode, mouseX, mouseY);

            // // console.log(params);
            // var clickedElement = realityEditor.utilities.getClickedDraggableElement(mouseX, mouseY);
            // if (clickedElement) {
            //     var newNodeKey = clickedElement.dataset.nodeKey;
            //     if (newNodeKey !== selectedNode) {
            //         console.log('dragged onto a new node');
            //     }
            // } else {
            //     // start drawing link
            //     console.log('draw link in progress');
            //     // realityEditor.linkRenderer.drawIncompleteLink(selectedNode, mouseX, mouseY);
            // }

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
        realityEditor.database.createLink(startNodeKey, endNodeKey);
        stopCreatingLink();
    }

    function beginTouchEditing(params) {
        if (params.nodeKey === selectedNode) {
            stopCreatingLink();
        }
    }

    function stopCreatingLink() {
        selectedNode = null;
        realityEditor.linkRenderer.resetIncompleteLink();
    }

    function resetCutLine() {
        cutLineStart = null;
        realityEditor.linkRenderer.resetCutLine();
    }

    function deleteIntersectingLinks(cutStartX, cutStartY, cutEndX, cutEndY) {
        realityEditor.database.forEachLinkInAllFrames(function(frameKey, linkKey, link) {

            var startNode = realityEditor.database.getNode(frameKey, link.nodeA);
            var endNode = realityEditor.database.getNode(frameKey, link.nodeB);

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