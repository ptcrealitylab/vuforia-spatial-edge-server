import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./Vector3Node.js").default} Vector3Node
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 */

class Vector3Store extends ObjectStore {
    /** @type {Vector3Value} */
    #initValues;

    /**
     *
     * @param {Vector3Value} value
     */
    constructor(value = {x: 0, y: 0, z: 0}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {Vector3Node} _thisNode
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "x": new ValueNode(new ValueStore(this.#initValues.x)),
            "y": new ValueNode(new ValueStore(this.#initValues.y)),
            "z": new ValueNode(new ValueStore(this.#initValues.z))
        };
    }
}

export default Vector3Store;
