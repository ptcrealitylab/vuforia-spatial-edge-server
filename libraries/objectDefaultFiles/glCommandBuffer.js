import {DeviceDescription, GLState, Handle} from "./glState.js"

/**
 * Creates a gl context that stores all received commands in the active command buffer object.
 * This allows us to switch buffers behind the scene and split up the stream of commands over multiple buffers.
 */
class GLCommandBufferContext {
    /**
     * 
     * @param {{glState: string, deviceDesc: string, functions: string[]}} message 
     */
    constructor(message) {
        /**
         * current webGL state of the server will equal a fresh webGL context with a default start state
         * @type {JSONGLState}
         */
        this.state = JSON.parse(message.glState);
        /**
         * unchangeable parameters, mostly hardware related based on the server
         * @type {JSONDeviceDescription}
         */
        this.deviceDesc = JSON.parse(message.deviceDesc);
        /**
         * handles are 0: invalid, negative: server created (default opengl state of textures and buffers) positive: client created
         * first valid handle = 1
         * @type {number}
         */
        this.nextHandle = 1;
        /**
         * all created handles
         * @type {{}}
         */
        this.handles = {};
        
        /**
         * enable webgl2
         * @type {boolean} 
         */
        this.enableWebGL2 = true;

        this.contextLost = false;
       
        // Create a fake gl context that pushes all called functions on the command buffer
        if (this.enableWebGL2) {
            /**
             * @type {WebGL}
             */
            this.gl = Object.create(WebGL2RenderingContext.prototype);
        } else {
            this.gl = Object.create(WebGLRenderingContext.prototype);
        }
        // replace all known members on our webGL context so they write to the command buffer instead of executing the commands directly
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
            } else if (fnName === "beginQuery") {
                 /**
                 * @type {function(GLenum, Handle):void}
                 */ 
                this.gl.beginQuery = (target, query) => {
                    this.addMessage(fnName, [target, query]);
                };
             } else if (fnName === "beginTransformFeedback") {
                 /**
                 * @type {function(GLenum):void}
                 */ 
                this.gl.beginTransformFeedback = (primitiveMode) => {
                    this.addMessage(fnName, [primitiveMode]);
                };
            } else if (fnName === "bindAttribLocation") {   
                /**
                 * @type {function(Handle, GLuint, string):void}
                 */ 
                this.gl.bindAttribLocation = (program, index, name) => {
                    this.addMessage(fnName, [program, index, name]);
                };
            } else if (fnName === "bindBuffer") {    
                /**
                 * @type {function(GLenum, Handle):void}
                 */
                this.gl.bindBuffer = (target, buffer) => {
                    /**
                     * @type {Object<string, GLenum>}
                     */
                    let bufferTargetToTargetBinding = {}
                    bufferTargetToTargetBinding[this.gl.ARRAY_BUFFER] = this.gl.ARRAY_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.ELEMENT_ARRAY_BUFFER] = this.gl.ELEMENT_ARRAY_BUFFER_BINDING;
                    if (this.gl instanceof WebGL2RenderingContext) {
                        bufferTargetToTargetBinding[this.gl.COPY_READ_BUFFER] = this.gl.COPY_READ_BUFFER_BINDING;
                        bufferTargetToTargetBinding[this.gl.COPY_WRITE_BUFFER] = this.gl.COPY_WRITE_BUFFER_BINDING;
                        bufferTargetToTargetBinding[this.gl.TRANSFORM_FEEDBACK_BUFFER] = this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING;
                        bufferTargetToTargetBinding[this.gl.UNIFORM_BUFFER] = this.gl.UNIFORM_BUFFER_BINDING;
                        bufferTargetToTargetBinding[this.gl.PIXEL_PACK_BUFFER] = this.gl.PIXEL_PACK_BUFFER_BINDING;
                        bufferTargetToTargetBinding[this.gl.PIXEL_UNPACK_BUFFER] = this.gl.PIXEL_UNPACK_BUFFER_BINDING;
                    }
                    this.state.parameters[bufferTargetToTargetBinding[target]].value = buffer;
                    this.addMessage(fnName, [target, buffer]);
                };
            } else if (fnName === "bindBufferBase") {   
                /**
                 * @type {function(GLenum, GLuint, Handle):void}
                 */ 
                this.gl.bindBufferBase = (target, index, buffer) => {
                    let bufferTargetToTargetBinding = {}
                    bufferTargetToTargetBinding[this.gl.TRANSFORM_FEEDBACK_BUFFER] = this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.UNIFORM_BUFFER] = this.gl.UNIFORM_BUFFER_BINDING
                    // todo: state tracking for non general binding points (index)
                    this.addMessage(fnName, [target, index, buffer]);
                };
            } else if (fnName === "bindBufferRange") {   
                /**
                 * @type {function(GLenum, GLuint, Handle, GLintptr, GLsizeiptr):void}
                 */ 
                this.gl.bindBufferRange = (target, index, buffer, offset, size) => {
                    let bufferTargetToTargetBinding = {}
                    bufferTargetToTargetBinding[this.gl.TRANSFORM_FEEDBACK_BUFFER] = this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING;
                    bufferTargetToTargetBinding[this.gl.UNIFORM_BUFFER] = this.gl.UNIFORM_BUFFER_BINDING
                    // todo: state tracking for non general binding points (index)
                    this.addMessage(fnName, [target, index, buffer, offset, size]);
                };
            } else if (fnName === "bindRenderbuffer") {   
                /**
                 * @type {function(GLenum, Handle):void}
                 */ 
                this.gl.bindRenderBuffer = (target, renderbuffer) => {
                    this.state.parameters[this.gl.RENDERBUFFER_BINDING].value = renderbuffer;
                    this.addMessage(fnName, [target, renderbuffer]);
                };
            } else if (fnName === "bindSampler") {
                 /**
                 * @type {function(GLuint, Handle):void}
                 */ 
                this.gl.bindSampler = (unit, sampler) => {
                    // todo: statetracking in the texture unit
                    this.addMessage(fnName, [unit, sampler]);
                };    
            } else if (fnName === "bindTexture") {   
                /**
                 * @type {function(GLenum, Handle):void}
                 */ 
                this.gl.bindTexture = (target, texture) => {
                    this.state.textureBinds[this.state.activeTexture].value.targets[target].value.texture = texture;
                    this.addMessage(fnName, [target, texture]);
                };
            } else if (fnName === "bindTransformFeedback") {
                 /**
                 * @type {function(GLenum, Handle):void}
                 */ 
                this.gl.bindTransformFeedback = (target, transformFeedback) => {
                    // todo: statetracking
                    this.addMessage(fnName, [target, transformFeedback]);
                };  
            } else if (fnName === "bindVertexArray") {
                /**
                 * @type {function(Handle):void}
                 */
                this.gl.bindVertexArray = (vertexArray) => {
                    this.addMessage(fnName, [vertexArray])
                }
             } else if (fnName === "blendColor") {
                /**
                 * @type {function(GLclampf, GLclampf, GLclampf, GLclampf):void}
                 */
                this.gl.blendColor = (red, green, blue, alpha) => {
                    this.state.parameters[this.gl.BLEND_COLOR].value = new Float32Array([red, green, blue, alpha]);
                    this.addMessage(fnName, [red, green, blue, alpha]);
                }
            } else if (fnName === "blendEquation") {
                /**
                 * @type {function(GLenum):void}
                 */
                this.gl.blendEquation = (mode) => {
                    this.state.parameters[this.gl.BLEND_EQUATION].value = mode;
                    this.state.parameters[this.gl.BLEND_EQUATION_RGB].value = mode;
                    this.state.parameters[this.gl.BLEND_EQUATION_ALPHA].value = mode;
                    this.addMessage(fnName, [mode]);
                }
            } else if (fnName === "blendEquationSeparate") {
                /**
                 * @type {function(GLenum, GLenum):void}
                 */
                this.gl.blendEquationSeparate = (modeRGB, modeAlpha) => {
                    this.state.parameters[this.gl.BLEND_EQUATION].value = modeRGB === modeAlpha ? modeRGB : this.gl.INVALID_ENUM;
                    this.state.parameters[this.gl.BLEND_EQUATION_RGB].value = modeRGB;
                    this.state.parameters[this.gl.BLEND_EQUATION_ALPHA].value = modeAlpha;
                    this.addMessage(fnName, [modeRGB, modeAlpha]);
                }
            } else if (fnName === "blendFunc") {
                /**
                 * @type {function(GLenum, GLenum):void}
                 */
                this.gl.blendFunc = (sfactor, dfactor) => {
                    this.state.parameters[this.gl.BLEND_SRC_RGB].value = sfactor;
                    this.state.parameters[this.gl.BLEND_SRC_ALPHA].value = sfactor;
                    this.state.parameters[this.gl.BLEND_DST_RGB].value = dfactor;
                    this.state.parameters[this.gl.BLEND_DST_ALPHA].value = dfactor;
                    this.addMessage(fnName, [sfactor, dfactor])
                }
             } else if (fnName === "blendFuncSeparate") {
                /**
                 * @type {function(GLenum, GLenum, GLenum, GLenum):void}
                 */
                this.gl.blendFuncSeparate = (srcRGB, dstRGB, srcAlpha, dstAlpha) => {
                    this.state.parameters[this.gl.BLEND_SRC_RGB].value = srcRGB;
                    this.state.parameters[this.gl.BLEND_SRC_ALPHA].value = srcAlpha;
                    this.state.parameters[this.gl.BLEND_DST_RGB].value = dstRGB;
                    this.state.parameters[this.gl.BLEND_DST_ALPHA].value = dstAlpha;
                    this.addMessage(fnName, [srcRGB, dstRGB, srcAlpha, dstAlpha])
                }
             } else if (fnName === "blitFramebuffer") {
                /**
                 * @type {function(GLint, GLint, GLint, GLint, GLint, GLint, GLint, GLint, GLbitfield, GLenum):void}
                 */
                this.gl.blitFramebuffer = (srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter) => {
                    // todo: state tracking
                    this.addMessage(fnName, [srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter])
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
            } else if (fnName === "bufferSubData") {   
                /**
                 *  @type {function(GLenum, GLenum):void | function(GLenum, GLsizeiptr, GLenum):void | function(GLenum, BufferSource | null, GLenum):void | function(GLenum, GLenum, GLuint):void | function(GLenum, BufferSource | null, GLenum, GLuint):void | function(GLenum, BufferSource | null, GLenum, GLuint, GLuint):void}
                 */ 
                this.gl.bufferSubData = (...arg) => {
                    let args = Array.from(arg);
                    if (args[2] instanceof Float32Array) {
                        args[2] = {type: "Float32Array", data: new Float32Array(args[2])};
                    } else if (args[2] instanceof Uint8Array) {
                        args[2] = {type: "Uint8Array", data: new Uint8Array(args[2])};
                    } else if (args[2] instanceof Uint16Array) {
                        args[2] = {type: "Uint16Array", data: new Uint16Array(args[2])};
                    } else if (args[2] instanceof Array) {
                        args[2] = Array.from(args[2]);     
                    }
                    this.addMessage(fnName, args);
                };
            } else if (fnName === "checkFramebufferStatus") {   
                /**
                 * @type {function(GLenum):void}
                 */ 
                this.gl.checkFramebufferStatus = (target) => {
                    let buffer = new SharedArrayBuffer(4);
                    this.addMessageAndWait(fnName, [target], buffer);
                    return new Uint32Array(buffer)[0];
                };
            } else if (fnName === "clear") {   
                /**
                 * @type {function(GLbitfield):void}
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
            } else if (fnName === "clientWaitSync") {
                /**
                 * @type {function(Handle, GLbitfield, GLint64):GLenum}
                 */    
                this.gl.clientWaitSync = (sync, flags, timeout) => {
                    let buffer = new SharedArrayBuffer(4);
                    this.addMessageAndWait(fnName, [sync, flags, timeout], buffer);
                    return new Uint32Array(buffer)[0];
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
            } else if (fnName === "compressedTexImage2D") {   
                this.gl.compressedTexImage2D = (...arg) => {
                    let args = Array.from(arg);
                    if (args.length > 6) {
                        if (args[6] instanceof Float32Array) {
                            args[6] = {type: "Float32Array", data: new Float32Array(args[6])};
                        } else if (args[6] instanceof Uint8Array) {
                            args[6] = {type: "Uint8Array", data: new Uint8Array(args[6])};
                        } else if (args[6] instanceof Uint16Array) {
                            args[6] = {type: "Uint16Array", data: new Uint16Array(args[6])};
                        } else if (args[6] instanceof Array) {
                            args[6] = Array.from(args[6]);     
                        }
                    }
                    this.addMessage(fnName, Array.from(args));
                };  
            } else if (fnName === "compressedTexImage3D") {   
                this.gl.compressedTexImage3D = (...arg) => {
                    let args = Array.from(arg);
                    if (args.length > 7) {
                        if (args[7] instanceof Float32Array) {
                            args[7] = {type: "Float32Array", data: new Float32Array(args[7])};
                        } else if (args[7] instanceof Uint8Array) {
                            args[7] = {type: "Uint8Array", data: new Uint8Array(args[7])};
                        } else if (args[7] instanceof Uint16Array) {
                            args[7] = {type: "Uint16Array", data: new Uint16Array(args[7])};
                        } else if (args[7] instanceof Array) {
                            args[7] = Array.from(args[7]);     
                        }
                    }
                    this.addMessage(fnName, Array.from(args));
                }; 
            } else if (fnName === "compressedTexSubImage2D") {   
                this.gl.compressedTexSubImage2D = (...arg) => {
                    let args = Array.from(arg);
                    if (args.length > 7) {
                        if (args[7] instanceof Float32Array) {
                            args[7] = {type: "Float32Array", data: new Float32Array(args[7])};
                        } else if (args[7] instanceof Uint8Array) {
                            args[7] = {type: "Uint8Array", data: new Uint8Array(args[7])};
                        } else if (args[7] instanceof Uint16Array) {
                            args[7] = {type: "Uint16Array", data: new Uint16Array(args[7])};
                        } else if (args[7] instanceof Array) {
                            args[7] = Array.from(args[7]);     
                        }
                    }
                    this.addMessage(fnName, Array.from(args));
                }; 
            } else if (fnName === "compressedTexSubImage3D") {   
                this.gl.compressedTexSubImage2D = (...arg) => {
                    let args = Array.from(arg);
                    if (args.length > 9) {
                        if (args[9] instanceof Float32Array) {
                            args[9] = {type: "Float32Array", data: new Float32Array(args[9])};
                        } else if (args[9] instanceof Uint8Array) {
                            args[9] = {type: "Uint8Array", data: new Uint8Array(args[9])};
                        } else if (args[9] instanceof Uint16Array) {
                            args[9] = {type: "Uint16Array", data: new Uint16Array(args[9])};
                        } else if (args[9] instanceof Array) {
                            args[9] = Array.from(args[9]);     
                        }
                    }
                    this.addMessage(fnName, Array.from(args));
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
            } else if (fnName === "createQuery") {
                /**
                 * @type {function():Handle}
                 */
                this.gl.createQuery = () => {
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
            } else if (fnName === "disableVertexAttribArray") {  
                /**
                 * @type {function(GLuint):void}
                 */  
                this.gl.disableVertexAttribArray = (index) => {
                    // todo state management
                    this.addMessage(fnName, [index]);
                };
            } else if (fnName === "drawElements") {
                /**
                 * @type {function(GLenum, GLsizei, GLenum, GLintptr):void}
                 */
                this.gl.drawElements = (mode, count, type, offset) => {
                    this.addMessage(fnName, [mode, count, type, offset]);
                };
            } else if (fnName === "fenceSync") {
                /**
                 * @type {function(GLenum, GLbitfield):Handle}
                 */
                this.gl.fenceSync = (condition, flags) => {
                    let handle = this.nextHandle++;
                    this.addMessage(fnName, [condition, flags], handle);
                    return new Handle(handle);
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
                    // request the size of the buffer needed for the response
                    let buffer_length_buf = new SharedArrayBuffer(4); 
                    this.addMessageAndWait("getActiveAttrib_bufferSize", [program, index], buffer_length_buf);
                    const buffer_length = new Int32Array(buffer_length_buf)[0]
                    // request the actual response
                    let buffer = new SharedArrayBuffer(buffer_length);
                    this.addMessageAndWait("getActiveAttrib", [program, index], buffer);
                    // decode result
                    // keep in mind that the byte buffer contains a WebGLActiveInfo struct with a string, zero termination and 2 32-bit numbers so string + 9 bytes
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
                    // request the size of the buffer needed for the response
                    let buffer_length_buf = new SharedArrayBuffer(4); 
                    this.addMessageAndWait("getActiveUniform_bufferSize", [program, index], buffer_length_buf);
                    const buffer_length = new Int32Array(buffer_length_buf)[0]
                    // request the actual response
                    let buffer = new SharedArrayBuffer(buffer_length);
                    // decode result
                    // keep in mind that the byte buffer contains a WebGLActiveInfo struct with a string, zero termination and 2 32-bit numbers so string + 9 bytes
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
                    // prevent handle decoration for structured cloning
                    this.addMessageAndWait(fnName, [new Handle(program.handle), name], buffer);
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
                        ret = {
                            RGBA32F_EXT: DeviceDescription.RGBA32F_EXT,
                            RGB32F_EXT: DeviceDescription.RGB32F_EXT
                        };
                    } else if (name === "OES_texture_float_linear") {
                        ret = {};
                    } else if (name === "EXT_color_buffer_half_float") {
                        ret = {
                            RGBA16F_EXT: DeviceDescription.RGBA16F_EXT,
                            RGB16F_EXT: DeviceDescription.RGB16F_EXT,
                            FRAMEBUFFER_ATTACHEMENT_COMPONENT_TYPE_EXT: DeviceDescription.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT,
                            UNSIGNED_NORMALIZED_EXT: DeviceDescription.UNSIGNED_NORMALIZED_EXT
                        };
                    } else if ((name === "EXT_texture_filter_anisotropic") || (name === "MOZ_EXT_texture_filter_anisotropic") || (name === "WEBKIT_EXT_texture_filter_anisotropic")) {
                        ret = {
                            MAX_TEXTURE_MAX_ANISOTROPY_EXT: DeviceDescription.MAX_TEXTURE_MAX_ANISOTROPY_EXT,
                            TEXTURE_MAX_ANISOTROPY_EXT: DeviceDescription.TEXTURE_MAX_ANISOTROPY_EXT
                        };
                    } else if (name === "WEBGL_debug_renderer_info") {
                        ret = {
                            UNMASKED_VENDOR_WEBGL: DeviceDescription.UNMASKED_VENDOR_WEBGL,
                            UNMASKED_RENDERER_WEBGL: DeviceDescription.UNMASKED_RENDERER_WEBGL        
                        };
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
            } else if (fnName === "getUniformBlockIndex") {
                /**
                 * @type {function(Handle, string):Handle}
                 */    
                this.gl.getUniformBlockIndex = (program, uniformBlockName) => {
                    //let handle = this.nextHandle++;
                    let buffer = new SharedArrayBuffer(4);        
                    // prevent spectre decoration (function) of the Handle to mess with the structured cloning
                    this.addMessageAndWait(fnName, [new Handle(program.handle), uniformBlockName], buffer);
                    return new Uint32Array(buffer)[0];
                };
            } else if (fnName === "getUniformLocation") {
                /**
                 * @type {function(Handle, string):Handle}
                 */    
                this.gl.getUniformLocation = (program, name) => {
                    let handle = this.nextHandle++;
                    // prevent spectre decoration (function) of the Handle to mess with the structured cloning
                    this.addMessageWithHandle(fnName, [new Handle(program.handle), name], handle);
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
            } else if (fnName === "pixelStorei") {   
                /**
                 * @type {function(GLenum, GLenum):void}
                 */ 
                this.gl.pixelStorei = (pname, param) => {
                    // todo state management
                    this.addMessage(fnName, [pname, param]);
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
            } else if (fnName === "stencilFunc") {
                /**
                 * @type {function(GLenum, GLint, GLuint):void}
                 */
                this.gl.stencilFunc = (func, ref, mask) => {
                    this.addMessage(fnName, [func, ref, mask]);
                };
            } else if (fnName === "stencilMask") {
                /**
                 * @type {function(GLuint):void}
                 */
                this.gl.stencilMask = (mask) => {
                    this.addMessage(fnName, [mask]);
                };
            } else if (fnName === "stencilOp") {
                /**
                 * @type {function(GLenum, GLenum, GLenum):void}
                 */
                this.gl.stencilOp = (fail, zfail, zpass) => {
                    this.addMessage(fnName, [fail, zfail, zpass]);
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
                    // prevent handle decoration for structured cloning
                    this.addMessage(fnName, [new Handle(program.handle)]);
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
            } else if (fnName === "uniformBlockBinding") {
                /**
                 * @type {function(Handle, Handle, GLuint):void}
                 */
                this.gl.uniformBlockBinding = (program, uniformBlockIndex, uniformBlockBinding) => {
                    // todo state management
                    // prevent handle decoration for structured cloning
                    this.addMessage(fnName, [new Handle(program.handle), uniformBlockIndex, uniformBlockBinding]);
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
                // if an unknown function is called, execute it as a default command, not expecting any type of response
                this.gl[fnName] = (...args) => {
                    this.addMessage(fnName, Array.from(args));
                }
            }
        }
    }

    /**
     * old function used for sending texture data
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
        if (this.contextLost) {
            this.activeBuffer.onContextLost();
        } else {
            this.activeBuffer.onContextRestored();
        }
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

    onContextLost() {
        this.contextLost = true;
        this.activeBuffer.onContextLost();
    }

    onContextRestored() {
        this.activeBuffer.onContextRestored();
        this.nextHandle = 1;
        this.handles = {};
        this.contextLost = false;
    }
}

/**
 * @typedef {import("./glState.js").GLState} GLState
 * @typedef {import("./glState.js").WebGL} WebGL
 */

/**
 * identification of the command based on the worker that send it, the command buffer it was listed in and the index in that command buffer
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

/**
 * as single command in the command buffer to be executed by the server
 */
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
         * the webgl function to call
         * @type {string}
         */
        this.name = name;

        /**
         * Argument for the requested command
         * create a structured clone of the arguments to make sure they don't change
         * @type {any[]}
         */
        this.args = structuredClone(args);

        /**
         * the assigned number/handle by the client to assign to the internal object after creation
         * @type {number | null}
         */
        this.handle = handle;

        /**
         * the buffer to send back a response from the webgl server back to the client in a synchroneous way
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
         * a command buffer can be given a name to identify it while debugging
         * @type {string}
         */
        this.debugName = debugName;
        /**
         * id of this command buffer
         * @type {number}
         */
        this.commandBufferId = CommandBuffer.nextBufferId++;
        /**
         * the id of the worker isuing this command buffer
         * @type {number}
         */
        this.workerId = workerId;
        /**
         * true if this command buffer is meant to be repeatable/renderable each frame, if false it will be a resource commandbuffer
         * @type {boolean}
         */
        this.isRendering = isRendering;
        /**
         * sharedarraybuffer backed int32array that is used as a synchronization method between server and client
         * @type {Int32Array}
         */
        this.synclock = synclock;
        /**
         * the commands stored in the command buffer
         * @type {Array<Command>}
         */
        this.commands = [];
        /**
         * indicates that the buffer was cleared since last time this flag was set to false
         * this is used as a measure to indicate that a render command buffer was changed into a resource command buffer because of a synchroneous command splitting the buffer
         * in that specific case the buffer will be cleared and the remaining buffer will not be repeatable without the first part
         * @type {boolean}
         */
        this.isCleared = false;

        this.sendBuffers = true;
    }

    /**
     * adds a command into the command buffer in the most general way
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
        // add sync message
        this.addMessageInternal(funcName, args, null, responseBuffer);
        // send and wait
        this.executeAndWait();
        // since the previous commands stored in this buffer have been executed, clear the command buffer to prevent the same action to be performed twice
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

    onContextLost() {
        this.sendBuffers = false;
    }

    onContextRestored() {
        this.sendBuffers = true;
    }

    // sends the commandbuffer to the server for execution
    execute() {
        if (this.commands.length > 0 && this.sendBuffers) {
            try {
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

    // sends the commandbuffer to the server and goes to sleep until a response has been received
    executeAndWait() {
        // prevent render commandbuffers to be send, since all buffer with synchronisation are per definition not repeatable
        if (this.isRendering) {
            console.error("Render buffer not repeatable. The render buffer contains a command that sends back data to the tool, this is not allowed because of async nature of rendering commandbuffers");
            return;
        } 
        // do nothing if the command buffer is empty (sanity check)
        if (this.commands.length > 0 && this.sendBuffers) {
            try {
                // change the webworker state to waiting
                Atomics.store(this.synclock, 0, 0);
                // send command buffer
                postMessage({
                    workerId: this.workerId,
                    commandBufferId: this.commandBufferId,
                    isRendering: false,
                    commands: this.commands,
                });
                postMessage({
                    workerId: this.workerId,
                    isFrameEnd: true
                });
                // await response
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
        this.isCleared = true; // set to indicate that the buffer has been cleared since last time this flag was set to false
    }
}

/**
 * creates new command buffer using the hidden variables to hide construction details
 * 
 */
class CommandBufferFactory {
    /**
     * 
     * @param {number} workerId this worker's id
     * @param {GLCommandBufferContext} glCommandBufferContext the context used by outr fake webgl to find to correct commandbuffer to write to
     * @param {Int32Array} synclock synchronisation mechnism for synchroneous commands
     */
    constructor(workerId, glCommandBufferContext, synclock) {
        this.workerId = workerId;
        this.synclock = synclock;
        this.glCommandBufferContext = glCommandBufferContext;
    }

    /**
     * 
     * @returns the fake webgl renderer used by this commandbuffer factory
     */
    getGL() {
        return this.glCommandBufferContext.gl;
    }

    /**
     * creates a new command buffer and immediately activates it. new commands executed on the fake webgl context will be stored in the newly created buffer
     * @param {boolean} isRendering indicates that the commands stored in this buffer are meant to be repeatable
     * @returns {CommandBuffer} th newly created and activated commandbuffer
     */
    createAndActivate(isRendering) {
        let commandBuffer = new CommandBuffer(this.workerId, this.synclock, isRendering);
        this.glCommandBufferContext.setActiveCommandBuffer(commandBuffer);
        return commandBuffer;
    }
}

/**
 * manages all received command buffers on the server
 * this class will decide when to execute a resource command buffer and which render command buffer to use for rendering the proxy
 */
class CommandBufferManager {
    /**
     * 
     * @param {number} workerId 
     */
    constructor(workerId) {
        /**
         * all received command buffers in order
         * @type {CommandBuffer[]}
         */
        this.commandBuffers = [];

        /**
         * the commandbuffer currently used for repeated rendering
         * the rendering buffer starts as an empty commandbuffer, so the tool doesn't show until it is fully loaded.
         * @type {CommandBuffer}
         */
        this.renderCommandBuffer = new CommandBuffer(workerId, new Int32Array([1]), true, []);
    }

    /**
     * drops all command buffers and resets the state
     */
    onContextLost() {
        this.commandBuffers = [];
        this.renderCommandBuffer = new CommandBuffer(this.renderCommandBuffer.workerId, -1, true, []);
    }

    /**
     * called when a commandbuffer is received by the server from the client
     * @param {Message} commandBuffer 
     */
    onCommandBufferReceived(commandBuffer) {
        //console.log(`cmd(${commandBuffer.workerId}): received buffer[${commandBuffer.commands.length}]`);
        this.commandBuffers.push(commandBuffer);
    
    }

    /**
     * returns the last command buffer marked for rendering before encounterign a resource command buffer
     * this will make sure all resources have been loaded and that the most recent state of the tool posible is rendered
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
     * checks if there a resource commandbuffers in the list and returns the first one it finds
     * also updates the render commandbuffer to the latest it finds before finding the first resource commandbuffer
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

