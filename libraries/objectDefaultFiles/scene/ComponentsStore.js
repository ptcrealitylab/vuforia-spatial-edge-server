import DictionaryStore from "./DictionaryStore.js";
import DictionaryComponentNode from "./DictionaryComponentNode.js";
import DictionaryComponentStore from "./DictionaryComponentStore.js";
import TransformComponentNode from "./TransformComponentNode.js";
import TransformComponentStore from "./TransformComponentStore.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").default} BaseNode
 */

class ComponentsStore extends DictionaryStore {
    #entityNode;

    /**
     * @param {EntityNode} entityNode
     */
    constructor(entityNode) {
        super();
        this.#entityNode = entityNode;
    }

    /**
     * @override
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {ComponentNode|undefined}
     */
    create(key, state) {
        if (state.hasOwnProperty("type") && state.type.startsWith("Object.Component")) {
            let ret = this.#entityNode.getEntity().createComponent(state);
            if (!ret && state.type.startsWith("Object.Component")) {
                if (state.type === TransformComponentNode.TYPE) {
                    ret = new TransformComponentNode(new TransformComponentStore());
                } else {
                    ret = new DictionaryComponentNode(new DictionaryComponentStore(), state.type);
                }
            }
            if (ret) {
                ret.setEntityNode(this.#entityNode);
                const entity = this.#entityNode.getEntity();
                if (entity) {
                    entity.setComponent(key, ret.getComponent());
                }
            }
            return ret;
        } else {
            throw Error("Not a component");
        }
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     */
    cast(_key, _oldNode, _state) {
        throw Error("Can't cast");
    }
}

export default ComponentsStore;
