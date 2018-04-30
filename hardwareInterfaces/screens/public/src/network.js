createNameSpace("realityEditor.network");

/**
 * Parse each message from socket.io and perform the appropriate action
 * Messages include:
 * objectName
 * framesForScreen
 * screenObject
 */
realityEditor.network.setupSocketListeners = function() {

    // callback to set background image based on objectName
    socket.on('objectName', function(msg) {
        document.querySelector('.bg').style.backgroundImage = 'url("resources/'+msg.objectName+'.jpg")';
    });

    // callback to load the frames from the server
    socket.on('framesForScreen', function(msg) {
        console.log('framesForScreen', msg);
        frames = msg;
        realityEditor.draw.renderFrames();
    });

    // callback for when the screenObject data structure is updated in the editor based on projected touch events
    socket.on('screenObject', function(msg) {
        var screenPos = getScreenPosFromARPos(msg.x, msg.y);
        // console.log(msg);
        // console.log(screenPos.x + ', ' + screenPos.y);
        // console.log(msg.touchState);

        realityEditor.network.updateFrameVisualization(msg.object, msg.frame, msg.isScreenVisible, msg.touchOffsetX, msg.touchOffsetY, msg.scale);

        if (msg.touchState === 'touchstart') {
            console.log('touchstart');
            simulateMouseEvent(screenPos.x, screenPos.y, 'pointerdown');
        }

        if (msg.touchState === 'touchmove') {
            simulateMouseEvent(screenPos.x, screenPos.y, 'pointermove');
            if (msg.touches && msg.touches.length > 1 &&
                typeof msg.touches[1].x === 'number' &&
                typeof msg.touches[1].y === 'number') {
                var outerTouchScreenPos = getScreenPosFromARPos(msg.touches[1].x, msg.touches[1].y);
                realityEditor.utilities.scaleEditingVehicle(screenPos, outerTouchScreenPos);
            }

        } else if (msg.touchState === 'touchend') {
            console.log('touchend');
            simulateMouseEvent(screenPos.x, screenPos.y, 'pointerup');
            realityEditor.utilities.resetEditingState();
        }

    });

    // callback for when new frames get created in AR --> we need to create a copy here too
    socket.on('frameDataCallback', function(frame) {
        console.log('frameDataCallback', frame);
        var frameKey = getFrameKey(frame);
        frames[frameKey] = frame;
        frame.screen.scale = frame.ar.scale * scaleARFactor;
        // TODO: set screen position based on AR position??
    });

};

realityEditor.network.updateFrameVisualization = function(objectKey, frameKey, isScreenVisible, touchOffsetX, touchOffsetY, scale) {
    if (objectKey && frameKey) {
        console.log('set visibility: ' + isScreenVisible + ' for object ' + objectKey + ', frame ' + frameKey);
        var frame = frames[frameKey];
        if (frame) {
            var oldVisualization = frame.visualization;
            frame.visualization = isScreenVisible ? 'screen' : 'ar';

            // additional setup for the frame when it first gets pushed into AR
            if (frame.visualization === 'screen' && oldVisualization === 'ar') {

                // show SVG overlay and being dragging around
                realityEditor.touchEvents.beginTouchEditing(objectKey, frameKey, null);

                // set scale of screen frame to match AR frame's size
                // and set touchOffset to keep dragging from same point as in AR
                if (scale !== frame.screen.scale) {
                    frame.ar.scale = scale;
                    frame.screen.scale = scale * scaleARFactor;

                    var iframe = document.querySelector('#iframe' + frameKey);
                    if (iframe) {
                        iframe.parentElement.style.transform = 'scale(' + frame.screen.scale + ')';
                        editingState.touchOffset.x = (touchOffsetX) ? (-1 * touchOffsetX) : 0;
                        editingState.touchOffset.y = (touchOffsetY) ? (-1 * touchOffsetY) : 0;
                        console.log('received scale, touchOffset', scale, touchOffsetX, touchOffsetY);
                    }
                }

            } else if (frame.visualization === 'ar' && oldVisualization === 'screen') {
                realityEditor.utilities.resetEditingState();
            }

        }
    }
};

/**
 * Set the width and height of each iframe based on its contents, which it automatically posts
 */
realityEditor.network.onInternalPostMessage = function(e) {
    var msgContent = {};
    if (e.data) {
        if (typeof e.data === 'string') {
            msgContent = JSON.parse(e.data);
        } else {
            return;
        }
    } else {
        if (typeof e === 'string') {
            msgContent = JSON.parse(e);
        } else {
            return;
        }
    }

    console.log(msgContent);

    if (msgContent.width && msgContent.height) {
        console.log('got width and height', msgContent.width, msgContent.height);
        var iFrame = document.getElementById('iframe' + msgContent.frame);
        iFrame.style.width = msgContent.width + 'px';
        iFrame.style.height = msgContent.height + 'px';
    }
};

realityEditor.network.onElementLoad = function(objectKey, frameKey) {
    console.log('onElementLoad ' + objectKey + ' ' + frameKey);

    var newStyle = {
        object: objectKey,
        frame: frameKey,
        objectData: {
            ip: SERVER_IP
        },
        node: null,
        nodes: null,
        interface: null
    };
    var thisIframe = document.querySelector("#iframe" + frameKey);
    thisIframe._loaded = true;
    thisIframe.contentWindow.postMessage(JSON.stringify(newStyle), '*');
    thisIframe.contentWindow.postMessage(JSON.stringify({
        resizeFrameData: {
            width: parseInt(thisIframe.style.width),
            height: parseInt(thisIframe.style.height)
        }
    }), '*');


    console.log("on_load");
};

/**
 * Helper function to perform a GET request
 */
realityEditor.network.getData = function(objectKey, frameKey, nodeKey, url, callback) {
    if (!nodeKey) nodeKey = null;
    if (!frameKey) frameKey = null;
    var _this = this;
    var req = new XMLHttpRequest();
    try {
        console.log('making GET request to ' + url);
        req.open('GET', url, true);
        // Just like regular ol' XHR
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    // JSON.parse(req.responseText) etc.
                    if (req.responseText)
                        callback(objectKey, frameKey, nodeKey, JSON.parse(req.responseText));
                } else {
                    // Handle error case
                    console.log("could not load content");
                    _this.cout("could not load content");
                }
            }
        };
        req.send();

    }
    catch (e) {
        this.cout("could not connect to" + url);
    }
};

/**
 * POST data as json to url, calling callback with the
 * JSON-encoded response data when finished
 * @param {String} url
 * @param {Object} body
 * @param {Function<Error, Object>} callback
 */
realityEditor.network.postData = function(url, body, callback) {
    var request = new XMLHttpRequest();
    var params = JSON.stringify(body);
    request.open('POST', url, true);
    request.onreadystatechange = function () {
        if (request.readyState !== 4) {
            return;
        }
        if (!callback) {
            return;
        }

        if (request.status === 200) {
            try {
                callback(null, JSON.parse(request.responseText));
            } catch (e) {
                callback({status: request.status, error: e, failure: true}, null);
            }
            return;
        }

        callback({status: request.status, failure: true}, null);
    };

    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    request.send(params);
};

realityEditor.network.postPositionAndSize = function(objectKey, frameKey, nodeKey) {

    if (!frames[frameKey]) return;
    // post new position to server when you stop moving a frame
    var content = frames[frameKey].screen;
    content.scaleARFactor = scaleARFactor;
    content.ignoreActionSender = true; // We update the position of the AR frames another way -> trying reload the entire object in the editor here messes up the positions
    var urlEndpoint = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/size/";
    this.postData(urlEndpoint, content, function (response, error) {
        console.log(response, error);
    });
};