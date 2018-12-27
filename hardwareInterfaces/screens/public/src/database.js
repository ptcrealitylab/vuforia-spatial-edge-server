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

    exports.initFeature = initFeature;
    exports.forEachFrame = forEachFrame;
    exports.forEachNodeInFrame = forEachNodeInFrame;
    exports.forEachNodeInAllFrames = forEachNodeInAllFrames;

})(realityEditor.database);