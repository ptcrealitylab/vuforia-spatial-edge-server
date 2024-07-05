import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ToolNode.js").ToolNodeState} ToolNodeState
 * @typedef {import("./ToolNode.js").ToolNodeDelta} ToolNodeDelta
 * @typedef {{properties: {[key: string]: ToolNodeState}} & BaseNodeState} ToolsRootNodeState
 * @typedef {{properties?: {[key: string]: ToolNodeDelta}} & BaseNodeDelta} ToolsRootNodeDelta
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 * @typedef {() => BaseNode} TypeConstructionFunc
 * @typedef {{[type: string]: TypeConstructionFunc}} TypeConstructionDictionary
 */

class ToolsRootNode extends DictionaryNode {
    static TYPE = "Object.ToolsRoot";

    /** @type {TypeConstructionDictionary} */
    #typeDictionary;

    /**
     *
     */
    constructor() {
        super(ToolsRootNode.TYPE);
        this.#typeDictionary = {};
    }

    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        ret.properties[toolId] = this.get(toolId).getState();
        return ret;
    }

    registerType(type, constructorFunc) {
        this.#typeDictionary[type] = constructorFunc;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {BaseNode}
     */
    _create(_key, state) {
        if (state.hasOwnProperty("type") && this.#typeDictionary.hasOwnProperty(state.type)) {
            const ret = this.#typeDictionary[state.type]();
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
    _cast(_key, _oldNode, _state) {
        throw Error("ToolsRoot only accepts tools, can't cast");
    }
}

export default ToolsRootNode;
