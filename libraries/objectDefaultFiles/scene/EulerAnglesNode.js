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
        this.get("x").value = value.x;
        this.get("y").value = value.y;
        this.get("z").value = value.z;
        this.get("order").value = value.order;
    }

    /**
     *
     * @returns {EulerAnglesValue}
     */
    getValue() {
        return {
            "x": this.get("x").value,
            "y": this.get("y").value,
            "z": this.get("z").value,
            "order": this.get("order").value
        };
    }
}

export default EulerAnglesNode;
