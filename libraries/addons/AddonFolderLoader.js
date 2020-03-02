const fs = require('fs');
const path = require('path');

/**
 * Loader for add-ons. Handles hidden folder logic and wraps the necessary
 * settings code for nodes/tools/logic blocks.
 */
class AddonFolderLoader {
    /**
     * @constructor
     * @param {Array} addonFolders - list of absolute paths to add-on folders
     */
    constructor(addonFolders) {
        this.addonFolders = addonFolders;
        const coreAddon = 'vuforia-spatial-core-addon';
        this.addonFolders.sort((a, b) => {
            const aIsCore = a.includes(coreAddon);
            const bIsCore = b.includes(coreAddon);
            if (aIsCore && !bIsCore) {
                return -1;
            }
            if (bIsCore && !aIsCore) {
                return 1;
            }
            return a.localeCompare(b);
        });
    }

    /**
     * Load all modules found in the addonFolders
     * @return {Object}
     */
    loadModules() {
        this.modules = {};
        this.folderMap = {};

        for (let addonFolder of this.addonFolders) {
            if (!fs.existsSync(addonFolder)) {
                continue;
            }
            var folderList = fs.readdirSync(addonFolder).filter(function (filename) {
                const isHidden = filename[0] === '.';
                return fs.statSync(path.join(addonFolder, filename)).isDirectory() &&
                    !isHidden;
            });

            // Update our modules map with all the folders' code
            for (const folder of folderList) {
                if (this.folderMap.hasOwnProperty(folder)) {
                    continue;
                }
                this.modules[folder] = require(path.join(addonFolder, folder, 'index.js'));
                this.folderMap[folder] = addonFolder;
            }
        }

        return this.modules;
    }

    /**
     * Clone of loadModules that only builds the data for resolvePath
     */
    calculatePathResolution() {
        this.folderMap = {};

        for (let addonFolder of this.addonFolders) {
            if (!fs.existsSync(addonFolder)) {
                continue;
            }
            var folderList = fs.readdirSync(addonFolder).filter(function (filename) {
                const isHidden = filename[0] === '.';
                return fs.statSync(path.join(addonFolder, filename)).isDirectory() &&
                    !isHidden;
            });

            // Update out modules map with all the folders' code
            for (const folder of folderList) {
                if (this.folderMap.hasOwnProperty(folder)) {
                    continue;
                }
                this.folderMap[folder] = addonFolder;
            }
        }
    }

    /**
     * Given a folder name, figure out which addon it came from and return the addon's path
     * @param {string} folder, e.g. coolBlock
     * @return {string} e.g. __dirname + addons/vuforia-spatial-core-addon/blocks/coolBlock
     */
    resolvePath(folder) {
        return this.folderMap[folder];
    }
}

module.exports = AddonFolderLoader;
