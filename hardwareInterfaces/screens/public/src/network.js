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

        if (msg.touchState === 'touchstart') {
            console.log('touchstart');
            simulateMouseEvent(screenPos.x, screenPos.y, 'mousedown');

        }

        if (msg.object && msg.frame) {
            console.log('set visibility: ' + msg.isScreenVisible + ' for object ' + msg.object + ', frame ' + msg.frame);
            var frame = frames[msg.frame];
            if (frame) {
                var oldVisualization = frame.visualization;
                frame.visualization = msg.isScreenVisible ? 'screen' : 'ar';

                realityEditor.touchEvents.beginTouchEditing(msg.object, msg.frame, msg.node);

                // set scale of screen frame to match AR frame's size
                if (frame.visualization === 'screen' && oldVisualization === 'ar' && msg.scale !== frame.screen.scale) {
                    frame.ar.scale = msg.scale;
                    frame.screen.scale = msg.scale * scaleARFactor;

                    var iframe = document.querySelector('#iframe' + msg.frame);
                    if (iframe) {
                        iframe.parentElement.style.transform = 'scale(' + frame.screen.scale + ')';

                        if (msg.touchOffsetX) {
                            // dragOffsetX = -1 * msg.touchOffsetX;// + 200;// / getScreenScaleFactor();
                            editingState.touchOffset.x = -1 * msg.touchOffsetX;
                        }
                        if (msg.touchOffsetY) {
                            // dragOffsetY = -1 * msg.touchOffsetY;// + 200;// / getScreenScaleFactor();
                            editingState.touchOffset.y = -1 * msg.touchOffsetY;
                        }
                        console.log('received touchOffset', msg.touchOffsetX, msg.touchOffsetY);
                    }
                }
            }
        }

        if (msg.touchState === 'touchmove') {
            simulateMouseEvent(screenPos.x, screenPos.y, 'mousemove');

        } else if (msg.touchState === 'touchend') {
            console.log('touchend');
            simulateMouseEvent(screenPos.x, screenPos.y, 'mouseup');
            currentlyDraggedPanel = null;
            dragOffsetX = null;
            dragOffsetY = null;
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