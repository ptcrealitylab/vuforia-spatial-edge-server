const fs = require('fs');
const path = require('path');
const ffmpegInterface = require('./ffmpegInterface');
const VideoFileManager = require('./VideoFileManager');
const constants = require('./videoConstants');

/**
 * @fileOverview
 * The VideoProcessManager listens for messages originating from virtualizer devices,
 * and creates a new Connection to manage the raw video recording process for each camera device
 * The Connection spawns a ffmpeg process when a startRecording message is received, and continuously
 * appends frame data to this process until the device sends stopRecording or disconnects.
 * Frame data is written to a new video "chunk" file each 15 seconds, to reduce memory footprint and point of failure.
 * When the Connection's process is done, it triggers a callback where the VideoServer can make use of the chunk files.
 */

let connections = {};
let callbacks = {
    recordingDone: null
};

module.exports = {
    onConnection: (deviceId) => {
        console.log('-- on connection: ' + deviceId);
        connections[deviceId] = new Connection(deviceId, callbacks);
    },
    onDisconnection: (deviceId) => {
        console.log('-- on disconnection: ' + deviceId);
        if (connections[deviceId]) {
            connections[deviceId].stopRecording(true);
            // TODO: should we also delete this.connections[deviceId]?
        }
    },
    startRecording: (deviceId) => {
        console.log('-- start recording: ' + deviceId);
        if (connections[deviceId]) {
            connections[deviceId].startRecording();
        }
    },
    stopRecording: (deviceId) => {
        console.log('-- stop recording: ' + deviceId);
        if (connections[deviceId]) {
            connections[deviceId].stopRecording(false);
        }
    },
    onFrame: (rgb, depth, pose, deviceId) => {
        if (connections[deviceId]) {
            connections[deviceId].onFrame(rgb, depth, pose);
        }
    },
    setRecordingDoneCallback: (callback) => {
        callbacks.recordingDone = callback;
    }
};

class Connection {
    constructor(deviceId, callbacks) {
        this.deviceId = deviceId;
        this.sessionId = null;
        this.STATUS = Object.freeze({
            NOT_STARTED: 'NOT_STARTED',
            STARTED: 'STARTED',
            ENDING: 'ENDING',
            DISCONNECTED: 'DISCONNECTED',
            STOPPED: 'STOPPED'
        });
        this.isRecording = false;
        this.processes = {
            color: null,
            depth: null,
            pose: null
        };
        this.processStatuses = {
            color: this.STATUS.NOT_STARTED,
            depth: this.STATUS.NOT_STARTED,
            pose: this.STATUS.NOT_STARTED
        };
        this.poses = [];
        this.chunkCount = 0;
        this.callbacks = callbacks;
    }
    startRecording() {
        this.sessionId = this.uuidTimeShort();
        this.chunkCount = 0;
        this.isRecording = true;
        // fileManager setup persistent data and directories

        this.spawnProcesses();
        this.waitUntilNextChunk();
    }
    // restart every 15 seconds (unless socket disconnected, just process data and stop)
    waitUntilNextChunk() {
        setTimeout(_ => {
            this.stopProcesses();
            if (this.processStatuses.color !== this.STATUS.DISCONNECTED &&
                this.processStatuses.color !== this.STATUS.STOPPED) {
                setTimeout(_ => {
                    this.recordNextChunk();
                }, 10); // not sure if this delay is necessary between chunks but doesnt seem unreasonable
            }
        }, constants.SEGMENT_LENGTH);
    }
    recordNextChunk() {
        this.chunkCount += 1;
        this.isRecording = true;

        this.spawnProcesses();
        this.waitUntilNextChunk();
    }
    spawnProcesses() {
        let index = this.chunkCount;

        // start color stream process
        // depth images are 1920x1080 lossy JPG images
        let chunkTimestamp = Date.now();
        let colorFilename = 'chunk_' + this.sessionId + '_' + index + '_' + chunkTimestamp + '.' + constants.COLOR_FILETYPE;
        let colorOutputPath = path.join(VideoFileManager.outputPath, this.deviceId, constants.DIR_NAMES.unprocessed_chunks, constants.DIR_NAMES.color, colorFilename);
        this.processes.color = ffmpegInterface.ffmpeg_image2mp4(colorOutputPath, constants.RECORDING_FPS, 'mjpeg', constants.COLOR_WIDTH, constants.COLOR_HEIGHT, constants.COLOR_CRF, constants.COLOR_SCALE);
        if (this.processes.color) {
            this.processStatuses.color = this.STATUS.STARTED;
        }

        // start depth stream process
        // depth images are 256x144 lossless PNG buffers
        let depthFilename = 'chunk_' + this.sessionId + '_' + index + '_' + chunkTimestamp + '.' + constants.DEPTH_FILETYPE;
        let depthOutputPath = path.join(VideoFileManager.outputPath, this.deviceId, constants.DIR_NAMES.unprocessed_chunks, constants.DIR_NAMES.depth, depthFilename);
        this.processes.depth = ffmpegInterface.ffmpeg_image2mp4(depthOutputPath, constants.RECORDING_FPS, 'png', constants.DEPTH_WIDTH, constants.DEPTH_HEIGHT, constants.DEPTH_CRF, constants.DEPTH_SCALE);
        // this.processes[deviceId][this.PROCESS.DEPTH] = ffmpeg_image2losslessVideo(depthOutputPath, 10, 'png', 256, 144); // this version isn't working as reliably
        if (this.processes.depth) {
            this.processStatuses.depth = this.STATUS.STARTED;
        }

        this.processStatuses.pose = this.STATUS.STARTED;
        this.poses = [];
    }
    onFrame(rgb, depth, pose) {
        if (!this.isRecording) { return; }

        if (this.processes.color && this.processStatuses.color === this.STATUS.STARTED) {
            this.processes.color.stdin.write(rgb);
        }
        if (this.processes.depth && this.processStatuses.depth === this.STATUS.STARTED) {
            this.processes.depth.stdin.write(depth);
        }
        if (this.processStatuses.pose === this.STATUS.STARTED) {
            this.poses.push({
                pose: pose.toString('base64'),
                time: Date.now()
            });
        }
    }
    stopProcesses() {
        this.isRecording = false;

        if (this.processes.color !== 'undefined' && this.processStatuses.color === this.STATUS.STARTED) {
            console.log('end color process');
            this.processes.color.stdin.setEncoding('utf8');
            this.processes.color.stdin.write('q');
            this.processes.color.stdin.end();
            this.processStatuses.color = this.STATUS.ENDING;
        }

        if (this.processes.depth !== 'undefined' && this.processStatuses.depth === this.STATUS.STARTED) {
            console.log('end depth process');
            this.processes.depth.stdin.setEncoding('utf8');
            this.processes.depth.stdin.write('q');
            this.processes.depth.stdin.end();
            this.processStatuses.depth = this.STATUS.ENDING;
        }

        if (this.processStatuses.pose === this.STATUS.STARTED) {
            console.log('end pose process');
            this.processStatuses.pose = this.STATUS.ENDING;

            // immediately write the poses from memory to storage, and reset the poses in memory
            let index = this.chunkCount;
            let poseFilename = 'chunk_' + this.sessionId + '_' + index + '_' + Date.now() + '.json';
            let poseOutputPath = path.join(VideoFileManager.outputPath, this.deviceId, constants.DIR_NAMES.unprocessed_chunks, 'pose', poseFilename);
            fs.writeFileSync(poseOutputPath, JSON.stringify(this.poses));
            this.poses = [];
        }
    }
    stopRecording(didDisconnect) {
        if (!this.isRecording) { return; }

        this.stopProcesses();

        if (didDisconnect) {
            this.processStatuses.color = this.STATUS.DISCONNECTED;
            this.processStatuses.depth = this.STATUS.DISCONNECTED;
            this.processStatuses.pose = this.STATUS.DISCONNECTED;
        } else {
            this.processStatuses.color = this.STATUS.STOPPED;
            this.processStatuses.depth = this.STATUS.STOPPED;
            this.processStatuses.pose = this.STATUS.STOPPED;
        }

        // when the video processes are done, other modules can do what they'd like with it
        if (this.callbacks.recordingDone) {
            this.callbacks.recordingDone(this.deviceId, this.sessionId, this.chunkCount);
        }
    }
    uuidTimeShort() {
        var dateUuidTime = new Date();
        var abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var stampUuidTime = parseInt('' + dateUuidTime.getMilliseconds() + dateUuidTime.getMinutes() + dateUuidTime.getHours() + dateUuidTime.getDay()).toString(36);
        while (stampUuidTime.length < 8) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
        return stampUuidTime;
    }
}
