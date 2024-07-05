import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number}} Vector3Value
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta}}} Vector3Delta
 * @typedef {(node: Vector3Node) => void} onChangedFunc
 */

class Vector3Node extends ObjectNode {
    static TYPE = "Object.Vector3";

    /** @type {onChangedFunc} */
    #onChanged

    /**
     *
     * @param {Vector3Value} value
     */
    constructor(value = {x: 0, y: 0, z: 0}) {
        super(Vector3Node.TYPE);
        this.#addValue("x", value.x);
        this.#addValue("y", value.y);
        this.#addValue("z", value.z);
        this.#onChanged = null;
    }

    /**
     * 
     * @param {string} key 
     * @param {number} value 
     */
    #addValue(key, value) {
        const node = new ValueNode(value);
        node.onChanged = (_node) => {this.#safeOnChanged();};
        this._set(key, node);
    }

    /**
     * 
     */
    #safeOnChanged() {
        if (this.#onChanged) {
            this.#onChanged(this);
        }
    }

    /**
     * @returns {onChangedFunc} 
     */
    get onChanged() {
        return this.#onChanged;
    }
    
    /**
     * @param {onChangedFunc} onChanged
     */
    set onChanged(onChanged) {
        this.#onChanged = onChanged;
    }

    /**
     * @param {Vector3Value} value
     */
    set value(value) {
        this.get("x").value = value.x;
        this.get("y").value = value.y;
        this.get("z").value = value.z;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    get value() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value,
            "z": this.get("z").value
        };
    }
}

export default Vector3Node;
