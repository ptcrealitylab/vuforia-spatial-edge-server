import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./AnchoredGroupNode.js").AnchoredGroupNodeState} AnchoredGroupNodeState
 * @typedef {import("./AnchoredGroupNode.js").AnchoredGroupNodeDelta} AnchoredGroupNodeDelta
 * @typedef {{properties: {threejsContainer: AnchoredGroupNodeState}} & BaseNodeState} WorldNodeState
 * @typedef {{properties?: {threejsContainer?: AnchoredGroupNodeDelta}} & BaseNodeDelta} WorldNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 */

class WorldNode extends ObjectNode {
    static TYPE = "Object.World";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, WorldNode.TYPE);
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

export default WorldNode;
