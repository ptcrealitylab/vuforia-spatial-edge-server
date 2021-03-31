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

router.get('/searchObjects', function (req, res) {
    spatialController.searchObjects(req.query, function(results, err) {
        if (!err) {
            res.status(200).json(results).end();
        } else {
            res.status(err.code).send(err.message);
        }
    });
});

// http://localhost:8080/spatial/searchFrames?maxDistance=2000&src=communication&publicData.title.includes=Machine&publicData.mentions.includes=@Ben

router.get('/searchFrames', function (req, res) {
    // let maxDistance = req.query.maxDistance;

    /*
    { maxDistance: '2000',
    src: 'communication',
    'publicData.title.includes': 'Machine',
    'publicData.mentions.includes': '@Ben' }
     */

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
