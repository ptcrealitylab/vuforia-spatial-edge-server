import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./ValueNode.js").ValueNodeDelta} ValueNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {{id: string, mapping: number, wrapS: number, wrapT: number, magFilter: number, minFilter: number, anisotropy: number}} TextureValue
 * @typedef {BaseNodeDelta & {id: string}} TextureDelta
 */

class TextureNode extends ObjectNode {
    static TYPE = "Object.Texture";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, TextureNode.TYPE);
    }
}

export default TextureNode;
