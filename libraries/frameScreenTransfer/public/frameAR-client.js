(function(exports) {

    var markerElement;
    var markerPath = '/resources/marker.jpg';
    // var frames = [];

    function setMarkerPath(path) {
        markerPath = path;
        updateMarkerElementPath();
    }

    function updateMarkerElementPath() {
        if (markerElement) {
            markerElement.style.backgroundImage = 'url(\'' + markerPath + '\')';
        }
    }

    function getMarkerElement(path, additionalStyles) {
        console.log('getMarkerElement');
        if (!markerElement) {
            markerElement = document.createElement('div');
            markerElement.className = 'paletteMarker';
            if (additionalStyles) {
                Object.keys(additionalStyles).forEach(function (styleName) {
                    markerElement.style[styleName] = additionalStyles[styleName];
                });
            }
            setMarkerPath(path || markerPath);
        }
        return markerElement;
    }

    function createFrame(path) {
        console.log('loadFrame ' + path);
        var frame = document.createElement('iframe');
        // frames.push(frame);
        return frame;
    }

    function initializeDragInterface() {
        console.log('initializeDragInterface');
    }

    function createSocketListeners() {
        console.log('createSocketListeners');
    }

    // TODO: potential useful functions
    function getPositionRelativeToMarker(x, y) {}

    exports.frameAR = {
        setMarkerPath: setMarkerPath,
        getMarkerElement: getMarkerElement,
        createFrame: createFrame,
        initializeDragInterface: initializeDragInterface,
        createSocketListeners: createSocketListeners
    }

    // exports.getMarkerElement = getMarkerElement;
    // exports.createFrame = createFrame;
    // exports.initializeDragInterface = initializeDragInterface;
    // exports.createSocketListeners = createSocketListeners;

})(window);