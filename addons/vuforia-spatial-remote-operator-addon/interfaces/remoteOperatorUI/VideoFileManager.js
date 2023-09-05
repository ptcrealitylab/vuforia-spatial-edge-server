const fs = require('fs');
const path = require('path');
const constants = require('./videoConstants');
const utils = require('./utilities');

/**
 * @fileOverview
 * The VideoFileManager is initialized with an outputPath where all video recordings and their derivatives are stored,
 * and contains a variety of utilities for reading and writing the files to a specific nested file structure,
 * and to convert this into a json blob containing the file tree (the persistentInfo).
 * All state is reconstructed from the file structure when the server restarts.
 */

let outputPath = null;
let persistentInfo = null;

const createMissingDirs = (devicePath) => {
    utils.mkdirIfNeeded(devicePath, true);
    let dir = constants.DIR_NAMES;

    let sessionVideosPath = path.join(devicePath, dir.session_videos);
    let unprocessedChunksPath = path.join(devicePath, dir.unprocessed_chunks);
    let processedChunksPath = path.join(devicePath, dir.processed_chunks);

    [dir.color, dir.depth, dir.pose].forEach(name => {
        utils.mkdirIfNeeded(path.join(sessionVideosPath, name), true);
        utils.mkdirIfNeeded(path.join(unprocessedChunksPath, name), true);
        utils.mkdirIfNeeded(path.join(processedChunksPath, name), true);
    });
};

const parseDeviceDirectory = (devicePath) => {
    let info = {};
    createMissingDirs(devicePath);

    // add fully-concatenated color and depth videos
    let sessionVideosPath = path.join(devicePath, constants.DIR_NAMES.session_videos);
    fs.readdirSync(path.join(sessionVideosPath, constants.DIR_NAMES.color)).forEach(filepath => {
        let sessionId = getSessionIdFromFilename(filepath, 'session_');
        if (sessionId && sessionId.length === 8) {
            if (typeof info[sessionId] === 'undefined') {
                info[sessionId] = {};
            }
            info[sessionId].color = filepath;

            if (fs.existsSync(path.join(sessionVideosPath, constants.DIR_NAMES.depth, filepath))) {
                info[sessionId].depth = filepath;
            }
        }
    });
    // append pose data separately from logic for color, since pose may be available before color & depth
    fs.readdirSync(path.join(sessionVideosPath, 'pose')).forEach(filepath => {
        let sessionId = getSessionIdFromFilename(filepath, 'session_');
        if (sessionId && sessionId.length === 8) {
            if (typeof info[sessionId] === 'undefined') {
                info[sessionId] = {};
            }
            info[sessionId].pose = filepath;
        }
    });

    // add the list of chunks (processed and unprocessed) to the json output
    [constants.DIR_NAMES.processed_chunks, constants.DIR_NAMES.unprocessed_chunks].forEach(dirName => {
        let thisPath = path.join(devicePath, dirName);
        fs.readdirSync(path.join(thisPath, constants.DIR_NAMES.color)).forEach(filepath => { // do for color, but check for depth within the block to ensure both exist
            let sessionId = getSessionIdFromFilename(filepath, 'chunk_');
            if (sessionId && sessionId.length === 8) {
                if (typeof info[sessionId] === 'undefined') {
                    info[sessionId] = {};
                }
                if (typeof info[sessionId][dirName] === 'undefined') {
                    info[sessionId][dirName] = [];
                }
                if (fs.existsSync(path.join(thisPath, constants.DIR_NAMES.depth, filepath))) {
                    info[sessionId][dirName].push(filepath);
                }
            }
        });
    });

    return info;
};

const getSessionIdFromFilename = (filename, prefix) => {
    let re = new RegExp(prefix + '[a-zA-Z0-9]{8}');
    let matches = filename.match(re);
    if (!matches || matches.length === 0) { return null; }
    return (prefix ? matches[0].replace(prefix, '') : matches[0]);
};

const getNestedFilePaths = (deviceId, dirName, colorOrDepth) => {
    if (!outputPath) { console.warn('You never called initWithOutputPath on VideoFileManager'); }

    let dirPath = path.join(outputPath, deviceId, dirName, colorOrDepth);
    utils.mkdirIfNeeded(dirPath, true);
    let filetype = '.' + ((colorOrDepth === constants.DIR_NAMES.depth) ? constants.DEPTH_FILETYPE : constants.COLOR_FILETYPE);
    return fs.readdirSync(dirPath).filter(filename => filename.includes(filetype));
};

const deleteChunksForSession = (deviceId, sessionId) => {
    if (!outputPath) { console.warn('You never called initWithOutputPath on VideoFileManager'); }

    let counter = 0;
    [constants.DIR_NAMES.unprocessed_chunks, constants.DIR_NAMES.processed_chunks].forEach(dirName => {
        [constants.DIR_NAMES.color, constants.DIR_NAMES.depth].forEach(colorOrDepth => {
            getNestedFilePaths(deviceId, dirName, colorOrDepth).filter(path => {
                return path.includes(sessionId);
            }).map(filename => {
                return path.join(outputPath, deviceId, dirName, colorOrDepth, filename);
            }).forEach(chunkPath => {
                fs.rmSync(chunkPath);
                counter++;
            });
        });
    });
    if (counter > 0) {
        console.log('deleted ' + counter + ' leftover video chunk files for recorded video ' + sessionId);
    }
};

module.exports = {
    initWithOutputPath: (path) => {
        outputPath = path;
        utils.mkdirIfNeeded(path, true);
    },
    createMissingDirs: createMissingDirs,
    // we rebuild the json blob each time by parsing the filesystem, so this is stored mainly as a means for other systems to retrieve the data
    buildPersistentInfo: () => {
        if (!outputPath) { console.warn('You never called initWithOutputPath on VideoFileManager'); }

        let info = {};
        // each folder in outputPath is a device
        // check that folder's session_videos, processed_chunks, and unprocessed_chunks to determine how many sessions there are and what state they're in
        fs.readdirSync(outputPath).filter((filename) => {
            let isHidden = filename[0] === '.';
            return fs.statSync(path.join(outputPath, filename)).isDirectory() && !isHidden;
        }).forEach(deviceDirName => {
            info[deviceDirName] = parseDeviceDirectory(path.join(outputPath, deviceDirName));
        });
        persistentInfo = info;
    },
    savePersistentInfo: () => {
        if (!outputPath) { console.warn('You never called initWithOutputPath on VideoFileManager'); }

        let jsonPath = path.join(outputPath, 'videoInfo.json');
        fs.writeFileSync(jsonPath, JSON.stringify(persistentInfo, null, 4));
        console.log('saved recorded video metadata to ' + jsonPath);
    },
    getUnprocessedChunkFilePaths: (deviceId, colorOrDepth = constants.DIR_NAMES.color) => {
        return getNestedFilePaths(deviceId, constants.DIR_NAMES.unprocessed_chunks, colorOrDepth);
    },
    getProcessedChunkFilePaths: (deviceId, colorOrDepth = constants.DIR_NAMES.color) => {
        return getNestedFilePaths(deviceId, constants.DIR_NAMES.processed_chunks, colorOrDepth);
    },
    getSessionFilePaths: (deviceId, colorOrDepth = constants.DIR_NAMES.color) => {
        return getNestedFilePaths(deviceId, constants.DIR_NAMES.session_videos, colorOrDepth);
    },
    deleteLeftoverChunks(deviceId) {
        let colorSessionPaths = module.exports.getSessionFilePaths(deviceId, constants.DIR_NAMES.color);
        let depthSessionPaths = module.exports.getSessionFilePaths(deviceId, constants.DIR_NAMES.depth);
        colorSessionPaths.forEach(path => {
            if (depthSessionPaths.includes(path)) {
                let sessionId = getSessionIdFromFilename(path, 'session_');
                deleteChunksForSession(deviceId, sessionId);
            }
        });
    },
    get outputPath() { return outputPath; },
    get persistentInfo() { return persistentInfo; }
};
