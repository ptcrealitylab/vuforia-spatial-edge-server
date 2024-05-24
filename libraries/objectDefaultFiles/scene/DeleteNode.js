import BaseNode from "./BaseNode.js";

/**
 * Indicates that a Node was deleted from the graph
 */
class DeleteNode extends BaseNode {
    static TYPE = "Deleted";

    /**
     *
     */
    constructor() {
        super(DeleteNode.TYPE);
    }

    /**
     * @overrdie
     * @returns {boolean}
     */
    isInternalDirty() {
        return true;
    }

    /**
     * @override
     * @returns {boolean}
     */
    isDirty() {
        return true;
    }

    /**
     * @override
     * @returns {BaseNodeState}
     */
    getChanges() {
        return this.getState();
    }
}

export default DeleteNode;
