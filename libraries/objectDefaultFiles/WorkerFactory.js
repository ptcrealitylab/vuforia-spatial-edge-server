class MessageInterface {
    constructor() {
    }

    /**
     * 
     * @param {Object} message
     */
    postMessage(message) {
        throw new Error("Interface Messageinterface not implemented");
    }

    /**
     * 
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        throw new Error("Interface MessageInterface not implemented");
    }
}

class WorkerMessageInterface extends MessageInterface {
    /**
     * 
     * @param {Worker} worker
     */
    constructor(worker) {
        super();
        this.worker = worker;
    }

    /**
     * 
     * @param {Object} message
     */
    postMessage(message) {
        this.worker.postMessage(message);
    }

    /**
     * 
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        this.worker.onmessage = func;
    }
}

class SelfMessageInterface extends MessageInterface {
    constructor() {
        super();
    }

    /**
     * 
     * @param {Object} message
     */
    postMessage(message) {
        self.postMessage(message);
    }

    /**
     * 
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        self.onmessage = func;
    }
}

class DynamicScriptMessageInterface extends MessageInterface {
    constructor() {
        super();
        /**
         * @type {Array<Object>}
         */
        this.sendMessageBuffer = [];

        /**
         * @type {Array<MessageEvent>}
         */
        this.receivedMessageEventBuffer = [];

        /**
         * @type {(function(MessageEvent):void)|null}
         */
        this.onMessageFunc = null;

        /**
         * @type {WeakRef<FactoryMessageInterface>|null}
         */
        this.externalMessageInterface = null;
    }

    /**
     *
     * @param {Object} message
     */
    postMessage(message) {
        if (this.externalMessageInterface) {
            const localExternalMessageInterface = this.externalMessageInterface.deref();
            if (!localExternalMessageInterface) {
                throw new Error('No externalMessageInterface');
            }
            const messageEvent = new MessageEvent('message', {data: message});
            localExternalMessageInterface.onMessage(messageEvent);
        } else {
            this.sendMessageBuffer.push(message);
        }
    }

    /**
     * 
     * @param {function(MessageEvent):void} func
     */
    setOnMessage(func) {
        this.onMessageFunc = func;
        for (let bufferedMessageEvent of this.receivedMessageEventBuffer) {
            func(bufferedMessageEvent);
        }
    }

    /**
     * 
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
     * 
     * @param {FactoryMessageInterface} messageInterface 
     */
    setExternalMessageInterface(messageInterface) {
        this.externalMessageInterface = new WeakRef(messageInterface);
        for (let bufferedMessage of this.sendMessageBuffer) {
            const bufferedMessageEvent = new MessageEvent('message', {data: bufferedMessage});
            messageInterface.onMessage(bufferedMessageEvent);
        }

    }
}

class FactoryMessageInterface extends MessageInterface {
    constructor() {
        super();
        /**
         * @type {DynamicScriptFactory}
         */
        const factory = self[dynamicScriptFactoryName];
        if (factory) {
            /**
             * @type {DynamicScriptMessageInterface|undefined}
             */
            this.externalMessageInterface = factory.getMessageInterfaceById(dynamicScriptId);
            if (!this.externalMessageInterface) {
                throw new Error(`Factory doesn't have a DynamicScriptMessageInterface with id: ${dynamicScriptId}`);
            }
            this.externalMessageInterface.setExternalMessageInterface(this);
        } else {
            throw new Error(`Factory doesn't exist: ${dynamicScriptFactoryName}`);
        }

        /**
         * @type {Array<MessageEvent>}
         */
        this.receivedMessageEventBuffer = [];

        /**
         * @type {(function(MessageEvent):void)|null};
         */
        this.onMessageFunc = null;
    }

    /**
     * 
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
     * 
     * @param {function(MessageEvent):void} func 
     */
    setOnMessage(func) {
        this.onMessageFunc = func;
        for (let bufferedMessageEvent of this.receivedMessageEventBuffer) {
            func(bufferedMessageEvent);
        }
    }

    /**
     * 
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



class WorkerFactory {
    constructor() {
    }

    /**
     * @param {string} scriptPath
     * @param {boolean} isModule
     * @returns {MessageInterface}
     */
    createWorker(scriptPath, isModule) {
        throw new Error("Interface WorkerFactory not implemented");
    }
}

class WebWorkerFactory extends WorkerFactory {
    constructor() {
        super();
    }

    /**
     * 
     * @param {string} scriptPath
     * @param {boolean} isModule
     * @returns {MessageInterface} 
     */
    createWorker(scriptPath, isModule) {
        const webWorker = new Worker(scriptPath, {type: isModule ? "module" : "classic"});
        return new WorkerMessageInterface(webWorker);
    }
}

class DynamicScriptFactory extends WorkerFactory {
    /**
     * 
     * @param {string} factoryName
     */
    constructor(factoryName) {
        super();
        this.factoryName = factoryName;
        self[factoryName] = this;
        /**
         * @type {Map<number, DynamicScriptMessageInterface>}
         */
        this.workers = new Map();
        this.nextId = 1;
    }

    /**
     * 
     * @param {string} scriptPath
     * @param {boolean} isModule
     */
    createWorker(scriptPath, isModule) {
        const scriptElem = document.createElement('script');
        if (isModule) {
            scriptElem.setAttribute('type', 'module');
        }
        scriptElem.setAttribute('src', scriptPath);// + '?dynamicScriptId=' + encodeURIComponent(this.nextId) + '&dynamicScriptFactoryName=' + encodeURIComponent(this.factoryName) + "");
        self['dynamicScriptId'] = this.nextId;
        self['dynamicScriptFactoryName'] = this.factoryName;
        const messageInterface = new DynamicScriptMessageInterface();
        this.workers.set(this.nextId, messageInterface);
        this.nextId++; 
        document.body.appendChild(scriptElem);
        return messageInterface;
    }

    /**
     * 
     * @param {number} id
     * @returns {DynamicScriptMessageInterface | undefined}
     */
    getMessageInterfaceById(id) {
        return this.workers.get(id);
    }
}

function useWebWorkers() {
    const offscreenCanvas = new OffscreenCanvas(10, 10);
    if (offscreenCanvas) {
        offscreenCanvas.getContext("webgl");
        if (offscreenCanvas) {
            return true;
        }
    }
    return false;
}

export {MessageInterface, WorkerMessageInterface, SelfMessageInterface, DynamicScriptMessageInterface, FactoryMessageInterface, WorkerFactory, WebWorkerFactory, DynamicScriptFactory, useWebWorkers};
