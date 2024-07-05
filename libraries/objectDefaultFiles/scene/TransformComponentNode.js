import BaseComponentNode from "./BaseComponentNode.js";
import Vector3Node from "./Vector3Node.js";
import QuaternionNode from "./QuaternionNode.js";

/**
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 */

class TransformComponentNode extends BaseComponentNode {
    static TYPE = BaseComponentNode.TYPE + ".Transform";

    /** @type {boolean} */
    #entityNeedsUpdate;

    /** @type {EntityInterface} */
    #entity;

    /**
     * @param {EntityInterface} entity
     */
    constructor(entity) {
        super(TransformComponentNode.TYPE);
        const position = new Vector3Node(entity.position);
        position.onChanged = () => {this.#entityNeedsUpdate = true;};
        this._set("position", position);
        const rotation = new QuaternionNode(entity.rotation);
        rotation.onChanged = () => {this.#entityNeedsUpdate = true;};
        this._set("rotation", rotation);
        const scale = new Vector3Node(entity.scale);
        scale.onChanged = () => {this.#entityNeedsUpdate = true;};
        this._set("scale", scale);
        this.#entityNeedsUpdate = false;
        this.#entity = entity;
    }

     /**
     *
     * @param {EntityNode} entityNode
     */
     setEntityNode(entityNode) {
        this.#entity = entityNode.entity;
        this.#entityNeedsUpdate = true;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    get position() {
        return this.get("position").value;
    }

    /**
     *
     * @param {Vector3Value} position
     */
    set position(position) {
        this.get("position").value = position;
    }

    /**
     *
     * @returns {QuaternionValue}
     */
    get rotation() {
        return this.get("rotation").value;
    }

    /**
     * 
     * @param {QuaternionValue} rotation
     */
    set rotation(rotation) {
        this.get("rotation").value = rotation;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    get scale() {
        return this.get("scale").value;
    }

    /**
     *
     * @param {Vector3Value} scale
     */
    set scale(scale) {
        this.get("scale").value = scale;
    }

    /**
     *
     */
    update() {
        if (this.#entityNeedsUpdate) {
            this.#entity.position = this.get("position").value;
            this.#entity.rotation = this.get("rotation").value;
            this.#entity.scale = this.get("scale").value;
            this.#entityNeedsUpdate = false;
        }
    }

    /**
     *
     * @returns {ComponentInterface}
     */
    get component() {
        return this;
    }

    release() {
    }
}

export default TransformComponentNode;
