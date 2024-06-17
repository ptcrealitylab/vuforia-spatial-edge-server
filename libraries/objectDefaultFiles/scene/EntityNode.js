import ObjectNode from "./ObjectNode.js";

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

class EntityNode extends ObjectNode {
    static TYPE = "Object.Entity";

    /**
     *
     * @param {DictionaryInterface} listener
     * @param {string} type
     */
    constructor(listener, type = EntityNode.TYPE) {
        super(listener, type);
        this.get("components").setEntityNode(this);
        if (!this.get("components").has("0")) {
            this.get("components").set("0", listener.createTransform(), false);
        }
    }

    /**
     *
     * @returns {EntityInterface|null}
     */
    getEntity() {
        return this.getListener().getEntity();
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

    createEntity(key, state) {
        return this.getListener().createEntity(key, state);
    }

    createComponent(order, state) {
        return this.getListener().createComponent(order, state);
    }

    /**
     *
     * @param {number} order
     * @param {ComponentNode} component
     */
    addComponent(order, component, makeDirty = true) {
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

    setPosition(x, y, z) {
        const transform = this.get("components").get(0);
        transform.setPosition({x, y, z});
    }

    setRotation(x, y, z, w) {
        const transform = this.get("components").get(0);
        transform.setRotation({x, y, z, w});
    }

    setScale(x, y, z) {
        const transform = this.get("components").get(0);
        transform.setScale({x, y, z});
    }

    dispose() {
        this.getEntity().dispose();
    }
}

export default EntityNode;
