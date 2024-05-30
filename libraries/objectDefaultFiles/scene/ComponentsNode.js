import DictionaryNode from "./DictionaryNode.js";

/**
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

    setEntityNode(node) {
        for (const component of this.values()) {
            component.setEntityNode(node);
        }
    }
}

export default ComponentsNode;
