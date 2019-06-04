createNameSpace("realityEditor.nodeRenderer");

(function(exports) {

    var guiState;
    var isMouseDown = false;
    var LOGIC_COLOR_PICKER_THRESHOLD = 200;
    var isLogicNodeHighlightingEnabled = true;
    var hiddenNodeTypes = ['storeData', 'invisible'];

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

        realityEditor.touchEvents.registerCallback('onMouseDown', onMouseDown);
        realityEditor.touchEvents.registerCallback('onMouseMove', onMouseMove);
        realityEditor.touchEvents.registerCallback('onMouseUp', onMouseUp);
        realityEditor.touchEvents.registerCallback('beginTouchEditing', beginTouchEditing);

    }

    function onMouseDown() {
        isMouseDown = true;
    }

    function onMouseUp() {
        isMouseDown = false;

        // for each node, compute if it needs to change colors / visuals
        // calculate distance to each logic node
        realityEditor.database.forEachNodeInAllFrames(function(frameKey, nodeKey, node) {
            if (node.type === 'logic') {
                hideLogicNodePorts(nodeKey);
            }
        });
    }

    function onMouseMove() {
        if (isMouseDown) {

            // for each node, compute if it needs to change colors / visuals
            // calculate distance to each logic node
            realityEditor.database.forEachNodeInAllFrames(function(frameKey, nodeKey, node) {
                if (node.type === 'logic') {
                    var nodeCenter = getNodeCenter(frameKey, nodeKey);
                    var distanceToMouse = realityEditor.utilities.distance(nodeCenter.x, nodeCenter.y, mouseX, mouseY);
                    if (distanceToMouse < LOGIC_COLOR_PICKER_THRESHOLD) {
                        showLogicNodePorts(nodeKey);
                    } else {
                        hideLogicNodePorts(nodeKey);
                    }
                }
            });

        }
    }

    // hide the logic node color ports when we start moving the node
    function beginTouchEditing() {
        onMouseUp();
    }

    function renderNodes() {
        realityEditor.database.forEachNodeInAllFrames(function(frameKey, nodeKey, node) {
            // nodes of certain types are invisible and don't need to be rendered (e.g. storeData nodes)
            if (hiddenNodeTypes.indexOf(node.type) > -1) { return; }

            addElement(frameKey, nodeKey, node);
            drawTransformed(frameKey, nodeKey, node);
        });
    }

    function addElement(frameKey, nodeKey, node) {
        realityEditor.draw.addElement(frameKey, nodeKey, node);

        var logicDomExists = !!document.getElementById('logic' + nodeKey);
        if (!logicDomExists) {
            if (node.type === "logic") {
                // add the 4-quadrant animated SVG overlay for the logic nodes
                var addLogic = createLogicElement(node, nodeKey);
                var addOverlay = document.getElementById('object' + nodeKey);
                addOverlay.appendChild(addLogic);
            }
        }


    }

    /**
     * Creates the DOM element for a Logic Node
     * @param {Frame|Node} activeVehicle
     * @param {string} activeKey
     * @return {HTMLDivElement}
     */
    function createLogicElement(activeVehicle, activeKey) {
        var size = 200;
        var addLogic = document.createElement('div');
        addLogic.id = "logic" + activeKey;
        addLogic.className = "mainEditing";
        addLogic.style.width = size + "px";
        addLogic.style.height = size + "px";
        addLogic.style.position = 'absolute';
        addLogic.style.left = 0; //((activeVehicle.frameSizeX - size) / 2) + "px";
        addLogic.style.top = 0; //((activeVehicle.frameSizeY - size) / 2) + "px";
        addLogic.style.visibility = "hidden";

        var svgContainer = document.createElementNS('http://www.w3.org/2000/svg', "svg");
        svgContainer.setAttributeNS(null, "viewBox", "0 0 100 100");

        var svgElement = [];
        svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
        svgElement[0].setAttributeNS(null, "fill", "#00ffff");
        svgElement[0].setAttributeNS(null, "d", "M50,0V50H0V30A30,30,0,0,1,30,0Z");
        svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
        svgElement[1].setAttributeNS(null, "fill", "#00ff00");
        svgElement[1].setAttributeNS(null, "d", "M100,30V50H50V0H70A30,30,0,0,1,100,30Z");
        svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
        svgElement[2].setAttributeNS(null, "fill", "#ffff00");
        svgElement[2].setAttributeNS(null, "d", "M100,50V70a30,30,0,0,1-30,30H50V50Z");
        svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
        svgElement[3].setAttributeNS(null, "fill", "#ff007c");
        svgElement[3].setAttributeNS(null, "d", "M50,50v50H30A30,30,0,0,1,0,70V50Z");

        for (var i = 0; i < svgElement.length; i++) {
            svgContainer.appendChild(svgElement[i]);
            svgElement[i].number = i;
            // svgElement[i].style.zIndex = 10;
            svgElement[i].addEventListener('pointerenter', function () {
                console.log('port ' + this.number + 'entered');
                // globalProgram.logicSelector = this.number;
                //
                // if (globalProgram.nodeA === activeKey)
                //     globalProgram.logicA = this.number;
                // else
                //     globalProgram.logicB = this.number;
                //
                // console.log(globalProgram.logicSelector);
            });
            addLogic.appendChild(svgContainer);
        }

        return addLogic;
    }

    function drawTransformed(frameKey, nodeKey, node) {
        var nodeContainerDom = document.querySelector('#object'+nodeKey);

        if (guiState === 'node') {
            nodeContainerDom.classList.remove('hiddenNode');
        } else {
            nodeContainerDom.classList.add('hiddenNode');
        }

        var parentFrame = frames[frameKey];

        if (parentFrame.visualization === 'screen') {
            var svg = nodeContainerDom.querySelector('#svg' + nodeKey);
            if (svg.childElementCount === 0) {
                var iFrame = nodeContainerDom.querySelector('#iframe' + nodeKey);
                console.log('retroactively creating the svg overlay');
                svg.style.width = iFrame.style.width;
                svg.style.height = iFrame.style.height;
                realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
            }

            if (editingState.nodeKey === nodeKey) {
                svg.style.visibility = 'visible';
            } else {
                svg.style.visibility = 'hidden';
            }

            nodeContainerDom.classList.remove('arFrame');
            nodeContainerDom.classList.add('screenFrame');

            var parentFrameCenter = realityEditor.frameRenderer.getFrameCenter(frameKey);

            var nodeScaleRatio = scaleRatio/2;

            nodeContainerDom.style.left = (parentFrameCenter.x + node.x - (node.width * node.scale * nodeScaleRatio)/2) + 'px';
            nodeContainerDom.style.top = (parentFrameCenter.y + node.y - (node.height * node.scale * nodeScaleRatio)/2) + 'px';

            nodeContainerDom.style.transform = 'scale(' + node.scale * nodeScaleRatio + ')';

        } else {
            nodeContainerDom.classList.add('screenFrame');
            nodeContainerDom.classList.add('arFrame');
        }
    }

    function getNodeCenter(frameKey, nodeKey) {
        var parentFrameCenter = realityEditor.frameRenderer.getFrameCenter(frameKey);
        // var node = frames[frameKey].nodes[nodeKey];
        var node = realityEditor.database.getNode(frameKey, nodeKey);
        if (!node) {
            console.log('cant find node for ' + frameKey + ', ' + nodeKey);
        }
        return {
            x: parentFrameCenter.x + node.x, // + (node.width * node.scale * scaleRatio)/2,
            y: parentFrameCenter.y + node.y // + (node.height * node.scale * scaleRatio)/2
        }
    }

    function getNodeKeyFromTouchedElement(touchedElement) {
        if (touchedElement.parentElement) {
            if (touchedElement.parentElement.children.length > 0) {
                var iframeElement = touchedElement.parentElement.children[0]; // TODO: make more robust
                var nodeKey = iframeElement.dataset.nodeKey;
                if (nodeKey && nodeKey !== "null") {
                    return nodeKey;
                }
            }
        }
        return null;
    }
    //
    // function getIsNodeMovementHighlighted(nodeKey) {
    //     var nodeContainerDom = document.querySelector('#object' + nodeKey);
    //     var svg = nodeContainerDom.querySelector('#svg' + nodeKey);
    //     return svg.style.visibility !== 'hidden';
    // }

    /**
     * @param {string} nodeKey
     * @param {NODE_COLOR_CODES} colorCode
     */
    function updateNodeVisuals(nodeKey, colorCode) {
        // // show visual feedback for nodes unless you are dragging something around
        // if (target.type !== "ui" && !this.getEditingVehicle()) {
        //     var contentForFeedback;
        //
        //     if (globalProgram.nodeA === target.nodeId || globalProgram.nodeA === false) {
        //         contentForFeedback = 3; // TODO: replace ints with a human-readable enum/encoding
        //         overlayDiv.classList.add('overlayAction');
        //
        //     } else if (realityEditor.network.checkForNetworkLoop(globalProgram.objectA, globalProgram.frameA, globalProgram.nodeA, globalProgram.logicA, target.objectId, target.frameId, target.nodeId, 0)) {
        //         contentForFeedback = 2;
        //         overlayDiv.classList.add('overlayPositive');
        //
        //     } else {
        //         contentForFeedback = 0;
        //         overlayDiv.classList.add('overlayNegative');
        //     }
        //
        //     if (globalDOMCache["iframe" + target.nodeId]) {
        //         globalDOMCache["iframe" + target.nodeId].contentWindow.postMessage(
        //             JSON.stringify( { uiActionFeedback: contentForFeedback }) , "*");
        //     }
        // }

        var contentForFeedback = colorCode; //UI_FEEDBACK_COLOR_CODES[colorCode];
        var iframe = document.getElementById('iframe' + nodeKey);
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify( { uiActionFeedback: contentForFeedback }) , "*");
        }
    }

    function showLogicNodePorts(nodeKey) {
        if (!isLogicNodeHighlightingEnabled) return;
        var logicDomElement = document.getElementById('logic' + nodeKey);
        if (logicDomElement) {
            if (!logicDomElement.classList.contains('scaleIn')) {
                logicDomElement.classList.add('scaleIn');
                logicDomElement.classList.remove('scaleOut');
            }
        }
    }

    function hideLogicNodePorts(nodeKey) {
        var logicDomElement = document.getElementById('logic' + nodeKey);
        if (logicDomElement) {
            if (!logicDomElement.classList.contains('scaleOut')) {
                logicDomElement.classList.add('scaleOut');
                logicDomElement.classList.remove('scaleIn');
            }
        }
    }

    /**
     * @typedef UI_FEEDBACK_COLOR_CODES
     * @type {Readonly<{PINK: number, BLUE: number, GREEN: number, YELLOW: number, WHITE: number}>}
     */
    var UI_FEEDBACK_COLOR_CODES = Object.freeze({
        PINK: 0,
        BLUE: 1,
        GREEN: 2,
        YELLOW: 3,
        WHITE: 4
    });

    /**
     * @typedef LOGIC_NODE_COLOR_CODES
     * @type {Readonly<{PINK: number, BLUE: number, GREEN: number, YELLOW: number, WHITE: number}>}
     */
    var LOGIC_NODE_COLOR_CODES = Object.freeze({
        BLUE: 0,
        GREEN: 1,
        YELLOW: 2,
        PINK: 3,
        WHITE: 4
    });

    function getSelectedPort(frameKey, nodeKey, mouseX, mouseY) {
        var nodeCenter = getNodeCenter(frameKey, nodeKey);
        if (mouseX < nodeCenter.x) {
            if (mouseY < nodeCenter.y) {
                return LOGIC_NODE_COLOR_CODES.BLUE; //UI_FEEDBACK_COLOR_CODES.PINK;
            } else {
                return LOGIC_NODE_COLOR_CODES.PINK; //UI_FEEDBACK_COLOR_CODES.YELLOW;
            }
        } else {
            if (mouseY < nodeCenter.y) {
                return LOGIC_NODE_COLOR_CODES.GREEN; //UI_FEEDBACK_COLOR_CODES.BLUE;
            } else {
                return LOGIC_NODE_COLOR_CODES.YELLOW; //UI_FEEDBACK_COLOR_CODES.GREEN;
            }
        }
    }

    function getOffsetForPort(colorCode) {
        var offset = {
            x: 0,
            y: 0
        };
        var distance = 20;

        if (colorCode === LOGIC_NODE_COLOR_CODES.BLUE) {
            offset.x -= distance;
            offset.y -= distance;
        } else if (colorCode === LOGIC_NODE_COLOR_CODES.GREEN) {
            offset.x += distance;
            offset.y -= distance;
        } else if (colorCode === LOGIC_NODE_COLOR_CODES.YELLOW) {
            offset.x += distance;
            offset.y += distance;
        } else if (colorCode === LOGIC_NODE_COLOR_CODES.PINK) {
            offset.x -= distance;
            offset.y += distance;
        }

        return offset;
    }

    function enableLogicNodeHighlighting(isEnabled) {
        isLogicNodeHighlightingEnabled = isEnabled;
    }

    exports.initFeature = initFeature;
    exports.renderNodes = renderNodes;
    exports.getNodeCenter = getNodeCenter;
    exports.getNodeKeyFromTouchedElement = getNodeKeyFromTouchedElement;
    // exports.getIsNodeMovementHighlighted = getIsNodeMovementHighlighted;
    exports.UI_FEEDBACK_COLOR_CODES = UI_FEEDBACK_COLOR_CODES;
    exports.LOGIC_NODE_COLOR_CODES = LOGIC_NODE_COLOR_CODES;
    exports.updateNodeVisuals = updateNodeVisuals;
    exports.getSelectedPort = getSelectedPort;
    exports.getOffsetForPort = getOffsetForPort;
    exports.enableLogicNodeHighlighting = enableLogicNodeHighlighting;

})(realityEditor.nodeRenderer);