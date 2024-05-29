import ObjectStore from "./ObjectStore.js";
import EntitiesNode from "./EntitiesNode.js";
import EntitiesStore from "./EntitiesStore.js";
import ComponentsNode from "./ComponentsNode.js";
import ComponentsStore from "./ComponentsStore.js";
import TransformComponentNode from "./TransformComponentNode.js";
import TransformComponentStore from "./TransformComponentStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class EntityStore extends ObjectStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {EntityNode} _thisNode
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        const ret = {
            "children": new EntitiesNode(new EntitiesStore(_thisNode)),
            "components": new ComponentsNode(new ComponentsStore(_thisNode))
        };
        return ret;
    }

    /**
     * @returns {EntityInterface|null}
     */
    getEntity() {
        return null;
    }

    createTransform() {
        return new TransformComponentNode(new TransformComponentStore());
    }
}

export default EntityStore;
