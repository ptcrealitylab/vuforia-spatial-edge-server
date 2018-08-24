
var os = require('os');
var path = require('path');


var identityFolderName = '.identity';
var homeDirectory = path.join(path.join(os.homedir(), 'Documents'), 'realityobjects');
var git = require('simple-git')(homeDirectory);

var initGit = function (objectFolderName, debug) {

};


var saveCommit = function (objectFolderName, debug) {
    git.commit("node commit", function(){
        console.log("commit");
    })
};

var resetToLastCommit = function (objectFolderName, debug) {

};

var saveToFile = function (objectFolderName, debug) {

};

var loadStates = function (objectFolderName, debug) {

};


exports.initGit = initGit;
exports.saveCommit = saveCommit;
exports.resetToLastCommit = resetToLastCommit;
exports.saveToFile = saveToFile;
exports.loadStates = loadStates;