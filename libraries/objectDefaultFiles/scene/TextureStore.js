import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import {UVMapping, ClampToEdgeWrapping, LinearFilter} from "../../thirdPartyCode/three/three.module.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./TextureNode.js").default} TextureNode
 * @typedef {import("./TextureNode.js").TextureValue} TextureValue
 * @typedef {string} resourceId
 */

class TextureStore extends ObjectStore {
    /** @type {TextureValue} */
    #initValues;

    /**
     *
     * @param {TextureValue} value
     */
    constructor(value = {id: null, mapping: UVMapping, wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping, magFilter: LinearFilter, minFilter: LinearFilter, anisotropy: 1}) {
        super();
        this.#initValues = value;
    }

    /**
     * @override
     * @param {TextureNode} _thisNode
     * @returns {{id: ValueNode<resourceId>, mapping: ValueNode<number>, wrapS: ValueNode<number>, wrapT: ValueNode<number>, magFilter: ValueNode<number>, minFilter: ValueNode<number>, anisotropy: ValueNode<number>}}
     */
    getProperties(_thisNode) {
        return {
            "id": new ValueNode(this.#initValues.id),
            "mapping": new ValueNode(this.#initValues.mapping),
            "wrapS": new ValueNode(this.#initValues.wrapS),
            "wrapT": new ValueNode(this.#initValues.wrapT),
            "magFilter": new ValueNode(this.#initValues.magFilter),
            "minFilter": new ValueNode(this.#initValues.minFilter),
            "anisotropy": new ValueNode(this.#initValues.anisotropy)
        };
    }
}

export default TextureStore;
