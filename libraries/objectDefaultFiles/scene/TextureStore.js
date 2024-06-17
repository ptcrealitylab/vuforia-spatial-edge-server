import ObjectStore from "./ObjectStore.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";
import {UVMapping, ClampToEdgeWrapping, LinearFilter} from "../../thirdPartyCode/three/three.module.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./TextureNode.js").default} TextureNode
 * @typedef {import("./TextureNode.js").TextureValue} TextureValue
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
     * @returns {{id: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "id": new ValueNode(new ValueStore(this.#initValues.id)),
            "mapping": new ValueNode(new ValueStore(this.#initValues.mapping)),
            "wrapS": new ValueNode(new ValueStore(this.#initValues.wrapS)),
            "wrapT": new ValueNode(new ValueStore(this.#initValues.wrapT)),
            "magFilter": new ValueNode(new ValueStore(this.#initValues.magFilter)),
            "minFilter": new ValueNode(new ValueStore(this.#initValues.minFilter)),
            "anisotropy": new ValueNode(new ValueStore(this.#initValues.anisotropy))
        };
    }
}

export default TextureStore;
