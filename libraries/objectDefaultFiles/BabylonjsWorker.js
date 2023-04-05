import {GLCommandBufferContext, CommandBufferFactory, CommandBuffer} from "/objectDefaultFiles/glCommandBuffer.js";
import '/objectDefaultFiles/babylon/babylon.max.js';

/**
 * interfaces with three.js and intializes the engine for the rest of the tool to use for rendering
 */
class BabylonjsWorker {
    static STATE_CONSTRUCTED = 0;
    static STATE_BOOTSTRAP = 1;
    static STATE_BOOTSTRAP_DONE = 2;
    static STATE_FRAME = 3;
    static STATE_FRAME_DONE = 4;
    static STATE_CONTEXT_LOST = 5;
    static STATE_CONTEXT_RESTORED = 6;
    static STATE_CONTEXT_RESTORED_DONE = 7;
    
    constructor() {
        this.clientState = BabylonjsWorker.STATE_CONSTRUCTED;
        // some values will be set after the bootstrap message has been received
        this.lastProjectionMatrix = null;
        this.isProjectionMatrixSet = false;
        this.workerId = -1;
        this.synclock = null;
        this.glCommandBufferContext = null;
        this.commandBufferFactory = null;
        this.frameCommandBuffer = null;
        this.bootstrapProcessed = false;
        /**
         * @type {Array<function(THREE.Scene):void>}
         */
        this.onSceneCreatedCallbacks = [];
        /**
         * @type {Array<function(number):void>}
         */
        this.onRenderCallbacks = [];
    }

    /**
     * receives messages from the ThreeInteface client class
     * @param {MessageEvent<any>} event 
     */
    onMessageFromInterface(event) {
        const message = event.data;
        if (!message) {
            return;
        }
        if (typeof message !== 'object') {
            return;
        }
        if (message.hasOwnProperty("name")) {
            if (message.name === "touchDecider") {
                let result = false;
                if (this.clientState !== BabylonjsWorker.STATE_CONTEXT_LOST) {
                    //2. set the picking ray from the camera position and mouse coordinates
                    let pickInfo = this.scene.pick(message.mouse.x, message.mouse.y);

                    result = pickInfo.hit;
                }
                self.postMessage({workerId: this.workerId, name: "touchDeciderAnswer", result: result});
            } else if (message.name === "anchoredModelViewCallback") {
                switch (this.clientState) {
                    case BabylonjsWorker.STATE_CONSTRUCTED:
                    case BabylonjsWorker.STATE_BOOTSTRAP_DONE:
                    case BabylonjsWorker.STATE_FRAME_DONE:
                    case BabylonjsWorker.STATE_CONTEXT_RESTORED_DONE:
                        // setup the projection matrix
                        this.lastProjectionMatrix = message.projectionMatrix;
                        break;
                    default:
                        console.error("wrong state to set projectionMatrix clientState: " + this.clientState);
                        break;
                }
            } else if (message.name === "bootstrap") {
                if (this.clientState == BabylonjsWorker.STATE_CONSTRUCTED) {
                    this.clientState = BabylonjsWorker.STATE_BOOTSTRAP;
                    // finish initialisation
                    const {workerId, width, height, synclock} = message;
                    this.workerId = workerId;
                    this.synclock = synclock;
    
                    // create commandbuffer factory in order to create resource commandbuffers
                    this.glCommandBufferContext = new GLCommandBufferContext(message);
                    this.commandBufferFactory = new CommandBufferFactory(this.workerId, this.glCommandBufferContext, this.synclock);
    
                    // execute three.js startup
                    const bootstrapCommandBuffers = this.main(width, height, this.commandBufferFactory);
    
                    // send all created commandbuffers
                    for (const bootstrapCommandBuffer of bootstrapCommandBuffers) {
                        bootstrapCommandBuffer.execute();
                    }
            
                    // create standard rendering command buffer for reuse every frame
                    this.frameCommandBuffer = this.commandBufferFactory.createAndActivate(true);
    
                    this.bootstrapProcessed = true;
    
                    // singnal end of frame
                    self.postMessage({
                        workerId: this.workerId,
                        isFrameEnd: true,
                    });
                    this.clientState = BabylonjsWorker.STATE_BOOTSTRAP_DONE;
                } else {
                    console.error("wrong state for bootstrap clientsState: " + this.clientState);
                }
            } else if (message.name === "frame") {
                switch (this.clientState) {
                    case BabylonjsWorker.STATE_BOOTSTRAP_DONE:
                    case BabylonjsWorker.STATE_FRAME_DONE:
                    case BabylonjsWorker.STATE_CONTEXT_RESTORED_DONE:
                        this.clientState = BabylonjsWorker.STATE_FRAME;
                        // safety checks
                        this.workerId = message.workerId;
                        if (!this.bootstrapProcessed) {
                            console.log(`Can't render worker with id: ${this.workerId}, it has not yet finished initializing`);
                            self.postMessage({
                                workerId: this.workerId,
                                isFrameEnd: true,
                            });
                            this.clientState = BabylonjsWorker.STATE_FRAME_DONE;
                            return;
                        }
                        if (Date.now() - message.time > 300) {
                            console.log('time drift detected');
                            self.postMessage({
                                workerId: this.workerId,
                                isFrameEnd: true,
                            });
                            this.clientState = BabylonjsWorker.STATE_FRAME_DONE;
                            return;
                        }
        
                        // erase the previous render command buffer
                        this.frameCommandBuffer.clear();
                        
                        // try rendering with three.js
                        try {
                            this.frameCommandBuffer = this.render(message.time, this.frameCommandBuffer);
                        } catch (err) {
                            console.error('Error in gl-worker render fn', err);
                        }
        
                        // send the commandbuffer (rendering or resource loading)
                        this.frameCommandBuffer.execute();
        
                        // singnal end of frame
                        self.postMessage({
                            workerId: this.workerId,
                            isFrameEnd: true,
                        });
                        this.clientState = BabylonjsWorker.STATE_FRAME_DONE;
                        break;
                    default:
                        console.error("wrong state for generating frames clientState: " + this.clientState);
                }
            } else if (message.name === "context_lost") {
                switch (this.clientState) {
                    case BabylonjsWorker.CONSTRUCTED:
                    case BabylonjsWorker.STATE_BOOTSTRAP_DONE:
                    case BabylonjsWorker.STATE_FRAME_DONE:
                    case BabylonjsWorker.STATE_CONTEXT_RESTORED_DONE:
                        this.clientState = BabylonjsWorker.STATE_CONTEXT_LOST;
                        this.onContextLost();
                        break;
                    default:
                        console.error("wrong state for lost context clientState: " + this.clientState);
                        break;
                }
            } else if (message.name === "context_restored") {
                if (this.clientState === BabylonjsWorker.STATE_CONTEXT_LOST) {
                    this.clientState = BabylonjsWorker.STATE_CONTEXT_RESTORED;
                    this.onContextRestored();        
                    this.clientState = BabylonjsWorker.STATE_CONTEXT_RESTORED_DONE;
                } else {
                    console.error("wrong state to restore state clientState: " + this.clientState);
                }
            }
        }
    }

    onContextLost() {
        this.glCommandBufferContext.onContextLost();
        this.fakeCanvas.webglcontextlost({preventDefault: () => {}});
    }

    onContextRestored() {
        this.glCommandBufferContext.onContextRestored();

        let restoreBuffer = this.commandBufferFactory.createAndActivate(true);
        this.fakeCanvas.webglcontextrestored();
        restoreBuffer.execute();
        
        // singnal end of frame
        self.postMessage({
            workerId: this.workerId,
            isFrameEnd: true,
        });
    }

    /**
     * registers callbacks for the tool to use during initalisation
     * @param {function(BABYLON.Scene):void} callback 
     * @returns {BabylonjsWorker}
     */
    onSceneCreated(callback) {
        this.onSceneCreatedCallbacks.push(callback);
        return this;
    }

    /**
     * registers a callback for the tool to use during rendering
     * @param {function(number):void} callback 
     * @returns {BabylonjsWorker}
     */
    onRender(callback) {
        this.onRenderCallbacks.push(callback);
        return this;
    }

    /**
     * starts three.js engine with the fake webgl context
     * @param {number} width 
     * @param {number} height 
     * @param {CommandBufferFactory} cmdBufferFactory 
     * @returns {CommandBuffer[]}
     */
    main(width, height, cmdBufferFactory) {
        this.commandBufferFactory = cmdBufferFactory;
        let cmdBuffer = cmdBufferFactory.createAndActivate(false);
        let gl = cmdBufferFactory.getGL();
        // this is needed to trick three.js into completing it's initialisation
        this.fakeCanvas = new FakeCanvas(width, height, gl);
        this.engine = new BABYLON.Engine(this.fakeCanvas);
        this.engine["setRenderDimmensions"] = function (width, height) {
            this.framebufferDimensionsObject = {framebufferWidth: width, framebufferHeight: height};
        };
        this.engine.setRenderDimmensions(width, height);

        // setup camera and scene for the tool
        this.scene = new BABYLON.Scene(this.engine);
        this.camera = new BABYLON.Camera('Camera', new BABYLON.Vector3(0, 0, 0), this.scene);

        // call tool specific code to finish initialisation
        for (let callback of this.onSceneCreatedCallbacks) {
            callback(this.scene);
        }
        return [cmdBuffer];
    }

    /**
     * renders the scene and returns the command buffer
     * @param {number} now timestamp
     * @param {CommandBuffer} commandBuffer the commandbuffer to use for rendering
     * @returns CommandBuffer to send to the server
     */
    innerRender(now, commandBuffer) {
        // safety checks
        if (!this.camera) {
            console.warn('rendering too early');
            return commandBuffer;
        }
        if (!this.isProjectionMatrixSet && this.lastProjectionMatrix && this.lastProjectionMatrix.length === 16) {
            // replace the projection matrix
            let matrix = new BABYLON.Matrix();
            setMatrixFromArray(matrix, this.lastProjectionMatrix);
            this.scene.setTransformMatrix(BABYLON.Matrix.Identity(), matrix);
            this.isProjectionMatrixSet = true;
        }
        // call tool specific code to finish the scene update cycle
        for (let callback of this.onRenderCallbacks) {
            callback(now);
        }
        // render the scene using three.js if posible
        if (this.isProjectionMatrixSet) {
            if (this.scene) {
                this.scene.render();
            }
        }
    }

    /**
     * tries to create a render command buffer. 
     * during the first frame after adding assets the three.js renderer adds sync operations to initialize those new resources
     * in that case the resulting bufer is not a render command buffer but a resource commandbuffer
     * this code will detect that and send the resource command buffer to the server and rerender the whole scen to get a valid render commandbuffer to send to the server
     * @param {number} now timestamp
     * @param {CommandBuffer} commandBuffer the render commandbuffer to be used for rendering
     * @returns {CommandBuffer} a render commandbuffer
     */
    render(now, commandBuffer) {
        let threeCommandBuffer = this.commandBufferFactory.createAndActivate(false);

        this.innerRender(now, threeCommandBuffer);

        // check if three.js initialized resources during the renderloop
        if (threeCommandBuffer.isCleared) {
            // send remaining commands in the resource commandbuffer to the server
            threeCommandBuffer.execute();
            // rerender scene to get a renderable commandbuffer
            this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
            this.innerRender(now, commandBuffer);
        } else {
            // three js created a valid render command buffer, replace the current buffer and enable rendering
            commandBuffer = threeCommandBuffer;
            commandBuffer.isRendering = true;
        }

        return commandBuffer;
    }
}

class HTMLCanvasElement {
    constructor() {

    }
}

/**
 * Fake canvas element to make sure threejs initializes correctly
 */
class FakeCanvas extends HTMLCanvasElement {
    /**
     *
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height, gl) {
        super();
        this.width = width;
        this.height = height;
        this.style = {
            width: width.toString() + "px", 
            height: height.toString + "px", 
        };
        this.gl = gl;
        this.getContext = (_) => {return gl;}; 
        this.webglcontextlost = () => {};
        this.webglcontextrestored = () => {};
    }

    /**
     *
     * @param {string} type
     * @param {function(Event):void} listener
     * @param {boolean} useCapture
     */
    addEventListener(type, listener, useCapture) {
        // we don't implement context creation error
        if (type === "webglcontextlost") {
            this.webglcontextlost = listener;
        } else if (type === "webglcontextrestored") {
            this.webglcontextrestored = listener;
        }
    }
}

/**
 * converts an Float32Array to a BABYLON.Matrix
 * @param {BABYLON.Matrix} matrix
 * @param {Float32Array} array
 */
function setMatrixFromArray(matrix, array) {
    matrix.copyFrom(BABYLON.Matrix.FromArray(array));
    matrix = BABYLON.Matrix.Transpose(matrix);
}

export {BabylonjsWorker, setMatrixFromArray};
