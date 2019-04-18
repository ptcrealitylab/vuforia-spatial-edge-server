createNameSpace("realityEditor.objectDiscovery");

(function(exports) {

    var discoveredObjects = null;

    var discoveredServers = {};

    // var objectDiscoveryTree = {
    //     searchForObjects: function() {}, // start pinging UDP
    //     onObjectDiscovered: function() {}, // triggered when receives UDP response from new object... creates new objectRow
    //     onServerDiscovered: function() {}, // triggered when recevied UDP response from new server... creates new discoveredServer
    //     discoveredServers: [{
    //         serverHeader: {
    //             ipAddress: ""
    //         },
    //         objectRows: [{
    //             objectID: "",
    //             objectName: "",
    //             numFrames: 0,
    //             numNodes: 0,
    //             numLogics: 0,
    //             memoryVisibilityToggle: {
    //                 toggleVisibility: function() {}
    //             }
    //         }]
    //     }]
    // };

    var serverListDomElement = null;

    function initFeature() {
        realityEditor.network.registerCallback('allObjects', onAllObjects);

        serverListDomElement = createDiv(null, null, null, document.body);
        serverListDomElement.style.position = 'absolute';
        serverListDomElement.style.left = '80px';
        serverListDomElement.style.top = '20px';

        startObjectDiscovery();
    }

    function startObjectDiscovery() {
        // send three action UDP pings to start object discovery
        // for (var i = 0; i < 3; i++) {
        //     setTimeout(function() {
        //         realityEditor.network.sendUDPMessage({action: 'ping'});
        //     }, 500 * i); // space out each message by 500ms
        // }
        realityEditor.network.sendSocketMessage('getAllObjects', null);
    }

    function onAllObjects(objects) {
        console.log('received all objects', objects);
        discoveredObjects = objects;

        for (var objectKey in discoveredObjects) {
            var thisObject = discoveredObjects[objectKey];
            if (thisObject.deactivated) { continue; } // ignore deactivated objects

            var thisServerIP = thisObject.ip;

            if (typeof discoveredServers[thisServerIP] === 'undefined') {
                onNewServerDiscovered(thisServerIP);
            }

            onNewObjectDiscovered(thisObject, objectKey);
        }

        console.log(discoveredServers);
    }

    function onNewServerDiscovered(serverIP) {

        // create DOM element
        var serverContainerDOM = createDiv('serverContainer'+serverIP, 'serverContainer', null, serverListDomElement);
        createDiv(null, null, 'Objects - ' + serverIP, serverContainerDOM);

        // create data structure
        discoveredServers[serverIP] = {
            objects: {},
            domElement: serverContainerDOM
        };
    }

    function onNewObjectDiscovered(thisObject, objectKey) {
        var serverContainer = discoveredServers[thisObject.ip];
        serverContainer.objects[objectKey] = {
            object: thisObject,
            objectID: objectKey,
            objectName: thisObject.name,
            numFrames: Object.keys(thisObject.frames).length
            // numNodes: Object.keys(thisObject.nodes).length // TODO: separate out numLogics
        };

        var numLogicNodes = 0;

        Object.keys(thisObject.frames).map(function(frameKey) {
            return thisObject.frames[frameKey].nodes;
        }).forEach(function(nodes) {
            numLogicNodes += Object.keys(nodes).filter(function(nodeKey) {
                return nodes[nodeKey].type === 'logic';
            }).length;
        });

        console.log('object ' + objectKey + ' has ' + numLogicNodes + ' logic nodes');

        var numNormalNodes = 0;

        Object.keys(thisObject.frames).map(function(frameKey) {
            return thisObject.frames[frameKey].nodes;
        }).forEach(function(nodes) {
            numNormalNodes += Object.keys(nodes).filter(function(nodeKey) {
                return nodes[nodeKey].type === 'node';
            }).length;
        });

        console.log('object ' + objectKey + ' has ' + numNormalNodes + ' normal nodes');

        var objectRowDomElement = createDiv(null, 'objectRow', null, serverContainer.domElement);
        createDiv(null, 'objectName', thisObject.name, objectRowDomElement);
        var memoryToggle = createDiv(null, 'memoryToggle', null, objectRowDomElement);
        createDiv('hideMemory'+objectKey, 'toggleLabel', 'Hide', memoryToggle);
        createDiv('showMemory'+objectKey, 'toggleLabel', 'Show', memoryToggle);
    }

    function createDiv(id, classList, innerHTML, parentToAddTo) {
        var div = document.createElement('div');
        if (id) {
            div.id = id;
        }
        if (classList) {
            if (typeof classList === 'string') {
                div.className = classList;
            } else if (typeof classList === 'object') {
                classList.forEach(function(className) {
                    div.classList.add(className);
                });
            }
        }
        if (innerHTML) {
            div.innerHTML = innerHTML;
        }
        if (parentToAddTo) {
            parentToAddTo.appendChild(div);
        }
        return div;
    }

    exports.initFeature = initFeature;
    exports.discoveredObjects = discoveredObjects;

})(realityEditor.objectDiscovery);