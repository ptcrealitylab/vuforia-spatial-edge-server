import ObjectNode from "./ObjectNode.js";
import SimpleAnimationComponentStore from "./SimpleAnimationComponentStore.js";

/**
 * @typedef {import("../three/addons/Timer.js").Timer} Timer
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
        super(new SimpleAnimationComponentStore(), SimpleAnimationComponentNode.TYPE);
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
        const parent = node.getParent();
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
    getComponent() {
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
            this.#timer = this.#findWorldNode(this.#entityNode).getTimer();
        }
        const timestamp = this.#timer.getElapsed();
        let sample = {x: 0, y: 0, z: 0};
        if (this.#animation) {
            sample = this.#animation(timestamp);
            if (this.#isInitialized) {
                this.get("oldSample").setValue(this.get("newSample").getValue());
                this.get("oldTimestamp").set(this.get("newTimestamp").get());
            } else {
                this.get("oldSample").setValue(sample);
                this.get("oldTimestamp").set(timestamp - 1);
                this.#isInitialized = true;
            }
            this.get("newSample").setValue(sample);
            this.get("newTimestamp").set(timestamp);
        } else {
            const oldSample = this.get("oldSample").getValue();
            const oldTimestamp = this.get("oldTimestamp").get();
            const newSample = this.get("newSample").getValue();
            const newTimestamp = this.get("newTimestamp").get();
            const interp = (timestamp - oldTimestamp) / (newTimestamp - oldTimestamp);
            sample.x = oldSample.x + (interp * (newSample.x - oldSample.x));
            sample.y = oldSample.y + (interp * (newSample.y - oldSample.y));
            sample.z = oldSample.z + (interp * (newSample.z - oldSample.z));
            sample = newSample;
        }
        this.#entityNode.getEntity().setPosition(sample);
    }
}

export default SimpleAnimationComponentNode;
