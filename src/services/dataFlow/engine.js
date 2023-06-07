/**
 * Copyright (c) 2021 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */


/**
 * @desc Take the id of a value in objectValue and look through all links, if this id is used.
 * All links that use the id will fire up the engine to process the link.
 **/

class DataFlowEngine {
    /**
     * Create a data flow processing Engine
     * @param {object} objects
     * @param {object} dependencies
     * @param {object} dependencies.nodeTypeModules
     * @param {object} dependencies.blockModules
     * @param {object} dependencies.serviceAPI
     * @param {object} dependencies.webSocket
     * @param {object} dependencies.utilities
     * @param {object} dependencies.nodeUtilities
     **/
    constructor(objects, dependencies) {
        this.link = undefined;
        this.internalObjectDestination = undefined;
        this.blockKey = undefined;
        this.objects = objects;
        this.router = undefined;
        this.nodeTypeModules = dependencies.nodeTypeModules;
        this.blockModules = dependencies.blockModules;
        this.serviceAPI = dependencies.serviceAPI;
        this.webSocket = dependencies.webSocket;
        this.nextLogic = undefined;
        this.logic = undefined;
        this.utilities = dependencies.utilities;
        this.nodeUtilities = dependencies.nodeUtilities;
    }

    /**
     * This trigger is called on a link to trigger the processing of the node data.
     * @param {object} object
     * @param {string} frame
     * @param {string} node
     * @param {object} thisNode
     * @param {object} link
     **/
    trigger(object, frame, node, thisNode, link = null) {
        if (!thisNode.processedData) {
            thisNode.processedData = {};
        }
        thisNode.processLink = link;

        if (!this.nodeTypeModules.hasOwnProperty(thisNode.type)) {
            return;
        }

        this.nodeTypeModules[thisNode.type].render(object, frame, node, thisNode, this.processLinks.bind(this), this.nodeUtilities);
    }

    /**
     * Process links
     * @param {object} object
     * @param {string} frame
     * @param {string} node
     * @param {object} thisNode
     **/
    processLinks(object, frame, node, thisNode) {

        let thisFrame = this.utilities.getFrame(object, frame);
        // process a single link or all links for a node.
        if (thisNode.processLink) {
            this.link = thisFrame.links[thisNode.processLink];
            this.processLink(object, frame, node, thisNode, thisNode.processLink);
        } else {
            for (let linkKey in thisFrame.links) {
                this.link = thisFrame.links[linkKey];
                this.processLink(object, frame, node, thisNode, linkKey);
            }
        }
    }

    /**
     * Execute a specific Link
     * @param {object} object
     * @param {string} frame
     * @param {string} node
     * @param {object} thisNode
     * @param {string} linkKey
     **/
    processLink(object, frame, node, thisNode, linkKey) {
        if (this.link.nodeA === node && this.link.objectA === object && this.link.frameA === frame) {
            if (!this.utilities.checkObjectActivation(this.link.objectB)) {
                this.webSocket.socketSender(object, frame, linkKey, thisNode.processedData);
            } else {

                if (!this.utilities.doesNodeExist(this.link.objectB, this.link.frameB, this.link.nodeB)) return;

                this.internalObjectDestination = this.utilities.getNode(this.link.objectB, this.link.frameB, this.link.nodeB);

                // if this is a regular node, not a logic node, process normally
                if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                    this.computeProcessedData(thisNode, this.link, this.internalObjectDestination);
                } else {
                    // otherwise, process as logic node by triggering its internal blocks connected to each input
                    this.blockKey = 'in' + this.link.logicB;

                    if (this.internalObjectDestination && this.blockKey) {
                        if (this.internalObjectDestination.blocks) {
                            this.internalObjectDestination = this.internalObjectDestination.blocks[this.blockKey];

                            /* for (let key in thisNode.processedData) {
                                this.internalObjectDestination.data[0][key] = thisNode.processedData[key];
                            }*/
                            this.internalObjectDestination.data[0] = this.utilities.deepCopy(thisNode.processedData);

                            this.nextLogic = this.utilities.getNode(this.link.objectB, this.link.frameB, this.link.nodeB);
                            // this needs to be at the beginning;
                            if (!this.nextLogic.routeBuffer) {
                                this.nextLogic.routeBuffer = [0, 0, 0, 0];
                            }

                            this.nextLogic.routeBuffer[this.link.logicB] = thisNode.processedData.value;
                            this.blockTrigger(this.link.objectB, this.link.frameB, this.link.nodeB, this.blockKey, 0, this.internalObjectDestination);
                        }
                    }
                }
            }
        }
    }

    /**
     * @param {object} thisNode
     * @param {object} thisLink
     * @param {object} internalObjectDestination
     **/
    // this is a helper for internal nodes.
    computeProcessedData(thisNode, thisLink, internalObjectDestination) {
        if (!internalObjectDestination) {
            console.log('temporarily ignored undefined destination in computeProcessedData', thisLink);
            return;
        }

        // save data in local destination object;
        /*  let key;
        for (key in thisNode.processedData) {
            internalObjectDestination.data[key] = thisNode.processedData[key];
        }*/
        internalObjectDestination.data = this.utilities.deepCopy(thisNode.processedData);

        // trigger hardware API to push data to the objects
        this.serviceAPI.readCall(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination.data);

        // push the data to the editor;
        this.webSocket.sendMessagetoEditors({
            object: thisLink.objectB,
            frame: thisLink.frameB,
            node: thisLink.nodeB,
            data: internalObjectDestination.data
        });

        // trigger the next round of the engine on the next object
        this.trigger(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination);
    }

    /**
     * @param {object} object
     * @param {string} frame
     * @param {string} node
     * @param {string} block
     * @param {number} index
     * @param {object} thisBlock
     **/
    // this is when a logic block is triggered.
    blockTrigger(object, frame, node, block, index, thisBlock) {
        //  console.log(objects[object].frames[frame].nodes[node].blocks[block]);
        if (!thisBlock.processedData)
            thisBlock.processedData = [{}, {}, {}, {}];

        if (!this.blockModules.hasOwnProperty(thisBlock.type)) {
            return;
        }

        this.blockModules[thisBlock.type].render(
            object, frame, node, block, index, thisBlock,
            this.processBlockLinks.bind(this), this.nodeUtilities);
    }

    /**
     * @param {object} object
     * @param {string} frame
     * @param {string} node
     * @param {string} block
     * @param {number} index
     * @param {object} thisBlock
     **/
    // this is for after a logic block is processed.
    processBlockLinks(object, frame, node, block, index, thisBlock) {

        for (let i = 0; i < 4; i++) {

            // check if there is data to be processed
            if (typeof thisBlock.processedData[i].value === 'number' || typeof thisBlock.processedData[i].value === 'object') {

                this.router = null;

                if (block === 'out0') this.router = 0;
                if (block === 'out1') this.router = 1;
                if (block === 'out2') this.router = 2;
                if (block === 'out3') this.router = 3;

                let linkKey;

                let foundFrame = this.utilities.getFrame(object, frame);

                if (this.router !== null) {

                    for (linkKey in foundFrame.links) {
                        this.link = foundFrame.links[linkKey];

                        if (this.link.nodeA === node && this.link.objectA === object && this.link.frameA === frame && this.link.logicA === this.router) {
                            if (!(this.utilities.checkObjectActivation(this.link.objectB))) {
                                this.webSocket.socketSender(object, frame, linkKey, thisBlock.processedData[i]);
                            } else {
                                this.internalObjectDestination = this.utilities.getNode(this.link.objectB, this.link.frameB, this.link.nodeB);

                                if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                                    this.computeProcessedBlockData(thisBlock, this.link, i, this.internalObjectDestination);
                                }
                            }
                        }
                    }
                } else {
                    this.logic = this.utilities.getNode(object, frame, node);
                    // process all links in the block
                    for (linkKey in this.logic.links) {
                        if (this.logic.links[linkKey] && this.logic.links[linkKey].nodeA === block && this.logic.links[linkKey].logicA === i) {

                            this.link = this.logic.links[linkKey];

                            this.internalObjectDestination = this.logic.blocks[this.link.nodeB];
                            /* let key;
                            for (key in thisBlock.processedData[i]) {
                                this.internalObjectDestination.data[this.link.logicB][key] = thisBlock.processedData[i][key];
                            }*/
                            this.internalObjectDestination.data[this.link.logicB] = this.utilities.deepCopy(thisBlock.processedData[i]);
                            this.blockTrigger(object, frame, node, this.link.nodeB, this.link.logicB, this.internalObjectDestination);
                        }
                    }
                }
            }
        }
    }

    /**
     * @param {object} thisNode
     * @param {object} thisLink
     * @param {number} index
     * @param {object} internalObjectDestination
     **/
    computeProcessedBlockData(thisNode, thisLink, index, internalObjectDestination) {
        // save data in local destination object;
        /* for (let key1 in thisNode.processedData[index]) {
            internalObjectDestination.data[key1] = thisNode.processedData[index][key1];
        }*/
        internalObjectDestination.data = this.utilities.deepCopy(thisNode.processedData[index]);

        // trigger hardware API to push data to the objects
        this.serviceAPI.readCall(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination.data);

        // push the data to the editor;
        this.webSocket.sendMessagetoEditors({
            object: thisLink.objectB,
            frame: thisLink.frameB,
            node: thisLink.nodeB,
            data: internalObjectDestination.data
        });
        // console.log( thisNode.processedData[index].value)
        // trigger the next round of the engine on the next object
        this.trigger(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination);
    }
}

module.exports = DataFlowEngine;
