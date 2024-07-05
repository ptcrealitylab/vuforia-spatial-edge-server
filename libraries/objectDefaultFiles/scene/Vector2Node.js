import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number}} Vector2Value
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta}}} Vector2Delta
 * @typedef {(node: Vector2Node) => void} onChangedFunc
 */

class Vector2Node extends ObjectNode {
    static TYPE = "Object.Vector2";

    /** @type {onChangedFunc} */
    #onChanged

    /**
     *
     * @param {Vector2Value} value
     */
    constructor(value = {x: 0, y: 0}) {
        super(Vector2Node.TYPE);
        this.#addValue("x", value.x);
        this.#addValue("y", value.y);
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
     * @param {Vector2Value} value
     */
    set value(value) {
        this.get("x").value = value.x;
        this.get("y").value = value.y;
    }

    /**
     *
     * @returns {Vector2Value}
     */
    get value() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value
        };
    }
}

export default Vector2Node;
