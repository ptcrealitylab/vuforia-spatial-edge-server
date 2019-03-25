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

createNameSpace("realityEditor.gui.crafting.utilities");

realityEditor.gui.crafting.utilities.toBlockJSON = function(type, name, blockSize, privateData, publicData, activeInputs, activeOutputs, nameInput, nameOutput) {
    return {
        type: type,
        name: name,
        blockSize: blockSize,
        privateData: privateData,
        publicData: publicData,
        activeInputs: activeInputs,
        activeOutputs: activeOutputs,
        nameInput: nameInput,
        nameOutput: nameOutput
    };
};

realityEditor.gui.crafting.utilities.convertBlockLinkToServerFormat = function(blockLink) {
    var serverLink = {};

    var keysToSkip = ["route"]; //, "nodeA", "nodeB"
    for (var key in blockLink) {
        if (!blockLink.hasOwnProperty(key)) continue;
        if (keysToSkip.indexOf(key) > -1) continue;
        serverLink[key] = blockLink[key];
    }

    serverLink["route"] = null;

    return serverLink;
};

// strips away unnecessary data from logic node that can be easily regenerated
realityEditor.gui.crafting.utilities.convertLogicToServerFormat = function(logic) {

    var logicServer = {};

    var keysToSkip = ["guiState", "grid", "blocks", "links"];
    for (var key in logic) {
        if (!logic.hasOwnProperty(key)) continue;
        if (keysToSkip.indexOf(key) > -1) continue;
        logicServer[key] = logic[key];
    }

    // VERY IMPORTANT: otherwise the node will think it's already loaded
    // and won't load from the server next time you open the app
    logicServer["loaded"] = false;
    logicServer["visible"] = false;

    // don't upload in/out blocks, those are always the same and live in the editor?
    logicServer["blocks"] = {};
    // logicServer["blockData"] = {}; // TODO: did I hide a bug by adding this line
    for (var key in logic.blocks) {
        if (!logic.blocks.hasOwnProperty(key)) continue;
        if (!this.crafting.grid.isInOutBlock(key)) {
            // logicServer.blockData[key] = logic.blocks[key]; // TODO: this used to cause a bug
            logicServer.blocks[key] = logic.blocks[key]; // TODO: this used to cause a bug
        }
    }
    
    // TODO: make sure this doesn't cause bugs somewhere else
    logicServer["links"] = {};
    for (var key in logic.links) {
        if (!logic.links.hasOwnProperty(key)) continue;
        logicServer.links[key] = this.convertBlockLinkToServerFormat(logic.links[key]);
    }
    
    return logicServer;
};

/*
// todo hasOwnProperty
// convert links from in/out -> block not in edge row into 2 links, one from in/out->edge and another from edge->block
// this puts the data in a format that is convenient for the UI while keeping the server data efficient
realityEditor.gui.crafting.utilities.convertLinksFromServer = function(logic) {
    
    // add block/link methods haven't been generalized to work on any logic,
    // it currently relies on currentLogic, so we need to set/reset that around this method // todo: generalize these logic methods so this hack isn't necessary
    var priorLogic = globalStates.currentLogic;
    globalStates.currentLogic = logic;

    for (var linkKey in logic.links) {
        var link = logic.links[linkKey];

        if (this.crafting.grid.isInOutBlock(link.nodeA) && logic.blocks[link.nodeB] && logic.blocks[link.nodeB].y !== 0) {
            // create separate links from in->edge and edge->block
            var x = link.nodeA.slice(-1);
            this.crafting.grid.addBlockLink(link.nodeA, this.crafting.eventHelper.edgePlaceholderName(true, x), link.logicA, link.logicB, true);
            this.crafting.grid.addBlockLink(this.crafting.eventHelper.edgePlaceholderName(true, x), link.nodeB, link.logicA, link.logicB, true);

            delete logic.links[linkKey];

        } else if (this.crafting.grid.isInOutBlock(link.nodeB) && logic.blocks[link.nodeA] && logic.blocks[link.nodeA].y !== 3) {

            // create separate links from block->edge and edge->out
            var x = link.nodeB.slice(-1);
            this.crafting.grid.addBlockLink(link.nodeA, this.crafting.eventHelper.edgePlaceholderName(false, x), link.logicA, link.logicB, true);
            this.crafting.grid.addBlockLink(this.crafting.eventHelper.edgePlaceholderName(false, x), link.nodeB, link.logicA, link.logicB, true);

            delete logic.links[linkKey];
        }
    }

    // restore prior state
    globalStates.currentLogic = priorLogic;
    
};
*/
