import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ToolsRootNode.js").ToolsRootNodeState} ToolsRootNodeState
 * @typedef {import("./ToolsRootNode.js").ToolsRootNodeDelta} ToolsRootNodeDelta
 * @typedef {{properties: {}} & BaseNodeState} AnchoredGroupNodeState
 * @typedef {{properties?: {}} & BaseNodeDelta} AnchoredGroupNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 */

class AnchoredGroupNode extends ObjectNode {
    static TYPE = "Object.AnchoredGroup";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor() {
        super(AnchoredGroupNode.TYPE);
    }
}

export default AnchoredGroupNode;
