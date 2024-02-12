const crypto = require('crypto');
const {createReadStream} = require('fs');
const path = require('path');
const fs = require('./FileSystemWrapper.js');

function checksum(filePath) {
    const hash = crypto.createHash('sha1');
    return new Promise((resolve, reject) => {
        const input = createReadStream(filePath);
        input.on('error', reject);
        input.on('readable', () => {
            const data = input.read();
            if (data) {
                hash.update(data);
            } else {
                resolve(hash.digest('hex'));
            }
        });
    });
}

async function makeChecksumList(base, dirPath) {
    const csList = {};
    let dirEnts = await fs.readdir(path.join(base, dirPath), {withFileTypes: true});
    for (let dirEnt of dirEnts) {
        if (dirEnt.name === '.DS_Store') {
            continue;
        }
        const entRelPath = path.join(dirPath, dirEnt.name);
        const entAbsPath = path.join(base, entRelPath);
        if (dirEnt.isDirectory()) {
            Object.assign(csList, await makeChecksumList(base, entRelPath));
        } else {
            csList[entRelPath] = await checksum(entAbsPath);
        }
    }
    return csList;
}

module.exports = makeChecksumList;
