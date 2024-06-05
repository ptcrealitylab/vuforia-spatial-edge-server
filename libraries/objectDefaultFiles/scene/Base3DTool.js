import DateTimer from "./DateTimer.js";
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
import VisibilityComponentNode from "./VisibilityComponentNode.js";

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
 * @typedef {number} milliseconds
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

    /** @type {Timer} */
    #timer;

    /** @type {boolean} */
    #isToolVisible;

    /**
     *
     * @param {SpatialInterface} spatialInterface
     * @param {boolean} bindOnSpatialInterfaceLoaded
     */
    constructor(spatialInterface, listener, bindOnSpatialInterfaceLoaded = true) {
        this.#listener = listener;
        this.#timer = new DateTimer();

        this.#world = null;
        this.#tool = null;
        this.#toolId = "<n/a>";

        this.#updateTimer = null;

        this.#isToolVisible = false;

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
        this.#toolId = spatialObject.frame;
        const messageInterface = new ParentMessageInterface("*");
        this.#socket = new ToolRenderSocket(messageInterface, spatialObject.frame);
        this.#socket.setListener(this);

        this.#socket.sendGet();
    }

    /**
     *
     * @param {WorldNodeState} state
     */
    onReceivedSet(state) {
        console.log(`compositon layer -> ${this.#toolId} (set): `, state);
        if (!this.#world) {
            this.#world = new WorldNode(new WorldStore(this.#timer));
            this.#tool = new ToolNode(new Base3DToolStore(new Base3DEntity(this.#listener), this.#listener));
            let toolsRoot = this.#world;
            for (const key of state.toolsRoot) {
                toolsRoot = toolsRoot.get(key);
            }
            toolsRoot.set(this.#toolId, this.#tool, false);

            this.#world.setState(state);

            if (!this.#tool.hasComponentWithType(VisibilityComponentNode.TYPE)) {
                this.#tool.addComponent("1", new VisibilityComponentNode());
            }

            this.setVisible(this.#isToolVisible);

            this.#listener.onStart();

            this.#updateTimer = new Worker("/objectDefaultFiles/scene/WebWorkerTimer.js");
            this.#updateTimer.onmessage = () => this.onUpdate();
        } else {
            this.#world.setState(state);
        }
    }

    /**
     *
     * @param {milliseconds} period
     */
    setUpdatePeriod(period) {
        this.#updateTimer.postMessage({period: period});
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
        this.#timer.update();
        this.#tool.getEntity().updateComponents();
        this.#socket.sendUpdate(this.#world.getChanges());
    }

    setVisible(isVisible) {
        this.#isToolVisible = isVisible;
        if (this.#tool) {
            const component = this.#tool.getComponentByType(VisibilityComponentNode.TYPE);
            if (component) {
                component.set(isVisible);
            }
        }
    }
}

export default Base3DTool;
