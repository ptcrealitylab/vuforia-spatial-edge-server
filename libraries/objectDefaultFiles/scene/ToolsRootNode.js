import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ToolNode.js").ToolNodeState} ToolNodeState
 * @typedef {import("./ToolNode.js").ToolNodeDelta} ToolNodeDelta
 * @typedef {{properties: {[key: string]: ToolNodeState}} & BaseNodeState} ToolsRootNodeState
 * @typedef {{properties?: {[key: string]: ToolNodeDelta}} & BaseNodeDelta} ToolsRootNodeDelta
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
