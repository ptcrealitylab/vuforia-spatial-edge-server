/**
 * @typedef {import("./object.js").SpatialInterface} SpatialInterface
 */

/**
 * this interface mediates between the server, spatialinterface and the webworker
 */
class ThreejsInterface {
    /**
     * 
     * @param {SpatialInterface} spatialInterface
     * @param {Worker} worker
     */
    constructor(spatialInterface, worker) {
        // some information will become available after the bootstrap message has been received
        this.spatialInterface = spatialInterface;
        this.worker = worker;
        this.workerId = -1;
        this.prefersAttachingToWorld = true;
        this.spatialInterface.useWebGlWorker();
        this.spatialInterface.onSpatialInterfaceLoaded(this.onSpatialInterfaceLoaded.bind(this));
        this.synclock = null;
    }

    /**
     * this message is used to setup the projection matrix in the webworker
     * @param {Float32Array} modelViewMatrix 
     * @param {Float32Array} projectionMatrix 
     */
    anchoredModelViewCallback(modelViewMatrix, projectionMatrix) {
        this.worker.postMessage({name: "anchoredModelViewCallback", projectionMatrix: projectionMatrix});
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
    }

    /**
     * receives messages from the webworker to send to the server
     * @param {MessageEvent<any>} event 
     */
    onMessageFromWorker(event) {
        const message = event.data;
        if (message) {
            self.parent.postMessage(message, "*");
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
                this.worker.postMessage(message);
            }
        }
    }
}

export {ThreejsInterface};
