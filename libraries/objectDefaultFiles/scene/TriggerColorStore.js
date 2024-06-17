import ColorStore from "./ColorStore.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerColorStore extends ColorStore {
    #onChanged;

    /**
     *
     * @param {ColorValue} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {r: 0, g: 0, b: 0}) {
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

export default TriggerColorStore;
