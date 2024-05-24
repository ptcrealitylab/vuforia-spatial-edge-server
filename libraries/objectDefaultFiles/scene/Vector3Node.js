import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number}} Vector3Value
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta}}} Vector3Delta
 */

class Vector3Node extends ObjectNode {
    static TYPE = "Object.Vector3";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, Vector3Node.TYPE);
    }

    /**
     * @param {Vector3Value} value
     */
    setValue(value) {
        this.get("x").set(value.x);
        this.get("y").set(value.y);
        this.get("z").set(value.z);
    }

    /**
     *
     * @returns {Vector3Value}
     */
    getValue() {
        return {
            "x": this.get("x"),
            "y": this.get("y"),
            "z": this.get("z")
        };
    }
}

export default Vector3Node;
