const remote = require('./CloudProxyWrapper.js');
const local = require('./fsProm.js');

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

    for (const path of diffs) {
        const contents = await local.readFile(path);
        const newContents = await remote.writeFile(path, contents);
        if (newContents) {
            await local.writeFile(path, newContents);
        }
    }

    for (const path of newRemote) {
        const contents = await remote.readFile(path);
        await local.writeFile(path, contents);
    }

    for (const path of newLocal) {
        const contents = await local.readFile(path);
        await remote.writeFile(path, contents);
    }

    // then restart the server
}

exports.synchronize = synchronize;
