const config = require('../config.js');

if (config.persistToCloud) {
    const verifyWrapper = require('./VerifyWrapper.js');
    module.exports = verifyWrapper;
} else {
    const fsWrapper = require('./FileSystemWrapper.js');
    module.exports = fsWrapper;
}
