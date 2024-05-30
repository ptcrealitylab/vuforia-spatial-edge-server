import EntityStore from "./EntityStore.js";
import DefaultEntity from "./DefaultEntity.js";

class ToolStore extends EntityStore {

    /**
     *
     */
    constructor() {
        super(new DefaultEntity());
    }
}

export default ToolStore;
