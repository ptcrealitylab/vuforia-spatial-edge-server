import ValueNode from "./ValueNode.js";

class VisibilityComponentNode extends ValueNode {
    static TYPE = "Value.Component.Visibility";

    #entity;

    constructor(isVisible = true) {
        super(isVisible, VisibilityComponentNode.TYPE);
        this.#entity = null;
    }

    setEntityNode(entityNode) {
        this.#entity = entityNode.getEntity();
    }

    update() {
        if (this.#entity.isVisible() !== this.value) {
            this.#entity.setVisible(this.value);
        }
    }

    getComponent() {
        return this;
    }

    release() {
    }
}

export default VisibilityComponentNode;
