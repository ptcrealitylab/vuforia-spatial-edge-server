createNameSpace("realityEditor.groupingByDrawing");

(function(exports) {

    var guiState;

    /**
     * Keeps track of where the line starts
     * @type {Array.<Array.<number>>}
     */
    var points = [];

    /**
     * Keeps track of the lasso polyline
     * @type {SVGPolylineElement|null}
     */
    var lasso = null;

    /**
     * @type {Boolean} Whether a tap has already occurred and is set to be a double tap
     */
    var isDoubleTap = false;

    /**
     * @type: {Object|null} First tap target
     */
    var tapTarget = null;

    /**
     * @typedef {Object} DoubleTapTimer
     * @type {DoubleTapTimer}
     */
    var doubleTapTimer = null;

    /**
     * @type {{active: Boolean, object: Array.<string>, frame: Array.<string>}}
     * object and frame currently not in use
     */
    var selectingState = {
        active: false,
        object: [],
        frame: []
    };

    /**
     * Initializes the DOM and touch event listeners for the trash
     */

    function initFeature() {

        // add DOM elements for group
        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

        realityEditor.touchEvents.registerCallback('onMouseDown', onMouseDown);
        realityEditor.touchEvents.registerCallback('onMouseMove', onMouseMove);
        realityEditor.touchEvents.registerCallback('onMouseUp', onMouseUp);

        realityEditor.network.registerCallback('newFrameAdded', onNewFrameAdded);
        realityEditor.network.registerCallback('framesForScreen', onFramesForScreen);
        realityEditor.pocket.registerCallback('newFrameAdded', onNewFrameAdded);
    }

    function onMouseDown(params) {
        if (guiState !== 'ui') return;

        if (params.event && params.event.target) {
            // if touched down on background, start drawing a cut line
            if (params.event.target.classList.contains('background')) {
                console.log('did tap on background in grouping mode');

                // handling double taps
                if (!isDoubleTap) { // on first tap
                    isDoubleTap = true;

                    // if no follow up tap within time reset
                    setTimeout(function() {
                        isDoubleTap = false;
                    }, 300);
                } else { // registered double tap and start drawing selection lasso
                    selectingState.active = true;
                    var svg = document.getElementById("groupSVG");
                    //TODO: start drawing
                    console.log('start lasso');
                    startLasso(mouseX, mouseY); // global object mouseX,mouseY always has the right info (simulated or not)
                }
            }
        }
    }

    function onMouseMove(params) {
        if (guiState !== 'ui') return;

        if (selectingState.active) {
            continueLasso(mouseX, mouseY);
        }

        // TODO: also move group objects too
        // // also move group objects too
        // if (activeVehicle.groupID !== null) {
        //     let groupMembers = realityEditor.gui.ar.grouping.getGroupMembers(activeVehicle.groupID);
        //     for (let member of groupMembers) {
        //         let frame = realityEditor.getFrame(member.object, member.frame);
        //         realityEditor.gui.ar.grouping.moveGroupVehicleToScreenCoordinate(frame, event.touches[0].pageX, event.touches[0].pageY);
        //     }
        // }

        // var activeVehicle = realityEditor.device.getEditingVehicle();
        // var isSingleTouch = params.event.touches.length === 1;
        //
        // if (activeVehicle && isSingleTouch) {
        //     // also move group objects too
        //     moveGroupedVehiclesIfNeeded(activeVehicle, params.event.pageX, params.event.pageY);
        // }

    }

    function onMouseUp(params) {
        console.log('grouping.js: onDocumentMultiTouchEnd', params);

        if (selectingState.active) {
            selectingState.active = false;
            closeLasso();

            var selected = getLassoed();
            selectFrames(selected);
            // TODO: get selected => select
        }

        var activeVehicle = realityEditor.utilities.getEditingVehicle();
        console.log('onDocumentMultiTouchEnd', params, activeVehicle);
    }

    function onFramesForScreen(params) {
        for (var frameKey in params.frames) {
            reconstructGroupStruct(frameKey, realityEditor.database.getFrame(frameKey));
        }
    }

    function onNewFrameAdded(params) {
        reconstructGroupStruct(params.frameKey, params.frame);
    }

    /**
     * Sets start point of selection lasso
     * @param {number} x
     * @param {number} y
     */
    function startLasso(x, y) {
        // start drawing; set first point; reset lasso
        points = [[x, y]];
        if (lasso === null) {
            lasso = document.getElementById("lasso");
        }

        lasso.setAttribute("points", x + ", "+y);
        lasso.setAttribute("stroke", "#0000ff");
        lasso.setAttribute("fill", "rgba(0,0,255,0.2)");

        globalCanvas.hasContent = true;
    }

    /**
     * Adds more points to the selection lasso
     * @param {number} x
     * @param {number} y
     */
    function continueLasso(x, y) {
        var lassoPoints = lasso.getAttribute("points");
        lassoPoints += " "+x+", "+y;
        lasso.setAttribute("points", lassoPoints);
        points.push([x, y]);
        var lassoed = getLassoed().length;
        if (lassoed > 0) {
            lasso.setAttribute("fill", "rgba(0,255,255,0.2)");
            lasso.setAttribute("stroke", "#00ffff");
        } else {
            lasso.setAttribute("fill", "rgba(0,0,255,0.2)");
            lasso.setAttribute("stroke", "#0000ff");
        }
    };

    /**
     * Auto-closes lasso to start point
     */
    function closeLasso() {
        function clearLasso() {
            lasso.setAttribute("points", "");
            lasso.classList.remove('groupLassoFadeOut');
        }

        var lassoPoints = lasso.getAttribute("points");
        var start = points[0];
        lassoPoints += " " + start[0]+", "+start[1];
        lasso.setAttribute("points", lassoPoints);

        lasso.classList.add('groupLassoFadeOut');

        setTimeout(clearLasso.bind(this), 300);
    }

    /**
     * @return {Array.<Object>.<string, string>} - [{object: objectKey, frame: frameKey}] for frames inside lasso
     */
    function getLassoed() {
        var lassoedFrames = []; // array of frames in lasso

        realityEditor.database.forEachFrame(function(frameKey, frame) {
            if (frame && frame.visualization === 'screen') {
                // check if frame in lasso
                // FIXME: insidePoly doesn't work for crossed over shapes (such as an infinite symbol)
                var frameCenter = realityEditor.frameRenderer.getFrameCenter(frameKey);
                var inLasso = realityEditor.utilities.insidePoly([frameCenter.x, frameCenter.y], points);
                if (inLasso) {
                    lassoedFrames.push({object: frame.objectId, frame: frameKey});
                }
            }
        });

        return lassoedFrames;
    }

    /**
     * Takes in selected objects and creates groups from them
     * updates groupStruct as well as server
     * @param {Array.<Object>.<string, string>} selected - [{object: <string>, frame: <string>}]
     */
    function selectFrames(selected) {
        console.log("--select frames--");
        console.log(selected.length);

        if (selected.length === 0) return;

        // if selected 1, remove from all groups
        if (selected.length === 1) {
            var frameKey = selected[0].frame;
            var objectKey = selected[0].object;

            removeFromGroup(frameKey, objectKey);
        }

        // if selected >1, make those into a new group
        else {
            // see which groups we've selected from
            var groups = {}; // {groupID.<string>: <set>.<string>}
            // let frameToObj = {}; // lookup for {frameKey: objectKey}
            selected.forEach(function(member) {
                var group = realityEditor.database.getFrame(member.frame).groupID;
                if (group) {
                    if (group in groups) groups[group].add(member.frame);
                    else groups[group] = new Set([member.frame]);
                }

            });

            var groupIDs = Object.keys(groups);
            // if you've selected all of one group and only that group ...
            if (groupIDs.length === 1 && groups[groupIDs[0]].size === realityEditor.database.groupStruct[groupIDs[0]].size) {
                // then remove all from group
                selected.forEach(function(member) {
                    removeFromGroup(member.frame, member.object);
                });
            }
            // otherwise we'll make a new group ...
            else {
                createNewGroup(selected);
            }
        }

        // drawGroupHulls();
    }

    /**
     * checks if frame is in group, and if so, removes from any group
     * also deals with groups of size 1 and clears them
     * @param {string} frameKey
     * @param {string} objectKey
     */
    function removeFromGroup(frameKey, objectKey) {
        var frame = realityEditor.database.getFrame(frameKey);
        var groupID = frame.groupID;

        if (frame === undefined || groupID === undefined) return;
        if (!!groupID) {
            console.log('removing ' + frameKey + 'from any group');
            realityEditor.database.groupStruct[groupID].delete(frameKey); // group restruct
            frame.groupID = null;

            // ungroup group if left with 1 remaining
            if (realityEditor.database.groupStruct[groupID].size === 1) {
                var group = Array.from(realityEditor.database.groupStruct[groupID]);
                frames[group[0]].groupID = null;
                realityEditor.database.groupStruct[groupID].clear();
                console.log('cleared group ' + groupID);
            }

            // TODO: send to server
            realityEditor.network.updateGroupings(objectKey, frameKey, null);

        }
    }

    /**
     * adds single frame to group and posts to server
     * @param {string} frameKey
     * @param {string} objectKey
     * @param {string} newGroup
     */
    function addToGroup(frameKey, objectKey, newGroup) {
        console.log('adding to group ' + newGroup);
        var frame = realityEditor.database.getFrame(frameKey);
        var group = frame.groupID;

        if (group !== null) {
            removeFromGroup(frameKey, objectKey);
        }

        frame.groupID = newGroup;
        if (newGroup in realityEditor.database.groupStruct) {
            realityEditor.database.groupStruct[newGroup].add(frameKey);
        }
        else {
            realityEditor.database.groupStruct[newGroup] = new Set([frameKey]);
        }
        // TODO: send to server
        realityEditor.network.updateGroupings(objectKey, frameKey, newGroup);
    }

    /**
     * creates a new group from selected
     * @param {Array.<Object>.<string, string>} selected
     */
    function createNewGroup(selected) {
        // create new groupID
        var newGroup = "group" + realityEditor.device.utilities.uuidTime();
        realityEditor.database.groupStruct[newGroup] = new Set();

        // add each selected to group
        selected.forEach(function(member) {
            var frame = realityEditor.database.getFrame(member.frame);
            addToGroup(member.frame, member.object, newGroup);
            frame.groupID = newGroup;
            realityEditor.database.groupStruct[newGroup].add(member.frame);
            console.log('frame ' + member.frame + ' was added to new group');
        });

        console.log('grouped in ' + newGroup);
    }

    /**
     * Should be called whenever a new frame is loaded into the system,
     * to populate the global groupStruct with any groupID information it contains
     * @param {string} frameKey
     * @param {Frame} thisFrame
     * @todo move to database module because doesn't have to do with drawing a new group
     */
    function reconstructGroupStruct(frameKey, thisFrame) {
        // reconstructing groups from frame groupIDs
        var group = thisFrame.groupID;
        if (group === undefined) {
            thisFrame.groupID = null;
        }
        else if (group !== null) {
            if (group in realityEditor.database.groupStruct) {
                realityEditor.database.groupStruct[group].add(frameKey);
            }
            else {
                realityEditor.database.groupStruct[group] = new Set([frameKey]);
            }
        }
    }

    exports.initFeature = initFeature;

})(realityEditor.groupingByDrawing);