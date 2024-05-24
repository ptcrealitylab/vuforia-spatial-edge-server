import BaseNode from "./BaseNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {string|number|ValueDict|string[]|number[]|ValueDict[]} Value
 * @typedef {{[key: string]: Value}} ValueDict
 * @typedef {{get: () => Value, set: (value: Value) => void}} ValueInterface
 * @typedef {{value: Value} & BaseNodeState} ValueNodeState
 * @typedef {{value?: Value} & BaseNodeDelta} ValueNodeDelta
 */

/**
 * Leaf node in the graph, for simple values or objects that need no further subdivision
 */
class ValueNode extends BaseNode {
    static TYPE = "Value";

    /** @type {ValueInterface} */
    #value;

    /** @type {boolean}*/
    #isValueDirty;

    /**
     *
     * @param {ValueInterface} value
     * @param {string} type
     */
    constructor(value, type = ValueNode.TYPE) {
        super(type);
        this.#value = value;
        this.#isValueDirty = false;
    }

    /**
     *
     * @returns {Value}
     */
    get() {
        return this.#value.get();
    }

    /**
     *
     * @param {Value} value
     */
    set(value) {
        this.#value.set(value);
        this.setDirty();
    }

    /**
     *
     * @returns {boolean}
     */
    isInternalDirty() {
        return this.#isValueDirty;
    }

    /**
     *
     */
    setInternalDirty() {
        this.#isValueDirty = true;
    }

    /**
     * @override
     * @returns {boolean}
     */
    isDirty() {
        return super.isDirty() || this.#isValueDirty;
    }

    /**
     * @override
     */
    setDirty() {
        this.#isValueDirty = true;
        super.setDirty();
    }

    /**
     * @override
     * @returns {ValueNodeState}
     */
    getState() {
        const ret = super.getState();
        ret.value = this.#value.get();
        return ret;
    }

    /**
     * @override
     * @param {ValueNodeState} state
     */
    setState(state) {
        this.#value.set(state.value);
    }

    /**
     * @override
     * @returns {ValueNodeDelta}
     */
    getChanges() {
        const ret = super.getChanges();
        if (this.#isValueDirty) {
            ret.value = this.#value.get();
            this.#isValueDirty = false;
        }
        return ret;
    }

    /**
     * @override
     * @param {ValueNodeDelta} delta
     */
    setChanges(delta) {
        if (delta.hasOwnProperty("value")) {
            this.#value.set(delta.value);
        }
    }
}

export default ValueNode;
