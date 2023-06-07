let FileAccess = require('./fileAccess.js');
let MemoryAccess = require('./memoryAccess.js');
let Network = require('./network.js');
let CoreUtilities = require('./utilities.js');
let NodeUtilities = require('./nodeUtilities.js');

class Utilities extends CoreUtilities {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.objects
     * @param {object} dependencies.fs
     * @param {object} dependencies.xml2js
     * @param {object} dependencies.ip
     * @param {function} dependencies.ObjectModel
     * @param {object} dependencies.path
     * @param {object} dependencies.knownObjects
     * @param {function} dependencies.nodeFetch
     * @param {object} dependencies.os
     * @param {object} dependencies.dgram
     * @param {function} dependencies.request
     * @param {object} dependencies.root const root = require('../getAppRootFolder');
     **/
    constructor(dependencies) {
        super({
            fs: dependencies.fs
        });
        this.fileAccess = new FileAccess({
            fs: dependencies.fs,
            xml2js: dependencies.xml2js,
            ip: dependencies.ip,
            ObjectModel: dependencies.ObjectModel,
            path: dependencies.path,
            os: dependencies.os,
            root: dependencies.root
        });
        this.memoryAccess = new MemoryAccess({
            fs: dependencies.fs,
            path: dependencies.path,
            network: this.network
        });
        this.network = new Network({
            knownObjects: dependencies.knownObjects,
            nodeFetch: dependencies.nodeFetch,
            dgram: dependencies.dgram,
            request: dependencies.request
        });
        this.nodeUtilities = new NodeUtilities({
            deepCopy: this.deepCopy,
            uuidTime: this.uuidTime,
            objects: dependencies.objects,
            fileAccess: this.fileAccess,
            memoryAccess: this.memoryAccess,
            network: this.network
        });
    }
}

module.exports = Utilities;


