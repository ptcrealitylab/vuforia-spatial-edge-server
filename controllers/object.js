const fsProm = require('../persistence/fsProm.js');
const path = require('path');
const formidable = require('formidable');
const utilities = require('../libraries/utilities');
const {fileExists, unlinkIfExists, mkdirIfNotExists} = utilities;
const {startSplatTask} = require('./object/SplatTask.js');

// Variables populated from server.js with setup()
var objects = {};
var globalVariables;
var hardwareAPI;
var objectsPath;
const {identityFolderName} = require('../constants.js');

const {isMobile} = require('../isMobile.js');
let git;
if (isMobile || process.env.NODE_ENV === 'test') {
    git = null;
} else {
    git = require('../libraries/gitInterface');
}

var sceneGraph;
// needed for deleteObject
let objectLookup;
let activeHeartbeats;
let knownObjects;
let setAnchors;

const deleteObject = async function(objectID) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        return {
            status: 404,
            error: `Object ${objectID} not found`
        };
    }

    try {
        await utilities.deleteObject(object.name, objects, objectLookup, activeHeartbeats, knownObjects, sceneGraph, setAnchors);
    } catch (e) {
        return {
            status: 500,
            error: `Error deleting object ${objectID}`
        };
    }

    return {
        status: 200,
        success: true,
        message: `Deleted object ${objectID}`
    };
};

const uploadVideo = async function(objectID, videoID, reqForForm, callback) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, 'Object ' + objectID + ' not found');
        return;
    }
    try {
        var videoDir = utilities.getVideoDir(object.name);

        var form = new formidable.IncomingForm({
            uploadDir: videoDir,
            keepExtensions: true,
            accept: 'video/mp4'
        });

        form.on('error', function (err) {
            callback(500, err);
        });

        var rawFilepath = form.uploadDir + '/' + videoID + '.mp4';

        await unlinkIfExists(rawFilepath);

        form.on('fileBegin', function (name, file) {
            file.path = rawFilepath;
        });

        form.parse(reqForForm, function (err, _fields) {
            if (err) {
                console.error('error parsing object video upload', err);
                callback(500, err);
                return;
            }

            callback(200, {success: true});
        });
    } catch (e) {
        console.error('error parsing video upload', e);
    }
};

// takes a filename (plus extension) and removes special characters and
// anything non-alphanumeric other than hyphens, underscores, periods
function simplifyFilename(filename) {
    // Remove any special characters and replace them with hyphens
    filename = filename.replace(/[^\w\s.-]/g, '-');

    // Remove any leading or trailing spaces
    filename = filename.trim();

    // Replace consecutive spaces with a single hyphen
    filename = filename.replace(/\s+/g, '-');

    // Remove any consecutive hyphens or underscores
    filename = filename.replace(/[-_]{2,}/g, '-');

    // Remove any non-alphanumeric characters except hyphens, underscores, and periods
    filename = filename.replace(/[^\w-.]/g, '');

    return filename;
}

async function uploadMediaFile(objectID, req, callback) {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, 'object ' + objectID + ' not found');
        return;
    }

    let mediaDir = objectsPath + '/' + object.name + '/' + identityFolderName + '/mediaFiles';
    await mkdirIfNotExists(mediaDir);

    let form = new formidable.IncomingForm({
        uploadDir: mediaDir,
        keepExtensions: true
        // accept: 'image/jpeg' // we don't include this anymore, because any filetype can be uploaded
    });

    form.on('error', function (err) {
        callback(500, err);
    });

    let mediaUuid = utilities.uuidTime(); // deprecated
    let simplifiedFilename = null;
    let newFilepath = null;

    form.on('file', async function(name, file) {
        console.log('form.file triggered');
        // Construct new filepath
        simplifiedFilename = simplifyFilename(file.originalFilename);
        newFilepath = path.join(form.uploadDir, simplifiedFilename);

        // Rename the file after it's been saved
        try {
            await unlinkIfExists(newFilepath);
            let currentPath = file.path ? file.path : file.filepath;
            await fsProm.rename(currentPath, newFilepath);
            console.log(`File renamed from ${currentPath} to ${newFilepath}`);
        } catch (error) {
            console.error(`Error renaming file to ${newFilepath}:`, error);
        }
    });

    form.parse(req, function (err, _fields) {
        if (err) {
            console.warn('object form parse error', err);
        }

        callback(200, {
            success: true,
            mediaUuid: mediaUuid, // deprecated field
            fileName: simplifiedFilename, // the "title" of the file
            rawFilepath: newFilepath // this is the actual path to the resource
        });
    });
}

const saveCommit = function(objectID, callback) {
    if (isMobile) {
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
    if (isMobile) {
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

    if (typeof body.worldId !== 'undefined' && body.worldId !== object.worldId && !object.isWorldObject) {
        object.worldId = body.worldId;
        sceneGraph.updateObjectWorldId(objectID, object.worldId);
    }

    if (object.type !== 'avatar') {
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
    }

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
const memoryUpload = async function(objectID, req, callback) {
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
    await mkdirIfNotExists(memoryDir);

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

    form.parse(req, async function (err, fields) {
        if (obj) {
            obj.memory = JSON.parse(fields.memoryInfo);
            obj.memoryCameraMatrix = JSON.parse(fields.memoryCameraInfo);
            obj.memoryProjectionMatrix = JSON.parse(fields.memoryProjectionInfo);

            await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
            utilities.actionSender({loadMemory: {object: objectID, ip: obj.ip}});
        }

        callback(200, {success: true});
    });
};

const deactivate = function(objectID, callback) {
    try {
        utilities.getObject(objects, objectID).deactivated = true;
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
        sceneGraph.deactivateElement(objectID);
        callback(200, 'ok');
    } catch (e) {
        callback(404, {success: false, error: 'cannot find object with ID' + objectID});
    }
};

const activate = function(objectID, callback) {
    try {
        utilities.getObject(objects, objectID).deactivated = false;
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
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
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
        callback(200, 'ok');
    } catch (e) {
        callback(500, {success: false, error: e.message});
    }
};

// request a zip-file with the object stored inside
// ****************************************************************************************************************
const zipBackup = async function(objectId, req, res) {
    if (!await fileExists(path.join(objectsPath, objectId))) {
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

const generateXml = async function(objectID, body, callback) {
    var msgObject = body;
    var objectName = msgObject.name;

    var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
        '   <Tracking>\n' +
        '   <ImageTarget name="' + objectID + '" size="' + parseFloat(msgObject.width).toFixed(8) + ' ' + parseFloat(msgObject.height).toFixed(8) + '" />\n' +
        '   </Tracking>\n' +
        '   </ARConfig>';

    let targetDir = path.join(objectsPath, objectName, identityFolderName, 'target');
    await mkdirIfNotExists(targetDir);

    var xmlOutFile = path.join(targetDir, 'target.xml');

    try {
        await fsProm.writeFile(xmlOutFile, documentcreate);
    } catch (err) {
        callback(500, 'error writing new target size to .xml file for ' + objectID);
    }

    // TODO: update object.targetSize.width and object.targetSize.height and write to disk (if object exists yet)
    var object = utilities.getObject(objects, objectID);
    if (object) {
        object.targetSize.width = parseFloat(msgObject.width);
        object.targetSize.height = parseFloat(msgObject.height);
        await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
    }
    callback(200, 'ok');
};

/**
 * @param {string} objectId
 * @return {{done: boolean, gaussianSplatRequestId: string|undefined}} result
 */
async function requestGaussianSplatting(objectId) {
    const object = utilities.getObject(objects, objectId);
    if (!object) {
        throw new Error('Object not found');
    }

    let splatTask = await startSplatTask(object);
    // Starting splat task can modify object
    await utilities.writeObjectToFile(objects, objectId, globalVariables.saveToDisk);
    return splatTask.getStatus();
}

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
    if (!fullObject) { return null; }
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

const setup = function (objects_, globalVariables_, hardwareAPI_, objectsPath_, sceneGraph_,
    objectLookup_, activeHeartbeats_, knownObjects_, setAnchors_) {
    objects = objects_;
    globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    objectsPath = objectsPath_;
    sceneGraph = sceneGraph_;
    objectLookup = objectLookup_;
    activeHeartbeats = activeHeartbeats_;
    knownObjects = knownObjects_;
    setAnchors = setAnchors_;
};

module.exports = {
    deleteObject: deleteObject,
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
    setup: setup,
    requestGaussianSplatting,
};
