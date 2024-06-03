import ValueStore from "./ValueStore.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerValueStore extends ValueStore {
    /**
     * @type {onChangedFunc}
     */
    #onChanged;

    /**
     *
     * @param {onChangedFunc} onChanged
     * @param {Value} value
     */
    constructor(onChanged, value) {
        super(value);
        this.#onChanged = onChanged;
    }

    /**
     *
     * @param {Value} value
     */
    set(value) {
        super.set(value);
        this.#onChanged();
    }
}

export default TriggerValueStore;
