import MemoryEntityNode from "./MemoryEntityNode.js";

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

class ToolNode extends MemoryEntityNode {
    static TYPE = "Object.Tool";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(entity, type = ToolNode.TYPE) {
        super(entity, type);
    }
}

export default ToolNode;
