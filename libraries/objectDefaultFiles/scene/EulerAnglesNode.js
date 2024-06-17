import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{x: number, y: number, z: number, order: string}} EulerAnglesValue
 * @typedef {BaseNodeDelta & {properties?: {x?: ValueNodeDelta, y?: ValueNodeDelta, z?: ValueNodeDelta, order?: ValueNodeDelta}}} EulerAnglesDelta
 */

class EulerAnglesNode extends ObjectNode {
    static TYPE = "Object.EulerAngles";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, EulerAnglesNode.TYPE);
    }

    /**
     * @param {EulerAnglesValue} value
     */
    setValue(value) {
        this.get("x").set(value.x);
        this.get("y").set(value.y);
        this.get("z").set(value.z);
        this.get("order").set(value.order);
    }

    /**
     *
     * @returns {EulerAnglesValue}
     */
    getValue() {
        return {
            "x": this.get("x").get(),
            "y": this.get("y").get(),
            "z": this.get("z").get(),
            "order": this.get("order").get()
        };
    }
}

export default EulerAnglesNode;
