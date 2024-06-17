/**
 * @typedef {import("./ValueNode.js").ValueInterface} ValueInterface
 */

/**
 * @implements {ValueInterface}
 */
class ValueStore {
    #value;

    /**
     *
     * @param {Value} value
     */
    constructor(value) {
        this.#value = value;
    }

    /**
     * @override
     * @returns {Value}
     */
    get() {
        return this.#value;
    }

    /**
     * @override
     * @param {Value} value
     */
    set(value) {
        this.#value = value;
    }
}

export default ValueStore;
