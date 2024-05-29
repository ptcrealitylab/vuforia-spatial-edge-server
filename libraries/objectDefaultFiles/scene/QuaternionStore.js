import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./QuaternionNode.js").default} QuaternionNode
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 */

class QuaternionStore extends ObjectStore {
    /** @type {QuaternionValue} */
    #initValues;

    /**
     * @param {QuaternionValue} value
     */
    constructor(value = {x: 0, y: 0, z: 0, w: 1}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {QuaternionNode} _node
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode, w: ValueNode}}
     */
    getProperties(_node) {
        return {
            "x": new ValueNode(new ValueStore(this.#initValues.x)),
            "y": new ValueNode(new ValueStore(this.#initValues.y)),
            "z": new ValueNode(new ValueStore(this.#initValues.z)),
            "w": new ValueNode(new ValueStore(this.#initValues.w))
        };
    }
}

export default QuaternionStore;
