import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";
import DictionaryNode from "./DictionaryNode.js";

class MaterialComponentNode extends ObjectNode {
    static TYPE = "Object.Component.Material";

    /**
     *
     */
    constructor() {
        super(MaterialComponentNode.TYPE);
        this._set("material", new ValueNode(""));
        this._set("properties", new DictionaryNode());
    }

    setEntityNode(node) {
    }

    update() {
    }

    get component() {
        return this;
    }

    release() {
    }
}

export default MaterialComponentNode;
