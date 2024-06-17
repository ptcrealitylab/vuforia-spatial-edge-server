import ValueNode from "./ValueNode.js";

class ValueComponentNode extends ValueNode {
    constructor(value, type) {
        super(value, type);
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
