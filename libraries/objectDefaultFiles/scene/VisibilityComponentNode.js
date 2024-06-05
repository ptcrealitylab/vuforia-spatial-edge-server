import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

class VisibilityComponentNode extends ValueNode {
    static TYPE = "Value.Component.Visibility";

    #entity;

    constructor(isVisible = true) {
        super(new ValueStore(isVisible), VisibilityComponentNode.TYPE);
        this.#entity = null;
    }

    setEntityNode(entityNode) {
        this.#entity = entityNode.getEntity();
    }

    update() {
        if (this.#entity.isVisible() !== this.get()) {
            this.#entity.setVisible(this.get());
        }
    }

    getComponent() {
        return this;
    }

    release() {
    }
}

export default VisibilityComponentNode;
