const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const {objectsPath} = require('../config.js');

const logsPath = path.join(objectsPath, '.objectLogs');

// Persist every half hour
const PERSIST_DELAY_MS = 30 * 60 * 1000;
const prec = Math.pow(10, 8);

/**
 * @param {number} val
 * @return {number} `val` limited to have `Math.log10(prec)` significant digits
 */
function compressFloat(val) {
    let scale = Math.pow(10, Math.floor(Math.log10(val)));
    let significand = val / scale;
    significand = Math.round(significand * prec) / prec;
    return significand * scale;
}

let recorder = {};
recorder.frameRate = 10;
recorder.object = {};
recorder.objectOld = {};
recorder.timeObject = {};
recorder.intervalSave = null;
recorder.intervalPersist = null;
recorder.logsPath = logsPath;
recorder.persisting = false;

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

recorder.stop = function () {
    recorder.clearIntervals();

    recorder.persistToFile();
};

recorder.persistToFile = function () {
    if (recorder.persisting) {
        return;
    }
    recorder.persisting = true;
    let timeString = Object.keys(recorder.timeObject)[0];
    const outputFilename = path.join(logsPath, 'objects_' + timeString + '.json.gz');

    if (!fs.existsSync(logsPath)) {
        try {
            fs.mkdirSync(logsPath, '0766');
        } catch (err) {
            console.error('Log dir creation failed', err);
            recorder.persisting = false;
            return;
        }
    }

    zlib.gzip(JSON.stringify(recorder.timeObject), function(err, buffer) {
        if (err) {
            console.error('Log compress failed', err);
            recorder.persisting = false;
            return;
        }
        fs.writeFile(outputFilename, buffer, function(writeErr) {
            if (writeErr) {
                console.error('Log persist failed', writeErr);
            }
            recorder.objectOld = {};
            recorder.timeObject = {};
            recorder.persisting = false;
        });
    });
};

recorder.saveState = function () {
    if (recorder.persisting) {
        return;
    }

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

            if (typeof thisValue === 'number' && typeof oldValue === 'number') {
                thisValue = compressFloat(thisValue);
                oldValue = compressFloat(oldValue);
            }

            if (thisItem[key] !== oldItem[key]) {
                const timeItem = recorder.getItemFromArray(objectInTime, string.split('/'));
                timeItem[key] = thisValue;
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
