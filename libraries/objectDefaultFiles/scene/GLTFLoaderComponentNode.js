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
        this.get("url").value = url;
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

    release() {
        this.getListener().release();
    }
}

export default GLTFLoaderComponentNode;
