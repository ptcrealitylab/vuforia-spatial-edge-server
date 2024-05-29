import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./ValueNode.js").ValueNodeState} ValueNodeState
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ValueNode.js").ValueInterface} ValueInterface
 * @typedef {import("./BaseNode.js").BaseNode} BaseNode
 * @typedef {{version: number} & ValueNodeState} VersionedNodeState
 * @typedef {{version?: number} & ValueNodeDelta} VersionedNodeDelta
 */

class VersionedNode extends ValueNode {
    static TYPE = "Versioned";

    /** @type {number} */
    #version;

    /**
     *
     * @param {ValueInterface} value
     * @param {number} version
     */
    constructor(value, type = VersionedNode.TYPE, version = -1) {
        super(value, type);
        this.#version = version;
    }

    /**
     * @override
     * @param {Value} value
     */
    set(value) {
        super.set(value);
        this.incrementVersion();
    }

    /**
     *
     */
    incrementVersion() {
        this.#version++;
        this.setDirty();
    }

    getVersion() {
        return this.#version;
    }

    /**
     * @override
     * @returns {VersionedNodeState}
     */
    getState() {
        const ret = super.getState();
        ret.version = this.#version;
        return ret;
    }

    /**
     * @override
     * @param {VersionedNodeState} state
     */
    setState(state) {
        this.#version = state.version;
        super.setState(state);
    }

    /**
     * @override
     * @returns {VersionedNodeDelta}
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
     * @param {VersionedNodeDelta} delta
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
