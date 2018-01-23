(function(exports) {

    var optimizedResize = (function() {

        var callbacks = [],
            running = false;

        // fired on resize event
        function resize() {

            if (!running) {
                running = true;

                if (window.requestAnimationFrame) {
                    window.requestAnimationFrame(runCallbacks);
                } else {
                    setTimeout(runCallbacks, 66);
                }
            }

        }

        // run the actual callbacks
        function runCallbacks() {

            callbacks.forEach(function(callback) {
                callback.callbackFunction.apply(null, callback.callbackArguments);
            });

            running = false;
        }

        // adds callback to loop
        // supports args e.g. addCallback(resizeTextCallback, [element, widthProportion]);
        function addCallback(callback, arguments) {

            arguments = arguments || [];

            if (callback) {
                callbacks.push({callbackFunction: callback, callbackArguments: arguments});
            }

        }

        return {
            // public method to add additional callback
            add: function(callback) {
                if (!callbacks.length) {
                    window.addEventListener('resize', resize);
                }
                addCallback(callback);
                runCallbacks();
            }
        }
    }());

    function createControlPanel(controls) {

        controls.forEach( function(controlName) {
            var sidebarPanel = createSidebarPanel(controlName);
            sidebar.appendChild(sidebarPanel);
        });
    }

    function createSidebarPanel(controlName) {
        var sidebarPanel = document.createElement("div");
        sidebarPanel.className = "sidebarPanel";
        sidebarPanel.id = controlName;

        var eventCaptureDiv = document.createElement('div');
        eventCaptureDiv.className = "eventCapture";
        sidebarPanel.appendChild(eventCaptureDiv);

        var centerContentsOuter = document.createElement("div");
        centerContentsOuter.className = "centerContentsOuter";
        sidebarPanel.appendChild(centerContentsOuter);

        var centerContentsInner = document.createElement("div");
        centerContentsInner.classList.add("centerContentsInner");
        centerContentsInner.classList.add("blue");
        centerContentsInner.classList.add("active");

        centerContentsOuter.appendChild(centerContentsInner);

        var frame = frameAR.createFrame(controlName);
        centerContentsInner.appendChild(frame);

        return sidebarPanel;
    }

    exports.optimizedResize = optimizedResize;
    exports.createControlPanel = createControlPanel;
    exports.createSidebarPanel = createSidebarPanel;

})(window);