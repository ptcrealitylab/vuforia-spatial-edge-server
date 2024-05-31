import DictionaryStore from "./DictionaryStore.js";
import EntityNode from "./EntityNode.js";
import EntityStore from "./EntityStore.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").default} BaseNode
 */

class EntitiesStore extends DictionaryStore {
    #entity;

    /**
     *
     */
    constructor(entityNode) {
        super();
        this.#entity = entityNode.getEntity();
    }

    /**
     * @override
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    create(key, state) {
        if (state.hasOwnProperty("type") && state.type.startsWith(EntityNode.TYPE)) {
            const newEntity = this.#entity.createEntity(key);
            this.#entity.setChild(key, newEntity);
            return new EntityNode(new EntityStore(newEntity));
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

    delete(_key, _oldNode) {
        _oldNode.onDelete();
        return true;
    }
}

export default EntitiesStore;
