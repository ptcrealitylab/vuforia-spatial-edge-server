import ObjectStore from "./ObjectStore.js";
import Vector3Node from "./Vector3Node.js";
import Vector3Store from "./Vector3Store.js";
import ValueNode from "./ValueNode.js";
import ValueStore from "./ValueStore.js";

class SimpleAnimationComponentStore extends ObjectStore {
    constructor() {
        super();
    }

    getProperties() {
        return {
            "oldSample": new Vector3Node(new Vector3Store()),
            "oldTimestamp": new ValueNode(new ValueStore(0)),
            "newSample": new Vector3Node(new Vector3Store()),
            "newTimestamp": new ValueNode(new ValueStore(0))
        };
    }
}

export default SimpleAnimationComponentStore;
