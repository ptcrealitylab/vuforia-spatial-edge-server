import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./BaseComponentNode.js").BaseComponentNodeState} BaseComponentNodeState
 * @typedef {import("./BaseComponentNode.js").BaseComponentNodeDelta} BaseComponentNodeDelta
 * @typedef {{properties: {[key: string]: BaseComponentNodeState}} & BaseNodeState} ComponentsNodeState
 * @typedef {{properties?: {[key: string]: BaseComponentNodeDelta}} & BaseNodeDelta} ComponentsNodeDelta
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class ComponentsNode extends DictionaryNode {
    static TYPE = "Object.Components";

    /**
     *
     * @param {DictionaryInterface} listener
     */
    constructor(listener) {
        super(listener, ComponentsNode.TYPE);
    }

    set(key, value, makeDirty = true) {
        value.setEntityNode(this.getParent());
        const entity = this.getParent().getEntity();
        if (entity) {
            entity.setComponent(key, value.getComponent());
        }
        super.set(key, value, makeDirty);
    }

    /**
     *
     * @param {string} type
     */
    getWithType(type) {
        for (const node of this.values()) {
            if (node.getType() === type) {
                return node;
            }
        }
        return undefined;
    }

    setEntityNode(node) {
        for (const component of this.values()) {
            component.setEntityNode(node);
        }
    }
}

export default ComponentsNode;
