import ObjectNode from "./ObjectNode.js";

class BaseComponentNode extends ObjectNode {
    static TYPE = "Object.Component";

    constructor(listener, type) {
        super(listener, type);
    }

    /**
     *
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {
    }

    /**
     *
     * @returns {ComponentInterface}
     */
    getComponent() {
        return this;
    }

    /**
     *
     */
    update() {
    }
}

export default BaseComponentNode;
