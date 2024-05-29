import ObjectStore from "./ObjectStore.js";
import Vector3Node from "./Vector3Node.js";
import Vector3Store from "./Vector3Store.js";
import QuaternionNode from "./QuaternionNode.js";
import QuaternionStore from "./QuaternionStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./TransformComponentNode.js").default} TransformComponentNode
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class TransformComponentStore extends ObjectStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {TransformComponentNode} _thisNode
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {
            "position": new Vector3Node(new Vector3Store()),
            "rotation": new QuaternionNode(new QuaternionStore()),
            "scale": new Vector3Node(new Vector3Store({x: 1, y: 1, z: 1}))
        };
    }

    /**
     *
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {

    }

    getComponent() {
        return {update: () => {}};
    }
}

export default TransformComponentStore;
