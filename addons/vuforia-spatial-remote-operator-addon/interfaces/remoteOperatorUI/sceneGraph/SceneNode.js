/*
* Created by Ben Reynolds on 07/13/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

const utils = require('./utilities.js');

module.exports = class SceneNode {
    /**
     * Defines a node in our scene graph
     * @constructor
     */
    constructor(id) {
        this.localMatrix = utils.newIdentityMatrix();
        this.worldMatrix = utils.newIdentityMatrix();
        this.children = [];
        this.id = id; // mostly attached for debugging
        this.parent = null;
        this.tags = {}; // can be used to label nodes and query the graph

        // if true, any nodes added to this will instead be added to a child of this rotating 90deg
        this.needsRotateX = false;

        this.needsRecompute = true; // if true, triggers recompute on sub-tree
        this.needsRerender = true;
        this.anythingInSubtreeNeedsRerender = true;
        this.anythingInSubtreeNeedsRecompute = true;
        this.needsUploadToServer = false;

        // this can be set true when sceneGraph is updated as a result of remote activity
        this.dontBroadcastNext = false;
    }

    /**
     * Sets the parent node of this node, so that it is positioned relative to that
     * @param {SceneNode} parent
     */
    setParent(parent) {
        if (parent && this.parent && parent === this.parent) {
            return; // ignore duplicate function calls
        }

        // remove us from our parent
        if (this.parent) {
            let index = this.parent.children.indexOf(this);
            if (index > -1) {
                this.parent.children.splice(index, 1);
            }
        }

        // add us to our new parent
        if (parent) {
            parent.children.push(this);
        }
        this.parent = parent;

        // recompute now that we're part of a new parent subtree
        this.flagForRecompute();
    }

    getAccumulatedParentScale() {
        let totalParentScale = 1;
        let parentPointer = this.parent;
        while (parentPointer) {
            let thisParentScale = parentPointer.getVehicleScale(true); // important: avoid infinite loop with "true"
            totalParentScale *= thisParentScale;
            parentPointer = parentPointer.parent;
        }
        return totalParentScale;
    }

    getTransformMatrix() {
        // extracts correctly for frames or nodes
        let x = this.getVehicleX();
        let y = this.getVehicleY();
        let scale = this.getVehicleScale();
        return [scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            x, y, 0, 1];
    }

    /**
     * Compute where this node is relative to the scene origin
     * @param {Array.<number>} parentWorldMatrix
     */
    updateWorldMatrix(parentWorldMatrix) {
        if (this.needsRecompute) {
            if (parentWorldMatrix) {
                // this.worldMatrix stores fully-multiplied position relative to origin
                utils.multiplyMatrix(this.localMatrix, parentWorldMatrix, this.worldMatrix);
            } else {
                // if no parent, localMatrix is worldMatrix
                utils.copyMatrixInPlace(this.localMatrix, this.worldMatrix);
            }

            this.needsRecompute = false; // reset dirty flag so we don't repeat this redundantly
            this.flagForRerender();
        }

        // process all of its children to update entire subtree
        if (this.anythingInSubtreeNeedsRecompute) {
            this.children.forEach(function(childNode) {
                childNode.updateWorldMatrix(this.worldMatrix);
            }.bind(this));
        }

        this.anythingInSubtreeNeedsRecompute = false;
    }

    setLocalMatrix(matrix) {
        if (!matrix || matrix.length !== 16) { return; } // ignore malformed/empty input
        utils.copyMatrixInPlace(matrix, this.localMatrix);

        // flagging this will eventually set the other necessary flags for this and parent/children nodes
        this.flagForRecompute();
    }

    flagForRerender() {
        this.needsRerender = true;
        this.flagContainingSubtreeForRerender();
    }

    flagContainingSubtreeForRerender() {
        this.anythingInSubtreeNeedsRerender = true;
        if (this.parent) {
            this.parent.flagContainingSubtreeForRerender();
        }
    }

    flagForRecompute() {
        this.needsRecompute = true;
        this.flagContainingSubtreeForRecompute();

        // make sure all children get recomputed too, because they are relative to this
        this.children.forEach(function(childNode) {
            childNode.flagForRecompute();
        }.bind(this));
    }

    flagContainingSubtreeForRecompute() {
        this.anythingInSubtreeNeedsRecompute = true;
        if (this.parent && !this.parent.anythingInSubtreeNeedsRecompute) {
            this.parent.flagContainingSubtreeForRecompute();
        }
    }

    getMatrixRelativeTo(otherNode) {
        // note that this could be one frame out-of-date if this is flaggedForRecompute
        let thisWorldMatrix = this.worldMatrix;
        let thatWorldMatrix = otherNode.worldMatrix;

        // if they're the same, we should get identity matrix
        let relativeMatrix = [];
        utils.multiplyMatrix(thisWorldMatrix, utils.invertMatrix(thatWorldMatrix), relativeMatrix);

        return relativeMatrix;
    }

    // figures out what local matrix this node would need to position it globally at the provided world matrix
    calculateLocalMatrix(worldMatrix) {
        // get the world matrix of the node's parent = parentWorldMatrix
        let parentWorldMatrix = this.parent.worldMatrix;
        // compute the difference between desired worldMatrix and parentWorldMatrix
        let relativeMatrix = [];
        utils.multiplyMatrix(worldMatrix, utils.invertMatrix(parentWorldMatrix), relativeMatrix);
        // return that difference

        return relativeMatrix;
    }

    setPositionRelativeTo(otherSceneNode, relativeMatrix) {
        if (typeof relativeMatrix === 'undefined') { relativeMatrix = utils.newIdentityMatrix(); }

        // compute new localMatrix so that
        // this.localMatrix * parentNode.worldMatrix = relativeMatrix * otherSceneNode.worldMatrix
        // solving for localMatrix yields:
        // this.localMatrix = relativeMatrix * otherSceneNode.worldMatrix * inv(parentNode.worldMatrix)

        let temp = [];
        let result = [];
        utils.multiplyMatrix(otherSceneNode.worldMatrix, utils.invertMatrix(this.parent.worldMatrix), temp);
        utils.multiplyMatrix(relativeMatrix, temp, result);

        this.setLocalMatrix(result);
    }

    addTag(tagName) {
        this.tags[tagName] = true;
    }

    removeTag(tagName) {
        delete this.tags[tagName];
    }
};
