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


const setup = function() {
};

module.exports = {
    router: router,
    setup: setup
};
