const express = require('express');
const router = express.Router();

const blockController = require('../controllers/block.js');
const blockLinkController = require('../controllers/blockLink.js');
const frameController = require('../controllers/frame.js');
const logicNodeController = require('../controllers/logicNode.js');
const linkController = require('../controllers/link.js');
const nodeController = require('../controllers/node.js');
const objectController = require('../controllers/object.js');

// Variables populated from server.js with setup()
var objects = {};
var knownObjects = {};
var socketArray = {};
var globalVariables;
var engine;
var hardwareAPI;
var serverDirName;
var objectsPath;
var identityFolderName;
var Jimp;
var socketUpdater;
var git;
var nodeTypeModules;

// logic node handling
// logic links
router.post('/*/frame/*/node/*/link/*/addBlockLink/', function (req, res) {
    res.send(blockLinkController.addLogicLink(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3], req.body));
});
router.delete('/*/frame/*/node/*/link/*/editor/*/deleteBlockLink/', function (req, res) {
    res.send(blockLinkController.deleteLogicLink(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3], req.params[4]));
});

// logic blocks
router.post('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/addBlock/', function (req, res) {
    res.send(blockController.addNewBlock(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.body));
});
router.delete('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/editor/:lastEditor/deleteBlock/', function (req, res) {
    res.send(blockController.deleteBlock(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.params.lastEditor));
});
router.post('/*/frame/*/node/*/block/*/blockPosition/', function (req, res) {
    res.send(blockController.postBlockPosition(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3], req.body));
});
router.post('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/triggerBlock/', function (req, res) {
    res.send(blockController.triggerBlock(objects, engine, req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.body));
});

// logic nodes
router.post('/*/frame/*/node/*/addLogicNode/', function (req, res) {
    res.send(logicNodeController.addLogicNode(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.body));
});
router.delete('/*/frame/*/node/*/editor/*/deleteLogicNode', function (req, res) {
    res.send(logicNodeController.deleteLogicNode(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3]));
});
router.post('/*/frame/*/node/*/nodeSize/', function (req, res) {
    logicNodeController.changeNodeSize(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.body, function (statusCode, responseContents) {
        res.status(statusCode).send(responseContents);
    });
});
router.post('/:objectID/frame/:frameID/node/:nodeID/rename/', function (req, res) {
    logicNodeController.rename(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.params.nodeID, req.body, function (statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/node/:nodeID/uploadIconImage', function (req, res) {
    logicNodeController.uploadIconImage(objects, globalVariables, objectsPath, identityFolderName, Jimp, req.params.objectID, req.params.frameID, req.params.nodeID, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});

// normal links
router.delete('/*/link/*/lastEditor/*/', function (req, res) {
    res.send(linkController.deleteLink(objects, knownObjects, socketArray, globalVariables, objectsPath, hardwareAPI, req.params[0], req.params[0], req.params[1], req.params[2]));
});
router.delete('/*/frame/*/link/*/editor/*/deleteLink', function (req, res) {
    res.send(linkController.deleteLink(objects, knownObjects, socketArray, globalVariables, objectsPath, hardwareAPI, req.params[0], req.params[1], req.params[2], req.params[3]));
});
// todo links for programs as well
router.post('/:objectID/frame/:frameID/link/:linkID/addLink/', function (req, res) {
    console.log('routed by 2');
    res.status(200).send(linkController.newLink(objects, globalVariables, objectsPath, hardwareAPI, socketUpdater, req.params.objectID, req.params.frameID, req.params.linkID, req.body));
});
router.post('/*/link/*/', function (req, res) {
    console.log('routed by 1');
    res.status(200).send(linkController.newLink(objects, globalVariables, objectsPath, hardwareAPI, socketUpdater, req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/linkLock/*/', function (req, res) {
    res.send(linkController.addLinkLock(objects, globalVariables, objectsPath, req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/frame/*/link/*/addLock', function (req, res) {
    res.send(linkController.addLinkLock(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.body));
});
router.delete('/*/linkLock/*/password/*/', function (req, res) {
    res.send(linkController.deleteLinkLock(objects, globalVariables, objectsPath, req.params[0], req.params[0], req.params[1], req.params[2]));
});
router.delete('/*/frame/*/link/*/password/*/deleteLock', function (req, res) {
    res.send(linkController.deleteLinkLock(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3]));
});

// normal nodes
router.post('/:objectKey/frame/:frameKey/node/:nodeKey/addNode', function (req, res) {
    nodeController.addNodeToFrame(objects, globalVariables, objectsPath, req.params.objectKey, req.params.frameKey, req.params.nodeKey, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectKey/node/:nodeKey/', function (req, res) {
    nodeController.addNodeToFrame(objects, globalVariables, objectsPath, req.params.objectKey, req.params.objectKey, req.params.nodeKey, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/*/nodeLock/*/', function (req, res) {
    res.send(nodeController.addNodeLock(objects, globalVariables, objectsPath, req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/frame/*/node/*/addLock/', function (req, res) {
    res.send(nodeController.addNodeLock(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.body));
});
// TODO: add robust security to the "password" field
router.delete('/*/frame/*/node/*/password/*/deleteLock', function (req, res) {
    res.send(nodeController.deleteNodeLock(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.params[2], req.params[3]));
});
router.delete('/*/nodeLock/*/password/*/', function (req, res) {
    res.send(nodeController.deleteNodeLock(objects, globalVariables, objectsPath, req.params[0], req.params[0], req.params[1], req.params[2]));
});

// objects
/**
 * Upload a video file to the object's metadata folder.
 * The video is stored in a form, which can be parsed and written to the filesystem.
 * @todo compress video
 */
router.post('/:objectID/video/:videoId', function (req, res) {
    objectController.uploadVideo(objects, objectsPath, identityFolderName, globalVariables.isMobile, req.params.objectID, req.params.videoID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
// object git interfaces
router.post('/:objectID/saveCommit', function (req, res) {
    objectController.saveCommit(objects, globalVariables.isMobile, git, req.params.objectID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectID/resetToLastCommit', function (req, res) {
    objectController.resetToLastCommit(objects, globalVariables.isMobile, hardwareAPI, git, req.params.objectID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectID/matrix', function (req, res) {
    objectController.setMatrix(objects, globalVariables, objectsPath, req.params.objectID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/memory', function (req, res) {
    objectController.memoryUpload(objects, globalVariables, objectsPath, identityFolderName, req.params.objectID, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});

// frames
// Generates uuid
router.post('/*/frames/', function (req, res) {
    var frameId = 'frame' + utilities.uuidTime();
    frameController.addFrameToObject(objects, globalVariables, serverDirName, objectsPath, hardwareAPI, nodeTypeModules, req.params[0], frameId, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Uses given uuid
router.post('/*/addFrame/', function (req, res) {
    frameController.addFrameToObject(objects, globalVariables, serverDirName, objectsPath, hardwareAPI, nodeTypeModules, req.params[0], req.body.uuid, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Update the publicData of a frame when it gets moved from one object to another
router.delete('/:objectID/frame/:frameID/publicData', function (req, res) {
    frameController.deletePublicData(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/publicData', function (req, res) {
    frameController.addPublicData(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
/**
 * Creates a copy of the frame (happens when you pull an instance from a staticCopy frame)
 */
router.post('/:objectID/frames/:frameID/copyFrame/', function (req, res) {
    frameController.copyFrame(objects, globalVariables, objectsPath, hardwareAPI, req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/*/frames/*/', function (req, res) {
    frameController.updateFrame(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.delete('/:objectID/frames/:frameID/', function (req, res) {
    frameController.deleteFrame(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/group/', function (req, res) {
    frameController.setGroup(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});

const setupDeveloperRoutes = function() {
    // normal nodes
    router.post('/:objectID/frame/:frameID/node/:nodeID/size/', function (req, res) {
        nodeController.changeSize(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, req.params.nodeID, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.get('/:objectID/frame/:frameID/node/:nodeID/', function (req, res) {
        var node = nodeController.getNode(objects, req.params.objectID, req.params.frameID, req.params.nodeID);
        res.json(node || {}).end();
    });

    // frames
    router.post('/:objectID/frame/:frameID/size/', function (req, res) {
        frameController.changeSize(objects, globalVariables, objectsPath, req.params.objectID, req.params.frameID, null, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.post('/*/frame/*/visualization/', function (req, res) {
        frameController.changeVisualization(objects, globalVariables, objectsPath, req.params[0], req.params[1], req.body, function (statusCode, responseContents) {
            res.status(statusCode).json(responseContents).end();
        });
    });
    router.get('/object/*/*/reset/', function (req, res) {
        frameController.resetPositioning(objects, globalVariables, objectsPath, req.params[0], req.params[1], function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/*/frame/*/', function (req, res) {
        var frame = frameController.getFrame(objects, req.params[0], req.params[1]);
        if (frame) {
            res.status(200).json(frame).end();
            return;
        }
        res.status(404).json({
            failure: true,
            error: 'Object: ' + req.params[0] + ', frame: ' + req.params[1] + ' not found'
        }).end();
    });
    
    // objects
    router.get('/*/deactivate/', function (req, res) {
        objectController.deactivate(objects, globalVariables, objectsPath, req.params[0], function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/*/activate/', function (req, res) {
        objectController.activate(objects, globalVariables, objectsPath, req.params[0], function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/*/screen/', function (req, res) {
        objectController.setVisualization(objects, globalVariables, objectsPath, req.params[0], 'screen', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/*/ar/', function (req, res) {
        objectController.setVisualization(objects, globalVariables, objectsPath, req.params[0], 'ar', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectID/zipBackup/', function (req, res) {
        objectController.zipBackup(objectsPath, globalVariables.isMobile, req.params.objectID, req, res);
    });
    router.post('/:objectID/generateXml/', function (req, res) {
        objectController.generateXml(objects, globalVariables, objectsPath, identityFolderName, req.params.objectID, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectID/disableFrameSharing/', function (req, res) {
        objectController.setFrameSharingEnabled(objectID, false, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectKey/enableFrameSharing/', function (req, res) {
        objectController.setFrameSharingEnabled(objectKey, true, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectId/', function (req, res) {
        res.json(objectController.getObject(req.params.objectId)).end();
    });
}

const setup = function(objects_, knownObjects_, socketArray_, globalVariables_, engine_, hardwareAPI_, serverDirName_, objectsPath_, identityFolderName_, Jimp_, socketUpdater_, git_, nodeTypeModules_) {
    objects = objects_;
    knownObjects = knownObjects_;
    socketArray = socketArray_;
    globalVariables = globalVariables_;
    engine = engine_;
    hardwareAPI = hardwareAPI_;
    serverDirName = serverDirName_;
    objectsPath = objectsPath_;
    identityFolderName = identityFolderName_;
    Jimp = Jimp_;
    socketUpdater = socketUpdater_;
    git = git_;
    nodeTypeModules = nodeTypeModules_;
    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        setupDeveloperRoutes();
    }
}

module.exports = {
    router: router,
    setup: setup
};