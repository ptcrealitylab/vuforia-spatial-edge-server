import EulerAnglesStore from "./EulerAnglesStore.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerEulerAnglesStore extends EulerAnglesStore {
    #onChanged;

    /**
     *
     * @param {EulerAnglesValue} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {x: 0, y: 0, z: 0, order: "XYZ"}) {
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

export default TriggerEulerAnglesStore;
