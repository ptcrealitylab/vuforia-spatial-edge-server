createNameSpace("realityEditor.memoryNodeRenderer");

(function(exports) {

    var guiState;

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
        });

        realityEditor.network.addPostMessageHandler('memoryMessage', handleMessageFromMemory);

    }

    /**
     * Handles messages posted into the window/iframe with structure {memoryMessage: msgContent}
     * @param {Object} msgContent - JSON object passed into the memoryMessage property of the post message
     */
    function handleMessageFromMemory(msgContent) {
        var memoryObjectID = msgContent.objectID;
        // find the frame that contains that memory
        var memoryFrame = realityEditor.memoryExplorer.getMemoryShownForObject(memoryObjectID);

        // get or create a container to monitor all the node positions within that memory and create invisible interact-able nodes on top
        var memoryMonitor = getMemoryMonitor(memoryFrame);

        var nodePositions = msgContent.nodes;

        // remove all existing node divs before we create new ones
        while (memoryMonitor.firstChild) {
            memoryMonitor.firstChild.remove();
        }

        // populate with divs for each node inside the visible bounds of the memory frame
        for (var nodeKey in nodePositions) {

            var node = getNodeFromMemoryKeys(memoryObjectID, nodeKey);
            if (!node || !(node.type === 'node' || node.type === 'logic')) { continue; } // only render visible node types. todo: refactor

            var position = nodePositions[nodeKey];
            var percentBuffer = 5; // how far beyond edge of memory frame can nodes be and still be interact-able
            if (position.percentX > 0 - percentBuffer && position.percentX < 100 + percentBuffer &&
                position.percentY > 0 - percentBuffer && position.percentY < 100 + percentBuffer) {

                var nodePlaceholder = createDiv('placeholder' + nodeKey, 'nodePlaceholder', null, memoryMonitor);

                var nodeSize = 50;
                nodePlaceholder.style.width = nodeSize + 'px';
                nodePlaceholder.style.height = nodeSize + 'px';

                nodePlaceholder.style.left = (position.percentX * memoryFrame.width - nodeSize/2) + 'px';
                nodePlaceholder.style.top = (position.percentY * memoryFrame.height - nodeSize/2) + 'px';

            }
        }
    }

    /**
     * gets the node from the correct frame of the correct object using only its nodeKey and which memory it was in
     * @param {string} memoryObjectID
     * @param {string} nodeKey
     */
    function getNodeFromMemoryKeys(memoryObjectID, nodeKey) {

        var discoveredObjects = realityEditor.objectDiscovery.getDiscoveredObjects();
        var discoveredObjectsOnOtherServers = realityEditor.objectDiscovery.getDiscoveredObjectsOnOtherServers();

        var frames = typeof discoveredObjects[memoryObjectID] !== 'undefined' ? discoveredObjects[memoryObjectID].frames : discoveredObjectsOnOtherServers[memoryObjectID].frames;
        var matchingFrameKeys = Object.keys(frames).filter(function(frameKey){
            return nodeKey.indexOf(frameKey) > -1;
        });
        if (matchingFrameKeys.length === 0) { return null; }
        return frames[matchingFrameKeys[0]].nodes[nodeKey];
    }

    function getMemoryMonitor(frame) {
        if (frame.src !== 'memoryFrame') {
            return; // don't need to do this for non- memory frames
        }
        var monitorContainer = document.getElementById('monitor' + frame.uuid);
        if (!monitorContainer) {
            var frameContainer = document.getElementById('object' + frame.uuid);
            monitorContainer = createDiv('monitor' + frame.uuid, 'monitorContainer', null, frameContainer);
            monitorContainer.style.width = frame.width + 'px';
            monitorContainer.style.height = frame.height + 'px';
        }
        return monitorContainer;
    }

    exports.initFeature = initFeature;

})(realityEditor.memoryNodeRenderer);