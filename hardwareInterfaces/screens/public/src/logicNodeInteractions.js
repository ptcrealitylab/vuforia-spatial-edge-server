createNameSpace("realityEditor.logicNodeInteractions");

(function(exports) {

    var guiState;
    var pocketButtonPressed = false;

    // which (if any) node was clicked down on
    var selectedNode = null;
    // which (if any) crafting board is visible (set to its logic node's uuid)
    var craftingBoardShown = null;

    var touchDownLocation = {
        x: 0,
        y: 0
    };
    var touchMoveThreshold = 20;

    // constant. if enabled, clicking anywhere outside crafting board will hide it.
    // otherwise need to click on back button or the logic node to hide it.
    var HIDE_CRAFTING_IF_CLICK_OUTSIDE = true;

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

    /**
     * Utility function searches the parent elements to see if it is within the craftingBoard
     * @param element
     * @return {boolean}
     */
    function doesElementBelongToCraftingBoard(element) {
        while(element && element.tagName !== "BODY" && element.tagName !== "HTML"){
            if (element.id === 'craftingBoard') {
                return true;
            }
            element = element.parentElement;
        }
        return false;
    }

    /**
     * Keeps track if you you touch down on the pocket button, so that you can later create a logic node onMouseMove.
     * Also, if  HIDE_CRAFTING_IF_CLICK_OUTSIDE is enabled, and you click outside of the logic node or its crafting board, hides the open crafting board.
     * @param params
     */
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

            if (selectedNode === craftingBoardShown) {
                console.log('interacting with open crafting board node... dont hide board yet');
            } else {
                if (HIDE_CRAFTING_IF_CLICK_OUTSIDE) {
                    if (craftingBoardShown && !doesElementBelongToCraftingBoard(params.event.target)) {
                        hideCurrentCraftingBoard();
                    }
                }
            }

        }

    }

    /**
     * Creates a new logic node if dragging out from the pocket button.
     * Also, if you drag more than threshold distance from a logic node, prevents it counting as a click in onMouseUp.
     * @param params
     */
    function onMouseMove(params) {
        if (guiState !== 'node') return;

        if (selectedNode) {
            var distanceMoved = Math.sqrt((mouseX - touchDownLocation.x) * (mouseX - touchDownLocation.x) + (mouseY - touchDownLocation.y) * (mouseY - touchDownLocation.y));
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
                        //
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

    /**
     * If clicked on a logic node, opens its crafting board (or hides it if already open)
     * @param params
     */
    function onMouseUp(params) {
        pocketButtonPressed = false;

        if (selectedNode) {
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

        }

        selectedNode = null;
    }

    /**
     * Utility function to safely hide the open crafting board and reset relevant state
     */
    function hideCurrentCraftingBoard() {
        if (craftingBoardShown) {
            realityEditor.gui.crafting.craftingBoardHide();
            setCraftingBoardShown(null);
        }
    }

    /**
     * Utility function for toggling whether and which crafting board is shown
     * @param {string|null} newValue - the uuid of the logic node whose crafting board you want to show (set to null if want to hide)
     */
    function setCraftingBoardShown(newValue) {
        craftingBoardShown = newValue;
    }

    /**
     * Moves the crafting board so its top left corner is located to the right of its logic node.
     * If too close to right edge of screen, moves so its top right corner is to the left of the logic node instead.
     * @param {string} frameKey
     * @param {string} nodeKey
     */
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

    /**
     * Callback triggered from touchEvents.beginTouchEditing
     * When you start dragging a logic node around, reset state so you don't show its crafting board onMouseUp
     */
    function beginTouchEditing() {
        selectedNode = null;
    }

    exports.initFeature = initFeature;

})(realityEditor.logicNodeInteractions);