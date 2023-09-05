const express = require('express');
const router = express.Router();

const spatialController = require('../controllers/spatial.js');

router.get('/sceneGraph', function (req, res) {
    var sceneGraph = spatialController.getSceneGraph();
    if (sceneGraph) {
        res.status(200).json(sceneGraph).end();
        return;
    }
    res.status(404).json({
        failure: true,
        error: 'Scene Graph not available on this server'
    }).end();
});

/**
 * searchObjects is currently a stub, intended to be implemented similarly to searchFrames
 * @todo: implement spatialController.searchObjects
 */
router.get('/searchObjects', function (req, res) {
    spatialController.searchObjects(req.query, function(results, err) {
        if (!err) {
            res.status(200).json(results).end();
        } else {
            res.status(err.code).send(err.message);
        }
    });
});

/**
 * searchFrames can be used to find all frames on any object on this server that match the provided queryParams,
 * regardless of whether they are pinned or unpinned.
 *
 * Example usage:
 * http://localhost:8080/spatial/searchFrames?maxDistance=2000&src=communication&publicData.title.includes=Machine&publicData.mentions.includes=@Ben
 *
 * queryParams:
 *  { maxDistance: '2000',
    src: 'communication',
    'publicData.title.includes': 'Machine',
    'publicData.mentions.includes': '@Ben'}
 *
 * This will return a JSON object with an array of validAddresses in the format
 * { validAddresses: [{objectId: string, frameId: string}, ...] }
 *
 * Given the validAddresses, a client can then directly download the frame data from the endpoint:
 * GET /object/:objectId/frame/:frameId
 */
router.get('/searchFrames', function (req, res) {
    spatialController.searchFrames(req.query, function(results, err) {
        if (!err) {
            res.status(200).json(results).end();
        } else {
            res.status(err.code).send(err.message);
        }
    });
});

const setup = function() {
};

module.exports = {
    router: router,
    setup: setup
};
