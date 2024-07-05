import ObjectNode from "./ObjectNode.js";
import AnchoredGroupNode from "./AnchoredGroupNode.js";
import ToolsRootNode from "./ToolsRootNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./AnchoredGroupNode.js").AnchoredGroupNodeState} AnchoredGroupNodeState
 * @typedef {import("./AnchoredGroupNode.js").AnchoredGroupNodeDelta} AnchoredGroupNodeDelta
 * @typedef {{properties: {threejsContainer: AnchoredGroupNodeState, tools: ToolsRootNodeState}} & BaseNodeState} WorldNodeState
 * @typedef {{properties?: {threejsContainer?: AnchoredGroupNodeDelta tools?: ToolsRootNodeDelta}} & BaseNodeDelta} WorldNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("./DateTimer.js").DateTimer} DateTimer
 */

class WorldNode extends ObjectNode {
    static TYPE = "Object.World";

    /** @type {DateTimer} */
    #timer

    /**
     *
     * @param {DateTimer} timer
     */
    constructor(timer) {
        super(WorldNode.TYPE);
        this._set("threejsContainer", new AnchoredGroupNode());
        this._set("tools", new ToolsRootNode());
        this.#timer = timer;
    }

    /** 
     * @returns {DateTimer} 
     */
    get timer() {
        return this.#timer;
    }

    /**
     * 
     * @param {string} toolId 
     * @returns {WorldNodeState}
     */
    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        for (const entry of this.entries()) {
            ret.properties[entry[0]] = entry[1].getStateForTool(toolId);
        }
        ret.toolsRoot = ["tools"];
        return ret;
    }
}

export default WorldNode;
