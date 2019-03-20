createNameSpace("realityEditor.groupBehavior");

(function(exports) {

    var guiState;

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

        realityEditor.utilities.registerCallback('resetEditingState', resetGroupEditingState);
        realityEditor.trash.registerCallback('frameDeleted', onFrameDeleted);

    }

    /**
     * Remove the frame from its group when it gets deleted
     * @param {{objectKey: string, frameKey: string}} params
     */
    function onFrameDeleted(params) {
        resetGroupEditingState(params);
        if (params.objectKey && params.frameKey) {
            realityEditor.groupingByDrawing.removeFromGroup(params.frameKey, params.objectKey);
        }
    }

    /**
     * Any time a frame or node is moved, check if it's part of a group and move all grouped frames/nodes with it
     * @param {Frame|Node} activeVehicle
     * @param {number} pageX
     * @param {number} pageY
     */
    function moveGroupedVehiclesIfNeeded(activeVehicle, pageX, pageY) {
        forEachGroupedFrame(activeVehicle, function(frame) {
            moveGroupVehicleToScreenCoordinate(frame, pageX, pageY);
        }, true);
    }

    function resetGroupEditingState(params) {

        var activeVehicle = realityEditor.utilities.getEditingVehicle();
        if (!activeVehicle) { return; }

        console.log('resetEditingState', params, activeVehicle);

        // clear the groupTouchOffset of each frame in the group
        // and post the new positions of each frame in the group to the server
        forEachGroupedFrame(activeVehicle, function(frame) {
            frame.groupTouchOffset = undefined; // recalculate groupTouchOffset each time
        });
    }

    /**
     * Iterator over all frames in the same group as the activeVehicle
     * NOTE: Currently performs the callback for the activeVehicle too //TODO: give the option to exclude it?
     * @param {Frame} activeVehicle
     * @param {function} callback
     * @param {boolean} excludeActive - if true, doesn't trigger the callback for the activeVehicle, only for its co-members
     */
    function forEachGroupedFrame(activeVehicle, callback, excludeActive) {
        if (activeVehicle && activeVehicle.groupID) {
            var groupMembers = getGroupMembers(activeVehicle.groupID);
            groupMembers.forEach(function(member) {
                var frame = realityEditor.database.getFrame(member.frame);
                if (frame) {
                    if (excludeActive && member.frame === activeVehicle.uuid) { return; }
                    callback(frame);
                } else {
                    realityEditor.database.groupStruct[groupID].delete(member.frame); // group restruct
                }
            });
        }
    }

    /**
     * gets all members in a group with object and frame keys
     * @param {string} groupID
     * @returns {Array.<{object: <string>, frame: <string>}>}
     */
    function getGroupMembers(groupID) {
        if (!(groupID in realityEditor.database.groupStruct)) return;
        var members = [];
        for (var frameKey of realityEditor.database.groupStruct[groupID]) {
            var frame = realityEditor.database.getFrame(frameKey);
            var member = {object: frame.objectId, frame: frameKey};
            members.push(member);
        }
        return members;
    }

    /**
     * method to move transformed from to the (x,y) point on its plane
     * where the (screenX,screenY) ray cast intersects with offset being
     * locally calculated
     * based on realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate
     * @param {Frame} activeVehicle
     * @param {number} screenX
     * @param {number} screenY
     */
    function moveGroupVehicleToScreenCoordinate(activeVehicle, screenX, screenY) {

        // var results = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(activeVehicle, screenX, screenY, true);
        // var results = {
        //     point: {
        //         x: mouseX + (editingState.touchOffset.x),
        //         y: mouseY + (editingState.touchOffset.y)
        //     }
        // };

        // editingVehicle.screen.x = ;
        // editingVehicle.screen.y = ;

        // var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        // var newPosition = {
        //     x: results.point.x - results.offsetLeft,
        //     y: results.point.y - results.offsetTop
        // };

        var newPosition = {
            x: mouseX + (editingState.touchOffset.x),
            y: mouseY + (editingState.touchOffset.y)
        };

        var changeInPosition = {
            x: newPosition.x - activeVehicle.screen.x,
            y: newPosition.y - activeVehicle.screen.y
        };
        if (activeVehicle.groupTouchOffset === undefined) {
            activeVehicle.groupTouchOffset = changeInPosition;
        } else {
            activeVehicle.screen.x = newPosition.x - activeVehicle.groupTouchOffset.x;
            activeVehicle.screen.y = newPosition.y - activeVehicle.groupTouchOffset.y;
        }
    }

    exports.initFeature = initFeature;
    exports.moveGroupedVehiclesIfNeeded = moveGroupedVehiclesIfNeeded;

})(realityEditor.groupBehavior);
