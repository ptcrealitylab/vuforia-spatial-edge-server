var os = require('os');
var path = require('path');
var logger = require('../logger');
var utilities = require('./utilities');
var identityFile = '/.identity/object.json';
var homeDirectory = path.join(path.join(os.homedir(), 'Documents'), 'realityobjects');
var git = require('simple-git')(homeDirectory);



function saveCommit(object, objects, callback) {
    logger.debug("git saveCommit");
   // Generating historic data for ghost images
   if (object) {
      var objectFolderName = object.name;
       object.framesHistory = JSON.parse(JSON.stringify(object.frames));

       // todo; replace with a try-catch ?
       if (!object.isWorldObject) { // TODO: fully support world objects too
           utilities.writeObjectToFile(objects, object.objectId, homeDirectory, true);

           git.checkIsRepo(function (err){
               if(err) {
                   git.init();
                   return;
               }
               git.commit("server identity commit for " + objectFolderName, [objectFolderName + identityFile], function(){
                   logger.debug("commit for ", objectFolderName);
                   utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                   callback();
               })
           });

       } else {
           // doesn't save world object changes to git, but still writes state to local framesHistory
           utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
           callback();
       }

   }

}

function resetToLastCommit(object, objects, callback) {
    logger.debug("git resetToLastCommit");
    if (object) {

        if (!object.isWorldObject) { // TODO: fully support world objects too
            var objectFolderName = object.name;
            git.checkIsRepo(function (err) {
                if(err) {
                    git.init();
                    return;
                }
                git.checkout(objectFolderName + identityFile, function () {
                    logger.debug("reset for ", objectFolderName);
                    utilities.updateObject(objectFolderName, objects);
                    utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
                    callback();
                })
            });
        } else {
            // doesn't save world object changes to git, but still performs a simple reset to local framesHistory state
            object.frames = JSON.parse(JSON.stringify(object.framesHistory));
            utilities.actionSender({reloadObject: {object: object.objectId}, lastEditor: null});
            callback();
        }

    }
};

exports.saveCommit = saveCommit;
exports.resetToLastCommit = resetToLastCommit;
