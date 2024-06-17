import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./ValueNode.js").ValueNodeState} ValueNodeState
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ValueNode.js").ValueInterface} ValueInterface
 * @typedef {import("./BaseNode.js").BaseNode} BaseNode
 * @template {Value} T
 * @typedef {{version: number} & ValueNodeState<T>} VersionedNodeState
 * @template {Value} T
 * @typedef {{version?: number} & ValueNodeDelta<T>} VersionedNodeDelta
 */

/**
 * @template {Value} T
 * @extends {ValueNode<T>}
 */
class VersionedNode extends ValueNode {
    static TYPE = "Versioned";

    /** @type {number} */
    #version;

    /**
     *
     * @param {T} value
     * @param {number} version
     */
    constructor(value, type = VersionedNode.TYPE, version = -1) {
        super(value, type);
        this.#version = version;
    }

    /**
     * @override
     * @returns {T}
     */
    get value() {
        return super.value;
    }

    /**
     * @override
     * @param {T} value
     */
    set value(value) {
        this.incrementVersion();
        super.value = value;
    }

    /**
     *
     */
    incrementVersion() {
        this.#version++;
        this.setDirty();
    }

    /**
     * @override
     * @returns {VersionedNodeState<T>}
     */
    getState() {
        const ret = super.getState();
        ret.version = this.#version;
        return ret;
    }

    /**
     * @override
     * @param {VersionedNodeState<T>} state
     */
    setState(state) {
        this.#version = state.version;
        super.setState(state);
    }

    /**
     * @override
     * @returns {VersionedNodeDelta<T>}
     */
    getChanges() {
        if (this.isDirty()) {
            const ret = super.getChanges();
            ret.version = this.#version;
            return ret;
        }
        return {};
    }

    /**
     * @override
     * @param {VersionedNodeDelta<T>} delta
     */
    setChanges(delta) {
        if (delta.hasOwnProperty("version")) {
            if (delta.version > this.#version) {
                this.#version = delta.version;
                super.setChanges(delta);
            }
        }
    }
}

export default VersionedNode;
