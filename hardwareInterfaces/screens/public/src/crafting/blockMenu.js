/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2016 Benjamin Reynholds
 * Modified by Valentin Heun 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

createNameSpace("realityEditor.gui.crafting.blockMenu");

(function(exports) {

    /**
     * Creates the DOM elements for the logic block menu,
     * load all the blocks and generate their DOM and data models,
     * and call the callback function when fully loaded.
     * @param {Function} callback
     */
    function initializeBlockMenu(callback) {
        var logic = globalStates.currentLogic;
    
        var craftingMenusContainer = document.getElementById('craftingMenusContainer');
    
        var container = document.createElement('div');
        container.setAttribute('id', 'menuContainer');
        // container.style.left = logic.grid.xMargin + 'px';
        // container.style.top = logic.grid.yMargin + 'px';

        container.classList.add('centerVerticallyAndHorizontally');
        
        // center on iPads
        // nodeSettingsContainer.style.marginLeft = globalStates.currentLogic.grid.xMargin + 'px';
        // nodeSettingsContainer.style.marginTop = globalStates.currentLogic.grid.yMargin + 'px';

        // container.style.width = logic.grid.gridWidth + 'px';
        // container.style.height = logic.grid.gridHeight + 'px';
        
        var scaleMultiplier = Math.max(logic.grid.containerHeight / logic.grid.gridHeight, logic.grid.containerWidth / logic.grid.gridWidth);
        container.style.transform = 'scale(' + scaleMultiplier + ')';

        craftingMenusContainer.appendChild(container);
    
        var menuBlockContainer = document.createElement('div');
        menuBlockContainer.setAttribute('id', 'menuBlockContainer');
        container.appendChild(menuBlockContainer);
    
        var menuSideContainer = document.createElement('div');
        menuSideContainer.setAttribute('id', 'menuSideContainer');
        container.appendChild(menuSideContainer);
    
        var menuCols = 4;
        var menuRows = 6;
        var menuNumTabs = 5;
        logic.guiState.menuSelectedTab = 0;
        logic.guiState.menuTabDivs = [];
        logic.guiState.menuIsPointerDown = false;
        logic.guiState.menuSelectedBlock = null;
        logic.guiState.menuBlockDivs = [];
    
        // create menu tabs for block categories
        for (var i = 0; i < menuNumTabs; i++) {
            var menuTab = document.createElement('div');
            menuTab.setAttribute('class', 'menuTab');
            menuTab.setAttribute('tabIndex', i);
            menuTab.setAttribute('touch-action', 'none');
            menuTab.addEventListener('pointerdown', onMenuTabSelected.bind(exports));
    
            var menuTabIcon = document.createElement('img');
            menuTabIcon.setAttribute('class', 'menuTabIcon');
            menuTabIcon.setAttribute('src', realityEditor.craftingBoardMenu.blockTabImages[i].src);
            menuTabIcon.setAttribute('touch-action', 'none');
            menuTab.appendChild(menuTabIcon);
    
            logic.guiState.menuTabDivs.push(menuTab);
            menuSideContainer.appendChild(menuTab);
        }
        
        menuLoadBlocks.call(exports, function(blockData) {
    
            // load each block from the downloaded json and add it to the appropriate category
            for (var key in blockData) {
                if (!blockData.hasOwnProperty(key)) continue;
                var block = blockData[key];
    
                var categoryIndex = 0;
                if (block.category) {
                    categoryIndex = block.category - 1;
                }
                var categoryMenu = logic.guiState.menuBlockData[categoryIndex];
                categoryMenu[key] = block;
            }
    
            console.log("menuBlockData = ");
            console.log(logic.guiState.menuBlockData);
    
            for (var r = 0; r < menuRows; r++) {
                var row = document.createElement('div');
                menuBlockContainer.appendChild(row);
                for (var c = 0; c < menuCols; c++) {
                    var block = document.createElement('div');
                    block.setAttribute('class', 'menuBlock');
                    block.style.visibility = 'hidden';
                    var blockContents = document.createElement('div');
                    blockContents.setAttribute('class', 'menuBlockContents');
                    blockContents.setAttribute("touch-action", "none");
                    blockContents.addEventListener('pointerdown', onBlockMenuPointerDown.bind(exports));
                    blockContents.addEventListener('pointerup', onBlockMenuPointerUp.bind(exports));
                    blockContents.addEventListener('pointerleave', onBlockMenuPointerLeave.bind(exports));
                    blockContents.addEventListener('pointermove', onBlockMenuPointerMove.bind(exports));
                    block.appendChild(blockContents);
                    logic.guiState.menuBlockDivs.push(block);
                    row.appendChild(block);
                }
            }
            callback();
        });
    }

    /**
     * Remove all the menu block event handlers and DOM elements.
     */
    function resetBlockMenu() {
        if (globalStates.currentLogic) {
            var guiState = globalStates.currentLogic.guiState;
            guiState.menuBlockDivs.forEach(function(blockDiv) {
                blockDiv.firstChild.removeEventListener('pointerdown', onBlockMenuPointerDown);
                blockDiv.firstChild.removeEventListener('pointerup', onBlockMenuPointerUp);
                blockDiv.firstChild.removeEventListener('pointerleave', onBlockMenuPointerLeave);
                blockDiv.firstChild.removeEventListener('pointermove', onBlockMenuPointerMove);
            });
        }
        var container = document.getElementById('menuContainer');
        if (container) {
            while (container.hasChildNodes()) {
                container.removeChild(container.lastChild);
            }
        }
    }

    /**
     * Get the JSON data of all available logic blocks on the current logic node's server, and pass it into the callback function when loaded
     * @param {Function} callback - function that accepts JSON data as first parameter
     */
    function menuLoadBlocks(callback) {
        var keys = this.crafting.eventHelper.getServerObjectLogicKeys(globalStates.currentLogic); // TODO: move to realityEditor.network module
        
        var urlEndpoint = 'http://' + keys.ip + ':' + SERVER_PORT + '/availableLogicBlocks'; // ben change
        realityEditor.network.getData(null, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, req) {
            console.log("did get available blocks", req);
            callback(req);
        });
    }

    /**
     * Displays the set of logic blocks associated with the category of the tab that was tapped on.
     * @param {PointerEvent} e
     */
    function onMenuTabSelected(e) {
        e.preventDefault();
        var guiState = globalStates.currentLogic.guiState;
        guiState.menuSelectedTab = e.target.tabIndex;
        if (guiState.menuSelectedTab < 0) guiState.menuSelectedTab = e.target.parentNode.tabIndex;
        if (guiState.menuSelectedTab < 0) guiState.menuSelectedTab = 0;
        redisplayTabSelection.call(exports);
        redisplayBlockSelection.call(exports);
    }

    /**
     * Update the visuals for each tab to show which one is selected.
     */
    function redisplayTabSelection() {
        var guiState = globalStates.currentLogic.guiState;
        guiState.menuTabDivs.forEach(function(tab) {
            if (guiState.menuSelectedTab === tab.tabIndex) {
                tab.setAttribute('class', 'menuTabSelected');
            } else {
                tab.setAttribute('class', 'menuTab');
            }
        });
    }

    /**
     * Update the visuals for each menu block to show the icon image of the block it will add.
     * Hides excess blocks if this category has fewer than the maximum number.
     */
    function redisplayBlockSelection() {
        var guiState = globalStates.currentLogic.guiState;
        var blocksObject = guiState.menuBlockData[guiState.menuSelectedTab];
        var blocksInThisSection = [];
        for (var key in blocksObject) {
            blocksInThisSection.push(blocksObject[key]);
        }
    
        var blockDiv;
        // reassign as many divs as needed to the current set of blocks
        for (var i = 0; i < blocksInThisSection.length; i++) {
            blockDiv = guiState.menuBlockDivs[i];
            var thisBlockData = blocksInThisSection[i];
            blockDiv.blockData = thisBlockData;
            blockDiv.firstChild.innerHTML = ""; // reset block contents before adding anything
    
            // load icon and title
            var iconImage = document.createElement("img");
            iconImage.setAttribute('class', 'blockIcon');
            
            // wait until image loads to display block
            iconImage.onload = function(e) {
                console.log('did load image');

                var parentBlock = e.target.parentElement.parentElement;
                if (parentBlock) {
                    parentBlock.style.visibility = 'visible';
                    parentBlock.style.display = 'inline-block';
                }
            };

            // must come after the onload callback is defined, otherwise won't trigger it
            iconImage.src = this.crafting.getBlockIcon(globalStates.currentLogic, thisBlockData.type,false).src;
            blockDiv.firstChild.appendChild(iconImage);

            var blockTitle = document.createElement('div');
            blockTitle.setAttribute('class', 'blockTitle');
            blockTitle.innerHTML = thisBlockData.name;
            blockDiv.firstChild.appendChild(blockTitle);
        }
    
        // clear the remaining block divs
        for (var i = blocksInThisSection.length; i < guiState.menuBlockDivs.length; i++) {
            blockDiv = guiState.menuBlockDivs[i];
            blockDiv.blockData = '';
            blockDiv.style.display = 'none';
        }
    }

    /**
     * Changes internal state when you tap on a menu block to store which one you selected.
     * Updates visuals to show it was selected.
     * (Doesn't add the block yet - waits until pointermove event)
     * @param {PointerEvent} e
     */
    function onBlockMenuPointerDown(e) {
        e.preventDefault();
        var guiState = globalStates.currentLogic.guiState;
        guiState.menuBlockToAdd = null;
        guiState.menuIsPointerDown = true;
        guiState.menuSelectedBlock = e.currentTarget;
        guiState.menuSelectedBlock.parentNode.setAttribute('class', 'menuBlock blockDivMovingAble');
        guiState.menuBlockToAdd = e.currentTarget.parentNode;
    }

    /**
     * Resets internal state and visuals to un-select the menu block that was selected.
     * @param {PointerEvent} e
     */
    function onBlockMenuPointerUp(e) {
        e.preventDefault();
        var guiState = globalStates.currentLogic.guiState;
        guiState.menuIsPointerDown = false; // TODO: this is only difference between this and onBlockMenuPointerLeave?
        if (guiState.menuSelectedBlock) {
            guiState.menuSelectedBlock.parentNode.setAttribute('class', 'menuBlock');
        }
        guiState.menuSelectedBlock = null;
        guiState.menuBlockToAdd = null;
    }

    /**
     * Resets internal state and visuals to un-select the menu block that was selected.
     * @param e
     */
    function onBlockMenuPointerLeave(e) {
        e.preventDefault();
        var guiState = globalStates.currentLogic.guiState;
        if (guiState.menuIsPointerDown) {
            if (guiState.menuSelectedBlock) {
                guiState.menuSelectedBlock.parentNode.setAttribute('class', 'menuBlock');
            }
        }
        guiState.menuSelectedBlock = null;
        guiState.menuBlockToAdd = null;
    }

    /**
     * Actually adds the selected block to the crafting board and hides the menu when you drag on a menu block.
     * @param {PointerEvent} e
     */
    function onBlockMenuPointerMove(e) {
        e.preventDefault();
        var guiState = globalStates.currentLogic.guiState;
        if (guiState.menuBlockToAdd) {
            if (guiState.menuSelectedBlock) {
                guiState.menuSelectedBlock.parentNode.setAttribute('class', 'menuBlock');
            }
            var blockJSON = guiState.menuBlockToAdd.blockData;
            var blockRect = guiState.menuBlockToAdd.getBoundingClientRect();
            var pointerX = blockRect.left + blockRect.width/2;
            var pointerY = blockRect.top + blockRect.height/2;
            
            this.crafting.blockMenuHide(); // hide menu before adding block otherwise the touchmove event it triggers will be stopped
            this.crafting.eventHelper.addBlockFromMenu(blockJSON, pointerX, pointerY); // actually adds it to the crafting board
            guiState.menuBlockToAdd = null;
        }
    }

    exports.initializeBlockMenu = initializeBlockMenu;
    exports.resetBlockMenu = resetBlockMenu;
    exports.redisplayTabSelection = redisplayTabSelection;
    exports.redisplayBlockSelection = redisplayBlockSelection;
    
}(realityEditor.gui.crafting.blockMenu));
