const fs = require('fs');
const path = require('path');
const {identityFolderName} = require('../../constants.js');
const {getFolderList} = require('./utilities.js');

/**
 * A source of frames from one add-on's tools directory
 */
class AddonFramesSource {
    /**
     * @param {string} framePath - absolute path to realityframes directory
     */
    constructor(framePath) {
        this.frameLibPath = framePath;

        // Will hold all available frame interfaces
        this.frameTypeModules = {};

        this.setupDirectories();
        this.loadFramesJsonData();
    }

    /**
     * Creates the .identity directory if needed
     */
    setupDirectories() {
        let frameIdentityPath = path.join(this.frameLibPath, identityFolderName);
        if (!fs.existsSync(frameIdentityPath)) {
            fs.mkdirSync(frameIdentityPath);
        }
    }

    /**
     * Looks at the realityframes directory and creates a data structure filled with all the frames it contains.
     * Also sets up a settings.json file for each in a .identity folder if needed, with default contents of {enabled: true}
     * Reads the settings.json and assigns the contents to the .metadata property of the global frame
     */
    loadFramesJsonData() {
        // get a list with the names for all frame types, based on the folder names in the libraries/frames/active folder.
        let frameFolderList = getFolderList(this.frameLibPath);

        // frameLibPath looks like x/y/z/addons/addonName/tools
        let addonName = path.basename(path.dirname(this.frameLibPath));

        // Load the config.js properties of each frame into an object that we can provide to clients upon request.
        for (let i = 0; i < frameFolderList.length; i++) {
            let frameName = frameFolderList[i];
            this.frameTypeModules[frameName] = {
                properties: {
                    name: frameName,
                    addon: addonName
                }
            };
        }

        // see if there is an identity folder for each frame (generate if not), and add the json contents to the frameTypeModule
        let frameIdentityPath = path.join(this.frameLibPath, identityFolderName);
        for (let i = 0; i < frameFolderList.length; i++) {
            let frameName = frameFolderList[i];
            let thisIdentityPath = path.join(frameIdentityPath, frameName);
            if (!fs.existsSync(thisIdentityPath)) {
                try {
                    fs.mkdirSync(thisIdentityPath);
                } catch (e) {
                    console.error(`Unable to mkdir at ${thisIdentityPath}, fix permissions or add it yourself`, e);
                    this.frameTypeModules[frameName].metadata = {enabled: true};
                    return;
                }
            }
            let settingsPath = path.join(thisIdentityPath, 'settings.json');
            if (!fs.existsSync(settingsPath)) {
                let defaultSettings = this.generateDefaultFrameSettings(true);
                fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, '\t'), (err) => {
                    if (err) {
                        console.error('error saving default frame settings', err);
                    }
                });
            }

            try {
                this.frameTypeModules[frameName].metadata = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            } catch (e) {
                // No saved frame settings for this frame
                this.frameTypeModules[frameName].metadata = {};
            }
        }
    }

    /**
     * Generates the default JSON contents for the settings.json file for a frame
     * @param {boolean} defaultEnabledValue
     * @return {{enabled: boolean}}
     */
    generateDefaultFrameSettings(defaultEnabledValue) {
        return {
            enabled: defaultEnabledValue,
        };
    }

    /**
     * Utility function that returns a deep copy of our list of frames
     * @return {Object.<string, Object>}
     */
    getFrameList() {
        return JSON.parse(JSON.stringify(this.frameTypeModules));
    }

    /**
     * Overwrites the 'enabled' property in the realityframes/.identity/frameName/settings.json
     * If the file is new (empty), write a default json blob into it with the new enabled value
     */
    setFrameEnabled(frameName, shouldBeEnabled, callback) {
        let frameSettingsPath = path.join(
            this.frameLibPath, identityFolderName, frameName,
            'settings.json');

        try {
            let settings = JSON.parse(fs.readFileSync(frameSettingsPath, 'utf8'));
            settings.enabled = shouldBeEnabled;

            // TODO: consider whether to care about globalVariables.saveToDisk
            fs.writeFile(frameSettingsPath, JSON.stringify(settings, null, '\t'), (err) => {
                if (err) {
                    console.error('setFrameEnabled error', err);
                    callback(false, 'error writing to file');
                } else {
                    // update the local copy of the data too if successful
                    this.frameTypeModules[frameName].metadata.enabled = shouldBeEnabled;
                    callback(true);
                }
            });
        } catch (e) {
            console.error('error reading settings.json for ' + frameName + '. attempting to revert to default settings', e);
            let defaultSettings = this.generateDefaultFrameSettings(shouldBeEnabled);
            fs.writeFile(frameSettingsPath, JSON.stringify(defaultSettings, null, '\t'), (err) => {
                if (err) {
                    console.error('setFrameEnabled error in catch', err);
                    callback(false, 'error writing to file');
                } else {
                    // update the local copy of the data too if successful
                    this.frameTypeModules[frameName].metadata.enabled = shouldBeEnabled;
                    callback(true);
                }
            });
        }
    }
}

module.exports = AddonFramesSource;
