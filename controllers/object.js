
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const utilities = require('../libraries/utilities');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var hardwareAPI;
var objectsPath;
var identityFolderName;
var git;
var sceneGraph;

const uploadVideo = function(objectID, videoID, reqForForm, callback) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, 'Object ' + objectID + ' not found');
        return;
    }
    try {
        var videoDir = utilities.getVideoDir(objectsPath, identityFolderName, globalVariables.isMobile, object.name);

        var form = new formidable.IncomingForm({
            uploadDir: videoDir,
            keepExtensions: true,
            accept: 'video/mp4'
        });

        console.log('created form for video');

        form.on('error', function (err) {
            callback(500, err);
        });

        var rawFilepath = form.uploadDir + '/' + videoID + '.mp4';

        if (fs.existsSync(rawFilepath)) {
            console.log('deleted old raw file');
            fs.unlinkSync(rawFilepath);
        }

        form.on('fileBegin', function (name, file) {
            file.path = rawFilepath;
            console.log('fileBegin loading', name, file);
        });

        form.parse(reqForForm, function (err, fields) {

            if (err) {
                console.log('error parsing', err);
                callback(500, err);
                return;
            }

            console.log('successfully created video file', err, fields);

            callback(200, {success: true});
        });
    } catch (e) {
        console.warn('error parsing video upload', e);
    }
};

function uploadMediaFile(objectID, req, callback) {
    console.log('received media file for', objectID);

    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, 'object ' + objectID + ' not found');
        return;
    }

    var mediaDir = objectsPath + '/' + object.name + '/' + identityFolderName + '/mediaFiles';
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir);
    }

    var form = new formidable.IncomingForm({
        uploadDir: mediaDir,
        keepExtensions: true
        // accept: 'image/jpeg' // TODO: specify which types of images/videos it accepts?
    });

    console.log('created form');

    form.on('error', function (err) {
        callback(500, err);
    });

    let mediaUuid = utilities.uuidTime();

    var rawFilepath = form.uploadDir + '/' + mediaUuid + '.jpg';

    if (fs.existsSync(rawFilepath)) {
        console.log('deleted old raw file');
        fs.unlinkSync(rawFilepath);
    }

    form.on('fileBegin', function (name, file) {
        console.log('fileBegin loading', name, file);

        if (file.type.match('video.*')) {
            rawFilepath = rawFilepath.replace('.jpg', '.mov');
        }
        console.log('upload ' + file.path + ' to ' + rawFilepath);
        file.path = rawFilepath;
    });

    form.parse(req, function (err, fields) {
        console.log('successfully uploaded image', err, fields);

        callback(200, {success: true, mediaUuid: mediaUuid, rawFilepath: rawFilepath});
    });
}

const saveCommit = function(objectID, callback) {
    if (globalVariables.isMobile) {
        callback(500, 'saveCommit unavailable on mobile');
        return;
    }
    var object = utilities.getObject(objects, objectID);
    if (object) {
        git.saveCommit(object, objects, function () {
            callback(200, {success: true});
        });
    }
};

const resetToLastCommit = function(objectID, callback) {
    if (globalVariables.isMobile) {
        callback(500, 'resetToLastCommit unavailable on mobile');
        return;
    }
    var object = utilities.getObject(objects, objectID);
    if (object) {
        git.resetToLastCommit(object, objects, function () {
            callback(200, {success: true});
            hardwareAPI.runResetCallbacks(objectID);
        });
    }
};

const setMatrix = function(objectID, body, callback) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, {failure: true, error: 'Object ' + objectID + ' not found'});
        return;
    }

    object.matrix = body.matrix;
    console.log('set matrix for ' + objectID + ' to ' + object.matrix.toString());

    if (typeof body.worldId !== 'undefined' && body.worldId !== object.worldId) {
        object.worldId = body.worldId;
        console.log('object ' + object.name + ' is relative to world: ' + object.worldId);
        sceneGraph.updateObjectWorldId(objectID, object.worldId);
    }

    utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

    sceneGraph.updateWithPositionData(objectID, null, null, object.matrix);

    callback(200, {success: true});
};

/**
 * Upload an image file to the object's metadata folder.
 * The image is stored in a form, which can be parsed and written to the filesystem.
 * @param {string} objectID
 * @param {express.Request} req
 * @param {express.Response} res
 */
const memoryUpload = function(objectID, req, callback) {
    if (!objects.hasOwnProperty(objectID)) {
        callback(404, {failure: true, error: 'Object ' + objectID + ' not found'});
        return;
    }

    var obj = utilities.getObject(objects, objectID);

    if (obj.isHumanPose) {
        callback(404, {failure: true, error: 'Object ' + objectID + ' has no directory'});
        return;
    }

    var memoryDir = objectsPath + '/' + obj.name + '/' + identityFolderName + '/memory/';
    if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir);
    }

    var form = new formidable.IncomingForm({
        uploadDir: memoryDir,
        keepExtensions: true,
        accept: 'image/jpeg'
    });

    form.on('error', function (err) {
        callback(500, err);
        return;
    });

    form.on('fileBegin', function (name, file) {
        if (name === 'memoryThumbnailImage') {
            file.path = form.uploadDir + '/memoryThumbnail.jpg';
        } else {
            file.path = form.uploadDir + '/memory.jpg';
        }
    });

    form.parse(req, function (err, fields) {
        if (obj) {
            obj.memory = JSON.parse(fields.memoryInfo);
            obj.memoryCameraMatrix = JSON.parse(fields.memoryCameraInfo);
            obj.memoryProjectionMatrix = JSON.parse(fields.memoryProjectionInfo);

            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            utilities.actionSender({loadMemory: {object: objectID, ip: obj.ip}});
        }

        console.log('successfully created memory');

        callback(200, {success: true});
    });
};

const deactivate = function(objectID, callback) {
    try {
        utilities.getObject(objects, objectID).deactivated = true;
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        sceneGraph.deactivateElement(objectID);
        callback(200, 'ok');
    } catch (e) {
        callback(404, {success: false, error: 'cannot find object with ID' + objectID});
    }
};

const activate = function(objectID, callback) {
    try {
        utilities.getObject(objects, objectID).deactivated = false;
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        sceneGraph.activateElement(objectID);
        callback(200, 'ok');
    } catch (e) {
        callback(404, {success: false, error: 'cannot find object with ID' + objectID});
    }
};

const setVisualization = function(objectID, vis, callback) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, {success: false, error: 'cannot find object with ID' + objectID});
    }
    try {
        object.visualization = vis;
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        callback(200, 'ok');
    } catch (e) {
        callback(500, {success: false, error: e.message});
    }
};

// request a zip-file with the object stored inside
// ****************************************************************************************************************
const zipBackup = function(objectId, req, res) {
    if (globalVariables.isMobile) {
        res.status(500).send('zipBackup unavailable on mobile');
        return;
    }
    console.log('sending zipBackup', objectId);

    if (!fs.existsSync(path.join(objectsPath, objectId))) {
        res.status(404).send('object directory for ' + objectId + 'does not exist at ' + objectsPath + '/' + objectId);
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-disposition': 'attachment; filename=' + objectId + '.zip'
    });

    // this require needs to be placed here for mobile compatibility
    var archiver = require('archiver');
    var zip = archiver('zip');
    zip.pipe(res);
    zip.directory(objectsPath + '/' + objectId, objectId + '/');
    zip.finalize();
};

const generateXml = function(objectID, body, callback) {
    var msgObject = body;
    var objectName = msgObject.name;

    console.log(objectID, msgObject);

    console.log('support inferred aspect ratio of image targets');
    console.log('support object targets');

    // var isImageTarget = true;
    // var targetTypeText = isImageTarget ? 'ImageTarget' : 'ObjectTarget'; // not sure if this is actually what object target XML looks like

    var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
        '   <Tracking>\n' +
        '   <ImageTarget name="' + objectID + '" size="' + parseFloat(msgObject.width).toFixed(8) + ' ' + parseFloat(msgObject.height).toFixed(8) + '" />\n' +
        '   </Tracking>\n' +
        '   </ARConfig>';

    let targetDir = path.join(objectsPath, objectName, identityFolderName, 'target');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
        console.log('created directory: ' + targetDir);
    }

    console.log('am I here!');
    var xmlOutFile = path.join(targetDir, 'target.xml');

    fs.writeFile(xmlOutFile, documentcreate, function (err) {
        if (err) {
            callback(500, 'error writing new target size to .xml file for ' + objectID);
        } else {
            callback(200, 'ok');

            // TODO: update object.targetSize.width and object.targetSize.height and write to disk (if object exists yet)
            var object = utilities.getObject(objects, objectID);
            if (object) {
                object.targetSize.width = parseFloat(msgObject.width);
                object.targetSize.height = parseFloat(msgObject.height);
                utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            }
        }
    });
};

/**
 * Enable sharing of Spatial Tools from this server to objects on other servers
 * @todo: see github issue #23 - function is currently unimplemented
 * @param {string} objectKey
 * @param {boolean} shouldBeEnabled
 * @param {successCallback} callback - success, error message
 */
const setFrameSharingEnabled = function (objectKey, shouldBeEnabled, callback) {
    callback(true);
    console.warn('TODO: implement frame sharing... need to set property and implement all side-effects / consequences');
};

const getObject = function (objectID, excludeUnpinned) {
    let fullObject = utilities.getObject(objects, objectID);
    if (!excludeUnpinned) {
        return fullObject; // by default, returns entire object
    }

    // if query parameter is included, removes all unpinned frames
    let filteredObject = JSON.parse(JSON.stringify(fullObject));
    filteredObject.unpinnedFrameKeys = [];
    Object.keys(filteredObject.frames).forEach(function(frameKey) {
        let thisFrame = filteredObject.frames[frameKey];
        if (typeof thisFrame.pinned !== 'undefined' && !thisFrame.pinned) {
            filteredObject.unpinnedFrameKeys.push(frameKey);
        }
    });
    // each unpinnedFrameKey is still passed to the client so that they can download it later if desired
    filteredObject.unpinnedFrameKeys.forEach(function(frameKey) {
        delete filteredObject.frames[frameKey];
    });
    return filteredObject;
};

const setup = function (objects_, globalVariables_, hardwareAPI_, objectsPath_, identityFolderName_, git_, sceneGraph_) {
    objects = objects_;
    globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    objectsPath = objectsPath_;
    identityFolderName = identityFolderName_;
    git = git_;
    sceneGraph = sceneGraph_;
};

module.exports = {
    uploadVideo: uploadVideo,
    uploadMediaFile: uploadMediaFile,
    saveCommit: saveCommit,
    resetToLastCommit: resetToLastCommit,
    setMatrix: setMatrix,
    memoryUpload: memoryUpload,
    deactivate: deactivate,
    activate: activate,
    setVisualization: setVisualization,
    zipBackup: zipBackup,
    generateXml: generateXml,
    setFrameSharingEnabled: setFrameSharingEnabled,
    getObject: getObject,
    setup: setup
};
