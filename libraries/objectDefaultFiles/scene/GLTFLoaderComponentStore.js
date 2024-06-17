import ObjectStore from "./ObjectStore.js";
import VersionedNode from "./VersionedNode.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./GLTFLoaderComponentNode.js").default} GLTFLoaderComponentNode
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class GLTFLoaderComponentStore extends ObjectStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     * @override
     * @param {GLTFLoaderComponentNode} _thisNode
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {
            "url": new VersionedNode("")
        };
    }

    /**
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {

    }

    update() {
    }

    release() {
    }
}

export default GLTFLoaderComponentStore;
