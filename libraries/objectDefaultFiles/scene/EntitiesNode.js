import DictionaryNode from "./DictionaryNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./EntityNode.js").EntityNodeState} EntityNodeState
 * @typedef {import("./EntityNode.js").EntityNodeDelta} EntityNodeDelta
 * @typedef {{properties: {[key: string]: EntityNodeState}} & BaseNodeState} EntitiesNodeState
 * @typedef {{properties?: {[key: string]: EntityNodeDelta}} & BaseNodeDelta} EntitiesNodeDelta
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class EntitiesNode extends DictionaryNode {
    static TYPE = "Object.Entities";

    /**
     *
     * @param {DictionaryInterface} listener
     */
    constructor(listener) {
        super(listener, EntitiesNode.TYPE);
    }

    set(key, value) {
        const entity = this.getListener().getEntity();
        entity.setChild(key, value.getEntity());
        super.set(key, value);
    }
}

export default EntitiesNode;
