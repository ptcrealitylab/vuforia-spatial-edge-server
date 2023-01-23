const express = require('express');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const recorder = require('../libraries/recorder.js');

const router = express.Router();

const gzipStream = zlib.createGzip();

let patches = [];

router.get('/logs', function(req, res) {
    fs.readdir(recorder.logsPath, function (err, files) {
        const logNames = {};
        for (let file of files) {
            if (file.endsWith('.json.gz')) {
                let jsonLogName = file.split('.')[0] + '.json';
                logNames[jsonLogName] = true;
            }
        }
        res.json(Object.keys(logNames));
    });
});

router.get('/logs/:logPath', function(req, res) {
    // res.json(recorder.timeObject);
    let compressedLogPath = path.join(recorder.logsPath, req.params.logPath + '.gz');
    if (!fs.existsSync(compressedLogPath)) {
        res.sendStatus(404);
        return;
    }

    res.set('Vary', 'Accept-Encoding');
    res.set('Content-Type', 'application/json');
    if (req.get('Accept-Encoding').includes('gzip')) {
        res.set('Content-Encoding', 'gzip');
        const readStream = fs.createReadStream(compressedLogPath);
        readStream.pipe(res);
    } else {
        const readStream = fs.createReadStream(compressedLogPath);
        readStream.pipe(gzipStream).pipe(res);
    }
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
