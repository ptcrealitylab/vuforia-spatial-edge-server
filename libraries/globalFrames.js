let fs = require('fs');
let path = require('path');

let frameLibPath = null;
let identityFolderName = null;
let frameTypeModules = {};   // Will hold all available frame interfaces

/**
 * 
 * @param {string} framePath - absolute path to realityframes directory
 * @param {string} identityName - name of identity folder, e.g. '.identity'
 */
exports.initialize = function(framePath, identityName) {
    frameLibPath = framePath;
    identityFolderName = identityName;

    setupDirectories();
    loadFramesJsonData();
};

/**
 * Creates the realityframes directory if needed
 */
function setupDirectories() {
    // create frames folder at frameLibPath if necessary
    if (!fs.existsSync(frameLibPath)) {
        console.log('created frames directory at ' + frameLibPath);
        fs.mkdirSync(frameLibPath);
    }

    // create a .identity folder within it if needed
    let frameIdentityPath = path.join(frameLibPath, identityFolderName);
    if (!fs.existsSync(frameIdentityPath)) {
        console.log('created frames identity directory at ' + frameIdentityPath);
        fs.mkdirSync(frameIdentityPath);
    }
}

/**
 * Looks at the realityframes directory and creates a data structure filled with all the frames it contains.
 * Also sets up a settings.json file for each in a .identity folder if needed, with default contents of {enabled: true}
 * Reads the settings.json and assigns the contents to the .metadata property of the global frame
 */
function loadFramesJsonData() {
    // get a list with the names for all frame types, based on the folder names in the libraries/frames/active folder.
    let frameFolderList = fs.readdirSync(frameLibPath).filter(function (filename) {
        let isHidden = filename[0] === '.';
        return fs.statSync(frameLibPath + '/' + filename).isDirectory() && !isHidden;
    });

    // Load the config.js properties of each frame into an object that we can provide to clients upon request.
    for (let i = 0; i < frameFolderList.length; i++) {
        let frameName = frameFolderList[i];
        if (fs.existsSync(frameLibPath + '/' + frameName + "/config.js")) {
            frameTypeModules[frameName] = require(frameLibPath + '/' + frameName + "/config.js");
        } else {
            frameTypeModules[frameName] = {};
        }
    }
    
    // see if there is an identity folder for each frame (generate if not), and add the json contents to the frameTypeModule
    let frameIdentityPath = path.join(frameLibPath, identityFolderName);
    for (let i = 0; i < frameFolderList.length; i++) {
        let frameName = frameFolderList[i];
        let thisIdentityPath = path.join(frameIdentityPath, frameName);
        if (!fs.existsSync(thisIdentityPath)) {
            console.log('created frames directory at ' + thisIdentityPath);
            fs.mkdirSync(thisIdentityPath);
        }
        let settingsPath = path.join(thisIdentityPath, 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            console.log('created settings at ' + settingsPath);
            let defaultSettings = generateDefaultFrameSettings(true);
            fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, '\t'), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('default frame JSON saved to ' + settingsPath);
                }
            });
        }

        try {
            frameTypeModules[frameName].metadata = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            console.log('no saved frame settings for ' + frameName);
            frameTypeModules[frameName].metadata = {};
        }
    }
}

/**
 * Generates the default JSON contents for the settings.json file for a frame
 * @param {boolean} defaultEnabledValue
 * @return {{enabled: boolean}}
 */
function generateDefaultFrameSettings(defaultEnabledValue) {
    return {
        enabled: defaultEnabledValue
    }
}

/**
 * Utility function that traverses all the frames and creates a new entry for each.
 * @return {Object.<string, Object>}
 */
exports.getFrameList = function() {
    return JSON.parse(JSON.stringify(frameTypeModules));
};

/**
 * Returns the subset of frameTypeModules with metadata.enabled === true
 * @return {Object.<string, Object>}
 */
exports.getEnabledFrames = function() {
    var enabledFrames = {};
    Object.keys(frameTypeModules).forEach(function(frameName) {
        if (frameTypeModules[frameName].metadata && frameTypeModules[frameName].metadata.enabled) {
            enabledFrames[frameName] = frameTypeModules[frameName];
        }
    });
    return JSON.parse(JSON.stringify(enabledFrames));
};

/**
 * Overwrites the 'enabled' property in the realityframes/.identity/frameName/settings.json
 * If the file is new (empty), write a default json blob into it with the new enabled value
 */
exports.setFrameEnabled = function(frameName, shouldBeEnabled, callback) {
    let frameSettingsPath = path.join(frameLibPath, identityFolderName, frameName, 'settings.json');
    console.log(frameSettingsPath);
    
    try {
        let settings = JSON.parse(fs.readFileSync(frameSettingsPath, 'utf8'));
        settings.enabled = shouldBeEnabled;

        // if (globalVariables.saveToDisk) { // todo: this global variable is not accessible here
            fs.writeFile(frameSettingsPath, JSON.stringify(settings, null, '\t'), function (err) {
                if (err) {
                    console.log(err);
                    callback(false, 'error writing to file');
                } else {
                    console.log('successfully ' + (shouldBeEnabled ? 'enabled' : 'disabled') + ' frame: ' + frameName);
                    frameTypeModules[frameName].metadata.enabled = shouldBeEnabled; // update the local copy of the data too if successful
                    callback(true);
                }
            });
        // } else {
        //     console.log("I am not allowed to save");
        //     callback(false, 'saveToDisk globally disabled for this server');
        // }
    } catch (e) {
        console.log('error reading settings.json for ' + frameName + '. try reverting to default settings');
        let defaultSettings = generateDefaultFrameSettings(shouldBeEnabled);
        fs.writeFile(frameSettingsPath, JSON.stringify(defaultSettings, null, '\t'), function (err) {
            if (err) {
                console.log(err);
                callback(false, 'error writing to file');
            } else {
                console.log('successfully ' + (shouldBeEnabled ? 'enabled' : 'disabled') + ' hardwareInterface: ' + frameName);
                frameTypeModules[frameName].metadata.enabled = shouldBeEnabled; // update the local copy of the data too if successful
                callback(true);
            }
        });
    }
};
