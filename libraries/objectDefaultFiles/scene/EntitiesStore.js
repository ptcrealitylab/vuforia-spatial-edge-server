import DictionaryStore from "./DictionaryStore.js";
import EntityNode from "./EntityNode.js";
import EntityStore from "./EntityStore.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").default} BaseNode
 */

class EntitiesStore extends DictionaryStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    create(_key, state) {
        if (state.hasOwnProperty("type") && state.type.startssWith(EntityNode.TYPE)) {
            return new EntityNode(new EntityStore());
        } else {
            throw Error("Not an Entity");
        }
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     * @returns {BaseNode|undefined}
     */
    cast (_key, _oldNode, _state) {
        throw Error("Can't cast");
    }
}

export default EntitiesStore;
