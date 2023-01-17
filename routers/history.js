const express = require('express');
const router = express.Router();
// const recorder = require('../libraries/recorder.js');

let patches = [];

router.get('/', function(req, res) {
    // res.json(recorder.timeObject);
    res.sendFile('/Users/james/re/vuforia-spatial-edge-server/libraries/objectLogs/objects_1670865168825.json');
});

router.get('/patches', function(req, res) {
    res.json(patches);
});

router.post('/patches', function(req, res) {
    if (!req.body || !req.body.key) {
        res.status(400).send('Incorrect patch format');
        return;
    }
    for (let patch of patches) {
        if (patch.key === req.body.key) {
            console.warn('duplicate patch');
            res.send('patch uploaded');
            return;
        }
    }

    patches.push(req.body);
    res.send('patch uploaded');
});

router.delete('/patches/:key', function(req, res) {
    if (!req.params.key) {
        res.status(400).send('Must provide patch key');
        return;
    }

    patches = patches.filter(patch => {
        return patch.key !== req.params.key;
    });

    res.send('patch deleted');
});

module.exports = {
    router,
};
