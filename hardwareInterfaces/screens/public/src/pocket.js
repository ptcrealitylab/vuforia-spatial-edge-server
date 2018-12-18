createNameSpace("realityEditor.pocket");

(function(exports) {

    var isPocketOpen = false;
    var pocket;

    /**
     * Initializes the DOM and touch event listeners for the pocket
     */
    function initFeature() {

        // create the pocket button
        var pocketButton = document.createElement('img');
        pocketButton.src = 'resources/pocket.svg';
        pocketButton.id = 'pocketButton';
        document.body.appendChild(pocketButton);

        pocketButton.addEventListener('pointerdown', togglePocketVisibility);

        pocket = document.createElement('div');
        pocket.id = 'pocket';
        pocket.classList.add('closed');
        document.body.appendChild(pocket);

        createPocketUIPalette();
    }

    /**
     * Open or closes the pocket when the button is clicked
     * @param event
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
            var thisUrl = urlPrefix + 'frames/' + element.name + '.html';
            var gifUrl = urlPrefix + 'frames/pocketAnimations/' + element.name + '.gif';

            container.dataset.src = thisUrl;
            container.dataset.name = element.name;
            container.dataset.width = element.width;
            container.dataset.height = element.height;
            container.dataset.nodes = JSON.stringify(element.nodes);

            var elt = document.createElement('img');
            elt.classList.add('palette-element');
            elt.src = gifUrl;

            container.appendChild(elt);
            pocket.appendChild(container);

            var paletteElementSize = Math.floor(parseFloat(window.getComputedStyle(container).width)) - 6;
            var ICON_SIZE = 204;
            var scale = paletteElementSize / ICON_SIZE;
            elt.style.transform = 'scale(' + scale + ')';

            container.addEventListener('pointerdown', pocketContainerDown);
            container.addEventListener('pointermove', pocketContainerMove);
            container.addEventListener('pointerup', pocketContainerUp);

        });
    }

    var whichPocketContainerPressed = null;

    function pocketContainerDown(event) {
        whichPocketContainerPressed = event.target.dataset.name;
    }

    function pocketContainerUp(event) {

    }

    function pocketContainerMove(event) {

    }

    function addFrameFromPocket(event) {
        console.log('create frame from pocket');


        togglePocketVisibility();

        // if (!evt.target.classList.contains('element-template')) {
        //     return;
        // }
        //
        // // pointermove gesture must have started with a tap on the pocket
        // if (!isPocketTapped) {
        //     return;
        // }
        //
        // // TODO: only attach to closest object when you release - until then store in pocket and render with identity matrix
        // // TODO: this would make it easier to drop exactly on the the object you want
        // var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
        // var closestObject = realityEditor.getObject(closestObjectKey);
        //
        // if (closestObject.isWorldObject) {
        //     console.log('adding new frame to a world object...');
        //     // realityEditor.worldObjects.addFrameToWorldObject({test: 1234});
        // }
        //
        // // make sure that the frames only sticks to 2.0 server version
        // if (closestObject && closestObject.integerVersion > 165) {
        //
        //     var frame = new Frame();
        //
        //     frame.objectId = closestObjectKey;
        //
        //     // name the frame "gauge", "gauge2", "gauge3", etc...
        //     frame.name = evt.target.dataset.name;
        //     var existingFrameSrcs = Object.keys(closestObject.frames).map(function(existingFrameKey){
        //         return closestObject.frames[existingFrameKey].src;
        //     });
        //     var numberOfSameFrames = existingFrameSrcs.filter(function(src){
        //         return src === evt.target.dataset.name;
        //     }).length;
        //     if (numberOfSameFrames > 0) {
        //         frame.name = evt.target.dataset.name + (numberOfSameFrames+1);
        //     }
        //
        //     console.log('created frame with name ' + frame.name);
        //     var frameName = frame.name + realityEditor.device.utilities.uuidTime();
        //     var frameID = frame.objectId + frameName;
        //     frame.uuid = frameID;
        //     frame.name = frameName;
        //
        //     frame.ar.x = 0;
        //     frame.ar.y = 0;
        //     frame.ar.scale = globalStates.defaultScale; //closestObject.averageScale;
        //     frame.frameSizeX = evt.target.dataset.width;
        //     frame.frameSizeY = evt.target.dataset.height;
        //
        //     // console.log("closest Frame", closestObject.averageScale);
        //
        //     frame.location = 'global';
        //     frame.src = evt.target.dataset.name;
        //
        //     // set other properties
        //
        //     frame.animationScale = 0;
        //     frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        //     frame.width = frame.frameSizeX;
        //     frame.height = frame.frameSizeY;
        //     console.log('created pocket frame with width/height' + frame.width + '/' + frame.height);
        //     frame.loaded = false;
        //     // frame.objectVisible = true;
        //     frame.screen = {
        //         x: frame.ar.x,
        //         y: frame.ar.y,
        //         scale: frame.ar.scale
        //     };
        //     // frame.screenX = 0;
        //     // frame.screenY = 0;
        //     frame.screenZ = 1000;
        //     frame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
        //
        //     // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
        //     frame.fullScreen = false;
        //     frame.sendMatrix = false;
        //     frame.sendAcceleration = false;
        //     frame.integerVersion = 300; //parseInt(objects[objectKey].version.replace(/\./g, ""));
        //     // thisFrame.visible = false;
        //
        //     // add each node with a non-empty name
        //     var nodes = JSON.parse(evt.target.dataset.nodes);
        //     var hasMultipleNodes = nodes.length > 1;
        //     nodes.forEach(function(node) {
        //
        //         if(typeof node !== "object") return;
        //         var nodeUuid = frameID + node.name;
        //         frame.nodes[nodeUuid] = new Node();
        //         var addedNode = frame.nodes[nodeUuid];
        //         addedNode.objectId = closestObjectKey;
        //         addedNode.frameId = frameID;
        //         addedNode.name = node.name;
        //         addedNode.text = undefined;
        //         addedNode.type = node.type;
        //         if (typeof node.x !== 'undefined') {
        //             addedNode.x = node.x; // use specified position if provided
        //         } else {
        //             addedNode.x = hasMultipleNodes ? realityEditor.device.utilities.randomIntInc(0, 200) - 100 : 0; // center if only one, random otherwise
        //         }
        //         if (typeof node.y !== 'undefined') {
        //             addedNode.y = node.y;
        //         } else {
        //             addedNode.y = hasMultipleNodes ? realityEditor.device.utilities.randomIntInc(0, 200) - 100 : 0;
        //         }
        //         addedNode.frameSizeX = 220;
        //         addedNode.frameSizeY = 220;
        //         var scaleFactor = 1;
        //         if (typeof node.scaleFactor !== 'undefined') {
        //             scaleFactor = node.scaleFactor;
        //         }
        //         addedNode.scale = globalStates.defaultScale * scaleFactor;
        //
        //     });
        //
        //     // // set the eventObject so that the frame can interact with screens as soon as you add it
        //     realityEditor.device.eventObject.object = closestObjectKey;
        //     realityEditor.device.eventObject.frame = frameID;
        //     realityEditor.device.eventObject.node = null;
        //
        //     closestObject.frames[frameID] = frame;
        //
        //     console.log(frame);
        //     // send it to the server
        //     // realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);
        //     realityEditor.network.postNewFrame(closestObject.ip, closestObjectKey, frame);
        //
        //     realityEditor.gui.pocket.setPocketFrame(frame, {pageX: evt.pageX, pageY: evt.pageY}, closestObjectKey);
        //
        // } else {
        //     console.warn('there aren\'t any visible objects to place this frame on!');
        // }
        //
        // pocketHide();
    }

    exports.initFeature = initFeature;

})(realityEditor.pocket);