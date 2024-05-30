import ObjectStore from "./ObjectStore.js";
import Vector3Node from "./Vector3Node.js";
import TriggerVector3Store from "./TriggerVector3Store.js";
import QuaternionNode from "./QuaternionNode.js";
import TriggerQuaternionStore from "./TriggerQuaternionStore.js";

/**
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./TransformComponentNode.js").default} TransformComponentNode
 * @typedef {import("./EntityNode.js").default} EntityNode
 */

class TransformComponentStore extends ObjectStore {
    /** @type {Engine3DPositionNode} */
    #position;

    /** @type {Engine3DRotationNode} */
    #rotation;

    /** @type {Engine3DScaleNode} */
    #scale;

    /** @type {EntityInterface} */
    #entity;

    /** @type {boolean} */
    #entityNeedsUpdate;

    /**
     * @param {Vector3Value} position
     * @param {QuaternionValue} rotation
     * @param {vecotr3Value} scale
     */
    constructor(position, rotation, scale) {
        super();
        this.#position = new Vector3Node(new TriggerVector3Store(() => {this.#entityNeedsUpdate = true;}, position));
        this.#rotation = new QuaternionNode(new TriggerQuaternionStore(() => {this.#entityNeedsUpdate = true;}, rotation));
        this.#scale = new Vector3Node(new TriggerVector3Store(() => {this.#entityNeedsUpdate = true;}, scale));
    }

    /**
     * @override
     * @param {TransfromComponentNode} _thisNode
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {
            "position": this.#position,
            "rotation": this.#rotation,
            "scale": this.#scale
        };
    }

    /**
     *
     * @param {EntityNode} entityNode
     */
    setEntityNode(entityNode) {
        this.#entity = entityNode.getEntity();
    }

    update() {
        if (this.#entityNeedsUpdate) {
            this.#entity.setPosition(this.#position.getValue());
            this.#entity.setRotation(this.#rotation.getValue());
            this.#entity.setScale(this.#scale.getValue());
        }
    }


    getComponent() {
        return this;
    }
}

export default TransformComponentStore;
