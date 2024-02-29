/**
 * Recorder
 *
 * Tracks changes to the global `objects` variable, saving them to a compressed
 * json file periodically or during the shutdown of the server.
 *
 *
 * The recorder is started with initRecorder then will saveState to update its
 * internal log and persistToFile to persist this log to a file. The async
 * function stop() allows the server to signal the recorder to stop and
 * persist.
 */

const fs = require('fs');
const fsProm = require('../persistence/fsProm.js');
const path = require('path');
const zlib = require('zlib');

const {objectsPath} = require('../config.js');

const logsPath = path.join(objectsPath, '.objectLogs');

const PERSIST_DELAY_MS = 10 * 60 * 1000;

let recorder = {};
recorder.frameRate = 10;
recorder.object = {};
// TODO: could read objectOld from last-saved log file
recorder.objectOld = {};
// Map from time to difference between object and objectOld
recorder.timeObject = {};
recorder.intervalSave = null;
recorder.intervalPersist = null;
recorder.logsPath = logsPath;

let hasPersistedToFile = false;

recorder.initRecorder = function (object) {
    recorder.object = object;
    recorder.start();
};

recorder.clearIntervals = function() {
    if (recorder.intervalSave) {
        clearInterval(recorder.intervalSave);
        recorder.intervalSave = null;
    }
    if (recorder.intervalPersist) {
        clearInterval(recorder.intervalPersist);
        recorder.intervalPersist = null;
    }
};

recorder.start = function () {
    recorder.objectOld = {};
    recorder.clearIntervals();
    recorder.intervalSave = setInterval(recorder.saveState, 1000 / recorder.frameRate);
    recorder.intervalPersist = setInterval(recorder.persistToFile, PERSIST_DELAY_MS);
};

recorder.stop = async function () {
    recorder.clearIntervals();

    await recorder.persistToFile();
};

/**
 * @return {string} current externally visible (uncompressed) log file name
 * that would be used if the log were to persistToFile
 */
recorder.getCurrentLogName = function() {
    const allTimes = Object.keys(recorder.timeObject);
    if (allTimes.length === 0) {
        allTimes.push(Date.now());
    }
    const timeString = allTimes[0] + '-' + allTimes[allTimes.length - 1];
    return 'objects_' + timeString + '.json';
};

recorder.getAndGuaranteeOutputFilename = function(logName) {
    const outputFilename = path.join(logsPath, logName + '.gz');

    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, '0766');
    }

    return outputFilename;
};

/**
 * Persist current state to file, skipping if no differences recorded since last persist
 * @return {Promise<string|null>} log file name
 */
recorder.persistToFile = function () {
    // recorder.objectOld is the latest state persisted in timeObject
    // Because we're using objectOld as the basis for each log file, having
    // only one entry in timeObject means `object` never had a difference from
    // `objectOld` and we can skip writing to the file.
    if (Object.keys(recorder.timeObject).length <= 1 && hasPersistedToFile) {
        return Promise.resolve(null);
    }

    hasPersistedToFile = true;

    let logName = recorder.getCurrentLogName();
    let timeObjectStr = JSON.stringify(recorder.timeObject);
    recorder.timeObject = {
        [Date.now()]: JSON.parse(JSON.stringify(recorder.objectOld)),
    };

    return new Promise((resolve, reject) => {
        let outputFilename;
        try {
            outputFilename = recorder.getAndGuaranteeOutputFilename(logName);
        } catch (err) {
            console.error('Log dir creation failed', err);
            reject(err);
            return;
        }

        zlib.gzip(timeObjectStr, async function(err, buffer) {
            if (err) {
                console.error('Log compress failed', err);
                reject(err);
                return;
            }
            try {
                await fsProm.writeFile(outputFilename, buffer);
            } catch (writeErr) {
                console.error('Log persist failed', writeErr);
                reject(writeErr);
                return;
            }
            resolve(logName);
        });
    });
};

/**
 * @return {string|null} log file name
 */
recorder.persistToFileSync = function() {
    if (Object.keys(recorder.timeObject).length <= 1 && hasPersistedToFile) {
        return null;
    }

    hasPersistedToFile = true;

    let logName = recorder.getCurrentLogName();
    let timeObjectStr = JSON.stringify(recorder.timeObject);
    recorder.timeObject = {
        [Date.now()]: JSON.parse(JSON.stringify(recorder.objectOld)),
    };

    let outputFilename = recorder.getAndGuaranteeOutputFilename(logName);

    const buffer = zlib.gzipSync(timeObjectStr);
    fs.writeFileSync(outputFilename, buffer);
    return logName;
};

/**
 * @param {number|undefined} time - optional time at which this state was observed
 */
recorder.saveState = function (time) {
    if (typeof time === 'undefined') {
        time = Date.now();
    }
    let timeObject = recorder.timeObject[time] = {};
    recorder.recurse(recorder.object, recorder.objectOld, timeObject);
    if (Object.keys(timeObject).length === 0) delete recorder.timeObject[time];
};

let pendingUpdate = null;
recorder.update = function() {
    if (pendingUpdate) {
        return;
    }
    pendingUpdate = setTimeout(() => {
        recorder.saveState();
        pendingUpdate = null;
    }, 0);
};

/**
 * @param {object} timeObject - object with keys
 * representing sorted-increasing timestamps
 * @param {number} targetTime
 * @param {object|undefined} checkpoint
 */
recorder.replay = function(timeObject, targetTime, checkpoint) {
    let times = Object.keys(timeObject).map(t => parseInt(t));

    let objects = JSON.parse(JSON.stringify(timeObject[times[0]]));
    let currentTime = times[0];
    if (checkpoint && checkpoint.time <= targetTime) {
        objects = checkpoint.objects;
        currentTime = checkpoint.time;
    }

    for (let time of times) {
        if (currentTime >= time) {
            continue;
        }
        if (time > targetTime) {
            break;
        }

        recorder.applyDiff(objects, timeObject[time]);
    }

    return objects;
};

function applyDiffRecur(objects, diff) {
    let diffKeys = Object.keys(diff);
    for (let key of diffKeys) {
        if (diff[key] === null) {
            continue; // JSON encodes undefined as null so just skip (problem if we try to encode null)
        }
        if (typeof diff[key] === 'object') {
            // Fill in missing properties with objects of the correct type
            if (!objects.hasOwnProperty(key)) {
                if (Array.isArray(diff[key])) {
                    objects[key] = [];
                } else {
                    objects[key] = {};
                }
            }
            applyDiffRecur(objects[key], diff[key]);
            continue;
        }
        objects[key] = diff[key];
    }
}

recorder.applyDiff = function(objects, diff) {
    applyDiffRecur(objects, diff);
};

/**
 * @param {object} cursorObj - view into recorder.object
 * @param {object} cursorObjOld - view into recorder.objectOld
 * @param {object} cursorTime - view into the time object
 *                 between recorder.object and recorder.objectOld
 * @return {boolean} whether the recursion detected a change
 */
recorder.recurse = function (cursorObj, cursorObjOld, cursorTime) {
    let altered = false;
    for (const key in cursorObj) { // works for objects and arrays
        if (!cursorObj.hasOwnProperty(key)) {
            // Ignore inherited enumerable properties
            continue;
        }
        // Ignore the special whole_pose property which duplicates changes to
        // individual joint frame matrices
        if (key === 'whole_pose') {
            continue;
        }
        if (key.includes('_AVATAR_')) {
            continue;
        }

        const item = cursorObj[key];

        if (typeof item === 'object') {
            let potentialItemTime;

            if (Array.isArray(item)) {
                potentialItemTime = [];
                if (!cursorObjOld.hasOwnProperty(key)) {
                    cursorObjOld[key] = [];
                }
            } else {
                potentialItemTime = {};
                if (!cursorObjOld.hasOwnProperty(key)) {
                    cursorObjOld[key] = {};
                }
            }
            let alteredChild = recorder.recurse(cursorObj[key], cursorObjOld[key], potentialItemTime);
            if (alteredChild) {
                cursorTime[key] = potentialItemTime;
                altered = true;
            }
        } else {
            if (item === undefined) {
                continue;
            }

            if (item !== cursorObjOld[key]) {
                cursorTime[key] = item;
                altered = true;
            }

            cursorObjOld[key] = item;
        }
    }
    return altered;
};

module.exports = recorder;
