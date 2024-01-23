// Provides additional methods for hardwareInterfaces to use to bind nodes to data streams

/**
 * A Data Source is an endpoint that can be queried at a specified frequency to get a list of data streams
 * @typedef {Object} DataSource
 * @property {string} id - unique identifier
 * @property {string} displayName - human-readable name of this source
 * @property {DataSourceDetails} source
 */

/**
 * @typedef {Object} DataSourceDetails
 * @property {string} url - the endpoint to make the request to, e.g. ptc.io/Thingworx/Things/xyz/Properties
 * @property {string} type - type of request to perform or protocol to use, e.g. 'REST/GET'
 * @property {Object} headers - any headers to add to the request, e.g. { Accept: 'application/json', appKey: 'xyz' }
 * @property {number} pollingFrequency - how many milliseconds between each fetch
 * @property {string} dataFormat - a label identifying the data format of the data streams, e.g. 'thingworxProperty'
 */

/**
 * A Data Stream is an individual stream of updating data that can be bound to one or more nodes
 * @typedef {Object} DataStream
 * @property {string} id - unique identifier
 * @property {string} displayName - human-readable name to show up in potential UIs
 * @property {string} nodeType - most likely 'node' - which type of node this data stream should expect to write to
 * @property {number} currentValue - the value which gets written into the node
 * @property {string} interfaceName - the name of the hardware interface providing this data stream
 */

/**
 * @typedef {function} BindNodeFunction
 * @param {number} objectId - The ID of the object.
 * @param {number} frameId - The ID of the frame.
 * @param {string} nodeName - The name of the node.
 * @param {string} nodeType - The type of the node.
 * @param {string} frameType - The type of the frame.
 * @param {number} streamId - The ID of the DataStream.
 */

/**
 * @type {function[]}
 */
let availableDataStreamGetters = [];

/**
 * @type {function[]}
 */
let availableDataSourceGetters = [];

/**
 * @type {Object.<string, function(string, string, string, string, string, string)>}
 */
let bindNodeToDataStreamCallbacks = {};

/**
 * @type {Object.<string, function(DataSource)>}
 */
let addDataSourceCallbacks = {};

/**
 * @type {Object.<string, function(DataSource)>}
 */
let deleteDataSourceCallbacks = {};

/**
 * Hardware interfaces can register a hook that they can use to inform the system of which DataStreams they know about
 * @param {function} callback
 */
exports.registerAvailableDataStreams = function (callback) {
    availableDataStreamGetters.push(callback);
}

/**
 * Hardware interfaces can register a hook that they can use to inform the system of which DataSources they know about
 * @param callback
 */
exports.registerAvailableDataSources = function (callback) {
    availableDataSourceGetters.push(callback);
}

/**
 * Hardware interfaces can register a callback, categorized by interfaceName, that will be triggered if a REST API
 * client calls bindNodeToDataStream with the same interfaceName. The hardware interface can assume that the node
 * already exists, and just implement this in a way that it will write any incoming data to that node from the
 * DataStream with the provided streamId. The hardware interface should also persist the mapping, so it can be restored
 * if the server is restarted.
 * @param {string} interfaceName
 * @param {BindNodeFunction} callback
 */
exports.registerBindNodeEndpoint = function(interfaceName, callback) {
    if (typeof bindNodeToDataStreamCallbacks[interfaceName] === 'undefined') {
        bindNodeToDataStreamCallbacks[interfaceName] = [];
    }
    bindNodeToDataStreamCallbacks[interfaceName].push(callback);
}

/**
 * Hardware interfaces can register a callback, categorized by interfaceName, that will be triggered if a client
 * attempts to reconfigure the hardware interface by adding a new Data Source endpoint to it at runtime.
 * For example, in the ThingWorx tool you can use a UI to add a new REST endpoint to the interface.
 * The hardware interface should persist which Data Sources it has, and use those to fetch its Data Streams.
 * @param {string} interfaceName
 * @param {function(DataSource)} callback
 */
exports.registerAddDataSourceEndpoint = function(interfaceName, callback) {
    if (typeof addDataSourceCallbacks[interfaceName] === 'undefined') {
        addDataSourceCallbacks[interfaceName] = [];
    }
    addDataSourceCallbacks[interfaceName].push(callback);
}

/**
 * Hardware interfaces can register a callback, categorized by interfaceName, that will trigger if a client attempts
 * to reconfigure the hardware interface by deleting one of its existing Data Sources. The hardware interface should
 * remove the Data Source from its persistent storage, and remove any Data Streams provided by that Data Source.
 * @param {string} interfaceName
 * @param callback
 */
exports.registerDeleteDataSourceEndpoint = function(interfaceName, callback) {
    if (typeof deleteDataSourceCallbacks[interfaceName] === 'undefined') {
        deleteDataSourceCallbacks[interfaceName] = [];
    }
    deleteDataSourceCallbacks[interfaceName].push(callback);
}

/**
 * REST API clients can invoke this to get a list of all DataStreams known to the system
 * @returns {DataStream[]}
 */
exports.getAllAvailableDataStreams = function() {
    let results = [];
    availableDataStreamGetters.forEach(callback => {
        let theseResults = callback();
        theseResults.dataStreams.forEach(dataStream => {
            results.push(dataStream);
        });
    });
    return results;
}

/**
 * REST API clients can invoke this to get a list of all DataSources known to the system
 * @returns {DataSource[]}
 */
exports.getAllAvailableDataSources = function() {
    let results = [];
    availableDataSourceGetters.forEach(callback => {
        let theseResults = callback();
        theseResults.dataSources.forEach(dataSource => {
            results.push(dataSource);
        });
    });
    return results;
}

/**
 * Triggers any BindNodeFunctions that hardware interfaces registered using registerBindNodeEndpoint, filtered down to
 * those whose hardwareInterface name matches the provided hardwareInterface parameter
 * @param {string} objectId
 * @param {string} frameId
 * @param {string} nodeName
 * @param {string} nodeType
 * @param {string} frameType
 * @param {string} hardwareInterface
 * @param {string} streamId
 * @todo - pull out hardwareInterface into its own parameter, first
 */
exports.bindNodeToDataStream = function({ objectId, frameId, nodeName, nodeType, frameType, hardwareInterface, streamId}) {
    console.log('hardwareAPI received data', objectId, frameId, nodeName, nodeType, frameType, hardwareInterface);
    let callbacks = bindNodeToDataStreamCallbacks[hardwareInterface];
    callbacks.forEach(callback => {
        callback(objectId, frameId, nodeName, nodeType, frameType, streamId);
    });
}

/**
 * Triggers any callback functions registered using registerAddDataSourceEndpoint, filtered down to those whose
 * hardwareInterface name matches the provided interfaceName parameter
 * @param {string} interfaceName
 * @param {DataSource} dataSource
 * @todo - trigger status message in API if error adding
 */
exports.addDataSourceToInterface = function(interfaceName, dataSource = {}) {
    if (!interfaceName) return; // TODO: the API response should change status if error adding
    let callbacks = addDataSourceCallbacks[interfaceName];
    callbacks.forEach(callback => {
        callback(dataSource);
    });
}

exports.deleteDataSourceFromInterface = function(interfaceName, dataSource) {
    if (!interfaceName || !dataSource) return; // TODO: the API response should change status if error adding
    let callbacks = deleteDataSourceCallbacks[interfaceName];
    callbacks.forEach(callback => {
        callback(dataSource);
    });
}
