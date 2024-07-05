import BaseNode from "./BaseNode.js";

/**
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {import("./BaseNode.js").BaseNodeDelta} BaseNodeDelta
 * @typedef {{[key: string]: BaseNode}} NodeDict
 * @typedef {{properties: {[key: string]: BaseNodeState}} & BaseNodeState} ObjectNodeState
 * @typedef {{properties?: {[key: string]: BaseNodeDelta}} & BaseNodeDelta} ObjectNodeDelta
 * @typedef {(delta: ObjectNodeDelta) => void} DefaultApplyChangesFunc
 * @typedef {{getProperties: (thisNode: ObjectNode) => NodeDict, applyChanges: (delta: ObjectNodeDelta, defaultApplyChanges: DefaultApplyChangesFunc)}} ObjectInterface
 */

class ObjectNode extends BaseNode {
    static TYPE = "Object";

    /** @type {NodeDict} */
    #properties;

    /** @type {boolean} */
    #isPropertiesDirty;

    /**
     *
     * @param {string} type
     */
    constructor(type) {
        super(type);
        this.#properties = {};
        this.#isPropertiesDirty = false;
    }

    /**
     *
     * @returns {[string, Node][]}
     */
    entries() {
        return Object.entries(this.#properties);
    }

    /**
     *
     * @param {(node: BaseNode, key: string, thisArg: any) => void} callbackFunc
     * @param {any} thisArg
     */
    forEach(callbackFunc, thisArg = undefined) {
        const callback = thisArg ? callbackFunc.bind(thisArg) : callbackFunc;
        const entries = Object.entries(this.#properties);
        for (const entry of entries) {
            callback(entry[1], entry[0], this);
        }
    }

    /**
     *
     * @param {string} key
     * @returns {BaseNode|undefined}
     */
    get(key) {
        return this.#properties[key];
    }

    /**
     *
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== undefined;
    }

    /**
     *
     * @returns {string[]}
     */
    keys() {
        return Object.keys(this.#properties);
    }

    /**
     *
     * @param {string} key
     * @param {BaseNode} node
     */
    _set(key, node) {
        this.#properties[key] = node;
        node.parent = this;
    }

    /**
     *
     * @returns {BaseNode[]}
     */
    values() {
        return Object.values(this.#properties);
    }

    /**
     *
     * @returns {boolean}
     */
    isInternalDirty() {
        return this.#isPropertiesDirty;
    }

    /**
     *
     */
    setInternalDirty() {
        this.#isPropertiesDirty = true;
    }

    /**
     * @override
     * @returns {boolean}
     */
    isDirty() {
        return super.isDirty() || this.isInternalDirty();
    }

    /**
     * @override
     */
    setDirty() {
        this.setInternalDirty();
        super.setDirty(this);
    }

    /**
     * @override
     * @returns {ObjectNodeState}
     */
    getState() {
        const ret = super.getState();
        ret.properties = {};
        for (const entry of Object.entries(this.#properties)) {
            ret.properties[entry[0]] = entry[1].getState();
        }
        return ret;
    }

    /**
     * @override
     * @param {ObjectNodeState} state
     */
    setState(state) {
        // add remove tokens for all elements not in the given state
        for (const key of Object.keys(this.#properties)) {
            if (!state.properties.hasOwnProperty(key)) {
                throw Error("Can't delete property from Object");
            }
        }
        this.setChanges(state, true);
    }

    /**
     * @override
     * @returns {ObjectNodeDelta}
     */
    getChanges() {
        const ret = super.getChanges();
        if (this.#isPropertiesDirty) {
            ret.properties = {};
            this.#isPropertiesDirty = false;
            for (const entry of Object.entries(this.#properties)) {
                if (entry[1].isDirty()) {
                    ret.properties[entry[0]] = entry[1].getChanges();
                }
            }
        }
        return ret;
    }

    /**
     * @override
     * @param {ObjectNodeDelta} delta
     * @param {boolean} useSetState
     */
    setChanges(delta, useSetState = false) {
        if (delta.hasOwnProperty("properties")) {
            for (const entry of Object.entries(delta.properties)) {
                if (this.#properties.hasOwnProperty(entry[0])) {
                    if (!entry[1].hasOwnProperty("type") || (entry[1].type === this.#properties[entry[0]].getType())) {
                        if (useSetState) {
                            this.#properties[entry[0]].setState(entry[1]);
                        } else {
                            this.#properties[entry[0]].setChanges(entry[1]);
                        }
                    } else {
                        throw Error("Can't change property type on Object " + this.#properties[entry[0]].getType() + " -> " + entry[1].type);
                    }
                } else {
                    throw Error("Can't add property to Object");
                }
            }
        }
    }

    /**
     *
     * @param {ToolRenderNode} node
     */
    static setChildrenDirty(node) {
        if (node.forEach) {
            node.forEach((childNode, _childKey, _thisArg) => {
                childNode.setTypeDirty();
                childNode.setInternalDirty();
                ObjectNode.setChildrenDirty(childNode);
            });
        }
    }
}

export default ObjectNode;
