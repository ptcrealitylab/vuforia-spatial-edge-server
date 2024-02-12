const remote = require('./CloudProxyWrapper.js');
const local = require('fs/promises');
const path = require('path');

const {objectsPath} = require('../config.js');
const makeChecksumList = require('./makeChecksumList.js');

async function synchronize() {
    const cslRemote = await remote.getChecksumList();
    const cslLocal = await makeChecksumList(objectsPath, '');

    let diffs = [];
    let newRemote = [];
    let newLocal = [];

    for (const [pathRemote, checkRemote] of Object.entries(cslRemote)) {
        if (cslLocal.hasOwnProperty(pathRemote)) {
            const checkLocal = cslLocal[pathRemote];
            if (checkLocal !== checkRemote) {
                diffs.push(pathRemote);
            }
        } else {
            newRemote.push(pathRemote);
        }
    }

    for (const pathLocal of Object.keys(cslLocal)) {
        if (!cslRemote.hasOwnProperty(pathLocal)) {
            newLocal.push(pathLocal);
        }
    }

    console.log('sync diffs', diffs);
    for (const relPath of diffs) {
        const localAbsPath = path.join(objectsPath, relPath);
        const contents = await local.readFile(localAbsPath);
        const newContents = await remote.writeFile(relPath, contents);
        if (newContents) {
            await local.writeFile(localAbsPath, newContents);
        }
    }

    console.log('sync newRemote', newRemote);
    for (const relPath of newRemote) {
        const localAbsPath = path.join(objectsPath, relPath);
        const contents = await remote.readFile(relPath);
        const localAbsDir = path.dirname(localAbsPath);
        try {
            await local.mkdir(localAbsDir, {recursive: true});
        } catch (_e) {
            // dir already exists
        }
        await local.writeFile(localAbsPath, contents);
    }

    console.log('sync newLocal', newLocal);
    for (const relPath of newLocal) {
        const localAbsPath = path.join(objectsPath, relPath);
        const contents = await local.readFile(localAbsPath);
        await remote.writeFile(relPath, contents);
    }

    // then restart the server
}

exports.synchronize = synchronize;
