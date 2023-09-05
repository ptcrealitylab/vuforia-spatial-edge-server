const fs = require('fs');

module.exports = {
    mkdirIfNeeded: (path, recursive) => { // helper function since we do this so often
        let options = recursive ? {recursive: true} : undefined;
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, options);
            console.log('created directory: ' + path);
        }
    }
};
