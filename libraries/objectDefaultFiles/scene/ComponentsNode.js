import DictionaryNode from "./DictionaryNode.js";
import TransformComponentNode from "./TransformComponentNode.js";
import VisibilityComponentNode from "./VisibilityComponentNode.js";
import SimpleAnimationComponentNode from "./SimpleAnimationComponentNode.js";
import ValueComponentNode from "./ValueComponentNode.js";
import DictionaryComponentNode from "./DictionaryComponentNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./BaseComponentNode.js").BaseComponentNodeState} BaseComponentNodeState
 * @typedef {import("./BaseComponentNode.js").BaseComponentNodeDelta} BaseComponentNodeDelta
 * @typedef {{properties: {[key: string]: BaseComponentNodeState}} & BaseNodeState} ComponentsNodeState
 * @typedef {{properties?: {[key: string]: BaseComponentNodeDelta}} & BaseNodeDelta} ComponentsNodeDelta
 * @typedef {import("./DictionaryNode.js").DictionaryInterface} DictionaryInterface
 */

class ComponentsNode extends DictionaryNode {
    static TYPE = "Object.Components";

    /** @type {EntityNodeInterface} */
    #entityNode

    /**
     *
     * @param {EntityNodeInterface} entityNode
     */
    constructor(entityNode) {
        super(ComponentsNode.TYPE);
        this.#entityNode = entityNode
    }

    set(key, value, makeDirty = true) {
        value.setEntityNode(this.parent);
        const entity = this.parent.entity;
        if (entity) {
            entity.setComponent(key, value.component);
        }
        super.set(key, value, makeDirty);
    }

    /**
     *
     * @param {string} type
     */
    getWithType(type) {
        for (const node of this.values()) {
            if (node.getType() === type) {
                return node;
            }
        }
        return undefined;
    }

    setEntityNode(node) {
        for (const component of this.values()) {
            component.setEntityNode(node);
        }
    }

    /**
     * @override
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {ComponentNode|undefined}
     */
    _create(key, state) {
        if (state.hasOwnProperty("type") && (state.type.startsWith("Object.Component") || state.type.startsWith("Value.Component"))) {
            let ret = this.#entityNode.createComponent(key, state);
            if (!ret) {
                if (state.type === TransformComponentNode.TYPE) {
                    ret = new TransformComponentNode();
                } else if (state.type === VisibilityComponentNode.TYPE) {
                    ret = new VisibilityComponentNode();
                } else if (state.type === SimpleAnimationComponentNode.TYPE) {
                    ret = new SimpleAnimationComponentNode();
                } else if (state.type.startsWith("Object.Component")) {
                    ret = new DictionaryComponentNode(state.type);
                } else {
                    ret = new ValueComponentNode(state.type);
                }
            }
            return ret;
        } else {
            throw Error("Not a component");
        }
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     */
    _cast(_key, _oldNode, _state) {
        throw Error("Can't cast");
    }
}

export default ComponentsNode;
