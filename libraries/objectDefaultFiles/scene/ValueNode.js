import BaseNode from "./BaseNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {string|number|ValueDict|string[]|number[]|ValueDict[]} Value
 * @typedef {{[key: string]: Value}} ValueDict
 * @template {Value} T
 * @typedef {{value: T} & BaseNodeState} ValueNodeState
 * @template {Value} T
 * @typedef {{value?: T} & BaseNodeDelta} ValueNodeDelta
 * @template {Value} T
 * @typedef {(node: ValueNode<T>) => void} onChangedFunc
 */

/**
 * Leaf node in the graph, for simple values or objects that need no further subdivision
 * @template {Value} T
 */
class ValueNode extends BaseNode {
    static TYPE = "Value";

    /** @type {T} */
    #value;

    /** @type {boolean}*/
    #isValueDirty;

    /** @type {onChangedFunc<T>|null} */
    #onChanged;

    /**
     *
     * @param {T} value
     * @param {string} type
     */
    constructor(value, type = ValueNode.TYPE) {
        super(type);
        this.#value = value;
        this.#isValueDirty = false;
        this.#onChanged = null;
    }

    /**
     * @returns {T}
     */
    get value() {
        return this.#value;
    }

    /**
     * @param {T} value
     */
    set value(value) {
        this.#setValue(value);
        this.setDirty();
    }

    /**
     * @param {onChangedFunc<T>} onChangedFunc
     */
    set onChanged(onChanged) {
        this.#onChanged = onChanged;
    }

    /**
     * @returns {onChangedFunc<T>}
     */
    get onChanged() {
        return this.#onChanged;
    }

    /**
     * 
     * @param {T} value 
     */
    #setValue(value) {
        this.#value = value;
        if (this.#onChanged) {
            this.#onChanged(this);
        }
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
     * @returns {ValueNodeState<T>}
     */
    getState() {
        const ret = super.getState();
        ret.value = this.#value;
        return ret;
    }

    /**
     * @override
     * @param {ValueNodeState<T>} state
     */
    setState(state) {
        this.#setValue(state.value);
    }

    /**
     * @override
     * @returns {ValueNodeDelta<T>}
     */
    getChanges() {
        const ret = super.getChanges();
        if (this.#isValueDirty) {
            ret.value = this.#value;
            this.#isValueDirty = false;
        }
        return ret;
    }

    /**
     * @override
     * @param {ValueNodeDelta<T>} delta
     */
    setChanges(delta) {
        if (delta.hasOwnProperty("value")) {
            this.#setValue(delta.value);
        }
    }
}

export default ValueNode;
