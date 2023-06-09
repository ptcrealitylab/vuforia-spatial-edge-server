// Classes
let Services = require('./services/index');

class CoreServer {
    constructor(dependencies) {
    }
}

class Server extends CoreServer {
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
        super();
        this.services = new Services();
    }
}

// Global Variables

// available Modules
let nodeTypes = {};
let hardwareInterfaces = {};
let blockTypes = {};

// global Objects
let objects = {};

let server = new Server();

module.exports = {
    server: server,
    Server: Server
};


