import Vector3Store from "./Vector3Store.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerVector3Store extends Vector3Store {
    #onChanged;

    /**
     *
     * @param {Vector3Value} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {x: 0, y: 0, z: 0}) {
        super(value);
        this.#onChanged = onChanged;
    }

    /**
     * @override
     * @param {ObjectNodeDelta} delta
     * @param {(delta: ObjectNodeDelta) => void} defaultApplyChanges
     */
    applyChanges(delta, defaultApplyChanges) {
        defaultApplyChanges(delta);
        this.#onChanged();
    }
};

export default TriggerVector3Store;
