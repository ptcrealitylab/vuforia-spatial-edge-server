createNameSpace("realityEditor.trash");

(function(exports) {

    /**
     * Initializes the DOM and touch event listeners for the trash
     */
    function initFeature() {

        // create the pocket button
        var trashButton = document.createElement('img');
        trashButton.src = 'resources/bigTrash.svg';
        trashButton.id = 'trashButton';
        document.body.appendChild(trashButton);

        trashButton.addEventListener('pointerup', releasedOnTrash);

        hideTrash();
    }

    function releasedOnTrash(event) {
        console.log('released on trash');

        if (editingState.objectKey && editingState.frameKey) {
            if (isVehicleDeletable(editingState.frameKey, editingState.nodeKey)) {
                if (editingState.nodeKey) {
                    deleteNode(editingState.frameKey, editingState.nodeKey);
                } else {
                    deleteFrame(editingState.frameKey);
                }
            }
        }

    }

    function deleteFrame(frameKey) {

        // remove it from the DOM
        realityEditor.frameRenderer.killElement(frameKey);

        // delete it from the server
        realityEditor.network.deleteFrameFromObject(frameKey);

        delete frames[frameKey];

        realityEditor.utilities.resetEditingState();

        console.log('fully deleted frame ' + frameKey);
    }

    function deleteNode(frameKey, nodeKey) {
        // remove it from the DOM
        realityEditor.frameRenderer.killElement(nodeKey);

        // TODO: delete it from the server
        // realityEditor.network.deleteFrameFromObject(frameKey);

        var parentFrame = realityEditor.database.getFrame(frameKey);
        delete parentFrame.nodes[nodeKey];

        realityEditor.utilities.resetEditingState();

        console.log('fully deleted node ' + nodeKey);
    }

    function isVehicleDeletable(frameKey, nodeKey) {
        var isDeletable = false;
        if (nodeKey) {
            var node = realityEditor.database.getNode(editingState.frameKey, editingState.nodeKey);
            if (node && node.type === 'logic') {
                isDeletable = true;
            }
        } else {
            var frame = realityEditor.database.getFrame(frameKey);
            if (frame && frame.location === 'global') {
                isDeletable = true;
            }
        }
        return isDeletable;
    }

    function hideTrash() {
        trashButton.classList.add('closed');
    }

    function showTrash(frameKey, nodeKey) {
        if (isVehicleDeletable(frameKey, nodeKey)) {
            trashButton.classList.remove('closed');
        }
    }

    exports.initFeature = initFeature;
    exports.showTrash = showTrash;
    exports.hideTrash = hideTrash;

})(realityEditor.trash);