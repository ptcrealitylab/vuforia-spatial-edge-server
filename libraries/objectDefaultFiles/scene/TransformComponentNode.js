import BaseComponentNode from "./BaseComponentNode.js";

class TransformComponentNode extends BaseComponentNode {
    static TYPE = BaseComponentNode.TYPE + ".Transform";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, TransformComponentNode.TYPE);
    }

    getPosition() {
        const position = this.get("position");
        return position.getValue();
    }

    setPosition(x, y, z) {
        const position = this.get("position");
        position.setValue(x, y, z);
    }

    getRotation() {
        const rotation = this.get("rotation");
        return rotation.getValue();
    }

    setRotation(x, y, z, w) {
        const rotation = this.get("rotation");
        rotation.setValue(x, y, z, w);
    }

    getScale() {
        const scale = this.get("scale");
        return scale.getValue();
    }

    setScale(x, y, z) {
        const scale = this.get("scale");
        scale.setValue(x, y, z);
    }
}

export default TransformComponentNode;
