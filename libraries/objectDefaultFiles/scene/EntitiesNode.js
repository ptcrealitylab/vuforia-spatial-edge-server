import DictionaryNode from "./DictionaryNode.js";
import BaseEntityNode from "./BaseEntityNode.js"

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./BaseEntityNode.js").EntityNodeState} EntityNodeState
 * @typedef {import("./BaseEntityNode.js").EntityNodeDelta} EntityNodeDelta
 * @typedef {{properties: {[key: string]: EntityNodeState}} & BaseNodeState} EntitiesNodeState
 * @typedef {{properties?: {[key: string]: EntityNodeDelta}} & BaseNodeDelta} EntitiesNodeDelta
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class EntitiesNode extends DictionaryNode {
    static TYPE = "Object.Entities";

    /** @type {EntityNodeInterface} */
    #entityNode;

    /**
     *
     * @param {EntityNodeInterface} entityNode
     */
    constructor(entityNode) {
        super(EntitiesNode.TYPE);
        this.#entityNode = entityNode;
    }

    set(key, value, makeDirty = true) {
        const entity = this.#entityNode.entity;
        entity.setChild(key, value.entity);
        super.set(key, value, makeDirty);
    }

    /**
     * @override
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    _create(key, state) {
        if (state.hasOwnProperty("type") && state.type.startsWith(BaseEntityNode.TYPE)) {
            return this.#entityNode.createEntity(key, state);
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
    _cast(_key, _oldNode, _state) {
        throw Error("Can't cast");
    }

    _delete(_key, _oldNode) {
        _oldNode.onDelete();
        return true;
    }
}

export default EntitiesNode;
