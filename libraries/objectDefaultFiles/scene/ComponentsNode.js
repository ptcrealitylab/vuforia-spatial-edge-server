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
}

export default ComponentsNode;
