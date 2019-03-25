createNameSpace("realityEditor.modeToggle");

(function(exports) {

    var guiButtonBackground;
    var nodeButtonBackground;

    var guiState = 'ui';
    var guiStateListeners = [];

    /**
     * Initializes the DOM and touch event listeners for the trash
     */
    function initFeature() {

        // create the pocket button
        var modeToggleButton = document.createElement('img');
        modeToggleButton.src = 'resources/modeToggle.svg';
        modeToggleButton.id = 'modeToggleButton';
        document.body.appendChild(modeToggleButton);

        guiButtonBackground = document.createElement('div');
        guiButtonBackground.classList.add('toggleButtonBackground');
        guiButtonBackground.style.top = '1px';
        document.body.appendChild(guiButtonBackground);

        nodeButtonBackground = document.createElement('div');
        nodeButtonBackground.classList.add('toggleButtonBackground');
        nodeButtonBackground.style.top = '63px';
        document.body.appendChild(nodeButtonBackground);

        guiButtonBackground.addEventListener('pointerup', onGuiPointerUp);
        nodeButtonBackground.addEventListener('pointerup', onNodePointerUp);

        setToggleToNode(false);
    }

    function onGuiPointerUp(event) {
        setToggleToNode(false);
    }

    function onNodePointerUp(event) {
        setToggleToNode(true);
    }

    function setToggleToNode(isNode) {
        if (isNode) {
            nodeButtonBackground.classList.remove('toggleOff');
            guiButtonBackground.classList.add('toggleOff');
        } else {
            guiButtonBackground.classList.remove('toggleOff');
            nodeButtonBackground.classList.add('toggleOff');
        }

        guiState = isNode ? 'node' : 'ui';
        guiStateListeners.forEach(function(callback) {
            callback(guiState);
        });
    }

    /**
     * Subscribes to changes to the guiState ("node" vs "ui" view)
     * Also triggers the callback one time immediately so that the subscriber gets the current value
     * @param {Function<string>} callback
     */
    function addGuiStateListener(callback) {
        guiStateListeners.push(callback);
        callback(guiState);
    }

    exports.initFeature = initFeature;
    exports.addGuiStateListener = addGuiStateListener;

})(realityEditor.modeToggle);