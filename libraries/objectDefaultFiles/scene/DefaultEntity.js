import BaseEntity from "./BaseEntity.js";

/**
 * @typedef {import("./Vector3Node.js").Vector3Value} Vector3Value
 * @typedef {import("./QuaternionNode.js").QuaternionValue} QuaternionValue
 */

class DefaultEntity extends BaseEntity {
    /** @type {Vector3Value} */
    #position;

    /** @type {QuaternionValue} */
    #rotation;

    /** @type {Vector3Value} */
    #scale;

    constructor() {
        super();
        this.#position = {x: 0, y: 0, z: 0};
        this.#rotation = {x: 0, y: 0, z: 0, w: 1};
        this.#scale = {x: 0, y: 0, z: 0};
    }

    /**
     *
     * @returns {Vector3Value}
     */
    getPosition() {
        return this.#position;
    }

    /**
     *
     * @param {Vector3Value} position
     */
    setPosition(position) {
        this.#position = position;
    }

    /**
     *
     * @returns {QuaternionValue}
     */
    getRotation() {
        return this.#rotation;
    }

    /**
     *
     * @param {QuaternionValue} rotation
     */
    setRotation(rotation) {
        this.#rotation = rotation;
    }

    /**
     *
     * @returns {Vector3Value}
     */
    getScale() {
        return this.#scale;
    }

    /**
     *
     * @param {Vector3Value} scale
     */
    setScale(scale) {
        this.#scale = scale;
    }

    /**
     *
     * @param {string} _name
     * @returns {DefaultEntity}
     */
    createEntity(_name) {
        return new DefaultEntity();
    }

    /**
     * 
     * @param {ValueDict} state 
     * @returns {ComponentInterface}
     */
    createComponent(state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new GLTFLoaderComponentStore());
            }
        }
        return null;
    }
}

export default DefaultEntity;
