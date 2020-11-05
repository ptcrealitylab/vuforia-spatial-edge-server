let utils = require('./utils');

const globalFrameScaleAdjustment = 0.5;
const globalNodeScaleAdjustment = 0.5;

/**
 * Defines a node in our scene graph
 * @constructor
 */
function SceneNode(id) {
    this.localMatrix = utils.newIdentityMatrix();
    this.worldMatrix = utils.newIdentityMatrix();
    this.children = [];
    this.id = id; // mostly attached for debugging
    this.parent = null;

    // if true, any nodes added to this will instead be added to a child of this rotating 90deg
    this.needsRotateX = false;

    this.needsRecompute = true; // if true, triggers recompute on sub-tree
    this.needsRerender = true;
    this.anythingInSubtreeNeedsRerender = true;
    this.anythingInSubtreeNeedsRecompute = true;

    // if a vehicle is linked, updating the sceneNode position will set the linkedVehicle position?
    this.linkedVehicle = null;
}

/**
 * Sets the parent node of this node, so that it is positioned relative to that
 * @param {SceneNode} parent
 */
SceneNode.prototype.setParent = function(parent) {
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
};

SceneNode.prototype.getVehicleX = function() {
    if (!this.linkedVehicle) { return 0; }
    if (typeof this.linkedVehicle.ar !== 'undefined') {
        return this.linkedVehicle.ar.x || 0;
    }
    if (typeof this.linkedVehicle.x !== 'undefined') {
        return this.linkedVehicle.x || 0;
    }
    return 0;
};

SceneNode.prototype.getVehicleY = function() {
    if (!this.linkedVehicle) { return 0; }
    if (typeof this.linkedVehicle.ar !== 'undefined') {
        return this.linkedVehicle.ar.y || 0;
    }
    if (typeof this.linkedVehicle.y !== 'undefined') {
        return this.linkedVehicle.y || 0;
    }
    return 0;
};

SceneNode.prototype.getVehicleScale = function(includeParentScale) {
    if (!this.linkedVehicle) { return 1; }

    // parent scale is multiplied in by default - keep this at 1 to include it
    let parentScaleRemoval = 1;
    if (!includeParentScale) {
        // accumulate all the scales of parents with linkedVehicles so that it doesnt shrink exponentially based
        // on parent scale
        parentScaleRemoval = this.getAccumulatedParentScale();
    }

    if (typeof this.linkedVehicle.ar !== 'undefined') {
        return this.linkedVehicle.ar.scale / parentScaleRemoval * globalFrameScaleAdjustment;
    }
    if (typeof this.linkedVehicle.scale !== 'undefined') {
        return this.linkedVehicle.scale / parentScaleRemoval * globalNodeScaleAdjustment;
    }
    return 1;
};

SceneNode.prototype.getAccumulatedParentScale = function() {
    let totalParentScale = 1;
    let parentPointer = this.parent;
    while (parentPointer) {
        let thisParentScale = parentPointer.getVehicleScale(true); // important: avoid infinite loop with "true"
        totalParentScale *= thisParentScale;
        parentPointer = parentPointer.parent;
    }
    return totalParentScale;
};

SceneNode.prototype.getTransformMatrix = function() {
    // extracts correctly for frames or nodes
    let x = this.getVehicleX();
    let y = this.getVehicleY();
    let scale = this.getVehicleScale();
    return [scale, 0, 0, 0,
        0, scale, 0, 0,
        0, 0, scale, 0,
        x, y, 0, 1];
};

/**
 * Compute where this node is relative to the scene origin
 * @param {Array.<number>} parentWorldMatrix
 */
SceneNode.prototype.updateWorldMatrix = function(parentWorldMatrix) {
    if (this.needsRecompute) {
        if (parentWorldMatrix) {
            // this.worldMatrix stores fully-multiplied position relative to origin
            utils.multiplyMatrix(this.localMatrix, parentWorldMatrix, this.worldMatrix);
        } else {
            // if no parent, localMatrix is worldMatrix
            utils.copyMatrixInPlace(this.localMatrix, this.worldMatrix);
        }

        // if this has a linkedVehicle, multiply the positionData (x,y,scale) into the worldMatrix
        if (this.linkedVehicle) {
            let temp = [];
            utils.multiplyMatrix(this.getTransformMatrix(), this.worldMatrix, temp);
            this.worldMatrix = temp;
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
};

SceneNode.prototype.setLocalMatrix = function(matrix) {
    if (!matrix || matrix.length !== 16) { return; } // ignore malformed/empty input
    utils.copyMatrixInPlace(matrix, this.localMatrix);

    if (this.linkedVehicle) {
        // realityEditor.gui.ar.positioning.setPositionDataMatrix(this.linkedVehicle, matrix);
    }

    // flagging this will eventually set the other necessary flags for this and parent/children nodes
    this.flagForRecompute();
};

SceneNode.prototype.flagForRerender = function() {
    this.needsRerender = true;
    this.flagContainingSubtreeForRerender();
};

SceneNode.prototype.flagContainingSubtreeForRerender = function() {
    this.anythingInSubtreeNeedsRerender = true;
    if (this.parent) {
        this.parent.flagContainingSubtreeForRerender();
    }
};

SceneNode.prototype.flagForRecompute = function() {
    this.needsRecompute = true;
    this.flagContainingSubtreeForRecompute();

    // make sure all children get recomputed too, because they are relative to this
    this.children.forEach(function(childNode) {
        childNode.flagForRecompute();
    }.bind(this));
};

SceneNode.prototype.flagContainingSubtreeForRecompute = function() {
    this.anythingInSubtreeNeedsRecompute = true;
    if (this.parent && !this.parent.anythingInSubtreeNeedsRecompute) {
        this.parent.flagContainingSubtreeForRecompute();
    }
};

SceneNode.prototype.getMatrixRelativeTo = function(otherNode) {
    // note that this could be one frame out-of-date if this is flaggedForRecompute
    let thisWorldMatrix = this.worldMatrix;
    let thatWorldMatrix = otherNode.worldMatrix;

    // if they're the same, we should get identity matrix
    let relativeMatrix = [];
    utils.multiplyMatrix(thisWorldMatrix, utils.invertMatrix(thatWorldMatrix), relativeMatrix);

    return relativeMatrix;
};

SceneNode.prototype.getDistanceTo = function(otherNode) {
    return utils.distance(this.getMatrixRelativeTo(otherNode));
};

// figures out what local matrix this node would need to position it globally at the provided world matrix
SceneNode.prototype.calculateLocalMatrix = function(worldMatrix) {
    // get the world matrix of the node's parent = parentWorldMatrix
    let parentWorldMatrix = this.parent.worldMatrix;
    // compute the difference between desired worldMatrix and parentWorldMatrix
    let relativeMatrix = [];
    utils.multiplyMatrix(worldMatrix, utils.invertMatrix(parentWorldMatrix), relativeMatrix);
    // return that difference

    return relativeMatrix;
};

SceneNode.prototype.setPositionRelativeTo = function(otherSceneNode, relativeMatrix) {
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
};

module.exports = SceneNode;
