const crypto = require('crypto');

const printLog = false;

function log(...args) {
    if (printLog)
        console.log('\x1b[35mAGENT-LOG: \x1b[0m', ...args);
}

function print(...args) {
    console.log('\x1b[35mAGENT: \x1b[0m', ...args);
}

function deepCopy(item) {
    if (null == item || typeof item != 'object') return item;
    if (item instanceof Array) {
        let copy = [];
        for (let i = 0, length = item.length; i < length; i++) {
            copy[i] = deepCopy(item[i]);
        }
        return copy;
    }
    if (item instanceof Object) {
        let copy = {};
        for (let key in item) {
            if (item.hasOwnProperty(key)) copy[key] = deepCopy(item[key]);
        }
        return copy;
    }
    throw new Error('Unable to deep copy this object.');
}

function itob62(i) {
    var u = i;
    var b32 = '';
    do {
        var d = Math.floor(u % 62);
        if (d < 10) {

            b32 = String.fromCharCode('0'.charCodeAt(0) + d) + b32;
        } else if (d < 36) {
            b32 = String.fromCharCode('a'.charCodeAt(0) + d - 10) + b32;
        } else {
            b32 = String.fromCharCode('A'.charCodeAt(0) + d - 36) + b32;
        }

        u = Math.floor(u / 62);

    } while (u > 0);

    return b32;
}

/**
 * Generate a random identifier of length at least size
 * @param {number} size
 */
function uuidTime (size) {
    var dateUuidTime = new Date();
    var abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var stampUuidTime = itob62(dateUuidTime.getTime());
    while (stampUuidTime.length < size) stampUuidTime = abcUuidTime.charAt(crypto.randomInt(0, abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
}

/**
 * Generate a random secret of length at least size
 * @param {number} size
 */
function createSecret (size) {
    var stampUuidTime = '';
    var abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    while (stampUuidTime.length < size) stampUuidTime = abcUuidTime.charAt(crypto.randomInt(0, abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
}

/**
 * Perform a hash of str limited to length, base64 the output, sanitize it by
 * throwing away non-alphanumeric characters
 * @param {string} str
 * @param {number} length
 */
function createChecksum(str, length) {
    return crypto.createHash('shake256', {outputLength: parseInt(length)}).update(str).digest('base64').replace(/[^A-Za-z0-9]/g, '');
}

module.exports = {
    log,
    print,
    deepCopy,
    uuidTime,
    createSecret,
    createChecksum,
};
