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
            deleteFrame(editingState.frameKey);
        }

    }

    function deleteFrame(frameKey) {

        // remove it from the DOM
        realityEditor.frameRenderer.killElement(frameKey);
        // realityEditor.gui.ar.draw.removeFromEditedFramesList(this.editingState.frame);

        // // delete it from the server
        realityEditor.network.deleteFrameFromObject(frameKey);
        //
        // globalStates.inTransitionObject = null;
        // globalStates.inTransitionFrame = null;

        delete frames[frameKey];

        console.log('fully deleted ' + frameKey);

    }

    function hideTrash() {
        trashButton.classList.add('closed');
    }

    function showTrash() {
        trashButton.classList.remove('closed');
    }

    exports.initFeature = initFeature;
    exports.showTrash = showTrash;
    exports.hideTrash = hideTrash;

})(realityEditor.trash);