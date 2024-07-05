import DateTimer from "./DateTimer.js";
import {ToolRenderSocket} from "./ToolRenderStream.js";
import {ParentMessageInterface} from "./MessageInterface.js";
import WorldNode from "./WorldNode.js";
import VisibilityComponentNode from "./VisibilityComponentNode.js";
import ToolNode from "./ToolNode.js";

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

class Tool3D {
    /** @type {ToolRenderSocket} */
    #socket;

    /** @type {WorldNode|null} */
    #world;

    /** @type {ToolNode|null} */
    #toolNode;

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
    constructor(listener, bindOnSpatialInterfaceLoaded = true) {
        this.#listener = listener;
        this.#timer = new DateTimer();

        this.#world = null;
        this.#toolNode = null;
        this.#toolId = "<n/a>";

        this.#updateTimer = null;

        this.#isToolVisible = false;

        const spatialInterface = this.#listener.getSpatialInterface();

        spatialInterface.useToolRenderer();
        if (bindOnSpatialInterfaceLoaded) {
            spatialInterface.onSpatialInterfaceLoaded(() => this.onSpatialInterfaceLoaded());
        }
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
            // if there is no world then this is the first a set command is received and we might want to run additional logic

            // create world with toolsRoot
            this.#world = new WorldNode(this.#timer);
            let toolsRoot = this.#world;
            for (const key of state.toolsRoot) {
                toolsRoot = toolsRoot.get(key);
            }

            // make sure the toolsroot knows about the custom tool
            toolsRoot.registerType(this.#listener.getToolNodeType(), () => {return this.#listener.createToolNode();});

            // apply all saved information
            this.#world.setState(state);

            // verify that the tool node is there
            if (!toolsRoot.has(this.#toolId)) {
                this.#toolNode = this.#listener.createToolNode();
                toolsRoot.set(this.#toolId, this.#toolNode, false);
            } else {
                this.#toolNode = toolsRoot.get(this.#toolId);
            }

            // add visibility to the tool root
            if (!this.#toolNode.hasComponentWithType(VisibilityComponentNode.TYPE)) {
                this.#toolNode.setComponent("1", new VisibilityComponentNode());
            }
            this.setVisible(this.#isToolVisible);

            // callback to the user after the basic scene graph has been created
            this.#listener.onStart();

            // start websorker which will call us back every so often to run the update loop
            this.#updateTimer = new Worker("/objectDefaultFiles/scene/WebWorkerTimer.js");
            this.#updateTimer.onmessage = () => this.onUpdate();
        } else {
            // if it is not the first run we can just merge all given information
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
        this.#toolNode.entity.updateComponents();
        this.#socket.sendUpdate(this.#world.getChanges());
    }

    setVisible(isVisible) {
        this.#isToolVisible = isVisible;
        if (this.#toolNode) {
            const component = this.#toolNode.getComponentByType(VisibilityComponentNode.TYPE);
            if (component) {
                component.value = isVisible;
            }
        }
    }

    getToolNode() {
        return this.#toolNode;
    }
}

export default Tool3D;
