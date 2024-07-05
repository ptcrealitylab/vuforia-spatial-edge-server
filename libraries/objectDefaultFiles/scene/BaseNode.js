/**
 * @typedef {{type: string}} BaseNodeState
 * @typedef {{type?: string}} BaseNodeDelta
 */

class BaseNode {
    /** @type {string} */
    #type;

    /** @type {boolean} */
    #isTypeDirty;

    /** @type {WeakRef<BaseNode>|null} */
    #parent;

    /**
     *
     * @param {string} type
     */
    constructor(type) {
        this.#type = type;
        this.#isTypeDirty = false;
        this.#parent = null;
    }

    /**
     *
     * @returns {string|null}
     */
    getName() {
        if (this.parent) {
            for (const entry of this.parent.entries()) {
                if (entry[1] === this) {
                    return entry[0];
                }
            }
        }
        return null;
    }

    /**
     *
     * @returns {BaseNode|null}
     */
    get parent() {
        const parent = this.#parent ? this.#parent.deref() : null;
        return parent ? parent : null;
    }

    /**
     * internal use only, doesn't propogate isDirty
     * @param {BaseNode|null} parent
     */
    set parent(parent) {
        this.#parent = parent ? new WeakRef(parent) : null;
    }

    /**
     *
     * @returns {string}
     */
    getType() {
        return this.#type;
    }

    /**
     *
     * @param {BaseNodeState} _state
     */
    setState(_state) {
    }

    /**
     * @returns {BaseNodeState}
     */
    getState() {
        return {type: this.#type};
    }

    /**
     * @param {BaseNodeDelta} _delta
     */
    setChanges(_delta) {
    }

    /**
     *
     * @returns {BaseNodeDelta}
     */
    getChanges() {
        const ret = {};
        if (this.#isTypeDirty) {
            this.#isTypeDirty = false;
            ret.type = this.#type;
        }
        return ret;
    }

    /**
     *
     * @returns {boolean}
     */
    isInternalDirty() {
        return false;
    }

    /**
     *
     */
    setInternalDirty() {
    }

    /**
     *
     * @returns {boolean}
     */
    isDirty() {
        return this.#isTypeDirty;
    }

    /**
     *
     */
    setTypeDirty() {
        this.#isTypeDirty = true;
        this.setDirty();
    }

    /**
     *
     */
    setDirty() {
        BaseNode.setParentDirty(this);
    }

    /**
     *
     * @param {BaseNode} node
     */
    static setParentDirty(node) {
        const parent = node.parent;
        if (parent && (!parent.isInternalDirty())) {
            parent.setInternalDirty();
            BaseNode.setParentDirty(parent);
        }
    }
}

export default BaseNode;
