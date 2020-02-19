const fs = require('fs');
const path = require('path');

class AddonFolderLoader {
    constructor(addonFolders) {
        this.addonFolders = addonFolders;
    }

    /**
     * Load all modules found in the addonFolders
     * @return {Object}
     */
    loadModules() {
        this.modules = {};
        this.folderMap = {};

        for (let addonFolder of this.addonFolders) {
            var folderList = fs.readdirSync(addonFolder).filter(function (filename) {
                const isHidden = filename[0] === '.';
                return fs.statSync(path.join(addonFolder, filename)).isDirectory() &&
                    !isHidden;
            });

            // Update out modules map with all the folders' code
            for (const folder of folderList) {
                if (this.modules.hasOwnProperty(folder)) {
                    continue;
                }
                this.modules[folder] = require(path.join(addonFolder, folder, 'index.js'));
                this.folderMap[folder] = addonFolder;
            }
        }

        return this.modules;
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
