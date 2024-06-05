import BaseComponentNode from "./BaseComponentNode.js";

/**
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 */

class TransformComponentNode extends BaseComponentNode {
    static TYPE = BaseComponentNode.TYPE + ".Transform";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, TransformComponentNode.TYPE);
    }

    /**
     *
     * @returns {Vector3Value}
     */
    getPosition() {
        return this.get("position").getValue();
    }

    /**
     *
     * @param {Vector3Value} position
     */
    setPosition(position) {
        this.get("position").setValue(position);
    }

    /**
     *
     * @returns {QuaternionValue}
     */
    getRotation() {
        return this.get("rotation").getValue();
    }

    /**
     * 
     * @param {QuaternionValue} rotation
     */
    setRotation(rotation) {
        this.get("rotation").setValue(rotation);
    }

    /**
     *
     * @returns {Vector3Value}
     */
    getScale() {
        return this.get("scale").getValue();
    }

    /**
     *
     * @param {Vector3Value} scale
     */
    setScale(scale) {
        this.get("scale").setValue(scale);
    }

    fromMatrix(matrix) {
        this.getListener().fromMatrix(matrix);
    }

    /**
     *
     * @param {EntityNode} node
     */
    setEntityNode(node) {
        this.getListener().setEntityNode(node);
    }

    /**
     *
     */
    update() {
        this.getListener().update();
    }

    /**
     *
     * @returns {ComponentInterface}
     */
    getComponent() {
        return this;
    }

    release() {
    }
}

export default TransformComponentNode;
