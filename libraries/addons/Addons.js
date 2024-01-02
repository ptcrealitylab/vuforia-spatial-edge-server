const fs = require('fs');
const path = require('path');
const {getFolderList} = require('./utilities.js');

class Addons {
    constructor(addonPaths) {
        this.addonPaths = addonPaths;
    }
    listAddonFolders() {
        let folders = [];
        for (let addonPath of this.addonPaths) {
            if (!fs.existsSync(addonPath)) {
                continue;
            }
            let folderList = getFolderList(addonPath);
            folders = folders.concat(folderList.map(filename => path.join(addonPath, filename)));
        }
        return folders;
    }
}

module.exports = Addons;
