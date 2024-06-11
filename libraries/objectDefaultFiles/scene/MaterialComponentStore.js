import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

class MaterialComponentStore extends ObjectStore {
    constructor() {
        super();
    }

    getProperties() {
        return {
            "material": new ValueNode(new ValueStore())
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
