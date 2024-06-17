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
        this.get("r").set(value.r);
        this.get("g").set(value.g);
        this.get("b").set(value.b);
    }

    /**
     *
     * @returns {ColorValue}
     */
    getValue() {
        return {
            "r": this.get("r").get(),
            "g": this.get("g").get(),
            "b": this.get("b").get()
        };
    }
}

export default ColorNode;
