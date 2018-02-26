(function(exports) {

    var resizeCallback;

    function resizeMessageHandler(msg) {
        if (!msg.data) return;
        var msgData = msg.data;
        if (typeof msg.data === 'string') {
            msgData = JSON.parse(msg.data);
        }
        if (typeof msgData.resizeFrameData === 'undefined') return;

        console.log('resize callback');
        resizeCallback(msgData.resizeFrameData);
    }

    function setupResizeCallback(customResizeCallback) {
        if (customResizeCallback) {
            resizeCallback = customResizeCallback;
        }
        if (window.addEventListener) {
            // For standards-compliant web browsers
            window.addEventListener("message", resizeMessageHandler, false);
        } else {
            window.attachEvent("message", resizeMessageHandler);
        }
    }

    exports.setupResizeCallback = setupResizeCallback;

})(window);