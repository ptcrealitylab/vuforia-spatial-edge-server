const utilities = require('../libraries/utilities');
const express = require('express');
const router = express.Router();

const blockController = require('../controllers/block.js');
const blockLinkController = require('../controllers/blockLink.js');
const frameController = require('../controllers/frame.js');
const linkController = require('../controllers/link.js');
const logicNodeController = require('../controllers/logicNode.js');
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

// logic links
router.post('/*/frame/*/node/*/link/*/addBlockLink/', function (req, res) {
    res.send(blockLinkController.addLogicLink(req.params[0], req.params[1], req.params[2], req.params[3], req.body));
});
router.delete('/*/frame/*/node/*/link/*/editor/*/deleteBlockLink/', function (req, res) {
    res.send(blockLinkController.deleteLogicLink(req.params[0], req.params[1], req.params[2], req.params[3], req.params[4]));
});

// logic blocks
router.post('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/addBlock/', function (req, res) {
    res.send(blockController.addNewBlock(req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.body));
});
router.delete('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/editor/:lastEditor/deleteBlock/', function (req, res) {
    res.send(blockController.deleteBlock(req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.params.lastEditor));
});
router.post('/*/frame/*/node/*/block/*/blockPosition/', function (req, res) {
    res.send(blockController.postBlockPosition(req.params[0], req.params[1], req.params[2], req.params[3], req.body));
});
router.post('/:objectID/frame/:frameID/node/:nodeID/block/:blockID/triggerBlock/', function (req, res) {
    res.send(blockController.triggerBlock(req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.body));
});

// logic nodes
router.post('/*/frame/*/node/*/addLogicNode/', function (req, res) {
    res.send(logicNodeController.addLogicNode(req.params[0], req.params[1], req.params[2], req.body));
});
router.delete('/*/frame/*/node/*/editor/*/deleteLogicNode', function (req, res) {
    res.send(logicNodeController.deleteLogicNode(req.params[0], req.params[1], req.params[2], req.params[3]));
});
router.post('/*/frame/*/node/*/nodeSize/', function (req, res) {
    logicNodeController.changeNodeSize(req.params[0], req.params[1], req.params[2], req.body, function (statusCode, responseContents) {
        res.status(statusCode).send(responseContents);
    });
});
router.post('/:objectID/frame/:frameID/node/:nodeID/rename/', function (req, res) {
    logicNodeController.rename(req.params.objectID, req.params.frameID, req.params.nodeID, req.body, function (statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/node/:nodeID/uploadIconImage', function (req, res) {
    logicNodeController.uploadIconImage(req.params.objectID, req.params.frameID, req.params.nodeID, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});

// normal links
router.delete('/*/link/*/lastEditor/*/', function (req, res) {
    res.send(linkController.deleteLink(req.params[0], req.params[0], req.params[1], req.params[2]));
});
router.delete('/*/frame/*/link/*/editor/*/deleteLink', function (req, res) {
    res.send(linkController.deleteLink(req.params[0], req.params[1], req.params[2], req.params[3]));
});
// todo links for programs as well
router.post('/:objectID/frame/:frameID/link/:linkID/addLink/', function (req, res) {
    console.log('routed by 2');
    res.status(200).send(linkController.newLink(req.params.objectID, req.params.frameID, req.params.linkID, req.body));
});
router.post('/*/link/*/', function (req, res) {
    console.log('routed by 1');
    res.status(200).send(linkController.newLink(req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/linkLock/*/', function (req, res) {
    res.send(linkController.addLinkLock(req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/frame/*/link/*/addLock', function (req, res) {
    res.send(linkController.addLinkLock(req.params[0], req.params[1], req.params[2], req.body));
});
router.delete('/*/linkLock/*/password/*/', function (req, res) {
    res.send(linkController.deleteLinkLock(req.params[0], req.params[0], req.params[1], req.params[2]));
});
router.delete('/*/frame/*/link/*/password/*/deleteLock', function (req, res) {
    res.send(linkController.deleteLinkLock(req.params[0], req.params[1], req.params[2], req.params[3]));
});

// normal nodes
router.post('/:objectKey/frame/:frameKey/node/:nodeKey/addNode', function (req, res) {
    nodeController.addNodeToFrame(req.params.objectKey, req.params.frameKey, req.params.nodeKey, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectKey/node/:nodeKey/', function (req, res) {
    nodeController.addNodeToFrame(req.params.objectKey, req.params.objectKey, req.params.nodeKey, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/*/nodeLock/*/', function (req, res) {
    res.send(nodeController.addNodeLock(req.params[0], req.params[0], req.params[1], req.body));
});
router.post('/*/frame/*/node/*/addLock/', function (req, res) {
    res.send(nodeController.addNodeLock(req.params[0], req.params[1], req.params[2], req.body));
});
// TODO: add robust security to the "password" field
router.delete('/*/frame/*/node/*/password/*/deleteLock', function (req, res) {
    res.send(nodeController.deleteNodeLock(req.params[0], req.params[1], req.params[2], req.params[3]));
});
router.delete('/*/nodeLock/*/password/*/', function (req, res) {
    res.send(nodeController.deleteNodeLock(req.params[0], req.params[0], req.params[1], req.params[2]));
});

// objects
/**
 * Upload a video file to the object's metadata folder.
 * The video is stored in a form, which can be parsed and written to the filesystem.
 * @todo compress video
 */
router.post('/:objectID/video/:videoId', function (req, res) {
    objectController.uploadVideo(req.params.objectID, req.params.videoID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
// object git interfaces
router.post('/:objectID/saveCommit', function (req, res) {
    objectController.saveCommit(req.params.objectID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectID/resetToLastCommit', function (req, res) {
    objectController.resetToLastCommit(req.params.objectID, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectID/matrix', function (req, res) {
    objectController.setMatrix(req.params.objectID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/memory', function (req, res) {
    objectController.memoryUpload(req.params.objectID, req, function (statusCode, responseContents) {
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
    frameController.addFrameToObject(req.params[0], frameId, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Uses given uuid
router.post('/*/addFrame/', function (req, res) {
    frameController.addFrameToObject(req.params[0], req.body.uuid, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Update the publicData of a frame when it gets moved from one object to another
router.delete('/:objectID/frame/:frameID/publicData', function (req, res) {
    frameController.deletePublicData(req.params.objectID, req.params.frameID, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/publicData', function (req, res) {
    frameController.addPublicData(req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
/**
 * Creates a copy of the frame (happens when you pull an instance from a staticCopy frame)
 */
router.post('/:objectID/frames/:frameID/copyFrame/', function (req, res) {
    frameController.copyFrame(req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/*/frames/*/', function (req, res) {
    frameController.updateFrame(req.params[0], req.params[1], req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.delete('/:objectID/frames/:frameID/', function (req, res) {
    frameController.deleteFrame(req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectID/frame/:frameID/group/', function (req, res) {
    frameController.setGroup(req.params.objectID, req.params.frameID, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});

const setupDeveloperRoutes = function() {
    // normal nodes
    router.post('/:objectID/frame/:frameID/node/:nodeID/size/', function (req, res) {
        nodeController.changeSize(req.params.objectID, req.params.frameID, req.params.nodeID, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.get('/:objectID/frame/:frameID/node/:nodeID/', function (req, res) {
        var node = nodeController.getNode(req.params.objectID, req.params.frameID, req.params.nodeID);
        res.json(node || {}).end();
    });

    // frames
    router.post('/:objectID/frame/:frameID/size/', function (req, res) {
        frameController.changeSize(req.params.objectID, req.params.frameID, null, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.post('/*/frame/*/visualization/', function (req, res) {
        frameController.changeVisualization(req.params[0], req.params[1], req.body, function (statusCode, responseContents) {
            res.status(statusCode).json(responseContents).end();
        });
    });
    router.get('/object/*/*/reset/', function (req, res) {
        frameController.resetPositioning(req.params[0], req.params[1], function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/*/frame/*/', function (req, res) {
        var frame = frameController.getFrame(req.params[0], req.params[1]);
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
        objectController.deactivate(req.params[0], function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/*/activate/', function (req, res) {
        objectController.activate(req.params[0], function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/*/screen/', function (req, res) {
        objectController.setVisualization(req.params[0], 'screen', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/*/ar/', function (req, res) {
        objectController.setVisualization(req.params[0], 'ar', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectID/zipBackup/', function (req, res) {
        objectController.zipBackup(req.params.objectID, req, res);
    });
    router.post('/:objectID/generateXml/', function (req, res) {
        objectController.generateXml(req.params.objectID, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectID/disableFrameSharing/', function (req, res) {
        objectController.setFrameSharingEnabled(req.params.objectID, false, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectID/enableFrameSharing/', function (req, res) {
        objectController.setFrameSharingEnabled(req.params.objectID, true, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectID/', function (req, res) {
        res.json(objectController.getObject(req.params.objectID)).end();
    });
}

const setup = function(globalVariables_) {
    globalVariables = globalVariables_;
    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        setupDeveloperRoutes();
    }
}

module.exports = {
    router: router,
    setup: setup
};