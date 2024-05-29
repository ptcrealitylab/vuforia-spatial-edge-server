import DictionaryStore from "./DictionaryStore.js";

class DictionaryComponentStore extends DictionaryStore {
    /**
     *
     */
    constructor() {
        super();
    }

    /**
     *
     * @param {EntityNode} _node
     */
    setEntityNode(_node) {

    }

    getComponent() {
        return {update: () => {}};
    }
}

export default DictionaryComponentStore;
