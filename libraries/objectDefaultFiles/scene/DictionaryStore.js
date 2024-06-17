import DictionaryNode from "./DictionaryNode.js";
import ValueNode from "./ValueNode.js";
import VersionedNode from "./VersionedNode.js";

/**
 * @typedef {import("./ObjectNode").ObjectNodeState} ObjectNodeState
 * @typedef {import("./ObjectNode").ObjectNodeDelta} ObjectNodeDelta
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

/**
 * @implements {DictionaryInterface}
 */
class DictionaryStore {
    /**
     *
     */
    constructor() {

    }

    /**
     *
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    create(_key, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type.startsWith("Object")) {
                return new DictionaryNode(new DictionaryStore(), state.type);
            } else if (state.type.startsWith("Value")) {
                if (!state.hasOwnProperty("value")) {
                    throw Error("Can't create ValueNode without initial value");
                }
                return new ValueNode(state.value, state.type);
            } else if (state.type.startsWith("Versioned")) {
                if (!state.hasOwnProperty("value")) {
                    throw Error("Can't create VaersionedNode without initial value");
                }
                if (!state.hasOwnProperty("version")) {
                    throw Error("Can't create VersionedNode without initial version");
                }
                return new VersionedNode(state.value, state.type, state.version);
            } else {
                throw Error("Can't create property with type: " + state.type);
            }
        } else {
            throw Error("Can't create property without type information");
        }
    }

    /**
     *
     * @param {string} key
     * @param {BaseNode} old
     * @param {ObjectNodeState} state
     * @returns {BaseNode|undefined}
     */
    cast(key, old, state) {
        this.delete(key, old);
        return this.create(key, state);
    }

    /**
     *
     * @param {string} _key
     * @param {BaseNode} _old
     * @returns {boolean}
     */
    delete(_key, _old) {
        return true;
    }

    /**
     * @override
     * @param {ObjectNodeDelta} delta
     * @param {(delta: ObjectNodeDelta) => void} defaultApplyChanges
     */
    applyChanges(delta, defaultApplyChanges) {
        defaultApplyChanges(delta);
    }
}

export default DictionaryStore;
