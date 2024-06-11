import BaseEntity from "./BaseEntity.js";
import GLTFLoaderComponentNode from "./GLTFLoaderComponentNode.js";
import GLTFLoaderComponentStore from "./GLTFLoaderComponentStore.js";
import MaterialComponentNode from "./MaterialComponentNode.js";
import EntityNode from "./EntityNode.js";
import EntityStore from "./EntityStore.js";

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
     * @param {boolean} isVisible
     */
    setVisible(isVisible) {
        this.#isVisible = isVisible;
    }

    /**
     *
     * @returns {boolean}
     */
    isVisible() {
        return this.#isVisible;
    }

    /**
     *
     * @param {string} _name
     * @returns {DefaultEntity}
     */
    createEntity(_name, _state) {
        return new EntityNode(new EntityStore(new DefaultEntity()));
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
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new MaterialComponentNode(new MaterialComponentStore());
            }
        }
        return null;
    }

    dispose() {
    }
}

export default DefaultEntity;
