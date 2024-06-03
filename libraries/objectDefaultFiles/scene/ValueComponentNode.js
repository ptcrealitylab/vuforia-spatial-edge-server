import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

class ValueComponentNode extends ValueNode {
    constructor(value, type) {
        super(new ValueStore(value), type);
    }

    /**
     *
     * @param {EntityNode} _entityNode
     */
    setEntityNode(_entityNode) {
    }

    /**
     *
     */
    update() {
    }

    /**
     *
     * @returns {ValueComponentNode}
     */
    getComponent() {
        return this;
    }
}

export default ValueComponentNode;
