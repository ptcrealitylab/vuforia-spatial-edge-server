var os = require('os');
var path = require('path');

var utilities = require('./utilities');
var identityFile = '/.identity/object.json';
var homeDirectory = path.join(os.homedir(), 'Documents', 'spatialToolbox');
var git = require('simple-git')(homeDirectory);



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
            git.checkout(objectFolderName + identityFile, function () {
                console.log('reset for ', objectFolderName);
                utilities.updateObject(objectFolderName, objects);
                utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                callback();
            });
        });

    }
}

exports.saveCommit = saveCommit;
exports.resetToLastCommit = resetToLastCommit;
