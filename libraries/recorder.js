var fs = require('fs');

let recorder = {};
recorder.frameRate = 10;
recorder.object = {};
recorder.objectOld = {};
recorder.timeObject = {};
recorder.isStarted = false;
recorder.interval = null;

recorder.initRecorder = function (object) {
    recorder.object = object;
    //recorder.objectOld = JSON.parse(JSON.stringify(object));
    recorder.start();
};

recorder.start = function () {
    recorder.objectOld = {};
    recorder.interval = setInterval(recorder.saveState, 1000 / recorder.frameRate);
};

recorder.stop = function () {
    clearInterval(recorder.interval);
    recorder.saveToFile();
};

recorder.saveToFile = function () {
    let timeString = Date.now();
    let outputFolder = __dirname + '/objectLogs';
    var outputFilename = outputFolder + '/objects_' + timeString + '.json';


    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    fs.writeFile(outputFilename, JSON.stringify(recorder.timeObject, null, '\t'), function (err) {

        recorder.objectOld = {};
        recorder.timeObject = {};
        // once writeFile is done, unblock writing and loop again
        if (err) {
            console.error(err);
        }
    });
};

recorder.saveState = function () {
    let timeString = Date.now();
    let timeObject = recorder.timeObject[timeString] = {};
    recorder.recurse(recorder.object, timeObject);
    if (Object.keys(timeObject).length === 0) delete recorder.timeObject[timeString];
    // console.log(recorder.timeObject);
};
recorder.recurse = function (obj, objectInTime, keyString) {
    if (!keyString) keyString = '';
    for (let key in obj) { // works for objects and arrays
        if (!obj.hasOwnProperty(key)) { return; } // this is important. ignores prototype methods
        let item = obj[key];
        if (typeof item === 'object') {

            if (Array.isArray(item)) {
                recorder.recurse(item, objectInTime, keyString + '#' + key + '/');
            } else {
                recorder.recurse(item, objectInTime, keyString + key + '/');
            }
        } else {
            if (item === undefined) return;
            let string = keyString + key + '/';
            let thisItem = recorder.getItemFromArray(recorder.object, string.split('/'), false);
            let oldItem = recorder.getItemFromArray(recorder.objectOld, string.split('/'), true);
            if (thisItem[key] !== oldItem[key]) {
                let timeItem = recorder.getItemFromArray(objectInTime, string.split('/'), true);
                timeItem[key] = thisItem[key];
            }
            oldItem[key] = thisItem[key];
        }
    }
};

recorder.getItemFromArray = function (object, array) {
    let item = object;
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
            item = item[data];
        }
    });

    return returnItem;
};

module.exports = recorder;




