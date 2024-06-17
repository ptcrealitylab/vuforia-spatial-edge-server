import ObjectStore from "./ObjectStore.js";
import Vector3Node from "./Vector3Node.js";
import Vector3Store from "./Vector3Store.js";
import ValueNode from "./ValueNode.js";

class SimpleAnimationComponentStore extends ObjectStore {
    constructor() {
        super();
    }

    /**
     * 
     * @returns {{oldSample: Vector3Node, oldTimestamp: ValueNode<number>, newSample: Vector3Node, newTimestamp: ValueNode<number>}}
     */
    getProperties() {
        return {
            "oldSample": new Vector3Node(new Vector3Store()),
            "oldTimestamp": new ValueNode(0),
            "newSample": new Vector3Node(new Vector3Store()),
            "newTimestamp": new ValueNode(0)
        };
    }
}

export default SimpleAnimationComponentStore;
