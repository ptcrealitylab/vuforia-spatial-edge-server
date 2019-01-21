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

createNameSpace("realityEditor.gui.crafting.eventHelper");

// done
realityEditor.gui.crafting.eventHelper.getCellOverPointer = function(pointerX, pointerY) {
    if(globalStates.currentLogic) {
        var grid = globalStates.currentLogic.grid;
        // returns cell if position is within grid bounds, null otherwise
        return grid.getCellFromPointerPosition(pointerX, pointerY);
    }
};

// done
realityEditor.gui.crafting.eventHelper.getCellContents = function(cell) {
    // use grid methods to get block/item overlapping this cell
    if (cell) {
        var block = cell.blockAtThisLocation();
        if (block) {
            var item = cell.itemAtThisLocation();
            return {
                block: block,
                item: item,
                cell: cell
            };
        }
    }
    return null;
};

realityEditor.gui.crafting.eventHelper.areCellsEqual = function(cell1, cell2) {
    if (!cell1 || !cell2) return false;
    return (cell1.location.col === cell2.location.col)
        && (cell1.location.row === cell2.location.row);
};

realityEditor.gui.crafting.eventHelper.areBlocksEqual = function(block1, block2) {
    return (block1.globalId === block2.globalId);
};

realityEditor.gui.crafting.eventHelper.convertToTempBlock = function(contents) {
    contents.block.isTempBlock = true;
    this.updateTempLinkOutlinesForBlock(contents);
};

realityEditor.gui.crafting.eventHelper.moveBlockDomToPosition = function(contents, pointerX, pointerY) {
    var grid = globalStates.currentLogic.grid;
    var domElement = this.getDomElementForBlock(contents.block);

    if (!domElement) return;
    domElement.style.left = (pointerX - grid.xMargin - this.offsetForItem(contents.item)) + 'px';
    domElement.style.top = (pointerY - grid.yMargin - grid.blockRowHeight/2) + 'px';
};

realityEditor.gui.crafting.eventHelper.snapBlockToCellIfPossible = function(contents, cell, pointerX, pointerY) {
    var grid = globalStates.currentLogic.grid;
    if (this.canPlaceBlockInCell(contents, cell)) {
        var dX = Math.abs(pointerX - grid.getCellCenterX(cell)) / (grid.blockColWidth/2);
        var dY = Math.abs(pointerY - grid.getCellCenterY(cell)) / (grid.blockRowHeight/2);
        var shouldSnap = ((dX * dX + dY * dY) < 0.5) && (!this.areCellsEqual(contents.cell, cell)); // only snaps to grid if tighter bound is overlapped
        if (shouldSnap) {
            this.moveBlockDomToPosition(contents, grid.getCellCenterX(cell), grid.getCellCenterY(cell));
            return true;
        }
    }
    return false;
};

realityEditor.gui.crafting.eventHelper.offsetForItem = function(item) {
    var grid = globalStates.currentLogic.grid;
    return grid.blockColWidth/2 + item * (grid.blockColWidth + grid.marginColWidth);
};

realityEditor.gui.crafting.eventHelper.canConnectBlocks = function(contents1, contents2) {
    return !this.areBlocksEqual(contents1.block, contents2.block)
        && (contents2.block.activeInputs[contents2.item] === true);
};

realityEditor.gui.crafting.eventHelper.canDrawLineFrom = function(contents) {
    return (contents.block.activeOutputs[contents.item] === true);
};

realityEditor.gui.crafting.eventHelper.areBlocksTempConnected = function(contents1, contents2) {
    var tempLink = globalStates.currentLogic.tempLink;
    if (!tempLink) return false;

    return this.areBlocksEqual(this.crafting.grid.blockWithID(tempLink.nodeA, globalStates.currentLogic), contents1.block) &&
        this.areBlocksEqual(this.crafting.grid.blockWithID(tempLink.nodeB, globalStates.currentLogic), contents2.block) &&
        tempLink.logicA === contents1.item &&
        tempLink.logicB === contents2.item;
};

realityEditor.gui.crafting.eventHelper.canPlaceBlockInCell = function(tappedContents, cell) {
    var grid = globalStates.currentLogic.grid;
    if (!cell || !tappedContents) return false;
    var cellsOver = grid.getCellsOver(cell, tappedContents.block.blockSize, tappedContents.item);
    var canPlaceBlock = true;
    cellsOver.forEach( function(cell) {
        if (!cell || !cell.canHaveBlock() || (cell.blockAtThisLocation() && !cell.blockAtThisLocation().isTempBlock && !cell.blockAtThisLocation().isPortBlock)) {
            canPlaceBlock = false;
        }
    });
    return canPlaceBlock;
};

realityEditor.gui.crafting.eventHelper.styleBlockForHolding = function(contents, startHold) {
    var domElement = this.getDomElementForBlock(contents.block);
    if (!domElement) return;
    if (startHold) {
        domElement.setAttribute('class','blockDivHighlighted blockDivMovingAbleBorder');
        domElement.firstChild.lastChild.setAttribute('class','blockMoveDiv blockDivMovingAble');
    } else {
        domElement.setAttribute('class','blockDivPlaced');
        domElement.firstChild.lastChild.setAttribute('class','blockMoveDiv');
    }
};

realityEditor.gui.crafting.eventHelper.styleBlockForPlacement = function(contents, shouldHighlight) {
    var domElement = this.getDomElementForBlock(contents.block);
    if (!domElement) return;
    if (shouldHighlight) {
        domElement.setAttribute('class','blockDivHighlighted blockDivMovingAbleBorder');
        domElement.firstChild.lastChild.setAttribute('class','blockMoveDiv blockDivMovingAble');
    } else {
        domElement.setAttribute('class','blockDivHighlighted blockDivMovingUnableBorder');
        domElement.firstChild.lastChild.setAttribute('class','blockMoveDiv blockDivMovingUnable');
    }
};

realityEditor.gui.crafting.eventHelper.updateCraftingBackgroundVisibility = function(event, cell, contents) {
    
    if (event === "down" || event === "move") {

        var currentBlock = cell.blockAtThisLocation();
        if (currentBlock && currentBlock.isPortBlock) {
            this.toggleDatacraftingExceptPort(contents, false);
        } else {
            this.toggleDatacraftingExceptPort(contents, true);
        }
        
    } else if (event === "up") {

        this.toggleDatacraftingExceptPort(contents, true);
        
    }
    
};

realityEditor.gui.crafting.eventHelper.visibilityCounter = null;
realityEditor.gui.crafting.eventHelper.toggleDatacraftingExceptPort = function(tappedContents, shouldShow) {

    var _this = this;
    if (shouldShow !== globalStates.currentLogic.guiState.isCraftingBackgroundShown) {
        console.log("show datacrafting background? " + shouldShow);
        
        var craftingBoard = document.getElementById("craftingBoard");
        var datacraftingCanvas = document.getElementById("datacraftingCanvas");
        var blockPlaceholders = document.getElementById("blockPlaceholders");
        var blocks = document.getElementById("blocks");

        if (shouldShow) {
            
            if(this.visibilityCounter){
                clearTimeout( this.visibilityCounter);
                craftingBoard.className = "craftingBoardBlur";
                this.visibilityCounter = null;
                // force the dom to re-render
                datacraftingCanvas.style.display = "inline";

                // animate opacity from 0 -> 1
                blockPlaceholders.childNodes.forEach( function(blockPlaceholderRow, rowIndex) {
                    if (!(rowIndex === 0 || rowIndex === 6)) {
                        blockPlaceholderRow.setAttribute("class", "blockPlaceholderRow visibleFadeIn");
                    }
                });
                blocks.childNodes.forEach( function(blockDom) {
                    blockDom.setAttribute("class", "blockDivPlaced visibleFadeIn");
                });
            }
            
        } else {
            
            var tappedBlock;
            if (tappedContents) {
                tappedBlock = tappedContents.block;
            }
            
            this.visibilityCounter = setTimeout( function(){
                craftingBoard.className = "craftingBoardClear"; // ben change
                datacraftingCanvas.style.display = "none";
                
                // animate opacity from 1 -> 0
                blockPlaceholders.childNodes.forEach( function(blockPlaceholderRow, rowIndex) {
                   if (!(rowIndex === 0 || rowIndex === 6)) {
                       blockPlaceholderRow.setAttribute("class", "blockPlaceholderRow invisibleFadeOut");
                   }
                });
                
                blocks.childNodes.forEach( function(blockDom) {
                    var block = realityEditor.gui.crafting.getBlockForDom(blockDom);
                    var isTappedBlock = tappedBlock && _this.areBlocksEqual(tappedBlock, block);
                    if (!(block.y === 0 || block.y === 3 || isTappedBlock)) {
                        blockDom.setAttribute("class", "blockDivPlaced invisibleFadeOut");
                    }
                });
            }, globalStates.craftingMoveDelay * 2); // takes twice as long to unblur background as it does to pick up a block
        }

        globalStates.currentLogic.guiState.isCraftingBackgroundShown = shouldShow;
    }
};

// todo why is isInOutBlock in grid by isPortBlock in here?
realityEditor.gui.crafting.eventHelper.shouldUploadBlock = function(block) {
    return !this.crafting.grid.isInOutBlock(block.globalId);// && !block.isPortBlock; //&& !(block.x === -1 || block.y === -1)
};

//realityEditor.gui.crafting.eventHelper.shouldUploadBlockLink = function(blockLink) {
//    if (!blockLink) return false;
//    //return (!this.crafting.grid.isEdgePlaceholderLink(blockLink)); // add links to surrounding instead of uploading itself
//};

/**
 * Returns all identifiers necessary to make an API request for the provided logic object
 * @param logic - logic object
 * @param block - optional param, if included it includes the block key in the return value
 * @returns {ip, objectKey, frameKey, logicKey, (optional) blockKey}
 */
realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys = function(logic, block) {

    for (var objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) continue;
        for (var frameKey in objects[objectKey].frames) {
            if (!objects[objectKey].frames.hasOwnProperty(frameKey)) continue;
            if (objects[objectKey].frames[frameKey].nodes.hasOwnProperty(logic.uuid)) {
                var keys = {
                    ip: objects[objectKey].ip,
                    objectKey: objectKey,
                    frameKey: frameKey,
                    logicKey: logic.uuid
                };
                if (block) {
                    for (var blockKey in logic.blocks){
                        if(logic.blocks[blockKey] === block) { // TODO: give each block an id property to avoid search
                            keys.blockKey = blockKey;
                        }
                    }
                }
                return keys;
            }
        }
    }
    return null;
};

realityEditor.gui.crafting.eventHelper.placeBlockInCell = function(contents, cell) {
    var grid = globalStates.currentLogic.grid;
    if (cell) {
        var prevCell = this.crafting.grid.getCellForBlock(grid, contents.block, contents.item);
        var newCellsOver = grid.getCellsOver(cell, contents.block.blockSize, contents.item);

        // if it's being moved to the top or bottom rows, delete the invisible port block underneath
        // this also saves the links connected to those port blocks so we can add them to the new block
        var portLinkData = this.removePortBlocksIfNecessary(newCellsOver);

        contents.block.x = Math.floor((cell.location.col / 2) - (contents.item));
        contents.block.y = (cell.location.row / 2);
        contents.block.isTempBlock = false;

        if (this.shouldUploadBlock(contents.block)) {
            var keys = this.getServerObjectLogicKeys(globalStates.currentLogic);
            this.realityEditor.network.postNewBlockPosition(keys.objectKey, keys.frameKey, keys.logicKey, contents.block.globalId, {x: contents.block.x, y: contents.block.y});
        }

        this.crafting.removeBlockDom(contents.block); // remove do so it can be re-rendered in the correct place
        
        var _this = this;
        portLinkData.forEach( function(linkData) {

            var nodeA = _this.crafting.grid.blockWithID(linkData.nodeA, globalStates.currentLogic);
            var nodeB = _this.crafting.grid.blockWithID(linkData.nodeB, globalStates.currentLogic);

            // if we deleted a link from the top row, add it to this block if possible
            if (nodeB && !nodeA) {
                if (contents.block.activeOutputs[linkData.logicA] === true) {
                    _this.crafting.grid.addBlockLink(contents.block.globalId, linkData.nodeB, linkData.logicA, linkData.logicB, true);
                }
                // if we deleted a link to the bottom row, add it to this block if possible
            } else if (nodeA && !nodeB) {
                if (contents.block.activeInputs[linkData.logicB] === true) {
                    _this.crafting.grid.addBlockLink(linkData.nodeA, contents.block.globalId, linkData.logicA, linkData.logicB, true);
                }
            }
        });

        if (contents.block.y === 0 || contents.block.y === 3) {
            this.crafting.grid.updateInOutLinks(contents.block.globalId);
        }
        
        // if it's being moved away from the top or bottom rows, re-add the invisible port block underneath
        if (prevCell) {
            var prevCellsOver = grid.getCellsOver(prevCell, contents.block.blockSize, contents.item);
            this.replacePortBlocksIfNecessary(prevCellsOver);
        }

        this.convertTempLinkOutlinesToLinks(contents);

        contents = null;

    } else {
        this.removeTappedContents(contents);
    }
    this.crafting.updateGrid(globalStates.currentLogic.grid);
};

realityEditor.gui.crafting.eventHelper.removePortBlocksIfNecessary = function(cells) {
    var portLinkData = [];
    var _this = this;
    cells.forEach( function(cell, i) {
        if (cell) {
            var existingBlock = cell.blockAtThisLocation();
            if (existingBlock && existingBlock.isPortBlock) {
                if (_this.isInputBlock(existingBlock)) {
                    var outgoingLinks = _this.getOutgoingLinks(existingBlock);
                    outgoingLinks.forEach(function(link) {
                        portLinkData.push({
                            nodeA: null,
                            nodeB: link.nodeB,
                            logicA: i,
                            logicB: link.logicB
                        });
                    });
                } else if (_this.isOutputBlock(existingBlock)) {
                    var incomingLinks = _this.getIncomingLinks(existingBlock);
                    incomingLinks.forEach(function(link) {
                        portLinkData.push({
                            nodeA: link.nodeA,
                            nodeB: null,
                            logicA: link.logicA,
                            logicB: i
                        });
                    });
                }
                _this.crafting.grid.removeBlock(globalStates.currentLogic, existingBlock.globalId);
            }
        }
    });
    return portLinkData;
};

// todo hasOwnProperty
realityEditor.gui.crafting.eventHelper.getOutgoingLinks = function(block) {
    var outgoingLinks = [];
    for (var linkKey in globalStates.currentLogic.links) {
        var link = globalStates.currentLogic.links[linkKey];
        if (link.nodeA === block.globalId) {
            outgoingLinks.push(link);
        }
    }
    return outgoingLinks;
};

// todo hasOwnProperty
realityEditor.gui.crafting.eventHelper.getIncomingLinks = function(block) {
    var incomingLinks = [];
    for (var linkKey in globalStates.currentLogic.links) {
        var link = globalStates.currentLogic.links[linkKey];
        if (link.nodeB === block.globalId) {
            incomingLinks.push(link);
        }
    }
    return incomingLinks;
};

realityEditor.gui.crafting.eventHelper.replacePortBlocksIfNecessary = function(cells) {
    var _this = this;
    cells.forEach( function(cell) {
        if (cell && !cell.blockAtThisLocation()) {
            if (cell.location.row === 0 || cell.location.row === globalStates.currentLogic.grid.size-1) {
                var width = 1;
                var privateData = {};
                var publicData = {};
                var activeInputs = (cell.location.row === 0) ? [false, false, false, false] : [true, false, false, false];
                var activeOutputs = (cell.location.row === 0) ? [true, false, false, false] : [false, false, false, false];
                var nameInput = ["","","",""];
                var nameOutput = ["","","",""];
                var blockPos = _this.crafting.grid.convertGridPosToBlockPos(cell.location.col, cell.location.row);
                var inOrOut = blockPos.y === 0 ? "In" : "Out";
                var type = "default";
                var name = "edgePlaceholder" + inOrOut + blockPos.x;
                var globalId = name;
                var blockJSON = _this.crafting.utilities.toBlockJSON(type, name, width, privateData, publicData, activeInputs, activeOutputs, nameInput, nameOutput);
                var block = _this.crafting.grid.addBlock(blockPos.x, blockPos.y, blockJSON, globalId, true);
            }
        }
    });
};

// todo hasOwnProperty
realityEditor.gui.crafting.eventHelper.updateTempLinkOutlinesForBlock = function(contents) {
    for (var linkKey in globalStates.currentLogic.links) {
        var link = globalStates.currentLogic.links[linkKey];
        if (link.nodeB === contents.block.globalId) {
            globalStates.currentLogic.guiState.tempIncomingLinks.push({
                nodeA: link.nodeA,
                logicA: link.logicA,
                logicB: link.logicB
            });

        } else if (link.nodeA === contents.block.globalId) {
            globalStates.currentLogic.guiState.tempOutgoingLinks.push({
                logicA: link.logicA,
                nodeB: link.nodeB,
                logicB: link.logicB
            });
        }
    }

    this.crafting.grid.removeLinksForBlock(globalStates.currentLogic, contents.block.globalId);
};

realityEditor.gui.crafting.eventHelper.convertTempLinkOutlinesToLinks = function(contents) {
    var _this = this;
    globalStates.currentLogic.guiState.tempIncomingLinks.forEach( function(linkData) {
        if (_this.blocksExist(linkData.nodeA, contents.block.globalId)) {

            if (!_this.crafting.grid.isInOutBlock(linkData.nodeA)) {
                // add regular link back
                _this.crafting.grid.addBlockLink(linkData.nodeA, contents.block.globalId, linkData.logicA, linkData.logicB, true);

            } else {
                
                // create separate links from in->edge and edge->block
                var x = linkData.nodeA.slice(-1);
                var placeholderBlockExists = !!(globalStates.currentLogic.blocks[_this.edgePlaceholderName(true, x)]);
                if (placeholderBlockExists)  {
                    _this.crafting.grid.addBlockLink(linkData.nodeA, _this.edgePlaceholderName(true, x), linkData.logicA, linkData.logicB, true);
                    _this.crafting.grid.addBlockLink(_this.edgePlaceholderName(true, x), contents.block.globalId, linkData.logicA, linkData.logicB, true);
                }
                
            }

        }
    });

    globalStates.currentLogic.guiState.tempOutgoingLinks.forEach( function(linkData) {
        if (_this.blocksExist(linkData.nodeB, contents.block.globalId)) {

            if (!_this.crafting.grid.isInOutBlock(linkData.nodeB)) {
                // add regular link back
                _this.crafting.grid.addBlockLink(contents.block.globalId, linkData.nodeB, linkData.logicA, linkData.logicB, true);

            } else {
                // create separate links from block->edge and edge->out
                var x = linkData.nodeB.slice(-1);
                var placeholderBlockExists = !!(globalStates.currentLogic.blocks[_this.edgePlaceholderName(false, x)]);
                if (placeholderBlockExists) {
                    _this.crafting.grid.addBlockLink(contents.block.globalId, _this.edgePlaceholderName(false, x), linkData.logicA, linkData.logicB, true);
                    _this.crafting.grid.addBlockLink(_this.edgePlaceholderName(false, x), linkData.nodeB, linkData.logicA, linkData.logicB, true);
                }
            }
        }
    });

    this.resetTempLinkOutlines();
};

realityEditor.gui.crafting.eventHelper.edgePlaceholderName = function(isInBlock, x) {
    return isInBlock ? "edgePlaceholderIn" + x : "edgePlaceholderOut" + x;
};

realityEditor.gui.crafting.eventHelper.blocksExist = function(block1ID, block2ID) {
    var blocks = globalStates.currentLogic.blocks;
    return !!(blocks[block1ID]) && !!(blocks[block2ID]);
};

realityEditor.gui.crafting.eventHelper.resetTempLinkOutlines = function() {
    globalStates.currentLogic.guiState.tempIncomingLinks = [];
    globalStates.currentLogic.guiState.tempOutgoingLinks = [];
};

realityEditor.gui.crafting.eventHelper.removeTappedContents = function(contents) {
    var grid = globalStates.currentLogic.grid;
    this.resetTempLinkOutlines();
    this.crafting.grid.removeBlock(globalStates.currentLogic, contents.block.globalId);

    // replace port blocks if necessary
    var prevCell = this.crafting.grid.getCellForBlock(grid, contents.block, contents.item);
    if (prevCell) {
        var prevCellsOver = grid.getCellsOver(prevCell, contents.block.blockSize, contents.item);
        this.replacePortBlocksIfNecessary(prevCellsOver);
    }

    contents = null;
    this.crafting.updateGrid(globalStates.currentLogic.grid);
};

realityEditor.gui.crafting.eventHelper.createTempLink = function(contents1, contents2) {
    var newTempLink = this.crafting.grid.addBlockLink(contents1.block.globalId, contents2.block.globalId, contents1.item, contents2.item, false);
    this.crafting.grid.setTempLink(newTempLink);
    this.crafting.updateGrid(globalStates.currentLogic.grid);
};

realityEditor.gui.crafting.eventHelper.resetTempLink = function() {
    this.crafting.grid.setTempLink(null);
    this.crafting.updateGrid(globalStates.currentLogic.grid);
};

realityEditor.gui.crafting.eventHelper.drawLinkLine = function(contents, endX, endY) {
    var grid = globalStates.currentLogic.grid;
    var tempLine = globalStates.currentLogic.guiState.tempLine;
    // actual drawing happens in index.js loop, we just need to set endpoint here
    var startX = grid.getCellCenterX(contents.cell);
    var startY = grid.getCellCenterY(contents.cell);
    var hsl = contents.cell.getColorHSL();
    var lineColor = 'hsl(' + hsl.h + ', '+ hsl.s +'%,'+ hsl.l +'%)';
    tempLine.start = {
        x: startX - grid.xMargin,
        y: startY - grid.yMargin
    };
    tempLine.end = {
        x: endX - grid.xMargin,
        y: endY - grid.yMargin
    };
    tempLine.color = lineColor;
};

realityEditor.gui.crafting.eventHelper.resetLinkLine = function() {
    var tempLine = globalStates.currentLogic.guiState.tempLine;
    tempLine.start = null;
    tempLine.end = null;
    tempLine.color = null;
};

realityEditor.gui.crafting.eventHelper.drawCutLine = function(start, end) {
    var grid = globalStates.currentLogic.grid;
    var cutLine = globalStates.currentLogic.guiState.cutLine;
    // actual drawing happens in index.js loop, we just need to set endpoint here
    cutLine.start = {
        x: start.x - grid.xMargin,
        y: start.y - grid.yMargin
    };
    cutLine.end = {
        x: end.x - grid.xMargin,
        y: end.y - grid.yMargin
    };
};

realityEditor.gui.crafting.eventHelper.resetCutLine = function() {
    var cutLine = globalStates.currentLogic.guiState.cutLine;
    cutLine.start = null;
    cutLine.end = null;
};

realityEditor.gui.crafting.eventHelper.createLink = function(contents1, contents2, tempLink) {
    var addedLink = this.crafting.grid.addBlockLink(contents1.block.globalId, contents2.block.globalId, contents1.item, contents2.item, true);
    if (addedLink && tempLink) {
        addedLink.route = tempLink.route; // copy over the route rather than recalculating everything
        addedLink.ballAnimationCount = tempLink.ballAnimationCount;
    }
};

// todo hasOwnProperty
realityEditor.gui.crafting.eventHelper.cutIntersectingLinks = function() {
    var cutLine = globalStates.currentLogic.guiState.cutLine;
    if (!cutLine || !cutLine.start || !cutLine.end) return;
    var didRemoveAnyLinks = false;
    for (var linkKey in globalStates.currentLogic.links) {
        var didIntersect = false;
        var blockLink = globalStates.currentLogic.links[linkKey];
        var points = globalStates.currentLogic.grid.getPointsForLink(blockLink);
        for (var j = 1; j < points.length; j++) {
            var start = points[j - 1];
            var end = points[j];
            if (this.gui.utilities.checkLineCross(start.screenX, start.screenY, end.screenX, end.screenY, cutLine.start.x, cutLine.start.y, cutLine.end.x, cutLine.end.y)) {
                didIntersect = true;
            }
            if (didIntersect) {
                this.crafting.grid.removeBlockLink(linkKey);
                didRemoveAnyLinks = true;
            }
        }
    }
    if (didRemoveAnyLinks) {
        this.crafting.updateGrid(globalStates.currentLogic.grid);
    }
};

realityEditor.gui.crafting.eventHelper.getDomElementForBlock = function(block) {
    if (block.isPortBlock) return;
    return globalStates.currentLogic.guiState.blockDomElements[block.globalId];
};

realityEditor.gui.crafting.eventHelper.generateBlockGlobalId = function() {
    return "block" + this.realityEditor.device.utilities.uuidTime();
};

realityEditor.gui.crafting.eventHelper.isInputBlock = function(block) {
    return block.isPortBlock && block.y === 0;
};

realityEditor.gui.crafting.eventHelper.isOutputBlock = function(block) {
    return block.isPortBlock && !this.isInputBlock(block);
};

realityEditor.gui.crafting.eventHelper.addBlockFromMenu = function(blockJSON, pointerX, pointerY) {
    var globalId = this.generateBlockGlobalId();
    var addedBlock = this.crafting.grid.addBlock(-1, -1, blockJSON, globalId); // TODO: only upload after you've placed it
    this.crafting.addDomElementForBlock(addedBlock, globalStates.currentLogic.grid, true);

    globalStates.currentLogic.guiState.tappedContents = {
        block: addedBlock,
        item: 0,
        cell: null
    };
    
    this.crafting.eventHandlers.onPointerMove({
        pageX: pointerX,
        pageY: pointerY
    }, true);
};

//temporarily hide all other datacrafting divs. redisplay them when menu hides
realityEditor.gui.crafting.eventHelper.changeDatacraftingDisplayForMenu = function(newDisplay) {
    document.getElementById("datacraftingCanvas").style.display = newDisplay;
    document.getElementById("blockPlaceholders").style.display = newDisplay;
    document.getElementById("blocks").style.display = newDisplay;
    document.getElementById("datacraftingEventDiv").style.display = newDisplay;
    
    if (newDisplay === 'none') {
        document.getElementById("craftingMenusContainer").style.display = '';
    } else {
        document.getElementById("craftingMenusContainer").style.display = 'none';
    }
};

realityEditor.gui.crafting.eventHelper.areAnyMenusOpen = function() {
    return document.getElementById('craftingMenusContainer').style.display !== 'none';
};

realityEditor.gui.crafting.eventHelper.openBlockSettings = function(block) {

    this.changeDatacraftingDisplayForMenu('none');
    
    var keys = this.getServerObjectLogicKeys(globalStates.currentLogic, block);
    var settingsUrl = 'http://' + keys.ip + ':' + SERVER_PORT + '/logicBlock/' + block.name + "/index.html";
    var craftingMenusContainer = document.getElementById('craftingMenusContainer');
    var blockSettingsContainer = document.createElement('iframe');
    blockSettingsContainer.setAttribute('id', 'blockSettingsContainer');
    blockSettingsContainer.setAttribute('class', 'settingsContainer');

    // center on iPad
    blockSettingsContainer.classList.add('centerVerticallyAndHorizontally');
    var scaleMultiplier = Math.max(globalStates.currentLogic.grid.containerHeight / globalStates.currentLogic.grid.gridHeight, globalStates.currentLogic.grid.containerWidth / globalStates.currentLogic.grid.gridWidth);
    blockSettingsContainer.style.transform = 'scale(' + scaleMultiplier + ')';
    
    blockSettingsContainer.setAttribute("onload", "realityEditor.gui.crafting.eventHandlers.onLoadBlock('" + keys.objectKey + "','" + keys.frameKey + "','" + keys.logicKey + "','" + keys.blockKey + "','" + JSON.stringify(block.publicData) + "')");
    blockSettingsContainer.src = settingsUrl;
    
    craftingMenusContainer.appendChild(blockSettingsContainer);
    
    realityEditor.gui.menus.buttonOn("crafting", "logicSetting");
};

realityEditor.gui.crafting.eventHelper.hideBlockSettings = function() {
    
    var wasBlockSettingsOpen = false;
    var container = document.getElementById('blockSettingsContainer');
    if (container) {

        this.changeDatacraftingDisplayForMenu('');
        
        container.parentNode.removeChild(container);
        wasBlockSettingsOpen = true;
    }
    return wasBlockSettingsOpen;
};

realityEditor.gui.crafting.eventHelper.openNodeSettings = function() {
    if (document.getElementById('menuContainer') && document.getElementById('menuContainer').style.display !== "none") {
        return;
    }
    
    var logic = globalStates.currentLogic;
    
    // 1. temporarily hide all other datacrafting divs. redisplay them when menu hides
    this.changeDatacraftingDisplayForMenu('none');

    // 2. create and display the settings container

    var nodeSettingsContainer = document.createElement('iframe');
    nodeSettingsContainer.setAttribute('id', 'nodeSettingsContainer');
    nodeSettingsContainer.setAttribute('class', 'settingsContainer');

    nodeSettingsContainer.classList.add('centerVerticallyAndHorizontally');
    
    // center on iPads
    // nodeSettingsContainer.style.marginLeft = logic.grid.xMargin + 'px';
    // nodeSettingsContainer.style.marginTop = logic.grid.yMargin + 'px';

    // nodeSettingsContainer.style.width = globalStates.currentLogic.grid.gridWidth + 'px';
    // nodeSettingsContainer.style.height = globalStates.currentLogic.grid.gridHeight + 'px';

    var scaleMultiplier = Math.max(logic.grid.containerHeight / logic.grid.gridHeight, logic.grid.containerWidth / logic.grid.gridWidth);
    nodeSettingsContainer.style.transform = 'scale(' + scaleMultiplier + ')';

    // nodeSettingsContainer.setAttribute("onload", "realityEditor.gui.crafting.eventHandlers.onLoadBlock('" + keys.objectKey + "','" + keys.frameKey + "','" + keys.logicKey + "','" + keys.blockKey + "','" + JSON.stringify(block.publicData) + "')");
    nodeSettingsContainer.src = 'src/crafting/nodeSettings.html'; //'src/gui/crafting/nodeSettings.html'; // ben change
    
    nodeSettingsContainer.onload = function() {

        var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(logic);

        var logicNodeData = {
            
            version: 300, //realityEditor.getObject(keys.objectKey).integerVersion, // ben change
            ip: keys.ip,
            httpPort: SERVER_PORT,
            
            objectKey: keys.objectKey,
            frameKey: keys.frameKey,
            nodeKey: keys.logicKey,
            
            objectName: objectName, //realityEditor.getObject(keys.objectKey).name,
            logicName: logic.name,
            
            iconImageState: logic.iconImage,
            autoImagePath: realityEditor.gui.crafting.getSrcForAutoIcon(logic)
        };
        
        nodeSettingsContainer.contentWindow.postMessage(JSON.stringify(logicNodeData), '*');
        
    };
    
    var craftingMenusContainer = document.getElementById('craftingMenusContainer');
    craftingMenusContainer.appendChild(nodeSettingsContainer);

    realityEditor.gui.menus.on("crafting",["logicSetting"]);
};

realityEditor.gui.crafting.eventHelper.hideNodeSettings = function() {
    var wasBlockSettingsOpen = false;
    var container = document.getElementById('nodeSettingsContainer');
    if (container) {
        container.parentNode.removeChild(container);
        //temporarily hide all other datacrafting divs. redisplay them when menu hides
        this.changeDatacraftingDisplayForMenu('');

        wasBlockSettingsOpen = true;
    }
    return wasBlockSettingsOpen;
};
