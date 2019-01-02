createNameSpace("realityEditor.nodeRenderer");

(function(exports) {

    var guiState;

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

    }

    function renderNodes() {
        realityEditor.database.forEachNodeInAllFrames(function(frameKey, nodeKey, node) {
            addElement(frameKey, nodeKey, node);
            drawTransformed(frameKey, nodeKey, node);
        });
    }

    function addElement(frameKey, nodeKey, node) {
        realityEditor.draw.addElement(frameKey, nodeKey, node);
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

            nodeContainerDom.style.left = (parentFrameCenter.x + node.x - (node.width * node.scale * scaleRatio)/2) + 'px';
            nodeContainerDom.style.top = (parentFrameCenter.y + node.y - (node.height * node.scale * scaleRatio)/2) + 'px';

            nodeContainerDom.style.transform = 'scale(' + node.scale * scaleRatio + ')';

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

    exports.initFeature = initFeature;
    exports.renderNodes = renderNodes;
    exports.getNodeCenter = getNodeCenter;
    exports.getNodeKeyFromTouchedElement = getNodeKeyFromTouchedElement;
    // exports.getIsNodeMovementHighlighted = getIsNodeMovementHighlighted;

})(realityEditor.nodeRenderer);