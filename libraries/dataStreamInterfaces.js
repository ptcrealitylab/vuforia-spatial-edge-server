/**
 * @fileOverview
 * Provides methods to bind nodes to data streams.
 * Hardware interfaces can instantiate a DataStreamInterface to opt in to providing their data sources/streams.
 * Hardware interface developers should interact with the DataStreamInterface class, rather than this file's functions.
 * REST APIs can call the DataStreamClientAPI functions to perform tasks like getting the list of available data streams,
 * and to "bind" a specific node to a data stream (meaning that stream will write data to the node from now on).
 */

/**
 * @classdesc
 * An individual stream of updating data that can be "bound" to one or more nodes,
 * to write data into those nodes at a certain interval in perpetuity
 * @example A data stream might point to a specific property of a Thing on ThingWorx:
 * https://pp-2302201433iy.portal.ptc.io/Thingworx/Things/SE.CXC.HarpakUlma.Asset.Monitoring.TFS500.PTC01/Properties/EnergyConsumption_Watt
 * This URL isn't directly stored in the DataStream, but the combination of its id and its DataSource can yield this url
 */
class DataStream {
    /**
     * @param {string} id - unique identifier
     * @param {string} displayName - human-readable name to show up in potential UIs
     * @param {string} nodeType - which type of node this data stream should expect to write to
     * @param {number} currentValue - the value which gets written into the node
     * @param {number?} minValue - optional minimum value for the range
     * @param {number?} maxValue - optional maximum value for the range
     * @param {string} interfaceName - the name of the hardware interface providing this data stream
     */
    constructor(id, displayName, nodeType = 'node', currentValue = 0, minValue, maxValue, interfaceName) {
        this.id = id;
        this.displayName = displayName;
        this.nodeType = nodeType;
        this.currentValue = currentValue;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.interfaceName = interfaceName;
    }
}

/**
 * @classdesc
 * A Data Source is an endpoint that can be queried at a specified frequency to get a list of data streams
 * @example A data source might point to the properties list of a Thing on ThingWorx:
 * https://pp-2302201433iy.portal.ptc.io/Thingworx/Things/SE.CXC.HarpakUlma.Asset.Monitoring.TFS500.PTC01/Properties/
 * This URL is stored in its DataSourceDetails
 */
class DataSource {
    /**
     * @param {string} id - unique identifier
     * @param {string} displayName - human-readable name of this source
     * @param {DataSourceDetails} source
     */
    constructor(id, displayName, source) {
        this.id = id;
        this.displayName = displayName;
        this.source = source;
    }
}

/**
 * @classdesc
 * Simple class containing the specific location of where and how to fetch data for a DataSource
 */
class DataSourceDetails {
    /**
     * @param {string} url - the endpoint to make the request to, e.g. ptc.io/Thingworx/Things/xyz/Properties
     * @param {string} type - type of request to perform or protocol to use, e.g. 'REST/GET'
     * @param {Object} headers - any headers to add to the request, e.g. { Accept: 'application/json', appKey: 'xyz' }
     * @param {number} pollingFrequency - how many milliseconds between each fetch
     * @param {string} dataFormat - a label identifying the data format of the data streams, e.g. 'thingworxProperty'
     */
    constructor(url, type, headers, pollingFrequency, dataFormat) {
        this.url = url;
        this.type = type;
        this.headers = headers;
        this.pollingFrequency = pollingFrequency; // TODO: use this in future for more control
        this.dataFormat = dataFormat;
    }
}

/**
 * @classdesc
 * Maps a streamId to the address of a node (objectId, frameId, nodeId) to mark that
 * this data stream should write to that node whenever the data stream updates
 */
class NodeBinding {
    constructor(objectId, objectName, frameId, frameName, nodeId, nodeName, streamId) {
        this.objectId = objectId;
        this.objectName = objectName;
        this.frameId = frameId;
        this.frameName = frameName;
        this.nodeId = nodeId;
        this.nodeName = nodeName;
        this.streamId = streamId;
    }
}

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
 * The DataStreamInterface class uses these functions to register callbacks to notify the system of data streams/sources,
 * and to respond to requests from the client in a modular way behind a level of indirection.
 */
const DataStreamServerAPI = {
    /**
     * Register a hook that the DataStreamInterface can use to inform the system of which DataStreams it knows about
     * @param {function} callback
     */
    registerAvailableDataStreams(callback) {
        availableDataStreamGetters.push(callback);
    },
    /**
     * Register a hook that the DataStreamInterface can use to inform the system of which DataSources it knows about
     * @param {function} callback
     */
    registerAvailableDataSources(callback) {
        availableDataSourceGetters.push(callback);
    },
    /**
     * Register a callback, categorized by interfaceName, that will be triggered if a REST API client calls
     * bindNodeToDataStream with the same interfaceName. Assumes that the node already exists, and sets it up to write
     * any incoming data from the DataStream with the provided streamId to write to that node. This mapping will be
     * persisted, so it can be restored if the server is restarted.
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
     * Register a callback, categorized by interfaceName, that will be triggered if a client attempts to reconfigure
     * the hardware interface by adding a new Data Source endpoint to it at runtime. For example, in the ThingWorx tool
     * you can use a UI to add a new REST endpoint to the interface. The hardware interface will persist which Data
     * Sources it has, and use those to fetch its Data Streams, which can then be bound to nodes.
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
     * Removes a DataSource that was added to a particular hardware interface using registerAddDataSourceEndpoint.
     * Removes the DataSource from its persistent storage, and removes any Data Streams provided by that Data Source.
     * @param {string} interfaceName
     * @param {function} callback
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
     * Triggers any callback functions that DataStreamInterfaces registered using registerBindNodeEndpoint, filtered
     * down to those whose hardwareInterface name matches the provided hardwareInterface parameter
     * Rather than using nodeId, we use a combination of nodeName and nodeType to help identify the node
     * @param {string} interfaceName
     * @param {string} objectId
     * @param {string} frameId
     * @param {string} nodeName
     * @param {string} nodeType
     * @param {string} streamId
     */
    bindNodeToDataStream(interfaceName, { objectId, frameId, nodeName, nodeType, streamId}) {
        let callbacks = bindNodeToDataStreamCallbacks[interfaceName];
        callbacks.forEach(callback => {
            callback(objectId, frameId, nodeName, nodeType, streamId);
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
};

module.exports = {
    DataStreamClientAPI, // intended to be used in response to clients using the server's REST APIs
    DataStreamServerAPI, // intended to be used by the DataStreamInterface class, not by individual hardware interfaces
    DataStream,
    DataSource,
    DataSourceDetails,
    NodeBinding
};
