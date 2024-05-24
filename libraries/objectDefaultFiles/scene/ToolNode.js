import EntityNode from "./EntityNode.js";

/**
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 */

class ToolNode extends EntityNode {
    static TYPE = "Object.Tool";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, ToolNode.TYPE);
    }
}

export default ToolNode;
