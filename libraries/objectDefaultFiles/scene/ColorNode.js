import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{r: number, g: number, b: number}} ColorValue
 * @typedef {BaseNodeDelta & {properties?: {r?: ValueNodeDelta, g?: ValueNodeDelta, b?: ValueNodeDelta}}} ColorDelta
 */

class ColorNode extends ObjectNode {
    static TYPE = "Object.Color";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, ColorNode.TYPE);
    }

    /**
     * @param {ColorValue} value
     */
    setValue(value) {
        this.get("r").value = value.r;
        this.get("g").value = value.g;
        this.get("b").value = value.b;
    }

    /**
     *
     * @returns {ColorValue}
     */
    getValue() {
        return {
            "r": this.get("r").value,
            "g": this.get("g").value,
            "b": this.get("b").value
        };
    }
}

export default ColorNode;
