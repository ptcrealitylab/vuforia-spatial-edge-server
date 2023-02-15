import {Handle} from "./glState.js"

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
            } else if (fnName === "attachShader") {   
                /**
                 * @type {function(Handle, Handle):void}
                 */ 
                this.gl.attachShader = (program, shader) => {
                    this.addMessage(fnName, [program, shader]);
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
            } else if (fnName === "bindVertexArray") {
                /**
                 * @type {function(Handle):void}
                 */
                this.gl.bindVertexArray = (vertexArray) => {
                    this.addMessage(fnName, [vertexArray])
                }
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
            } else if (fnName === "clear") {   
                /**
                 * @type {function(GLBitField):void}
                 */ 
                this.gl.clear = (mask) => {
                    this.addMessage(fnName, [mask]);
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
            } else if (fnName === "colorMask") {
                /**
                 * @type {function(GLboolean, GLboolean, GLboolean, GLboolean):void}
                 */    
                this.gl.colorMask = (red, green, blue, alpha) => {
                    this.state.parameters[this.gl.COLOR_WRITEMASK].value = [red, green, blue, alpha];
                    this.addMessage(fnName, [red, green, blue, alpha]);
                };
            } else if (fnName === "compileShader") {   
                /**
                 * @type {function(Handle):void}
                 */ 
                this.gl.compileShader = (shader) => {
                    this.addMessage(fnName, [shader]);
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
            } else if (fnName === "depthMask") {
                /**
                 * @type {function(GLboolean):void}
                 */
                this.gl.depthMask = (flag) => {
                    this.state.parameters[this.gl.DEPTH_WRITEMASK].value = flag;
                    this.addMessage(fnName, [flag]);
                };
            } else if (fnName === "disable") {  
                /**
                 * @type {function(GLenum):void}
                 */  
                this.gl.disable = (cap) => {
                    this.state.parameters[cap].value = false;
                    this.addMessage(fnName, [cap]);
                };
            } else if (fnName === "drawElements") {
                /**
                 * @type {function(GLenum, GLsizei, GLenum, GLintptr):void}
                 */
                this.gl.drawElements = (mode, count, type, offset) => {
                    this.addMessage(fnName, [mode, count, type, offset]);
                };
            } else if (fnName === "enable") {    
                /**
                 * @type {function(GLenum):void}
                 */
                this.gl.enable = (cap) => {
                    this.state.parameters[cap].value = true;
                    this.addMessage(fnName, [cap]);
                };
            } else if (fnName === "enableVertexAttribArray") {    
                /**
                 * @type {function(GLuint):void}
                 */
                this.gl.enableVertexAttribArray = (index) => {
                    this.addMessage(fnName, [index]);
                };
            } else if (fnName === "frontFace") {
                /**
                 * @type {function(GLenum):void}
                 */    
                this.gl.frontFace = (mode) => {
                    this.state.parameters[this.gl.FRONT_FACE].value = mode;
                    this.addMessage(fnName, [mode]);
                };
            } else if (fnName === "getActiveAttrib") {    
                /**
                 * @type {function(Handle, GLuint):{name: string, size: GLsizei, type: GLenum}}}
                 */
                this.gl.getActiveAttrib = (program, index) => {
                    let buffer_length_buf = new SharedArrayBuffer(4); 
                    this.addMessageAndWait("getActiveAttrib_bufferSize", [program, index], buffer_length_buf);
                    const buffer_length = new Int32Array(buffer_length_buf)[0]
                    let buffer = new SharedArrayBuffer(buffer_length);
                    this.addMessageAndWait("getActiveAttrib", [program, index], buffer);
                    let utf8TextDecoder = new TextDecoder();
                    let texbuf = new Uint8Array(buffer_length - 8);
                    texbuf.set(new Uint8Array(buffer, 0, buffer_length - 8));
                    let sizeTypeBufMem = new ArrayBuffer(8);
                    new Uint8Array(sizeTypeBufMem).set(new Uint8Array(buffer, buffer_length - 8, 8));
                    let sizeTypeBuf = new Int32Array(sizeTypeBufMem);
                    return {name: utf8TextDecoder.decode(texbuf).substring(0, buffer_length - 9), size: sizeTypeBuf[0], type: sizeTypeBuf[1]}
                };
            } else if (fnName === "getActiveUniform") {    
                /**
                 * @type {function(Handle, GLuint):{name: string, size: GLsizei, type: GLenum}}}
                 */
                this.gl.getActiveUniform = (program, index) => {
                    let buffer_length_buf = new SharedArrayBuffer(4); 
                    this.addMessageAndWait("getActiveUniform_bufferSize", [program, index], buffer_length_buf);
                    const buffer_length = new Int32Array(buffer_length_buf)[0]
                    let buffer = new SharedArrayBuffer(buffer_length);
                    this.addMessageAndWait("getActiveUniform", [program, index], buffer);
                    let utf8TextDecoder = new TextDecoder();
                    let texbuf = new Uint8Array(buffer_length - 8);
                    texbuf.set(new Uint8Array(buffer, 0, buffer_length - 8));
                    let sizeTypeBufMem = new ArrayBuffer(8);
                    new Uint8Array(sizeTypeBufMem).set(new Uint8Array(buffer, buffer_length - 8, 8));
                    let sizeTypeBuf = new Int32Array(sizeTypeBufMem);
                    return {name: utf8TextDecoder.decode(texbuf).substring(0, buffer_length - 9), size: sizeTypeBuf[0], type: sizeTypeBuf[1]}
                };
            } else if (fnName === "getAttribLocation") {
                /**
                 * @type {function(Handle, string):GLuint}
                 */    
                this.gl.getAttribLocation = (program, name) => {
                    let buffer = new SharedArrayBuffer(4);
                    this.addMessageAndWait(fnName, [program, name], buffer);
                    return new Int32Array(buffer)[0];
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
                    let result = new SharedArrayBuffer(4);
                    this.addMessageAndWait(fnName, [program, pname], result);
                    return new Int32Array(result)[0];
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
            } else if (fnName === "getUniformLocation") {
                /**
                 * @type {function(Handle, string):Handle}
                 */    
                this.gl.getUniformLocation = (program, name) => {
                    let handle = this.nextHandle++;
                    this.addMessageWithHandle(fnName, [program, name], handle);
                    return new Handle(handle);
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
            } else if (fnName === "makeXRCompatible") {   
                /**
                 * @type {function():void}
                 */ 
                this.gl.makeXRCompatible = () => {
                    this.addMessage(fnName, []);
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
            } else if (fnName === "vertexAttribDivisor") {
                /**
                 * @type {function(GLuint, GLuint):void}
                 */
                this.gl.vertexAttribDivisor = (index, divisor) => {
                    this.addMessage(fnName, [index, divisor]);
                };
            } else if (fnName === "vertexAttribPointer") {
                /**
                 * @type {function(GLuint, GLint, GLenum, GLboolean, GLsizei, GLintptr):void}
                 */
                this.gl.vertexAttribPointer = (index, size, type, normalized, stride, offset) => {
                    this.addMessage(fnName, [index, size, type, normalized, stride, offset]);
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
            } else if (fnName === "uniform1i") {
                /**
                 * @type {function(Handle, GLint):void}
                 */
                this.gl.uniform1i = (location, v0) => {
                    this.addMessage(fnName, [location, v0]);
                };
            } else if (fnName === "uniform1f") {
                /**
                 * @type {function(Handle, GLfloat):void}
                 */
                this.gl.uniform1f = (location, v0) => {
                    this.addMessage(fnName, [location, v0]);
                };
            } else if (fnName === "uniform3f") {
                /**
                 * @type {function(Handle, GLfloat, GLfloat, GLfloat):void}
                 */
                this.gl.uniform3f = (location, v0, v1, v2) => {
                    this.addMessage(fnName, [location, v0, v1, v2]);
                };
            } else if (fnName === "uniform3fv") {
                /**
                 * @type {function(Handle, Float32Array, GLsizei=, GLsizei=):void}
                 */
                this.gl.uniform3fv = (location, data, srcOffset, srcLength) => {
                    if (srcLength) {
                        this.addMessage(fnName, [location, data, srcOffset, srcLength]);
                    } else if (srcOffset) {
                        this.addMessage(fnName, [location, data, srcOffset]);
                    } else {
                        this.addMessage(fnName, [location, data]);
                    }
                };
            } else if (fnName === "uniformMatrix3fv") {
                /**
                 * @type {function(Handle, GLboolean, Float32Array, GLsizei=, GLsizei=):void}
                 */
                this.gl.uniformMatrix3fv = (location, transpose, data, srcOffset, srcLength) => {
                    if (srcLength) {
                        this.addMessage(fnName, [location, transpose, data, srcOffset, srcLength]);
                    } else if (srcOffset) {
                        this.addMessage(fnName, [location, transpose, data, srcOffset]);
                    } else {
                        this.addMessage(fnName, [location, transpose, data]);
                    }
                };
            } else if (fnName === "uniformMatrix4fv") {
                /**
                 * @type {function(Handle, GLboolean, Float32Array, GLsizei=, GLsizei=):void}
                 */
                this.gl.uniformMatrix4fv = (location, transpose, data, srcOffset, srcLength) => {
                    if (srcLength) {
                        this.addMessage(fnName, [location, transpose, data, srcOffset, srcLength]);
                    } else if (srcOffset) {
                        this.addMessage(fnName, [location, transpose, data, srcOffset]);
                    } else {
                        this.addMessage(fnName, [location, transpose, data]);
                    }
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

            // glCommandBuferObject is the copy of the this pointer stored in the closure.
            // by requesting the commandbuffer from the object, we can change it between calls.
            let messageId = null;
            if (localContext.activeBuffer !== null) {
                messageId = localContext.addMessage(functionName, args);
            } else {
                console.error('No active command buffer set for gl context');
            }
        };
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
     * @param {Array<any>} args - the function arguments  
     */
    addMessage(name, args) {
        this.activeBuffer.addMessage(name, args);
    }

    /**
     * Adds a message with the allocated handle to represent the created object
     * 
     * @param {string} name 
     * @param {Array<any>} args 
     * @param {number} handle 
     */
    addMessageWithHandle(name, args, handle) {
        this.activeBuffer.addMessageWithHandle(name, args, handle);
    }

    /**
     * Adds a message and waits until the server has executed the command and responded
     * 
     * @param {string} name 
     * @param {Array<any>} args 
     * @param {SharedArrayBuffer} resultBuffer
     */
    addMessageAndWait(name, args, resultBuffer) {
        this.activeBuffer.addMessageAndWait(name, args, resultBuffer);
    }
}

/**
 * @typedef {import("./glState.js").GLState} GLState
 * @typedef {import("./glState.js").WebGL} WebGL
 * @typedef {import("./glState.js").Handle} Handle 
 * @typedef {*} HandleObj
 */

class CommandId {
    /**
     * 
     * @param {number} worker 
     * @param {number} buffer 
     * @param {number} command 
     */
    constructor(worker, buffer, command) {
        /**
         * @type {number}
         */
        this.worker = worker;

        /**
         * @type {number}
         */
        this.buffer = buffer;

        /**
         * @type {number}
         */
        this.command = command;
    }
}

class Command {
    /**
     * 
     * @param {string} name 
     * @param {any[]} args 
     * @param {number|null} handle
     * @param {SharedArrayBuffer|null} responseBuffer
     */
    constructor(name, args, handle, responseBuffer) {
        /**
         * @type {string}
         */
        this.name = name;

        /**
         * @type {any[]}
         */
        this.args = structuredClone(args);

        /**
         * @type {number | null}
         */
        this.handle = handle;

        /**
         * @type {SharedArrayBuffer | null}
         */
        this.responseBuffer = responseBuffer;
    }
}

/**
 * List of WebGL commands that can be executed.
 */
class CommandBuffer {
    static nextBufferId = 1;

    /**
     * 
     * @param {number} workerId 
     * @param {Int32Array} synclock 
     * @param {boolean} isRendering 
     * @param {string} debugName 
     */
    constructor(workerId, synclock, isRendering, debugName = "") {
        /**
         * @type {string}
         */
        this.debugName = debugName;
        /**
         * @type {number}
         */
        this.commandBufferId = CommandBuffer.nextBufferId++;
        /**
         * @type {number}
         */
        this.workerId = workerId;
        /**
         * @type {boolean}
         */
        this.isRendering = isRendering;
        /**
         * @type {Int32Array}
         */
        this.synclock = synclock;
        /**
         * @type {Array<Command>}
         */
        this.commands = [];
        /**
         * @type {boolean}
         */
        this.isCleared = false;
    }

    /**
     * 
     * @param {string} funcName 
     * @param {Array<string>} args 
     * @param {number | null} handle 
     * @param {SharedArrayBuffer | null} responseBuffer 
     */
    addMessageInternal(funcName, args, handle, responseBuffer) {
        const message = new Command(funcName, args, handle, responseBuffer);
        this.commands.push(message);
    }

    /**
     * Adds a mesage to the command buffer
     * @param {String} funcName - function name
     * @param {Array<any>} args - function arguments
     */
    addMessage(funcName, args) {
       this.addMessageInternal(funcName, args, null, null);
    }

    /**
     * Add a message to the command buffer and waits for a response from the server
     * @param {string} funcName 
     * @param {Array<any>} args 
     * @param {SharedArrayBuffer} responseBuffer memory used for the response
     */
    addMessageAndWait(funcName, args, responseBuffer) {
        this.addMessageInternal(funcName, args, null, responseBuffer);
        this.executeAndWait();
        this.clear();
    }   
    
    /**
     * Add a message to the command buffer to create an object referenced by the handle
     * @param {string} funcName 
     * @param {Array<any>} args 
     * @param {number} handle
     */
    addMessageWithHandle(funcName, args, handle) {
       this.addMessageInternal(funcName, args, handle, null);
    }

    // Executes all the webGL commands stored in this buffer
    execute() {
        if (this.commands.length > 0) {
            try {
                let test = structuredClone(this.commandBuffer);
                //console.debug(test);
                postMessage({
                    workerId: this.workerId,
                    commandBufferId: this.commandBufferId,
                    isRendering: this.isRendering,
                    commands: this.commands,
                });
            }
            catch (e) {
                console.error(e);
            }
        }
    }

    executeAndWait() {
        if (this.isRendering) {
            console.error("Render buffer not repeatable. The render buffer contains a command that sends back data to the tool, this is not allowed because of async nature of rendering commandbuffers");
            return;
        } 
        if (this.commands.length > 0) {
            try {
                Atomics.store(this.synclock, 0, 0);
                postMessage({
                    workerId: this.workerId,
                    commandBufferId: this.commandBufferId,
                    isRendering: false,
                    commands: this.commands,
                });
                Atomics.wait(this.synclock, 0, 0);
            }
            catch (e) {
                console.error(e);
            }
        }

    }

    // clears the whole buffer for reuse
    clear() {
        this.commands = [];
        this.isCleared = true;
    }
}

/**
 * creates new command buffer using the hidden variables to hide construction details
 * 
 */
class CommandBufferFactory {
    /**
     * 
     * @param {number} workerId 
     * @param {GLCommandBufferContext} glCommandBufferContext 
     * @param {Int32Array} synclock 
     */
    constructor(workerId, glCommandBufferContext, synclock) {
        this.workerId = workerId;
        this.synclock = synclock;
        this.glCommandBufferContext = glCommandBufferContext;
    }

    getGL() {
        return this.glCommandBufferContext.gl;
    }

    /**
     * 
     * @param {boolean} isRendering 
     * @returns {CommandBuffer}
     */
    createAndActivate(isRendering) {
        let commandBuffer = new CommandBuffer(this.workerId, this.synclock, isRendering);
        this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
        return commandBuffer;
    }
}

/**
 * manages all received command buffers and the one that is used for rendering
 * 
 */
class CommandBufferManager {
    /**
     * 
     * @param {number} workerId 
     */
    constructor(workerId) {
        /**
         * @type {CommandBuffer[]}
         */
        this.commandBuffers = [];

        /**
         * @type {CommandBuffer}
         */
        this.renderCommandBuffer = new CommandBuffer(workerId, -1, true, []);
    }

    /**
     * 
     * @param {Message} commandBuffer 
     */
    onCommandBufferReceived(commandBuffer) {
        //console.log(`cmd(${commandBuffer.workerId}): received buffer[${commandBuffer.commands.length}]`);
        this.commandBuffers.push(commandBuffer);
    
    }

    /**
     * 
     * @returns {CommandBuffer} the newest commandbuffer marked for rendering for which all resources have been loaded
     */
    getRenderCommandBuffer() {
        while (this.commandBuffers.length > 0) {
            const commandBuffer = this.commandBuffers[0];
            if (commandBuffer.isRendering) {
                // the command buffer was marked for rendering, remove it from the list and store it as the last known rendering command buffer 
                this.commandBuffers.shift();
                this.renderCommandBuffer = commandBuffer;
            } else {
                // the command buffer is marked for loading resources, return last know command buffer for rendering
                return this.renderCommandBuffer;
            }
        }
        return this.renderCommandBuffer;
    }

    /**
     * 
     * @returns {CommandBuffer | null} the next resource commandbuffer if it exists
     */
    getResourceCommandBuffer() {
        while (this.commandBuffers.length > 0) {
            const commandBuffer = this.commandBuffers[0];
            this.commandBuffers.shift();
            if (commandBuffer.isRendering) {
               // the command buffer was marked for rendering, update the last known rendering frame buffer, since we've loaded all resources
               this.renderCommandBuffer = commandBuffer;
            } else {
                // the command buffer was marked for resource loading, return it
                return commandBuffer;
            }
        }
        return null;
    }
}

export {CommandId, Command, CommandBuffer, CommandBufferFactory, CommandBufferManager, GLCommandBufferContext};

