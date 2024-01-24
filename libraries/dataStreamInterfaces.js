/**
 * @fileOverview
 * Provides additional methods for hardwareInterfaces to use to bind nodes to data streams
 * General structure:
 * Hardware interfaces use the DataStreamHardwareInterfaceAPI to opt in to providing their data sources/streams.
 * Clients can call the DataStreamClientAPI functions to perform tasks like getting the list of available data streams,
 * and to "bind" a specific node to a data stream (meaning that stream will write data to the node from now on).
 */

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
 * @type {function[]}
 */
let availableDataStreamGetters = [];
/**
 * @type {function[]}
 */
let availableDataSourceGetters = [];
/**
 * Callback functions categorized by interfaceName
 * @type {Object.<string, function[]>}
 */
let bindNodeToDataStreamCallbacks = {};
/**
 * Callback functions categorized by interfaceName
 * @type {Object.<string, function(DataSource)[]>}
 */
let addDataSourceCallbacks = {};
/**
 * Callback functions categorized by interfaceName
 * @type {Object.<string, function(DataSource)[]>}
 */
let deleteDataSourceCallbacks = {};

/**
 * Hardware interfaces can use these functions to register hooks/callbacks to notify the system of data streams/sources,
 * and to respond to requests from the client in a modular way behind a level of indirection
 */
const DataStreamHardwareInterfaceAPI = {
    /**
     * Hardware interfaces can register a hook that they can use to inform the system of which DataStreams they know about
     * @param {function} callback
     */
    registerAvailableDataStreams(callback) {
        availableDataStreamGetters.push(callback);
    },
    /**
     * Hardware interfaces can register a hook that they can use to inform the system of which DataSources they know about
     * @param callback
     */
    registerAvailableDataSources(callback) {
        availableDataSourceGetters.push(callback);
    },
    /**
     * Hardware interfaces can register a callback, categorized by interfaceName, that will be triggered if a REST API
     * client calls bindNodeToDataStream with the same interfaceName. The hardware interface can assume that the node
     * already exists, and just implement this in a way that it will write any incoming data to that node from the
     * DataStream with the provided streamId. The hardware interface should also persist the mapping, so it can be restored
     * if the server is restarted.
     * @param {string} interfaceName
     * @param {function(string, string, string, string, string, string)} callback
     */
    registerBindNodeEndpoint(interfaceName, callback) {
        if (typeof bindNodeToDataStreamCallbacks[interfaceName] === 'undefined') {
            bindNodeToDataStreamCallbacks[interfaceName] = [];
        }
        bindNodeToDataStreamCallbacks[interfaceName].push(callback);
    },
    /**
     * Hardware interfaces can register a callback, categorized by interfaceName, that will be triggered if a client
     * attempts to reconfigure the hardware interface by adding a new Data Source endpoint to it at runtime.
     * For example, in the ThingWorx tool you can use a UI to add a new REST endpoint to the interface.
     * The hardware interface should persist which Data Sources it has, and use those to fetch its Data Streams.
     * @param {string} interfaceName
     * @param {function(DataSource)} callback
     */
    registerAddDataSourceEndpoint(interfaceName, callback) {
        if (typeof addDataSourceCallbacks[interfaceName] === 'undefined') {
            addDataSourceCallbacks[interfaceName] = [];
        }
        addDataSourceCallbacks[interfaceName].push(callback);
    },
    /**
     * Hardware interfaces can register a callback, categorized by interfaceName, that will trigger if a client attempts
     * to reconfigure the hardware interface by deleting one of its existing Data Sources. The hardware interface should
     * remove the Data Source from its persistent storage, and remove any Data Streams provided by that Data Source.
     * @param {string} interfaceName
     * @param callback
     */
    registerDeleteDataSourceEndpoint(interfaceName, callback) {
        if (typeof deleteDataSourceCallbacks[interfaceName] === 'undefined') {
            deleteDataSourceCallbacks[interfaceName] = [];
        }
        deleteDataSourceCallbacks[interfaceName].push(callback);
    }
};

const DataStreamClientAPI = {
    /**
     * REST API clients can invoke this to get a list of all DataStreams known to the system
     * @returns {DataStream[]}
     */
    getAllAvailableDataStreams() {
        let results = [];
        availableDataStreamGetters.forEach(callback => {
            let theseResults = callback();
            theseResults.dataStreams.forEach(dataStream => {
                results.push(dataStream);
            });
        });
        return results;
    },
    /**
     * REST API clients can invoke this to get a list of all DataSources known to the system
     * @returns {DataSource[]}
     */
    getAllAvailableDataSources() {
        let results = [];
        availableDataSourceGetters.forEach(callback => {
            let theseResults = callback();
            theseResults.dataSources.forEach(dataSource => {
                results.push(dataSource);
            });
        });
        return results;
    },
    /**
     * Triggers any callback function that hardware interfaces registered using registerBindNodeEndpoint, filtered down to
     * those whose hardwareInterface name matches the provided hardwareInterface parameter
     * @param {string} interfaceName
     * @param {string} objectId
     * @param {string} frameId
     * @param {string} nodeName
     * @param {string} nodeType
     * @param {string} frameType
     * @param {string} streamId
     */
    bindNodeToDataStream(interfaceName, { objectId, frameId, nodeName, nodeType, frameType, streamId}) {
        let callbacks = bindNodeToDataStreamCallbacks[interfaceName];
        callbacks.forEach(callback => {
            callback(objectId, frameId, nodeName, nodeType, frameType, streamId);
        });
    },
    /**
     * Triggers any callback functions registered using registerAddDataSourceEndpoint, filtered down to those whose
     * hardwareInterface name matches the provided interfaceName parameter.
     * @param {string} interfaceName
     * @param {DataSource} dataSource
     * @todo - trigger status message in API if error adding
     */
    addDataSourceToInterface(interfaceName, dataSource = {}) {
        if (!interfaceName) return; // TODO: the API response should change status if error adding
        let callbacks = addDataSourceCallbacks[interfaceName];
        callbacks.forEach(callback => {
            callback(dataSource);
        });
    },
    /**
     * Triggers any callback functions registered using registerDeleteDataSourceEndpoint, filtered down to those whose
     * hardwareInterface name matches the provided interfaceName parameter.
     * @param {string} interfaceName
     * @param {DataSource} dataSource
     * @todo - trigger status message in API if error adding
     */
    deleteDataSourceFromInterface(interfaceName, dataSource) {
        if (!interfaceName || !dataSource) return; // TODO: the API response should change status if error adding
        let callbacks = deleteDataSourceCallbacks[interfaceName];
        callbacks.forEach(callback => {
            callback(dataSource);
        });
    }
}

module.exports = {
    DataStreamHardwareInterfaceAPI,
    DataStreamClientAPI
}
