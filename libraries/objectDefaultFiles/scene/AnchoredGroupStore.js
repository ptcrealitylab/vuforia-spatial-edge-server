import ObjectStore from "./ObjectStore.js";
import ToolsRootStore from "./ToolsRootStore.js";
import ToolsRootNode from "./ToolsRootNode.js";

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
        return {tools: new ToolsRootNode(new ToolsRootStore())};
    }
}

export default AnchoredGroupStore;
