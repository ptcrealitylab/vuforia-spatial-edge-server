import ObjectNode from "./ObjectNode.js";

class MaterialComponentNode extends ObjectNode {
    static TYPE = "Object.Material";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, MaterialComponentNode.TYPE);
    }

    setEntityNode(node) {
        this.getListener().setEntityNode(node);
    }

    update() {
        this.getListener().update();
    }

    getComponent() {
        return this;
    }

    release() {
        this.getListener().release();
    }
}

export default MaterialComponentNode;
