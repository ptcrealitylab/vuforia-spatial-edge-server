import ComponentsNode from "./ComponentsNode.js";
import EntitiesNode from "./EntitiesNode.js";
import ObjectNode from "./ObjectNode.js";
import TransformComponentNode from "./TransformComponentNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {import("./EntitiesNode.js").EntitiesNodeState} EntitiesNodeState
 * @typedef {import("./EntitiesNode.js").EntitiesNodeDelta} EntitiesNodeDelta
 * @typedef {import("./ComponentsNode.js").ComponentsNodeState} ComponentsNodeState
 * @typedef {import("./ComponentsNode.js").ComponentsNodeDelta} ComponentsNodeDelta
 * @typedef {{properties: {children: EntitiesNodeState, components: ComponentsNodeState}} & BaseNodeState} EntityNodeState
 * @typedef {{properties?: {children?: EntitiesNodeDelta, components?: ComponentsNodeDelta}} & BaseNodeDelta} EntityNodeDelta
 * @typedef {import("./ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("./DictionaryComponentNode.js").default} ComponentNode
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 * @typedef {{getPosition: () => Vector3Value, setPosition: (position: Vector3Value) => void, getRotation: () => QuaternionValue, setRotation: (rotation: QuaternionValue) => void, getScale: () => Vector3Value, setScale: (scale: Vector3Value) => void}} EntityInterface
 */

class BaseEntityNode extends ObjectNode {
    static TYPE = "Object.Entity";

    /** @tpye {EntityInterface} */
    #entity;
    
    /**
     * @param {EntityInterface} entity
     * @param {string} type
     */
    constructor(entity, type = BaseEntityNode.TYPE) {
        super(type);
        this._set("children", new EntitiesNode(this));
        this._set("components", new ComponentsNode(this));
        this.#entity = entity
        this.setComponent("0", new TransformComponentNode(this.#entity), false);
    }

    get entity() {
        return this.#entity;
    }

    /**
     *
     * @param {string} name
     * @returns {boolean}
     */
    hasChild(name) {
        return this.get("children").has(name);
    }

    getChild(name) {
        return this.get("children").get(name);
    }

    /**
     *
     * @param {string} name
     * @param {EntityNode} entity
     */
    setChild(name, entity, makeDirty = true) {
        this.get("children").set(name, entity, makeDirty);
    }

    /**
     *
     * @param {number} order
     * @param {ComponentNode} component
     */
    setComponent(order, component, makeDirty = true) {
        this.get("components").set(order, component, makeDirty);
    }

    /**
     *
     * @param {string} type
     */
    getComponentByType(type) {
        return this.get("components").getWithType(type);
    }

    /**
     *
     * @param {string} type
     */
    hasComponentWithType(type) {
        return this.getComponentByType(type) !== undefined;
    }

    /**
     * @param {Vector3Value} value
     */
    set position(value) {
        const transform = this.get("components").get(0);
        transform.position = value;
    }

    /**
     * @param {QuaternionValue} value
     */
    set rotation(value) {
        const transform = this.get("components").get(0);
        transform.rotation = value;
    }

    /**
     * @param {Vector3Value} value
     */
    set scale(value) {
        const transform = this.get("components").get(0);
        transform.scale = value;
    }
}

export default BaseEntityNode;
