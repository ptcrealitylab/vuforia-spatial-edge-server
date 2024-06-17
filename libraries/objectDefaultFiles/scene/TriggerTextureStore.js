import TextureStore from "./TextureStore.js";

/**
 * @typedef {() => void} onChangedFunc
 */

class TriggerTextureStore extends TextureStore {
    #onChanged;

    /**
     *
     * @param {TextureValue} value
     * @param {onChangedFunc} onChangedFunc
     */
    constructor(onChanged, value = {id: null}) {
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

export default TriggerTextureStore;
