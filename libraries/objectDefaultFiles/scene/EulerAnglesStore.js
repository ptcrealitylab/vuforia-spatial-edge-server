import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./EulerAnglesNode.js").default} EulerAnglesNode
 * @typedef {import("./EulerAnglesNode.js").EulerAnglesValue} EulerAnglesValue
 */

class EulerAnglesStore extends ObjectStore {
    /** @type {EulerAnglesValue} */
    #initValues;

    /**
     *
     * @param {EulerAnglesValue} value
     */
    constructor(value = {x: 0, y: 0, z: 0, order: "XYZ"}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {EulerAnglesNode} _thisNode
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode, order: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "x": new ValueNode(this.#initValues.x),
            "y": new ValueNode(this.#initValues.y),
            "z": new ValueNode(this.#initValues.z),
            "order": new ValueNode(this.#initValues.order)
        };
    }
}

export default EulerAnglesStore;
