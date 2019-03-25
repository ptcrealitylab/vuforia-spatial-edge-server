createNameSpace("realityEditor.craftingBoardMenu");

(function(exports) {

    var backButton;
    var blockMenuButton;
    var nodeSettingsButton;
    var blockTrashButton;
    var blockTabImages = [];
    var backButtonCallback = null;

    /**
     * Initializes the DOM and touch event listeners for the trash
     */

    function initFeature() {
        // create the back button
        backButton = document.createElement('img');
        backButton.src = 'resources/back.svg';
        backButton.id = 'backButton';

        // create the block menu button
        blockMenuButton = document.createElement('img');
        blockMenuButton.src = 'resources/logicPocket.svg';
        blockMenuButton.id = 'blockMenuButton';

        // create the node settings button
        nodeSettingsButton = document.createElement('img');
        nodeSettingsButton.src = 'resources/logicSetting.svg';
        nodeSettingsButton.id = 'nodeSettingsButton';

        // create the trash button, hidden
        blockTrashButton = document.createElement('img');
        blockTrashButton.src = 'resources/bigTrash.svg';
        blockTrashButton.id = 'blockTrashButton';
        blockTrashButton.classList.add('closed');

        addButtons();

        backButton.addEventListener('pointerup', backButtonPressed);
        blockMenuButton.addEventListener('pointerup', toggleBlockMenu);
        nodeSettingsButton.addEventListener('pointerup', nodeSettingsPressed);
        blockTrashButton.addEventListener('pointerup', releasedOnTrash);

        preload(blockTabImages,
            'resources/iconBlocks.png', 'resources/iconEvents.png', 'resources/iconSignals.png', 'resources/iconMath.png', 'resources/iconWeb.png'
        );
    }

    function backButtonPressed(event) {
        if (backButtonCallback) {
            if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
                // realityEditor.gui.crafting.blockMenuHide();
                hideAllSubmenus();
            } else {
                backButtonCallback();
            }
        }
    }

    function toggleBlockMenu(event) {
        console.log('toggle block menu');

        var menuWhichWasOpen = null;
        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
            menuWhichWasOpen = hideAllSubmenus();
        }

        if (menuWhichWasOpen !== 'blockMenu') {
            realityEditor.gui.crafting.blockMenuVisible();
        }
    }

    function hideAllSubmenus() {
        var whichMenuWasOpen = null;

        var wasBlockSettingsOpen = realityEditor.gui.crafting.eventHelper.hideBlockSettings();
        if (wasBlockSettingsOpen) {
            whichMenuWasOpen = 'blockSettings';
        } else {
            var wasNodeSettingsOpen = realityEditor.gui.crafting.eventHelper.hideNodeSettings();
            if (wasNodeSettingsOpen) {
                whichMenuWasOpen = 'nodeSettings';
            } else {
                if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
                    realityEditor.gui.crafting.blockMenuHide();
                    whichMenuWasOpen = 'blockMenu';
                }
            }
        }
        return whichMenuWasOpen;
    }

    function nodeSettingsPressed(event) {

        var menuWhichWasOpen = null;
        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
            menuWhichWasOpen = hideAllSubmenus();
        }

        if (menuWhichWasOpen !== 'nodeSettings') {
            realityEditor.gui.crafting.eventHelper.openNodeSettings();
        }

        // console.log(" LOGIC SETTINGS PRESSED ");
        // var wasBlockSettingsOpen = realityEditor.gui.crafting.eventHelper.hideBlockSettings();
        // // realityEditor.gui.menus.off("crafting", ["logicSetting"]);
        // if (!wasBlockSettingsOpen) {
        //     var wasNodeSettingsOpen = realityEditor.gui.crafting.eventHelper.hideNodeSettings();
        //     if (!wasNodeSettingsOpen) {
        //         if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) {
        //             realityEditor.gui.crafting.blockMenuHide();
        //         }
        //         console.log("Open Node Settings");
        //         realityEditor.gui.crafting.eventHelper.openNodeSettings();
        //     }
        // }
    }

    function releasedOnTrash(event) {
        console.log('released on trash');
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
        craftingBoardContainer.appendChild(backButton);
        craftingBoardContainer.appendChild(blockMenuButton);
        craftingBoardContainer.appendChild(nodeSettingsButton);
        craftingBoardContainer.appendChild(blockTrashButton);
    }

    function setBackButtonCallback(callback) {
        backButtonCallback = callback;
    }

    exports.initFeature = initFeature;
    exports.blockTabImages = blockTabImages;
    exports.addButtons = addButtons;
    exports.setBackButtonCallback = setBackButtonCallback;

})(realityEditor.craftingBoardMenu);