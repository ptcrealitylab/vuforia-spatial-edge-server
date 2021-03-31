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

// logic links
router.post('/:objectName/frame/:frameName/node/:nodeName/link/:linkName/addBlockLink/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, node, or link name. Must be alphanumeric.');
        return;
    }
    res.send(blockLinkController.addLogicLink(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.linkName, req.body));
});
router.delete('/:objectName/frame/:frameName/node/:nodeName/link/:linkName/editor/:lastEditor/deleteBlockLink/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, node, or link name. Must be alphanumeric.');
        return;
    }
    res.send(blockLinkController.deleteLogicLink(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.linkName, req.params.lastEditor));
});

// logic blocks
router.post('/:objectName/frame/:frameName/node/:nodeName/block/:blockName/addBlock/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, frame, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.addNewBlock(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.blockName, req.body));
});
router.delete('/:objectName/frame/:frameName/node/:nodeName/block/:blockName/editor/:lastEditor/deleteBlock/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, frame, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.deleteBlock(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.blockName, req.params.lastEditor));
});
router.post('/:objectName/frame/:frameName/node/:nodeName/block/:blockName/blockPosition/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, frame, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.postBlockPosition(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.blockName, req.body));
});
router.post('/:objectName/frame/:frameName/node/:nodeName/block/:blockName/triggerBlock/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.params.blockName)) {
        res.status(400).send('Invalid object, frame, node, or block name. Must be alphanumeric.');
        return;
    }
    res.send(blockController.triggerBlock(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.blockName, req.body));
});

// logic nodes
router.post('/:objectName/frame/:frameName/node/:nodeName/addLogicNode/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    res.send(logicNodeController.addLogicNode(req.params.objectName, req.params.frameName, req.params.nodeName, req.body));
});
router.delete('/:objectName/frame/:frameName/node/:nodeName/editor/:lastEditor/deleteLogicNode', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    res.send(logicNodeController.deleteLogicNode(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.lastEditor));
});
router.post('/:objectName/frame/:frameName/node/:nodeName/nodeSize/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    logicNodeController.changeNodeSize(req.params.objectName, req.params.frameName, req.params.nodeName, req.body, function (statusCode, responseContents) {
        res.status(statusCode).send(responseContents);
    });
});
router.post('/:objectName/frame/:frameName/node/:nodeName/rename/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName) || !utilities.isValidId(req.body.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    logicNodeController.rename(req.params.objectName, req.params.frameName, req.params.nodeName, req.body, function (statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/frame/:frameName/node/:nodeName/uploadIconImage', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    logicNodeController.uploadIconImage(req.params.objectName, req.params.frameName, req.params.nodeName, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});

// normal links
router.delete('/:objectName/link/:linkName/lastEditor/:lastEditor/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.deleteLink(req.params.objectName, req.params.objectName, req.params.linkName, req.params.lastEditor));
});
router.delete('/:objectName/frame/:frameName/link/:linkName/editor/:lastEditor/deleteLink', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.deleteLink(req.params.objectName, req.params.frameName, req.params.linkName, req.params.lastEditor));
});
// todo links for programs as well
router.post('/:objectName/frame/:frameName/link/:linkName/addLink/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, or link name. Must be alphanumeric.');
        return;
    }
    console.log('routed by 2');
    res.status(200).send(linkController.newLink(req.params.objectName, req.params.frameName, req.params.linkName, req.body));
});
router.post('/:objectName/link/:linkName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object or link name. Must be alphanumeric.');
        return;
    }
    console.log('routed by 1');
    res.status(200).send(linkController.newLink(req.params.objectName, req.params.objectName, req.params.linkName, req.body));
});
router.post('/:objectName/linkLock/:linkName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.addLinkLock(req.params.objectName, req.params.objectName, req.params.linkName, req.body));
});
router.post('/:objectName/frame/:frameName/link/:linkName/addLock', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.addLinkLock(req.params.objectName, req.params.frameName, req.params.linkName, req.body));
});
router.delete('/:objectName/linkLock/:linkName/password/:password/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.deleteLinkLock(req.params.objectName, req.params.objectName, req.params.linkName, req.params.password));
});
router.delete('/:objectName/frame/:frameName/link/:linkName/password/:password/deleteLock', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.linkName)) {
        res.status(400).send('Invalid object, frame, or link name. Must be alphanumeric.');
        return;
    }
    res.send(linkController.deleteLinkLock(req.params.objectName, req.params.frameName, req.params.linkName, req.params.password));
});

// normal nodes
router.post('/:objectName/frame/:frameName/node/:nodeName/addNode', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    nodeController.addNodeToFrame(req.params.objectName, req.params.frameName, req.params.nodeName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/node/:nodeName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object or node name. Must be alphanumeric.');
        return;
    }
    nodeController.addNodeToFrame(req.params.objectName, req.params.objectName, req.params.nodeName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/nodeLock/:nodeName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object or node name. Must be alphanumeric.');
        return;
    }
    res.send(nodeController.addNodeLock(req.params.objectName, req.params.objectName, req.params.nodeName, req.body));
});
router.post('/:objectName/frame/:frameName/node/:nodeName/addLock/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    res.send(nodeController.addNodeLock(req.params.objectName, req.params.frameName, req.params.nodeName, req.body));
});
// TODO: add robust security to the "password" field
router.delete('/:objectName/frame/:frameName/node/:nodeName/password/:password/deleteLock', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    res.send(nodeController.deleteNodeLock(req.params.objectName, req.params.frameName, req.params.nodeName, req.params.password));
});
router.delete('/:objectName/nodeLock/:nodeName/password/:password/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.nodeName)) {
        res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
        return;
    }
    res.send(nodeController.deleteNodeLock(req.params.objectName, req.params.objectName, req.params.nodeName, req.params.password));
});

// objects
/**
 * Upload a video file to the object's metadata folder.
 * The video is stored in a form, which can be parsed and written to the filesystem.
 * @todo compress video
 */
router.post('/:objectName/video/:videoName', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    objectController.uploadVideo(req.params.objectName, req.params.videoName, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectName/uploadMediaFile', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    objectController.uploadMediaFile(req.params.objectName, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
// object git interfaces
router.post('/:objectName/saveCommit', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    objectController.saveCommit(req.params.objectName, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectName/resetToLastCommit', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    objectController.resetToLastCommit(req.params.objectName, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});
router.post('/:objectName/matrix', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    objectController.setMatrix(req.params.objectName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/memory', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    objectController.memoryUpload(req.params.objectName, req, function (statusCode, responseContents) {
        if (statusCode === 500) {
            res.status(statusCode).send(responseContents);
        } else {
            res.status(statusCode).json(responseContents).end();
        }
    });
});

// frames
// Generates uuid
router.post('/:objectName/frames/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    var frameId = 'frame' + utilities.uuidTime();
    frameController.addFrameToObject(req.params.objectName, frameId, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Uses given uuid
router.post('/:objectName/addFrame/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName)) {
        res.status(400).send('Invalid object name. Must be alphanumeric.');
        return;
    }
    frameController.addFrameToObject(req.params.objectName, req.body.uuid, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
// Update the publicData of a frame when it gets moved from one object to another
router.delete('/:objectName/frame/:frameName/publicData', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.deletePublicData(req.params.objectName, req.params.frameName, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/frame/:frameName/publicData', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.addPublicData(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
/**
 * Creates a copy of the frame (happens when you pull an instance from a staticCopy frame)
 */
router.post('/:objectName/frames/:frameName/copyFrame/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.copyFrame(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/frames/:frameName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.updateFrame(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.delete('/:objectName/frames/:frameName/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.deleteFrame(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});
router.post('/:objectName/frame/:frameName/group/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.setGroup(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});

router.post('/:objectName/frame/:frameName/pinned/', function (req, res) {
    if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
        return;
    }
    frameController.setPinned(req.params.objectName, req.params.frameName, req.body, function(statusCode, responseContents) {
        res.status(statusCode).json(responseContents).end();
    });
});

const setupDeveloperRoutes = function() {
    // normal nodes
    router.post('/:objectName/frame/:frameName/node/:nodeName/size/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
            res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
            return;
        }
        nodeController.changeSize(req.params.objectName, req.params.frameName, req.params.nodeName, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.get('/:objectName/frame/:frameName/node/:nodeName/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName) || !utilities.isValidId(req.params.nodeName)) {
            res.status(400).send('Invalid object, frame, or node name. Must be alphanumeric.');
            return;
        }
        var node = nodeController.getNode(req.params.objectName, req.params.frameName, req.params.nodeName);
        res.json(node || {}).end();
    });

    // frames
    router.post('/:objectName/frame/:frameName/size/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
            return;
        }
        frameController.changeSize(req.params.objectName, req.params.frameName, null, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send({status: responseContents});
        });
    });
    router.post('/:objectName/frame/:frameName/visualization/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
            return;
        }
        frameController.changeVisualization(req.params.objectName, req.params.frameName, req.body, function (statusCode, responseContents) {
            res.status(statusCode).json(responseContents).end();
        });
    });
    router.get('/:objectName/:frameName/reset/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
            return;
        }
        frameController.resetPositioning(req.params.objectName, req.params.frameName, function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectName/frame/:frameName/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
            return;
        }
        var frame = frameController.getFrame(req.params.objectName, req.params.frameName);
        if (frame) {
            res.status(200).json(frame).end();
            return;
        }
        res.status(404).json({
            failure: true,
            error: 'Object: ' + req.params.objectName + ', frame: ' + req.params.frameName + ' not found'
        }).end();
    });

    // objects
    router.get('/:objectName/deactivate/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.deactivate(req.params.objectName, function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/:objectName/activate/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.activate(req.params.objectName, function (statusCode, responseContents) {
            if (statusCode === 200) {
                res.status(statusCode).send(responseContents);
            } else {
                res.status(statusCode).json(responseContents).end();
            }
        });
    });
    router.get('/:objectName/screen/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.setVisualization(req.params.objectName, 'screen', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectName/ar/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.setVisualization(req.params.objectName, 'ar', function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectName/zipBackup/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.zipBackup(req.params.objectName, req, res);
    });
    router.post('/:objectName/generateXml/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.generateXml(req.params.objectName, req.body, function (statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });
    router.get('/:objectName/disableFrameSharing/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.setFrameSharingEnabled(req.params.objectName, false, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectName/enableFrameSharing/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        objectController.setFrameSharingEnabled(req.params.objectName, true, function (success, errorMessage) {
            if (success) {
                res.status(200).send('ok');
            } else {
                res.status(500).send(errorMessage);
            }
        });
    });
    router.get('/:objectName/', function (req, res) {
        if (!utilities.isValidId(req.params.objectName)) {
            res.status(400).send('Invalid object name. Must be alphanumeric.');
            return;
        }
        let excludeUnpinned = (req.query.excludeUnpinned === 'true');
        console.log(excludeUnpinned);
        res.json(objectController.getObject(req.params.objectName, excludeUnpinned)).end();
    });
};

const setup = function(globalVariables) {
    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        setupDeveloperRoutes();
    }
};

module.exports = {
    router: router,
    setup: setup
};
