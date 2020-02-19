const fs = require('fs');
const path = require('path');

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
            let folderList = fs.readdirSync(addonPath).filter((filename) => {
                let isHidden = filename[0] === '.';
                return fs.statSync(path.join(addonPath, filename)).isDirectory() &&
                    !isHidden;
            });
            folders = folders.concat(folderList.map(filename => path.join(addonPath, filename)));
        }
        return folders;
    }
}

module.exports = Addons;
