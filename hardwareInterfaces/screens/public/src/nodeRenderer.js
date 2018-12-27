createNameSpace("realityEditor.nodeRenderer");

(function(exports) {

    var guiState;

    function initFeature() {

        guiState = realityEditor.modeToggle.getGuiState();

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

            nodeContainerDom.style.left = (parentFrame.screen.x + node.x) + 'px';
            nodeContainerDom.style.top = (parentFrame.screen.y + node.y) + 'px';

            nodeContainerDom.style.transform = 'scale(' + node.scale * scaleRatio + ')';

        } else {
            nodeContainerDom.classList.add('screenFrame');
            nodeContainerDom.classList.add('arFrame');
        }
    }

    exports.initFeature = initFeature;
    exports.renderNodes = renderNodes;

})(realityEditor.nodeRenderer);