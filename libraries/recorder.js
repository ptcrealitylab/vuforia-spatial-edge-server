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

const frameRate = 10;
let object = {};
/**
 * Last state of `object` saved to `timeObject`
 * TODO: could read objectOld from last-saved log file
 */
let objectOld = {};
// Map from time to difference between object and objectOld
let timeObject = {};
let intervalSave = null;
let intervalPersist = null;

let hasPersistedToFile = false;

/**
 * Initialize recorder to track changes to `objectInit`
 * @param {object} objectInit
 */
function initRecorder(objectInit) {
    object = objectInit;
    start();
}

/**
 * Clear all intervals from the recorder
 */
function clearIntervals() {
    if (intervalSave) {
        clearInterval(intervalSave);
        intervalSave = null;
    }
    if (intervalPersist) {
        clearInterval(intervalPersist);
        intervalPersist = null;
    }
}

/**
 * Start the recorder, periodically saving and persisting state of
 * `object`
 */
function start() {
    objectOld = {};
    clearIntervals();
    intervalSave = setInterval(saveState, 1000 / frameRate);
    intervalPersist = setInterval(persistToFile, PERSIST_DELAY_MS);
}

/**
 * Halt and persist recorder state
 */
async function stop() {
    clearIntervals();

    await persistToFile();
}

/**
 * @return {string} current externally visible (uncompressed) log file name
 * that would be used if the log were to persistToFile
 */
function getCurrentLogName() {
    const allTimes = Object.keys(timeObject);
    if (allTimes.length === 0) {
        allTimes.push(Date.now());
    }
    const timeString = allTimes[0] + '-' + allTimes[allTimes.length - 1];
    return 'objects_' + timeString + '.json';
}

/**
 * Determines the full filename for `logName` and ensures it can be written to
 * @return {string} output filename
 */
function getAndGuaranteeOutputFilename(logName) {
    const outputFilename = path.join(logsPath, logName + '.gz');

    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, '0766');
    }

    return outputFilename;
}

/**
 * Get all log data that needs to be persisted and how to identify it. Mark all
 * of this claimed log data as persisted, removing it from the timeObject
 * @return {{logName: string, timeObjectStr: string}|null}
 */
function getAndMarkPersistedCurrentLog() {
    // objectOld is the latest state persisted in timeObject
    // Because we're using objectOld as the basis for each log file, having
    // only one entry in timeObject means `object` never had a difference from
    // `objectOld` and we can skip writing to the file.
    let recordedTimes = Object.keys(timeObject);

    // Nothing recorded
    if (recordedTimes.length === 0) {
        return null;
    }

    // Only one update, can ignore if we've already persisted (since the one
    // update is the last persisted state)
    if (recordedTimes.length <= 1 && hasPersistedToFile) {
        return null;
    }

    // Disregard future persistToFile calls if they have no updates
    hasPersistedToFile = true;

    let logName = getCurrentLogName();
    let timeObjectStr = JSON.stringify(timeObject);

    // Use the lastRecordedTime for a seamless view of history
    // Last log file was |start-----lastRecordedTime| we now start
    // |lastRecordedTime----
    const lastRecordedTime = recordedTimes.at(-1);
    timeObject = {
        [lastRecordedTime]: JSON.parse(JSON.stringify(objectOld)),
    };

    return {logName, timeObjectStr};
}

/**
 * Persist current state to file, skipping if no differences recorded since last persist
 * @return {Promise<string|null>} log file name
 */
function persistToFile() {
    const currentLog = getAndMarkPersistedCurrentLog();

    if (!currentLog) {
        return Promise.resolve(null);
    }

    const {logName, timeObjectStr} = currentLog;

    return new Promise((resolve, reject) => {
        let outputFilename;
        try {
            outputFilename = getAndGuaranteeOutputFilename(logName);
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
}

/**
 * Synchronous version of persistToFile
 * @return {string|null} log file name
 */
function persistToFileSync() {
    const currentLog = getAndMarkPersistedCurrentLog();
    if (!currentLog) {
        return null;
    }

    const {logName, timeObjectStr} = currentLog;

    let outputFilename = getAndGuaranteeOutputFilename(logName);

    const buffer = zlib.gzipSync(timeObjectStr);
    fs.writeFileSync(outputFilename, buffer);
    return logName;
}

/**
 * @param {number|undefined} time - optional time at which this state was observed
 */
function saveState(time) {
    if (typeof time === 'undefined') {
        time = Date.now();
    }
    if (timeObject[time]) {
        console.warn('duplicate saveState at time', time);
        return;
    }
    timeObject[time] = {};
    recurse(object, objectOld, timeObject[time]);
    if (Object.keys(timeObject).length === 0) delete timeObject[time];
}

/**
 * saveState unless a saveState has already been requested. Notably will
 * debounce and only saveState once if update() is called multiple times in a
 * microtask queue
 */
let pendingUpdate = null;
function update() {
    if (pendingUpdate) {
        return;
    }
    pendingUpdate = setTimeout(() => {
        saveState();
        pendingUpdate = null;
    }, 0);
}

/**
 * @param {object} timeObject - object with keys
 * representing sorted-increasing timestamps
 * @param {number} targetTime
 * @param {object|undefined} checkpoint
 */
function replay(timeObject, targetTime, checkpoint) { // eslint-disable-line no-shadow
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

        applyDiff(objects, timeObject[time]);
    }

    return objects;
}

/**
 * Apply diff to objects, modifying objects in place
 * @param {object} objects
 * @param {object} diff
 */
function applyDiff(objects, diff) {
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
            applyDiff(objects[key], diff[key]);
            continue;
        }
        objects[key] = diff[key];
    }
}

/**
 * @param {object} cursorObj - view into object
 * @param {object} cursorObjOld - view into objectOld
 * @param {object} cursorTime - view into the time object
 *                 between object and objectOld
 * @return {boolean} whether the recursion detected a change
 */
function recurse(cursorObj, cursorObjOld, cursorTime) {
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
            let alteredChild = recurse(cursorObj[key], cursorObjOld[key], potentialItemTime);
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
}

module.exports = {
    clearIntervals,
    getCurrentLogName,
    initRecorder,
    logsPath,
    persistToFile,
    persistToFileSync,
    replay,
    saveState,
    start,
    stop,
    timeObject,
    update,
};
