const remote = require('./CloudProxyWrapper.js');
const local = require('fs/promises');
const path = require('path');

const {objectsPath} = require('../config.js');
const makeChecksumList = require('./makeChecksumList.js');

const DEBUG = false;

// Experimental feature to allow the remote (cloud proxy) to determine a merge
// between our state and theirs and send back this merge for us to overwrite
// our local file with
const allowRemoteOverwriteLocal = false;

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

    if (DEBUG) {
        console.log('sync diffs', diffs);
    }
    for (const relPath of diffs) {
        const localAbsPath = path.join(objectsPath, relPath);
        const contents = await local.readFile(localAbsPath);
        const newContents = await remote.writeFile(relPath, contents);
        if (newContents && allowRemoteOverwriteLocal) {
            await local.writeFile(localAbsPath, newContents);
        }
    }

    if (DEBUG) {
        console.log('sync newRemote', newRemote);
    }
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

    if (DEBUG) {
        console.log('sync newLocal', newLocal);
    }
    for (const relPath of newLocal) {
        const localAbsPath = path.join(objectsPath, relPath);
        const contents = await local.readFile(localAbsPath);
        await remote.writeFile(relPath, contents);
    }

    // then restart the server
}

exports.synchronize = synchronize;

let syncInProgress = false;

async function startSyncIfNotSyncing() {
    if (syncInProgress) {
        return;
    }
    syncInProgress = true;
    try {
        await synchronize();
    } catch (e) {
        console.error('synchronize failed', e);
    } finally {
        syncInProgress = false;
    }
}

exports.startSyncIfNotSyncing = startSyncIfNotSyncing;
