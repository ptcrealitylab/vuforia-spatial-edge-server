import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number, w: number}} QuaternionValue
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta, w?: ValueNodeDelta}}} QuaternionDelta
 * @typedef {(node: QuaternionNode) +> void} onChangedFunc
 */

class QuaternionNode extends ObjectNode {
    static TYPE = "Object.Quaternion";

    /** @type {onChangedFunc|null} */
    #onChanged

    /**
     * @param {QuaternionValue} value
     */
    constructor(value = {x: 0, y: 0, z: 0, w: 1}) {
        super(QuaternionNode.TYPE);
        this.#addValue("x", value.x);
        this.#addValue("y", value.y);
        this.#addValue("z", value.z);
        this.#addValue("w", value.w);
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
     *
     * @param {QuaternionValue} value
     */
    set value(value) {
        this.get("x").value = value.x;
        this.get("y").value = value.y;
        this.get("z").value = value.z;
        this.get("w").value = value.w;
    }


    /**
     *
     * @returns {QuaternionValue}
     */
    get value() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value,
            "z": this.get("z").value,
            "w": this.get("w").value
        };
    }
}

export default QuaternionNode;
