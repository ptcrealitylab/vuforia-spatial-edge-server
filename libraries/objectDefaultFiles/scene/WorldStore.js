import ObjectStore from "./ObjectStore.js";
import AnchoredGroupNode from "./AnchoredGroupNode.js";
import AnchoredGroupStore from "./AnchoredGroupStore.js";
import ToolsRootStore from "./ToolsRootStore.js";
import ToolsRootNode from "./ToolsRootNode.js";

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
        return {
            "threejsContainer": new AnchoredGroupNode(new AnchoredGroupStore()),
            "tools": new ToolsRootNode(new ToolsRootStore())
        };
    }
}

export default WorldStore;
