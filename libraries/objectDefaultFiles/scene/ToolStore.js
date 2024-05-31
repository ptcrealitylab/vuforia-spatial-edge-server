import EntityStore from "./EntityStore.js";

/**
 * @typedef {import("./BaseEntity.js").EntityInterface} EntityInterface
 */

class ToolStore extends EntityStore {

    /**
     * @param {EntityInterface} entity
     */
    constructor(entity) {
        super(entity);
    }
}

export default ToolStore;
