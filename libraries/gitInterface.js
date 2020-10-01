const fs = require('fs');
const os = require('os');
const path = require('path');
const root = require('../getAppRootFolder');

var utilities = require('./utilities');
var identityFile = '/.identity/object.json';
let homeDirectory = path.join(os.homedir(), 'Documents', 'spatialToolbox');
const oldHomeDirectory = path.join(os.homedir(), 'Documents', 'realityobjects');

// Default back to old realityObjects dir if it exists
if (!fs.existsSync(homeDirectory) &&
    fs.existsSync(oldHomeDirectory)) {
    homeDirectory = oldHomeDirectory;
}

if (process.env.NODE_ENV === 'test' || os.platform() === 'android' || !fs.existsSync(path.join(os.homedir(), 'Documents'))) {
    homeDirectory = path.join(root, 'spatialToolbox');
}

const git = require('simple-git')(homeDirectory);

function saveCommit(object, objects, callback) {
    console.log('git saveCommit');
    // Generating historic data for ghost images
    if (object) {
        var objectFolderName = object.name;
        object.framesHistory = JSON.parse(JSON.stringify(object.frames));

        // todo; replace with a try-catch ?
        utilities.writeObjectToFile(objects, object.objectId, homeDirectory, true);

        git.checkIsRepo(function (err) {
            if (err) {
                git.init();
                return;
            }
            git.commit('server identity commit for ' + objectFolderName, [objectFolderName + identityFile], function() {
                console.log('commit for ', objectFolderName);
                utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                callback();
            });
        });
    }

}

function resetToLastCommit(object, objects, callback) {
    console.log('git resetToLastCommit');
    if (object) {

        var objectFolderName = object.name;
        git.checkIsRepo(function (err) {
            if (err) {
                git.init();
                return;
            }
            git.checkout(objectFolderName + identityFile, function (err) {
                console.log('reset for ', objectFolderName);
                if (err) {
                    console.warn('Error resetting to last commit', err);
                }
                utilities.updateObject(objectFolderName, objects);
                utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                callback();
            });
        });

    }
}

exports.saveCommit = saveCommit;
exports.resetToLastCommit = resetToLastCommit;
