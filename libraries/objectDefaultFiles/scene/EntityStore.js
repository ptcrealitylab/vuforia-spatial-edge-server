import GLTFLoaderComponentNode from "./GLTFLoaderComponentNode.js";
import GLTFLoaderComponentStore from "./GLTFLoaderComponentStore.js";
import MaterialComponentNode from "./MaterialComponentNode.js";
import MaterialComponentStore from "./MaterialComponentStore.js";
import EntityNode from "./EntityNode.js";
import DefaultEntity from "./DefaultEntity.js";
import BaseEntityStore from "./BaseEntityStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class EntityStore extends BaseEntityStore {
    /**
     *
     */
    constructor(entity) {
        super(entity);
    }

    /**
     *
     * @param {string} _name
     * @returns {DefaultEntity}
     */
    createEntity(_name, _state) {
        return new EntityNode(new EntityStore(new DefaultEntity()));
    }

    /**
     *
     * @param {ValueDict} state
     * @returns {ComponentInterface}
     */
    createComponent(_order, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new GLTFLoaderComponentStore());
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new MaterialComponentNode(new MaterialComponentStore());
            }
        }
        return null;
    }
}

export default EntityStore;
