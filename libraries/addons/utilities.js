const fs = require('fs');
const path = require('path');

/**
 * @param {string} addonFolder
 * @return Array<string> list of filenames within addonFolder
 */
exports.getFolderList = function getFolderList(addonFolder) {
    return fs.readdirSync(addonFolder).filter(function (filename) {
        const isHidden = filename[0] === '.';
        let stat;
        try {
            stat = fs.statSync(path.join(addonFolder, filename));
        } catch (_e) {
            console.warn('getFolderList stat failed', filename);
        }
        return stat && stat.isDirectory() && !isHidden;
    });
};
