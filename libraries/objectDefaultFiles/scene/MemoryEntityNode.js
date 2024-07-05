import BaseEntityNode from "./BaseEntityNode.js";
import MemoryEntity from "./MemoryEntity.js";
import GLTFLoaderComponentNode from "./GLTFLoaderComponentNode.js";
import MaterialComponentNode from "./MaterialComponentNode.js";

class MemoryEntityNode extends BaseEntityNode {
    /**
     * @param {MemoryEntity} entity
     * @param {string} type  
     */
    constructor(entity, type = BaseEntityNode.TYPE) {
        super(entity, type);
    }

     /**
     * @param {string} _key
     * @param {string} _name 
     * @returns {MemoryEntity}
     */
     createEntity(_key, _name) {
        return new MemoryEntityNode(new MemoryEntity());
    }

    /**
     * @param {number} _index
     * @param {ValueDict} state 
     * @returns {ComponentInterface}
     */
    createComponent(_index, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode();
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new MaterialComponentNode();
            }
        }
        return null;
    }
}

export default MemoryEntityNode;
