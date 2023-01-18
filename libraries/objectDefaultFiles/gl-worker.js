const debugGlWorker = true;
const GLPROXY_ENABLE_EXTVAO = true;

/**
 * @typedef {import("./glState.js").JSONGLState} JSONGLState
 * @typedef {import("./glState.js").JSONDeviceDescription} JSONDeviceDescription
 * @typedef {import("./glState.js").Handle} Handle
 */

let proxies = [];
const wantsResponse = false;

// values taken from the wegl extension registry revision 8
const EXTColorBufferHalfFloat = {
    RGBA16F_EXT : 0x881A,
    RGB16F_EXT : 0x881B,
    FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT : 0x8211,
    UNSIGNED_NORMALIZED_EXT : 0x8C17
}

/**
 * Creates a gl context that stores all received commands in the active command buffer object.
 * This allows us to switch buffers behind the scene and split up the stream of commands over multiple buffers.
 */
class GLCommandBufferContext {
    constructor(message) {
        /**
         * @type {JSONGLState}
         */
        this.state = JSON.parse(message.glState);
        /**
         * @type {JSONDeviceDescription}
         */
        this.deviceDesc = JSON.parse(message.deviceDesc);
        this.nextHandle = 1;
        this.handles = {};
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
            if (fnName === "activeTexture") {  
                /**
                 * @type {function(Handle):void}  
                 */ 
                this.gl.activeTexture = (texture) => {
                    this.state.activeTexture = texture;
                    this.addMessage(fnName, [texture]);
                };
            } else if (fnName === "bindBuffer") {    
                /**
                 * @type {function(GLenum, Handle):void}
                 */
                this.gl.bindBuffer = (target, buffer) => {
                    let bufferTargetToTargetBinding = {}
                    bufferTargetToTargetBinding[this.gl.ARRAY_BUFFER] = this.gl.ARRAY_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.ELEMENT_ARRAY_BUFFER] = this.gl.ELEMENT_ARRAY_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.COPY_READ_BUFFER] = this.gl.COPY_READ_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.COPY_WRITE_BUFFER] = this.gl.COPY_WRITE_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.TRANSFORM_FEEDBACK_BUFFER] = this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.UNIFORM_BUFFER] = this.gl.UNIFORM_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.PIXEL_PACK_BUFFER] = this.gl.PIXEL_PACK_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.PIXEL_UNPACK_BUFFER] = this.gl.PIXEL_UNPACK_BUFFER_BINDING;
                    this.state.parameters[bufferTargetToTargetBinding[target]].value = buffer;
                    this.addMessage(fnName, [target, buffer]);
                };
            } else if (fnName === "bindTexture") {   
                /**
                 * @type {function(GLenum, Handle):void}
                 */ 
                this.gl.bindTexture = (target, texture) => {
                    this.state.textureBinds[this.state.activeTexture].value.targets[target].value.texture = texture;
                    this.addMessage(fnName, [target, texture]);
                };
            } else if (fnName === "bufferData") {   
                /**
                 *  @type {function(GLenum, GLenum):void | function(GLenum, GLsizeiptr, GLenum):void | function(GLenum, BufferSource | null, GLenum):void | function(GLenum, GLenum, GLuint):void | function(GLenum, BufferSource | null, GLenum, GLuint):void | function(GLenum, BufferSource | null, GLenum, GLuint, GLuint):void}
                 */ 
                this.gl.bufferData = (...arg) => {
                    let args = Array.from(arg);
                    if (args[1] instanceof Float32Array) {
                        args[1] = {type: "Float32Array", data: new Float32Array(args[1])};
                    } else if (args[1] instanceof Uint8Array) {
                        args[1] = {type: "Uint8Array", data: new Uint8Array(args[1])};
                    } else if (args[1] instanceof Uint16Array) {
                        args[1] = {type: "Uint16Array", data: new Uint16Array(args[1])};
                    } else if (args[1] instanceof Array) {
                        args[1] = Array.from(args[1]);     
                    }
                    this.addMessage(fnName, args);
                };
            } else if (fnName === "clearColor") {    
                /**
                 * @type {function(GLclampf, GLclampf, GLclampf, GLclampf):void}
                 */
                this.gl.clearColor = (red, green, blue, alpha) => {
                    this.state.parameters[this.gl.COLOR_CLEAR_VALUE].value = new Float32Array([red, green, blue, alpha]);
                    this.addMessage(fnName, [red, green, blue, alpha]);
                };
            } else if (fnName === "clearDepth") {    
                /**
                 * @type {function(GLclampf):void}
                 */
                this.gl.clearDepth = (depth) => {
                    this.state.parameters[this.gl.DEPTH_CLEAR_VALUE].value = depth;
                    this.addMessage(fnName, [depth]);
                };
            } else if (fnName === "clearStencil") {
                /**
                 * @type {function(GLint):void}
                 */    
                this.gl.clearStencil = (s) => {
                    this.state.parameters[this.gl.STENCIL_CLEAR_VALUE].value = s;
                    this.addMessage(fnName, [s]);
                };
            } else if (fnName === "createBuffer") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createBuffer = () => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [], handle);
                    return new Handle(handle);
                };
            } else if (fnName === "createProgram") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createProgram = () => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [], handle);
                    return new Handle(handle);
                };
            } else if (fnName === "createShader") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createShader = (type) => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [type], handle);
                    return new Handle(handle);
                };
            } else if (fnName === "createTexture") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createTexture = () => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [], handle);
                    return new Handle(handle);
                };
            } else if (fnName === "createVertexArray") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createVertexArray = () => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [], handle);
                    return new Handle(handle);
                };
            } else if (fnName === "cullFace") {    
                /**
                 * @type {function(GLenum):void}
                 */
                this.gl.cullFace = (mode) => {
                    this.state.parameters[this.gl.CULL_FACE_MODE].value = mode;
                    this.addMessage(fnName, [mode]);
                };
            } else if (fnName === "deleteShader") {
                /**
                 * @type {function(Handle):void}
                 */
                this.gl.deleteShader = (shader) => {
                    if (shader.handle > 0) {
                        delete this.state.unclonables[shader.handle];
                    }
                    this.addMessage(fnName, [shader]);
                };
            } else if (fnName === "depthFunc") {
                /**
                 * @type {function(GLenum):void}
                 */    
                this.gl.depthFunc = (func) => {
                    this.state.parameters[this.gl.DEPTH_FUNC].value = func;
                    this.addMessage(fnName, [func]);
                };
            } else if (fnName === "disable") {  
                /**
                 * @type {function(GLenum):void}
                 */  
                this.gl.disable = (cap) => {
                    this.state.parameters[cap].value = false;
                    this.addMessage(fnName, [cap]);
                };
            } else if (fnName === "enable") {    
                /**
                 * @type {function(GLenum):void}
                 */
                this.gl.enable = (cap) => {
                    this.state.parameters[cap].value = true;
                    this.addMessage(fnName, [cap]);
                };
            } else if (fnName === "frontFace") {
                /**
                 * @type {function(GLenum):void}
                 */    
                this.gl.frontFace = (mode) => {
                    this.state.parameters[this.gl.FRONT_FACE].value = mode;
                    this.addMessage(fnName, [mode]);
                };
            } else if (fnName === "getContextAttributes") {
                /**
                 * @type {function():void}
                 */
                this.gl.getContextAttributes = () => {
                    return this.state.contextAttributes;
                };
            } else if (fnName === "getExtension") {
                /**
                 * @type {function(string):any}
                 */
                this.gl.getExtension = (name) => {
                    // filter based on hardware and webgl version
                    if (!this.deviceDesc.supportedExtensions.includes(name)) return null; 
                    // handle extension and its state
                    let ret = null;
                    if (name === "EXT_color_buffer_float") {
                        ret = {};
                    } else if (name === "OES_texture_float_linear") {
                        ret = {};
                    } else if (name === "EXT_color_buffer_half_float") {
                        ret = this.deviceDesc.extColorBufferHalfFloat;
                    } else if ((name === "EXT_texture_filter_anisotropic") || (name === "MOZ_EXT_texture_filter_anisotropic") || (name === "WEBKIT_EXT_texture_filter_anisotropic")) {
                        ret = this.deviceDesc.extTextureFilterAnisotropic;
                    }
                    // send to remote gl to enable extension
                    this.addMessage(fnName, [name]);
                    return ret;
                };
            } else if (fnName === "getParameter") {
                /**
                 * @type {function(GLenum):any}
                 */
                this.gl.getParameter = (pname) => {
                    // if the extension is not available we don;t have a vlaue to compare against, so this can't be merged into the switch statement
                    if ("extTextureFilterAnisotropic" in this.deviceDesc) {
                        if (pname == this.deviceDesc.extTextureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) {
                            return this.deviceDesc.extTextureFilterAnisotropic.maxTextureMaxAnisotropyEXT;
                        }
                    }
                    if (this.deviceDesc.parameters.hasOwnProperty(pname)) {
                        return this.deviceDesc.parameters[pname].value;
                    } else if (this.state.parameters.hasOwnProperty(pname)) {
                        return this.state.parameters[pname].value;
                    } else {
                        console.log("unknown gl parameter");
                    }
                };
            } else if (fnName === "getProgramParameter") {
                /**
                 * @type {function(Handle, GLenum):any}
                 */
                this.gl.getProgramParameter = (program, pname) => {
                    const messageId = this.addMessage(fnName, [program, pname]);
                    return new Promise(res => {
                        pending[messageId] = res;
                    });
                };
            } else if (fnName === "getShaderPrecisionFormat") {
                /**
                 * @type {function(GLenum, GLenum):WebGLShaderPrecisionFormat}
                 */
                this.gl.getShaderPrecisionFormat = (shaderType, precisionType) => {
                    return this.deviceDesc.shaderPrecisionFormats[shaderType][precisionType];
                };
            } else if (fnName === "getSupportedExtensions") {
                /**
                 * @type {function():Array<string>}
                 */
                this.gl.getSupportedExtensions = () => {
                    return this.deviceDesc.supportedExtensions;
                };
            } else if (fnName === "isEnabled") {
                /**
                 * @type {function(GLenum):GLboolean}
                 */
                this.gl.isEnabled = (cap) => {
                    return this.state.parameters[cap].value;
                };
            } else if (fnName === "linkProgram") {
                /**
                 * @type {function(Handle):void}
                 */
                this.gl.linkProgram = (program) => {
                    this.addMessage(fnName, [program]);
                };
            } else if (fnName === "scissor") {
                /**
                 * @type {function(GLint, GLint, GLsizei, GLsizei):void}
                 */
                this.gl.scissor = (x, y, width, height) => {
                    this.state.parameters[this.gl.SCISSOR_BOX].value = new Int32Array([x, y, width, height]);
                    // send to remote gl
                    this.addMessage(fnName, [x, y, width, height]);
                };
            } else if (fnName === "shaderSource") {
                /**
                 * @type {function(Handle, string):void}
                 */
                this.gl.shaderSource = (shader, source) => {
                    this.addMessage(fnName, [shader, source]);
                };
            } else if (fnName === "texImage2D") {
                /**
                 * @type {function(GLenum, GLint, GLenum, GLsizei, GLsizei, GLint, GLenum, GLenum, ArrayBufferView):void | function(GLenum, GLint, GLenum, GLenum, GLenum, ArrayBufferView):void}
                 */
                this.gl.texImage2D = this.makeStub(fnName);
            } else if (fnName === "texParameterf") {
                /**
                 * @type {function(GLenum, GLenum, GLfloat):void}
                 */
                this.gl.texParameterf = (target, pname, param) => {
                    this.state.textureBinds[this.state.activeTexture].value.targets[target].value.parameters[pname].value = param;
                    this.addMessage(fnName, [target, pname, param]);
                };
            } else if (fnName === "texParameteri") {
                /**
                 * @type {function(GLenum, GLenum, GLint):void}
                 */
                this.gl.texParameteri = (target, pname, param) => {
                    this.state.textureBinds[this.state.activeTexture].value.targets[target].value.parameters[pname].value = param;
                    this.addMessage(fnName, [target, pname, param]);
                };
            } else if (fnName === "useProgram") {
                /**
                 * @type {function(Handle):void}
                 */
                this.gl.useProgram = (program) => {
                    // send to remote gl
                    this.addMessage(fnName, [program]);
                };
            } else if (fnName === "viewport") {
                /**
                 * @type {function(GLint, GLint, GLsizei, GLsizei):void}
                 */
                this.gl.viewport = (x, y, width, height) => {
                    this.state.parameters[this.gl.VIEWPORT].value = new Int32Array([x, y, width, height]);
                    // send to remote gl
                    this.addMessage(fnName, [x, y, width, height]);
                };
            } else {
                this.gl[fnName] = (...args) => {
                    this.addMessage(fnName, Array.from(args));
                }
            }
        }
        for (const constName in message.constants) {        
            if (this.gl.hasOwnProperty(constName)) {
                this.gl[constName] = message.constants[constName];
            }
        }
    }

    /**
     * Changes the buffer in which we store open gl commands
     * @param {CommandBuffer} commandBuffer - the command buffer to use for storing gl commands
     */
    setActiveCommandBuffer(commandBuffer) {
        this.activeBuffer = commandBuffer;
    }

    /**
     * Adds a message to the active command buffer
     * @param {String} name - the function name
     * @param {Array<String>} args - the function arguments 
     * @returns invocation id 
     */
    addMessage(name, args) {
        return this.activeBuffer.addMessage(name, args);
    }

    addMessageWithHandle(name, args, handle) {
        return this.activeBuffer.addMessageWithHandle(name, args, handle);
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
                    if (args[i].fakeClone) {
                        // do nothing
                    } else if (args[i] instanceof Float32Array) {
                        args[i] = {type: "Float32Array", data: new Float32Array(args[i])};
                    } else if (args[i] instanceof Uint8Array) {
                        args[i] = {type: "Uint8Array", data: new Uint8Array(args[i])};
                    } else if (args[i] instanceof Uint16Array) {
                        args[i] = {type: "Uint16Array", data: new Uint16Array(args[i])};
                    } else if (args[i] instanceof Array) {
                        args[i] = Array.from(args[i]);
                    } else {
                        args[i] = Array.from(Object.values(args[i]));
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

            // glCommandBuferObject is the copy of the this pointer stored in the closure.
            // by requesting the commandbuffer from the object, we can change it between calls.
            let messageId = null;
            if (localContext.activeBuffer !== null) {
                if (functionName === "shaderSource") {
                    console.log("here");
                }
                messageId = localContext.addMessage(functionName, args);
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
                    //res = realGl[functionName].apply(realGl, unclonedArgs);
                }

                /*if (functionName === 'linkProgram') {
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
                }*/


                if (typeof res === 'object' && res !== null) {
                    let proxy = new Proxy({
                        __uncloneableId: messageId,
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
                    pending.set(messageId, res);
                });
            }
        };
    }
}

/**
 * List of WebGL commands that can be executed.
 */
class CommandBuffer {
    static nextBufferId = 1;

    constructor(workerId, isRendering, debugName = "") {
        this.debugName = debugName;
        this.commandBufferId = CommandBuffer.nextBufferId++;
        this.workerId = workerId;
        this.isRendering = isRendering;
        this.commandBuffer = [];
    }

    addMessageWithHandle(funcName, args, handle) {
        const message = {
            name: funcName,
            args: args,
            handle: handle
        };
        this.commandBuffer.push(message);
        const id = {
            worker: this.workerId,
            commandBuffer: this.commandBufferId,
            command: this.commandBuffer.length
        };
        return id;
    }

    /**
     * Adds a mesage to the command buffer and returns the invocation id
     * @param {String} funcName - function name
     * @param {Array<String>} args - function arguments
     */
    addMessage(funcName, args) {
       return this.addMessageWithHandle(funcName, args, null);
    }

    

    // Executes all the webGL commands stored in this buffer
    execute() {
        if (this.commandBuffer.length > 0) {
            try {
                let test = structuredClone(this.commandBuffer);
                console.debug(test);
                window.parent.postMessage({
                    workerId: this.workerId,
                    commandBufferId: this.commandBufferId,
                    isRendering: this.isRendering,
                    commands: this.commandBuffer
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

    createAndActivate(isRendering) {
        let commandBuffer = new CommandBuffer(this.workerId, isRendering);
        this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
        return commandBuffer;
    }
}

let commandBufferFactory = null;

/**
 * @type {CommandBuffer | null}
 */
let frameCommandBuffer = null;
let bootstrapProcessed = false;

const pending = new Map();

// Render function specified by worker script
/**
 * @type {function(number, CommandBuffer): void}
 */
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
/**
 * @type {WebGL2RenderingContext | null}
 */
let realGl = null;

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
            bootstrapCommandBuffers = main(width, height, commandBufferFactory);
        }
        if (window.glProxy.main) {
            bootstrapCommandBuffers = window.glProxy.main(width, height, commandBufferFactory);
        }
        frameCommandBuffer = commandBufferFactory.createAndActivate(true);

        for (const bootstrapCommandBuffer of bootstrapCommandBuffers) {
            bootstrapCommandBuffer.execute();
        }

        bootstrapProcessed = true;

        return;
    }

    if (message.hasOwnProperty('id') && pending.hasOwnProperty(message.id)) {
        pending[message.id](message.result);
        delete pending[message.id];
    }

    if (message.name === 'frame') {
        if (!bootstrapProcessed) {
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

        if (frameCommandBuffer.commandBuffer.length > 0) {
            window.parent.postMessage({
                workerId,
                isFrameEnd: true,
            }, '*');
        }
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

    /**
     * 
     * @param {number} width 
     * @param {number} height 
     * @param {CommandBufferFactory} cmdBufferFactory 
     * @returns {CommandBuffer[]}
     */
    main(width, height, cmdBufferFactory) {
        this.spatialInterface.changeFrameSize(width, height);
        this.canvas = document.createElement('canvas');
        realGl = this.canvas.getContext('webgl2');
        let cmdBuffer = cmdBufferFactory.createAndActivate(false);
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

    /**
     * 
     * @returns {WebGL2RenderingContext | null}
     */
    getRealGl() {
        return realGl;
    }

    /**
     * 
     * @param {number} now 
     * @param {CommandBuffer} commandBuffer 
     * @returns {CommandBuffer | null}
     */
    render(now, commandBuffer) {
        if (!this.camera) {
            console.warn('rendering too early');
            return null;
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
                    this.realRenderer = null;
                    // eslint-disable-next-line no-global-assign
                    realGl = null;
                }
                this.done = true;
            }
        }
        return commandBuffer;
    }

    /**
     * 
     * @param {THREE.Matrix4} matrix 
     * @param {number[]} array 
     */
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

    /**
     * 
     * @param {number} width
     * @param {number} height
     * @param {CommandBufferFactory} cmdBufferFactory 
     * @returns {CommandBuffer[]}
     */
    main(width, height, cmdBufferFactory) {
        let ret = super.main(width, height, cmdBufferFactory);
        this.canvas.width = width;
        this.canvas.height = height;
        document.body.appendChild(this.canvas);
        return ret;
    }

    /**
     * 
     * @param {number} now 
     * @param {CommandBuffer} commandBuffer 
     * @param {CommandBuffer | null}
     */
    render(now, commandBuffer) {
        let ret = super.render(now, commandBuffer);

        if (this.isProjectionMatrixSet) {
            if (this.realRenderer && this.scene && this.camera) {
                this.realRenderer.render(this.scene, this.camera);
            }
        }
        return ret;
    }
}
