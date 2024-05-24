/**
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("./ObjectNode.js").default} ObjectNode
 */

/**
 * @implements {ObjectInterface}
 */
class ObjectStore {
    /**
     *
     */
    constructor() {

    }

    /**
     * @override
     * @param {ObjectNode} _node
     * @returns {NodeDict}
     */
    getProperties(_node) {
        return {};
    }

    /**
     * @override
     * @param {ObjectNodeDelta} delta
     * @param {(delta: ObjectNodeDelta) => void} defaultApplyChanges
     */
    applyChanges(delta, defaultApplyChanges) {
        defaultApplyChanges(delta);
    }
}

export default ObjectStore;
