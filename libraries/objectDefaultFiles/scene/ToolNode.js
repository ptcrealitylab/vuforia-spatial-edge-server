import EntityNode from "./EntityNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./EntitiesNode.js").EntitiesNodeState} EntitiesNodeState
 * @typedef {import("./EntitiesNode.js").EntitiesNodeDelta} EntitiesNodeDelta
 * @typedef {import("./ComponentsNode.js").ComponentsNodeState} ComponentsNodeState
 * @typedef {import("./ComponentsNode.js").ComponentsNodeDelta} ComponentsNodeDelta
 * @typedef {{properties: {children: EntitiesNodeState, components: ComponentsNodeState}} & BaseNodeState} ToolNodeState
 * @typedef {{properties?: {children?: EntitiesNodeDelta, components?: ComponentsNodeDelta}} & BaseNodeDelta} ToolNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 */

class ToolNode extends EntityNode {
    static TYPE = "Object.Tool";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener, type = ToolNode.TYPE) {
        super(listener, type);
    }
}

export default ToolNode;
