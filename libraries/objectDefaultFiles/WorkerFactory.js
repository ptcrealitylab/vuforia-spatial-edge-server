/**
 * Generalized postMessage interface
 * It enables us to send messages to scripts executing in the same or a different thread
 */
class MessageInterface {
    constructor() {
    }

    /**
     * send a message to the object
     * @param {Object} _
     */
    postMessage(_) {
        throw new Error("Interface Messageinterface not implemented");
    }

    /**
     * set function to receive messages from the object
     * @param {function(MessageEvent):void} _
     */
    setOnMessage(_) {
        throw new Error("Interface MessageInterface not implemented");
    }
}

/**
 * Wraps a Worker object to implement the generalized message interface
 * it will allow communication with the wrapped web worker
 * Works in tandem with SelfMessageInterface which provides communication in the opposite direction
 */
class WorkerMessageInterface extends MessageInterface {
    /**
     * @param {Worker} worker the worker object to wrap
     */
    constructor(worker) {
        super();
        this.worker = worker;
    }

    /**
     * @param {Object} message
     */
    postMessage(message) {
        this.worker.postMessage(message);
    }

    /**
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        this.worker.onmessage = func;
    }
}

/**
 * Wraps the global self object and implements the generalized send message interface
 * Used to communicate from the worker thread with the main thread
 * Works together with WorkerMessageInterface to provide communication in the other direction
 */
class SelfMessageInterface extends MessageInterface {
    constructor() {
        super();
    }

    /**
     * @param {Object} message
     */
    postMessage(message) {
        self.postMessage(message);
    }

    /**
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        self.onmessage = func;
    }
}

/**
 * implmenets the generalized post message protocol for dynamicly loaded scripts
 * used for communication between the main thread and the script
 * works with FactoryMessageInterface for communication in the opposite direction
 * Requires a FactoryMessageInterface to function completely, initialize with a call to setExternalMessageInterface
 */
class DynamicScriptMessageInterface extends MessageInterface {
    constructor() {
        super();
        /**
         * stores messages that are send before a FactoryMessageInterface has been set
         * @type {Array<Object>}
         */
        this.sendMessageBuffer = [];

        /**
         * stores messages that are received before a receive function has been set
         * @type {Array<MessageEvent>}
         */
        this.receivedMessageEventBuffer = [];

        /**
         * callback that will receive messages
         * @type {(function(MessageEvent):void)|null}
         */
        this.onMessageFunc = null;

        /**
         * reference to the FactoryMessageInterface linked to this one for communication with the script
         * it's a weak reference to prevent cyclic reference counting causing a memory leak
         * the main thread owns the dynamicly loaded script not the otherway around
         * @type {WeakRef<FactoryMessageInterface>|null}
         */
        this.externalMessageInterface = null;
    }

    /**
     * @param {Object} message
     */
    postMessage(message) {
        if (this.externalMessageInterface) {
            const localExternalMessageInterface = this.externalMessageInterface.deref();
            if (!localExternalMessageInterface) {
                throw new Error('externalMessageInterface could not be dereferenced');
            }
            const messageEvent = new MessageEvent('message', {data: message});
            localExternalMessageInterface.onMessage(messageEvent);
        } else {
            this.sendMessageBuffer.push(message);
        }
    }

    /**
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        if (this.onMessageFunc) console.warn("Changing onMessage callback");
        this.onMessageFunc = func;
        // if there are messages stored in the buffer (messages send before configuring this call back) send them now (fifo)
        for (let bufferedMessageEvent of this.receivedMessageEventBuffer) {
            func(bufferedMessageEvent);
        }
        this.receivedMessageEventBuffer = [];
    }

    /**
     * @param {MessageEvent} messageEvent
     */
    onMessage(messageEvent) {
        if (this.onMessageFunc) {
            this.onMessageFunc(messageEvent);
        } else {
            this.receivedMessageEventBuffer.push(messageEvent);
        }
    }

    /**
     * @param {FactoryMessageInterface} messageInterface the other half of this communicationchannel
     */
    setExternalMessageInterface(messageInterface) {
        if (this.externalMessageInterface) console.warn("Changing externalMessageInterface");
        this.externalMessageInterface = new WeakRef(messageInterface);
        // if we have send/saved messages before this configuration was complete, send them now (fifo)
        for (let bufferedMessage of this.sendMessageBuffer) {
            const bufferedMessageEvent = new MessageEvent('message', {data: bufferedMessage});
            messageInterface.onMessage(bufferedMessageEvent);
        }
        this.sendMessageBuffer = [];
    }
}

/**
 * communication interface for communicating from the dynamicly loaded script to the main thread
 * before construction the following global variables should be set:
 * self.dynamicScriptFactoryName
 * self.dynamicScriptId
 * we use these to pass information to the loaded script, this works since we load scripts synchroneously and they get executed before returning from the initiated load call
 * after script loading is done these variables should not be used, since they will be reused for the next script we will load dynamicaly
 */
class FactoryMessageInterface extends MessageInterface {
    /**
     * @param {DynamicScriptFactory} factory
     */
    constructor(factory) {
        super();

        /**
         * @type {DynamicScriptMessageInterface|undefined}
         */
        this.externalMessageInterface = factory.getMessageInterfaceById(factory.lastId);
        if (!this.externalMessageInterface) {
            throw new Error(`Factory doesn't have a DynamicScriptMessageInterface with id: ${factory.lastId}`);
        }
        // connect both classes to establish communication
        this.externalMessageInterface.setExternalMessageInterface(this);

        /**
         * buffer for temporary storage in case messages are received while the callback isn't configured
         * @type {Array<MessageEvent>}
         */
        this.receivedMessageEventBuffer = [];

        /**
         * mesage received callback
         * @type {(function(MessageEvent):void)|null};
         */
        this.onMessageFunc = null;
    }

    /**
     * @param {Object} message
     */
    postMessage(message) {
        const messageEvent = new MessageEvent('message', {data: message});
        if (!this.externalMessageInterface) {
            throw new Error('No externalMessageInterface');
        }
        this.externalMessageInterface.onMessage(messageEvent);
    }

    /**
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        if (this.onMessageFunc) console.warn("Changing onMessage callback");
        this.onMessageFunc = func;
        // if there are stored messages send them (fifo)
        for (let bufferedMessageEvent of this.receivedMessageEventBuffer) {
            func(bufferedMessageEvent);
        }
    }

    /**
     * if we receive a mesage but there is no callback store the message for later
     * @param {MessageEvent} messageEvent
     */
    onMessage(messageEvent) {
        if (this.onMessageFunc) {
            this.onMessageFunc(messageEvent);
        } else {
            this.receivedMessageEventBuffer.push(messageEvent);
        }
    }
}

/**
 * Factory class that loads scripts using either WebWorker or dynamic script loading strategies
 */
class WorkerFactory {
    constructor() {
    }

    /**
     * Creates a new script and returns a communication interface through which messages can be send
     * @param {string} _scriptPath path to the script
     * @param {boolean} _isModule wether the loaded script is a module or normal javascript
     * @returns {MessageInterface} communication interface
     */
    createWorker(_scriptPath, _isModule) {
        throw new Error("Interface WorkerFactory not implemented");
    }
}

/**
 * WebWorker strategy for the worker factory
 */
class WebWorkerFactory extends WorkerFactory {
    constructor() {
        super();
    }

    /**
     * @param {string} scriptPath path to the script
     * @param {boolean} isModule wether the loaded script is a module or normal javascript
     * @returns {MessageInterface} communication interface
     */
    createWorker(scriptPath, isModule) {
        const webWorker = new Worker(scriptPath, {type: isModule ? "module" : "classic"});
        return new WorkerMessageInterface(webWorker);
    }
}

/**
 * dynamic script loading strategy for the WorkerFactory
 */
class DynamicScriptFactory extends WorkerFactory {
    constructor() {
        super();
        /**
         * @type {Map<number, DynamicScriptMessageInterface>}
         */
        this.workers = new Map();
        this.nextId = 1;
        this.lastId = 0;
    }

    /**
     * @param {string} scriptPath path to the script
     * @param {boolean} isModule wether the loaded script is a module or normal javascript
     * @returns {MessageInterface} communication interface
     */
    createWorker(scriptPath, isModule) {
        const scriptElem = document.createElement('script');
        if (isModule) {
            scriptElem.setAttribute('type', 'module');
        }
        scriptElem.setAttribute('src', scriptPath);
        // set global variables to communicate connection point to scriptside FactoryMessageInterface
        this.lastId = this.nextId;
        const messageInterface = new DynamicScriptMessageInterface();
        this.workers.set(this.nextId, messageInterface);
        this.nextId++;
        // start script execution
        document.body.appendChild(scriptElem);
        return messageInterface;
    }

    /**
     * used by FactoryMessageInterface to find the main thread's DynamicScriptMessageInterface using the given id
     * @param {number} id dynamicScriptId/unique number identifying the dynamically loaded script
     * @returns {DynamicScriptMessageInterface | undefined}
     */
    getMessageInterfaceById(id) {
        return this.workers.get(id);
    }
}

export {MessageInterface, WorkerMessageInterface, SelfMessageInterface, DynamicScriptMessageInterface, FactoryMessageInterface, WorkerFactory, WebWorkerFactory, DynamicScriptFactory};
