import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class DictionaryComponentNode extends DictionaryNode {
    static TYPE = "Object.Component.Dictionary";

    /**
     *
     * @param {string} type
     */
    constructor(type = DictionaryComponentNode.TYPE) {
        super(type);
    }

    setEntityNode(node) {
    }

    getComponent() {
        return this;
    }
}

export default DictionaryComponentNode;
