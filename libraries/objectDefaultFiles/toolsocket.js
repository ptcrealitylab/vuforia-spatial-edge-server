const isBrowser = typeof window !== 'undefined';
const WebSocketWrapper = isBrowser ? WebSocket : require('ws');

const MAX_MESSAGE_SIZE = 300 * 1024 * 1024;
const VALID_FILETYPES = ['css', 'csv', 'dat', 'fbx', 'gif', 'glb', 'htm', 'html', 'jpg', 'jpeg', 'js', 'json', 'map', 'mp4', 'obj', 'otf', 'pdf', 'ply', 'png', 'splat', 'svg', 'ttf', 'wasm', 'webm', 'webp', 'woff', 'xml', 'zip', '3dt'];
/**
 * @typedef {'action' | 'beat' | 'delete' | 'get' | 'io' | 'keys' | 'message' | 'new' | 'patch' | 'ping' | 'post' | 'pub' | 'put' | 'res' | 'sub' | 'unsub'} MethodString
 */
/** @type MethodString[] */
const VALID_METHODS = ['action', 'beat', 'delete', 'get', 'io', 'keys', 'message', 'new', 'patch', 'ping', 'post', 'pub', 'put', 'res', 'sub', 'unsub'];
const REGEXES = {
    n: /^[A-Za-z0-9_]*$/,
    i: /^[A-Za-z0-9_]*$/,
    s: /^[A-Za-z0-9_]*$/,
    r: /^[A-Za-z0-9_/?:&+.%=-]*$/,
    query: /^[A-Za-z0-9~!@$%^&*()\-_=+{}|;:,./?]*$/,
    route: /^[A-Za-z0-9/~!@$%^&*()\-_=+|;:,.]*$/,
    server: /^[A-Za-z0-9~!@$%^&*()\-_=+|;:,.]*$/
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * Converts an unsigned number to an array of four unsigned bytes, with the most significant byte first
 * @param {number} num - An integer in range [0, 2^32-1]
 * @returns {Uint8Array} - An array of four bytes, with the most significant byte first
 */
function intToByte(num) {
    return new Uint8Array([
        (num >> 24) & 255,
        (num >> 16) & 255,
        (num >> 8) & 255,
        num & 255
    ]);
}

/**
 * Converts an array of four unsigned bytes into an unsigned number
 * @param {Uint8Array} byteArray - An array of four bytes, each of which is an integer in range [0, 255]
 * @returns {number} - An unsigned integer corresponding to the input byte array
 */
function byteToInt(byteArray) {
    // An older version of this function used bitwise OR (|) to combine these values, but bitwise
    // operators use two's complement to determine sign, causing inputs larger than [127,255,255,255]
    // to return negative outputs. This is also why we cannot bitshift left by 24 on numbers greater
    // than 127 and have to resort to Math.pow.
    return (
        (byteArray[0] * Math.pow(2, 24)) +
        (byteArray[1] << 16) +
        (byteArray[2] << 8) +
        (byteArray[3])
    );
}

/**
 * Generates a unique ID of length `length`
 * @param {number} length - How many characters the generated ID should be
 * @returns {string} - The generated ID
 */
function generateUniqueId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let id = '';
    for (let i = 0; i < length; i++) {
        id += characters[Math.floor(Math.random() * characters.length)];
    }
    return id;
}

/**
 * Returns a new URL with the added parameters based on the input URL
 * @param {URL} url - The URL to add the parameters to
 * @param {URLSearchParams} newParams - The parameters to add
 * @returns {URL} - A new URL with the added parameters
 */
function addSearchParams(url, newParams) {
    const newUrl = new URL(url);
    for (const [key, value] of newParams.entries()) {
        newUrl.searchParams.set(key, value);
    }
    return newUrl;
}

/**
 * An object that validates constraints on an object's properties
 */
class Schema {
    /**
     * Creates a Schema
     * @param {[SchemaValidator]} validators - The validators to use for validation
     */
    constructor(validators) {
        this.validators = validators;
        this.failedValidator = null;
    }

    /**
     * A list of keys that are expected to be found when parsing
     * @returns {[string]}
     */
    get expectedKeys() {
        return this.validators.filter(v => v.expected).map(v => v.key);
    }

    /**
     * Converts the schema into the old schema format for backwards compatibility purposes
     * @returns {object} - The old-format schema
     */
    get oldFormat() {
        const schema = {
            type: 'object',
            items: {
                properties: {},
                required: this.validators.filter(v => v.required).map(v => v.key),
                expected: this.validators.filter(v => v.expected).map(v => v.key)
            }
        };

        /**
         * Gets the old-format type for a validator
         * @param {SchemaValidator} validator - The SchemaValidator
         * @returns {(string|*)[]|string} - The type output
         */
        function getEntryType(validator) {
            switch (validator.constructor) {
            case StringValidator:
                return 'string';
            case NumberValidator:
                return 'number';
            case BooleanValidator:
                return 'boolean';
            case NullValidator:
                return 'null';
            case UndefinedValidator:
                return 'undefined';
            case ArrayValidator:
                return 'array';
            case ObjectValidator:
                return 'object';
            case GroupValidator:
                return validator.validators.map(v => getEntryType(v));
            }
        }

        /**
         * Gets the old-format constraints for a validator
         * @param {SchemaValidator} validator - The SchemaValidator
         * @returns {object} - The constraints
         */
        function getConstraints(validator) {
            if (validator.constructor === GroupValidator) {
                return validator.validators.reduce((output, v) => {
                    Object.entries(v).forEach(entry => {
                        if (['required', 'expected', 'key'].includes(entry[0])) {
                            return;
                        }
                        if (entry[1] === null) {
                            return;
                        }
                        output[entry[0]] = entry[1];
                    });
                    return output;
                }, {});
            }
            const output = {};
            Object.entries(validator).forEach(entry => {
                if (['required', 'expected'].includes(entry[0])) {
                    return;
                }
                output[entry[0]] = entry[1];
            });
            return output;
        }

        this.validators.forEach(v => {
            schema.items.properties[v.key] = {
                type: getEntryType(v),
                ...getConstraints(v)
            };
        });
        return schema;
    }

    /**
     * Checks if the given object matches the requirements set by this Schema
     * @param {object} object - The object to check
     * @returns {boolean} - Whether the object meets the requirements
     */
    validate(object) {
        for (let validator of this.validators) {
            if (!validator.validate(object)) {
                this.failedValidator = validator;
                return false;
            }
        }
        this.failedValidator = null;
        return true;
    }

    /**
     * Parses a URL and extracts all `expected === true` keys from it.
     * @param {URL} url - The URL to parse
     * @returns {?ParsedUrl} - The extracted data
     */
    parseUrl(url) {
        const protocol = url.protocol.slice(0, -1); // Drop tailing colon
        let port;
        if (url.port !== '') {
            port = parseInt(url.port);
        } else {
            if (['wss', 'https'].includes(protocol)) {
                port = 443;
            } else if (['ws', 'http'].includes(protocol)) {
                port = 80;
            } else {
                throw new Error(`Cannot determine port for protocol ${protocol}`);
            }
        }

        /**
         * @typedef {object} ParsedUrl
         * @property {string} protocol - The protocol scheme
         * @property {string} server - The hostname
         * @property {number} port - The port number
         * @property {string} route - The pathname with expected schema parameters removed
         * @property {string} [type] - The filetype
         * @property {string} query - The query parameters
         */

        const parsedRoute = this.parseRoute(url.pathname, true);
        const parsedUrl = {
            protocol: protocol,
            server: url.hostname,
            port: port,
            ...parsedRoute,
            query: url.searchParams.toString()
        };

        if (this.validate(parsedUrl)) {
            return parsedUrl;
        }
        return null;
    }

    /**
     * Parses a route and extracts all `expected === true` keys from it.
     * @param {string} route - The route to parse
     * @param {?boolean} skipValidation - Whether to skip validation, only used by parseUrl
     * @returns {?ParsedRoute} - The extracted data
     */
    parseRoute(route, skipValidation) {
        /**
         * @typedef {object} ParsedRoute
         * @property {string} route - The pathname with expected schema parameters removed
         * @property {string} [type] - The filetype
         * @property {string} query - The query parameters
         */

        /** @type {ParsedRoute} */
        const parsedRoute = {
            route: '',
            // type: filetype
            query: route.includes('?') ? route.slice(route.indexOf('?') + 1) : ''
        };

        const pathname = route.split('?')[0];
        const pathSegments = pathname.split('/');
        const lastPathSegment = pathSegments.at(-1);
        if (lastPathSegment.split('.').length > 1) {
            parsedRoute.type = lastPathSegment.split('.').at(-1);
        }

        for (let i = 0; i < pathSegments.length; i++) {
            const pathSegment = pathSegments[i];
            if (this.expectedKeys.includes(pathSegment)) {
                if (pathSegments[i + 1]) {
                    parsedRoute[pathSegment] = pathSegments[i + 1];
                }
                i++; // Skip to next pathSegment after key-value pair
                continue;
            }
            if (pathSegment === '') {
                continue;
            }
            parsedRoute.route += '/' + pathSegment;
        }

        if (skipValidation || this.validate(parsedRoute)) {
            return parsedRoute;
        }
        return null;
    }
}

/**
 * An object that validates constraints on one of an object's properties
 */
class SchemaValidator {
    /**
     * Creates a SchemaValidator
     * @param {string} key - The key to validate
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        this.key = key;
        if (options === undefined) {
            options = {};
        }
        this.required = options.required !== undefined ? options.required : false;
        this.expected = options.expected !== undefined ? options.expected : false;
        this.enum = options.enum !== undefined ? options.enum : null;
    }

    /**
     * Checks if the given object matches the requirements set by this SchemaValidator
     * @param {object} object - The object to check
     * @returns {boolean} - Whether the object meets the requirements
     */
    validate(object) {
        if (this.required !== null && this.required) {
            if (!(this.key in object)) {
                return false;
            }
        }
        const value = object[this.key];
        if (this.key in object && this.enum !== null && !this.enum.includes(value)) {
            return false;
        }
        return true;
    }
}

/**
 * A SchemaValidator that validates string types
 */
class StringValidator extends SchemaValidator {
    /**
     * Creates a StringValidator
     * @param {string} key - The key to validate
     * @param {{
     *     minLength?: number,
     *     maxLength?: number,
     *     pattern?: RegExp,
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
        if (options === undefined) {
            options = {};
        }
        this.minLength = options.minLength !== undefined ? options.minLength : null;
        this.maxLength = options.maxLength !== undefined ? options.maxLength : null;
        this.pattern = options.pattern !== undefined ? options.pattern : null;
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        const value = object[this.key];
        if (typeof value !== 'string') {
            return false;
        }
        if (this.minLength !== null && value.length < this.minLength) {
            return false;
        }
        if (this.maxLength !== null && value.length > this.maxLength) {
            return false;
        }
        if (this.pattern !== null && !value.match(this.pattern)) {
            return false;
        }
        return true;
    }
}

/**
 * A SchemaValidator that validates number types
 */
class NumberValidator extends SchemaValidator {
    /**
     * Creates a NumberValidator
     * @param {string} key - The key to validate
     * @param {{
     *     minValue?: number,
     *     maxValue?: number,
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
        if (options === undefined) {
            options = {};
        }
        this.minValue = options.minValue !== undefined ? options.minValue : null;
        this.maxValue = options.maxValue !== undefined ? options.maxValue : null;
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        const value = object[this.key];
        if (typeof value !== 'number') {
            return false;
        }
        if (this.minValue !== null && value < this.minValue) {
            return false;
        }
        if (this.maxValue !== null && value > this.maxValue) {
            return false;
        }
        return true;
    }
}

/**
 * A SchemaValidator that validates boolean types
 */
class BooleanValidator extends SchemaValidator {
    /**
     * Creates a BooleanValidator
     * @param {string} key - The key to validate
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        return typeof object[this.key] === 'boolean';
    }
}

/**
 * A SchemaValidator that validates null types
 */
class NullValidator extends SchemaValidator {
    /**
     * Creates a NullValidator
     * @param {string} key - The key to validate
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        return object[this.key] === null;
    }
}

/**
 * A SchemaValidator that validates undefined types
 */
class UndefinedValidator extends SchemaValidator {
    /**
     * Creates an UndefinedValidator
     * @param {string} key - The key to validate
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        return object[this.key] === undefined;
    }
}

/**
 * A SchemaValidator that validates array types
 */
class ArrayValidator extends SchemaValidator {
    /**
     * Creates an ArrayValidator
     * @param {string} key - The key to validate
     * @param {{
     *     minLength?: number,
     *     maxLength?: number,
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
        if (options === undefined) {
            options = {};
        }
        this.minLength = options.minLength !== undefined ? options.minLength : null;
        this.maxLength = options.maxLength !== undefined ? options.maxLength : null;
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        const value = object[this.key];
        if (!Array.isArray(value)) {
            return false;
        }
        if (this.minLength !== null && value.length < this.minLength) {
            return false;
        }
        if (this.maxLength !== null && value.length > this.maxLength) {
            return false;
        }
        return true;
    }
}

/**
 * A SchemaValidator that validates object types
 */
class ObjectValidator extends SchemaValidator {
    /**
     * Creates an ObjectValidator
     * @param {string} key - The key to validate
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, options) {
        super(key, options);
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        const value = object[this.key];
        return typeof value === 'object' && !Array.isArray(value);
    }
}

/**
 * A SchemaValidator that uses multiple sub-validators to support multiple type options for a given
 * key.
 */
class GroupValidator extends SchemaValidator {
    /**
     * Creates an ObjectValidator
     * @param {string} key - The key to validate
     * @param {[SchemaValidator]} validators - The validators to validate with
     * @param {{
     *     required?: boolean,
     *     expected?: boolean,
     *     enum?: [object]
     * }} [options] - Options that define how this validates objects
     */
    constructor(key, validators, options) {
        super(key, options);
        if (validators.some(validator => validator.key !== key)) {
            throw new Error(`Cannot create a GroupValidator from validators with different keys.\n${JSON.stringify(validators)}`);
        }
        this.validators = validators;
    }

    validate(object) {
        if (!super.validate(object)) {
            return false;
        }
        if (!(this.key in object)) {
            return true; // If not required, passes trivially when not present
        }
        return this.validators.some(validator => validator.validate(object));
    }
}

const URL_SCHEMA = new Schema([
    new StringValidator('n', {
        minLength: 1,
        maxLength: 25,
        pattern: REGEXES.n,
        required: true,
        expected: true
    }),
    new StringValidator('type', {
        // minLength: 1,
        // maxLength: 5,
        enum: VALID_FILETYPES
    }),
    new StringValidator('protocol', {
        enum: ['spatialtoolbox', 'ws', 'wss', 'http', 'https']
    }),
    new StringValidator('query', {
        minLength: 0,
        maxLength: 2000,
        pattern: REGEXES.query
    }),
    new StringValidator('route', {
        minLength: 0,
        maxLength: 2000,
        pattern: REGEXES.route
    }),
    new StringValidator('server', {
        minLength: 0,
        maxLength: 2000,
        pattern: REGEXES.server
    }),
    new NumberValidator('port', {
        minValue: 0,
        maxValue: 99999
    })
]);

const MESSAGE_BUNDLE_SCHEMA = new Schema([
    // id
    new GroupValidator('i', [
        new StringValidator('i', {
            minLength: 1,
            maxLength: 22,
            pattern: REGEXES.i
        }),
        new NullValidator('i'),
        new UndefinedValidator('i')
    ]),
    // origin
    new StringValidator('o', {
        enum: ['server', 'client', 'web', 'edge', 'proxy'],
        required: true
    }),
    // network
    new StringValidator('n', {
        minLength: 1,
        maxLength: 25,
        pattern: REGEXES.n,
        required: true
    }),
    // method
    new StringValidator('m', {
        enum: VALID_METHODS,
        required: true
    }),
    // route
    new StringValidator('r', {
        minLength: 0,
        maxLength: 2000,
        pattern: REGEXES.r,
        required: true
    }),
    // body
    new GroupValidator('b', [
        new BooleanValidator('b'),
        new ArrayValidator('b', {
            minLength: 0,
            maxLength: MAX_MESSAGE_SIZE
        }),
        new NumberValidator('b'),
        new StringValidator('b', {
            minLength: 0,
            maxLength: MAX_MESSAGE_SIZE
        }),
        new ObjectValidator('b')
    ], { required: true }),
    // unknown, doesn't seem to be used
    new GroupValidator('s', [
        new StringValidator('s', {
            minLength: 0,
            maxLength: 45,
            pattern: REGEXES.s
        }),
        new NullValidator('s'),
        new UndefinedValidator('s')
    ]),
    // Number of frames to expect in binary message?
    new GroupValidator('f', [
        new NumberValidator('f', {
            minValue: 1,
            maxValue: 99
        }),
        new NullValidator('f'),
        new UndefinedValidator('f')
    ])
]);

/**
 * A convenience class for receiving and storing buffer data split into multiple messages
 */
class BinaryBuffer {
    /**
     * Creates a BinaryBuffer
     * @param {number} length - The length of the underlying buffer
     */
    constructor(length) {
        // this.buffer = new Uint8Array(length);
        /** @type {?ToolSocketMessage} */
        this.mainMessage = null; // Object that contains data about the whole message
        this.messageBuffer = []; // TODO: look into if this can be replaced with a Uint8Array
        this.length = length;
    }

    /**
     * Returns true if `this.messageBuffer.length` meets or exceeds `this.length`
     * @returns {boolean}
     */
    get isFull() {
        return this.messageBuffer.length >= this.length;
    }

    // TODO: determine the type of `message`, are we pushing Uint8Arrays?
    /**
     * Pushes a message to the messageBuffer. Throws an error if pushing would cause the buffer
     * length to exceed `this.length`.
     * @param message
     */
    push(message) {
        if (this.isFull) {
            throw new Error('Cannot append more data to BinaryBuffer, length exceeded.');
        }
        this.messageBuffer.push(message);
    }
}

/**
 * Represents a message that may or may not include binary data
 */
class MessageBundle {
    // TODO: determine type of binaryData
    /**
     * Creates a MessageBundle.
     * @param {ToolSocketMessage} message - The message
     * @param {Uint8Array | ArrayBuffer | [Uint8Array] | [ArrayBuffer]} binaryData - The binary data
     */
    constructor(message, binaryData) {
        this.message = message;
        this.binaryData = binaryData;
    }

    /**
     * Converts this message bundle into a binary representation
     * @returns {Uint8Array} - The binary representation of the message bundle
     */
    toBinary() {
        if (Array.isArray(this.binaryData)) {
            throw new Error('Cannot convert array-based binary data to single binary.');
        }
        const messageBuffer = encoder.encode(JSON.stringify(this.message));
        const messageLengthBuffer = intToByte(messageBuffer.length);
        const binaryDataBuffer = this.binaryData ? new Uint8Array(this.binaryData) : null;
        // Apologies for the terrible naming, but this keeps the following line cleaner by hiding the ternary operator
        const binaryDataBufferLength = binaryDataBuffer ? binaryDataBuffer.length : 0;
        const result = new Uint8Array(messageLengthBuffer.length + messageBuffer.length + binaryDataBufferLength);
        result.set(messageLengthBuffer, 0);
        result.set(messageBuffer, messageLengthBuffer.length);
        if (binaryDataBuffer) {
            result.set(binaryDataBuffer, messageLengthBuffer.length + messageBuffer.length);
        }
        return result;
    }

    /**
     * Creates a MessageBundle from a string message
     * @param {string} string - The message to convert into a MessageBundle
     * @returns {MessageBundle} - The created MessageBundle
     */
    static fromString(string) {
        return new MessageBundle(ToolSocketMessage.fromString(string), null);
    }

    /**
     * Creates a MessageBundle from a binary message
     * @param {Uint8Array} binary - The binary message to convert into a MessageBundle
     * @returns {MessageBundle} - The created MessageBundle
     */
    static fromBinary(binary) {
        const bufferLength = byteToInt(binary.slice(0, 4));
        const message = ToolSocketMessage.fromString(decoder.decode(binary.slice(4, bufferLength + 4)));
        const binaryData = binary.slice(bufferLength + 4, binary.length);
        return new MessageBundle(message, binaryData);
    }

    /**
     * Creates a MessageBundle from a BinaryBuffer
     * @param {BinaryBuffer} binaryBuffer - The BinaryBuffer to convert into a MessageBundle
     * @returns {MessageBundle} - The created MessageBundle
     */
    static fromBinaryBuffer(binaryBuffer) {
        if (!binaryBuffer.isFull) {
            throw new Error('Cannot create a MessageBundle from a BinaryBuffer that is not full.');
        }
        const message = binaryBuffer.mainMessage;
        const binaryData = []; // TODO: check if this can be a Uint8Array
        binaryBuffer.messageBuffer.forEach(message => {
            binaryData.push(message);
        });
        return new MessageBundle(message, binaryData);
    }
}

/**
 * A message in ToolSocket's format
 */
class ToolSocketMessage {
    // TODO: define body type and parameter descriptions better
    /**
     * Creates a ToolSocketMessage
     * @param {string} origin - The origin
     * @param {string} network - The network
     * @param {string} method - The method being performed (e.g. get, post)
     * @param {string} route - The route to send the message to
     * @param {any} body - The message body
     * @param {string?} id - An ID for listening to responses
     */
    constructor(origin, network, method, route, body, id) {
        // These parameters are impossible to read in code, use the getters and setters
        this.o = origin;
        this.n = network;
        this.m = method;
        this.r = route;
        this.b = body;
        this.i = id;
        this.s = null;
        /** @type {?number} */
        this.f = null;
    }

    /** @type {string} */
    get origin() {
        return this.o;
    }

    /** @param {string} newOrigin */
    set origin(newOrigin) {
        this.o = newOrigin;
    }

    /** @type {string} */
    get network() {
        return this.n;
    }

    /** @param {string} newNetwork */
    set network(newNetwork) {
        this.n = newNetwork;
    }

    /** @type {string} */
    get method() {
        return this.m;
    }

    /** @param {string} newMethod */
    set method(newMethod) {
        this.m = newMethod;
    }

    /** @type {string} */
    get route() {
        return this.r;
    }

    /** @param {string} newRoute */
    set route(newRoute) {
        this.r = newRoute;
    }

    /** @type {any} */
    get body() {
        return this.b;
    }

    /** @param {any} newBody */
    set body(newBody) {
        this.b = newBody;
    }

    /** @type {?string} */
    get id() {
        return this.i;
    }

    /** @param {?string} newId */
    set id(newId) {
        this.i = newId;
    }

    // TODO: figure out what .s is

    /** @type {?number} */
    get frameCount() {
        return this.f;
    }

    /** @param {?number} newFrameCount */
    set frameCount(newFrameCount) {
        this.f = newFrameCount;
    }

    /**
     * Creates a ToolSocketMessage from a JSON string
     * @param {string} string - The JSON string
     * @return {ToolSocketMessage} - The generated ToolSocketMessage
     */
    static fromString(string) {
        const object = JSON.parse(string);
        if ([object.o, object.n, object.m, object.r, object.b].some(value => value === undefined)) {
            throw new Error(`Cannot parse ToolSocketMessageString, required value is undefined: ${JSON.stringify(object)}`);
        }
        const message = new ToolSocketMessage(object.o, object.n, object.m, object.r, object.b, object.i);
        message.s = object.s !== undefined ? object.s : null;
        message.f = object.f !== undefined ? object.f : null;
        return message;
    }
}

/**
 * An object that allows for responses for a specific message to be sent
 */
class ToolSocketResponse {
    /**
     * Creates a ToolSocketResponse
     * @param {ToolSocket} toolSocket - The ToolSocket used for communication
     * @param {ToolSocketMessage} originalMessage - The message that triggered this response
     */
    constructor(toolSocket, originalMessage) {
        if (!originalMessage.id) {
            throw new Error('Cannot create ToolSocketResponse for message with no ID.');
        }
        this.toolSocket = toolSocket;
        this.originalMessage = originalMessage;
        this.sent = false;
    }

    // TODO: type annotation for binaryData
    /**
     * Sends a response
     * @param {any} body - The message body to send
     * @param binaryData - The binary data to send with the message
     */
    send(body, binaryData) {
        if (this.sent) {
            console.error('Attempted to send response, but response was already sent.');
            return;
        }
        this.sent = true;
        if (body === undefined || body === null) {
            body = 204;
        }
        const message = new ToolSocketMessage(this.toolSocket.origin, this.originalMessage.network, 'res', this.originalMessage.route, body, this.originalMessage.id);
        const messageBundle = new MessageBundle(message, binaryData);
        this.toolSocket.send(messageBundle, null);
    }
}

/**
 * A WebSocket-based connection library that allows for file-sending, response callbacks,
 * and automatic re-connection
 */
class ToolSocket {
    /**
     * Creates a ToolSocket
     * @param {?URL} [url] - The URL to connect to
     * @param {?string} [networkId] - The network ID
     * @param {?string} [origin] - The origin
     */
    constructor(url, networkId, origin) {
        this.url = null;
        this.networkId = null;
        this.origin = null;

        this.eventCallbacks = {}; // For internal events
        this.responseCallbacks = {}; // For responses to messages
        /** @type {?BinaryBuffer} */
        this.binaryBuffer = null;

        /**
         * @typedef {object} QueuedMessage
         * @property {MessageBundle} messageBundle
         * @property {function} callback
         */

        /** @type [QueuedMessage] */
        this.queuedMessages = []; // For messages sent while not connected

        this.socket = null;

        if (url) {
            this.connect(url, networkId, origin);
        } else if (isBrowser) {
            url = new URL(window.location.href);
            url.protocol = url.protocol.replace('http', 'ws');
            this.connect(url, networkId, origin);
        }

        this.configureDefaultRoutes();
        this.configureAliases();
    }

    get network() {
        return this.networkId;
    }

    get readyState() {
        if (!this.socket) {
            return WebSocketWrapper.CLOSED;
        }
        return this.socket.readyState;
    }

    get connected() {
        return this.socket.readyState === this.socket.OPEN;
    }

    /**
     * Connects the WebSocket
     * @param {?URL} url - The URL to connect to
     * @param {?string} [networkId] - The network ID
     * @param {?string} [origin] - The origin
     */
    connect(url, networkId, origin) {
        if (this.socket) {
            this.socket.close();
        }

        if (!networkId) {
            const urlData = URL_SCHEMA.parseUrl(url);
            if (urlData) {
                this.networkId = urlData.n || 'io'; // Unclear what the purpose of this default is
            } else {
                this.networkId = 'io'; // Unclear what the purpose of this default is
            }
        } else {
            this.networkId = networkId;
        }
        this.origin = origin ? origin : (isBrowser ? 'web' : 'server'); // Unclear what the purpose of this default is

        const searchParams = new URLSearchParams({networkID: this.networkId}); // TODO: make these names (networkID, networkId) equivalent
        this.url = addSearchParams(url, searchParams);

        this.socket = new WebSocketWrapper(this.url);
        this.configureSocket();
    }

    /**
     * Adds an event listener to internal events
     * @param {string} eventType - The event type to listen to
     * @param {function} callback - The function to call when the event occurs
     */
    addEventListener(eventType, callback) {
        if (!this.eventCallbacks[eventType]) {
            this.eventCallbacks[eventType] = [];
        }
        this.eventCallbacks[eventType].push(callback);
    }

    /**
     * Triggers event listeners for a given event
     * @param {string} eventType - The event type to trigger
     * @param {...any} args - The arguments to pass to the event listeners
     */
    triggerEvent(eventType, ...args) {
        if (!this.eventCallbacks[eventType]) {
            return;
        }
        this.eventCallbacks[eventType].forEach(callback => callback(...args));
    }

    /**
     * Clears all event listeners
     */
    removeAllListeners() {
        this.eventCallbacks = [];
    }

    /**
     * Closes the WebSocket connection
     */
    close() {
        this.socket.close();
    }

    /**
     * Sets up event listeners for routes that ToolSocket handles itself
     */
    configureDefaultRoutes() {
        this.addEventListener('ping', (_route, body, response, _binaryData) => {
            response.send('pong');
        });
        this.addEventListener('io', (route, body, _responseObject, binaryData) => {
            if (VALID_METHODS.includes(route)) {
                console.warn(`Received IO message with route, ${route}, which cannot be distinguished from the request method with the same name. Please pick a different route.`);
            }
            this.triggerEvent(route, body, binaryData);
        });
    }

    /**
     * Adds event listeners to the WebSocket instance and sets the binaryType to arraybuffer
     */
    configureSocket() {
        this.socket.binaryType = 'arraybuffer';
        this.socket.addEventListener('open', event => {
            this.triggerEvent('open', event);
            this.triggerEvent('connect', event);
            this.triggerEvent('connected', event);
            this.triggerEvent('status', this.socket.readyState);
            this.sendQueuedMessages();
        });
        this.socket.addEventListener('close', event => {
            this.triggerEvent('close', event);
            this.triggerEvent('disconnect', event);
            this.triggerEvent('status', this.socket.readyState);
        });
        this.socket.addEventListener('error', event => {
            this.triggerEvent('error', event);
        });
        this.socket.addEventListener('message', event => {
            this.triggerEvent('rawMessage', event.data);
            if (typeof event.data === 'string') {
                this.routeMessage(event.data);
            } else {
                this.routeMessage(new Uint8Array(event.data));
            }
        });
        this.setupPingInterval();
    }

    /**
     * Initiates the ping interval
     */
    setupPingInterval() {
        const autoPing = () => {
            this.ping('action/ping', null, () => {
                this.triggerEvent('pong');
            });
        };
        const interval = setInterval(autoPing, 2000);
        autoPing(); // Must ping before messages get sent so that cloud-proxy can set up network properly
        this.socket.addEventListener('close', () => {
            clearInterval(interval);
        });
    }

    /**
     * Processes an incoming message
     * @param {string | Uint8Array} message - The message to process
     */
    routeMessage(message) {
        // TODO: add validation on inputs and error handling
        /** @type {MessageBundle} */
        let messageBundle = null;
        let messageLength = 0; // TODO: name this something clearer once purpose is better understood
        if (typeof message === 'string') {
            try {
                messageBundle = MessageBundle.fromString(message);
                messageLength = message.length;
                if (messageBundle.message.frameCount !== null) {
                    // f is the number of binary messages to follow
                    // Set up this.binaryBuffer so that we can receive those messages
                    this.binaryBuffer = new BinaryBuffer(messageBundle.message.frameCount);
                    this.binaryBuffer.mainMessage = messageBundle.message;
                    return;
                }
            } catch (_e) {
                this.triggerEvent('droppedMessage', message);
                return;
            }
        } else if (this.binaryBuffer) {
            // Part of a sequence of broken up binary messages
            // Append messages one at a time to the buffer until message length is reached
            this.binaryBuffer.push(message);
            if (!this.binaryBuffer.isFull) {
                return;
            }
            // We can now process the full buffer
            try {
                messageBundle = MessageBundle.fromBinaryBuffer(this.binaryBuffer);
                messageLength = message.length; // TODO: Ensure this actually works on message
                this.binaryBuffer = null;
            } catch (_e) {
                this.triggerEvent('droppedMessage', message);
                return;
            }
        } else {
            try {
                // Single binary message, can process immediately
                messageBundle = MessageBundle.fromBinary(message);
                messageLength = message.length; // TODO: Ensure this actually works on message
            } catch (_e) {
                this.triggerEvent('droppedMessage', message);
                return;
            }
        }

        // TODO: test for message length as well
        if (!MESSAGE_BUNDLE_SCHEMA.validate(messageBundle.message)) {
            console.warn('message schema validation failed', messageBundle.message, MESSAGE_BUNDLE_SCHEMA.failedValidator);
            this.triggerEvent('droppedMessage', message);
            return;
        }

        if (messageBundle.message.method === 'ping') {
            // TODO: move this to a ping event listener once event format is improved, need access to `n` there
            // Update network ID on ping message
            // 'toolbox' is the initial network ID for a connection from cloud-proxy to client used until first ping
            // Should not override actual network ID
            if (messageBundle.message.network !== 'toolbox' && messageBundle.message.network !== this.networkId) {
                this.triggerEvent('network', messageBundle.message.network, this.networkId, messageBundle.message);
                this.networkId = messageBundle.message.network;
            }
        }

        // TODO: this if statement is kind of weird, mix of handling res route and validating i exists
        if (messageBundle.message.id && messageBundle.message.method === 'res') {
            if (this.responseCallbacks[messageBundle.message.id]) {
                this.responseCallbacks[messageBundle.message.id](messageBundle.message.body, messageBundle.binaryData);
                delete this.responseCallbacks[messageBundle.message.id];
            }
            return;
        }

        if (VALID_METHODS.includes(messageBundle.message.method)) {
            // If the message was sent with an ID, we want to be able to send a response
            const responseObject = messageBundle.message.id ? new ToolSocketResponse(this, messageBundle.message) : null;
            this.triggerEvent(messageBundle.message.method,
                messageBundle.message.route,
                messageBundle.message.body,
                responseObject,
                messageBundle.binaryData);
        }
    }

    /**
     * Sends messages that were queued up while socket was disconnected
     */
    sendQueuedMessages() {
        this.queuedMessages.forEach(({messageBundle, callback}) => {
            this.send(messageBundle, callback);
        });
        this.queuedMessages = [];
    }

    /**
     * Sends a message bundle, used internally. Do not call this method from outside ToolSocket.
     * If the underlying socket is not yet open, queue the messages to be sent once the connection is open.
     * @param {MessageBundle} messageBundle - The MessageBundle to send
     * @param {?function} callback - An optional callback to handle responses
     */
    send(messageBundle, callback) {
        if (!this.connected) {
            this.queuedMessages.push({messageBundle, callback});
            return;
        }
        // Note: if too much data is queued to be sent, the connection automatically closes
        // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
        // Should we check for this?
        if (callback) {
            messageBundle.message.id = generateUniqueId(8);
            this.responseCallbacks[messageBundle.message.id] = callback;
        }

        if (messageBundle.binaryData) {
            if (Array.isArray(messageBundle.binaryData)) {
                messageBundle.message.frameCount = messageBundle.binaryData.length;
                const metaSendData = JSON.stringify(messageBundle.message);
                this.socket.send(metaSendData);
                this.triggerEvent('rawSend', metaSendData);
                messageBundle.binaryData.forEach(entry => {
                    const sendData = entry;
                    this.socket.send(sendData);
                    this.triggerEvent('rawSend', sendData);
                });
            } else {
                const sendData = messageBundle.toBinary();
                this.socket.send(sendData);
                this.triggerEvent('rawSend', sendData);
            }
        } else {
            const sendData = JSON.stringify(messageBundle.message);
            this.socket.send(sendData);
            this.triggerEvent('rawSend', sendData);
        }
        this.triggerEvent('send', messageBundle);
    }

    /**
     * Sends an IO message
     * @param {string} route
     * @param {any} body
     * @param {object} binaryData
     */
    emit(route, body, binaryData) {
        this.io(route, body, null, binaryData);
    }

    /**
     * Sends a message using the given HTTP-like method
     * @param {MethodString} method - The method to use
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    sendMethod(method, route, body, callback, binaryData) {
        if (!binaryData) {
            binaryData = null;
        }
        const message = new ToolSocketMessage(this.origin, this.networkId, method, route, body);
        const messageBundle = new MessageBundle(message, binaryData);
        this.send(messageBundle, callback);
    }

    /**
     * Sends an ACTION message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    action(route, body, callback, binaryData) {
        this.sendMethod('action', route, body, callback, binaryData);
    }

    /**
     * Sends a BEAT message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    beat(route, body, callback, binaryData) {
        this.sendMethod('beat', route, body, callback, binaryData);
    }

    /**
     * Sends a DELETE message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    delete(route, body, callback, binaryData) {
        this.sendMethod('delete', route, body, callback, binaryData);
    }

    /**
     * Sends a GET message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    get(route, body, callback, binaryData) {
        this.sendMethod('get', route, body, callback, binaryData);
    }

    /**
     * Sends an IO message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    io(route, body, callback, binaryData) {
        this.sendMethod('io', route, body, callback, binaryData);
    }

    /**
     * Sends a KEYS message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    keys(route, body, callback, binaryData) {
        this.sendMethod('keys', route, body, callback, binaryData);
    }

    /**
     * Sends a MESSAGE message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    message(route, body, callback, binaryData) {
        this.sendMethod('message', route, body, callback, binaryData);
    }

    /**
     * Sends a NEW message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    new(route, body, callback, binaryData) {
        this.sendMethod('new', route, body, callback, binaryData);
    }

    /**
     * Sends a PATCH message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    patch(route, body, callback, binaryData) {
        this.sendMethod('patch', route, body, callback, binaryData);
    }

    /**
     * Sends a PING message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    ping(route, body, callback, binaryData) {
        this.sendMethod('ping', route, body, callback, binaryData);
    }

    /**
     * Sends a POST message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    post(route, body, callback, binaryData) {
        this.sendMethod('post', route, body, callback, binaryData);
    }

    /**
     * Sends a PUB message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    pub(route, body, callback, binaryData) {
        this.sendMethod('pub', route, body, callback, binaryData);
    }

    /**
     * Sends a PUT message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    put(route, body, callback, binaryData) {
        this.sendMethod('put', route, body, callback, binaryData);
    }

    /**
     * Sends a RES message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    res(route, body, callback, binaryData) {
        this.sendMethod('res', route, body, callback, binaryData);
    }

    /**
     * Sends a SUB message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    sub(route, body, callback, binaryData) {
        this.sendMethod('sub', route, body, callback, binaryData);
    }

    /**
     * Sends an UNSUB message
     * @param {string} route - The route
     * @param {any} body - The message body
     * @param {function} [callback] - A callback function that is called if a response is required
     * @param {object} [binaryData] - Binary data
     */
    unsub(route, body, callback, binaryData) {
        this.sendMethod('unsub', route, body, callback, binaryData);
    }

    /**
     * Adds aliases for backwards compatibility
     */
    configureAliases() {
        this.on = this.addEventListener;
        this.emitInt = this.triggerEvent;
        this.dataPackageSchema = MESSAGE_BUNDLE_SCHEMA.oldFormat;
        this.routeSchema = URL_SCHEMA.oldFormat;
        this.OPEN = WebSocketWrapper.OPEN;
        this.CONNECTING = WebSocketWrapper.CONNECTING;
        this.CLOSING = WebSocketWrapper.CLOSING;
        this.CLOSED = WebSocketWrapper.CLOSED;
    }
}

/**
 * A server for ToolSocket
 */
class ToolSocketServer {
    /**
     * Constructs a ToolSocketServer
     * @param {Object} options - Options to pass to the WebSocket.Server constructor
     * @param {string} [origin] - The origin
     */
    constructor(options, origin) {
        this.origin = origin || 'server';
        this.server = new WebSocketWrapper.Server(options);

        /** @type [ToolSocket] */
        this.sockets = [];

        this.eventCallbacks = {}; // For internal events

        this.server.on('listening', (...args) => {
            this.triggerEvent('listening', ...args);
        });

        this.server.on('connection', socket => {
            const toolSocket = new ToolSocket();
            toolSocket.socket = socket;
            toolSocket.networkId = 'toolbox'; // Or 'io'?
            toolSocket.origin = this.origin;
            toolSocket.configureSocket();
            this.sockets.push(toolSocket);
            this.triggerEvent('connection', toolSocket);

            socket.on('close', () => {
                this.sockets.splice(this.sockets.indexOf(toolSocket), 1);
            });
        });

        this.server.on('close', (...args) => {
            this.triggerEvent('close', ...args);
        });

        this.configureAliases();
    }

    /**
     * Adds an event listener to internal events
     * @param {string} eventType - The event type to listen to
     * @param {function} callback - The function to call when the event occurs
     */
    addEventListener(eventType, callback) {
        if (!this.eventCallbacks[eventType]) {
            this.eventCallbacks[eventType] = [];
        }
        this.eventCallbacks[eventType].push(callback);
    }

    /**
     * Triggers event listeners for a given event
     * @param {string} eventType - The event type to trigger
     * @param {...any} args - The arguments to pass to the event listeners
     */
    triggerEvent(eventType, ...args) {
        if (!this.eventCallbacks[eventType]) {
            return;
        }
        this.eventCallbacks[eventType].forEach(callback => callback(...args));
    }

    /**
     * Clears all event listeners
     */
    removeAllListeners() {
        this.eventCallbacks = [];
    }

    /**
     * Adds aliases for backwards compatibility
     */
    configureAliases() {
        this.on = this.addEventListener;
        this.emitInt = this.triggerEvent;
        this.dataPackageSchema = MESSAGE_BUNDLE_SCHEMA.oldFormat;
        this.routeSchema = URL_SCHEMA.oldFormat;
        this.server.server = this.server;
    }

    close() {
        this.server.close();
    }
}



ToolSocket.MESSAGE_BUNDLE_SCHEMA = MESSAGE_BUNDLE_SCHEMA;
ToolSocket.URL_SCHEMA = URL_SCHEMA;
ToolSocket.Io = ToolSocket;
ToolSocket.intToByte = intToByte;
ToolSocket.byteToInt = byteToInt;
ToolSocket.uuidShort = generateUniqueId;
ToolSocket.generateUniqueId = generateUniqueId;
ToolSocket.Schema = Schema;
ToolSocket.Schema.StringValidator = StringValidator;
ToolSocket.Schema.NumberValidator = NumberValidator;
ToolSocket.Schema.BooleanValidator = BooleanValidator;
ToolSocket.Schema.NullValidator = NullValidator;
ToolSocket.Schema.UndefinedValidator = UndefinedValidator;
ToolSocket.Schema.ArrayValidator = ArrayValidator;
ToolSocket.Schema.ObjectValidator = ObjectValidator;
ToolSocket.Schema.GroupValidator = GroupValidator;

if (isBrowser) {
    window.io = new ToolSocket();
} else {
    ToolSocket.Server = ToolSocketServer;
    module.exports = ToolSocket;
}
