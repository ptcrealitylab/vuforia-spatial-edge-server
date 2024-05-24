import ObjectNode from "./ObjectNode.js";

class BaseComponentNode extends ObjectNode {
    static TYPE = "Object.Component";

    constructor(listener, type) {
        super(listener, type);
    }

    setParent(parent) {
        super.setParent(parent);
        this.getListener().setEntityNode(parent.getParent());
    }
}

export default BaseComponentNode;
