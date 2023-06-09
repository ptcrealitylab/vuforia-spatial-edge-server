// Classes
let Utility = require('./utilities/index');

class CoreServices {
    constructor(dependencies) {
    }
}

class Services extends CoreServices {
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
        this.utility = new Utility();
    }
}

module.exports = Services;


