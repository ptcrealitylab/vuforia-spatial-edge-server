import ObjectNode from "./ObjectNode.js";

class BaseComponentNode extends ObjectNode {
    static TYPE = "Object.Component";

    constructor(listener, type) {
        super(listener, type);
    }

    setEntityNode(_node) {

    }
}

export default BaseComponentNode;
