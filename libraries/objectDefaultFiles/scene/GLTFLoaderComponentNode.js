import BaseComponentNode from "./BaseComponentNode.js";

class GLTFLoaderComponentNode extends BaseComponentNode {
    static TYPE = BaseComponentNode.TYPE + ".GLTFLoader";

    /**
     *
     * @param {ObjectInterface} listener
     */
    constructor(listener) {
        super(listener, GLTFLoaderComponentNode.TYPE);
    }

    setUrl(url) {
        this.get("url").set(url);
    }

    setEntityNode(node) {
        this.getListener().setEntityNode(node);
    }

    update() {
        this.getListener().update();
    }

    getComponent() {
        return this;
    }
}

export default GLTFLoaderComponentNode;
