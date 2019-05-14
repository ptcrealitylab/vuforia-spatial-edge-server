createNameSpace("realityEditor.memoryExplorer");

/**
 * @fileOverview realityEditor.memoryExplorer.js
 * Provides the ability to show and hide their memories using the objectDiscovery menu in the form of memoryFrames
 * Provides functions to interface with memoryFrames and their content in customized ways (e.g. inject guiState)
 */

(function(exports) {

    var guiState;

    var isMemoryExplorerVisible = false;

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
            injectGuiStateToMemories(newGuiState);
        });

        // create the memory explorer button
        var memoryButton = document.createElement('img');
        memoryButton.src = 'resources/memory.svg';
        memoryButton.id = 'memoryButton';
        document.body.appendChild(memoryButton);

        memoryButton.addEventListener('pointerup', memoryButtonPressed);
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

    function memoryButtonPressed(event) {
        isMemoryExplorerVisible = !isMemoryExplorerVisible;

        if (isMemoryExplorerVisible) {
            // show menu for showing and hiding memories
            document.getElementById('serverListContainer').classList.add('closed');
        } else {
            // hide menu
            document.getElementById('serverListContainer').classList.remove('closed');
        }
    }

    /**
     * Determine if an object's memory is shown or hidden by checking all the screen frames for a matching memoryFrame
     * @param {string} objectID
     */
    function getMemoryShownForObject(objectID) {

        var foundMemoryFrame = null;

        realityEditor.database.forEachFrame(function(frameKey, frame) {
            if (foundMemoryFrame) { return; } // exit loop if already found it

            if (frame.visualization === 'screen' && frame.src === 'memoryFrame') {
                // get the publicData of the storage node and check if its objectID matches this one
                var storageNode = Object.keys(frame.nodes).map(function(nodeKey) {
                    return frame.nodes[nodeKey];
                }).filter(function(node) {
                    return node.name === 'storage';
                })[0];
                // console.log('found storage node', storageNode);
                // console.log(storageNode.publicData.memoryInformation);
                if (typeof storageNode.publicData.memoryInformation !== 'undefined') {
                    var thisMemoryObjectID = storageNode.publicData.memoryInformation.objectID;
                    // console.log('thisMemoryObjectID', thisMemoryObjectID);
                    if (thisMemoryObjectID === objectID) {
                        foundMemoryFrame = frame;
                    }
                }
            }
        });

        return foundMemoryFrame;
    }

    exports.initFeature = initFeature;
    exports.getMemoryShownForObject = getMemoryShownForObject;

})(realityEditor.memoryExplorer);