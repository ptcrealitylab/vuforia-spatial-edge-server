const express = require('express');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const zlib = require('zlib');

const recorder = require('../libraries/recorder.js');

const router = express.Router();

let patches = [];

router.get('/logs', function(req, res) {
    if (fs.existsSync(recorder.logsPath)) {
        fs.readdir(recorder.logsPath, function (err, files) {
            if (err) {
                console.log('blargl err', err);
                res.json([]);
                return;
            }
            const logNames = {};
            for (let file of files) {
                if (file.endsWith('.json.gz')) {
                    let jsonLogName = file.split('.')[0] + '.json';
                    logNames[jsonLogName] = true;
                }
            }
            logNames[recorder.getCurrentLogName()] = true;
            res.json(Object.keys(logNames));
        });
    } else {
        res.json([recorder.getCurrentLogName()]);
    }
});

/**
 * Pipe out read stream to res respecting the accept-encoding of req and
 * setting necessary headers
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {ReadStream} readStream
 */
function pipeReadStream(req, res, readStream) {
    res.set('Vary', 'Accept-Encoding');
    res.set('Content-Type', 'application/json');

    if (req.get('Accept-Encoding') && req.get('Accept-Encoding').includes('gzip')) {
        res.set('Content-Encoding', 'gzip');
        readStream.pipe(res);
    } else {
        const unzipStream = zlib.createGunzip();

        readStream.pipe(unzipStream).pipe(res);
    }

}

router.get('/logs/:logPath', function(req, res) {
    // res.json(recorder.timeObject);
    let compressedLogPath = path.join(recorder.logsPath, req.params.logPath + '.gz');
    if (!fs.existsSync(compressedLogPath)) {
        // Compare only the start `objects_${startTime}` bit of the current log
        // name since the end time is constantly changing
        const startTimeSection = req.params.logPath.split('-')[0];
        const currentLogNameStartTimeSection = recorder.getCurrentLogName().split('-')[0];

        if (startTimeSection !== currentLogNameStartTimeSection) {
            res.sendStatus(404);
            return;
        }

        const readStream = new stream.PassThrough();
        const gzipStream = zlib.createGzip();
        readStream.end(Buffer.from(JSON.stringify(recorder.timeObject)));
        const compressedReadStream = readStream.pipe(gzipStream);
        pipeReadStream(req, res, compressedReadStream);

        return;
    }

    const readStream = fs.createReadStream(compressedLogPath);
    pipeReadStream(req, res, readStream);
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
