// Provides additional methods for hardwareInterfaces to use to bind nodes to data streams

let availableDataStreamGetters = [];
let availableDataSourceGetters = [];
let bindNodeToDataStreamCallbacks = {};
let addDataSourceCallbacks = {};
let deleteDataSourceCallbacks = {};

exports.registerAvailableDataStreams = function (callback) {
    availableDataStreamGetters.push(callback);
}

exports.getAllAvailableDataStreams = function() {
    let results = [];
    availableDataStreamGetters.forEach(callback => {
        let theseResults = callback();
        // console.log('result:', theseResults);
        theseResults.dataStreams.forEach(dataStream => {
            results.push(dataStream);
        });
    });
    return results;
}

exports.registerAvailableDataSources = function (callback) {
    availableDataSourceGetters.push(callback);
}

exports.getAllAvailableDataSources = function() {
    let results = [];
    availableDataSourceGetters.forEach(callback => {
        let theseResults = callback();
        // console.log('result:', theseResults);
        theseResults.dataSources.forEach(dataSource => {
            results.push(dataSource);
        });
    });
    return results;
}

exports.registerBindNodeEndpoint = function(interfaceName, callback) {
    if (typeof bindNodeToDataStreamCallbacks[interfaceName] === 'undefined') {
        bindNodeToDataStreamCallbacks[interfaceName] = [];
    }
    bindNodeToDataStreamCallbacks[interfaceName].push(callback);
}

exports.bindNodeToDataStream = function({ objectId, frameId, nodeName, nodeType, frameType, hardwareInterface, streamId}) {
    console.log('hardwareAPI received data', objectId, frameId, nodeName, nodeType, frameType, hardwareInterface);
    let callbacks = bindNodeToDataStreamCallbacks[hardwareInterface];
    callbacks.forEach(callback => {
        callback(objectId, frameId, nodeName, nodeType, frameType, streamId);
    });
}

exports.registerAddDataSourceEndpoint = function(interfaceName, callback) {
    if (typeof addDataSourceCallbacks[interfaceName] === 'undefined') {
        addDataSourceCallbacks[interfaceName] = [];
    }
    addDataSourceCallbacks[interfaceName].push(callback);
}

exports.addDataSourceToInterface = function(interfaceName, dataSource = {}) {
    if (!interfaceName) return; // TODO: the API response should change status if error adding
    // console.log('hardwareAPI received data', objectId, frameId, nodeName, nodeType, frameType, hardwareInterface);
    let callbacks = addDataSourceCallbacks[interfaceName];
    callbacks.forEach(callback => {
        callback(dataSource);
    });
}

exports.registerDeleteDataSourceEndpoint = function(interfaceName, callback) {
    if (typeof deleteDataSourceCallbacks[interfaceName] === 'undefined') {
        deleteDataSourceCallbacks[interfaceName] = [];
    }
    deleteDataSourceCallbacks[interfaceName].push(callback);
}

exports.deleteDataSourceFromInterface = function(interfaceName, dataSource) {
    if (!interfaceName || !dataSource) return; // TODO: the API response should change status if error adding
    let callbacks = deleteDataSourceCallbacks[interfaceName];
    callbacks.forEach(callback => {
        callback(dataSource);
    });
}
