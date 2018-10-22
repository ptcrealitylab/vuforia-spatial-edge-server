
var os = require('os');
var path = require('path');

var utilities = require(__dirname + '/utilities');
var identityFile = '/.identity/object.json';
var homeDirectory = path.join(path.join(os.homedir(), 'Documents'), 'realityobjects');
var git = require('simple-git')(homeDirectory);

var saveCommit = function (objectKey, objects, callback) {
    console.log("got here");
   // Generating historic data for ghost images
   if(objectKey in objects){
      var objectFolderName = objects[objectKey].name;
       objects[objectKey].framesHistory = JSON.parse(JSON.stringify(objects[objectKey].frames));
       utilities.writeObjectToFile(objects, objectKey, homeDirectory, true);

       git.checkIsRepo(function (err){
           if(err) {
               git.init();
               return;
           }
           git.commit("server identity commit for "+objectFolderName, [objectFolderName+identityFile], function(){
               console.log("commit for "+objectFolderName);
               utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: null});
               callback();
           })
       });

   }


};

var resetToLastCommit = function (objectKey, objects, callback) {
    console.log("got here too");
    if(objectKey in objects) {
        var objectFolderName = objects[objectKey].name;
        git.checkIsRepo(function (err) {
            if(err) {
                git.init();
                return;
            }
            git.checkout(objectFolderName + identityFile, function () {
                console.log("reset for " + objectFolderName);
                utilities.updateObject(objectFolderName, objects);
                utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: null});
                callback();
            })
        });
    }
};

exports.saveCommit = saveCommit;
exports.resetToLastCommit = resetToLastCommit;