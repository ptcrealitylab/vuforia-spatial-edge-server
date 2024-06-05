/**
 * @typedef {{setComponent: (order: number, component: ComponentInterface) => void, removeComponent: (order: number) => void, updateComponents: () => void, setChild: (key: string, child: EntityInterface) => void, getChild: (key: string) => EntityInterface|undefined, removeChild: (key: string) => void, createEntity: (name: string) => EntityInterface}} EntityInterface
 */

class BaseEntity {
    /** @type {{order: number, component: ComponentInterface}[]} */
    #components;

    /** @type {EntityInterface} */
    #children;

    constructor() {
        this.#components = [];
        this.#children = {};
    }

    /**
     *
     * @param {number} order
     * @param {ComponentInterface} component
     */
    setComponent(order, component) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].order > order) {
                this.#components.splice(i, 0, {order, component});
                return;
            }
        }
        this.#components.push({order, component});
    }

    /**
     *
     * @param {number} order
     */
    removeComponent(order) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].order == order) {
                delete this.#components[i];
                return;
            }
        }
    }

    /**
     *
     * @param {number} order
     * @returns {ComponentInterface}
     */
    getComponentByOrder(order) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].order == order) {
                return this.#components[i].component;
            }
        }
        return undefined;
    }

    /**
     *
     * @param {string} type
     * @returns {ComponentInterface}
     */
    getComponentByType(type) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].component.getType() == type) {
                return this.#components[i].component;
            }
        }
        return undefined;
    }

    /**
     *
     * @param {string} type
     * @returns {boolean}
     */
    hasComponentWithType(type) {
        return this.getComponentByType(type) !== undefined;
    }

    /**
     *
     */
    updateComponents() {
        for (let entry of this.#components) {
            entry.component.update();
        }
        for (let child of Object.values(this.#children)) {
            child.updateComponents();
        }
    }

    /**
     *
     * @param {string} key
     * @param {EntityInterface} child
     */
    setChild(key, child) {
        this.#children[key] = child;
    }

    /**
     *
     * @param {string} key
     * @returns {ComponentInterface}
     */
    getChild(key) {
        return this.#children[key];
    }

    /**
     *
     * @param {string} key
     */
    removeChild(key) {
        delete this.#children[key];
    }

    /**
     *
     * @param {string} _name
     * @returns {BaseEntity}
     */
    createEntity(_name) {
        throw Error("Can't instantiate abstract class");
    }

    /**
     *
     */
    internalRelease() {
    }

    /**
     *
     */
    release() {
        BaseEntity.entityReleaser(this);
    }

    /**
     *
     * @param {baseEntity} entity
     */
    static entityReleaser(entity) {
        entity.internalRelease();
        for (let entry of entity.#components) {
            entry.component.release();
        }
        for (let child of Object.values(entity.#children)) {
            BaseEntity.entityReleaser(child);
        }
    }
}

export default BaseEntity;
