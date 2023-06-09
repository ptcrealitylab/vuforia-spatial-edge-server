// Classes
let FileAccess = require('./fileAccess.js');
let MemoryAccess = require('./memoryAccess.js');
let Network = require('./network.js');
let CoreUtilities = require('./utilities.js');
let NodeUtilities = require('./nodeUtilities.js');
let Modules = require('./modules.js');

// Modules
const ObjectModel = require('../../models/ObjectModel');

// Libraries
let fs = require('fs');
let xml2js = require('xml2js');
let ip = require('ip');
let path = require('path');
let os = require('os');

// Environment 
let root = require('../../../getAppRootFolder');
let config = require('../../../config.js')

class Utilities extends CoreUtilities {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.objects
     * @param {function} dependencies.ObjectModel
     * @param {object} dependencies.knownObjects
     * @param {object} dependencies.root const root = require('../getAppRootFolder');
     * @param {object} dependencies.config configuration file in root server folder;
     **/
    constructor() {
        super({
            fs: fs
        });
        this.fileAccess = new FileAccess({
            fs: fs,
            xml2js: xml2js,
            ip: ip,
            ObjectModel: ObjectModel,
            path: path,
            os: os,
            root: root,
            config: config
        });
        this.memoryAccess = new MemoryAccess({
            fs: fs,
            path: path,
            fileAccess: this.fileAccess,
            network: this.network
        });
       /* this.network = new Network({
            knownObjects: dependencies.knownObjects,
            nodeFetch: dependencies.nodeFetch,
            dgram: dependencies.dgram,
            request: dependencies.request
        });*/
        this.nodeUtilities = new NodeUtilities({
            deepCopy: this.deepCopy,
            uuidTime: this.uuidTime,
            objects: null,
            fileAccess: this.fileAccess,
            memoryAccess: this.memoryAccess,
            network: this.network
        });
        this.modules = new Modules();
    }
}

module.exports = Utilities;


