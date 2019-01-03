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

createNameSpace("realityEditor.gui.crafting.grid");

/**
 * The Pocket button. Turns into a larger version or a delete button when
 * the user is creating memories or when the user is dragging saved
 * memories/programming blocks, respectively.
 *
 * Functions expected to be invoked globally are prefixed with "pocket"
 */
(function(exports) {

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   Data Structures - Constructors
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// the grid is the overall data structure for managing block locations and calculating routes between them
    function Grid(containerWidth, containerHeight, gridWidth, gridHeight, logicID) {

        this.size = 7; // number of rows and columns
        
        // TODO: these four properties are almost never used, except for sizing the settings and block menu - decide if necessary
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        
        this.xMargin = (containerWidth - gridWidth) / 2;
        this.yMargin = (containerHeight - gridHeight) / 2;
        
        this.blockColWidth = 2 * (gridWidth / 11);
        this.blockRowHeight = (gridHeight / 7);
        this.marginColWidth = (gridWidth / 11);
        this.marginRowHeight = this.blockRowHeight;

        this.cells = []; // array of [Cell] objects

        // initialize list of cells using the size of the grid
        for (var row = 0; row < this.size; row++) {
            for (var col = 0; col < this.size; col++) {
                var cellLocation = new CellLocation(col, row);
                var cell = new Cell(cellLocation);
                this.cells.push(cell);
            }
        }
        
        this.logicID = logicID; // the Logic Node associated with this Grid
    }

// the cell has a location in the grid, possibly an associated Block object
// and a list of which routes pass through the cell
    function Cell(location) {
        this.location = location; // CellLocation
        this.routeSegments = []; // [RouteSegment]
    }

    function CellLocation(col,row) {
        this.col = col;
        this.row = row;
        this.offsetX = 0;
        this.offsetY = 0;
    }

// the route contains the corner points and the list of all cells it passes through
    function Route(initialCellLocations) {
        this.cellLocations = []; // [CellLocation]
        this.allCells = []; // [Cell]

        if (initialCellLocations !== undefined) {
            var that = this;
            initialCellLocations.forEach( function(location) {
                that.addLocation(location.col,location.row);
            });
        }
        this.pointData = null; // list of [{screenX, screenY}]
    }

// contains useful data for keeping track of how a route passes through a cell
    function RouteSegment(route, containsHorizontal, containsVertical) {
        this.route = route;
        this.containsHorizontal = containsHorizontal;
        this.containsVertical = containsVertical;
        this.isStart = false;
        this.isEnd = false;
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   Data Structures - Methods
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// -- CELL METHODS -- //

    Cell.prototype.canHaveBlock = function() {
        return (this.location.col % 2 === 0) && (this.location.row % 2 === 0);
    };

    Cell.prototype.isMarginCell = function() {
        return this.location.row % 2 === 0 && this.location.col % 2 === 1;
    };

// utility - gets the hue for cells in a given column
    Cell.prototype.getColorHSL = function() {
        var blockColumn = Math.floor(this.location.col / 2);
        var colorMap = { blue: {h: 180, s:100, l:60}, green: {h: 122, s:100, l:60}, yellow: {h: 59, s:100, l:60}, red: {h:333, s:100, l:60} };
        var colorName = ['blue','green','yellow','red'][blockColumn];
        return colorMap[colorName];
    };

// utility - counts the number of horizontal routes in a cell
    Cell.prototype.countHorizontalRoutes = function() {
        return this.routeSegments.filter(function(value) { return value.containsHorizontal; }).length;
    };

// utility - counts the number of vertical routes in a cell
// optionally excludes start or endpoints so that routes starting in a
// block cell don't count as overlapping routes ending in a block cell
    Cell.prototype.countVerticalRoutes = function(excludeStartPoints, excludeEndPoints) {
        return this.routeSegments.filter(function(value) {
            return value.containsVertical && !((value.isStart && excludeStartPoints) || (value.isEnd && excludeEndPoints));
        }).length;
    };

// utility - checks whether the cell has a vertical route tracker for the given route
    Cell.prototype.containsVerticalSegmentOfRoute = function(route) {
        var containsVerticalSegment = false;
        this.routeSegments.forEach( function(routeSegment) {
            if (routeSegment.route === route && routeSegment.containsVertical) {
                containsVerticalSegment = true;
            }
        });
        return containsVerticalSegment;
    };

// utility - checks whether the cell has a horizontal route tracker for the given route
    Cell.prototype.containsHorizontalSegmentOfRoute = function(route) {
        var containsHorizontalSegment = false;
        this.routeSegments.forEach( function(routeSegment) {
            if (routeSegment.route === route && routeSegment.containsHorizontal) {
                containsHorizontalSegment = true;
            }
        });
        return containsHorizontalSegment;
    };

    Cell.prototype.blockAtThisLocation = function() {
        if (this.isMarginCell()) {
            var blockPosBefore = convertGridPosToBlockPos(this.location.col-1, this.location.row);
            var blockPosAfter = convertGridPosToBlockPos(this.location.col+1, this.location.row);
            var blockBefore = getBlockOverlappingPosition(blockPosBefore.x, blockPosBefore.y);
            var blockAfter = getBlockOverlappingPosition(blockPosAfter.x, blockPosAfter.y);
            if (blockBefore && blockAfter && realityEditor.gui.crafting.eventHelper.areBlocksEqual(blockBefore, blockAfter)) {
                return blockBefore;
            }
        } else if (this.canHaveBlock()) {
            var blockPos = convertGridPosToBlockPos(this.location.col, this.location.row);
            return getBlockOverlappingPosition(blockPos.x, blockPos.y);
        }
    };

    Cell.prototype.itemAtThisLocation = function() {
        var block = this.blockAtThisLocation();
        var blockGridPos = convertBlockPosToGridPos(block.x, block.y);
        var itemCol = this.location.col - blockGridPos.col;
        return convertGridPosToBlockPos(itemCol, blockGridPos.row).x;
    };

// -- ROUTE METHODS -- //

// adds a new corner location to a route
    Route.prototype.addLocation = function(col, row) {
        var skip = false;
        this.cellLocations.forEach(function(cellLocation) {
            if (cellLocation.col === col && cellLocation.row === row) { // implicitly prevent duplicate points from being added
                skip = true;
            }
        });
        if (!skip) {
            this.cellLocations.push(new CellLocation(col, row));
        }
    };

// utility - outputs how far a route travels left/right and up/down, for
// use in choosing the order of routes so that they usually don't cross
    Route.prototype.getOrderPreferences = function() {
        var lastCell = this.cellLocations[this.cellLocations.length-1];
        var firstCell = this.cellLocations[0];
        return {
            horizontal: lastCell.col - firstCell.col,
            vertical: lastCell.row - firstCell.row
        };
    };

    Route.prototype.getXYPositionAtPercentage = function(percent) {
        var pointData = this.pointData;
        if (percent >= 0 && percent <= 1) {
            var indexBefore = 0;
            for (var i = 1; i < pointData.points.length; i++) {
                var nextPercent = pointData.percentages[i];
                if (nextPercent > percent) {
                    indexBefore = i-1;
                    break;
                }
            }

            var x1 = pointData.points[indexBefore].screenX;
            var y1 = pointData.points[indexBefore].screenY;
            var x2 = pointData.points[indexBefore+1].screenX;
            var y2 = pointData.points[indexBefore+1].screenY;

            var percentOver = percent - pointData.percentages[indexBefore];
            var alpha = percentOver / (pointData.percentages[indexBefore+1] - pointData.percentages[indexBefore]);
            var x = (1 - alpha) * x1 + alpha * x2;
            var y = (1 - alpha) * y1 + alpha * y2;

            return {
                screenX: x,
                screenY: y
            };

        } else {
            return null;
        }
    };

// -- GRID METHODS -- //

//      -- GRID UTILITIES -- //

    // /**
    //  * Performs a search through all objects and frames in the system to find a logic node that matches this grid's logicID
    //  * @return {Logic|undefined}
    //  */
    // Grid.prototype.parentLogic = function() {
    //
    //     for (var objectKey in objects) {
    //         var object = objects[objectKey];
    //         for (var frameKey in object.frames) {
    //             var frame = object.frames[frameKey];
    //             for (var logicKey in frame.nodes) {
    //                 if (frame.nodes[logicKey].type === "logic") {
    //                     if (frame.nodes[logicKey].uuid === this.logicID) {
    //                         return frame.nodes[logicKey];
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //     console.warn("ERROR: DIDN'T FIND LOGIC NODE FOR THIS GRID");
    // };

    // ben change 2
    /**
     * Performs a search through all objects and frames in the system to find a logic node that matches this grid's logicID
     * @return {Logic|undefined}
     */
    Grid.prototype.parentLogic = function() {

        var foundNode = null;
        realityEditor.database.forEachNodeInAllFrames(function(frameKey, nodeKey, node) {
            if (foundNode) return;
            if (node.type === "logic") {
                if (node.uuid === this.logicID) {
                    foundNode = node;
                }
            }
        }.bind(this));

        if (foundNode) {
            return foundNode;
        }
        console.warn("ERROR: DIDN'T FIND LOGIC NODE FOR THIS GRID");
    };
    
    /**
     * Given a block link, gets the the actual points to draw on the screen to draw all of the line segments
     * @param blockLink
     * @return {Array.<{screenX: number, screenY: number}>} the x,y coordinates of corners for a link so that they can be rendered
     */
    Grid.prototype.getPointsForLink = function(blockLink) {
        var points = [];
        if (blockLink.route !== null) {
            var that = this;
            blockLink.route.cellLocations.forEach( function(location) {
                var screenX = that.getColumnCenterX(location.col) + location.offsetX - that.xMargin;
                var screenY = that.getRowCenterY(location.row) + location.offsetY - that.yMargin;
                points.push({
                    "screenX": screenX,
                    "screenY": screenY
                });
            });

        }
        return points;
    };

// utility - calculates the total width and height of the grid using the sizes of the cells
    Grid.prototype.getPixelDimensions = function() {
        var width = Math.ceil(this.size/2) * this.blockColWidth +  Math.floor(this.size/2) * this.marginColWidth;
        var height = Math.ceil(this.size/2) * this.blockRowHeight +  Math.floor(this.size/2) * this.marginRowHeight;
        return {
            "width": width,
            "height": height
        };
    };

// utility - gets a cell at a given grid location
    Grid.prototype.getCell = function(col, row) {
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            return this.cells[row * this.size + col];
        }
    };

// utility - gets width of cell, which differs for cols with blocks vs margins
    Grid.prototype.getCellWidth = function(col) {
        return (col % 2 === 0) ? this.blockColWidth : this.marginColWidth;
    };

// utility - gets height of cell, which differs for rows with blocks vs margins
    Grid.prototype.getCellHeight = function(row) {
        return (row % 2 === 0) ? this.blockRowHeight : this.marginRowHeight;
    };

// utility - gets x position of cell //TODO: update with grid margin
    Grid.prototype.getCellCenterX = function(cell) {
        var leftEdgeX = 0;
        if (cell.location.col % 2 === 0) { // this is a block cell
            leftEdgeX = (cell.location.col / 2) * (this.blockColWidth + this.marginColWidth);
            return this.xMargin + leftEdgeX + this.blockColWidth/2;

        } else { // this is a margin cell
            leftEdgeX = Math.ceil(cell.location.col / 2) * this.blockColWidth + Math.floor(cell.location.col / 2) * this.marginColWidth;
            return this.xMargin + leftEdgeX + this.marginColWidth/2;
        }
    };

// utility - gets y position of cell //TODO: update with grid margin
    Grid.prototype.getCellCenterY = function(cell) {
        var topEdgeY = 0;
        if (cell.location.row % 2 === 0) { // this is a block cell
            topEdgeY = (cell.location.row / 2) * (this.blockRowHeight + this.marginRowHeight);
            return this.yMargin + topEdgeY + this.blockRowHeight/2;

        } else { // this is a margin cell
            topEdgeY = Math.ceil(cell.location.row / 2) * this.blockRowHeight + Math.floor(cell.location.row / 2) * this.marginRowHeight;
            return this.yMargin + topEdgeY + this.marginRowHeight/2;
        }
    };

// utility - gets x position for a column
    Grid.prototype.getColumnCenterX = function(col) {
        return this.getCellCenterX(this.getCell(col,0));
    };

// utility - gets y position for a row
    Grid.prototype.getRowCenterY = function(row) {
        return this.getCellCenterY(this.getCell(0,row));
    };

// utility - true iff cells are in same row
    Grid.prototype.areCellsHorizontal = function(cell1, cell2) {
        if (cell1 && cell2) {
            return cell1.location.row === cell2.location.row;
        }
        return false;
    };

// utility - true iff cells are in same column
    Grid.prototype.areCellsVertical = function(cell1, cell2) {
        if (cell1 && cell2) {
            return cell1.location.col === cell2.location.col;
        }
        return false;
    };

// utility - if cells are in a line horizontally or vertically, returns all the cells in between them
    Grid.prototype.getCellsBetween = function(cell1, cell2) {
        var cellsBetween = [];
        if (this.areCellsHorizontal(cell1, cell2)) {
            var minCol = Math.min(cell1.location.col, cell2.location.col);
            var maxCol = Math.max(cell1.location.col, cell2.location.col);
            cellsBetween.push.apply(cellsBetween, this.cells.filter( function(cell) {
                return cell.location.row === cell1.location.row && cell.location.col > minCol && cell.location.col < maxCol;
            }));

        } else if (this.areCellsVertical(cell1, cell2)) {
            var minRow = Math.min(cell1.location.row, cell2.location.row);
            var maxRow = Math.max(cell1.location.row, cell2.location.row);
            cellsBetween.push.apply(cellsBetween, this.cells.filter( function(cell) {
                return cell.location.col === cell1.location.col && cell.location.row > minRow && cell.location.row < maxRow;
            }));
        }
        return cellsBetween;
    };

// utility - true iff a cell between the start and end actually contains a block
    Grid.prototype.areBlocksBetween = function(startCell, endCell) {
        var blocksBetween = this.getCellsBetween(startCell, endCell).filter( function(cell) {
            return cell.blockAtThisLocation() !== undefined;
        });
        return blocksBetween.length > 0;
    };

// utility - looks vertically below a location until it finds a block, or null if none in that column
    Grid.prototype.getFirstBlockBelow = function(col, row) {
        for (var r = row+1; r < this.size; r++) {
            var cell = this.getCell(col,r);
            if (cell.blockAtThisLocation()) {
                return cell.blockAtThisLocation();
            }
        }
        return null;
    };

// utility - for a given cell in a route, looks at the previous and next cells in the route to
// figure out if the cell contains a vertical path, horizontal path, or both (it's a corner)
    Grid.prototype.getLineSegmentDirections = function(prevCell,currentCell,nextCell) {
        var containsHorizontal = false;
        var containsVertical = false;
        if (this.areCellsHorizontal(currentCell, prevCell) ||
            this.areCellsHorizontal(currentCell, nextCell)) {
            containsHorizontal = true;
        }

        if (this.areCellsVertical(currentCell, prevCell) ||
            this.areCellsVertical(currentCell, nextCell)) {
            containsVertical = true;
        }
        return {
            horizontal: containsHorizontal,
            vertical: containsVertical
        };
    };

// resets the number of "horizontal" or "vertical" segments contained to 0 for all cells
    Grid.prototype.resetCellRouteCounts = function() {
        this.cells.forEach(function(cell) {
            cell.routeSegments = [];
        });
    };



    Grid.prototype.getCellsOver = function (firstCell,blockWidth,itemSelected,includeMarginCells) {
        var cells = [];
        var increment = includeMarginCells ? 1 : 2;
        for (var col = firstCell.location.col; col < firstCell.location.col + 2 * blockWidth - 1; col += increment) {
            cells.push(this.getCell(col - (itemSelected * 2), firstCell.location.row))
        }
        return cells;
    };

    Grid.prototype.getCellFromPointerPosition = function(xCoord, yCoord) {
        var col;
        var row;
        
        xCoord -= this.xMargin;
        yCoord -= this.yMargin;

        var colPairIndex = xCoord / (this.blockColWidth + this.marginColWidth);
        var fraction = colPairIndex - Math.floor(colPairIndex);

        if (fraction <= this.blockColWidth / (this.blockColWidth + this.marginColWidth)) {
            col = Math.floor(colPairIndex) * 2;
        } else {
            col = Math.floor(colPairIndex) * 2 + 1;
        }

        var rowPairIndex = yCoord / (this.blockRowHeight + this.marginRowHeight);
        fraction = rowPairIndex - Math.floor(rowPairIndex);

        if (fraction <= this.blockRowHeight / (this.blockRowHeight + this.marginRowHeight)) {
            row = Math.floor(rowPairIndex) * 2;
        } else {
            row = Math.floor(rowPairIndex) * 2 + 1;
        }

        return this.getCell(col, row);
    };

    Grid.prototype.forEachLink = function(action) {
        var logic = this.parentLogic();
        for (var linkKey in logic.links) {
            if (!logic.links.hasOwnProperty(linkKey)) continue;
            if (isInOutLink(logic.links[linkKey])) continue; // ignore in/out links for processing
            action(logic.links[linkKey]);
        }
        if (logic.guiState.tempLink) {
            action(logic.guiState.tempLink);
        }
    };

    Grid.prototype.allLinks = function() {
        var linksArray = [];
        this.forEachLink(function(link) {
            linksArray.push(link);
        });
        return linksArray;
    };

//      -- GRID ROUTING ALGORITHM -- //

// *** main method for routing ***
// first, calculates the routes (which cells they go thru)
// next, offsets each so that they don't visually overlap
// lastly, prepares points so that they can be easily rendered
    Grid.prototype.recalculateAllRoutes = function() {
        console.log("reculculate all routes!");
        var that = this;

        that.resetCellRouteCounts();

        this.forEachLink( function(link) {
            that.calculateLinkRoute(link);
        });
        var overlaps = that.determineMaxOverlaps();
        that.calculateOffsets(overlaps); // todo: still some minor bugs in the offset function

        this.forEachLink( function(link) {
            var points = that.getPointsForLink(link);
            link.route.pointData = preprocessPointsForDrawing(points);
        });
    };

// given a link, calculates all the corner points between the start block and end block,
// and sets the route of the link to contain the corner points and all the cells between
    Grid.prototype.calculateLinkRoute = function(link) {
        
        var logic = this.parentLogic();

        var nodeA = blockWithID(link.nodeA, logic);
        var nodeB = blockWithID(link.nodeB, logic);

        var startLocation = convertBlockPosToGridPos(nodeA.x + link.logicA, nodeA.y);
        var endLocation = convertBlockPosToGridPos(nodeB.x + link.logicB, nodeB.y);
        var route = new Route([startLocation]);

        // by default lines loop around the right of blocks, except for last column or if destination is to left of start
        var sideToApproachOn = 1; // to the right
        if (endLocation.col < startLocation.col || startLocation.col === 6) {
            sideToApproachOn = -1; // to the left
        }

        if (startLocation.row < endLocation.row) {
            // simplifies edge case when block is directly below by skipping rest of points
            var areBlocksBetweenInStartColumn = this.areBlocksBetween(this.getCell(startLocation.col, startLocation.row), this.getCell(startLocation.col, endLocation.row));

            if (startLocation.col !== endLocation.col || areBlocksBetweenInStartColumn) {

                // first point continues down vertically as far as it can go without hitting another block
                var firstBlockBelow = this.getFirstBlockBelow(startLocation.col, startLocation.row);
                var rowToDrawDownTo = endLocation.row-1;
                if (firstBlockBelow) {
                    var firstBlockRowBelow = convertBlockPosToGridPos(firstBlockBelow.x, firstBlockBelow.y).row;
                    rowToDrawDownTo = Math.min(firstBlockRowBelow-1, rowToDrawDownTo);
                }
                route.addLocation(startLocation.col, rowToDrawDownTo);

                if (rowToDrawDownTo < endLocation.row-1) {
                    // second point goes horizontally to the side of the start column
                    route.addLocation(startLocation.col+sideToApproachOn, rowToDrawDownTo);
                    // fourth point goes vertically to the side of the end column
                    route.addLocation(startLocation.col+sideToApproachOn, endLocation.row-1);
                }

                // fifth point goes horizontally until it is directly above center of end block
                route.addLocation(endLocation.col, endLocation.row-1);
            }

        } else {

            if (startLocation.row < this.size-1) { // first point is vertically below the start, except for bottom row
                route.addLocation(startLocation.col, startLocation.row+1);
                route.addLocation(startLocation.col + sideToApproachOn, startLocation.row+1);
            } else { // start from side of bottom row
                route.addLocation(startLocation.col + sideToApproachOn, startLocation.row);
            }

            // different things happen if destination is top row or not...
            if (endLocation.row > 0) {
                // if not top row, next point is above and to the side of the destination
                route.addLocation(startLocation.col + sideToApproachOn, endLocation.row-1);
                // last point is directly vertically above the end block
                route.addLocation(endLocation.col, endLocation.row-1);

            } else { // if it's going to the top row, approach from the side rather than above it

                // if there's nothing blocking the line from getting to the side of the end block, last point goes there
                var cellsBetween = this.getCellsBetween(this.getCell(startLocation.col, 0), this.getCell(endLocation.col, endLocation.row));
                var blocksBetween = cellsBetween.filter(function(cell){
                    return cell.blockAtThisLocation() !== undefined;
                });
                if (blocksBetween.length === 0) {
                    route.addLocation(startLocation.col + sideToApproachOn, 0);

                } else { // final exception! if there are blocks horizontally between start and end in top row, go under and up
                    // first extra point stops below top row in the column next to the start block, creating a vertical line
                    route.addLocation(startLocation.col + sideToApproachOn, 1);
                    // next extra point goes horizontally over to the column of the last block
                    route.addLocation(endLocation.col - sideToApproachOn, 1);
                    // final extra point goes vertically up to the direct side of the end block
                    route.addLocation(endLocation.col - sideToApproachOn, 0);
                }
            }
        }

        route.addLocation(endLocation.col, endLocation.row);
        route.allCells = this.calculateAllCellsContainingRoute(route);
        link.route = route;
    };

// Given the corner points for a route, finds all the cells in between, and labels each with
// "horizontal", "vertical", or both depending on which way the route goes thru that cell
    Grid.prototype.calculateAllCellsContainingRoute = function(route) {
        var allCells = [];
        for (var i=0; i < route.cellLocations.length; i++) {

            var prevCell = null;
            var currentCell = null;
            var nextCell = null;

            currentCell = this.getCell(route.cellLocations[i].col, route.cellLocations[i].row);
            if (i > 0) {
                prevCell = this.getCell(route.cellLocations[i-1].col, route.cellLocations[i-1].row);
            }
            if (i < route.cellLocations.length-1) {
                nextCell = this.getCell(route.cellLocations[i+1].col, route.cellLocations[i+1].row);
            }
            var segmentDirections = this.getLineSegmentDirections(prevCell, currentCell, nextCell);

            var routeSegment = new RouteSegment(route, segmentDirections.horizontal, segmentDirections.vertical); // corners have both vertical and horizontal. end point has only vertical //todo: except for top/bottom row?
            if (prevCell === null) {
                routeSegment.isStart = true;
            }
            if (nextCell === null) {
                routeSegment.isEnd = true;
            }
            currentCell.routeSegments.push(routeSegment);
            allCells.push(currentCell); // add endpoint cell for each segment

            var cellsBetween = this.getCellsBetween(currentCell, nextCell);
            var areNextHorizontal = this.areCellsHorizontal(currentCell, nextCell);
            var areNextVertical = !areNextHorizontal; // mutually exclusive
            cellsBetween.forEach( function(cell) {
                var routeSegment = new RouteSegment(route, areNextHorizontal, areNextVertical);
                cell.routeSegments.push(routeSegment);
            });
            allCells.push.apply(allCells, cellsBetween);
        }
        return allCells;
    };

// counts how many routes overlap eachother in each row and column, and sorts them, so that
// they can be displaced around the center of the row/column and not overlap one another
    Grid.prototype.determineMaxOverlaps = function() {
        
        var logic = this.parentLogic();
        
        var colRouteOverlaps = [];
        var horizontallySortedLinks;
        for (var c = 0; c < this.size; c++) {
            var thisColRouteOverlaps = [];
            // for each route in column
            var that = this;

            // decreases future overlaps of links in the grid by sorting them left/right
            // so that links going to the left don't need to cross over links going to the right
            horizontallySortedLinks = this.allLinks().sort(function(link1, link2){
                var p1 = link1.route.getOrderPreferences();
                var p2 = link2.route.getOrderPreferences();
                var horizontalOrder = p1.horizontal - p2.horizontal;
                var verticalOrder = p1.vertical - p2.vertical;

                var block1A = blockWithID(link1.nodeA, logic);
                var block1B = blockWithID(link1.nodeB, logic);
                var block2A = blockWithID(link2.nodeA, logic);
                var block2B = blockWithID(link2.nodeB, logic);

                var startCellLocation1 = convertBlockPosToGridPos(block1A.x, block1A.y);
                var endCellLocation1 = convertBlockPosToGridPos(block1B.x, block1B.y);

                var startCellLocation2 = convertBlockPosToGridPos(block2A.x, block2A.y);
                var endCellLocation2 = convertBlockPosToGridPos(block2B.x, block2B.y);

                // special case if link stays in same column as the start block
                var dCol1 = endCellLocation1.col - startCellLocation1.col;
                var dCol2 = endCellLocation2.col - startCellLocation2.col;

                if (p1.vertical >= 0 && p2.vertical >= 0) {
                    if (dCol1 === 0 && dCol2 === 0) { // in start col, bottom -> last
                        return verticalOrder;
                    }
                    if (dCol1 === 0 && dCol2 !== 0) { // lines to right of start col -> last, those to left -> first
                        return -1 * dCol2;
                    }
                    var diagonalOrder;
                    if (dCol1 > 0 && dCol2 > 0) { // to right of start col, topright diagonal bands -> last
                        diagonalOrder = horizontalOrder - verticalOrder;
                        if (diagonalOrder === 0) { // within same diagonal band, top -> last
                            return -1 * verticalOrder;
                        } else {
                            return diagonalOrder;
                        }
                    }
                    if (dCol1 < 0 && dCol2 < 0) { // to left of start col, bottomright diagonal bands -> last
                        diagonalOrder = horizontalOrder + verticalOrder;
                        if (diagonalOrder === 0) { // within same diagonal band, bottom -> last
                            return verticalOrder;
                        } else {
                            return diagonalOrder;
                        }
                    }
                }

                // by default, if it doesn't fit into one of those special cases, just sort by horizontal distance
                return horizontalOrder;
                //return 10 * (p1.horizontal - p2.horizontal) + 1 * (Math.abs(p2.vertical) - Math.abs(p1.vertical));
            });

            horizontallySortedLinks.forEach( function(link) {
                // filter a list of cells containing that route and that column
                var routeCellsInThisCol = link.route.allCells.filter(function(cell){return cell.location.col === c;});
                if (routeCellsInThisCol.length > 0) { // does this route contain this column?
                    var maxOverlappingVertical = 0;
                    // get the max vertical overlap of those cells
                    // only need to do this step for columns not rows because it has to do with vertical start/end points in block cells
                    var firstCellInRoute = that.getCell(link.route.cellLocations[0].col,link.route.cellLocations[0].row);
                    var lastCellInRoute = that.getCell(link.route.cellLocations[link.route.cellLocations.length-1].col, link.route.cellLocations[link.route.cellLocations.length-1].row);
                    routeCellsInThisCol.forEach(function(cell) {
                        var excludeStartPoints = (cell === lastCellInRoute);
                        var excludeEndPoints = (cell === firstCellInRoute);
                        maxOverlappingVertical = Math.max(maxOverlappingVertical, cell.countVerticalRoutes(excludeStartPoints,excludeEndPoints)); //todo: should we also keep references to the routes this overlaps?
                    });
                    // store value in a data structure for that col,route pair
                    thisColRouteOverlaps.push({
                        route: link.route, // column index can be determined from position in array
                        maxOverlap: maxOverlappingVertical
                    });
                }
            });
            colRouteOverlaps.push(thisColRouteOverlaps);
        }

        var rowRouteOverlaps = [];
        // for each route in column
        for (var r = 0; r < this.size; r++) {
            var thisRowRouteOverlaps = [];
            this.allLinks().sort(function(link1, link2){
                // vertically sorts them so that links starting near horizontal center of block are below those
                // starting near edges, so they don't overlap. requires that we sort horizontally before vertically
                var centerIndex = Math.ceil((horizontallySortedLinks.length-1)/2);
                var index1 = horizontallySortedLinks.indexOf(link1);
                var distFromCenter1 = Math.abs(index1 - centerIndex);
                var index2 = horizontallySortedLinks.indexOf(link2);
                var distFromCenter2 = Math.abs(index2 - centerIndex);
                return distFromCenter2 - distFromCenter1;
                //return 10 * (p1.vertical - p2.vertical) + 1 * (Math.abs(p2.horizontal) - Math.abs(p1.horizontal));

            }).forEach( function(link) {
                var routeCellsInThisRow = link.route.allCells.filter(function(cell){return cell.location.row === r;});
                if (routeCellsInThisRow.length > 0) { // does this route contain this column?
                    var maxOverlappingHorizontal = 0;
                    routeCellsInThisRow.forEach(function(cell) {
                        maxOverlappingHorizontal = Math.max(maxOverlappingHorizontal, cell.countHorizontalRoutes());
                    });
                    thisRowRouteOverlaps.push({
                        route: link.route, // column index can be determined from position in array
                        maxOverlap: maxOverlappingHorizontal
                    });
                }
            });
            rowRouteOverlaps.push(thisRowRouteOverlaps);
        }
        return {
            colRouteOverlaps: colRouteOverlaps,
            rowRouteOverlaps: rowRouteOverlaps
        };
    };

// After routes have been calculated and overlaps have been counted, determines the x,y offset for
// each point so that routes don't overlap one another and are spaced evenly within the cells
    Grid.prototype.calculateOffsets = function(overlaps) {
        var colRouteOverlaps = overlaps.colRouteOverlaps;
        var rowRouteOverlaps = overlaps.rowRouteOverlaps;

        var that = this;
        var maxOffset;
        var minOffset;
        var routeOverlaps;
        var numRoutesProcessed;

        for (var c = 0; c < this.size; c++) {
            maxOffset = 0.5 * this.getCellWidth(c);
            minOffset = -1 * maxOffset;
            routeOverlaps = colRouteOverlaps[c];
            numRoutesProcessed = new Array(this.size).fill(0);
            
            var numRoutesProcessedExcludingStart = new Array(this.size).fill(0);
            var numRoutesProcessedExcludingEnd = new Array(this.size).fill(0);

            routeOverlaps.forEach( function(routeOverlap) {
                var route = routeOverlap.route;
                var maxOverlap = routeOverlap.maxOverlap;

                var firstCellInRoute = that.getCell(route.cellLocations[0].col, route.cellLocations[0].row);
                var lastCellInRoute = that.getCell(route.cellLocations[route.cellLocations.length-1].col, route.cellLocations[route.cellLocations.length-1].row);

                var lineNumber = 0;
                route.allCells.filter(function(cell){return cell.location.col === c;}).forEach( function(cell) {
                    var numProcessed = 0;

                    if (cell === firstCellInRoute) {
                        // exclude endpoints... use numRoutesProcessedExcludingEnd
                        numProcessed = numRoutesProcessedExcludingEnd[cell.location.row];
                    } else if (cell === lastCellInRoute) {
                        // exclude startpoints... use numRoutesProcessedExcludingStart
                        numProcessed = numRoutesProcessedExcludingStart[cell.location.row];
                    } else {
                        numProcessed = numRoutesProcessed[cell.location.row];
                    }

                    if (cell.containsVerticalSegmentOfRoute(route)) {
                        lineNumber = Math.max(lineNumber, numProcessed);
                    }
                });
                lineNumber += 1;

                // todo: use maxOverlap of any route in this cell? or does maxOverlap already take care of that?
                var numPartitions = maxOverlap + 1;
                var width = maxOffset - minOffset;
                var spacing = width/(numPartitions);
                var offsetX = minOffset + lineNumber * spacing;
                if (maxOverlap === 0) offsetX = 0; // edge case - never adjust lines that don't overlap anything

                route.cellLocations.filter(function(location){return location.col === c;}).forEach( function(location) {
                    location.offsetX = offsetX;
                });

                route.allCells.filter(function(cell){return cell.location.col === c}).forEach( function(cell) {
                    if (cell !== firstCellInRoute) {
                        // exclude endpoints... use numRoutesProcessedExcludingEnd
                        numRoutesProcessedExcludingStart[cell.location.row] += 1;
                    }

                    if (cell !== lastCellInRoute) {
                        // exclude startpoints... use numRoutesProcessedExcludingStart
                        numRoutesProcessedExcludingEnd[cell.location.row] += 1;
                    }

                    if (cell.containsVerticalSegmentOfRoute(route)) {
                        numRoutesProcessed[cell.location.row] += 1;
                    }
                });
            });
        }

        for (var r = 0; r < this.size; r++) {
            maxOffset = 0.5 * this.getCellHeight(r);
            minOffset = -1 * maxOffset;
            routeOverlaps = rowRouteOverlaps[r];
            numRoutesProcessed = new Array(this.size).fill(0);

            routeOverlaps.forEach( function(routeOverlap) {
                var route = routeOverlap.route;
                var maxOverlap = routeOverlap.maxOverlap;

                var lineNumber = 0;
                route.allCells.filter(function(cell){return cell.location.row === r;}).forEach( function(cell) {
                    if (cell.containsHorizontalSegmentOfRoute(route)) {
                        lineNumber = Math.max(lineNumber, numRoutesProcessed[cell.location.col]);
                    }
                });
                lineNumber += 1; // actual number is one bigger than the number of routes processed
                // note: line number should never exceed maxOverlap... something went wrong if it did...

                // todo: use maxOverlap of any route in this cell? causes more things to shift but would make more correct
                var numPartitions = maxOverlap + 1;
                var width = maxOffset - minOffset;
                var spacing = width/(numPartitions);
                var offsetY = minOffset + lineNumber * spacing;
                if (maxOverlap === 0) offsetY = 0; // edge case - never adjust lines that don't overlap anything

                route.cellLocations.filter(function(location){return location.row === r;}).forEach( function(location) {
                    location.offsetY = offsetY;
                });

                route.allCells.filter(function(cell){return cell.location.row === r}).forEach( function(cell) {
                    if (cell.containsHorizontalSegmentOfRoute(route)) {
                        numRoutesProcessed[cell.location.col] += 1;
                    }
                });
            });
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
//      MISC FUNCTIONS FOR WORKING WITH CELLS, BLOCKS, GRID
////////////////////////////////////////////////////////////////////////////////

    function getBlock(x,y) {
        for (var blockKey in globalStates.currentLogic.blocks) {
            if (!globalStates.currentLogic.blocks.hasOwnProperty(blockKey)) continue;
            var block = globalStates.currentLogic.blocks[blockKey];
            if (block.x === x && block.y === y) {
                return block;
            }
        }
        return null;
    }

    function getCellForBlock(grid, block, item) {
        var gridPos = convertBlockPosToGridPos(block.x + item, block.y);
        return grid.getCell(gridPos.col, gridPos.row);
    }

    function getBlockPixelWidth(block, grid) {
        var numBlockCols = block.blockSize;
        var numMarginCols = block.blockSize - 1;
        return grid.blockColWidth * numBlockCols + grid.marginColWidth * numMarginCols;
    }

// gets a block overlapping the cell at this x,y location
    function getBlockOverlappingPosition(x, y) {
        // check if block of size >= 1 is at (x, y)
        var block = getBlock(x,y);
        if (block && block.blockSize >= 1) {
            return block;
        }
        // else check if block of size >= 2 is at (x-1, y)
        block = getBlock(x-1,y);
        if (block && block.blockSize >= 2) {
            return block;
        }
        // else check if block of size >= 3 is at (x-2, y)
        block = getBlock(x-2,y);
        if (block && block.blockSize >= 3) {
            return block;
        }

        // else check if block of size == 4 is at (x-3, y)
        block = getBlock(x-3,y);
        if (block && block.blockSize >= 4) {
            return block;
        }
        return null;
    }

    function isBlockOutsideGrid(block, grid) {
        var maxPosition = Math.ceil(grid.size/2); // 4
        return (block.x < 0 || block.y < 0 || block.y > maxPosition || (block.x + (block.blockSize-1)) > maxPosition);
    }

    function convertGridPosToBlockPos(col, row) {
        return {
            x: Math.floor(col/2),
            y: Math.floor(row/2)
        };
    }

    function convertBlockPosToGridPos(x, y) {
        return new CellLocation(x * 2, y * 2);
    }

    function addBlockLink(nodeA, nodeB, logicA, logicB, addToLogic) {
        if (nodeA && nodeB) {
            var blockLink = new BlockLink();
            blockLink.nodeA = nodeA;
            blockLink.nodeB = nodeB;
            blockLink.logicA = logicA;
            blockLink.logicB = logicB;
            
            var linkKey = isFixedNameLink(nodeA, nodeB) ? "blockLink-" + nodeA + "-" + nodeB : "blockLink" + realityEditor.device.utilities.uuidTime();
            
            blockLink.globalId = linkKey;

            if (addToLogic) {
                if (!doesLinkAlreadyExist(blockLink)) {
                    globalStates.currentLogic.links[linkKey] = blockLink;
                }
                uploadLinkIfNecessary(blockLink, linkKey);
            }
            
            return blockLink;

        }
        return null;
    }
    
    function isFixedNameLink(nodeA, nodeB) {
        return ( (isInOutBlock(nodeA) || isEdgePlaceholderBlock(nodeA)) &&
                 (isInOutBlock(nodeB) || isEdgePlaceholderBlock(nodeB)) );
    }

    function uploadLinkIfNecessary(blockLink, linkKey) {
        var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(globalStates.currentLogic);
        realityEditor.network.postNewBlockLink(keys.objectKey, keys.frameKey, keys.logicKey, linkKey, blockLink);
    }

    function blockWithID(globalID, logic) {
        return logic.blocks[globalID];
    }

    function addBlock(x,y,blockJSON,globalId,isEdgeBlock) {
        var block = new Block();

        block.type = blockJSON.type;
        block.name = blockJSON.name;
        block.x = x;
        block.y = y;
        block.blockSize = blockJSON.blockSize;
        block.globalId = globalId;
        block.checksum = null; // TODO: implement this!!
        block.privateData = blockJSON.privateData;
        block.publicData = blockJSON.publicData;
        block.activeInputs = blockJSON.activeInputs;
        block.activeOutputs = blockJSON.activeOutputs;
        block.nameInput = blockJSON.nameInput;
        block.nameOutput = blockJSON.nameOutput;
        block.iconImage = null; //TODO: implement this!!
        if (isEdgeBlock) block.isPortBlock = true;

        globalStates.currentLogic.blocks[block.globalId] = block;

        if (block.y === 0 || block.y === 3) {
            updateInOutLinks(globalId);
        }

        if (realityEditor.gui.crafting.eventHelper.shouldUploadBlock(block)) {
            var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(globalStates.currentLogic);
            realityEditor.network.postNewBlock(keys.objectKey, keys.frameKey, keys.logicKey, block.globalId, block);
        }

        return block;
    }

    function updateInOutLinks(addedBlockId) {
        var addedBlock = globalStates.currentLogic.blocks[addedBlockId];

        var namePrefix = addedBlock.y === 0 ? "in" : "out";

        // for each item in added block, remove previous link and add new one to this
        for (var i = 0; i < addedBlock.blockSize; i++) {

            var itemX = addedBlock.x + i;
            var inOutName = namePrefix + itemX;

            // remove previous link involving that in/out block
            for (var key in globalStates.currentLogic.links) {
                if (!globalStates.currentLogic.links.hasOwnProperty(key)) continue;

                var link = globalStates.currentLogic.links[key];
                if (link.nodeA === inOutName || link.nodeB === inOutName) {
                    removeBlockLink(key);
                }
            }

            if (addedBlock.y === 0) {
                addBlockLink(inOutName, addedBlock.globalId, 0, i, true);
            } else {
                addBlockLink(addedBlock.globalId, inOutName, i, 0, true);
            }

        }
    }

    function isEdgePlaceholderLink(link) {
        return (isEdgePlaceholderBlock(link.nodeA) || isEdgePlaceholderBlock(link.nodeB));
    }

    function isEdgePlaceholderBlock(blockID) {
        var re = /^(edgePlaceholder(In|Out))\d$/;
        return re.test(blockID);
    }

    function isInOutLink(link) {
        return (isInOutBlock(link.nodeA) || isInOutBlock(link.nodeB));
    }

    function isInOutBlock(blockID) {
        var re = /^(in|out)\d$/;
        return re.test(blockID);
    }

    function setTempLink(newTempLink) {
        if (!doesLinkAlreadyExist(newTempLink)) {
            globalStates.currentLogic.guiState.tempLink = newTempLink;
        }
    }

    function removeBlockLink(linkKey) {
        //if (realityEditor.gui.crafting.eventHelper.shouldUploadBlockLink(globalStates.currentLogic.links[linkKey])) {
            var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(globalStates.currentLogic);
            realityEditor.network.deleteBlockLinkFromObject(keys.objectKey, keys.frameKey, keys.logicKey, linkKey);
        //} else {
        //    deleteSurroundingBlockLinksFromServer(linkKey);
        //}
        delete globalStates.currentLogic.links[linkKey];
    }

    function removeBlock(logic, blockID) {
        removeLinksForBlock(logic, blockID);
        var domElement = logic.guiState.blockDomElements[blockID];
        if (domElement) {
            domElement.parentNode.removeChild(domElement);
        }
        if (realityEditor.gui.crafting.eventHelper.shouldUploadBlock(logic.blocks[blockID])) {
            var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(logic);
            realityEditor.network.deleteBlockFromObject(keys.objectKey, keys.frameKey, keys.logicKey, blockID);
        }
        delete logic.guiState.blockDomElements[blockID];
        delete logic.blocks[blockID];
    }

    function removeLinksForBlock(logic, blockID) {
        for (var linkKey in logic.links) {
            if (!logic.links.hasOwnProperty(linkKey)) continue;
            var link = logic.links[linkKey];
            if (link.nodeA === blockID || link.nodeB === blockID) {
                //if (realityEditor.gui.crafting.eventHelper.shouldUploadBlockLink(link)) {
                    var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(logic);
                    realityEditor.network.deleteBlockLinkFromObject(keys.objectKey, keys.frameKey, keys.logicKey, linkKey);
                //} else {
                //    deleteSurroundingBlockLinksFromServer(linkKey);
                //}
                delete logic.links[linkKey];
            }
        }
    }

    function deleteSurroundingBlockLinksFromServer(linkKey) {
        var keys = realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys(globalStates.currentLogic);
        var edgeLink = globalStates.currentLogic.links[linkKey];
        var surroundingLinks = getLinksSurroundingEdgeLink(edgeLink);
        if (surroundingLinks.length > 0) {
            surroundingLinks.forEach( function(link) {
                realityEditor.network.deleteBlockLinkFromObject(keys.objectKey, keys.frameKey, keys.logicKey, edgeBlockLinkKey(link));
            });
        }
    }

    function edgeBlockLinkKey(link) {
        return "blockLink-" + link.nodeA + "-" + link.logicA + "-" + link.nodeB + "-" + link.logicB;
    }

    function doesLinkAlreadyExist(blockLink) {
        if (!blockLink) return false;
        for (var linkKey in globalStates.currentLogic.links) {
            if (!globalStates.currentLogic.links.hasOwnProperty(linkKey)) continue;
            var thatBlockLink = globalStates.currentLogic.links[linkKey];
            if (areBlockLinksEqual(blockLink, thatBlockLink)) {
                return true;
            }
        }
        return false;
    }

    function areBlockLinksEqual(blockLink1, blockLink2) {
        if (blockLink1.nodeA === blockLink2.nodeA && blockLink1.logicA === blockLink2.logicA) {
            if (blockLink1.nodeB === blockLink2.nodeB && blockLink1.logicB === blockLink2.logicB) {
                return true;
            }
        }
        return false;
    }

// points is an array like [{screenX: x1, screenY: y1}, ...]
// calculates useful pointData for drawing lines with varying color/weight/etc,
// by determining how far along the line each corner is located (as a percentage)
    function preprocessPointsForDrawing(points) { //... only ever used here.. could just inline it
        // adds up the total length the route points travel
        var lengths = []; // size = lines.length-1
        for (var i = 1; i < points.length; i++) {
            var dx = points[i].screenX - points[i-1].screenX;
            var dy = points[i].screenY - points[i-1].screenY;
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        var totalLength = lengths.reduce(function(a,b){return a + b;}, 0);
        // calculates the percentage along the path of each point
        var prevPercent = 0.0;
        var percentages = [prevPercent];
        percentages.push.apply(percentages, lengths.map(function(length){ prevPercent += length/totalLength; return prevPercent; }));

        return {
            points: points,
            totalLength: totalLength,
            lengths: lengths,
            percentages: percentages
        };
    }

    // constructors
    exports.Grid = Grid;
    exports.Cell = Cell;
    exports.CellLocation = CellLocation;
    exports.Route = Route;
    exports.RouteSegment = RouteSegment;
    // misc functions
    //exports.getBlock = getBlock;
    exports.getCellForBlock = getCellForBlock;
    exports.getBlockPixelWidth = getBlockPixelWidth;
    exports.isBlockOutsideGrid = isBlockOutsideGrid;
    exports.convertGridPosToBlockPos = convertGridPosToBlockPos;
    exports.convertBlockPosToGridPos = convertBlockPosToGridPos;
    exports.addBlockLink = addBlockLink;
    exports.blockWithID = blockWithID;
    exports.addBlock = addBlock;
    exports.updateInOutLinks = updateInOutLinks;
    exports.isEdgePlaceholderLink = isEdgePlaceholderLink;
    exports.isEdgePlaceholderBlock = isEdgePlaceholderBlock;
    exports.isInOutBlock = isInOutBlock;
    exports.setTempLink = setTempLink;
    exports.removeBlockLink = removeBlockLink;
    exports.removeBlock = removeBlock;
    exports.removeLinksForBlock = removeLinksForBlock;
    // todo: change so doesn't need to be public
    exports.edgeBlockLinkKey = edgeBlockLinkKey;

}(realityEditor.gui.crafting.grid));
