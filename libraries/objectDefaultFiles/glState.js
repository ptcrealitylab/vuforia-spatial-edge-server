if (typeof createNameSpace !== "undefined") {
    createNameSpace("realityEditor.gui.glState");
} else {
    var realityEditor = {gui : {glState: {}}};
}

/**
 * Everything that is returned as a handle
 * @typedef {WebGLBuffer | WebGLTexture | null} HandleObj 
 */

/**
 * WebGLAbstraction
 * @typedef {WebGLRenderingContext | WebGL2RenderingContext} WebGL
 */

/**
 * the parsed json version of the Handle class
 * @typedef {{handle: number}} JSONHandle
 */

/**
 * the parsed version of the NamedParameter class
 * @template T
 * @typedef {{name: string, value: T}} JSONNamedParameter
 */

/**
 * the parsed version of the NamedNumberParameter class
 * @typedef {{name: string, value: GLenum | GLint | GLfloat}} JSONNamedNumberParameter
 */

/**
 * the parsed version of the NamedStringParameter class
 * @typedef {{name: string, value: string}} JSONNamedStringParameter
 */

/**
 * the parsed version of the NamedBooleanParameter class
 * @typedef {{name: string, value: boolean}} JSONNamedBooleanParameter
 */

/**
 * the parsed version of the NamedInt32ArrayParameter class
 * @typedef {{name: string, value: Int32Array}} JSONNamedInt32ArrayParameter
 */

/**
 * the parsed version of the NamedFloat32ArrayParameter class
 * @typedef {{name: string, value: Float32Array}} JSONNamedFloat32ArrayParameter
 */

/**
 * the parsed version of the NamedHandleParameter class
 * @typedef {{name: string, value: JSONHandle}} JSONNamedHandleParameter
 */

/**
 * the parsed version of the TypedParameter class
 * @typedef {{name: string, type: string, value: GLenum | GLint | GLfloat}} JSONTypedParameter 
 */

/**
 * the parsed version of the TextureState class
 * @typedef {{target: GLenum, texture: JSONHandle, parameters: {[k: string]: TypedParameter}}} JSONTextureState
 */

/**
 * the parsed version of the NamedTextureStateParameter class
 * @typedef {{name: string, value: JSONTextureState}} JSONNamedTextureStateParameter
 */

/**
 * the parsed version of the TextureUnitState class
 * @typedef {{textureUnit: GLenum, targets: {[k: string]: JSONNamedTextureStateParameter}}} JSONTextureUnitState 
 */

/**
 * the parsed version of the NamedTextureUnitStateParameter class
 * @typedef {{name: string, value: JSONTextureUnitState}} JSONNamedTextureUnitStateParameter
 */

/**
 * the parsed version of the GLState class
 * @typedef {{}} JSONGLState
 */

/**
 *  the parsed version of the DeviceDescription class
 * @typedef {{supportedExtensions: string[], parameters: {}, shaderPrecisionFormats: {}}} JSONDeviceDescription
 */

/**
 * @typedef {{name: string, args:any[], handle: number}} Command
 */

/**
 * @typedef {{workerId: number, commandBufferId: number, isRendering: boolean, commands: Command[]}} CommandBuffer
 */

/**
 * @template T
 */
class Clonable {
    constructor() {

    }

    /**
     * @abstract
     * @returns {T}
     */
    clone() {
        throw new Error("Calling abstract function");
    }
}

/**
 * @extends Clonable<Handle>
 */
class Handle extends Clonable {
    /**
     * @param {number} handle 
     */
    constructor(handle) {
        super();
        /**
         * @type {handle}
         */
        this.handle = handle
    }

    /**
     * @override
     * @returns {Handle}
     */
    clone() {
        return new Handle(this.handle);
    }

    /**
     * @returns {JSONHandle}
     */
    toJSON() {
        return {handle: this.handle};
    }

    /**
     * 
     * @param {JSONHandle} json 
     * @returns {Handle}
     */
    static fromJSON(json) {
        return new Handle(json.handle);
    }
}

/**
 * @template T
 * @template R
 * @extends Clonable<R>
 */
class BaseNamedParameter extends Clonable {
    /**
     * 
     * @param {string} name 
     * @param {T} value 
     */
    constructor(name, value) {
        super();
        /**
         * @type {string}
         */
        this.name = name;

        /**
         * @type {T}
         */
        this.value = value;
    }   
}

/**
 * @extends {BaseNamedParameter<GLenum | GLint | GLfloat, NamedNumberParameter>}
 */
class NamedNumberParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {GLenum | GLint | GLfloat} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedNumberParameter}
     */
    clone() {
        return new NamedNumberParameter(this.name, this.value);
    }

    /**
     * @returns {JSONNamedNumberParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value};
    }

    /**
     * @param {JSONNamedNumberParameter} json
     * @returns {NamedNumberParameter}
     */
    static fromJSON(json) {
        return new NamedNumberParameter(json.name, json.value);
    }
}

/**
 * @extends {BaseNamedParameter<boolean, NamedBooleanParameter>}
 */
class NamedBooleanParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {boolean} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedBooleanParameter}
     */
    clone() {
        return new NamedBooleanParameter(this.name, this.value);
    }

    /**
     * @returns {JSONNamedBooleanParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value};
    }

    /**
     * @param {JSONNamedBooleanParameter} json
     * @returns {NamedBooleanParameter}
     */
    static fromJSON(json) {
        return new NamedBooleanParameter(json.name, json.value);
    }
}

/**
 * @extends {BaseNamedParameter<string, NamedStringParameter>}
 */
class NamedStringParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {string} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedStringParameter}
     */
    clone() {
        return new NamedStringParameter(this.name, this.value);
    }

    /**
     * @returns {JSONNamedStringParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value};
    }

    /**
     * @param {JSONNamedStringParameter} json
     * @returns {NamedStringParameter}
     */
    static fromJSON(json) {
        return new NamedStringParameter(json.name, json.value);
    }
}

/**
 * @extends {BaseNamedParameter<Int32Array, NamedInt32ArrayParameter>}
 */
class NamedInt32ArrayParameter extends BaseNamedParameter{
    /**
     * 
     * @param {string} name 
     * @param {Int32Array} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedInt32ArrayParameter}
     */
    clone() {
        return new NamedInt32ArrayParameter(this.name, new Int32Array(this.value));
    }

    /**
     * 
     * @returns {JSONNamedInt32ArrayParameter}
     */
    toJSON() {
        return {name: this.name, value: new Int32Array(this.value)};
    }

    /**
     * 
     * @param {JSONNamedInt32ArrayParameter} json 
     * @returns {NamedInt32ArrayParameter}
     */
    static fromJSON(json) {
        return new NamedInt32ArrayParameter(json.name, new Int32Array(json.value));
    }
}

/**
 * @extends {BaseNamedParameter<Float32Array, NamedFloat32ArrayParameter>}
 */
class NamedFloat32ArrayParameter extends BaseNamedParameter{
    /**
     * 
     * @param {string} name 
     * @param {Float32Array} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedFloat32ArrayParameter}
     */
    clone() {
        return new NamedFloat32ArrayParameter(this.name, new Float32Array(this.value));
    }

    /**
     * 
     * @returns {JSONNamedFloat32ArrayParameter}
     */
    toJSON() {
        return {name: this.name, value: new Float32Array(this.value)};
    }

    /**
     * 
     * @param {JSONNamedFloat32ArrayParameter} json 
     * @returns {NamedFloat32ArrayParameter}
     */
    static fromJSON(json) {
        return new NamedFloat32ArrayParameter(json.name, new Float32Array(json.value));
    }
}

/**
 * @extends {BaseNamedParameter<TextureState, NamedTextureStateParameter>}
 */
class NamedTextureStateParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {TextureState} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedTextureStateParameter}
     */
    clone() {
        return new NamedTextureStateParameter(this.name, this.value.clone());
    }

    /**
     * 
     * @returns {JSONNamedTextureStateParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value.toJSON()};
    }

    /**
     * 
     * @param {WebGL} gl
     * @param {Map<number, HandleObj>} unclonables
     * @param {JSONNamedTextureStateParameter} json 
     * @returns {NamedTextureStateParameter}
     */
    static fromJSON(gl, unclonables, json) {
        return new NamedTextureStateParameter(json.name, TextureState.fromJSON(gl, unclonables, json.value));
    }
}

/**
 * @extends {BaseNamedParameter<TextureUnitState, NamedTextureUnitStateParameter>}
 */
class NamedTextureUnitStateParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {TextureUnitState} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedTextureUnitStateParameter}
     */
    clone() {
        return new NamedTextureUnitStateParameter(this.name, this.value.clone());
    }

    /**
     * 
     * @returns {JSONNamedTextureUnitStateParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value.toJSON()};
    }

    /**
     * 
     * @param {WebGL} gl
     * @param {Map<number, HandleObj>} unclonables
     * @param {JSONNamedTextureUnitStateParameter} json 
     * @returns {NamedTextureUnitStateParameter}
     */
    static fromJSON(gl, unclonables, json) {
        return new NamedTextureUnitStateParameter(json.name, TextureUnitState.fromJSON(gl, unclonables, json.value));
    }
}


/**
 * @extends {BaseNamedParameter<Handle, NamedHandleParameter>}
 */
class NamedHandleParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {Handle} value 
     */
    constructor(name, value) {
        super(name, value);
    }

     /**
     * @override
     * @returns {NamedHandleParameter}
     */
    clone() {
        return new NamedHandleParameter(this.name, this.value.clone());
    }

    /**
     * 
     * @returns {JSONNamedHandleParameter}
     */
    toJSON() {
        return {name: this.name, value: this.value.toJSON()};
    }

    /**
     * @param {JSONNamedHandleParameter} json 
     * @returns {NamedHandleParameter}
     */
    static fromJSON(json) {
        return new NamedHandleParameter(json.name, Handle.fromJSON(json.value));
    }
}

/**
 * @extends BaseNamedParameter<number, TypedParameter>
 */
class TypedParameter extends BaseNamedParameter {
    /**
     * 
     * @param {string} name 
     * @param {string} type 
     * @param {GLenum | GLint | GLfloat} value 
     */
    constructor(name, type, value) {
        super(name, value)

        /**
         * @type {string}
         */
        this.type = type;
    }

    /**
     * 
     * @returns {TypedParameter}
     */
    clone() {
        return new TypedParameter(this.name, this.type, this.value);
    }

    /**
     * @returns {JSONTypedParameter}
     */
    toJSON() {
        return {name: this.name, type: this.type, value: this.value};
    }

    /**
     * @param {JSONTypedParameter} json
     * @returns {TypedParameter}
     */
    static fromJSON(json) {
        return new TypedParameter(json.name, json.type, json.value);
    }
 }

/** 
 * tracks the state of a texture bound to a texture unit 
 */
class TextureState {
    // recognized webgl parameters
    // WebGL 1.0
    static TEXTURE_MAG_FILTER = 0x2800;
    static TEXTURE_MIN_FILTER = 0x2801;
    static TEXTURE_WRAP_S = 0x2802;
    static TEXTURE_WRAP_T = 0x2803;
    // EXT_texture_filter_anisotropic
    static TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;
    // WebGL 2.0
    static TEXTURE_BASE_LEVEL = 0x813C;
    static TEXTURE_COMPARE_FUNC = 0x884D;
    static TEXTURE_COMPARE_MODE = 0x884C;
    static TEXTURE_MAX_LEVEL = 0x813D;
    static TEXTURE_MAX_LOD = 0x813B;
    static TEXTURE_MIN_LOD = 0x813A;
    static TEXTURE_WRAP_R = 0x8072;


    // values needed for webgl agnostic initialization
    static LEQUAL = 0x203;
    static LINEAR = 0x2601;
    static NEAREST_MIPMAP_LINEAR = 0x2702;
    static NONE = 0x0;
    static REPEAT = 0x2900;

    /**
     * 
     * @param {WebGL} gl 
     * @param {GLenum} target 
     * @param {Map<number, HandleObj>} unclonables 
     */
    constructor(gl, target, unclonables) {
        /**
         * @type {WebGL}
         */
        this.gl = gl;

        /**
         * @type {Map<number, HandleObj>}
         */
        this.unclonables = unclonables;

        /**
         * @type {GLenum}
         */
        this.target = target;

        /**
         * @type {Handle}
         */
        this.texture = TextureState.getTextureHandle(null, unclonables);

        /**
         * @type {Map<GLenum, TypedParameter>}
         */
        this.parameters = new Map();
        // WebGL 1.0
        this.parameters.set(TextureState.TEXTURE_MAG_FILTER, new TypedParameter("TEXTURE_MAG_FILTER", "i", TextureState.LINEAR));
        this.parameters.set(TextureState.TEXTURE_MIN_FILTER, new TypedParameter("TEXTURE_MIN_FILTER", "i", TextureState.NEAREST_MIPMAP_LINEAR));
        this.parameters.set(TextureState.TEXTURE_WRAP_S, new TypedParameter("TEXTURE_WRAP_S", "i", TextureState.REPEAT));
        this.parameters.set(TextureState.TEXTURE_WRAP_T, new TypedParameter("TEXTURE_WRAP_T", "i", TextureState.REPEAT));
        // EXT_texture_filter_anisotropic
        this.parameters.set(TextureState.TEXTURE_MAX_ANISOTROPY_EXT, new TypedParameter("MAX_TEXTURE_MAX_ANISOTROPY_EXT", "f", 1.0));
        // WebGL 2.0
        this.parameters.set(TextureState.TEXTURE_BASE_LEVEL, new TypedParameter("TEXTURE_BASE_LEVEL", "i", 0));
        this.parameters.set(TextureState.TEXTURE_COMPARE_FUNC, new TypedParameter("TEXTURE_COMPARE_FUNC", "i", TextureState.LEQUAL));
        this.parameters.set(TextureState.TEXTURE_COMPARE_MODE, new TypedParameter("TEXTURE_COMPARE_MODE", "i", TextureState.NONE));
        this.parameters.set(TextureState.TEXTURE_MAX_LEVEL, new TypedParameter("TEXTURE_MAX_LEVEL", "i", 1000));
        this.parameters.set(TextureState.TEXTURE_MAX_LOD, new TypedParameter("TEXTURE_MAX_LOD", "f", 1000.0));
        this.parameters.set(TextureState.TEXTURE_MIN_LOD, new TypedParameter("TEXTURE_MIN_LOD", "f", -1000.0));
        this.parameters.set(TextureState.TEXTURE_WRAP_R, new TypedParameter("TEXTURE_WRAP_R", "i", TextureState.REPEAT));
    }

    /**
     * 
     * @returns {TextureState}
     */
    clone() {
        let ret = new TextureState(this.gl, this.target, this.unclonables);
        ret.texture = this.texture;
        this.parameters.forEach((value, key) => ret.parameters.set(key, value.clone()));
        return ret;
    }

    /**
     * 
     * @returns {JSONTextureState}
     */
    toJSON() {
        return {
            target: this.target,
            texture: this.texture,
            parameters: Object.fromEntries(this.parameters.entries())
        };
    }

    /**
     * 
     * @param {WebGL} gl
     * @param {Map<number, HandleObj>} unclonables
     * @param {JSONTextureState} json 
     * @returns {TextureState}
     */
    static fromJSON(gl, unclonables, json) {
        let ret = new TextureState(gl, json.target, unclonables);
        ret.texture = Handle.fromJSON(json.texture);
        for (let [key, value] of ret.parameters.entries()) {
            value.value = Reflect.get(json.parameters, key).value;
        }
        return ret;
    }

    /**
     * 
     * @param {WebGLTexture | null} texture 
     * @param {Map<number, HandleObj>} unclonables 
     * @returns {Handle}
     */
    static getTextureHandle(texture, unclonables) {
        let ret_handle = 0;
        for (const [handle, obj] of unclonables) {
            if (texture === obj) {
                ret_handle = handle;
                break;
            }
        }
        if (ret_handle === 0) {
            // create a new internal handle (always negative)
            let minValue = Math.min(...unclonables.keys());
            ret_handle = ((!isFinite(minValue)) || (minValue > 0)) ? -1 : minValue - 1;
            unclonables.set(ret_handle, texture);
        }
        return new Handle(ret_handle);
    }

    /**
     * 
     * @param {WebGL} gl 
     * @param {GLenum} target 
     * @param {Map<number, HandleObj>} unclonables 
     * @returns 
     */
    static createFromGLContext(gl, target, unclonables) {
        let ret = new TextureState(gl, target, unclonables);
        let targetToTargetBinding = new Map();
        targetToTargetBinding.set(gl.TEXTURE_2D, gl.TEXTURE_BINDING_2D);
        targetToTargetBinding.set(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_BINDING_CUBE_MAP);
        // add "|| gl.hasOwnProperty("TEXTURE_3D")" here to support khronos's own debug layer
        if (gl instanceof WebGL2RenderingContext) {
            targetToTargetBinding.set(gl.TEXTURE_3D, gl.TEXTURE_BINDING_3D);
            targetToTargetBinding.set(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_BINDING_2D_ARRAY);
        }
        const texture = gl.getParameter(targetToTargetBinding.get(target));
        this.texture = TextureState.getTextureHandle(texture, unclonables);
        if (texture !== null) {
            ret.parameters.forEach((parameter, key) => parameter.value = gl.getTexParameter(target, key));
        }
        return ret;
    }

    /**
     * 
     * @param {Command} command 
     */
    processOneCommand(command) {
        if (command.name === "bindTexture") {
            this.texture = command.args[1];
        }
    }

    forceApply() {
        const texture = this.unclonables.get(this.texture.handle);
        if (texture !== undefined) { 
            this.gl.bindTexture(this.target, texture);
            if (this.unclonables.get(this.texture.handle) !== null) {
                this.parameters.forEach((parameter, key) => {
                    if (parameter.type === "i") {
                        this.gl.texParameteri(this.target, key, parameter.value)
                    } else if (parameter.type === "f") {
                        this.gl.texParameterf(this.target, key, parameter.value)
                    }
                });
            }
        }
    }

    /**
     * 
     * @param {TextureState} other 
     */
    apply(other) {
        if (other.texture !== this.texture) {
            const texture = this.unclonables.get(this.texture.handle);
            if (texture !== undefined) {
                let ret = this.gl.bindTexture(this.target, texture);
            }
        }
        if (this.unclonables.get(this.texture.handle) !== null) {
            this.parameters.forEach((parameter, key) => {
                let otherParameter = other.parameters.get(key); 
                if (otherParameter && otherParameter.value !== parameter.value) {
                    if (parameter.type === "i") {
                        this.gl.texParameteri(this.target, key, parameter.value)
                    } else if (parameter.type === "f") {
                        this.gl.texParameterf(this.target, key, parameter.value)
                    }
                }
            });
        }
    }
}

/**
 * tracks the state of a texture unit in opengl
 */
class TextureUnitState {
    // recognized webgl targets
    // WebGL 1.0
    static TEXTURE_2D = 0x0DE1;
    static TEXTURE_CUBE_MAP = 0x8513;
    // WebGL 2.0
    static TEXTURE_2D_ARRAY = 0x8C1A
    static TEXTURE_3D = 0x806F;

    /**
     * 
     * @param {WebGL} gl 
     * @param {GLenum} textureUnit 
     * @param {Map<number, HandleObj>} unclonables 
     */
    constructor(gl, textureUnit, unclonables) {
        /**
         * @type {WebGL}
         */
        this.gl = gl;

        /**
         * @type GLenum
         */
        this.textureUnit = textureUnit;

        /**
         * @type {Map<number, HandleObj>}
         */
        this.unclonables = unclonables;

        /**
         * @type {Map<GLenum, NamedTextureStateParameter>}
         */
        this.targets = new Map();
        // WebGL 1.0
        this.targets.set(TextureUnitState.TEXTURE_2D, new NamedTextureStateParameter("TEXTURE_2D", new TextureState(this.gl, TextureUnitState.TEXTURE_2D, unclonables)));
        this.targets.set(TextureUnitState.TEXTURE_CUBE_MAP, new NamedTextureStateParameter("TEXTURE_CUBE_MAP", new TextureState(this.gl, TextureUnitState.TEXTURE_CUBE_MAP, unclonables)));
        // WebGL 2.0
        this.targets.set(TextureUnitState.TEXTURE_2D_ARRAY, new NamedTextureStateParameter("TEXTURES_2D_ARRAY", new TextureState(this.gl, TextureUnitState.TEXTURE_2D_ARRAY, unclonables)));    
        this.targets.set(TextureUnitState.TEXTURE_3D, new NamedTextureStateParameter("TEXTURE_3D", new TextureState(this.gl, TextureUnitState.TEXTURE_3D, unclonables)));
            
    }

    /**
     * Creates a deep copy of the class
     * @returns {TextureUnitState} Deep copy
     */
    clone() {
        let ret = new TextureUnitState(this.gl, this.textureUnit, this.unclonables);
        ret.targets.forEach((parameter, key) => {
            const thisParameter = this.targets.get(key);
            if (thisParameter) { 
                parameter.value = thisParameter.value.clone();
            }
        });
        return ret;
    }

    /**
     * 
     * @returns {JSONTextureUnitState}
     */
    toJSON() {
        return {
            textureUnit: this.textureUnit,
            targets: Object.fromEntries(Array.from(this.targets.entries()).map(([key, value]) => {
                return [key, value.toJSON()];
            }))
        };
    }

    /**
     * 
     * @param {WebGL} gl
     * @param {Map<number, HandleObj>} unclonables
     * @param {JSONTextureUnitState} json
     * @returns {TextureUnitState} 
     */
    static fromJSON(gl, unclonables, json) {
        let ret = new TextureUnitState(gl, json.textureUnit, unclonables);
        for (let key of ret.targets.keys()) {
            ret.targets.set(key, NamedTextureStateParameter.fromJSON(gl, unclonables, Reflect.get(json.targets, key)));
        }
        return ret;
    }

    /**
     * Copies the current state from the gl context
     * @param {WebGL} gl - The context to copy from
     * @param {GLenum} activeTexture - The current active texture on the gl context
     * @param {Map<number, HandleObj>} unclonables
     * @returns A new TextureUnitState instance corresponding to the given gl context
     */
    static createFromGLContext(gl, activeTexture, unclonables) {
        let ret = new TextureUnitState(gl, activeTexture, unclonables);
        ret.targets.forEach((target, key) => target.value = TextureState.createFromGLContext(gl, key, unclonables));
        return ret;
    }

    /**
     * 
     * @param {Command} command 
     */
    processOneCommand(command) {
        if (command.name === "bindTexture") {
            let target = this.targets.get(command.args[0])
            if (target !== undefined) {
                target.value.processOneCommand(command);
            }
        }
    }

    activate() {
        const actTex = this.gl.getParameter(this.gl.ACTIVE_TEXTURE);
        if (actTex !== this.textureUnit) {
            this.gl.activeTexture(this.textureUnit);
        }
        return actTex;
    }

    /**
     * 
     * @param {GLenum} actTex 
     */
    deactivate(actTex) {
        if (actTex !== this.textureUnit) {
            this.gl.activeTexture(actTex);
        }
    }

    /**
     * Force set all state variables, usefull if you don't know the previous state
     */
    forceApply() {
        const actTex = this.activate();
        this.targets.forEach((target, key) => {
            target.value.forceApply()
        });
        this.deactivate(actTex);
    }

    /**
     * Sets the state by setting only the changed state variables
     * @param {TextureUnitState} other - The currently known state of the gl context
     * @returns Did the active texture change on the gl context as a result
     */
    apply(other) {
        let changes = false;
        for (let key of this.targets.keys()) {
            if (other.targets.get(key) !== this.targets.get(key)) {
                changes = true;
                break;
            }
        }
        if (changes) {
            const actTex = this.activate();
            this.targets.forEach((target, key) => {
                const otherTarget = other.targets.get(key);
                if (otherTarget) {
                    target.value.apply(otherTarget.value);
                }
            });
            this.deactivate(actTex);
        }
    }
}

class ShaderPrecisionFormat {
    /**
     * 
     * @param {number} rangeMin 
     * @param {number} rangeMax 
     * @param {number} precision 
     */
    constructor(rangeMin, rangeMax, precision) {
        /**
         * @type {number}
         */
        this.rangeMin = rangeMin;

        /**
         * @type {number}
         */
        this.rangeMax = rangeMax;

        /**
         * @type {number}
         */
        this.precision = precision;
    }
}

class DeviceDescription {
    // WebGL 1.0
    static FRAGMENT_SHADER = 0x8B30;
    static HIGH_FLOAT = 0x8DF2;
    static HIGH_INT = 0x8DF5;
    static LOW_FLOAT = 0x8DF0;
    static LOW_INT = 0x8DF3;
    static MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
    static MAX_CUBE_MAP_TEXTURE_SIZE = 0x851C;
    static MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
    static MAX_TEXTURE_IMAGE_UNITS = 0x8872;
    static MAX_TEXTURE_SIZE = 0xD33;
    static MAX_VARYING_VECTORS = 0x8DFC;
    static MAX_VERTEX_ATTRIBS = 0x8869;
    static MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8B4C;
    static MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
    static MEDIUM_FLOAT = 0x8DF1;
    static MEDIUM_INT = 0x8DF4;
    static VERSION = 0x1F02;
    static VERTEX_SHADER = 0x8B31;
    // WebGL 2.0
    static MAX_SAMPLES = 0x8D57;
    // EXT_color_buffer_half_float
    static FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT = 0x8211;
    static RGB16F_EXT = 0x881B;
    static RGBA16F_EXT = 0x881A;
    static UNSIGNED_NORMALIZED_EXT = 0x8C17;
    // EXT_texture_filter_anisotropic
    static MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;
    static TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;
    
    /**
     * 
     * @param {WebGL} gl 
     */
    constructor(gl) {
        /**
         * @type {Map<GLenum, Map<GLenum, ShaderPrecisionFormat>>} 
         */
        this.shaderPrecisionFormats = new Map();
        const shaderTypes = [DeviceDescription.VERTEX_SHADER, DeviceDescription.FRAGMENT_SHADER];
        const dataTypes = [DeviceDescription.LOW_FLOAT, DeviceDescription.MEDIUM_FLOAT, DeviceDescription.HIGH_FLOAT, DeviceDescription.LOW_INT, DeviceDescription.MEDIUM_INT, DeviceDescription.HIGH_INT];
        for (const shaderType of shaderTypes) {
            /**
             * @type {Map<GLenum, ShaderPrecisionFormat>}
             */
            let shaderTypeMap = new Map();
            this.shaderPrecisionFormats.set(shaderType, shaderTypeMap);
            for (const dataType of dataTypes) {
                const entry = gl.getShaderPrecisionFormat(shaderType, dataType);
                if (entry !== null) {
                    shaderTypeMap.set(dataType, new ShaderPrecisionFormat(entry.rangeMin, entry.rangeMax, entry.precision));
                }
            }
        }
        this.parameters = new Map();
        this.parameters.set(DeviceDescription.MAX_TEXTURE_IMAGE_UNITS, new NamedNumberParameter("MAX_TEXTURE_IMAGE_UNITS", gl.getParameter(DeviceDescription.MAX_TEXTURE_IMAGE_UNITS)));
        this.parameters.set(DeviceDescription.MAX_VERTEX_TEXTURE_IMAGE_UNITS, new NamedNumberParameter("MAX_VERTEX_TEXTURE_IMAGE_UNITS", gl.getParameter(DeviceDescription.MAX_VERTEX_TEXTURE_IMAGE_UNITS)));
        this.parameters.set(DeviceDescription.MAX_TEXTURE_SIZE, new NamedNumberParameter("MAX_TEXTURE_SIZE", gl.getParameter(DeviceDescription.MAX_TEXTURE_SIZE)));
        this.parameters.set(DeviceDescription.MAX_CUBE_MAP_TEXTURE_SIZE, new NamedNumberParameter("MAX_CUBE_MAP_TEXTURE_SIZE", gl.getParameter(DeviceDescription.MAX_CUBE_MAP_TEXTURE_SIZE)));
        this.parameters.set(DeviceDescription.MAX_VERTEX_ATTRIBS, new NamedNumberParameter("MAX_VERTEX_ATTRIBS", gl.getParameter(DeviceDescription.MAX_VERTEX_ATTRIBS)));
        this.parameters.set(DeviceDescription.MAX_VERTEX_UNIFORM_VECTORS, new NamedNumberParameter("MAX_VERTEX_UNIFORM_VECTORS", gl.getParameter(DeviceDescription.MAX_VERTEX_UNIFORM_VECTORS)));
        this.parameters.set(DeviceDescription.MAX_VARYING_VECTORS, new NamedNumberParameter("MAX_VARYING_VECTORS", gl.getParameter(DeviceDescription.MAX_VARYING_VECTORS)));
        this.parameters.set(DeviceDescription.MAX_FRAGMENT_UNIFORM_VECTORS, new NamedNumberParameter("MAX_FRAGMENT_UNIFORM_VECTORS", gl.getParameter(DeviceDescription.MAX_FRAGMENT_UNIFORM_VECTORS)));
        this.parameters.set(DeviceDescription.MAX_COMBINED_TEXTURE_IMAGE_UNITS, new NamedNumberParameter("MAX_COMBINED_TEXTURE_IMAGE_UNITS", gl.getParameter(DeviceDescription.MAX_COMBINED_TEXTURE_IMAGE_UNITS)));
        this.parameters.set(DeviceDescription.VERSION, new NamedStringParameter("VERSION", gl.getParameter(DeviceDescription.VERSION)));
        let maxSamples = 0;
        if (gl instanceof WebGL2RenderingContext) {
            maxSamples = gl.getParameter(DeviceDescription.MAX_SAMPLES);
        }
        this.parameters.set(DeviceDescription.MAX_SAMPLES, new NamedNumberParameter("MAX_SAMPLES", maxSamples));

        let maxTextureMaxAniso = 0;
        /**
         * @type {string[] | null}
         */
        const supportedExtensions = gl.getSupportedExtensions();
        
        /**
         * @type {string[]}
         */
        this.supportedExtensions = (supportedExtensions === null) ? [] : supportedExtensions;
        // enable all known extensions and send device bound values (the state object will handle extension state variables)
        if ("EXT_texture_filter_anisotropic" in this.supportedExtensions) {
            const ext = gl.getExtension("EXT_texture_filter_anisotropic");
            if (ext !== null) {
                maxTextureMaxAniso = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            }
        }
        this.parameters.set(DeviceDescription.MAX_TEXTURE_MAX_ANISOTROPY_EXT, new NamedNumberParameter("MAX_TEXTURE_MAX_ANISOTROPY_EXT", maxTextureMaxAniso));
    }

    /**
     * @returns {JSONDeviceDescription}
     */
    toJSON() {
        /**
         * @type {JSONDeviceDescription} 
         */
        let obj = {
            shaderPrecisionFormats: {},
            parameters: Object.fromEntries(this.parameters),
            supportedExtensions: this.supportedExtensions
        }
        const vertexFormats = this.shaderPrecisionFormats.get(DeviceDescription.VERTEX_SHADER);
        if (vertexFormats) {
            Reflect.set(obj.shaderPrecisionFormats, DeviceDescription.VERTEX_SHADER, Object.fromEntries(vertexFormats));
        }
        const fragmentFormats = this.shaderPrecisionFormats.get(DeviceDescription.FRAGMENT_SHADER);
        if (fragmentFormats) {
            Reflect.set(obj.shaderPrecisionFormats, DeviceDescription.FRAGMENT_SHADER, Object.fromEntries(fragmentFormats));
        }
        return obj;
    }

    /**
     * 
     * @param {WebGL} gl
     * @param {JSONDeviceDescription} json
     * @returns {DeviceDescription} 
     */
    static fromJSON(gl, json) {
        let ret = new DeviceDescription(gl);
        const vertexFormats = ret.shaderPrecisionFormats.get(DeviceDescription.VERTEX_SHADER);
        if (vertexFormats) {
            for (let key of vertexFormats.keys()) {
                vertexFormats.set(key, Reflect.get(Reflect.get(json.shaderPrecisionFormats, DeviceDescription.VERTEX_SHADER), key));
            }
        }
        const fragmentFormats = ret.shaderPrecisionFormats.get(DeviceDescription.FRAGMENT_SHADER);
        if (fragmentFormats) {
            for (let key of fragmentFormats.keys()) {
                fragmentFormats.set(key, Reflect.get(Reflect.get(json.shaderPrecisionFormats, DeviceDescription.FRAGMENT_SHADER), key));
            }
        }
        for (let key of ret.parameters.keys()) {
            if (key !== gl.VERSION) {
                ret.parameters.set(key, NamedNumberParameter.fromJSON(Reflect.get(json.parameters, key)));
            } else {
                ret.parameters.set(key, NamedStringParameter.fromJSON(Reflect.get(json.parameters, key)));
            }
        }
        return ret;
    }
}

(function(exports) {
    /**
     * Manages the state of the gl context
     */
    class GLState {
        /**
         * 
         * @param {WebGL} gl 
         * @param {Map<number, HandleObj>} unclonables 
         */
        constructor(gl, unclonables) {
            /**
             * @type {WebGL}
             */
            this.gl = gl;

            /**
             * @type {Map<number, HandleObj>}
             */
            this.unclonables = unclonables;

            /**
             * @type {WebGLProgram | null}
             */
            this.currentProgram = null;

            /**
             * @type {GLenum}
             */
            this.activeTexture = this.gl.TEXTURE0;

            /**
             * @type {Map<GLenum, NamedNumberParameter | NamedHandleParameter | NamedBooleanParameter | NamedFloat32ArrayParameter | NamedInt32ArrayParameter>}
             */
            this.parameters = new Map();
            this.parameters.set(this.gl.ARRAY_BUFFER_BINDING, new NamedHandleParameter("ARRAY_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
            this.parameters.set(this.gl.BLEND, new NamedBooleanParameter("BLEND", false));
            this.parameters.set(this.gl.COLOR_CLEAR_VALUE, new NamedFloat32ArrayParameter("COLOR_CLEAR_VALUE", new Float32Array([0, 0, 0, 0]))); 
            this.parameters.set(this.gl.CULL_FACE, new NamedBooleanParameter("CULL_FACE", false));
            this.parameters.set(this.gl.CULL_FACE_MODE, new NamedNumberParameter("CULL_FACE_MODE", this.gl.BACK));
            this.parameters.set(this.gl.DEPTH_CLEAR_VALUE, new NamedNumberParameter("DEPTH_CLEAR_VALUE", 1));
            this.parameters.set(this.gl.DEPTH_FUNC, new NamedNumberParameter("DEPTH_FUNC", this.gl.LESS));
            this.parameters.set(this.gl.DEPTH_TEST, new NamedBooleanParameter("DEPTH_TEST", false));
            this.parameters.set(this.gl.DITHER, new NamedBooleanParameter("DITHER", false));
            this.parameters.set(this.gl.ELEMENT_ARRAY_BUFFER_BINDING, new NamedHandleParameter("ELEMENT_ARRAY_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
            this.parameters.set(this.gl.FRONT_FACE, new NamedNumberParameter("FRONT_FACE", this.gl.CCW));
            this.parameters.set(this.gl.POLYGON_OFFSET_FILL, new NamedBooleanParameter("POLYGON_OFFSET_FILL", false));
            this.parameters.set(this.gl.SAMPLE_ALPHA_TO_COVERAGE, new NamedBooleanParameter("SAMPLE_ALPHA_TO_COVERAGE", false));
            this.parameters.set(this.gl.SAMPLE_COVERAGE, new NamedBooleanParameter("SAMPLE_COVERAGE", false));
            this.parameters.set(this.gl.SCISSOR_BOX, new NamedInt32ArrayParameter("SCISSOR_BOX", new Int32Array([0, 0, 0, 0])));
            this.parameters.set(this.gl.SCISSOR_TEST, new NamedBooleanParameter("SCISSOR_TEST", false));
            this.parameters.set(this.gl.STENCIL_CLEAR_VALUE, new NamedNumberParameter("STENCIL_CLEAR_VALUE", 0));
            this.parameters.set(this.gl.STENCIL_TEST, new NamedBooleanParameter("STENCIL_TEST", false));
            this.parameters.set(this.gl.VIEWPORT, new NamedInt32ArrayParameter("VIEWPORT", new Int32Array([0, 0, 0, 0]))); 
            if (this.gl instanceof WebGL2RenderingContext) {
                this.parameters.set(this.gl.COPY_READ_BUFFER_BINDING, new NamedHandleParameter("COPY_READ_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
                this.parameters.set(this.gl.COPY_WRITE_BUFFER_BINDING, new NamedHandleParameter("COPY_WRITE_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
                this.parameters.set(this.gl.PIXEL_PACK_BUFFER_BINDING, new NamedHandleParameter("PIXEL_PACK_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
                this.parameters.set(this.gl.PIXEL_UNPACK_BUFFER_BINDING, new NamedHandleParameter("PIXEL_UNPACK_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
                this.parameters.set(this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING, new NamedHandleParameter("TRANSFORM_FEEDBACK_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables)));
                this.parameters.set(this.gl.UNIFORM_BUFFER_BINDING, new NamedHandleParameter("UNIFORM_BUFFER_BINDING", GLState.getBufferHandle(null, unclonables))); 
                this.parameters.set(this.gl.VERTEX_ARRAY_BINDING, new NamedHandleParameter("VERTEX_ARRAY_BINDING", GLState.getBufferHandle(null, unclonables))); 
            }

            /**
             * @type {Map<GLenum, NamedTextureUnitStateParameter>}
             */
            this.textureBinds = new Map();
            for (let i = 0 ; i < 32; ++i) {
                this.textureBinds.set(this.gl.TEXTURE0 + i, new NamedTextureUnitStateParameter("TEXTURE" + i, new TextureUnitState(this.gl, this.gl.TEXTURE0 + i, unclonables)));
            }

            /**
             * @type {WebGLContextAttributes | null}
             */
            this.contextAttributes = null;
        }

        /**
         * Makes a deep copy of this class
         * @returns A deep copy of this class
         */
        clone() {
            let ret = new GLState(this.gl, this.unclonables);
            ret.currentProgram = this.currentProgram;
            ret.activeTexture = this.activeTexture;
            this.textureBinds.forEach((textureBind, key) => ret.textureBinds.set(key, textureBind.clone()));
            this.parameters.forEach((parameter, key) => ret.parameters.set(key, parameter.clone()));
            ret.contextAttributes = this.contextAttributes;
            return ret;
        }

        /**
         * Copies the current state from the gl context
         * @param {WebGL} gl - The gl context to copy from
         * @param {Map<number, HandleObj>} unclonables
         * @returns A new GLState instance corresponding to the given gl context
         */
        static createFromGLContext(gl, unclonables) {
            let ret = new GLState(gl, unclonables);
            ret.currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
            ret.activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
            ret.textureBinds.forEach((textureBind, key) => {
                gl.activeTexture(key);
                textureBind.value = TextureUnitState.createFromGLContext(gl, key, unclonables);
            });
            // restore original active texture
            gl.activeTexture(ret.activeTexture);
            ret.contextAttributes = gl.getContextAttributes();
            let needHandle = [
                gl.ARRAY_BUFFER_BINDING, 
                gl.ELEMENT_ARRAY_BUFFER_BINDING
            ];
            if (gl instanceof WebGL2RenderingContext) {
                needHandle.push(gl.COPY_READ_BUFFER_BINDING);
                needHandle.push(gl.COPY_WRITE_BUFFER_BINDING);
                needHandle.push(gl.TRANSFORM_FEEDBACK_BUFFER_BINDING);
                needHandle.push(gl.UNIFORM_BUFFER_BINDING);
                needHandle.push(gl.PIXEL_PACK_BUFFER_BINDING);
                needHandle.push(gl.PIXEL_UNPACK_BUFFER_BINDING);
                needHandle.push(gl.VERTEX_ARRAY_BINDING);
            }
            needHandle.forEach(key => {
                let parameter = ret.parameters.get(key);
                if (parameter !== undefined) {
                    parameter.value = GLState.getBufferHandle(gl.getParameter(key), unclonables)
                }
            });
            const nativeValues = [
                gl.BLEND,
                gl.COLOR_CLEAR_VALUE,
                gl.CULL_FACE,
                gl.CULL_FACE_MODE,
                gl.DEPTH_CLEAR_VALUE,
                gl.DEPTH_FUNC,
                gl.DEPTH_TEST,
                gl.DITHER,
                gl.FRONT_FACE,
                gl.POLYGON_OFFSET_FILL,
                gl.SAMPLE_ALPHA_TO_COVERAGE,
                gl.SAMPLE_COVERAGE,
                gl.SCISSOR_BOX,
                gl.SCISSOR_TEST,
                gl.STENCIL_CLEAR_VALUE,
                gl.STENCIL_TEST,
                gl.VIEWPORT
            ];
            nativeValues.forEach(key => {
                let parameter = ret.parameters.get(key);
                if (parameter !== undefined) {
                    parameter.value = gl.getParameter(key);
                }
            });
            return ret;
        }

        /**
         * @returns {JSONGLState}
         */
        toJSON() {
            return {
                unclonables: Object.fromEntries(this.unclonables.entries()),
                currentProgram: this.currentProgram,
                activeTexture: this.activeTexture,
                textureBinds: Object.fromEntries(this.textureBinds.entries()),
                parameters: Object.fromEntries(this.parameters.entries()),
                contextAttributes: this.contextAttributes
            }
        }

        /**
         * @param {WebGLBuffer | null} buffer
         * @param {Map<number, HandleObj>} unclonables 
         */
        static getBufferHandle(buffer, unclonables) {
            let ret_handle = 0;
            for (const [handle, obj] of unclonables) {
                if (buffer === obj) {
                    ret_handle = handle;
                    break;
                }
            }
            if (ret_handle === 0) {
                // create a new internal handle (always negative)
                let minValue = Math.min(...unclonables.keys());
                ret_handle = ((!isFinite(minValue)) || (minValue > 0)) ? -1 : minValue - 1;
                unclonables.set(ret_handle, buffer);
            }
            return new Handle(ret_handle);
        }

        /**
         * Updates this state to reflect the state of the gl context before/after executing this command
         * @param {Command} command The command to check
         */
        preProcessOneCommand(command) {
            if (command.name === "useProgram") {
                this.currentProgram = command.args[0];   
            } else if (command.name === "activeTexture") {
                this.activetexture = command.args[0];
            } else if (command.name === "bindBuffer") {
                let bufferTargetToTargetBinding = new Map()
                bufferTargetToTargetBinding.set(this.gl.ARRAY_BUFFER, this.gl.ARRAY_BUFFER_BINDING);
                bufferTargetToTargetBinding.set(this.gl.ELEMENT_ARRAY_BUFFER, this.gl.ELEMENT_ARRAY_BUFFER_BINDING);
                if (this.gl instanceof WebGL2RenderingContext) {
                    bufferTargetToTargetBinding.set(this.gl.COPY_READ_BUFFER, this.gl.COPY_READ_BUFFER_BINDING);
                    bufferTargetToTargetBinding.set(this.gl.COPY_WRITE_BUFFER, this.gl.COPY_WRITE_BUFFER_BINDING);
                    bufferTargetToTargetBinding.set(this.gl.TRANSFORM_FEEDBACK_BUFFER, this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING);
                    bufferTargetToTargetBinding.set(this.gl.UNIFORM_BUFFER, this.gl.UNIFORM_BUFFER_BINDING);
                    bufferTargetToTargetBinding.set(this.gl.PIXEL_PACK_BUFFER, this.gl.PIXEL_PACK_BUFFER_BINDING);
                    bufferTargetToTargetBinding.set(this.gl.PIXEL_UNPACK_BUFFER, this.gl.PIXEL_UNPACK_BUFFER_BINDING);
                }
                let bufferBinding = bufferTargetToTargetBinding.get(command.args[0]);
                if (bufferBinding !== undefined) {
                    let parameter = this.parameters.get(bufferBinding);
                    if (parameter !== undefined) {
                        parameter.value = command.args[1];
                    }
                }
            } else if (command.name === "bindTexture") {
                let textureBinding = this.textureBinds.get(this.activeTexture);
                if (textureBinding !== undefined) {
                    textureBinding.value.processOneCommand(command);
                }
            } else if (command.name === "bindVertexArray") {
                if (this.gl instanceof WebGL2RenderingContext) {
                    let parameter = this.parameters.get(this.gl.VERTEX_ARRAY_BINDING);
                    if (parameter !== undefined) {
                        parameter.value = command.args[0];
                    }
                }
            } else if(command.name === "clearColor") {
                let parameter = this.parameters.get(this.gl.COLOR_CLEAR_VALUE);
                if (parameter !== undefined) {
                    parameter.value = new Float32Array([command.args[0], command.args[1], command.args[2], command.args[3]]);
                }
            } else if(command.name === "clearDepth") {
                let parameter = this.parameters.get(this.gl.DEPTH_CLEAR_VALUE);
                if (parameter !== undefined) {
                    parameter.value = command.args[0];
                }
            } else if(command.name === "clearStencil") {
                let parameter = this.parameters.get(this.gl.STENCIL_CLEAR_VALUE);
                if (parameter !== undefined) {
                    parameter.value = command.args[0];
                }
            } else if(command.name === "cullFace") {
                let parameter = this.parameters.get(this.gl.CULL_FACE_MODE);
                if (parameter !== undefined) {
                    parameter.value = command.args[0];
                }
            } else if(command.name === "depthFunc") {
                let parameter = this.parameters.get(this.gl.DEPTH_FUNC);
                if (parameter !== undefined) {
                    parameter.value = command.args[0];
                }
            }else if ((command.name === "enable") || (command.name === "disable")) {
                let parameter = this.parameters.get(command.args[0]);
                if (parameter !== undefined) {
                    parameter.value = command.name === "enable";
                }
            } else if(command.name === "frontFace") {
                let parameter = this.parameters.get(this.gl.FRONT_FACE);
                if (parameter !== undefined) {
                    parameter.value = command.args[0];
                }
            } else if(command.name === "scissor") {
                let parameter = this.parameters.get(this.gl.SCISSOR_BOX);
                if (parameter !== undefined) {
                    parameter.value = new Int32Array([command.args[0], command.args[1], command.args[2], command.args[3]]);
                }
            } else if(command.name === "viewport") {
                let parameter = this.parameters.get(this.gl.VIEWPORT);
                if (parameter !== undefined) {
                    parameter.value = new Int32Array([command.args[0], command.args[1], command.args[2], command.args[3]]);
                }
            } 
        }

        /**
         * Updates this state to reflect the state of the gl context after executing this command
         * @param {Command} command The command to check
         */
        postProcessOneCommand(command) {
            if (command.name === "deleteShader") {
                this.unclonables.delete(command.args[0].handle);
            }
        }

        /**
         * Creates a state of a gl context after executing a command buffer using a known begin state
         * @param {GLState} beginState - The state before execution
         * @param {CommandBuffer} commandBuffer - The command buffer to process
         * @returns A new GLState instance corresponding to the end state after executing the given command buffer and the given begin state
         */
        static createEndStateFromCommandBuffer(beginState, commandBuffer) {
            let ret = beginState.clone();
            for (let command of commandBuffer.commands) {
                ret.preProcessOneCommand(command);
                ret.postProcessOneCommand(command);
            }
            return ret;
        }

        /**
         * Force set all state parameters, usefull if you don't know the previous state
         */
        applyAll() {
            this.gl.useProgram(this.currentProgram);
            let bufferTargets = [
                {buffer: this.gl.ARRAY_BUFFER, binding: this.gl.ARRAY_BUFFER_BINDING},
                {buffer: this.gl.ELEMENT_ARRAY_BUFFER, binding: this.gl.ELEMENT_ARRAY_BUFFER_BINDING},
            ];
            if (this.gl instanceof WebGL2RenderingContext) {
                bufferTargets.push({buffer: this.gl.COPY_READ_BUFFER, binding: this.gl.COPY_READ_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.COPY_WRITE_BUFFER, binding: this.gl.COPY_WRITE_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.TRANSFORM_FEEDBACK_BUFFER, binding: this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.UNIFORM_BUFFER, binding: this.gl.UNIFORM_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.PIXEL_PACK_BUFFER, binding: this.gl.PIXEL_PACK_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.PIXEL_UNPACK_BUFFER, binding: this.gl.PIXEL_UNPACK_BUFFER_BINDING});
            }
            bufferTargets.forEach(target => {
                let parameter = this.parameters.get(target.binding);
                if ((parameter !== undefined) && (parameter.value instanceof Handle)) {
                    let buffer =  this.unclonables.get(parameter.value.handle);
                    if (buffer instanceof WebGLBuffer) {
                        this.gl.bindBuffer(target.buffer, buffer);
                    }
                }
            });
            this.textureBinds.forEach((textureBind, key) => textureBind.value.forceApply());
            this.gl.activeTexture(this.activeTexture);
            const toggleParameters = [this.gl.BLEND, this.gl.CULL_FACE, this.gl.DEPTH_TEST, this.gl.DITHER, this.gl.POLYGON_OFFSET_FILL, this.gl.SAMPLE_ALPHA_TO_COVERAGE, this.gl.SAMPLE_COVERAGE, this.gl.SCISSOR_TEST, this.gl.STENCIL_TEST];
            toggleParameters.forEach(key => {
                let parameter = this.parameters.get(key);
                if (parameter !== undefined) {
                    this.gl[parameter.value ? "enable" : "disable"](key);
                }
            });
            const clearColor = this.parameters.get(this.gl.COLOR_CLEAR_VALUE);
            if ((clearColor !== undefined) && (clearColor.value instanceof Float32Array)) {
                this.gl.clearColor(clearColor.value[0], clearColor.value[1], clearColor.value[2], clearColor.value[3]);
            }
            const clearDepthValue = this.parameters.get(this.gl.DEPTH_CLEAR_VALUE);
            if ((clearDepthValue !== undefined) && (typeof clearDepthValue.value === "number")) {
                this.gl.clearDepth(clearDepthValue.value);
            }
            const stencilClearValue = this.parameters.get(this.gl.STENCIL_CLEAR_VALUE);
            if ((stencilClearValue !== undefined) && (typeof stencilClearValue.value === "number")) {
                this.gl.clearStencil(stencilClearValue.value);
            }
            const cullFaceMode = this.parameters.get(this.gl.CULL_FACE_MODE);
            if ((cullFaceMode !== undefined) && (typeof cullFaceMode.value === "number")) {
                this.gl.cullFace(cullFaceMode.value);
            }
            const depthFunc = this.parameters.get(this.gl.DEPTH_FUNC);
            if ((depthFunc !== undefined) && (typeof depthFunc.value === "number")) {
                this.gl.depthFunc(depthFunc.value);
            }
            const frontFace = this.parameters.get(this.gl.FRONT_FACE);
            if ((frontFace !== undefined) && (typeof frontFace.value === "number")) {
                this.gl.frontFace(frontFace.value);
            }
            const scissorBox = this.parameters.get(this.gl.SCISSOR_BOX);
            if ((scissorBox !== undefined) && (scissorBox.value instanceof Int32Array)) {
                this.gl.scissor(scissorBox.value[0], scissorBox.value[1], scissorBox.value[2], scissorBox.value[3]);
            }
            const viewport = this.parameters.get(this.gl.VIEWPORT);
            if ((viewport !== undefined) && (viewport.value instanceof Int32Array)) {
                this.gl.viewport(viewport.value[0], viewport.value[1], viewport.value[2], viewport.value[3]);
            }
            // never change the contextattributes
        }

        /**
         * Sets the state by setting only the changed state variables
         * @param {GLState} curState - the current state of the gl context
         */
        applyDiff(curState) {
            if (curState.currentProgram !== this.currentProgram) {
                this.gl.useProgram(this.currentProgram);
            }
            let bufferTargets = [
                {buffer: this.gl.ARRAY_BUFFER, binding: this.gl.ARRAY_BUFFER_BINDING},
                {buffer: this.gl.ELEMENT_ARRAY_BUFFER, binding: this.gl.ELEMENT_ARRAY_BUFFER_BINDING},
            ];
            if (this.gl instanceof WebGL2RenderingContext) {
                bufferTargets.push({buffer: this.gl.COPY_READ_BUFFER, binding: this.gl.COPY_READ_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.COPY_WRITE_BUFFER, binding: this.gl.COPY_WRITE_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.TRANSFORM_FEEDBACK_BUFFER, binding: this.gl.TRANSFORM_FEEDBACK_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.UNIFORM_BUFFER, binding: this.gl.UNIFORM_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.PIXEL_PACK_BUFFER, binding: this.gl.PIXEL_PACK_BUFFER_BINDING});
                bufferTargets.push({buffer: this.gl.PIXEL_UNPACK_BUFFER, binding: this.gl.PIXEL_UNPACK_BUFFER_BINDING});
            }
            for (const target of bufferTargets) {
                const bufferBinding = this.parameters.get(target.binding);
                const curBufferBinding = curState.parameters.get(target.binding);
                if ((curBufferBinding !== undefined) && (bufferBinding !== undefined) && (curBufferBinding.value !== bufferBinding.value) && (bufferBinding.value instanceof Handle)) {
                    const buffer = this.unclonables.get(bufferBinding.value.handle);
                    if (buffer !== undefined) {
                        this.gl.bindBuffer(target.buffer, buffer);
                    }
                }
            }
            this.textureBinds.forEach((textureBind, key) => {
                const curTextureBind = curState.textureBinds.get(key);
                if ((curTextureBind !== undefined)) {
                    textureBind.value.apply(curTextureBind.value);
                }
            });
            if (curState.activeTexture !== this.activeTexture) {
                this.gl.activeTexture(this.activeTexture);
            }
            const toggleParameters = [this.gl.BLEND, this.gl.CULL_FACE, this.gl.DEPTH_TEST, this.gl.DITHER, this.gl.POLYGON_OFFSET_FILL, this.gl.SAMPLE_ALPHA_TO_COVERAGE, this.gl.SAMPLE_COVERAGE, this.gl.SCISSOR_TEST, this.gl.STENCIL_TEST];
            toggleParameters.forEach(key => {
                const curToggle = curState.parameters.get(key);
                const toggle = this.parameters.get(key);
                if ((curToggle !== undefined) && (toggle !== undefined) && (curToggle.value !== toggle.value)) {
                    if (toggle.value) {
                        this.gl.enable(key);
                    } else {
                        this.gl.disable(key);
                    }
                }
            });
            const clearColor = this.parameters.get(this.gl.COLOR_CLEAR_VALUE);
            const curClearColor = curState.parameters.get(this.gl.COLOR_CLEAR_VALUE);
            if ((clearColor !== undefined) && (curClearColor !== undefined) && (curClearColor.value !== clearColor.value) && (clearColor.value instanceof Float32Array)) {
                this.gl.clearColor(clearColor.value[0], clearColor.value[1], clearColor.value[2], clearColor.value[3]);
            }
            const clearDepth = this.parameters.get(this.gl.DEPTH_CLEAR_VALUE);
            const curClearDepth = curState.parameters.get(this.gl.DEPTH_CLEAR_VALUE);
            if ((clearDepth !== undefined) && (curClearDepth !== undefined) && (curClearDepth.value !== clearDepth.value) && (typeof clearDepth.value === "number")) {
                this.gl.clearDepth(clearDepth.value);
            }
            const clearStencil = this.parameters.get(this.gl.STENCIL_CLEAR_VALUE);
            const curClearStencil = curState.parameters.get(this.gl.STENCIL_CLEAR_VALUE);
            if ((clearStencil !== undefined) && (curClearStencil !== undefined) && (curClearStencil.value !== clearStencil.value) && (typeof clearStencil.value === "number")) {
                this.gl.clearStencil(clearStencil.value);
            }
            const cullFace = this.parameters.get(this.gl.CULL_FACE_MODE);
            const curCullFace = curState.parameters.get(this.gl.CULL_FACE_MODE);
            if ((cullFace !== undefined) && (curCullFace !== undefined) && (curCullFace.value !== cullFace.value) && (typeof cullFace.value === "number")) {
                this.gl.cullFace(cullFace.value);
            }
            const depthFunc = this.parameters.get(this.gl.DEPTH_FUNC);
            const curDepthFunc = curState.parameters.get(this.gl.DEPTH_FUNC);
            if ((depthFunc !== undefined) && (curDepthFunc !== undefined) && (curDepthFunc.value !== depthFunc.value) && (typeof depthFunc.value === "number")) {
                this.gl.depthFunc(depthFunc.value);
            }
            const frontFace = this.parameters.get(this.gl.FRONT_FACE);
            const curFrontFace = curState.parameters.get(this.gl.FRONT_FACE);
            if ((frontFace !== undefined) && (curFrontFace !== undefined) && (curFrontFace.value !== frontFace.value) && (typeof frontFace.value === "number")) {
                this.gl.frontFace(frontFace.value);
            }
            const scissorBox = this.parameters.get(this.gl.SCISSOR_BOX);
            const curScissorBox = curState.parameters.get(this.gl.SCISSOR_BOX);
            if ((scissorBox !== undefined) && (curScissorBox !== undefined) && (curScissorBox.value !== scissorBox.value) && (scissorBox.value instanceof Int32Array)) {
                this.gl.scissor(scissorBox.value[0], scissorBox.value[1], scissorBox.value[2], scissorBox.value[3]);
            }
            const viewport = this.parameters.get(this.gl.VIEWPORT);
            const curViewport = curState.parameters.get(this.gl.VIEWPORT);
            if ((viewport !== undefined) && (curViewport !== undefined) && (curViewport.value !== viewport.value) && (viewport.value instanceof Int32Array)) {
                this.gl.viewport(viewport.value[0], viewport.value[1], viewport.value[2], viewport.value[3]);
            }
            // never change the context attributes
        }
    }

    exports.GLState = GLState
    exports.Handle = Handle
})(realityEditor.gui.glState);
