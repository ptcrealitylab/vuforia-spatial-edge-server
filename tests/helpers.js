const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');

exports.sleep = function sleep(ms) {
    return new Promise((res) => {
        setTimeout(res, ms);
    });
};

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

exports.filterToObjects = function filterToObjects(key) {
    return key.match(/spatialToolbox\/[^.]/);
};

exports.filterToTestObject = function filterToTestObject(key) {
    return key.includes('fdsa');
};

async function getAllObjects() {
    const resAllObjects = await fetch(`http://localhost:8080/allObjects`);
    const allObjects = await resAllObjects.json();
    return allObjects;
}
exports.getAllObjects = getAllObjects;

exports.getTestObjects = async function getTestObjects() {
    const allObjects = await getAllObjects();
    return allObjects.filter(obj => obj.id.startsWith('fdsa'));
};
