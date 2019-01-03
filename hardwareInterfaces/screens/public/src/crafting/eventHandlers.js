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

createNameSpace("realityEditor.gui.crafting.eventHandlers");

(function(exports) {

    var TS_NONE = "NONE";
    var TS_TAP_BLOCK = "TAP_BLOCK";
    var TS_HOLD = "HOLD_BLOCK";
    var TS_MOVE = "MOVE_BLOCK";
    var TS_CONNECT = "CONNECT_BLOCK";
    var TS_CUT = "CUT";

    var touchState = TS_NONE;

    var cutLineStart = null;

    var startTapTime;
    
    var activeHoldTimer = null;

    function onPointerDown(e) {
        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) return;

        // we can assume we are in TS_NONE

        var cell = this.crafting.eventHelper.getCellOverPointer(e.pageX, e.pageY);
        if (!cell) return; // tapped on menu
        var contents = this.crafting.eventHelper.getCellContents(cell);

        this.crafting.eventHelper.updateCraftingBackgroundVisibility("down", cell, contents);

        if (contents && !this.crafting.eventHelper.isOutputBlock(contents.block)) {
            
            touchState = TS_TAP_BLOCK;

            globalStates.currentLogic.guiState.tappedContents = contents;

            startTapTime = Date.now();
            
            var _this = this;
            var thisTappedContents = contents;

            activeHoldTimer = setTimeout(function () {
                _this.crafting.eventHelper.styleBlockForHolding(thisTappedContents, true);

                realityEditor.gui.menus.on("bigTrash",[]);
                //realityEditor.gui.pocket.pocketOnMemoryDeletionStart();
            }, globalStates.craftingMoveDelay);
            
        } else {

            touchState = TS_CUT;
            cutLineStart = {
                x: e.pageX,
                y: e.pageY
            };
            
        }
    }

    function onPointerMove(e, setStateMove) {
        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) return;
        
        if (setStateMove) {
            touchState = TS_MOVE;
        }
        var cell = this.crafting.eventHelper.getCellOverPointer(e.pageX, e.pageY);
        if (!cell) { // moved to sidebar menu
            if (touchState !== TS_MOVE) {
                return this.onPointerUp(e);
            }
        
        } else {
            this.crafting.eventHelper.updateCraftingBackgroundVisibility("move", cell, globalStates.currentLogic.guiState.tappedContents);
        }
        
        var contents = this.crafting.eventHelper.getCellContents(cell);
        var tappedContents = globalStates.currentLogic.guiState.tappedContents;
        
        if (touchState === TS_TAP_BLOCK) {

            // if you moved to a different cell, go to TS_CONNECT
            if (!this.crafting.eventHelper.areCellsEqual(cell, tappedContents.cell)) {
                this.crafting.eventHelper.styleBlockForHolding(tappedContents, false);
                if (this.crafting.eventHelper.canDrawLineFrom(tappedContents)) {
                    touchState = TS_CONNECT;
                    clearTimeout(activeHoldTimer);
                    realityEditor.gui.menus.on("crafting",[]);
                   // realityEditor.gui.pocket.pocketOnMemoryDeletionStop();

                } else {
                    touchState = TS_NONE;
                    clearTimeout(activeHoldTimer);
                    realityEditor.gui.menus.on("crafting",[]);
                   // realityEditor.gui.pocket.pocketOnMemoryDeletionStop();

                }

                // otherwise if enough time has passed, change to TS_HOLD
            } else if (!contents.block.isPortBlock) {
                if (Date.now() - startTapTime > globalStates.craftingMoveDelay) {
                    // this.cout("enough time has passed -> HOLD (" + (Date.now() - startTapTime) + ")");
                    touchState = TS_HOLD;
                    clearTimeout(activeHoldTimer);
                    this.crafting.eventHelper.styleBlockForHolding(globalStates.currentLogic.guiState.tappedContents, true);
                }
            }

        } else if (touchState === TS_HOLD) {

            // if you moved to a different cell, go to TS_MOVE
            // remove the block and create a temp block

            touchState = TS_MOVE;
            this.crafting.eventHelper.convertToTempBlock(tappedContents);
            this.crafting.eventHelper.moveBlockDomToPosition(tappedContents, e.pageX, e.pageY);

        } else if (touchState === TS_CONNECT) {
            
            // if you are over an eligible block, create a temp link and re-route grid
            if (contents && this.crafting.eventHelper.canConnectBlocks(tappedContents, contents)){
                this.crafting.eventHelper.resetLinkLine();
                if (!this.crafting.eventHelper.areBlocksTempConnected(tappedContents, contents)) {
                    this.crafting.eventHelper.createTempLink(tappedContents, contents);
                }

                // if you aren't over an eligible block, draw a line to current position        
            } else {
                this.crafting.eventHelper.drawLinkLine(tappedContents, e.pageX, e.pageY);
            }
            
        } else if (touchState === TS_MOVE) {
            realityEditor.gui.menus.on("bigTrash",[]);
           // realityEditor.gui.pocket.pocketOnMemoryDeletionStart(); //displays the big trash can icon

            // snap if to grid position if necessary, otherwise just move block to pointer position
            var didSnap = this.crafting.eventHelper.snapBlockToCellIfPossible(tappedContents, cell, e.pageX, e.pageY); //TODO: move to inside the canPlaceBlockInCell block to avoid redundant checks
            if (!didSnap) {
                this.crafting.eventHelper.moveBlockDomToPosition(tappedContents, e.pageX, e.pageY);
            }

            // if you are over an eligible cell, style temp block to highlighted
            var cell = this.crafting.eventHelper.getCellOverPointer(e.pageX, e.pageY);
            if (this.crafting.eventHelper.canPlaceBlockInCell(tappedContents, cell)) {
                this.crafting.eventHelper.styleBlockForPlacement(tappedContents, true);

                // if you aren't over an eligible cell, style temp block to faded
            } else {
                this.crafting.eventHelper.styleBlockForPlacement(tappedContents, false);
            }
            
        } else if (touchState === TS_CUT) {
            // draw the cut line from cutLineStart to current position
            var cutLineEnd = {
                x: e.pageX,
                y: e.pageY
            };

            this.crafting.eventHelper.drawCutLine(cutLineStart, cutLineEnd);
        }
    }

    function onPointerUp(e) {
        if (realityEditor.gui.crafting.eventHelper.areAnyMenusOpen()) return;
        if (e.target !== e.currentTarget) return; // prevents event bubbling

        var cell = this.crafting.eventHelper.getCellOverPointer(e.pageX, e.pageY);
        var contents = this.crafting.eventHelper.getCellContents(cell);
        var tappedContents = globalStates.currentLogic.guiState.tappedContents;

        //this.crafting.eventHelper.toggleDatacraftingExceptPort(tappedContents, true); // always make sure the background shows again
        this.crafting.eventHelper.updateCraftingBackgroundVisibility("up", cell, globalStates.currentLogic.guiState.tappedContents);


        realityEditor.gui.menus.on("crafting",[]);
       // realityEditor.gui.pocket.pocketOnMemoryDeletionStop(); //hides the big trash can icon

        if (touchState === TS_TAP_BLOCK) {
            // for now -> do nothing
            // but in the future -> this will open the block settings screen
            this.crafting.eventHelper.styleBlockForHolding(tappedContents, false);
            clearTimeout(activeHoldTimer);

            if (!contents.block.isPortBlock) {
                if (Date.now() - startTapTime < (globalStates.craftingMoveDelay/2)) {
                    this.crafting.eventHelper.openBlockSettings(tappedContents.block);
                }
            }

        } else if (touchState === TS_HOLD) {
            // holding (not moving) a block means haven't left the cell
            // so do nothing (just put it down)
            this.crafting.eventHelper.styleBlockForHolding(tappedContents, false);

        } else if (touchState === TS_CONNECT) {

            // if you are over an eligible block, remove temp link and add real link
            if (contents && this.crafting.eventHelper.canConnectBlocks(tappedContents, contents)) {
                this.crafting.eventHelper.createLink(tappedContents, contents, globalStates.currentLogic.guiState.tempLink);
                this.crafting.eventHelper.resetTempLink();
            } else {
                this.crafting.eventHelper.resetLinkLine();
                this.crafting.eventHelper.resetTempLink(); // TODO: decide whether it's better to resetTempLink, or create a permanent link here with the last updated templink
            }

        } else if (touchState === TS_MOVE) {

            // remove entirely if dragged to menu
            var isOverSidebar = e.pageX > (globalStates.currentLogic.grid.xMargin + CRAFTING_GRID_WIDTH); //(e.pageX > window.innerWidth - (menuBarWidth + 20)); // ben change
            if (isOverSidebar) {
                this.crafting.eventHelper.removeTappedContents(tappedContents);
            } else {
                if (this.crafting.eventHelper.canPlaceBlockInCell(tappedContents, cell)) {
                    this.crafting.eventHelper.placeBlockInCell(tappedContents, cell); // move the block to the cell you're over
                } else {
                    this.crafting.eventHelper.placeBlockInCell(tappedContents, tappedContents.cell); // return the block to its original cell
                }
            }

        } else if (touchState === TS_CUT) {
            this.crafting.eventHelper.cutIntersectingLinks();
            this.crafting.eventHelper.resetCutLine();
        }

        globalStates.currentLogic.guiState.tappedContents = null;
        cutLineStart = null;
        touchState = TS_NONE;
        // this.cout("pointerUp ->" + touchState);
    }

    function onLoadBlock(object,frame,logic,block,publicData) {
        var msg = {
            object: object,
            frame: frame,
            logic:  logic,
            block:  block,
            publicData: JSON.parse(publicData)
        };

        document.getElementById('blockSettingsContainer').contentWindow.postMessage(
            JSON.stringify(msg), '*');
    }

    exports.onPointerDown = onPointerDown;
    exports.onPointerMove = onPointerMove;
    exports.onPointerUp = onPointerUp;
    exports.onLoadBlock = onLoadBlock;
    
})(realityEditor.gui.crafting.eventHandlers);


