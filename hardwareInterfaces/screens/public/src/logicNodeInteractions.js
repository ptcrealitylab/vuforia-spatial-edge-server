createNameSpace("realityEditor.logicNodeInteractions");

(function(exports) {

    var guiState;
    var pocketButtonPressed = false;
    var selectedNode = null;

    var touchDownLocation = {
        x: 0,
        y: 0
    };
    var touchMoveThreshold = 20;

    var craftingBoardShown = null;

    /**
     * Initializes the DOM and touch event listeners for the pocket
     */
    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
            if (guiState !== 'node') {
                selectedNode = null;
                hideCurrentCraftingBoard();
            }
        });

        realityEditor.touchEvents.registerCallback('onMouseDown', onMouseDown);
        realityEditor.touchEvents.registerCallback('onMouseMove', onMouseMove);
        realityEditor.touchEvents.registerCallback('onMouseUp', onMouseUp);
        realityEditor.touchEvents.registerCallback('beginTouchEditing', beginTouchEditing);

    }

    function onMouseDown(params) {
        if (guiState !== 'node') return;

        touchDownLocation.x = mouseX;
        touchDownLocation.y = mouseY;

        if (params.event && params.event.target) {

            if (params.event.target.id === 'pocketButton') {
                pocketButtonPressed = true;
            } else {
                var nodeKey = realityEditor.nodeRenderer.getNodeKeyFromTouchedElement(params.event.target);
                if (nodeKey) {
                    console.log('clicked down on node: ' + nodeKey);
                    selectedNode = nodeKey;
                }
            }

        //     var nodeKey = getNodeKeyFromTouchedElement(params.event.target);
        //     if (nodeKey) {
        //         console.log('clicked down on node: ' + nodeKey);
        //         selectedNode = nodeKey;
        //     } else {
        //         // console.log(params);
        //
        //         // if touched down on background, start drawing a cut line
        //         if (params.event.target.classList.contains('bg')) {
        //             cutLineStart = {
        //                 x: mouseX,
        //                 y: mouseY
        //             };
        //         }
        //
        //     }

        }

    }

    function onMouseMove(params) {
        if (guiState !== 'node') return;

        if (selectedNode) {
            var distanceMoved = Math.sqrt((mouseX - touchDownLocation.x) * (mouseX - touchDownLocation.x) + (mouseY - touchDownLocation.y) * (mouseY - touchDownLocation.y));
            console.log(distanceMoved);
            if (distanceMoved > touchMoveThreshold) {
                console.log('moved too far, dont count as tap');
                selectedNode = null;
            }
        }

        if (pocketButtonPressed) {
            if (params.event && params.event.target) {
                if (params.event.target.id !== 'pocketButton') {
                    console.log('dragged out of pocket');

                    if (getScreenFrames().length > 0) {
                        var frameKey = getScreenFrames()[0].uuid; // TODO: in the future, add to the closest frame you drop it onto... maybe even highlight them to show which one it'll get dropped on...
                        var addedNode = realityEditor.database.createLogicNode(frameKey);

                        var parentFrame = realityEditor.database.getFrame(frameKey);
                        addedNode.x = mouseX - parentFrame.screen.x - addedNode.width;
                        addedNode.y = mouseY - parentFrame.screen.y - addedNode.height;
                        //
                        //     x: event.clientX - (width/2),
                        //     y: event.clientY - (height/2),
                        //     scale: defaultScale
                        // };

                        ////////
                        // begin dragging it around immediately
                        // first need to add the iframe
                        // realityEditor.draw.addElement(frameID, null, frame);
                        realityEditor.draw.render();

                        document.getElementById("object" + addedNode.uuid).style.left = (event.clientX - addedNode.width/2) + 'px';
                        document.getElementById("object" + addedNode.uuid).style.top = (event.clientY - addedNode.height/2) + 'px';
                        // realityEditor.draw.drawTransformed(frameID, frame);
                        realityEditor.draw.render();

                        realityEditor.touchEvents.beginTouchEditing(getObjectId(), frameKey, addedNode.uuid);

                        // send it to the server
                        realityEditor.network.postNewLogicNode(getObjectId(), frameKey, addedNode.uuid, addedNode);

                        ////////

                    }

                    pocketButtonPressed = false;
                }
            }
        }

        // update grid xMargin for the open crafting board if there is one
        var editingVehicle = realityEditor.utilities.getEditingVehicle();
        if (craftingBoardShown && editingVehicle && editingVehicle.type === 'logic' && craftingBoardShown === editingVehicle.uuid) {
            var keys = realityEditor.utilities.getKeysFromKey(editingVehicle.uuid);
            positionCraftingBoardForNode(keys.frameKey, keys.nodeKey);
        }

    }

    function onMouseUp(params) {
        pocketButtonPressed = false;

        // console.log(selectedNode);

        if (selectedNode) {
            // var isNodeBeingMoved = realityEditor.nodeRenderer.getIsNodeMovementHighlighted(selectedNode);
            // if (!isNodeBeingMoved) {
                // cant just use !realityEditor.utilities.getEditingVehicle() because this happens after resetEditingState
            var keys = realityEditor.utilities.getKeysFromKey(selectedNode);
            var node = realityEditor.database.getNode(keys.frameKey, keys.nodeKey);
            if (node.type === 'logic') {

                var stopAfterHiding = (craftingBoardShown && craftingBoardShown === keys.nodeKey);
                hideCurrentCraftingBoard();
                if (stopAfterHiding) {
                    return;
                }

                console.log('open up crafting board for node', selectedNode);

                realityEditor.gui.crafting.craftingBoardVisible(keys.objectKey, keys.frameKey, keys.nodeKey);
                realityEditor.craftingBoardMenu.addButtons();
                realityEditor.craftingBoardMenu.setBackButtonCallback(hideCurrentCraftingBoard);

                positionCraftingBoardForNode(keys.frameKey, keys.nodeKey);

                setCraftingBoardShown(keys.nodeKey);

            } else {
                console.log('tapped on a regular node... dont open crafting');
            }
            // }
        }
        selectedNode = null;
    }

    function hideCurrentCraftingBoard() {
        if (craftingBoardShown) {
            console.log('hide current board');
            realityEditor.gui.crafting.craftingBoardHide();
            setCraftingBoardShown(null);
        }
    }

    function setCraftingBoardShown(newValue) {
        craftingBoardShown = newValue;

        // disable node port colors from popping up if the crafting board is open // TODO: only disable when touch down within crafting board, but still let you program the rest of the application with new links to logic nodes
        // TODO: maybe only enable highlighting if you are in the middle of drawing a link
        // var shouldEnableLogicNodeHighlighting = (newValue === null);
        // realityEditor.nodeRenderer.enableLogicNodeHighlighting(shouldEnableLogicNodeHighlighting);
    }

    function positionCraftingBoardForNode(frameKey, nodeKey) {
        var nodeCenter = realityEditor.nodeRenderer.getNodeCenter(frameKey, nodeKey);

        // position on top of logic node
        var gridUpperLeft = {
            x: nodeCenter.x + 100,
            y: nodeCenter.y - 60
        };

        if (gridUpperLeft.x > window.innerWidth - (CRAFTING_GRID_WIDTH + menuBarWidth)) {
            gridUpperLeft.x = nodeCenter.x - (CRAFTING_GRID_WIDTH + menuBarWidth) - 100;
        }

        globalStates.currentLogic.grid.xMargin += gridUpperLeft.x;
        globalStates.currentLogic.grid.yMargin += gridUpperLeft.y;
        document.getElementById('craftingBoard').style.left = gridUpperLeft.x + 'px';
        document.getElementById('craftingBoard').style.top = gridUpperLeft.y + 'px';
    }

    function beginTouchEditing() {
        selectedNode = null;
    }

    exports.initFeature = initFeature;

})(realityEditor.logicNodeInteractions);