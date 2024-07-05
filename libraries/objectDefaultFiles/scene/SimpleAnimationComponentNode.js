import ObjectNode from "./ObjectNode.js";
import Vector3Node from "./Vector3Node.js";
import ValueNode from "./ValueNode.js";

/**
 * @typedef {import("../three/addons/DateTimer.js").Timer} Timer
 * @typedef {import("./Vector3Node").Vector3Value} Vector3Value;
 * @typedef {number} Seconds
 * @typedef {(timestamp: Seconds) => Vector3Value} animationFunc
 */

class SimpleAnimationComponentNode extends ObjectNode {
    static TYPE = "Object.Component.SimpleAnimationComponent";

    /** @type {EntityNode|null} */
    #entityNode;

    /** @type {Timer|null} */
    #timer;

    /** @type {animationFunc|null} */
    #animation;

    /** @type {boolean} */
    #isInitialized;

    /**
     *
     * @param {animationFunc|null} animation
     */
    constructor(animation = null) {
        super(SimpleAnimationComponentNode.TYPE);
        this._set("oldSample", new Vector3Node());
        this._set("oldTimestamp", new ValueNode(0));
        this._set("newSample", new Vector3Node());
        this._set("newTimestamp", new ValueNode(0));
        this.#animation = animation;
        this.#isInitialized = false;
        this.#timer = null;
        this.entityNode = null;
    }

    /**
     *
     * @param {BaseNode} node
     * @returns {WorldNode}
     */
    #findWorldNode(node) {
        const parent = node.parent;
        if (parent) {
            return this.#findWorldNode(parent);
        }
        return node;
    }

    /**
     *
     * @param {EntityNode} node
     */
    setEntityNode(node) {
        this.#entityNode = node;
    }

    /**
     * @returns {SimpleAnimationComponentNode}
     */
    get component() {
        return this;
    }

    /**
     *
     * @param {AnimationFunc} animation
     */
    setAnimation(animation) {
        this.#animation = animation;
        this.#isInitialized = false;
    }

    update() {
        if (!this.#timer) {
            this.#timer = this.#findWorldNode(this.#entityNode).timer;
        }
        const timestamp = this.#timer.getElapsed();
        let sample = {x: 0, y: 0, z: 0};
        if (this.#animation) {
            sample = this.#animation(timestamp);
            if (this.#isInitialized) {
                this.get("oldSample").value = this.get("newSample").value;
                this.get("oldTimestamp").value = this.get("newTimestamp").value;
            } else {
                this.get("oldSample").value = sample;
                this.get("oldTimestamp").value = timestamp - 1;
                this.#isInitialized = true;
            }
            this.get("newSample").value = sample;
            this.get("newTimestamp").value = timestamp;
        } else {
            const oldSample = this.get("oldSample").value;
            const oldTimestamp = this.get("oldTimestamp").value;
            const newSample = this.get("newSample").value;
            const newTimestamp = this.get("newTimestamp").value;
            const interp = (timestamp - oldTimestamp) / (newTimestamp - oldTimestamp);
            sample.x = oldSample.x + (interp * (newSample.x - oldSample.x));
            sample.y = oldSample.y + (interp * (newSample.y - oldSample.y));
            sample.z = oldSample.z + (interp * (newSample.z - oldSample.z));
            sample = newSample;
        }
        this.#entityNode.entity.position = sample;
    }

    release() {
    }
}

export default SimpleAnimationComponentNode;
