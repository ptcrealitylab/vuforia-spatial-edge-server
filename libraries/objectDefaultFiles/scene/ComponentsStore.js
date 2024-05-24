import DictionaryStore from "./DictionaryStore.js";
import DictionaryComponentNode from "./DictionaryComponentNode.js";
import DictionaryComponentStore from "./DictionaryComponentStore.js";
import TransformComponentNode from "./TransformComponentNode.js";
import TransformComponentStore from "./TransformComponentStore.js";
import GLTFLoaderComponentNode from "./GLTFLoaderComponentNode.js";
import GLTFLoaderComponentStore from "./GLTFLOaderComponentStore.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").default} BaseNode
 */

class ComponentsStore extends DictionaryStore {
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
     * @returns {ComponentNode|undefined}
     */
    create(_key, state) {
        if (state.hasOwnProperty("type") && state.type.startsWith("Object.Component")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new GLTFLoaderComponentStore());
            } else if (state.type === TransformComponentNode.TYPE) {
                return new TransformComponentNode(new TransformComponentStore());
            } else {
                return new DictionaryComponentNode(new DictionaryComponentStore(), state.type);
            }
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
