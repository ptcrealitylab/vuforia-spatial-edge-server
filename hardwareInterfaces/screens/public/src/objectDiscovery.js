createNameSpace("realityEditor.objectDiscovery");

(function(exports) {

    var discoveredObjects = null;
    var discoveredObjectsOnOtherServers = {};

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

    var allLinks = {};

    var serverListDomElement = null;

    var guiState;

    function initFeature() {
        realityEditor.network.registerCallback('allObjects', onAllObjects);
        realityEditor.network.registerCallback('allObjectsOnOtherServers', onAllObjectsOnOtherServers);

        serverListDomElement = createDiv(null, null, null, document.body);
        serverListDomElement.style.position = 'absolute';
        serverListDomElement.style.left = '80px';
        serverListDomElement.style.top = '20px';

        startObjectDiscovery();

        realityEditor.touchEvents.registerCallback('onMouseDown', onMouseDown);
        realityEditor.touchEvents.registerCallback('onMouseUp', onMouseUp);

        realityEditor.network.registerCallback('onElementLoad', onElementLoad);

        realityEditor.network.addPostMessageHandler('memoryMessage', handleMessageFromMemory);

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
            injectGuiStateToMemories(newGuiState);
        });
    }

    /**
     * Handles messages posted into the window/iframe with structure {memoryMessage: msgContent}
     * @param {Object} msgContent - JSON object passed into the memoryMessage property of the post message
     */
    function handleMessageFromMemory(msgContent) {
        console.log('handleMessageFromMemory', msgContent);

        var memoryObjectID = msgContent.objectID;
        // find the frame that contains that memory
        var memoryFrame = getMemoryShownForObject(memoryObjectID);

        // get or create a container to monitor all the node positions within that memory and create invisible interact-able nodes on top
        var memoryMonitor = getMemoryMonitor(memoryFrame);

        var nodePositions = msgContent.nodes;

        // remove all existing node divs before we create new ones
        while (memoryMonitor.firstChild) {
            memoryMonitor.firstChild.remove();
        }

        // populate with divs for each node inside the visible bounds of the memory frame
        for (var nodeKey in nodePositions) {

            var node = getNodeFromMemoryKeys(memoryObjectID, nodeKey);
            if (!node || !(node.type === 'node' || node.type === 'logic')) { continue; } // only render visible node types. todo: refactor

            var position = nodePositions[nodeKey];
            var percentBuffer = 5; // how far beyond edge of memory frame can nodes be and still be interact-able
            if (position.percentX > 0 - percentBuffer && position.percentX < 100 + percentBuffer &&
                position.percentY > 0 - percentBuffer && position.percentY < 100 + percentBuffer) {

                var nodePlaceholder = createDiv('placeholder' + nodeKey, 'nodePlaceholder', null, memoryMonitor);

                var nodeSize = 50;
                nodePlaceholder.style.width = nodeSize + 'px';
                nodePlaceholder.style.height = nodeSize + 'px';

                nodePlaceholder.style.left = (position.percentX * memoryFrame.width - nodeSize/2) + 'px';
                nodePlaceholder.style.top = (position.percentY * memoryFrame.height - nodeSize/2) + 'px';

            }
        }

        allLinks[memoryObjectID] = msgContent.links;
        // var links = msgContent.links;

        // drawAllMemoryLinks(links);

    }

    function renderLinks() {
        if (guiState !== 'node') return;

        for (var memoryObjectID in allLinks) {
            var thisMemoryLinks = allLinks[memoryObjectID];
            drawAllMemoryLinks(thisMemoryLinks);
        }
    }

    function drawAllMemoryLinks(links) {
        for (var linkKey in links) {
            var link = links[linkKey];
            // get start node div
            var nodeDivA = document.getElementById('placeholder' + link.nodeA);
            // get end node div
            var nodeDivB = document.getElementById('placeholder' + link.nodeB);

            if (nodeDivA && nodeDivB) {
                console.log('found start and end node divs', nodeDivA, nodeDivB);

                var nodeACenter = {
                    x: nodeDivA.getClientRects()[0].x + nodeDivA.getClientRects()[0].width/2,
                    y: nodeDivA.getClientRects()[0].y + nodeDivA.getClientRects()[0].height/2
                };
                var nodeBCenter = {
                    x: nodeDivB.getClientRects()[0].x + nodeDivB.getClientRects()[0].width/2,
                    y: nodeDivB.getClientRects()[0].y + nodeDivB.getClientRects()[0].height/2
                };
                var startOffset = {
                    x: 0,
                    y: 0
                };
                var endOffset = {
                    x: 0,
                    y: 0
                };
                var linkWidth = 5;
                var startColorCode = (typeof link.logicA === 'number') ? link.logicA  : 4; // white
                var endColorCode = (typeof link.logicB === 'number') ? link.logicB  : 4;
                if (isNaN(link.ballAnimationCount)) {
                    link.ballAnimationCount = 0;
                }
                realityEditor.linkRenderer.drawLine(globalCanvas.context, [nodeACenter.x + startOffset.x, nodeACenter.y + startOffset.y], [nodeBCenter.x + endOffset.x, nodeBCenter.y + endOffset.y], linkWidth, linkWidth, link, timeCorrection, startColorCode, endColorCode);

            }
        }
    }

    /**
     * gets the node from the correct frame of the correct object using only its nodeKey and which memory it was in
     * @param {string} memoryObjectID
     * @param {string} nodeKey
     */
    function getNodeFromMemoryKeys(memoryObjectID, nodeKey) {
        var frames = typeof discoveredObjects[memoryObjectID] !== 'undefined' ? discoveredObjects[memoryObjectID].frames : discoveredObjectsOnOtherServers[memoryObjectID].frames;
        var matchingFrameKeys = Object.keys(frames).filter(function(frameKey){
            return nodeKey.indexOf(frameKey) > -1;
        });
        if (matchingFrameKeys.length === 0) { return null; }
        return frames[matchingFrameKeys[0]].nodes[nodeKey];
    }

    function getMemoryMonitor(frame) {
        if (frame.src !== 'memoryFrame') {
            return; // don't need to do this for non- memory frames
        }
        var monitorContainer = document.getElementById('monitor' + frame.uuid);
        if (!monitorContainer) {
            var frameContainer = document.getElementById('object' + frame.uuid);
            monitorContainer = createDiv('monitor' + frame.uuid, 'monitorContainer', null, frameContainer);
            monitorContainer.style.width = frame.width + 'px';
            monitorContainer.style.height = frame.height + 'px';
        }
        return monitorContainer;
    }

    function injectGuiStateToMemories(newGuiState) {
        var allMemoryFrames = Object.keys(frames).map(function(frameKey) {
            return frames[frameKey];
        }).filter(function(frame) {
            return frame.visualization === 'screen' && frame.src === 'memoryFrame';
        });

        allMemoryFrames.forEach(function(memoryFrame) {
            var iframe = document.getElementById('iframe' + memoryFrame.uuid);
            iframe.contentWindow.postMessage(JSON.stringify({
                guiState: newGuiState,
                platform: 'desktop'
            }), '*');
        });
    }

    var pointerEventListeners = {};
    function addPointerEventListener(domElement, eventType, callback) {
        if (typeof pointerEventListeners[eventType] === 'undefined') {
            pointerEventListeners[eventType] = [];
        }
        pointerEventListeners[eventType].push({
            domElement: domElement,
            callback: callback
        });
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

    function onAllObjectsOnOtherServers(objects) {
        console.log('objects on other servers', objects);

        for (var objectKey in objects) {
            var objectInfo = objects[objectKey];

            if (typeof discoveredServers[objectInfo.ip] === 'undefined') {
                onNewServerDiscovered(objectInfo.ip);
            }

            discoverObjectOnOtherServer(objectInfo.ip, objectKey);
        }

        console.log(discoveredServers);
    }

    function discoverObjectOnOtherServer(ip, objectKey) {
        realityEditor.network.getData('http://' + ip + ':' + SERVER_PORT + '/object/' + objectKey, function (object) {
            discoveredObjectsOnOtherServers[objectKey] = object;
            onNewObjectDiscovered(object, objectKey);
        });
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

        var isObjectOnLocalServer = (typeof thisObject.name !== 'undefined');

        var objectName = isObjectOnLocalServer ? thisObject.name : objectKey;

        var serverContainer = discoveredServers[thisObject.ip];
        serverContainer.objects[objectKey] = {
            object: thisObject,
            objectID: objectKey,
            objectName: objectName
        };

        if (isObjectOnLocalServer) {
            serverContainer.objects[objectKey].numFrames = Object.keys(thisObject.frames).length;
            // numNodes: Object.keys(thisObject.nodes).length // TODO: separate out numLogics

            var numLogicNodes = 0;
            Object.keys(thisObject.frames).map(function(frameKey) {
                return thisObject.frames[frameKey].nodes;
            }).forEach(function(nodes) {
                numLogicNodes += Object.keys(nodes).filter(function(nodeKey) {
                    return nodes[nodeKey].type === 'logic';
                }).length;
            });
            console.log('object ' + objectKey + ' has ' + numLogicNodes + ' logic nodes');
            serverContainer.objects[objectKey].numLogicNodes = numLogicNodes;

            var numNormalNodes = 0;
            Object.keys(thisObject.frames).map(function(frameKey) {
                return thisObject.frames[frameKey].nodes;
            }).forEach(function(nodes) {
                numNormalNodes += Object.keys(nodes).filter(function(nodeKey) {
                    return nodes[nodeKey].type === 'node';
                }).length;
            });
            console.log('object ' + objectKey + ' has ' + numNormalNodes + ' normal nodes');
            serverContainer.objects[objectKey].numNormalNodes = numNormalNodes;
        }

        var objectRowDomElement = createDiv(null, 'objectRow', null, serverContainer.domElement);
        createDiv(null, 'objectName', objectName, objectRowDomElement);
        var memoryToggle = createDiv(null, 'memoryToggle', null, objectRowDomElement);

        var hideMemoryButton = createDiv('hideMemory'+objectKey, 'toggleLabel', 'Hide', memoryToggle);
        hideMemoryButton.setAttribute('objectID', objectKey);
        // showMemoryButton.addEventListener('pointerup', showMemory);
        addPointerEventListener(hideMemoryButton, 'pointerup', hideMemory);

        var showMemoryButton = createDiv('showMemory'+objectKey, 'toggleLabel', 'Show', memoryToggle);
        showMemoryButton.setAttribute('objectID', objectKey);
        // hideMemoryButton.addEventListener('pointerup', hideMemory);
        addPointerEventListener(showMemoryButton, 'pointerup', showMemory);

        if (!!getMemoryShownForObject(objectKey)) {
            showMemoryButton.classList.add('toggleSelected');
        } else {
            hideMemoryButton.classList.add('toggleSelected');
        }

        var index = serverContainer.domElement.querySelectorAll('.objectRow').length;
        showMemoryButton.setAttribute('index', index);
        hideMemoryButton.setAttribute('index', index);

    }

    function onMouseDown(params) {
        var event = params.event;
        console.log('onMouseDown');

        var allDivsHere = getAllDivsUnderCoordinate(mouseX, mouseY);

        if (typeof pointerEventListeners['pointerdown'] !== 'undefined') {
            pointerEventListeners['pointerdown'].forEach(function(listener) {
                if (event.target === listener.domElement) {
                    listener.callback({target: listener.domElement});
                }
            });
        }
    }

    function onMouseUp(params) {
        var event = params.event;
        console.log('onMouseUp');

        var allDivsHere = getAllDivsUnderCoordinate(event.pageX, event.pageY);

        if (typeof pointerEventListeners['pointerup'] !== 'undefined') {
            pointerEventListeners['pointerup'].forEach(function(listener) {
                if (allDivsHere.indexOf(listener.domElement) > -1) {  //event.target === listener.domElement) {
                    listener.callback({target: listener.domElement});
                }
            });
        }
    }

    function onElementLoad(params) {
        refreshToggleStates();
    }

    function refreshToggleStates() {

        for (var serverIP in discoveredServers) {
            var serverObjects = discoveredServers[serverIP].objects;
            for (var objectKey in serverObjects) {
                var showMemoryButton = document.getElementById('showMemory' + objectKey);
                var hideMemoryButton = document.getElementById('hideMemory' + objectKey);

                if (!!getMemoryShownForObject(objectKey)) {
                    showMemoryButton.classList.add('toggleSelected');
                    hideMemoryButton.classList.remove('toggleSelected');
                } else {
                    showMemoryButton.classList.remove('toggleSelected');
                    hideMemoryButton.classList.add('toggleSelected');
                }
            }
        }

    }

    /**
     * Determine if an object's memory is shown or hidden by checking all the screen frames for a matching memoryFrame
     * @param {string} objectID
     */
    function getMemoryShownForObject(objectID) {

        var foundMemoryFrame = null;

        realityEditor.database.forEachFrame(function(frameKey, frame) {
            if (foundMemoryFrame) { return; } // exit loop if already found it

            if (frame.visualization === 'screen' && frame.src === 'memoryFrame') {
                // get the publicData of the storage node and check if its objectID matches this one
                var storageNode = Object.keys(frame.nodes).map(function(nodeKey) {
                    return frame.nodes[nodeKey];
                }).filter(function(node) {
                    return node.name === 'storage';
                })[0];
                // console.log('found storage node', storageNode);
                // console.log(storageNode.publicData.memoryInformation);
                if (typeof storageNode.publicData.memoryInformation !== 'undefined') {
                    var thisMemoryObjectID = storageNode.publicData.memoryInformation.objectID;
                    // console.log('thisMemoryObjectID', thisMemoryObjectID);
                    if (thisMemoryObjectID === objectID) {
                        foundMemoryFrame = frame;
                    }
                }
            }
        });

        return foundMemoryFrame;
    }

    /**
     * @param {PointerEvent} event
     */
    function showMemory(event) {
        var thisObjectID = event.target.getAttribute('objectID');
        var memoryIndex = event.target.getAttribute('index');

        // console.log('isMemoryShownForObject ' + thisObjectID, isMemoryShownForObject(thisObjectID));

        if (!!getMemoryShownForObject(thisObjectID)) {
            console.log('already showing this memory, don\'t re-add it');
            return;
        }

        console.log('show: ' + thisObjectID);

        // create a frame

        var dataset = realityElements.filter(function(element){return element.name === 'memoryFrame';})[0];
        console.log(dataset, event.target);

        var thisObject = discoveredObjects[thisObjectID] || discoveredObjectsOnOtherServers[thisObjectID];

        var memoryProjectionMatrix = thisObject.memoryProjectionMatrix || [-1140.395936, 0, 0, 0, 0, -1140.3961199999999, 0, 0, 4.073024, -8.595468, 2.004004, 2, 0, 0, -4.004004, 0];

        dataset.nodes[0].publicData.memoryInformation = {
            objectID: thisObjectID,
            objectIP: thisObject.ip,
            modelViewMatrix: thisObject.memory,
            projectionMatrix: memoryProjectionMatrix
        };


        var xOffset = 404;
        var xWidth = 463;
        var yOffset = 30;
        var yHeight = 262;

        var numCols = Math.floor((window.innerWidth - xOffset) / xWidth);
        var col = (memoryIndex-1) % numCols;
        var row = Math.floor((memoryIndex-1) / numCols);

        var x = xOffset + col * xWidth;
        var y = yOffset + row * yHeight;
        var clampY = window.innerHeight - yOffset;
        y = Math.min(clampY, y);

        // var y = 30;
        // var x = 404 + (463 * (memoryIndex - 1));
        // while (x > (window.innerWidth - 444)) {
        //     x -= ((window.innerWidth - 444) - 444); //-= (window.innerWidth - 464);
        //     y += 262;
        // }
        // y = Math.min(y, window.innerHeight - 200); // clamp it at the end to prevent frames from spawning outside the window
        // //
        // var x = 400 + 400 * memoryIndex;
        // var y = 50 * memoryIndex;

        var additionalDefaultProperties = {
            screen: {
                x: x,
                y: y,
                scale: 1
            }
        };

        realityEditor.pocket.addFrame(dataset, additionalDefaultProperties);

        var button = document.getElementById('showMemory' + thisObjectID);
        var oppositeButton = document.getElementById('hideMemory' + thisObjectID);
        button.classList.add('toggleSelected');
        oppositeButton.classList.remove('toggleSelected');
    }

    /**
     * @param {PointerEvent} event
     */
    function hideMemory(event) {

        var thisObjectID = event.target.getAttribute('objectID');

        // console.log('isMemoryShownForObject ' + thisObjectID, isMemoryShownForObject(thisObjectID));

        if (!getMemoryShownForObject(thisObjectID)) {
            console.log('not showing this memory, no need to hide it');
            return;
        }

        console.log('hide: ' + thisObjectID);

        // delete matching frame
        var matchingMemoryFrame = getMemoryShownForObject(thisObjectID);
        if (matchingMemoryFrame) {
            realityEditor.trash.deleteFrame(matchingMemoryFrame.uuid);
        }

        var button = document.getElementById('hideMemory' + thisObjectID);
        var oppositeButton = document.getElementById('showMemory' + thisObjectID);
        button.classList.add('toggleSelected');
        oppositeButton.classList.remove('toggleSelected');

        // refreshToggleStates();

    }

    /**
     * Shortcut for creating a div with certain style and contents, and possibly adding to a parent element
     * Any parameter can be omitted (pass in null) to ignore those effects
     * @param {string|null} id
     * @param {string|Array.<string>|null} classList
     * @param {string|null} innerHTML
     * @param {HTMLElement|null} parentToAddTo
     * @return {HTMLDivElement}
     */
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
    exports.renderLinks = renderLinks;

})(realityEditor.objectDiscovery);