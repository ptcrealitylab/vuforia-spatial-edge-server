import ObjectStore from "./ObjectStore.js";

/**
 * @typedef {import("./AnchoredGroupNode.js").default} AnchoredGroupNode
 */

class AnchoredGroupStore extends ObjectStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {AnchoredGroupNode} _thisNode
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {};
    }
}

export default AnchoredGroupStore;
