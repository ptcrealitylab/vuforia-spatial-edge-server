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

    function createLink(startNodeKey, endNodeKey) {
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
        var doesLinkExist = false;
        // 4. check that symmetric link doesn't already exist
        var doesSymmetricExist = false;
        // 5. check that link doesn't form a cycle at all
        var doesFormCycle = false;

        if (doNodesNotExist || areNodesEqual || doesLinkExist || doesSymmetricExist || doesFormCycle) {
            console.log('failed to created link because of cycles, etc');
            return;
        }

        // create link object locally
        var newLink = new Link();
        newLink.logicSelector = 4;
        newLink.nodeA = startKeys.nodeKey;
        newLink.nodeB = endKeys.nodeKey;
        newLink.frameA = startKeys.frameKey;
        newLink.frameB = endKeys.frameKey;
        newLink.objectA = startKeys.objectKey;
        newLink.objectB = endKeys.objectKey;

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

})(realityEditor.database);