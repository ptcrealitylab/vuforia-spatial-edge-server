import ObjectNode from "./ObjectNode.js";
import {UVMapping, ClampToEdgeWrapping, LinearFilter} from "../../thirdPartyCode/three/three.module.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{id: string, mapping: number, wrapS: number, wrapT: number, magFilter: number, minFilter: number, anisotropy: number}} TextureValue
 * @typedef {BaseNodeDelta & {id: string}} TextureDelta
 * @typedef {(node: TextureNode) => void} onChangedFunc
 */

class TextureNode extends ObjectNode {
    static TYPE = "Object.Texture";

    /** @type {onChangedFunc|null} */
    #onChanged

    /**
     *
     * @param {TextureValue} value
     */
    constructor(value = {id: null, mapping: UVMapping, wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping, magFilter: LinearFilter, minFilter: LinearFilter, anisotropy: 1}) {
        super(TextureNode.TYPE);
        this._set("id", new ValueNode(value.id));
        this.#addValue("mapping", value.mapping);
        this.#addValue("wrapS", value.wrapS);
        this.#addValue("wrapT", value.wrapT);
        this.#addValue("magFilter", value.magFilter);
        this.#addValue("minFilter", value.minFilter);
        this.#addValue("anisotropy", value.anisotropy);
        this.#onChanged = null;
    }

    /**
     * 
     * @param {string} key 
     * @param {number|string} value 
     */
    #addValue(key, value) {
        const node = new ValueNode(value);
        node.onChanged = (_node) => {this.#safeOnChanged();};
        this._set(key, node);
    }

    /**
     * 
     */
    #safeOnChanged() {
        if (this.#onChanged) {
            this.#onChanged(this);
        }
    }

    /**
     * @returns {onChangedFunc} 
     */
    get onChanged() {
        return this.#onChanged;
    }
    
    /**
     * @param {onChangedFunc} onChanged
     */
    set onChanged(onChanged) {
        this.#onChanged = onChanged;
    }

    /** @returns {string} */
    get id() {
        return this.get("id").value;
    }

    /**
     * @returns {number}
     */
    get mapping() {
        return this.get("mapping").value;
    }

    /**
     * @param {number} value
     */
    set mapping(value) {
        this.get("mapping").value = value;
    }

    /**
     * @returns {number}
     */
    get wrapS() {
        return this.get("wrapS").value;
    }

    /**
     * @param {number} value
     */
    set wrapS(value) {
        this.get("wrapS").value = value;
    }

    /**
     * @returns {number}
     */
    get wrapT() {
        return this.get("wrapT").value;
    }

    /**
     * @param {number} value
     */
    set wrapT(value) {
        this.get("wrapT").value = value;
    }

    /**
     * @returns {number}
     */
    get magFilter() {
        return this.get("magFilter").value;
    }

    /**
     * @param {number} value
     */
    set magFilter(value) {
        this.get("magFilter").value = value;
    }

    /**
     * @returns {number}
     */
    get minFlter() {
        return this.get("minFilter").value;
    }

    /**
     * @param {number} value
     */
    set minFilter(value) {
        this.get("minFilter").value = value;
    }

    /**
     * @returns {number}
     */
    get anisotropy() {
        return this.get("anisotropy").value;
    }

    /**
     * @param {number} value
     */
    set anisotropy(value) {
        this.get("anisotropy").value = value;
    }
}

export default TextureNode;
