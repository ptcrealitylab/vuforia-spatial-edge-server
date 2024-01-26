const { DataStreamServerAPI, NodeBinding, DataSource, DataSourceDetails } = require('./dataStreamInterfaces');
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
     * @param {DataSource[]} initialDataSources
     * @param {NodeBinding[]} initialNodeBindings
     * @param {function} fetchDataStreamsImplementation
     */
    constructor(interfaceName, initialDataSources, initialNodeBindings, fetchDataStreamsImplementation) {
        this.interfaceName = interfaceName; // this must be the exact string of the hardware interface directory name, e.g. 'thingworx' or 'kepware'
        this.fetchDataStreamsFromSource = fetchDataStreamsImplementation;

        // read DataSources and NodeBindings from settings
        this.loadInitialData(initialDataSources, initialNodeBindings);
        this.dataStreams = []; // starts empty, populates when updateData is called

        if ((typeof interfaceName !== 'string') || !initialDataSources ||
            !initialNodeBindings || !fetchDataStreamsImplementation) {
            console.warn('Constructed a DataStreamInterface with invalid parameters');
        }

        setTimeout(this.update.bind(this), 1000 * 5); // if you do it immediately it may interfere with server start-up process, so wait a few seconds
        setInterval(this.update.bind(this), 1000 * 60); // fetch all data streams from data sources every 60 seconds
        // TODO: in future use the pollingFrequency of each data stream. currently just fetches all data updates 1 time per minute.

        DataStreamServerAPI.registerAvailableDataStreams(this.getAvailableDataStreams.bind(this));
        DataStreamServerAPI.registerAvailableDataSources(this.getAvailableDataSources.bind(this));
        DataStreamServerAPI.registerBindNodeEndpoint(this.interfaceName, this.bindNodeToDataStream.bind(this));
        DataStreamServerAPI.registerAddDataSourceEndpoint(this.interfaceName, this.addDataSource.bind(this));
        DataStreamServerAPI.registerDeleteDataSourceEndpoint(this.interfaceName, this.deleteDataSource.bind(this));
    }

    /**
     * Loads saved data and discards any items that can't properly be constructed into the class definition
     * @param {DataSource[]} initialDataSources
     * @param {NodeBinding[]} initialNodeBindings
     */
    loadInitialData(initialDataSources, initialNodeBindings) {
        this.dataSources = [];
        this.nodeBindings = [];

        initialDataSources.forEach(dataSource => {
            let castSource = null;
            try {
                castSource = this.castToDataSource(dataSource);
            } catch (e) {
                console.warn(`error parsing source while loading DataStreamInterface for ${this.interfaceName}`, e);
            }
            if (castSource) {
                this.dataSources.push(castSource);
            }
        });

        initialNodeBindings.forEach(nodeBinding => {
            let castBinding = null;
            try {
                castBinding = this.castToNodeBinding(nodeBinding);
            } catch (e) {
                console.warn(`error parsing binding while loading DataStreamInterface for ${this.interfaceName}`, e);
            }
            if (castBinding) {
                this.nodeBindings.push(castBinding);
            }
        });
    }

    /**
     * @param {Object} data
     * @returns {boolean}
     */
    isValidDataSource(data) {
        if (!data || !data.id || !data.displayName || !data.source) return false;
        return (data.source.url && data.source.type && data.source.headers &&
            data.source.pollingFrequency && data.source.dataFormat);
    }

    /**
     * @param {Object} data
     * @returns {boolean}
     */
    isValidNodeBinding(data) {
        if (!data) return false;
        return (data.objectId && data.objectName && data.frameId &&
            data.frameName && data.nodeId && data.nodeName && data.streamId);
    }

    /**
     * @param {Object} dataSource
     * @returns {DataSource}
     * @throws {Error} if input is not a valid data source
     */
    castToDataSource(dataSource) {
        if (this.isValidDataSource(dataSource)) {
            let sourceDetails = new DataSourceDetails(dataSource.source.url, dataSource.source.type, dataSource.source.headers,
                dataSource.source.pollingFrequency, dataSource.source.dataFormat);
            return new DataSource(dataSource.id, dataSource.displayName, sourceDetails);
        } else {
            throw new Error(`Invalid DataSource structure ${dataSource}`);
        }
    }

    /**
     * @param {Object} nodeBinding
     * @returns {NodeBinding}
     * @throws {Error} if input is not a valid node binding
     */
    castToNodeBinding(nodeBinding) {
        if (this.isValidNodeBinding(nodeBinding)) {
            return new NodeBinding(nodeBinding.objectId, nodeBinding.objectName, nodeBinding.frameId,
                nodeBinding.frameName, nodeBinding.nodeId, nodeBinding.nodeName, nodeBinding.streamId);
        } else {
            throw new Error(`Invalid NodeBinding structure ${nodeBinding}`);
        }
    }

    /**
     * @returns {{ interfaceName: string, dataStreams: DataStream[] }}
     */
    getAvailableDataStreams() {
        return {
            interfaceName: this.interfaceName,
            dataStreams: this.dataStreams
        };
    }

    /**
     * @returns {{ interfaceName: string, dataStreams: DataSource[] }}
     */
    getAvailableDataSources() {
        return {
            interfaceName: this.interfaceName,
            dataSources: this.dataSources
        };
    }

    /**
     * Creates and saves a NodeBinding between the specified node and the specified streamId.
     * If the node doesn't exist, it will create it on the specified tool, first.
     * @param {string} objectId
     * @param {string} frameId
     * @param {string} nodeName
     * @param {string} nodeType
     * @param {string} streamId
     */
    bindNodeToDataStream(objectId, frameId, nodeName, nodeType, streamId) {
        if (!objectId || !frameId || !nodeName || !nodeType || !streamId) {
            console.warn('improper arguments for bindNodeToStream -> skipping');
            return;
        }

        // search for a node of type on the frame, or create the node of that type if it needs one
        let objectName = server.getObjectNameFromObjectId(objectId);
        let frameName = server.getToolNameFromToolId(objectId, frameId);
        let existingNodes = server.getAllNodes(objectName, frameName);

        let matchingNode = Object.values(existingNodes).find(node => { return node.type === nodeType && node.name === nodeName; });
        if (!matchingNode) {
            server.addNode(objectName, frameName, nodeName, nodeType);
            matchingNode = Object.values(existingNodes).find(node => { return node.type === nodeType && node.name === nodeName; });
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
    }

    /**
     * Adds a data source to the interface, saves it persistently, and fetches new data from it immediately
     * @param {DataSource} dataSource
     */
    addDataSource(dataSource) {
        // verify that it is a correctly structured DataSource
        let dataSourceInstance;
        try {
            dataSourceInstance = this.castToDataSource(dataSource);
        } catch (e) {
            console.warn('trying to add improper data as a dataSource', dataSource);
        }
        if (!dataSourceInstance) return;

        this.dataSources.push(dataSourceInstance);
        this.writeDataSourcesToSettings(this.dataSources);
        this.update();
    }

    /**
     * Deletes the specified data source from the interface (if it exists), removes from persistent data, and refreshes
     * @param {DataSource} dataSourceToDelete
     */
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
            this.writeDataSourcesToSettings(this.dataSources);
            this.update();
        }
    }

    /**
     * When update is called, we refresh our list of all data streams from all data sources.
     * In the current implementation, this should also update the `currentValue` of each dataStream.
     * We then look at the nodeBindings, and push the `currentValue` from any data streams into nodes bound to them.
     */
    update() {
        this.queryAllDataSources(this.dataSources).then((dataStreamsArray) => {
            this.dataStreams = dataStreamsArray.flat();

            // process each of the node bindings and write it to the node
            this.nodeBindings.forEach(nodeBinding => {
                this.processNodeBinding(nodeBinding);
            });
        }).catch(err => {
            console.warn('error in queryAllDataSources', err);
        });
    }

    /**
     * Iterates over all data sources, and outsources the task of fetching the list of data streams and updating the
     * `currentValue` of each data stream -> this task is outsourced via the fetchDataStreamsFromSource function, which
     * must be implemented by the hardware interface that instantiates this DataStreamInterface – since the
     * DataStreamInterface itself has no way to know how to interpret JSON structure of the fetch results.
     * The hardware interface can optionally add a `minValue` and `maxValue` to the data stream to help map it to (0,1)
     * @param {DataSource[]} dataSources
     * @returns {Promise<Awaited<DataStream[]>[]>}
     */
    queryAllDataSources(dataSources) {
        const fetchPromises = dataSources.map(dataSource => {
            return this.fetchDataStreamsFromSource(dataSource)
                .catch(error => {
                    console.warn(`Error fetching data from source ${error.message}`, dataSource);
                    return [];
                });
        });

        return Promise.all(fetchPromises);
    }

    /**
     * Finds the data stream identified in this nodeBinding, and writes the `currentValue` to the specified node.
     * Attempts to map the `currentValue` to the range of (0,1), using the `minValue` and `maxValue` of the data stream,
     * but if there is no range specified then it defaults to mapping it to 0.5. It can be remapped to true value by
     * tools that look at the unitMin and unitMax in addition to the value.
     * @param {NodeBinding} nodeBinding
     */
    processNodeBinding(nodeBinding) {
        let dataStream = this.dataStreams.find(stream => { return stream.id === nodeBinding.streamId; });
        if (!dataStream) return;
        // TODO: optionally add [mode, unit, unitMin, unitMax] to server.write arguments
        let mode = 'f';
        let unit = undefined; //UNIT_DEGREES_C; // TODO: allow dataStream to provide this, e.g. 'degrees C'
        let unitMin = typeof dataStream.minValue === 'number' ? dataStream.minValue : dataStream.currentValue - 0.5;
        let unitMax = typeof dataStream.maxValue === 'number' ? dataStream.maxValue : dataStream.currentValue + 0.5;
        let valueMapped = (dataStream.currentValue - unitMin) / (unitMax - unitMin);
        server.write(nodeBinding.objectName, nodeBinding.frameName, nodeBinding.nodeName, valueMapped, mode, unit, unitMin, unitMax);
    }

    /**
     * Persists the list of Data Sources to persistent storage.
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
    }

    /**
     * Persists the list of Node Bindings to persistent storage.
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
    }
}

module.exports = DataStreamInterface;
