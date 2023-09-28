var utilities = require('./utilities');
var identityFile = '/.identity/object.json';

const {objectsPath} = require('../config.js');

const git = require('simple-git')(objectsPath);

function saveCommit(object, objects, callback) {
    // Generating historic data for ghost images
    if (object) {
        var objectFolderName = object.name;
        object.framesHistory = JSON.parse(JSON.stringify(object.frames));

        // todo; replace with a try-catch ?
        utilities.writeObjectToFile(objects, object.objectId, true);

        git.checkIsRepo(function (err) {
            if (err) {
                git.init();
                return;
            }
            git.commit('server identity commit for ' + objectFolderName, [objectFolderName + identityFile], function() {
                utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                callback();
            });
        });
    }

}

function resetToLastCommit(object, objects, callback) {
    if (object) {
        var objectFolderName = object.name;
        git.checkIsRepo(function (err) {
            if (err) {
                git.init();
                return;
            }
            git.checkout(objectFolderName + identityFile, function (checkoutErr) {
                if (checkoutErr) {
                    console.error('Error resetting to last commit', checkoutErr);
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
