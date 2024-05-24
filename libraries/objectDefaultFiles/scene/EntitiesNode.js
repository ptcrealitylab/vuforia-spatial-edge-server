import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class EntitiesNode extends DictionaryNode {
    static TYPE = "Object.Entities";

    /**
     *
     * @param {DictionaryInterface} listener
     */
    constructor(listener) {
        super(listener, EntitiesNode.TYPE);
    }

    set(key, value) {
        const entity = this.getParent().getListener().getEntity();
        if (entity) {
            entity.setChild(key, value.getEntity());
        }
        super.set(key, value);
    }
}

export default EntitiesNode;
