const fsProm = require('../persistence/fsProm.js');
const path = require('path');
const formidable = require('formidable');
const utilities = require('../libraries/utilities');
const {fileExists, unlinkIfExists, mkdirIfNotExists} = utilities;
const {startSplatTask, splatTasks} = require('./object/SplatTask.js');
const { beatPort } = require('../config.js');

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
let objectBeatSender;

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
        callback = null;
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

        if (!callback) return; // only trigger callback one time

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
 * Sets the renderMode of an object (e.g. 'mesh' or 'ai') and sends the new state to all clients via action message
 * @param {string} objectID
 * @param {Request.body} body
 * @param {function} callback
 */
const setRenderMode = async (objectID, body, callback) => {
    let object = utilities.getObject(objects, objectID);
    if (!object) {
        callback(404, {failure: true, error: 'Object ' + objectID + ' not found'});
        return;
    }
    if (typeof body.renderMode === 'undefined') {
        callback(400, {failure: true, error: `Bad request: no renderMode specified in body`});
        return;
    }

    object.renderMode = body.renderMode;

    await utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
    utilities.actionSender({reloadObject: {object: objectID}, lastEditor: body.lastEditor});
    callback(200, {success: true});
};

/**
 * Upload an image file to the object's metadata folder.
 * The image is stored in a form, which can be parsed and written to the filesystem.
 * @param {string} objectID
 * @param {express.Request} req
 * @param {function} callback
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
        return;
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

    res.attachment(objectId + '.zip').type('zip');
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
 * @param {string|undefined} credentials - Bearer <JWT>
 * @return {{done: boolean, gaussianSplatRequestId: string|undefined}} result
 */
async function requestGaussianSplatting(objectId, credentials) {
    const object = utilities.getObject(objects, objectId);
    if (!object) {
        throw new Error('Object not found');
    }

    let splatTask = await startSplatTask(object, credentials);
    let status = splatTask.getStatus();
    if (status.error && !status.gaussianSplatRequestId) {
        delete splatTasks[object.objectId]; // tasks resulting in error shouldn't be saved as oldTasks that can be resumed
    }
    // Starting splat task can modify object
    await utilities.writeObjectToFile(objects, objectId, globalVariables.saveToDisk);
    return status;
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

/**
 * Check whether a specific file within the object's .identity folder exists
 * @param {string} objectId
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
const checkFileExists = async (objectId, filePath) => {
    let obj = utilities.getObject(objects, objectId);
    if (!obj) {
        return false;
    }

    // prevent upward traversal so this can't be used maliciously. Only allow certain characters, and prevent ../
    // eslint-disable-next-line no-useless-escape
    let isSafePath = /^[a-zA-Z0-9_.\-\/]+$/.test(filePath) && !/\.\.\//.test(filePath);
    if (!isSafePath) {
        return false;
    }

    let objectIdentityDir = path.join(objectsPath, obj.name, identityFolderName);
    let absoluteFilePath = path.join(objectIdentityDir, filePath);
    return await fileExists(absoluteFilePath);
};

/**
 * Check the status of all the possible target files that an object might have
 * @param {string} objectId
 * @returns {Promise<{glbExists: boolean, xmlExists: boolean, datExists: boolean, jpgExists: boolean, _3dtExists: boolean, splatExists: boolean}>}
 */
const checkTargetFiles = async (objectId) => {
    let [
        glbExists, xmlExists, datExists,
        jpgExists, _3dtExists, splatExists
    ] = await Promise.all([
        checkFileExists(objectId, '/target/target.glb'),
        checkFileExists(objectId, '/target/target.xml'),
        checkFileExists(objectId, '/target/target.dat'),
        checkFileExists(objectId, '/target/target.jpg'),
        checkFileExists(objectId, '/target/target.3dt'),
        checkFileExists(objectId, '/target/target.splat'),
    ]);
    return {
        glbExists,
        xmlExists,
        datExists,
        jpgExists,
        _3dtExists,
        splatExists
    };
};

/**
 * Uploads a target file to an object.
 * Imitates much of the logic of the content/:id route in a simpler way.
 * Note: not supported by Cloud Proxy as of 3-4-2024, use content/:id instead.
 * @param {string} objectName
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
const uploadTarget = async (objectName, req, res) => {
    let thisObjectId = utilities.readObject(objectLookup, objectName);
    let object = utilities.getObject(objects, thisObjectId);
    if (!object) {
        res.status(404).send('object ' + thisObjectId + ' not found');
        return;
    }

    // first upload to a temporary directory (tmp/) before moving it to the target directory (target/)
    let uploadDir = path.join(objectsPath, objectName, identityFolderName, 'tmp');
    await mkdirIfNotExists(uploadDir);
    let targetDir = path.join(objectsPath, objectName,  identityFolderName, 'target');
    await mkdirIfNotExists(targetDir);

    let form = new formidable.IncomingForm({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFieldsSize: 1024 * 1024 * 1024, // 1 GB
        maxFileSize: 1024 * 1024 * 1024,
    });

    form.on('error', function (err) {
        res.status(500).send(err);
    });

    let fileInfoList = [];

    form.on('fileBegin', (name, file) => {
        if (!file.name) {
            file.name = file.newFilename; // some versions of formidable use .name, others use .newFilename
        }
        fileInfoList.push({
            name: file.name,
            completed: false
        });
        file.path = path.join(form.uploadDir, file.name);
    });

    form.parse(req);

    /**
     * Returns the file extension (portion after the last dot) of the given filename.
     * If a file name starts with a dot, returns an empty string.
     *
     * @author VisioN @ StackOverflow
     * @param {string} fileName - The name of the file, such as foo.zip
     * @return {string} The lowercase extension of the file, such has "zip"
     */
    function getFileExtension(fileName) {
        return fileName.substr((~-fileName.lastIndexOf('.') >>> 0) + 2).toLowerCase();
    }

    /**
     * Returns a promise that can be executed later to move the uploaded file from the tmp dir to the target dir
     * @param {{name: string, completed: boolean}} fileInfo
     * @returns {Promise<unknown>}
     */
    function makeFileProcessPromise(fileInfo) {
        return new Promise((resolve, reject) => {
            (async () => {
                if (!await fileExists(path.join(form.uploadDir, fileInfo.name))) { // Ignore files that haven't finished uploading
                    reject(`File doesn't exist at ${path.join(form.uploadDir, fileInfo.name)}`);
                    return;
                }
                fileInfo.completed = true; // File has downloaded
                let fileExtension = getFileExtension(fileInfo.name);

                // only accept these predetermined file types
                if (!(fileExtension === 'jpg' || fileExtension === 'dat' ||
                    fileExtension === 'xml' || fileExtension === 'glb' ||
                    fileExtension === '3dt'  || fileExtension === 'splat')) {
                    reject(`File extension not acceptable for targetUpload (${fileExtension})`);
                    return;
                }

                let originalFilepath = path.join(uploadDir, fileInfo.name);
                let newFilepath = path.join(targetDir, `target.${fileExtension}`);

                try {
                    await fsProm.rename(originalFilepath, newFilepath);
                    resolve();
                } catch (e) {
                    reject(`error renaming ${originalFilepath} to ${newFilepath}`);
                }
            })();
        });
    }

    form.on('end', async () => {
        fileInfoList = fileInfoList.filter(fileInfo => !fileInfo.completed); // Don't repeat processing for completed files

        let filePromises = [];
        fileInfoList.forEach(fileInfo => {
            filePromises.push(makeFileProcessPromise(fileInfo));
        });

        try {
            await Promise.all(filePromises);
            // Code continues when all promises are resolved (when all files have been moved from tmp/ to target/)
        } catch (error) {
            console.warn(error);
            // res.status(500).send('error')
        }

        let jpgPath = path.join(targetDir, 'target.jpg');
        let datPath = path.join(targetDir, 'target.dat');
        let xmlPath = path.join(targetDir, 'target.xml');
        let glbPath = path.join(targetDir, 'target.glb');
        let tdtPath = path.join(targetDir, 'target.3dt');
        let splatPath = path.join(targetDir, 'target.splat');
        let fileList = [jpgPath, xmlPath, datPath, glbPath, tdtPath, splatPath];

        let sendObject = {
            id: thisObjectId,
            name: objectName,
            // initialized: (jpg && xml),
            jpgExists: await fileExists(jpgPath),
            xmlExists: await fileExists(xmlPath),
            datExists: await fileExists(datPath),
            glbExists: await fileExists(glbPath),
            tdtExists: await fileExists(tdtPath),
            splatExists: await fileExists(splatPath)
        };

        object.tcs = utilities.generateChecksums(objects, fileList);
        await utilities.writeObjectToFile(objects, thisObjectId, globalVariables.saveToDisk);
        await setAnchors();

        await objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

        // delete the tmp folder and any files within it
        await utilities.rmdirIfExists(uploadDir);

        try {
            res.status(200).json(sendObject);
        } catch (e) {
            console.error('unable to send res', e);
        }
    });
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
    objectLookup_, activeHeartbeats_, knownObjects_, setAnchors_, objectBeatSender_) {
    objects = objects_;
    globalVariables = globalVariables_;
    hardwareAPI = hardwareAPI_;
    objectsPath = objectsPath_;
    sceneGraph = sceneGraph_;
    objectLookup = objectLookup_;
    activeHeartbeats = activeHeartbeats_;
    knownObjects = knownObjects_;
    setAnchors = setAnchors_;
    objectBeatSender = objectBeatSender_;
};

module.exports = {
    deleteObject: deleteObject,
    uploadVideo: uploadVideo,
    uploadMediaFile: uploadMediaFile,
    saveCommit: saveCommit,
    resetToLastCommit: resetToLastCommit,
    setMatrix: setMatrix,
    setRenderMode: setRenderMode,
    memoryUpload: memoryUpload,
    deactivate: deactivate,
    activate: activate,
    setVisualization: setVisualization,
    zipBackup: zipBackup,
    generateXml: generateXml,
    setFrameSharingEnabled: setFrameSharingEnabled,
    checkFileExists: checkFileExists,
    checkTargetFiles: checkTargetFiles,
    uploadTarget: uploadTarget,
    getObject: getObject,
    setup: setup,
    requestGaussianSplatting,
};
