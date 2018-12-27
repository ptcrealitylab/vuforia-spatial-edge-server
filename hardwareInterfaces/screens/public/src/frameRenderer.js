createNameSpace("realityEditor.frameRenderer");

(function(exports) {

    var guiState;

    function initFeature() {

        guiState = realityEditor.modeToggle.getGuiState();

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

    }

    function renderFrames() {
        realityEditor.database.forEachFrame(function(frameKey, frame) {
            addElement(frameKey, frame);
            drawTransformed(frameKey, frame);
        });
    }

    function addElement(frameKey, frame) {
        realityEditor.draw.addElement(frameKey, null, frame);
    }

    function killElement(frameKey) {
        var frameContainer = document.getElementById('object' + frameKey);
        document.body.removeChild(frameContainer);
        console.log('removed DOM elements for frame ' + frameKey);
    }

    function drawTransformed(frameKey, frame) {
        var frameContainerDom = document.querySelector('#object'+frameKey);

        if (guiState === 'ui') {
            frameContainerDom.classList.remove('ghostFrame');
        } else {
            frameContainerDom.classList.add('ghostFrame');
        }

        if (frame.visualization === 'screen') {
            var svg = frameContainerDom.querySelector('#svg' + frameKey);
            if (svg.childElementCount === 0) {
                var iFrame = frameContainerDom.querySelector('#iframe' + frameKey);
                console.log('retroactively creating the svg overlay');
                svg.style.width = iFrame.style.width;
                svg.style.height = iFrame.style.height;
                realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
            }

            if (editingState.frameKey === frameKey && !editingState.nodeKey) {
                svg.style.visibility = 'visible';
            } else {
                svg.style.visibility = 'hidden';
            }

            // frameContainerDom.style.display = 'inline';
            frameContainerDom.classList.remove('arFrame');
            frameContainerDom.classList.add('screenFrame');
            frameContainerDom.style.left = frame.screen.x + 'px';
            frameContainerDom.style.top = frame.screen.y + 'px';

            frameContainerDom.style.transform = 'scale(' + frame.screen.scale + ')';

        } else {
            // frameContainerDom.style.display = 'none';
            frameContainerDom.classList.remove('screenFrame');
            frameContainerDom.classList.add('arFrame');
        }
    }

    exports.initFeature = initFeature;
    exports.renderFrames = renderFrames;
    exports.killElement = killElement;

})(realityEditor.frameRenderer);