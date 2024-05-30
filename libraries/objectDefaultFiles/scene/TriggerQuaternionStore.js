import QuaternionStore from "./QuaternionStore.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerQuaternionStore extends QuaternionStore {
    #onChanged;

    /**
     *
     * @param {QuaternionValue} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {x: 0, y: 0, z: 0, w: 0}) {
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

export default TriggerQuaternionStore;
