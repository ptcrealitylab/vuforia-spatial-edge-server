import ObjectNode from "./ObjectNode.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{r: number, g: number, b: number}} ColorValue
 * @typedef {BaseNodeDelta & {properties?: {r?: ValueNodeDelta, g?: ValueNodeDelta, b?: ValueNodeDelta}}} ColorDelta
 * @typedef {(node: ColorNode) => void} onChangedFunc
 */

class ColorNode extends ObjectNode {
    static TYPE = "Object.Color";

    /** @type {onChangedFunc|null} */
    #onChanged

    /**
     *
     * @param {ObjectInterface} value
     */
    constructor(value = {r: 0, g: 0, b: 0}) {
        super(ColorNode.TYPE);
        this.#addValue("r", value.r);
        this.#addValue("g", value.g);
        this.#addValue("b", value.b);
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
     * @returns {ColorValue}
     */
    get value() {
        return {
            "r": this.get("r").value,
            "g": this.get("g").value,
            "b": this.get("b").value
        };
    }

    /**
     * @param {ColorValue} value
     */
    set value(value) {
        this.get("r").value = value.r;
        this.get("g").value = value.g;
        this.get("b").value = value.b;
    }
}

export default ColorNode;
