import ObjectStore from "./ObjectStore.js";
import AnchoredGroupNode from "./AnchoredGroupNode.js";
import AnchoredGroupStore from "./AnchoredGroupStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./WorldNode.js").default} WorldNode
 */

class WorldStore extends ObjectStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {WorldNode} _node
     * @returns {NodeDict}
     */
    getProperties(_node) {
        return {"threejsContainer": new AnchoredGroupNode(new AnchoredGroupStore())};
    }
}

export default WorldStore;
