const debugGlWorker = false;
const GLPROXY_ENABLE_EXTVAO = true;

let gl = {
    enableWebGL2: true,
};

let id = Math.random();
let proxies = [];
const wantsResponse = false;

let frameCommandBuffer = [];

const pending = {};

// Render function specified by worker script
let render;

window.glProxy = {
    main: null,
    render: null,
};

// Unique worker id
let workerId;

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

/**
 * Makes a stub for a given function which sends a message to the gl
 * implementation in the parent.
 * @param {string} functionName
 * @return {any} a placeholder object from the local hidden gl context (realGl).
 */
function makeStub(functionName) {
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
                        createVertexArrayOES: makeStub(prefix + 'createVertexArrayOES'),
                        deleteVertexArrayOES: makeStub(prefix + 'deleteVertexArrayOES'),
                        isVertexArrayOES: makeStub(prefix + 'isVertexArrayOES'),
                        bindVertexArrayOES: makeStub(prefix + 'bindVertexArrayOES'),
                    };
                } else {
                    return {
                        createVertexArrayOES: makeStub('createVertexArray'),
                        deleteVertexArrayOES: makeStub('deleteVertexArray'),
                        isVertexArrayOES: makeStub('isVertexArray'),
                        bindVertexArrayOES: makeStub('bindVertexArray'),
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

        frameCommandBuffer.push(message);

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

            if (functionName === 'compileShader') {
                const message = realGl.getShaderInfoLog(unclonedArgs[0]);
                if (message.length > 0) {
                    console.error('Shader error', realGl, message);
                }
            }

            if (functionName === 'linkProgram') {
                const message = realGl.getProgramInfoLog(unclonedArgs[0]);
                if (message.length > 0) {
                    console.error('Program error', realGl, message);
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
        if (gl.enableWebGL2) {
            gl = Object.create(WebGL2RenderingContext.prototype);
        } else {
            gl = Object.create(WebGLRenderingContext.prototype);
        }
        for (const fnName of message.functions) {
            gl[fnName] = makeStub(fnName);
        }

        for (const constName in message.constants) {
            gl[constName] = message.constants[constName];
        }
        let {width, height} = message;

        frameCommandBuffer = [];
        if (typeof main !== 'undefined') {
            // eslint-disable-next-line no-undef
            main({width, height});
        }

        if (window.glProxy.main) {
            window.glProxy.main({width, height});
        }
        if (frameCommandBuffer.length > 0) {
            window.parent.postMessage({
                workerId,
                messages: frameCommandBuffer,
            }, '*');
        }
        return;
    }

    if (message.hasOwnProperty('id') && pending.hasOwnProperty(message.id)) {
        pending[message.id](message.result);
        delete pending[message.id];
    }

    if (message.name === 'frame') {
        if (Date.now() - message.time > 300) {
            console.log('time drift detected');
            window.parent.postMessage({
                workerId,
                isFrameEnd: true,
            }, '*');
            return;
        }

        frameCommandBuffer = [];

        try {
            if (render) {
                render(message.time);
            }
            if (window.glProxy.render) {
                window.glProxy.render(message.time);
            }
        } catch (err) {
            console.error('Error in gl-worker render fn', err);
        }

        if (frameCommandBuffer.length > 0) {
            window.parent.postMessage({
                workerId,
                messages: frameCommandBuffer,
            }, '*');
        }

        frameCommandBuffer = [];

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

    main({width, height}) {
        this.spatialInterface.changeFrameSize(width, height);
        this.canvas = document.createElement('canvas');
        realGl = this.canvas.getContext('webgl2');
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
    }

    anchoredModelViewCallback(modelViewMatrix, projectionMatrix) {
        this.lastProjectionMatrix = projectionMatrix;
    }

    getRealGl() {
        return realGl;
    }

    getGl() {
        return gl;
    }

    preRender(now) {
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
    }

    render(now) {
        this.preRender(now);

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
                    this.realRenderer = null;
                    // eslint-disable-next-line no-global-assign
                    realGl = null;
                    extVao = null;
                }
                this.done = true;
            }
        }
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

// eslint-disable-next-line no-unused-vars
class ThreejsFakeProxyInterface extends ThreejsInterface {
    constructor(spatialInterface, injectThree) {
        super(spatialInterface, injectThree);
    }

    main({width, height}) {
        super.main({width, height});
        this.canvas.width = width;
        this.canvas.height = height;
        document.body.appendChild(this.canvas);
    }

    render(now) {
        this.preRender(now);

        if (this.isProjectionMatrixSet) {
            if (this.realRenderer && this.scene && this.camera) {
                this.realRenderer.render(this.scene, this.camera);
            }
        }
    }
}
