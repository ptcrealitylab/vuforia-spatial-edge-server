const fs = require('fs');
const path = require('path');
const https = require('https');

const {allowSecureMode} = require('../config.js');

const fetch = require('node-fetch');

const fetchAgent = allowSecureMode ?
    new https.Agent({rejectUnauthorized: false}) :
    null; // No special agent required for http
exports.fetchAgent = fetchAgent;

const localProto = allowSecureMode ? 'https' : 'http';
const localServer = `${localProto}://localhost:8080`;
const localRemoteOperator = `${localProto}://localhost:8081`;

exports.localServer = localServer;
exports.localRemoteOperator = localRemoteOperator;

function sleep(ms) {
    return new Promise((res) => {
        setTimeout(res, ms);
    });
}
exports.sleep = sleep;

exports.snapshotDirectory = function snapshotDirectory(dir) {
    let snapshot = {};
    let dirents = fs.readdirSync(dir, {withFileTypes: true});
    for (let dirent of dirents) {
        let dePath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            snapshot = Object.assign(snapshot, snapshotDirectory(dePath));
            continue;
        }
        if (dirent.name.endsWith('.json')) {
            const contents = fs.readFileSync(dePath, {encoding: 'utf8'});
            try {
                snapshot[dePath] = JSON.parse(contents);
            } catch (e) {
                snapshot[dePath] = contents;
            }

        } else {
            snapshot[dePath] = fs.readFileSync(dePath);
        }
    }
    return snapshot;
};

exports.filterSnapshot = function filterSnapshot(snapshot, filterFn) {
    for (let key of Object.keys(snapshot)) {
        if (!filterFn(key)) {
            delete snapshot[key];
        }
    }
    return snapshot;
};

exports.getValueWithKeySuffixed = function getValueWithKeySuffixed(obj, suffix) {
    for (let [key, value] of Object.entries(obj)) {
        if (key.endsWith(suffix)) {
            return value;
        }
    }
};

exports.filterToObjects = function filterToObjects(key) {
    return key.match(/spatialToolbox\/[^.]/);
};

exports.filterToTestObject = function filterToTestObject(key, testPrefix = 'fdsa') {
    return key.includes(testPrefix);
};

async function getAllObjects() {
    const resAllObjects = await fetch(`${localServer}/allObjects`, {agent: fetchAgent});
    const allObjects = await resAllObjects.json();
    return allObjects;
}
exports.getAllObjects = getAllObjects;

exports.getTestObjects = async function getTestObjects(testPrefix = 'fdsa') {
    const allObjects = await getAllObjects();
    return allObjects.filter(obj => obj.id.startsWith(testPrefix));
};

exports.getObject = async function getObject(id) {
    const res = await fetch(`${localServer}/object/${id}`, {
        agent: fetchAgent
    });
    return await res.json();
};

/**
 * Wait for /allObjects to be present and populated with `lengthMin` objects
 */
async function waitForObjects(lengthMin = 1) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            let allObjects = await getAllObjects();
            if (Object.keys(allObjects).length >= lengthMin) {
                break;
            }
        } catch (_) {
            // way way too early as opposed to normal too early
        }
        await sleep(100);
    }
}
exports.waitForObjects = waitForObjects;
