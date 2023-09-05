const fs = require('fs');
const path = require('path');
const ffmpegInterface = require('./ffmpegInterface');
const VideoFileManager = require('./VideoFileManager');
const VideoProcessManager = require('./VideoProcessManager');
const constants = require('./videoConstants');
const utils = require('./utilities');

/**
 * @fileOverview
 * The VideoServer handles logic to record point cloud videos captured by the streamRouter
 * It passes messages to the VideoProcessManager (onConnection, onDisconnection, startRecording, stopRecording, onFrame)
 * and it utilizes the VideoFileManager to save the recorded video chunks (and json poses) to a nested directory at the outputPath
 *
 * Recorded videos pass through three stages:
 * 1. unprocessed_chunks: these are 15 second video segments created on a rolling basis while the video is recording
 * 2. processed_chunks: when the video has stopped recording, chunks have an optional post-processing step and are copied here
 * 3. session_videos: when all chunks have been processed, they are concatenated into a final video here
 *
 * RGB and depth videos are created with ffmpeg child processes. Parameters can be configured in videoConstants and ffmpegInterface.
 * Poses are written to json files as a list of timestamped base64-encoded matrices.
 *
 * Metadata for all recordings can be accessed at localhost:8081/virtualizer_recordings
 */
class VideoServer {
    constructor(outputPath) {
        this.outputPath = outputPath;
        console.log('Created a VideoServer with path: ' + this.outputPath);

        VideoFileManager.initWithOutputPath(outputPath);
        // we rebuild/save the persistentInfo on server restart so that it doesn't get out-of-sync with filesystem state
        VideoFileManager.buildPersistentInfo();
        VideoFileManager.savePersistentInfo();

        // the process manager is mostly self-sufficient at creating the recordings, but we need to know when it's done.
        // it records in 15 second chunks, and when it's done we concatenate the chunks together
        VideoProcessManager.setRecordingDoneCallback(this.onRecordingDone.bind(this));

        // each time the server restarts, we check for chunks that were never concatenated and try to concat them into finished videos
        // this way, if the server unexpectedly stops while the videos are processing, they can be recovered
        Object.keys(VideoFileManager.persistentInfo).forEach(deviceId => {
            this.concatChunksIntoSessionVideo(deviceId);
        });

        // this copies over chunk files from unprocessed_chunks to processed_chunks
        // processed_chunks is a way to future-proof the system such that if we want to do any post-processing of the
        // chunk files, we have a place to reliably do that before making the videos available to the system in a concatenated form
        // for example, we can rescale each chunk to a certain length or re-encode them based on info we have only after all the chunks have been recorded
        Object.keys(VideoFileManager.persistentInfo).forEach(deviceId => {
            this.processUnprocessedChunks(deviceId);
        });

        // after chunks have been concatenated into a session video, we can delete them
        Object.keys(VideoFileManager.persistentInfo).forEach(deviceId => {
            VideoFileManager.deleteLeftoverChunks(deviceId);
        });
    }
    startRecording(deviceId) {
        VideoFileManager.createMissingDirs(path.join(this.outputPath, deviceId));
        VideoProcessManager.startRecording(deviceId);
    }
    stopRecording(deviceId) {
        VideoProcessManager.stopRecording(deviceId);
    }
    onConnection(deviceId) {
        VideoProcessManager.onConnection(deviceId);
    }
    onDisconnection(deviceId) {
        VideoProcessManager.onDisconnection(deviceId);
    }
    onFrame(rgb, depth, pose, deviceId) {
        VideoProcessManager.onFrame(rgb, depth, pose, deviceId);
    }
    // TODO: this could be optimized by listening for files to finish writing, rather than waiting a fixed time
    onRecordingDone(deviceId, sessionId, lastChunkIndex) {
        setTimeout(() => { // wait for final video to finish processing
            utils.mkdirIfNeeded(path.join(this.outputPath, deviceId, 'tmp'), true);
            let tmpOutputPath = path.join(this.outputPath, deviceId, 'tmp', sessionId + '_done_' + lastChunkIndex + '.json');
            fs.writeFileSync(tmpOutputPath, JSON.stringify({ success: true}));

            this.processUnprocessedChunks(deviceId);

            // try concatenating after a longer delay. if not all chunks have finished processing by then...
            // ...the chunk count won't match up and it will skip concatenating for now...
            // ...it will reattempt each time you restart the server.
            setTimeout(() => {
                console.log('try to concat rescaled videos after waiting awhile after recording stopped');
                VideoFileManager.buildPersistentInfo(); // recompile persistent info so session metadata contains new chunks
                this.concatChunksIntoSessionVideo(deviceId);
            }, 1000 * (lastChunkIndex + 1)); // delay 1 second per chunk we need to process, should give plenty of time
        }, 5000);
    }
    concatChunksIntoSessionVideo(deviceId) {
        if (!fs.existsSync(path.join(this.outputPath, deviceId))) {
            console.log('concat, dir doesnt exist', path.join(this.outputPath, deviceId));
            return;
        }

        // we use a tmp text file as a lock to ensure that all of the unprocessed chunks are represented in the processed chunks
        let tmpFiles = [];
        if (fs.existsSync(path.join(this.outputPath, deviceId, 'tmp'))) {
            tmpFiles = fs.readdirSync(path.join(this.outputPath, deviceId, 'tmp'));
        }

        let sessions = VideoFileManager.persistentInfo[deviceId];
        Object.keys(sessions).forEach(sessionId => {
            let s = sessions[sessionId];
            if (s.color && s.depth && s.pose) { return; }
            if (s.processed_chunks && s.processed_chunks.length > 0) {
                let matchingFiles = tmpFiles.filter(filename => { return filename.includes(sessionId + '_done'); });
                let tmpFilename = matchingFiles.length > 0 ? matchingFiles[0] : null;
                if (tmpFilename) {
                    let numberOfChunks = parseInt(tmpFilename.match(/_\d+.json/)[0].match(/\d+/)[0]) + 1;
                    console.log(deviceId + ':' + sessionId + ' should have ' + numberOfChunks + ' chunks');
                    if (s.processed_chunks.length !== numberOfChunks && s.unprocessed_chunks.length === numberOfChunks) {
                        console.log('there are some unprocessed chunks not present in the processed chunks', s.processed_chunks.length, s.unprocessed_chunks.length);
                        return; // skip concatenating this session
                    }
                }

                console.log('time to concatenate!');

                if (!s.color) { s.color = this.concatFiles(deviceId, sessionId, constants.DIR_NAMES.color, s.processed_chunks); }
                if (!s.depth) { s.depth = this.concatFiles(deviceId, sessionId, constants.DIR_NAMES.depth, s.processed_chunks); }
                if (!s.pose) { s.pose = this.concatPosesIfNeeded(deviceId, sessionId); }
            }
        });

        VideoFileManager.savePersistentInfo();
    }
    extractTimeInformation(fileList) { // we could also probably just use the SEGMENT_LENGTH * fileList.length, but this works too
        let fileRecordingTimes = fileList.map(filename => parseInt(filename.match(/[0-9]{13,}/))); // extract timestamp
        let firstTimestamp = Math.min(...fileRecordingTimes) - constants.SEGMENT_LENGTH; // estimate, since this is at the end of the first video
        let lastTimestamp = Math.max(...fileRecordingTimes);
        return {
            start: firstTimestamp,
            end: lastTimestamp,
            duration: lastTimestamp - firstTimestamp
        };
    }
    concatFiles(deviceId, sessionId, colorOrDepth = constants.DIR_NAMES.color, files) {
        // passing a list of videos into ffmpeg is most easily done with a txt file listing the files in a specific format
        let fileText = '';
        for (let i = 0; i < files.length; i++) {
            fileText += 'file \'' + path.join(this.outputPath, deviceId, constants.DIR_NAMES.processed_chunks, colorOrDepth, files[i]) + '\'\n';
        }

        // write file list to txt file so it can be used by ffmpeg as input
        let txt_filename = colorOrDepth + '_filenames_' + sessionId + '.txt';
        utils.mkdirIfNeeded(path.join(this.outputPath, deviceId, 'tmp'), true);
        let txtFilePath = path.join(this.outputPath, deviceId, 'tmp', txt_filename);
        if (fs.existsSync(txtFilePath)) {
            fs.unlinkSync(txtFilePath);
        }
        fs.writeFileSync(txtFilePath, fileText);

        let filetype = (colorOrDepth === constants.DIR_NAMES.depth) ? constants.DEPTH_FILETYPE : constants.COLOR_FILETYPE;
        // we store the video timestamp directly in its filename, so this info never gets lost
        let timeInfo = this.extractTimeInformation(files);
        let filename = 'device_' + deviceId + '_session_' + sessionId + '_start_' + timeInfo.start + '_end_' + timeInfo.end + '.' + filetype;
        let outputPath = path.join(this.outputPath, deviceId, constants.DIR_NAMES.session_videos, colorOrDepth, filename);
        ffmpegInterface.ffmpeg_concat_mp4s(outputPath, txtFilePath);

        return filename;
    }
    concatPosesIfNeeded(deviceId, sessionId) {
        // check if output file exists for this device/session pair
        let filename = 'device_' + deviceId + '_session_' + sessionId + '.json';
        let outputPath = path.join(this.outputPath, deviceId, constants.DIR_NAMES.session_videos, 'pose', filename);
        if (fs.existsSync(outputPath)) {
            return filename; // already exists, return early
        }
        console.log('we still need to process poses for ' + deviceId + ' (session ' + sessionId + ')');

        // load all pose chunks. each is a json file with a timestamped list of poses for 15 seconds of the video
        let files = fs.readdirSync(path.join(this.outputPath, deviceId, constants.DIR_NAMES.unprocessed_chunks, 'pose'));
        files = files.filter(filename => {
            return filename.includes(sessionId);
        });
        console.log('unprocessed pose chunks: ', files);

        // the concatenated file contains a correctly-ordered array with all of the poses from each chunk's array
        let poseData = [];
        files.forEach(filename => {
            let filePath = path.join(this.outputPath, deviceId, constants.DIR_NAMES.unprocessed_chunks, 'pose', filename);
            poseData.push(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
        });
        let flattened = poseData.flat();
        fs.writeFileSync(outputPath, JSON.stringify(flattened));

        return filename;
    }
    processUnprocessedChunks(deviceId) {
        let unprocessedPath = path.join(this.outputPath, deviceId, constants.DIR_NAMES.unprocessed_chunks);
        let processedPath = path.join(this.outputPath, deviceId, constants.DIR_NAMES.processed_chunks);
        let fileMap = {
            color: {
                processed: VideoFileManager.getProcessedChunkFilePaths(deviceId, constants.DIR_NAMES.color),
                unprocessed: VideoFileManager.getUnprocessedChunkFilePaths(deviceId, constants.DIR_NAMES.color)
            },
            depth: {
                processed: VideoFileManager.getProcessedChunkFilePaths(deviceId, constants.DIR_NAMES.depth),
                unprocessed: VideoFileManager.getUnprocessedChunkFilePaths(deviceId, constants.DIR_NAMES.depth)
            }
        };

        Object.keys(fileMap).forEach(colorOrDepth => {
            let filesToScale = [];

            // ignore any video chunks that are corrupted (~0 bytes), perhaps due to stopping recording before it wrote any frames
            fileMap[colorOrDepth].unprocessed.forEach(filename => {
                let timestamp = filename.match(/[0-9]{13,}/);
                if (!fileMap[colorOrDepth].processed.some(resizedFilename => resizedFilename.includes(timestamp))) {
                    let colorFilename = filename.replace(/\.[^/.]+$/, '') + '.' + constants.COLOR_FILETYPE;
                    let depthFilename = filename.replace(/\.[^/.]+$/, '') + '.' + constants.DEPTH_FILETYPE;
                    let colorFilePath = path.join(unprocessedPath, constants.DIR_NAMES.color, colorFilename);
                    let depthFilePath = path.join(unprocessedPath, constants.DIR_NAMES.depth, depthFilename);
                    if (fs.existsSync(colorFilePath) && fs.existsSync(depthFilePath)) {
                        let byteSizeColor = fs.statSync(colorFilePath).size;
                        let byteSizeDepth = fs.statSync(depthFilePath).size;
                        if (byteSizeColor > 48 && byteSizeDepth > 48) {
                            filesToScale.push(filename);
                        } else {
                            console.log('skipping ' + filename + ' due to incomplete size');
                        }
                    }
                }
            });

            // note: why is ffmpeg_adjust_length (sometimes) part of the process:
            // the incoming image stream, while it approximates 10 fps, is not exactly that.
            // so the resulting "15 second" chunks are sometimes 8 seconds, sometimes 10, etc.
            // one way to fix this time warping is to rescale each chunk to be 15 seconds exactly.
            // the other method (currently used) is to leave the chunks as-is, and correct it in the video playback system:
            // use the timestamps stored in the filename, rather than the length of the video, during playback

            // either copy the files directly to processed_chunks, or do some postprocessing (like ffmpeg_adjust_length)
            filesToScale.forEach(filename => {
                let inputPath = path.join(unprocessedPath, colorOrDepth, filename);
                let outputPath = path.join(processedPath, colorOrDepth, filename);
                if (constants.RESCALE_VIDEOS) {
                    ffmpegInterface.ffmpeg_adjust_length(outputPath, inputPath, constants.SEGMENT_LENGTH / 1000);
                } else {
                    fs.copyFileSync(inputPath, outputPath, fs.constants.COPYFILE_EXCL);
                }
            });
        });
    }
}

module.exports = VideoServer;
