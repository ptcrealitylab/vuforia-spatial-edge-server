import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ToolsRootNode.js").ToolsRootNodeState} ToolsRootNodeState
 * @typedef {import("./ToolsRootNode.js").ToolsRootNodeDelta} ToolsRootNodeDelta
 * @typedef {{properties: {tools: ToolsRootNodeState}} & BaseNodeState} AnchoredGroupNodeState
 * @typedef {{properties?: {tools?: ToolsRootNodeDelta}} & BaseNodeDelta} AnchoredGroupNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 */

class AnchoredGroupNode extends ObjectNode {
    static TYPE = "Object.AnchoredGroup";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, AnchoredGroupNode.TYPE);
    }

    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        for (const entry of this.entries()) {
            ret.properties[entry[0]] = entry[1].getStateForTool(toolId);
        }
        return ret;
    }
}

export default AnchoredGroupNode;
