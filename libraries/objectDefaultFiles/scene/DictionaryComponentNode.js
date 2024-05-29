import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class DictionaryComponentNode extends DictionaryNode {
    static TYPE = "Object.Component.Dictionary";

    /**
     *
     * @param {DictionaryInterface} listener
     * @param {string} type
     */
    constructor(listener, type = DictionaryComponentNode.TYPE) {
        super(listener, type);
    }

    setEntityNode(node) {
        this.getListener().setEntityNode(node);
    }

    getComponent() {
        return this.listener.getComponent();
    }
}

export default DictionaryComponentNode;
