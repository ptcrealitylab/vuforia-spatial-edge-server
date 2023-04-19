import {WebGLStrategy} from "/objectDefaultFiles/glCommandBuffer.js";

/**
 * @typedef {import("./object.js").SpatialInterface} SpatialInterface
 * @typedef {import("./WorkerFactory.js").MessageInterface} MessageInterface
 */

/**
 * this interface mediates between the server, spatialinterface and the webworker
 */
class ThreejsInterface {
    /**
     * @param {SpatialInterface} spatialInterface
     * @param {string} workerScript
     */
    constructor(spatialInterface, workerScript) {
        // some information will become available after the bootstrap message has been received
        /**
         * @type {SpatialInterface}
         */
        this.spatialInterface = spatialInterface;

        /**
         * @type {MessageInterface}
         */
        this.workerMessageInterface = WebGLStrategy.getInstance().workerFactory.createWorker(workerScript, true);
        this.workerMessageInterface.setOnMessage(this.onMessageFromWorker.bind(this));
        this.workerId = -1;
        this.prefersAttachingToWorld = true;
        this.spatialInterface.useWebGlWorker();
        this.spatialInterface.onSpatialInterfaceLoaded(this.onSpatialInterfaceLoaded.bind(this));
        /**
         * @type {Int32Array|null}
         */
        //this.synclock = null;
        this.touchAnswerListener = null;
        this.mouse = {x: 0, y: 0};
        this.lastTouchResult = false;
    }

    getWorkerMessageInterface() {
        return this.workerMessageInterface;
    }

    /**
     * this message is used to setup the projection matrix in the webworker
     * @param {Float32Array} modelViewMatrix
     * @param {Float32Array} projectionMatrix
     */
    anchoredModelViewCallback(modelViewMatrix, projectionMatrix) {
        this.workerMessageInterface.postMessage({name: "anchoredModelViewCallback", projectionMatrix: projectionMatrix});
    }

    /**
     * after loading the spatial interface the worker can finish it's configuration
     */
    onSpatialInterfaceLoaded() {
        this.spatialInterface.subscribeToMatrix();
        this.spatialInterface.setFullScreenOn();

        if (this.prefersAttachingToWorld) {
            this.spatialInterface.prefersAttachingToWorld();
        }

        this.spatialInterface.addAnchoredModelViewListener(this.anchoredModelViewCallback.bind(this));

        this.spatialInterface.setMoveDelay(300);
        this.spatialInterface.registerTouchDecider(this.touchDecider.bind(this));
    }

    /**
     * receives messages from the webworker to send to the server
     * @param {MessageEvent<any>} event
     */
    onMessageFromWorker(event) {
        const message = event.data;
        if (message) {
            if ((this.touchAnswerListener !== null) && (typeof message === 'object') && (message.name === "touchDeciderAnswer")) {
                this.lastTouchResult = message.result;
                this.touchAnswerListener(true);
            } else {
                self.parent.postMessage(message, "*");
            }
        }
    }

    /**
     * receives messages from the server to send through to the webworker
     * some messages influence the spatial interface and are intercepted before passing them on
     * @param {MessageEvent<any>} event
     */
    onMessageFromServer(event) {
        const message = event.data;
        if (message && (typeof message === 'object')) {
            if (message.hasOwnProperty("name")) {
                if (message.name === "bootstrap") {
                    // finish initalisation of the client
                    const {workerId, width, height} = message;
                    this.workerId = workerId;
                    this.synclock = message.synclock;
                    this.spatialInterface.changeFrameSize(width, height);
                }
            }
            if ((this.synclock !== null) && Atomics.load(this.synclock, 0) === 0) {
                // the webworker is in a locked state and unable to process incomming messages, drop the message and send an end frame message to make the server continue with the next proxy
                console.log("worker " + this.workerId + " is waiting, dropping message");
                if (message.hasOwnProperty("name") && (message.name === "frame")) {
                    self.parent.postMessage({
                        workerId: this.workerId,
                        isFrameEnd: true,
                    });
                }
            } else {
                this.workerMessageInterface.postMessage(message);
            }
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    makeWatchdog() {
        return new Promise((res) => {
            setTimeout(res, 3000, false);
        });
    }

    async touchDecider(eventData) {
        //1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        this.mouse.x = (eventData.x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(eventData.y / window.innerHeight) * 2 + 1;

        // if the webworker (containing the renderer) isn't sleeping, post touch message to analyse
        if ((this.synclock !== null) && Atomics.load(this.synclock, 0) === 0) {
            console.warn("tocuh decider locked worker, returning no touch");
            return false;
        }
        this.workerMessageInterface.postMessage({name: "touchDecider", mouse: this.mouse, workerId: this.workerId});
        let res = await Promise.race([this.makeWatchdog(), new Promise((result) => {
            this.touchAnswerListener = result;
        })]);
        if (!res) {
            console.warn("touch decider timeout, returning no touch");
            this.touchAnswerListener = null;
            return false;
        }
        this.touchAnswerListener = null;
        return this.lastTouchResult;
    }
}

export {ThreejsInterface};
