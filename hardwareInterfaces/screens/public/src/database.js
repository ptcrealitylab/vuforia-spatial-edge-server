createNameSpace("realityEditor.database");

(function(exports) {

    function initFeature() {

    }

    function forEachFrame(callback) {
        for (var frameKey in frames) {
            if (!frames.hasOwnProperty(frameKey)) continue;
            var frame = frames[frameKey];
            if (typeof frame.location === 'undefined') continue;
            if (frame.location !== 'global') continue;

            callback(frameKey, frame);
        }
    }

    function forEachNodeInFrame(frameKey, callback) {
        if (!frames.hasOwnProperty(frameKey)) return;

        var frame = frames[frameKey];
        for (var nodeKey in frame.nodes) {
            if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
            var node = frame.nodes[nodeKey];

            callback(nodeKey, node);
        }
    }

    function forEachNodeInAllFrames(callback) {
        forEachFrame(function(frameKey, frame) {
            forEachNodeInFrame(frameKey, function(nodeKey, node) {
                callback(frameKey, nodeKey, node);
            });
        });
    }

    function forEachLinkInFrame(frameKey, callback) {
        if (!frames.hasOwnProperty(frameKey)) return;

        var frame = frames[frameKey];
        for (var linkKey in frame.links) {
            if (!frame.links.hasOwnProperty(linkKey)) continue;
            var link = frame.links[linkKey];

            callback(linkKey, link);
        }
    }

    function forEachLinkInAllFrames(callback) {
        forEachFrame(function(frameKey, frame) {
            forEachLinkInFrame(frameKey, function(linkKey, link) {
                callback(frameKey, linkKey, link);
            });
        });
    }

    function getFrame(frameKey) {
        return frames[frameKey];
    }

    function getNode(frameKey, nodeKey) {
        var frame = getFrame(frameKey);
        if (frame) {
            return frame.nodes[nodeKey];
        }
        return null;
    }

    function createLink(startNodeKey, endNodeKey, startLinkColorCode, endLinkColorCode) {
        var startKeys = realityEditor.utilities.getKeysFromKey(startNodeKey);
        var endKeys = realityEditor.utilities.getKeysFromKey(endNodeKey);

        var startNode = getNode(startKeys.frameKey, startKeys.nodeKey);
        var endNode = getNode(startKeys.frameKey, startKeys.nodeKey);

        // error handling
        // 1. check that both nodes exist
        var doNodesNotExist = (!startNode || !endNode);
        // 2. check that nodes are different
        var areNodesEqual = startNodeKey === endNodeKey;
        // 3. check that link doesn't already exist
        var doesLinkExist = false; // todo: implement
        // 4. check that symmetric link doesn't already exist
        var doesSymmetricExist = false; // todo: implement
        // 5. check that link doesn't form a cycle at all
        var doesFormCycle = false; // todo: implement

        if (doNodesNotExist || areNodesEqual || doesLinkExist || doesSymmetricExist || doesFormCycle) {
            console.log('failed to created link because of cycles, etc');
            return;
        }

        // create link object locally
        var newLink = new Link();
        // newLink.logicSelector = 4;
        newLink.nodeA = startKeys.nodeKey;
        newLink.nodeB = endKeys.nodeKey;
        newLink.frameA = startKeys.frameKey;
        newLink.frameB = endKeys.frameKey;
        newLink.objectA = startKeys.objectKey;
        newLink.objectB = endKeys.objectKey;
        newLink.logicA = startLinkColorCode;
        newLink.logicB = endLinkColorCode;

        var startFrame = getFrame(startKeys.frameKey);
        var linkKey = realityEditor.utilities.uuidTimeShort();
        startFrame.links[linkKey] = newLink;

        // post to server
        realityEditor.network.postNewLink(startKeys.objectKey, startKeys.frameKey, linkKey, newLink);
    }

    function deleteLink(frameKey, linkKey) {
        var frame = getFrame(frameKey);
        delete frame.links[linkKey];

        // post to server
        var keys = realityEditor.utilities.getKeysFromKey(frameKey);
        realityEditor.network.deleteLink(keys.objectKey, keys.frameKey, linkKey);
    }

    function createLogicNode(frameKey) {

        var frame = getFrame(frameKey);

        ////////

        var addedLogic = new Logic();
        //
        // // if this is being created from a logic node memory, copy over most properties from the saved pocket logic node
        // if (logicNodeMemory) {
        //     var keysToCopyOver = ['blocks', 'iconImage', 'lastSetting', 'lastSettingBlock', 'links', 'lockPassword', 'lockType', 'name', 'nameInput', 'nameOutput'];
        //     keysToCopyOver.forEach( function(key) {
        //         addedLogic[key] = logicNodeMemory[key];
        //     });
        //
        //     if (typeof logicNodeMemory.nodeMemoryCustomIconSrc !== 'undefined') {
        //         addedLogic.nodeMemoryCustomIconSrc = logicNodeMemory.nodeMemoryCustomIconSrc;
        //     }
        //
        // }
        //
        //
        // // give new logic node a new unique identifier so each copy is stored separately
        var logicKey = frameKey + realityEditor.utilities.uuidTime();
        addedLogic.uuid = logicKey;

        // var closestFrameKey = null;
        // var closestObjectKey = null;
        //
        // // try to find the closest local AR frame to attach the logic node to
        // var objectKeys = realityEditor.gui.ar.getClosestFrame(function(frame) {
        //     return frame.visualization !== 'screen' && frame.location === 'local';
        // });
        //
        // // if no local frames found, expand the search to include all frames
        // if (!objectKeys[1]) {
        //     objectKeys = realityEditor.gui.ar.getClosestFrame();
        // }
        //
        // if (objectKeys[1] !== null) {
        //     closestFrameKey = objectKeys[1];
        //     closestObjectKey = objectKeys[0];
        //     var closestObject = objects[closestObjectKey];
        //     var closestFrame = closestObject.frames[closestFrameKey];
        //
            addedLogic.objectId = getObjectId();
            addedLogic.frameId = frameKey;

            addedLogic.x = 0;
            addedLogic.y = 0;

            addedLogic.frameSizeX = 220;
            addedLogic.frameSizeY = 220;

            var defaultScale = 0.25;
            addedLogic.scale = defaultScale;
        //     addedLogic.screenZ = 1000;
        //     addedLogic.loaded = false;
        //     addedLogic.matrix = [];
        //
        //     // make sure that logic nodes only stick to 2.0 server version
        //     if(realityEditor.network.testVersion(closestObjectKey) > 165) {
                console.log('created node with logic key ' + logicKey + ' and added to ' + frameKey);
                frame.nodes[logicKey] = addedLogic;

        //         // render it
        //         var nodeUrl = "nodes/logic/index.html";
        //
        //         realityEditor.gui.ar.draw.addElement(nodeUrl, closestObjectKey, closestFrameKey, logicKey, 'logic', addedLogic);
        //
        //         var _thisNode = document.getElementById("iframe" + logicKey);
        //         if (_thisNode && _thisNode._loaded) {
        //             realityEditor.network.onElementLoad(closestObjectKey, logicKey);
        //         }
        //
        //         // send it to the server
        //         realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);
        //
        //         realityEditor.gui.pocket.setPocketNode(addedLogic, {pageX: globalStates.pointerPosition[0], pageY: globalStates.pointerPosition[1]}, closestObjectKey, closestFrameKey);
        //
        //         console.log("successfully added logic from pocket to object (" + closestObject.name + ", " + closestFrame.name + ")");
        //         return {
        //             logicNode: addedLogic,
        //             domElement: globalDOMCache[logicKey],
        //             objectKey: closestObjectKey,
        //             frameKey: closestFrameKey
        //         };
        //     }
        // }

        return addedLogic;

    }

    exports.initFeature = initFeature;

    // TODO: implement queries, e.g. getFrame(frameKey), getNode(frameKey, nodeKey)
    exports.getFrame = getFrame;
    exports.getNode = getNode;

    // iterators
    exports.forEachFrame = forEachFrame;
    exports.forEachNodeInFrame = forEachNodeInFrame;
    exports.forEachNodeInAllFrames = forEachNodeInAllFrames;
    exports.forEachLinkInFrame = forEachLinkInFrame;
    exports.forEachLinkInAllFrames = forEachLinkInAllFrames;

    // CRUD operators
    exports.createLink = createLink;
    exports.deleteLink = deleteLink;

    exports.createLogicNode = createLogicNode;

})(realityEditor.database);