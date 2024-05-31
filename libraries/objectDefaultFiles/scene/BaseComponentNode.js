import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {{properties: {[key: string]: BaseNodeState}} & BaseNodeState} BaseComponentNodeState
 * @typedef {{properties?: {[key: string]: BaseNodeDelta}} & BaseNodeDelta} BaseComponentNodeDelta
 */

class BaseComponentNode extends ObjectNode {
    static TYPE = "Object.Component";

    constructor(listener, type) {
        super(listener, type);
    }

    /**
     *
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {
    }

    /**
     *
     * @returns {ComponentInterface}
     */
    getComponent() {
        return this;
    }

    /**
     *
     */
    update() {
    }
}

export default BaseComponentNode;
