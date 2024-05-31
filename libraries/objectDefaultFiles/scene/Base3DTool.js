import {ToolRenderSocket} from "./ToolRenderStream.js";
import {ParentMessageInterface} from "./MessageInterface.js";
import WorldNode from "./WorldNode.js";
import WorldStore from "./WorldStore.js";
import ToolNode from "./ToolNode.js";
import ToolStore from "./ToolStore.js";
import EntitiesNode from "./EntitiesNode.js";
import EntitiesStore from "./EntitiesStore.js";
import ComponentsNode from "./ComponentsNode.js";
import ComponentsStore from "./ComponentsStore.js";
import DefaultEntity from "./DefaultEntity.js";

/**
 * @typedef {import('../object.js').SpatialInterface} SpatialInterface
 * @typedef {import('./WorldNode.js').WorldNodeState} WorldNodeState
 * @typedef {import('./WorldNode.js').WorldNodeDelta} WorldNodeDelta
 * @typedef {import('./EntityNode.js').EntityNode} EntityNode
 * @typedef {import('./BaseComponentNode.js').BaseComponentNodeState} BaseComponentNodeState
 * @typedef {import('./BaseComponentNode.js').default} BaseComponentNode
 * @typedef {import('./BaseEntity.js').default} BaseEntity
 * @typedef {{createEntity: (name: string) => BaseEntity, createComponent: (state: BaseComponentNodeState) => BaseComponentNode}} Base3DEntityListener
 * @typedef {{onInitializeEntity: (key: string, node: Base3DEntity) => void}} Base3DEntitiesListener
 * @typedef {{onStart: () => void} & Base3DEntityListener & Base3DEntitiesListener} Base3DToolListener
 */

class Base3DEntitiesStore extends EntitiesStore {
    /** @type {Base3DEntitiesListener} */
    #listener;

    /**
     *
     * @param {ToolNode} entity
     * @param {Base3DEntitiesListener} listener
     */
    constructor(entity, listener) {
        super(entity);
        this.#listener = listener;
    }

    /**
     *
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    create(key, state) {
        const node = super.create(key, state);
        if (node) {
            this.#listener.onInitializeEntity(key, node);
        }
        return node;
    }
}

class Base3DToolStore extends ToolStore {
    /** @type {Base3DEntitiesListener} */
    #entitiesListener;

    /**
     *
     * @param {EntityInterface} entity
     * @param {Base3DEntitiesListener} entitiesListener
     */
    constructor(entity, entitiesListener) {
        super(entity);
        this.#entitiesListener = entitiesListener;
    }

    /**
     * @override
     * @param {ToolNode} thisNode
     * @returns {NodeDict}
     */
    getProperties(thisNode) {
        const ret = {
            "children": new EntitiesNode(new Base3DEntitiesStore(thisNode, this.#entitiesListener)),
            "components": new ComponentsNode(new ComponentsStore(thisNode))
        };
        return ret;
    }
}

class Base3DEntity extends DefaultEntity {
    #listener;

    /**
     * 
     * @param {Base3DEntityListener} listener 
     */
    constructor(listener) {
        super();
        this.#listener = listener;
    }

    /**
     * @override
     * @param {string} name
     * @returns {Base3DEntity}
     */
    createEntity(name) {
        return this.#listener.createEntity(name);
    }

    /**
     *
     * @param {ValueDict} state
     * @returns {ComponentInterface}
     */
    createComponent(state) {
        let ret = super.createComponent(state);
        if (ret == null) {
            ret = this.#listener.createComponent(state);
        }
        return ret;
    }
}

class Base3DTool {
    /** @type {ToolRenderSocket} */
    #socket;

    /** @type {WorldNode|null} */
    #world;

    /** @type {ToolNode|null} */
    #tool;

    /** @type {string} */
    #toolId;

    /** @type {Worker}  */
    #updateTimer;

    /**@type {Base3DToolInterface} */
    #listener;

    /**
     *
     * @param {SpatialInterface} spatialInterface
     * @param {boolean} bindOnSpatialInterfaceLoaded
     */
    constructor(spatialInterface, listener, bindOnSpatialInterfaceLoaded = true) {
        this.#listener = listener;

        const messageInterface = new ParentMessageInterface("*");
        this.#socket = new ToolRenderSocket(messageInterface);
        this.#socket.setListener(this);

        this.#world = null;
        this.#tool = null;
        this.#toolId = "<n/a>";

        this.#updateTimer = null;

        spatialInterface.useToolRenderer();
        if (bindOnSpatialInterfaceLoaded) {
            spatialInterface.onSpatialInterfaceLoaded(() => this.onSpatialInterfaceLoaded());
        }
    }

    /**
     * 
     * @returns {ToolNode|null}
     */
    getTool() {
        return this.#tool;
    }

    /**
     *
     */
    onSpatialInterfaceLoaded() {
        this.#socket.sendGet();
    }

    /**
     *
     * @param {WorldNodeState} state
     */
    onReceivedSet(state) {
        this.#toolId = Object.keys(state.properties.threejsContainer.properties.tools.properties)[0];
        console.log(`compositon layer -> ${this.#toolId} (set): `, state);
        if (!this.#world) {
            this.#world = new WorldNode(new WorldStore());
            this.#tool = new ToolNode(new Base3DToolStore(new Base3DEntity(this.#listener), this.#listener));
            this.#world.get("threejsContainer").get("tools").set(this.#toolId, this.#tool, false);

            this.#world.setState(state);

            this.#listener.onStart();

            this.#updateTimer = new Worker("/objectDefaultFiles/scene/WebWorkerTimer.js");
            this.#updateTimer.onmessage = () => this.onUpdate();
        } else {
            this.#world.setState(state);
        }
    }

    /**
     *
     * @param {WorldNodeDelta} delta
     */
    onReceivedUpdate(delta) {
        console.log(`composition layer -> ${this.#toolId} (update): `, delta);
        this.#world.setChanges(delta);
    }

    /**
     *
     */
    onUpdate() {
        this.#tool.getEntity().updateComponents();
        this.#socket.sendUpdate(this.#world.getChanges());
    }
}

export default Base3DTool;
