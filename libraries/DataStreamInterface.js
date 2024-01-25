const { DataStreamServerAPI } = require('@libraries/dataStreamInterfaces');
const server = require('./hardwareInterfaces');

/**
 * @classdesc DataStreamInterface
 * An interface that can be created by a hardware interface that wishes to provide data streams to the system.
 * See the thingworx interface for an example on how to use it.
 * Creating a DataStreamInterface will automatically subscribe to the relevant functions in dataStreamInterfaces.js.
 */
class DataStreamInterface {
    /**
     * @param {string} interfaceName
     * @param {function} queryDataSourcesCallback
     * @param {function} processStreamsFromDataSourceResultsCallback
     * @param {DataSource[]} initialDataSources
     * @param {NodeBinding[]} initialNodeBindings
     */
    constructor(interfaceName, queryDataSourcesCallback, processStreamsFromDataSourceResultsCallback, initialDataSources, initialNodeBindings) {
        this.interfaceName = interfaceName; // this must be the exact string of the hardware interface directory name, e.g. 'thingworx' or 'kepware'
        this.queryDataSources = queryDataSourcesCallback;
        this.processStreamsFromDataSourceResults = processStreamsFromDataSourceResultsCallback;
        this.dataSources = initialDataSources; // read these from settings
        this.nodeBindings = initialNodeBindings; // read these from settings
        this.dataStreams = []; // starts empty, populates when updateData is called

        if ((typeof interfaceName !== 'string') || !initialDataSources || !initialNodeBindings ||
            !queryDataSourcesCallback || !processStreamsFromDataSourceResultsCallback) {
            console.warn('Constructed a DataStreamInterface with invalid parameters');
        }

        setTimeout(this.update.bind(this), 3000); // if you do it immediately it may interfere with server start-up process, so wait a few seconds
        setInterval(this.update.bind(this), 6000 /* * 10 */); // fetch all data streams from data sources every 60 seconds

        DataStreamServerAPI.registerAvailableDataStreams(this.getAvailableDataStreams.bind(this));
        DataStreamServerAPI.registerAvailableDataSources(this.getAvailableDataSources.bind(this));
        DataStreamServerAPI.registerBindNodeEndpoint(this.interfaceName, this.bindNodeToDataStream.bind(this));
        DataStreamServerAPI.registerAddDataSourceEndpoint(this.interfaceName, this.addDataSource.bind(this));
        DataStreamServerAPI.registerDeleteDataSourceEndpoint(this.interfaceName, this.deleteDataSource.bind(this));

        console.log('>>> initialized DataStreamInterface on server');
    }

    getAvailableDataStreams() {
        return {
            interfaceName: this.interfaceName,
            dataStreams: this.dataStreams
        };

        console.log('>>> getAvailableDataStreams');
    }

    getAvailableDataSources() {
        return {
            interfaceName: this.interfaceName,
            dataSources: this.dataSources
        };

        console.log('>>> getAvailableDataSources');
    }

    bindNodeToDataStream(objectId, frameId, nodeName, nodeType, frameType, streamId) {
        // search for a node of type on the frame, or create the node of that type if it needs one
        let objectName = server.getObjectNameFromObjectId(objectId);
        let frameName = server.getToolNameFromToolId(objectId, frameId);
        let existingNodes = server.getAllNodes(objectName, frameName);

        // TODO: how to make sure the name matches the name that the tool will use for its primary node? for now the client just guesses it's named "value"
        let matchingNode = Object.values(existingNodes).find(node => { return node.type === nodeType && node.name === nodeName });
        if (!matchingNode) {
            server.addNode(objectName, frameName, nodeName, nodeType);
            matchingNode = Object.values(existingNodes).find(node => { return node.type === nodeType && node.name === nodeName });
        }

        // TODO: skip if a duplicate record is already in nodeBindings
        this.nodeBindings.push(new NodeBinding(
            objectId, objectName,
            frameId, frameName,
            matchingNode.uuid, nodeName,
            streamId
        ));

        this.writeNodeBindingsToSettings(this.nodeBindings); // write this to the json settings file, so it can be restored upon restarting the server
        this.update(); // update one time immediately so the node gets a value without waiting for the interval

        console.log('>>> bindNodeToDataStream');
    }

    addDataSource(dataSource) {
        this.dataSources.push(dataSource);
        this.writeDataSourcesToSettings(this.dataSources);
        this.update();

        console.log('>>> addDataSource');
    }

    deleteDataSource(dataSourceToDelete) {
        if (!dataSourceToDelete.id || !dataSourceToDelete.url || !dataSourceToDelete.displayName) return;

        let matchingDataSource = this.dataSources.find(dataSource => {
            return dataSource.id === dataSourceToDelete.id &&
                dataSource.source.url === dataSourceToDelete.url &&
                dataSource.displayName === dataSourceToDelete.displayName;
        });

        if (matchingDataSource) {
            let index = this.dataSources.indexOf(matchingDataSource);
            this.dataSources.splice(index, 1);
        }

        this.writeDataSourcesToSettings(this.dataSources);
        this.update();

        console.log('>>> deleteDataSource');
    }

    update() {
        this.queryDataSources(this.dataSources).then((resultsArray) => {
            this.dataStreams = this.processStreamsFromDataSourceResults(resultsArray);

            // process each of the node bindings and write it to the node
            this.nodeBindings.forEach(nodeBinding => {
                this.processNodeBinding(nodeBinding);
            });

        }).catch(err => {
            console.warn('error in queryAllDataSources', err);
        });

        console.log('>>> update');
    }

    processNodeBinding(nodeBinding) {
        let dataStream = this.dataStreams.find(stream => { return stream.id === nodeBinding.streamId});
        if (!dataStream) return;
        // TODO: optionally add [mode, unit, unitMin, unitMax] to server.write arguments
        let mode = 'f';
        let unit = undefined; //UNIT_DEGREES_C; // TODO: allow dataStream to provide this, e.g. 'degrees C'
        let unitMin = typeof dataStream.minValue === 'number' ? dataStream.minValue : dataStream.currentValue - 0.5;// TODO: allow dataStream to fetch or calculate min/max based on observed values
        let unitMax = typeof dataStream.maxValue === 'number' ? dataStream.maxValue : dataStream.currentValue + 0.5;
        let valueMapped = (dataStream.currentValue - unitMin) / (unitMax - unitMin);
        server.write(nodeBinding.objectName, nodeBinding.frameName, nodeBinding.nodeName, valueMapped, mode, unit, unitMin, unitMax);

        // console.log('>>> processNodeBinding');
    }

    /**
     * @param {DataSource[]} dataSources
     */
    writeDataSourcesToSettings(dataSources) {
        // TODO: don't allow one hardware interface to accidentally write to the wrong settings file (eliminate the 'thingworx' parameter)
        server.setHardwareInterfaceSettings(this.interfaceName, { dataSources: dataSources }, ['dataSources'], (successful, error) => {
            if (error) {
                console.log(`${this.interfaceName}: error persisting dataSources to settings`, error);
            } else {
                console.log(`${this.interfaceName}: success persisting dataSources to settings`, successful);
            }
        });

        console.log('>>> writeDataSourcesToSettings');
    }

    /**
     * @param {NodeBinding[]} nodeBindings
     */
    writeNodeBindingsToSettings(nodeBindings) {
        // TODO: don't allow one hardware interface to accidentally write to the wrong settings file (eliminate the 'thingworx' parameter)
        server.setHardwareInterfaceSettings(this.interfaceName, { nodeBindings: nodeBindings }, ['nodeBindings'], (successful, error) => {
            if (error) {
                console.log(`${this.interfaceName}: error persisting nodeBindings to settings`, error);
            } else {
                console.log(`${this.interfaceName}: success persisting nodeBindings to settings`, successful);
            }
        });

        console.log('>>> writeNodeBindingsToSettings');
    }
}

/**
 * @classdesc NodeBinding
 * Maps a streamId to the address of a node (objectId, frameId, nodeId) to imply that
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

module.exports = DataStreamInterface;
