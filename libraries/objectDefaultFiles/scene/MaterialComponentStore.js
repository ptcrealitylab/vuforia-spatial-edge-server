import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";
import DictionaryNode from "./DictionaryNode.js";
import DictionaryStore from "./DictionaryStore.js";

class MaterialComponentStore extends ObjectStore {
    constructor() {
        super();
    }

    getProperties() {
        return {
            "material": new ValueNode(new ValueStore()),
            "properties": new DictionaryNode(new DictionaryStore())
        };
    }

    /**
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {

    }

    update() {
    }

    release() {
    }
}

export default MaterialComponentStore;
