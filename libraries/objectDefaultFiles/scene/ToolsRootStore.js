import DefaultEntity from "./DefaultEntity.js";
import DictionaryStore from "./DictionaryStore.js";
import ToolNode from "./ToolNode.js";
import ToolStore from "./ToolStore.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").default} BaseNode
 */

class ToolsRootStore extends DictionaryStore {
    constructor() {
        super();
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {BaseNode}
     */
    create(_key, state) {
        if (state.hasOwnProperty("type") && state.type === ToolNode.TYPE) {
            const ret = new ToolNode(new ToolStore(new DefaultEntity()));
            ret.setState(state);
            return ret;
        }
        return undefined;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     */
    cast(_key, _oldNode, _state) {
        throw Error("ToolsRoot only accepts tools, can't cast");
    }
}

export default ToolsRootStore;
