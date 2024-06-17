import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./ColorNode.js").default} ColorNode
 * * @typedef {import("./ColorNode.js").ColorValue} ColorValue
 */

class ColorStore extends ObjectStore {
    /** @type {ColorValue} */
    #initValues;

    /**
     *
     * @param {ColorValue} value
     */
    constructor(value = {r: 0, g: 0, b: 0}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {ColorNode} _thisNode
     * @returns {{r: ValueNode, g: ValueNode, b: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "r": new ValueNode(new ValueStore(this.#initValues.r)),
            "g": new ValueNode(new ValueStore(this.#initValues.g)),
            "b": new ValueNode(new ValueStore(this.#initValues.b))
        };
    }
}

export default ColorStore;
