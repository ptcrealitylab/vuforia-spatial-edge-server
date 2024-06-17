import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number}} Vector2Value
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta}}} Vector2Delta
 */

class Vector2Node extends ObjectNode {
    static TYPE = "Object.Vector2";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, Vector2Node.TYPE);
    }

    /**
     * @param {Vector2Value} value
     */
    setValue(value) {
        this.get("x").set(value.x);
        this.get("y").set(value.y);
    }

    /**
     *
     * @returns {Vector2Value}
     */
    getValue() {
        return {
            "x": this.get("x").get(),
            "y": this.get("y").get()
        };
    }
}

export default Vector2Node;
