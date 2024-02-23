const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');
const WebSocket = require('ws');

const {objectsPath} = require('../../config.js');
const {identityFolderName} = require('../../constants.js');
const fsProm = require('../../persistence/fsProm.js');
const utilities = require('../../libraries/utilities.js');
const {fileExists} = utilities;

const SPLAT_HOST = 'change me:3000';

/**
 * A class for starting and monitoring the progress of an area target to splat
 * conversion problem, persisting the resulting file if successful
 */
class SplatTask {
    /**
     * @param {ObjectModel} object
     */
    constructor(object) {
        this.object = object;
        this.gaussianSplatRequestId = null;
        if (this.object.gaussianSplatRequestId) {
            this.gaussianSplatRequestId = this.object.gaussianSplatRequestId;
        }
        this.done = false;

        this.onOpen = this.onOpen.bind(this);
        this.onMessage = this.onMessage.bind(this);
    }
    /**
     * Starts the splatTask, running until we at least get a request id
     * @return {string|undefined} gaussianSplatRequestId if started, undefined if already complete or started
     */
    async start() {
        const objectName = this.object.name;
        const splatPath = path.join(objectsPath, objectName, identityFolderName, 'target', 'target.splat');
        if (await fileExists(splatPath)) {
            this.done = true;
            return;
        }

        if (this.gaussianSplatRequestId) {
            let success = await this.download();
            if (success) {
                return;
            }
            // Continue, download failed because the request is still in progress
        } else {
            const tdtPath = path.join(objectsPath, objectName, identityFolderName, 'target', 'target.3dt');
            if (!await fileExists(tdtPath)) {
                throw new Error('No 3dt file to upload');
            }
            const targetTdtBuf = await fsProm.readFile(tdtPath);
            console.log('tdt?', tdtPath, !!targetTdtBuf);

            const form = new FormData();
            form.append('3dt', targetTdtBuf, {filename: 'target.3dt', name: '3dt', contentType: 'application/octet-stream'});
            const res = await fetch(`http://${SPLAT_HOST}/upload`, {
                method: 'POST',
                headers: {
                    ...form.getHeaders(),
                },
                body: form,
            });

            const gaussianSplatRequestId = await res.text();
            this.object.gaussianSplatRequestId = gaussianSplatRequestId;
            this.gaussianSplatRequestId = gaussianSplatRequestId;
        }

        this.openSocket();

        return this.gaussianSplatRequestId;
    }

    openSocket() {
        this.ws = new WebSocket('ws://' + SPLAT_HOST);
        this.ws.addEventListener('open', this.onOpen);
        this.ws.addEventListener('message', this.onMessage);
    }

    onOpen() {
        this.ws.send(this.gaussianSplatRequestId);
    }

    onMessage(event) {
        let message;
        try {
            message = JSON.parse(event.data);
        } catch (e) {
            console.error('SplatTask: json parse error', event.data);
            return;
        }

        if (message.step === 'Complete') {
            this.stop();
            this.download();
        }
    }

    /**
     * @return {{done: boolean, gaussianSplatRequestId: string|undefined}} splat status
     */
    getStatus() {
        return {
            done: this.done,
            gaussianSplatRequestId: this.gaussianSplatRequestId,
        };
    }

    stop() {
        if (!this.ws) {
            return;
        }

        try {
            this.ws.removeEventListener('open', this.onOpen);
            this.ws.removeEventListener('message', this.onMessage);
            this.ws.close();
            this.ws = null;
        } catch (_e) {
            // Don't care about potential errors
        }
    }

    async download() {
        const splatPath = path.join(objectsPath, this.object.name, identityFolderName, 'target', 'target.splat');
        try {
            let res = await fetch(`http://${SPLAT_HOST}/downloads/${this.gaussianSplatRequestId}`);
            if (!res.ok) {
                throw new Error(`Unexpected response: ${res.statusText}`);
            }
            let body = await res.arrayBuffer();
            await fsProm.writeFile(splatPath, new Uint8Array(body));
            this.done = true;
            return true;
        } catch (err) {
            console.warn(`error downloading target.splat for ${this.object.objectId}`, err);
            return false;
        }
    }
}

const splatTasks = {};
module.exports.splatTasks = splatTasks;

/**
 * @param {ObjectModel} object
 */
module.exports.startSplatTask = async function startSplatTask(object) {
    const objectId = object.objectId;
    const oldTask = splatTasks[object.objectId];
    if (oldTask) {
        return oldTask;
    }

    splatTasks[objectId] = new SplatTask(object);
    // Kick off the splatting to the point where we get a request id
    await splatTasks[objectId].start();
    return splatTasks[objectId];
};
