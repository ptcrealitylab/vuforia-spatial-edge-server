import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./Vector2Node.js").default} Vector2Node
 * @typedef {import("./Vector2Node.js").Vector2Value} Vector2Value
 */

class Vector2Store extends ObjectStore {
    /** @type {Vector2Value} */
    #initValues;

    /**
     *
     * @param {Vector2Value} value
     */
    constructor(value = {x: 0, y: 0}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {Vector2Node} _thisNode
     * @returns {{x: ValueNode, y: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "x": new ValueNode(new ValueStore(this.#initValues.x)),
            "y": new ValueNode(new ValueStore(this.#initValues.y))
        };
    }
}

export default Vector2Store;
