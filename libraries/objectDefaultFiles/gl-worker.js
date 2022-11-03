const debugGlWorker = true;
const GLPROXY_ENABLE_EXTVAO = true;

let id = Math.random();
let proxies = [];
const wantsResponse = false;

/**
 * Creates a gl context that stores all received commands in the active command buffer object.
 * This allows us to switch buffers behind the scene and split up the stream of commands over multiple buffers.
 */
class GLCommandBufferContext {
    constructor(message) {
        this.gl = {
            enableWebGL2: true,
        };
        // Create a fake gl context that pushes all called functions on the command buffer
        if (this.gl.enableWebGL2) {
            this.gl = Object.create(WebGL2RenderingContext.prototype);
        } else {
            this.gl = Object.create(WebGLRenderingContext.prototype);
        }
        for (const fnName of message.functions) {
            this.gl[fnName] = this.makeStub(fnName, this);
        }
        for (const constName in message.constants) {
            try {
                this.gl[constName] = message.constants[constName];
            } catch (e) {
                console.error(`Cant set gl const: ${constName}`);
            }
        }
    }

    /**
     * Changes the buffer in which we store open gl commands
     * @param {the command buffer to use for storing gl commands} commandBuffer 
     */
    setActiveCommandBuffer(commandBuffer) {
        this.activeBuffer = commandBuffer;
    }

    /**
     * Makes a stub for a given function which sends a message to the gl
     * implementation in the parent.
     * @param {string} functionName
     * @return {any} a placeholder object from the local hidden gl context (realGl).
     */
    makeStub(functionName) {
        let localContext = this;
        return function() {
            const invokeId = id;
            id += 1 + Math.random();

            let args = Array.from(arguments);
            for (let i = 0; i < args.length; i++) {
                if (!args[i]) {
                    continue;
                }
                if (args[i].hasOwnProperty('__uncloneableId')) {
                    args[i] = {
                        fakeClone: true,
                        index: args[i].__uncloneableId,
                    };
                } else if (typeof args[i] === 'object') {
                    if (args[i] instanceof Float32Array) {
                        args[i] = new Float32Array(args[i]);
                    } else if (args[i] instanceof Uint8Array) {
                        args[i] = new Uint8Array(args[i]);
                    } else if (args[i] instanceof Uint16Array) {
                        args[i] = new Uint16Array(args[i]);
                    } else if (args[i] instanceof Array) {
                        args[i] = Array.from(args[i]);
                    } else {
                        if (debugGlWorker) console.log('Uncloned arg', args[i]);
                    }
                }
            }

            if (functionName === 'texImage2D' || functionName === 'texSubImage2D') {
                for (let i = 0; i < args.length; i++) {
                    let elt = args[i];
                    if (elt.tagName === 'IMG') {
                        let width = elt.width;
                        let height = elt.height;
                        let canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        let gfx = canvas.getContext('2d');
                        gfx.width = width;
                        gfx.height = height;
                        gfx.drawImage(elt, 0, 0, width, height);
                        let imageData = gfx.getImageData(0, 0, width, height);
                        args[i] = imageData;
                    } else if (elt.tagName === 'CANVAS' ||
                        (typeof OffscreenCanvas !== 'undefined' && elt instanceof OffscreenCanvas)) {
                        let width = elt.width;
                        let height = elt.height;
                        let gfx = elt.getContext('2d');
                        let imageData = gfx.getImageData(0, 0, width, height);
                        args[i] = imageData;
                    }
                }
            }

            if (functionName === 'getExtension') {
                const ext = arguments[0];

                if (ext === 'OES_vertex_array_object') {
                    if (realGl.getParameter(realGl.VERSION).includes('WebGL 1.0')) {
                        const prefix = 'extVao-';

                        if (!GLPROXY_ENABLE_EXTVAO) {
                            return null;
                        }

                        if (realGl) {
                            extVao = realGl.getExtension(ext);
                        }
                        // Mock the real VAO extension so that method calls on it get
                        // proxied and sent through the glproxy with the prefix
                        // 'extVao-'
                        return {
                            createVertexArrayOES: this.makeStub(prefix + 'createVertexArrayOES'),
                            deleteVertexArrayOES: this.makeStub(prefix + 'deleteVertexArrayOES'),
                            isVertexArrayOES: this.makeStub(prefix + 'isVertexArrayOES'),
                            bindVertexArrayOES: this.makeStub(prefix + 'bindVertexArrayOES'),
                        };
                    } else {
                        return {
                            createVertexArrayOES: this.makeStub('createVertexArray'),
                            deleteVertexArrayOES: this.makeStub('deleteVertexArray'),
                            isVertexArrayOES: this.makeStub('isVertexArray'),
                            bindVertexArrayOES: this.makeStub('bindVertexArray'),
                        };
                    }
                }
            }

            const message = {
                workerId,
                id: invokeId,
                name: functionName,
                args,
            };

            // glCommandBuferObject is the copy of the thi pointer stored in the closure.
            // by requesting the commandbuffer from the object, we can change it between calls.
            if (localContext.activeBuffer !== null) {
                localContext.activeBuffer.push(message);
            } else {
                console.error('No active command buffer set for gl context');
            }

            if (realGl) {
                const unclonedArgs = Array.from(arguments).map(a => {
                    if (!a) {
                        return a;
                    }

                    if (a.__uncloneableId && !a.__uncloneableObj) {
                        console.error('invariant ruined');
                    }

                    if (a.__uncloneableObj) {
                        return a.__uncloneableObj;
                    }
                    return a;
                });

                let res;
                if (functionName.startsWith('extVao-')) {
                    res = extVao[functionName.split('-')[1]].apply(extVao, unclonedArgs);
                } else {
                    res = realGl[functionName].apply(realGl, unclonedArgs);
                }

                if (functionName === 'linkProgram') {
                    const link_message = realGl.getProgramInfoLog(unclonedArgs[0]);
                    if (link_message.length > 0) {
                        const shaders = realGl.getAttachedShaders(unclonedArgs[0]);
                        for (const shader of shaders) {
                            const compile_message = realGl.getShaderInfoLog(shader);
                            if (compile_message.length > 0) {
                                const shaderType = realGl.getShaderParameter(shader, realGl.SHADER_TYPE);
                                let shaderTypeStr = "<n/a>";
                                switch (shaderType) {
                                case realGl.VERTEX_SHADER:
                                    shaderTypeStr = "Vertex";
                                    break;
                                case realGl.FRAGMENT_SHADER:
                                    shaderTypeStr = "Fragment";
                                    break;
                                default:
                                    break;
                                }
                                console.error(`${shaderTypeStr} shader error`, realGl, compile_message);
                            }
                        }
                        console.error('Program link error', realGl, link_message);
                    }
                }


                if (typeof res === 'object' && res !== null) {
                    let proxy = new Proxy({
                        __uncloneableId: invokeId,
                        __uncloneableObj: res,
                    }, {
                        get: function(obj, prop) {
                            if (prop === 'hasOwnProperty' || prop.startsWith('__')) {
                                return obj[prop];
                            } else {
                                // TODO this won't propagate to container
                                const mocked = obj.__uncloneableObj[prop];
                                if (typeof mocked === 'function') {
                                    console.error('Unmockable inner function', prop);
                                    return mocked.bind(obj.__uncloneableObj);
                                }
                                return mocked;
                            }
                        },
                    });

                    proxies.push(proxy);
                    return proxy;
                }
                return res;
            }

            // if (functionName === 'getParameter') {
            //   return cacheGetParameter[arguments[0]];
            // }

            if (wantsResponse) {
                return new Promise(res => {
                    pending[invokeId] = res;
                });
            }
        };
    }
}

/**
 * List of WebGL commands that can be executed.
 */
class CommandBuffer {
    constructor(workerId) {
        this.workerId = workerId;
        this.commandBuffer = [];
    }

    push(message) {
        if (message == undefined) {
            console.error("no command test");
        }
        this.commandBuffer.push(message);
    }

    // Executes all the webGL commands stored in this buffer
    execute() {
        if (this.commandBuffer.length > 0) {
            try {
                let test = structuredClone(this.commandBuffer);
                console.debug(test);
                window.parent.postMessage({
                    workerId: this.workerId,
                    messages: this.commandBuffer,
                }, '*');
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    // clears the whole buffer for reuse
    clear() {
        this.commandBuffer = [];
    }
}

/**
 * creates new command buffer using the hidden variables to hide construction details
 */
class CommandBufferFactory {
    constructor(workerId, glCommandBufferContext) {
        this.workerId = workerId;
        this.glCommandBufferContext = glCommandBufferContext;
    }

    getGL() {
        return this.glCommandBufferContext.gl;
    }

    createAndActivate() {
        let commandBuffer = new CommandBuffer(this.workerId);
        this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
        return commandBuffer;
    }
}

let commandBufferFactory = null;
let frameCommandBuffer = null;
let bootstrapProcessed = false;

const pending = {};

// Render function specified by worker script
let render;

window.glProxy = {
    main: null,
    render: null,
};

// Unique worker id
let workerId;

let glCommandBufferContext = null;

// Local hidden gl context used to generate placeholder objects for gl calls
// that require valid objects
let realGl;

// VAO extension from realGl if applicable
let extVao;

// const cacheGetParameter = {
//   3379: 8192,
//   7938: 'WebGL 1.0',
//   34076: 8192,
//   34921: 16,
//   34930: 16,
//   35660: 16,
//   35661: 80,
//   36347: 1024,
//   36348: 32,
//   36349: 1024,
// };

window.addEventListener('message', function(event) {
    const message = event.data;
    if (!message) {
        if (debugGlWorker) console.warn('Event missing data', message);
        return;
    }
    if (typeof message !== 'object') {
        return;
    }

    if (message.name === 'bootstrap') {
        let {width, height} = message;

        glCommandBufferContext = new GLCommandBufferContext(message);
        commandBufferFactory = new CommandBufferFactory(workerId, glCommandBufferContext);
        let bootstrapCommandBuffers = [];
        if (typeof main !== 'undefined') {
            // eslint-disable-next-line no-undef
            bootstrapCommandBuffers = main({width, height}, commandBufferFactory);
        }
        if (window.glProxy.main) {
            bootstrapCommandBuffers = window.glProxy.main({width, height}, commandBufferFactory);
        }
        frameCommandBuffer = commandBufferFactory.createAndActivate();

        for (const bootstrapCommandBuffer of bootstrapCommandBuffers) {
            bootstrapCommandBuffer.execute();
        }

        bootstrapProcessed = true;

        window.parent.postMessage({
            workerId,
            isFrameEnd: true,
        }, '*');

        return;
    }

    if (message.hasOwnProperty('id') && pending.hasOwnProperty(message.id)) {
        pending[message.id](message.result);
        delete pending[message.id];
    }

    if (message.name === 'frame') {
        if (!bootstrapProcessed /*|| !bootstrapPromise.isResolved*/) {
            console.log(`Can't render worker with id: ${workerId}, it has not yet finished initializing`);
            window.parent.postMessage({
                workerId,
                isFrameEnd: true,
            }, '*');
            return;
        }
        if (Date.now() - message.time > 300) {
            console.log('time drift detected');
            window.parent.postMessage({
                workerId,
                isFrameEnd: true,
            }, '*');
            return;
        }

        frameCommandBuffer.clear();
        try {
            if (render) {
                frameCommandBuffer = render(message.time, frameCommandBuffer);
            }
            if (window.glProxy.render) {
                frameCommandBuffer = window.glProxy.render(message.time, frameCommandBuffer);
            }
        } catch (err) {
            console.error('Error in gl-worker render fn', err);
        }

        frameCommandBuffer.execute();

        window.parent.postMessage({
            workerId,
            isFrameEnd: true,
        }, '*');
    }
});

// eslint-disable-next-line no-unused-vars
class ThreejsInterface {
    constructor(spatialInterface, injectThree) {
        if (injectThree) {
            window.THREE = injectThree;
        }
        this.spatialInterface = spatialInterface;
        this.prefersAttachingToWorld = true;
        this.pendingLoads = 0;
        this.onSceneCreatedCallbacks = [];
        this.onRenderCallbacks = [];
        this.done = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.onSpatialInterfaceLoaded = this.onSpatialInterfaceLoaded.bind(this);
        this.anchoredModelViewCallback = this.anchoredModelViewCallback.bind(this);
        this.touchDecider = this.touchDecider.bind(this);
        this.main = this.main.bind(this);
        this.render = this.render.bind(this);

        window.glProxy.main = this.main;
        window.glProxy.render = this.render;

        this.spatialInterface.onSpatialInterfaceLoaded(this.onSpatialInterfaceLoaded);
    }

    onSpatialInterfaceLoaded() {
        this.spatialInterface.subscribeToMatrix();
        this.spatialInterface.setFullScreenOn();

        if (this.prefersAttachingToWorld) {
            this.spatialInterface.prefersAttachingToWorld();
        }

        this.spatialInterface.addAnchoredModelViewListener(this.anchoredModelViewCallback);

        this.spatialInterface.setMoveDelay(300);
        this.spatialInterface.registerTouchDecider(this.touchDecider);
    }

    touchDecider(eventData) {
        if (!this.camera) {
            return false;
        }
        //1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        this.mouse.x = (eventData.x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(eventData.y / window.innerHeight) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        this.raycaster.setFromCamera(this.mouse, this.camera);

        //3. compute intersections
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        return intersects.length > 0;
    }

    addPendingLoad() {
        this.pendingLoads += 1;
    }

    removePendingLoad() {
        this.pendingLoads -= 1;
    }

    onSceneCreated(callback) {
        this.onSceneCreatedCallbacks.push(callback);
        return this;
    }

    onRender(callback) {
        this.onRenderCallbacks.push(callback);
        return this;
    }

    main({width, height}, cmdBufferFactory) {
        this.spatialInterface.changeFrameSize(width, height);
        const canvas = document.createElement('canvas');
        realGl = canvas.getContext('webgl2');
        let cmdBuffer = cmdBufferFactory.createAndActivate();
        let gl = cmdBufferFactory.getGL();
        this.realRenderer = new THREE.WebGLRenderer({context: realGl, alpha: true});
        this.realRenderer.debug.checkShaderErrors = false;
        this.realRenderer.setPixelRatio(window.devicePixelRatio);
        this.realRenderer.setSize(width, height);

        this.renderer = new THREE.WebGLRenderer({context: gl, alpha: true});
        this.renderer.debug.checkShaderErrors = false;
        this.renderer.setSize(width, height);

        this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
        this.scene = new THREE.Scene();

        for (let callback of this.onSceneCreatedCallbacks) {
            callback(this.scene);
        }
        return [cmdBuffer];
    }

    anchoredModelViewCallback(modelViewMatrix, projectionMatrix) {
        this.lastProjectionMatrix = projectionMatrix;
    }

    getRealGl() {
        return realGl;
    }

    render(now, commandBuffer) {
        if (!this.camera) {
            console.warn('rendering too early');
            return;
        }
        if (!this.isProjectionMatrixSet && this.lastProjectionMatrix && this.lastProjectionMatrix.length === 16) {
            this.setMatrixFromArray(this.camera.projectionMatrix, this.lastProjectionMatrix);
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
                if (this.done && realGl && this.pendingLoads === 0) {
                    for (let proxy of proxies) {
                        proxy.__uncloneableObj = null;
                        delete proxy.__uncloneableObj;
                    }
                    // eslint-disable-next-line no-global-assign
                    proxies = [];
                    this.realRenderer.dispose();
                    this.realRenderer.forceContextLoss();
                    this.realRenderer.context = null;
                    this.realRenderer.domElement = null;
                    this.realRenderer = null;
                    // eslint-disable-next-line no-global-assign
                    realGl = null;
                    extVao = null;
                }
                this.done = true;
            }
        }
        return commandBuffer;
    }

    setMatrixFromArray(matrix, array) {
        /**
         * this is the following matrix (ROW MAJOR)
         *  a0 a4 a8 a12
         *  a1 a5 a9 a13
         *  a2 a6 a10 a14
         *  a4 a7 a11 a15
         */
        matrix.set(
            array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }
}
