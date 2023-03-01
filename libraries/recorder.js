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
const path = require('path');
const zlib = require('zlib');

const {objectsPath} = require('../config.js');

const logsPath = path.join(objectsPath, '.objectLogs');

// Persist every half hour
const PERSIST_DELAY_MS = 30 * 60 * 1000;

// Flag to compress floating point numbers for ~20% average gains at a loss of precision
const doCompressFloat = false;
const prec = Math.pow(10, 8);
/**
 * @param {number} val
 * @return {number} `val` limited to a resolution of at most `1 / prec` and to
 * `Math.log10(prec)` significant digits
 */
function compressFloat(val) {
    if (Math.abs(val - Math.round(val)) < 1 / prec) {
        return Math.round(val);
    }
    let sign = Math.sign(val);
    val = Math.abs(val);
    let scale = Math.pow(10, Math.floor(Math.log10(val)));
    let significand = val / scale;
    significand = Math.round(significand * prec) / prec;
    return sign * significand * scale;
}

let recorder = {};
recorder.frameRate = 10;
recorder.object = {};
recorder.objectOld = {};
recorder.timeObject = {};
recorder.intervalSave = null;
recorder.intervalPersist = null;
recorder.logsPath = logsPath;

recorder.initRecorder = function (object) {
    recorder.object = object;
    //recorder.objectOld = JSON.parse(JSON.stringify(object));
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

recorder.persistToFile = function () {
    let logName = recorder.getCurrentLogName();
    let timeObjectStr = JSON.stringify(recorder.timeObject);
    recorder.objectOld = {};
    recorder.timeObject = {};

    return new Promise((resolve, reject) => {
        let outputFilename;
        try {
            outputFilename = recorder.getAndGuaranteeOutputFilename(logName);
        } catch (err) {
            console.error('Log dir creation failed', err);
            reject(err);
            return;
        }

        zlib.gzip(timeObjectStr, function(err, buffer) {
            if (err) {
                console.error('Log compress failed', err);
                reject(err);
                return;
            }
            fs.writeFile(outputFilename, buffer, function(writeErr) {
                if (writeErr) {
                    console.error('Log persist failed', writeErr);
                    reject(writeErr);
                    return;
                }
                resolve();
            });
        });
    });
};

recorder.persistToFileSync = function() {
    let logName = recorder.getCurrentLogName();
    let timeObjectStr = JSON.stringify(recorder.timeObject);
    recorder.objectOld = {};
    recorder.timeObject = {};

    let outputFilename = recorder.getAndGuaranteeOutputFilename(logName);

    const buffer = zlib.gzipSync(timeObjectStr);
    fs.writeFileSync(outputFilename, buffer);
};

recorder.saveState = function () {
    let timeString = Date.now();
    let timeObject = recorder.timeObject[timeString] = {};
    recorder.recurse(recorder.object, timeObject);
    if (Object.keys(timeObject).length === 0) delete recorder.timeObject[timeString];
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

recorder.replay = function(timeObject, targetTime, checkpoint) {
    let objects = {};
    let currentTime = 0;
    if (checkpoint) {
        objects = checkpoint.objects;
        currentTime = checkpoint.time;
    }

    let times = Object.keys(timeObject).map(t => parseInt(t));

    for (let time of times) {
        if (currentTime >= time) {
            continue;
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
        if (typeof diff[key] === 'object' && objects.hasOwnProperty(key)) {
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
 * @param {object} obj - view into recorder.object
 * @param {object} objectInTime - object to store any values that change
 *                 between recorder.object and recorder.objectOld
 * @param {string} keyString - path to the view `obj`
 */
recorder.recurse = function (obj, objectInTime, keyString) {
    if (!keyString) keyString = '';
    for (const key in obj) { // works for objects and arrays
        if (!obj.hasOwnProperty(key)) {
            // Ignore inherited enumerable properties
            continue;
        }
        // Ignore the special whole_pose property which duplicates changes to
        // individual joint frame matrices
        if (key === 'whole_pose' && keyString.includes('_HUMAN_')) {
            continue;
        }
        const item = obj[key];
        if (typeof item === 'object') {

            if (Array.isArray(item)) {
                recorder.recurse(item, objectInTime, keyString + '#' + key + '/');
            } else {
                recorder.recurse(item, objectInTime, keyString + key + '/');
            }
        } else {
            if (item === undefined) {
                continue;
            }
            const string = keyString + key + '/';
            const thisItem = recorder.getItemFromArray(recorder.object, string.split('/'));
            const oldItem = recorder.getItemFromArray(recorder.objectOld, string.split('/'));
            let thisValue = thisItem[key];
            let oldValue = oldItem[key];

            if (doCompressFloat) {
                if (typeof thisValue === 'number') {
                    thisValue = compressFloat(thisValue);
                }
                if (typeof oldValue === 'number') {
                    oldValue = compressFloat(oldValue);
                }
            }

            if (thisValue !== oldValue) {
                const timeItem = recorder.getItemFromArray(objectInTime, string.split('/'));
                // Persists value before any modifications
                timeItem[key] = thisItem[key];
            }

            oldItem[key] = thisValue;
        }
    }
};

/**
 * @param {object} object
 * @param {Array<String>} array - keyString split at '/'
 * @return {any} value of `object` from keyString parts `array`
 */
recorder.getItemFromArray = function (object, array) {
    let item = object;
    if (!item) return item;
    let returnItem = {};
    array.forEach(function (data) {
        if (data !== '') {
            if (data.charAt(0) === '#') {
                data = data.substr(1);
                if (!item.hasOwnProperty(data))
                    item[data] = [];
            } else {
                if (!item.hasOwnProperty(data))
                    item[data] = {};
            }
            // let newItem = item[data];
            returnItem = item;
            if (item[data])
                item = item[data];
        }
    });

    return returnItem;
};

module.exports = recorder;
