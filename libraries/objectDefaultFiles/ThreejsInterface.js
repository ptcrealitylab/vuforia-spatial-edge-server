/**
 * @typedef {import("./object.js").SpatialInterface} SpatialInterface
 */

class ThreejsInterface {
    /**
     * 
     * @param {SpatialInterface} spatialInterface
     * @param {Worker} worker
     */
    constructor(spatialInterface, worker) {
        this.spatialInterface = spatialInterface;
        this.worker = worker;
        this.workerId = -1;
        this.prefersAttachingToWorld = true;
        this.spatialInterface.useWebGlWorker();
        this.spatialInterface.onSpatialInterfaceLoaded(this.onSpatialInterfaceLoaded.bind(this));
        this.synclock = null;
    }

    /**
     * 
     * @param {Float32Array} modelViewMatrix 
     * @param {Float32Array} projectionMatrix 
     */
    anchoredModelViewCallback(modelViewMatrix, projectionMatrix) {
        this.worker.postMessage({name: "anchoredModelViewCallback", projectionMatrix: projectionMatrix});
    }

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
     * 
     * @param {MessageEvent<any>} event 
     */
    onMessageFromWorker(event) {
        const message = event.data;
        if (message) {
            self.parent.postMessage(message, "*");
        }
    }

    /**
     * 
     * @param {MessageEvent<any>} event 
     */
    onMessageFromServer(event) {
        const message = event.data;
        if (message && (typeof message === 'object')) {
            if (message.hasOwnProperty("name")) {
                if (message.name === "bootstrap") {
                    const {workerId, width, height} = message;
                    this.workerId = workerId;
                    this.synclock = message.synclock;
                    this.spatialInterface.changeFrameSize(width, height);
                }
            }
            if ((this.synclock !== null) && Atomics.load(this.synclock, 0) === 0) {
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
