createNameSpace("realityEditor.pocket");

(function(exports) {

    var isPocketOpen = false;
    var pocket;

    // also automatically creates a registerCallback function on this module
    var callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('realityEditor.pocket');

    /**
     * Initializes the DOM and touch event listeners for the pocket
     */
    function initFeature() {

        // create the pocket button
        var pocketButton = document.createElement('img');
        pocketButton.src = 'resources/pocket.svg';
        pocketButton.id = 'pocketButton';
        document.body.appendChild(pocketButton);

        pocketButton.addEventListener('pointerup', togglePocketVisibility);

        pocket = document.createElement('div');
        pocket.id = 'pocket';
        pocket.classList.add('closed');
        document.body.appendChild(pocket);

        createPocketUIPalette();
    }

    /**
     * Open or closes the pocket when the button is clicked
     */
    function togglePocketVisibility() {
        // console.log('down');
        isPocketOpen = !isPocketOpen;
        console.log('pocket is now ' + (isPocketOpen ? 'open' : 'closed'));

        if (isPocketOpen) {
            pocket.classList.remove('closed');
        } else {
            pocket.classList.add('closed');
        }
    }

    /**
     * Creates a frame container in the pocket for each realityElement defined in pocketFrames.js
     */
    function createPocketUIPalette() {

        realityElements.forEach(function(element) {

            var container = document.createElement('div');
            container.classList.add('element-template');
            container.id = 'pocket-element';

            var urlPrefix = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/';
            var thisUrl = urlPrefix + 'frames/active/' + element.name + '/index.html';
            var gifUrl = urlPrefix + 'frames/active/' + element.name + '/icon.gif';

            container.dataset.src = thisUrl;
            container.dataset.name = element.name;
            container.dataset.width = element.width;
            container.dataset.height = element.height;
            container.dataset.nodes = JSON.stringify(element.nodes);

            var elt = document.createElement('div');
            elt.classList.add('palette-element');
            elt.style.backgroundImage = 'url(\'' + gifUrl + '\')';

            container.appendChild(elt);
            pocket.appendChild(container);

            container.addEventListener('pointerdown', pocketContainerDown);
            container.addEventListener('pointermove', addFrameFromPocket);
            container.addEventListener('pointerup', addFrameFromPocket);

        });
    }

    var whichPocketContainerPressed = null;

    function pocketContainerDown(event) {
        whichPocketContainerPressed = event.target.dataset.name;
    }

    function addFrameFromPocket(event) {
        if (whichPocketContainerPressed === event.target.dataset.name) {
            console.log('add frame ' + whichPocketContainerPressed + ' (by move)');
            whichPocketContainerPressed = null;

            var parsedDataset = {
                name: event.target.dataset.name,
                src: event.target.dataset.src,
                nodes: (typeof event.target.dataset.nodes === 'string') ? JSON.parse(event.target.dataset.nodes) : event.target.dataset.nodes,
                height: parseFloat(event.target.dataset.height),
                width:  parseFloat(event.target.dataset.width)
            };

            var addedFrame = addFrame(parsedDataset);
            togglePocketVisibility();
            realityEditor.touchEvents.beginTouchEditing(addedFrame.objectId, addedFrame.uuid, null);
        }
    }

    /**
     * Creates a new frame given the metadata from the pocket container
     * @param {{name: string, src: string, nodes: string, height: string, width: string}} dataset
     */
    function addFrame(dataset, additionalDefaultProperties) {
        var name = dataset.name;
        var src = dataset.src;
        var nodes = dataset.nodes;
        var height = dataset.height;
        var width = dataset.width;

        console.log('create frame from pocket');

        var frame = new Frame();
        frame.objectId = getObjectId();

        // name the frame "gauge", "gauge2", "gauge3", etc...
        frame.name = name;
        // var existingFrameSrcs = Object.keys(frames).map(function(existingFrameKey){
        //     return frames[existingFrameKey].src;
        // });
        // var numberOfSameFrames = existingFrameSrcs.filter(function(src){
        //     return src === name;
        // }).length;
        // if (numberOfSameFrames > 0) {
        //     frame.name = name + (numberOfSameFrames+1);
        // }

        console.log('created frame with name ' + frame.name);
        var frameName = frame.name + realityEditor.utilities.uuidTime();
        var frameID = frame.objectId + frameName;
        frame.uuid = frameID;
        frame.name = frameName;
        frame.visualization = 'screen';
        frame.ar.x = 0;
        frame.ar.y = 0;
        var defaultScale = 0.25;
        frame.ar.scale = defaultScale;
        frame.frameSizeX = width;
        frame.frameSizeY = height;
        frame.location = 'global';
        frame.src = name;

        // if (frame.src === 'memoryFrame') {
        //     frame.publicData =
        // }

        // set other properties
        frame.width = frame.frameSizeX;
        frame.height = frame.frameSizeY;
        console.log('created pocket frame with width/height' + frame.width + '/' + frame.height);
        // frame.loaded = false;
        // frame.objectVisible = true;
        frame.screen = {
            x: event.clientX - (width/2),
            y: event.clientY - (height/2),
            scale: defaultScale
        };
        // frame.screenZ = 1000;
        // frame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();

        // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
        // frame.fullScreen = false;
        // frame.sendMatrix = false;
        // frame.sendAcceleration = false;
        frame.integerVersion = 300; //parseInt(objects[objectKey].version.replace(/\./g, ""));
        // thisFrame.visible = false;

        // add each node with a non-empty name
        var hasMultipleNodes = nodes.length > 1;
        nodes.forEach(function(node) {

            if (typeof node !== "object") return;
            var nodeUuid = frameID + node.name;
            frame.nodes[nodeUuid] = new Node();
            var addedNode = frame.nodes[nodeUuid];
            addedNode.objectId = getObjectId();
            addedNode.frameId = frameID;
            addedNode.name = node.name;
            addedNode.text = undefined;
            addedNode.type = node.type;
            if (typeof node.x !== 'undefined') {
                addedNode.x = node.x; // use specified position if provided
            } else {
                addedNode.x = hasMultipleNodes ? realityEditor.utilities.randomIntInc(0, 200) - 100 : 0; // center if only one, random otherwise
            }
            if (typeof node.y !== 'undefined') {
                addedNode.y = node.y;
            } else {
                addedNode.y = hasMultipleNodes ? realityEditor.utilities.randomIntInc(0, 200) - 100 : 0;
            }
            addedNode.frameSizeX = 220;
            addedNode.frameSizeY = 220;
            var scaleFactor = 2;
            if (typeof node.scaleFactor !== 'undefined') {
                scaleFactor = node.scaleFactor;
            }
            // var defaultNodeScale = 0.5;
            addedNode.scale = defaultScale * scaleFactor;

            // {name: 'storage', type: 'storeData', publicData: {data: videoPath}}
            if (typeof node.publicData !== 'undefined') {
                addedNode.publicData = node.publicData;
            }

        });

        //     // set the eventObject so that the frame can interact with screens as soon as you add it
        //     realityEditor.device.eventObject.object = closestObjectKey;
        //     realityEditor.device.eventObject.frame = frameID;
        //     realityEditor.device.eventObject.node = null;

        if (typeof additionalDefaultProperties !== 'undefined') {
            for (var key in additionalDefaultProperties) {
                if (additionalDefaultProperties.hasOwnProperty(key)) {
                    frame[key] = additionalDefaultProperties[key];
                }
            }
        }

        frames[frameID] = frame;
        console.log(frame);

        // begin dragging it around immediately
        // first need to add the iframe
        // realityEditor.draw.addElement(frameID, null, frame);
        realityEditor.draw.render();

        document.getElementById("object" + frameID).style.left = (event.clientX - width/2) + 'px';
        document.getElementById("object" + frameID).style.top = (event.clientY - height/2) + 'px';
        // realityEditor.draw.drawTransformed(frameID, frame);
        realityEditor.draw.render();

        // // send it to the server

        realityEditor.network.postNewFrame(frame, function(error, response) {
            console.log(error, response);
        });

        // realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);
        // realityEditor.network.postNewFrame(closestObject.ip, closestObjectKey, frame);
        // realityEditor.gui.pocket.setPocketFrame(frame, {pageX: evt.pageX, pageY: evt.pageY}, closestObjectKey);

        callbackHandler.triggerCallbacks('newFrameAdded', {frameKey: frameID, frame: frame});

        return frame;
    }

    exports.initFeature = initFeature;
    exports.addFrame = addFrame;
    exports.callbackHandler = callbackHandler;

})(realityEditor.pocket);
