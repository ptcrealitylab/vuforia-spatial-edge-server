import Vector2Store from "./Vector2Store.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerVector2Store extends Vector2Store {
    #onChanged;

    /**
     *
     * @param {Vector2Value} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {x: 0, y: 0}) {
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

export default TriggerVector2Store;
