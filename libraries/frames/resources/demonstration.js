(function(exports) {

    var renderCallback = renderProperties;

    // scripts for demo version
    var stopDemo = false;
    function demoValue(msg) {
        if (!msg.data) return;
        var msgData = msg.data;
        if (typeof msg.data === 'string') {
            msgData = JSON.parse(msg.data);
        }
        if (typeof msgData.demo === 'undefined') return;

        console.log('demo mode = ' + msgData.demo);
        stopDemo = !(msgData.demo);
        demonstrateMotion();
    }

    function demonstrateMotion() {
        if (stopDemo) return;
        for (var propKey in properties) {
            if (!properties.hasOwnProperty(propKey)) continue;
            var newValue = properties[propKey] + 0.003;
            if (newValue > 1) {
                newValue = 0;
            }
            properties[propKey] = newValue;
        }
        renderCallback();
        window.requestAnimationFrame(demonstrateMotion);
    }

    function setupDemonstrationScripts(customRenderCallback) {
        if (customRenderCallback) {
            renderCallback = customRenderCallback;
        }
        if (window.addEventListener) {
            // For standards-compliant web browsers
            window.addEventListener("message", demoValue, false);
        } else {
            window.attachEvent("message", demoValue);
        }
    }

    exports.setupDemonstrationScripts = setupDemonstrationScripts;

})(window);