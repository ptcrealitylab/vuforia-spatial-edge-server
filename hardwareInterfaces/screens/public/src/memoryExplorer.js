createNameSpace("realityEditor.memoryExplorer");

/**
 * @fileOverview realityEditor.memoryExplorer.js
 * Provides the ability to show and hide their memories using the objectDiscovery menu in the form of memoryFrames
 * Provides functions to interface with memoryFrames and their content in customized ways (e.g. inject guiState)
 */

(function(exports) {

    var guiState;

    function initFeature() {
        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
            injectGuiStateToMemories(newGuiState);
        });
    }

    function injectGuiStateToMemories(newGuiState) {
        var allMemoryFrames = Object.keys(frames).map(function(frameKey) {
            return frames[frameKey];
        }).filter(function(frame) {
            return frame.visualization === 'screen' && frame.src === 'memoryFrame';
        });

        allMemoryFrames.forEach(function(memoryFrame) {
            var iframe = document.getElementById('iframe' + memoryFrame.uuid);
            iframe.contentWindow.postMessage(JSON.stringify({
                guiState: newGuiState,
                platform: 'desktop'
            }), '*');
        });
    }

    exports.initFeature = initFeature;

})(realityEditor.memoryExplorer);