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
        this.get("x").value = value.x;
        this.get("y").value = value.y;
        this.get("z").value = value.z;
        this.get("w").value = value.w;
    }


    /**
     *
     * @returns {QuaternionValue}
     */
    getValue() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value,
            "z": this.get("z").value,
            "w": this.get("w").value
        };
    }
}

export default QuaternionNode;
