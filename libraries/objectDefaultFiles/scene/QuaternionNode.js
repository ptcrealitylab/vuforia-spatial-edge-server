import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number, w: number}} QuaternionValue
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta, w?: ValueNodeDelta}}} QuaternionDelta
 */

class QuaternionNode extends ObjectNode {
    static TYPE = "Object.Quaternion";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, QuaternionNode.TYPE);
    }

    /**
     *
     * @param {QuaternionValue} value
     */
    setValue(value) {
        this.get("x").set(value.x);
        this.get("y").set(value.y);
        this.get("z").set(value.z);
        this.get("w").set(value.w);
    }


    /**
     *
     * @returns {QuaternionValue}
     */
    getValue() {
        return {
            "x": this.get("x").get(),
            "y": this.get("y").get(),
            "z": this.get("z").get(),
            "w": this.get("w").get()
        };
    }
}

export default QuaternionNode;
