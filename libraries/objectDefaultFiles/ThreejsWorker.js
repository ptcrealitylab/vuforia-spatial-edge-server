import {GLCommandBufferContext, CommandBufferFactory, CommandBuffer} from "/objectDefaultFiles/glCommandBuffer.js";
import * as THREE from '/objectDefaultFiles/three/three.module.js';

class ThreejsWorker {
    constructor() {
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
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    /**
     * 
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
            if (message.name === "anchoredModelViewCallback") {
                this.lastProjectionMatrix = message.projectionMatrix;
            } else if (message.name === "bootstrap") {
                const {workerId, width, height, synclock} = message;
                this.workerId = workerId;
                this.synclock = synclock;

                this.glCommandBufferContext = new GLCommandBufferContext(message);
                this.commandBufferFactory = new CommandBufferFactory(this.workerId, this.glCommandBufferContext, this.synclock);

                const bootstrapCommandBuffers = this.main(width, height, this.commandBufferFactory);

                for (const bootstrapCommandBuffer of bootstrapCommandBuffers) {
                    bootstrapCommandBuffer.execute();
                }
        
                this.frameCommandBuffer = this.commandBufferFactory.createAndActivate(true);

                this.bootstrapProcessed = true;
                return;
            } else if (message.name === "frame") {
                this.workerId = message.workerId;
                if (!this.bootstrapProcessed) {
                    console.log(`Can't render worker with id: ${this.workerId}, it has not yet finished initializing`);
                    self.postMessage({
                        workerId: this.workerId,
                        isFrameEnd: true,
                    });
                    return;
                }
                if (Date.now() - message.time > 300) {
                    console.log('time drift detected');
                    self.postMessage({
                        workerId: this.workerId,
                        isFrameEnd: true,
                    });
                    return;
                }

                this.frameCommandBuffer.clear();
                
                try {
                    this.frameCommandBuffer = this.render(message.time, this.frameCommandBuffer);
                } catch (err) {
                    console.error('Error in gl-worker render fn', err);
                }

                this.frameCommandBuffer.execute();

                self.postMessage({
                    workerId: this.workerId,
                    isFrameEnd: true,
                });
            }
        }
    }

    /**
     * 
     * @param {function(THREE.Scene):void} callback 
     * @returns {ThreejsWorker}
     */
    onSceneCreated(callback) {
        this.onSceneCreatedCallbacks.push(callback);
        return this;
    }

    /**
     * 
     * @param {function(number):void} callback 
     * @returns {ThreejsWorker}
     */
    onRender(callback) {
        this.onRenderCallbacks.push(callback);
        return this;
    }

    /**
     * 
     * @param {number} width 
     * @param {number} height 
     * @param {CommandBufferFactory} cmdBufferFactory 
     * @returns {CommandBuffer[]}
     */
    main(width, height, cmdBufferFactory) {
        this.commandBufferFactory = cmdBufferFactory;
        let cmdBuffer = cmdBufferFactory.createAndActivate(false);
        let gl = cmdBufferFactory.getGL();
        this.fakeCanvas = new FakeCanvas(width, height);
        this.renderer = new THREE.WebGLRenderer({context: gl, alpha: true, canvas: this.fakeCanvas});
        this.renderer.debug.checkShaderErrors = false;
        this.renderer.setSize(width, height);

        this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
        this.scene = new THREE.Scene();

        for (let callback of this.onSceneCreatedCallbacks) {
            callback(this.scene);
        }
        return [cmdBuffer];
    }

    innerRender(now, commandBuffer) {
        if (!this.camera) {
            console.warn('rendering too early');
            return commandBuffer;
        }
        if (!this.isProjectionMatrixSet && this.lastProjectionMatrix && this.lastProjectionMatrix.length === 16) {
            setMatrixFromArray(this.camera.projectionMatrix, this.lastProjectionMatrix);
            if (this.camera.projectionMatrixInverse.getInverse) {
                this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
            } else {
                this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
            }
            this.isProjectionMatrixSet = true;
        }
        for (let callback of this.onRenderCallbacks) {
            callback(now);
        }
        if (this.isProjectionMatrixSet) {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    /**
     * 
     * @param {number} now 
     * @param {CommandBuffer} commandBuffer 
     * @returns {CommandBuffer}
     */
    render(now, commandBuffer) {
        let threeCommandBuffer = this.commandBufferFactory.createAndActivate(false);

        this.innerRender(now, threeCommandBuffer);
        
        if (threeCommandBuffer.isCleared) {
            threeCommandBuffer.execute();
            // three js created an unrenderable commandbuffer, try again
            this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
            
            this.innerRender(now, threeCommandBuffer);
        } else {
            // three js created a valid render command buffer, replace the current buffer and enable rendering
            commandBuffer = threeCommandBuffer;
            commandBuffer.isRendering = true;
        }
       
        return commandBuffer;
    }
}

/**
 * Fake canvas element to make sure threejs initializes correctly
 */
class FakeCanvas {
    /**
     * 
     * @param {number} width 
     * @param {number} height 
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.style = {width: width.toString() + "px", height: height.toString + "px"};
    }

    /**
     * 
     * @param {string} type 
     * @param {function(Event):void} listener 
     * @param {boolean} useCapture 
     */
    addEventListener(type, listener, useCapture) {
        console.warn("ThreeJS tries to implement the following eventlistener: " + type + " which is not implemented");
    }
}

/**
 * 
 * @param {Float32Array} matrix 
 * @param {Float32Array} array 
 */
function setMatrixFromArray(matrix, array) {
    matrix.set(array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

export {ThreejsWorker, setMatrixFromArray};
