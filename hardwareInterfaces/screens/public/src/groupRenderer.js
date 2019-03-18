createNameSpace("realityEditor.groupRenderer");

(function(exports) {

    var guiState;

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;

            if (newGuiState !== 'ui') {
                var svg = document.getElementById("groupSVG");
                clearHulls(svg);
            }
        });

    }

    function renderGroups() {
        if (guiState !== 'ui') { return; }

        drawGroupHulls()
    }

    /**
     * Completely erases the SVG containing the hulls
     * @param {SVGElement} svg
     */
    function clearHulls(svg) {
        while (svg.lastChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    /**
     * iterates through all groups and creates the hulls
     */
    function drawGroupHulls() {
        var svg = document.getElementById("groupSVG");

        clearHulls(svg);

        Object.keys(realityEditor.database.groupStruct).forEach(function(groupID) {
            if (realityEditor.database.groupStruct[groupID].size > 1) {
                drawHull(svg, realityEditor.database.groupStruct[groupID], groupID);
            }
        });

        function drawHull(svg, group, groupID) {
            var hullPoints = [];

            // get the corners of frames
            for (var frameKey of group) { // iterate over the Set
                // var objectKey = frameToObj[frameKey];
                // if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) continue; // only draw hulls for frames on visible objects
                var frame = realityEditor.database.getFrame(frameKey);

                // make sure there is an object and frame
                if (!frame || frame.visualization !== 'screen') continue;

                var x = realityEditor.frameRenderer.getFrameCenter(frameKey).x;
                var y = realityEditor.frameRenderer.getFrameCenter(frameKey).y;

                // var bb = getFrameBoundingRectScreenCoordinates(frameKey, 10);
                var bb = getFrameCornersScreenCoordinates(frameKey, 50);

                // points.push([x, y]); // pushing center point
                // pushing corner points
                if (bb) {
                    Object.keys(bb).forEach(function(corner) {
                        hullPoints.push([bb[corner].x, bb[corner].y]);
                    });
                }
            }

            if (hullPoints.length === 0) {
                return; // if all members are in screen visualization there won't be any hull points to render in AR
            }

            // create hull points
            var hullShape = hull(hullPoints, Infinity);
            var hullString = '';
            hullShape.forEach(function(pt) {
                hullString += ' ' + pt[0] + ', ' + pt[1];
            });
            hullString += ' ' + hullShape[0][0] + ', ' + hullShape[0][1];

            // draw hull
            var hullSVG = document.createElementNS(svg.namespaceURI, 'polyline');
            if (hullString.indexOf("undefined") === -1) {
                hullSVG.setAttribute("points", hullString);
                hullSVG.setAttribute("fill", "None");
                hullSVG.setAttribute("stroke", "#FFF");
                hullSVG.setAttribute("stroke-width", "5");
                hullSVG.classList.add("hull");
                hullSVG.id = groupID;
                svg.appendChild(hullSVG);
            }
        }
    }

    /**
     * Accurately calculates the screen coordinates of the corners of a frame element
     * @param {string} objectKey
     * @param {string} frameKey
     * @param {number|undefined} buffer
     * @return {{upperLeft: upperLeft|{x, y}|*, upperRight: upperRight|{x, y}|*, lowerLeft: lowerLeft|{x, y}|*, lowerRight: lowerRight|{x, y}|*}}
     */
    function getFrameCornersScreenCoordinates(frameKey, buffer) {
        if (typeof buffer === 'undefined') buffer = 0;

        var element = document.getElementById('object' + frameKey);
        if (element) {
            var screenRect = element.getClientRects()[0];
            return {
                upperLeft: {
                    x: screenRect.left - buffer,
                    y: screenRect.top - buffer
                },
                upperRight: {
                    x: screenRect.right + buffer,
                    y: screenRect.top - buffer
                },
                lowerLeft: {
                    x: screenRect.left - buffer,
                    y: screenRect.bottom + buffer
                },
                lowerRight: {
                    x: screenRect.right + buffer,
                    y: screenRect.bottom + buffer
                }
            };
        }
    }

    exports.initFeature = initFeature;
    exports.renderGroups = renderGroups;

})(realityEditor.groupRenderer);