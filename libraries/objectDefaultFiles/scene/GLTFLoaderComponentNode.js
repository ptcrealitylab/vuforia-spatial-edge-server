import BaseComponentNode from "./BaseComponentNode.js";
import VersionedNode from "./VersionedNode.js";

class GLTFLoaderComponentNode extends BaseComponentNode {
    static TYPE = BaseComponentNode.TYPE + ".GLTFLoader";

    /**
     *
     */
    constructor() {
        super(GLTFLoaderComponentNode.TYPE);
        this._set("url", new VersionedNode(""));
    }

    setUrl(url) {
        this.get("url").value = url;
    }

    setEntityNode(_node) {
    }

    update() {
    }

    get component() {
        return this;
    }

    release() {
    }
}

export default GLTFLoaderComponentNode;
