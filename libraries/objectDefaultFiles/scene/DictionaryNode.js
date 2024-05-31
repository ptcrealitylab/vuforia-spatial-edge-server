import BaseNode from "./BaseNode.js";
import DeleteNode from "./DeleteNode.js";
import ObjectNode from "./ObjectNode.js";

/**
 * @typedef {import("./ObjectNode.js").DefaultApplyChangesFunc} DefaultApplyChangesFunc
 * @typedef {import("./ObjectNode.js").ObjectNodeState} ObjectNodeState
 * @typedef {import("./ObjectNode.js").ObjectNodeDelta} ObjectNodeDelta
 * @typedef {import("./ObjectNode.js").NodeDict} NodeDict
 * @typedef {import("./BaseNode.js").BaseNodeState} BaseNodeState
 * @typedef {{create: (key: string, state: BaseNodeState) => BaseNode|undefined, cast: (key: string, old: BaseNode, state: BaseNodeState) => BaseNode|undefined, delete: (key: string, old: BaseNode) => boolean, applyChanges: (delta: ObjectNodeDelta, defaultApplyChanges: DefaultApplyChangesFunc) => void}} DictionaryInterface
 */

class DictionaryNode extends BaseNode {
    static TYPE = "Object.Dictionary";

    /** @type {NodeDict} */
    #properties;

    /** @type {boolean} */
    #isPropertiesDirty;

    /** @type {DictionaryInterface} */
    #listener;

    /**
     *
     * @param {string} type
     */
    constructor(listener, type = DictionaryNode.TYPE) {
        super(type);
        this.#listener = listener;
        this.#properties = {};
        this.#isPropertiesDirty = false;
    }

    getListener() {
        return this.#listener;
    }

    /**
     *
     */
    clear() {
        for (const key of Object.keys(this.#properties)) {
            this.delete(key);
        }
    }

    /**
     *
     * @param {string} key
     */
    delete(key) {
        if (this.#properties.hasOwnProperty(key)) {
            this.#listener.delete(key, this.#properties[key]);
            this.set(key, new DeleteNode(this));
        }
    }

    /**
     *
     * @returns {[string, Node][]}
     */
    entries() {
        const rawEntries = Object.entries(this.#properties);
        const ret = [];
        for (const entry of rawEntries) {
            if ((entry[1] instanceof DeleteNode)) continue;
            ret.push(entry);
        }
        return ret;
    }

    /**
     *
     * @param {(node: BaseNode, key: string, thisArg: any) => void} callbackFunc
     * @param {any} thisArg
     */
    forEach(callbackFunc, thisArg = undefined) {
        const callback = thisArg ? callbackFunc.bind(thisArg) : callbackFunc;
        const rawEntries = Object.entries(this.#properties);
        for (const entry of rawEntries) {
            if (entry[1] instanceof DeleteNode) continue;
            callback(entry[1], entry[0], this);
        }
    }

    /**
     *
     * @param {string} key
     * @returns {BaseNode|undefined}
     */
    get(key) {
        if (!this.#properties.hasOwnProperty(key)) {
            return undefined;
        }
        return this.#properties[key] instanceof DeleteNode ? undefined : this.#properties[key];
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
        const rawEntries = Object.entries(this.#properties);
        const ret = [];
        for (const entry of rawEntries) {
            if (!(entry[1] instanceof DeleteNode)) {
                ret.push(entry[0]);
            }
        }
        return ret;
    }

    /**
     *
     * @param {string} key
     * @param {ToolRenderNode} value
     */
    set(key, value, makeDirty = true) {
        this.#properties[key] = value;
        value.setParent(this);
        if (makeDirty) {
            value.setTypeDirty();
            value.setDirty();
            ObjectNode.setChildrenDirty(value);
        }
    }

    /**
     *
     * @returns {string[]}
     */
    values() {
        const rawValues = Object.values(this.#properties);
        const ret = [];
        for (const value of rawValues) {
            if (!(value instanceof DeleteNode)) {
                ret.push(value);
            }
        }
        return ret;
    }

    /**
     * @override
     * @returns {boolean}
     */
    isInternalDirty() {
        return this.#isPropertiesDirty;
    }

    /**
     * @override
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
                state.properties[key] = new DeleteNode().getState();
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
            const deleteMarkers = [];
            for (const entry of Object.entries(this.#properties)) {
                if (entry[1].isDirty()) {
                    ret.properties[entry[0]] = entry[1].getChanges();
                    if (entry[1] instanceof DeleteNode) {
                        deleteMarkers.push(entry[0]);
                    }
                }
            }
            for (const entry of deleteMarkers) {
                delete this.#properties[entry];
            }
        }
        return ret;
    }

    /**
     * @override
     * @param {ObjectToolRenderNodeDelta} delta
     * @param {boolean} useSetState
     */
    setChanges(delta, useSetState = false) {
        this.#listener.applyChanges(delta, (modifiedDelta) => this.#applyChanges(modifiedDelta, useSetState));
    }

    /**
     *
     * @param {ObjectToolRenderNode} delta
     * @param {boolean} useSetState
     */
    #applyChanges(delta, useSetState) {
        if (delta.hasOwnProperty("properties")) {
            for (const entry of Object.entries(delta.properties)) {
                if (this.#properties.hasOwnProperty(entry[0])) {
                    if (entry[1].hasOwnProperty("type")) {
                        if (entry[1].type === DeleteNode.TYPE) {
                            const canDelete = this.#listener.delete(entry[0], this.#properties[entry[0]]);
                            if (canDelete) {
                                delete this.#properties[entry[0]];
                            }
                        } else if (entry[1].type !== this.#properties[entry[0]].getType()) {
                            const newNode = this.#listener.cast(entry[0], this.#properties[entry[0]], entry[1]);
                            if (newNode !== undefined) {
                                this.#properties[entry[0]] = newNode;
                            }
                        } else {
                            if (useSetState) {
                                this.#properties[entry[0]].setState(entry[1]);
                            } else {
                                this.#properties[entry[0]].setChanges(entry[1]);
                            }
                        }
                    } else {
                        if (useSetState) {
                            this.#properties[entry[0]].setState(entry[1]);
                        } else {
                            this.#properties[entry[0]].setChanges(entry[1]);
                        }
                    }
                } else {
                    if (!(entry[1].hasOwnProperty("type") && entry[1].type === DeleteNode.TYPE)) {
                        const newProp = this.#listener.create(entry[0], entry[1]);
                        if (newProp) {
                            newProp.setParent(this);
                            newProp.setState(entry[1]);
                            this.#properties[entry[0]] = newProp;
                        }
                    }
                }
            }
        }
    }
}

export default DictionaryNode;
