import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number, order: string}} EulerAnglesValue
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta, order?: ValueNodeDelta}}} EulerAnglesDelta
 * @typedef {(node: EulerAnglesNode) => void} onChangedFunc
 */

class EulerAnglesNode extends ObjectNode {
    static TYPE = "Object.EulerAngles";

    /** @type {onChangedFunc|null} */
    #onChanged

    /**
     *
     * @param {EulerAnglesValue} value
     */
    constructor(value = {x: 0, y: 0, z: 0, order: "XYZ"}) {
        super(EulerAnglesNode.TYPE);
        this.#addValue("x", value.x);
        this.#addValue("y", value.y);
        this.#addValue("z", value.z);
        this.#addValue("order", value.order);
        this.#onChanged = null;
    }

    /**
     * 
     * @param {string} key 
     * @param {number|string} value 
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
     * @returns {EulerAnglesValue}
     */
    get value() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value,
            "z": this.get("z").value,
            "order": this.get("order").value
        };
    }

    /**
     * @param {EulerAnglesValue} value
     */
    set value(value) {
        this.get("x").value = value.x;
        this.get("y").value = value.y;
        this.get("z").value = value.z;
        this.get("order").value = value.order;
    }

   
}

export default EulerAnglesNode;
