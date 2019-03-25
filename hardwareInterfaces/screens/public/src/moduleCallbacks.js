createNameSpace("realityEditor.moduleCallbacks");

/**
 * @fileOverview realityEditor.moduleCallbacks.js
 * Creates a reusable class for handling the callbacks of a given module
 */

(function(exports) {
    
    /**
     * class to handle callback registration and triggering, which can be instantiated for each module that needs it
     * @param {string} moduleName - currently just used for debugging purposes
     * @constructor
     */
    function CallbackHandler(moduleName) {
        this.moduleName = moduleName; // only stored for debugging purposes
        console.log('created CallbackHandler for ' + this.moduleName);

        /**
         * A set of arrays of callbacks that other modules can register to be notified of actions.
         * Contains a property for each method name in the module that can trigger events in other modules.
         * The value of each property is an array containing pointers to the callback functions that should be
         *  triggered when that function is called.
         * @type {Object.<string, Array.<function>>}
         */
        this.callbacks = {};

        var moduleReference = getModuleReference(moduleName);
        if (moduleReference) {
            /**
             * Adds a callback function to the parent module that will be invoked when the specified function is called
             * @param {string} functionName
             * @param {function} callback
             */
            moduleReference.registerCallback = function(functionName, callback) {
                this.registerCallback(functionName, callback);
            }.bind(this);
        }
    }

    /**
     * Converts a dot-notation path e.g. "realityEditor.gui.ar.utilities" into a reference to that module itself
     * @param {string} moduleName
     * @return {Window}
     */
    function getModuleReference(moduleName) {
        var reference = window;
        var list = moduleName.split('.');
        while (list.length > 0) {
            var namespace = list.shift();
            console.log(namespace);
            reference = reference[namespace];
            console.log(reference);
        }
        return reference;
    }

    /**
     * Adds a callback function that will be invoked when the moduleName.[functionName] is called
     * @param {string} functionName
     * @param {function} callback
     */
    CallbackHandler.prototype.registerCallback = function(functionName, callback) {
        if (typeof this.callbacks[functionName] === 'undefined') {
            this.callbacks[functionName] = [];
        }

        this.callbacks[functionName].push(callback);
    };

    /**
     * Utility for iterating calling all callbacks that other modules have registered for the given function
     * @param {string} functionName
     * @param {object|undefined} params
     */
    CallbackHandler.prototype.triggerCallbacks = function(functionName, params) {
        if (typeof this.callbacks[functionName] === 'undefined') return;

        // iterates over all registered callbacks to trigger events in various modules
        this.callbacks[functionName].forEach(function(callback) {
            callback(params);
        });
    };
    
    exports.CallbackHandler = CallbackHandler;

})(realityEditor.moduleCallbacks);
