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
        const entPath = path.join(base, dirPath, dirEnt.name);
        if (dirEnt.isDirectory()) {
            Object.assign(csList, makeChecksumList(base, entPath));
        } else {
            csList[path.join(dirPath, dirEnt.name)] = await checksum(entPath);
        }
    }
}

module.exports = makeChecksumList;
