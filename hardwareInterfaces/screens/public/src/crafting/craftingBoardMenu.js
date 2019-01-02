createNameSpace("realityEditor.craftingBoardMenu");

(function(exports) {

    var blockMenuButton;
    var blockTabImages = [];

    /**
     * Initializes the DOM and touch event listeners for the trash
     */

    function initFeature() {
        blockMenuButton = document.createElement('img');
        blockMenuButton.src = 'resources/logicPocket.svg';
        blockMenuButton.id = 'blockMenuButton';

        addButtons();

        blockMenuButton.addEventListener('pointerup', toggleBlockMenu);

        preload(blockTabImages,
            'resources/iconBlocks.png', 'resources/iconEvents.png', 'resources/iconSignals.png', 'resources/iconMath.png', 'resources/iconWeb.png'
        );
    }

    function toggleBlockMenu(event) {
        console.log('toggle block menu');

        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
            realityEditor.gui.crafting.blockMenuHide();
        } else {
            realityEditor.gui.crafting.blockMenuVisible();
        }
    }

    /**
     * preloads a set of images into an array
     * @param array
     */
    function preload(array) {
        for (var i = 0; i < preload.arguments.length - 1; i++) {
            array[i] = new Image();
            array[i].src = preload.arguments[i + 1];
        }
    }

    function addButtons() {
        var craftingBoardContainer = document.getElementById('craftingBoard');
        craftingBoardContainer.appendChild(blockMenuButton);
    }

    exports.initFeature = initFeature;
    exports.blockTabImages = blockTabImages;
    exports.addButtons = addButtons;

})(realityEditor.craftingBoardMenu);