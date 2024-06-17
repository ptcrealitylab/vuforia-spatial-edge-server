import ObjectStore from "./ObjectStore.js";
import EntitiesNode from "./EntitiesNode.js";
import EntitiesStore from "./EntitiesStore.js";
import ComponentsNode from "./ComponentsNode.js";
import ComponentsStore from "./ComponentsStore.js";
import TransformComponentNode from "./TransformComponentNode.js";
import TransformComponentStore from "./TransformComponentStore.js";

class BaseEntityStore extends ObjectStore {
    /** @type {EntityInterface} */
    #entity;

    /**
     *
     */
    constructor(entity) {
        super();
        this.#entity = entity;
    }

    /**
     * @override
     * @param {EntityNode} thisNode
     * @returns {NodeDict}
     */
    getProperties(thisNode) {
        const ret = {
            "children": new EntitiesNode(new EntitiesStore(thisNode)),
            "components": new ComponentsNode(new ComponentsStore(thisNode))
        };
        return ret;
    }

    /**
     * @returns {EntityInterface}
     */
    getEntity() {
        return this.#entity;
    }

    /**
     *
     * @returns {TransformComponentNode}
     */
    createTransform() {
        return new TransformComponentNode(new TransformComponentStore(this.#entity.getPosition(), this.#entity.getRotation(), this.#entity.getScale()));
    }
}

export default BaseEntityStore;
