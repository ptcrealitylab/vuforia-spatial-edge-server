import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class ToolsRootNode extends DictionaryNode {
    static TYPE = "Object.ToolsRoot";

    /**
     *
     * @param {DictionaryInterface} listener
     */
    constructor(listener) {
        super(listener, ToolsRootNode.TYPE);
    }

    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        ret.properties[toolId] = this.get(toolId).getState();
        return ret;
    }
}

export default ToolsRootNode;
