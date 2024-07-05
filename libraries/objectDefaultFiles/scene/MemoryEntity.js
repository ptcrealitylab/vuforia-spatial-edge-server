import BaseEntity from "./BaseEntity.js";

/**
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 */

class MemoryEntity extends BaseEntity {
    /** @type {Vector3Value} */
    #position;

    /** @type {QuaternionValue} */
    #rotation;

    /** @type {Vector3Value} */
    #scale;

    /** @type {boolean} */
    #isVisible;

    constructor() {
        super();
        this.#position = {x: 0, y: 0, z: 0};
        this.#rotation = {x: 0, y: 0, z: 0, w: 1};
        this.#scale = {x: 1, y: 1, z: 1};
        this.#isVisible = true;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    get position() {
        return this.#position;
    }

    /**
     *
     * @param {Vector3Value} position
     */
    set position(position) {
        this.#position = position;
    }

    /**
     *
     * @returns {QuaternionValue}
     */
    get rotation() {
        return this.#rotation;
    }

    /**
     *
     * @param {QuaternionValue} rotation
     */
    set rotation(rotation) {
        this.#rotation = rotation;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    get scale() {
        return this.#scale;
    }

    /**
     *
     * @param {Vector3Value} scale
     */
    set scale(scale) {
        this.#scale = scale;
    }

    /**
     *
     * @param {boolean} isVisible
     */
    set isVisible(isVisible) {
        this.#isVisible = isVisible;
    }

    /**
     *
     * @returns {boolean}
     */
    get isVisible() {
        return this.#isVisible;
    }

    dispose() {
    }
}

export default MemoryEntity;
