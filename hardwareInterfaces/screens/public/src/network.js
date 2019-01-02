createNameSpace("realityEditor.network");

/**
 * Parse each message from socket.io and perform the appropriate action
 * Messages include:
 * objectName
 * framesForScreen
 * screenObject
 * newFrameAdded
 */
realityEditor.network.setupSocketListeners = function() {

    // callback to set background image based on objectName
    socket.on('objectName', function(msg) {
        if (!realityEditor.network.isMessageForMe(msg)) return;

        objectName = msg.objectName;
        document.querySelector('.bg').style.backgroundImage = 'url("resources/'+msg.objectName+'.jpg")';
        document.title = msg.objectName;
    });

    // callback to set background image based on objectName
    socket.on('objectTargetSize', function(msg) {
        if (!realityEditor.network.isMessageForMe(msg)) return;

        targetSize = msg.targetSize;
        console.log('got target size', targetSize);
        realityEditor.utilities.calculateScaleFactor();
    });

    // callback to load the frames from the server
    socket.on('framesForScreen', function(msg) {
        if (!realityEditor.network.isMessageForMe(msg)) return;

        console.log('framesForScreen', msg);
        frames = msg;
        realityEditor.draw.render();
    });

    // callback for when the screenObject data structure is updated in the editor based on projected touch events
    socket.on('screenObject', function(msg) {
        if (!realityEditor.network.isMessageForMe(msg)) return;

        multiTouchList = [];
        if (msg.touches) {
            multiTouchList = msg.touches.filter(function(touch) {
                return (typeof touch.x === "number" && typeof touch.y === "number");
            });
        }

        var screenPos = getScreenPosFromARPos(msg.x, msg.y);
        // console.log(msg);
        // console.log(screenPos.x + ', ' + screenPos.y);
        // console.log(msg.touchState);

        var stateDidChange = realityEditor.network.updateFrameVisualization(msg.object, msg.frame, msg.isScreenVisible, msg.touchOffsetX, msg.touchOffsetY, msg.scale);

        // if pushed into screen, simulate touchmove immediately so that it appears in the correct position instead of at (0,0)
        if (stateDidChange && editingState.frameKey) {
            realityEditor.touchEvents.simulateMouseEvent(screenPos.x, screenPos.y, 'pointermove');
        }

        if (msg.touchState === 'touchstart') {
            console.log('touchstart');

            realityEditor.utilities.resetFramesIfTripleTap();

            realityEditor.touchEvents.simulateMouseEvent(screenPos.x, screenPos.y, 'pointerdown');
        }

        if (msg.touchState === 'touchmove') {
            realityEditor.touchEvents.simulateMouseEvent(screenPos.x, screenPos.y, 'pointermove');

            if (msg.touches && msg.touches.length > 1 &&
                typeof msg.touches[1].x === 'number' &&
                typeof msg.touches[1].y === 'number') {
                var outerTouchScreenPos = getScreenPosFromARPos(msg.touches[1].x, msg.touches[1].y);
                realityEditor.utilities.scaleEditingVehicle(screenPos, outerTouchScreenPos);
            }

        } else if (msg.touchState === 'touchend') {
            console.log('touchend');
            realityEditor.touchEvents.simulateMouseEvent(screenPos.x, screenPos.y, 'pointerup');
            // realityEditor.utilities.resetEditingState();
        }

        // if pulled out of screen, hide touch overlay
        if (stateDidChange && !editingState.frameKey) {
            realityEditor.utilities.hideTouchOverlay();
        }

    });

    // callback for when new frames get created in AR --> we need to create a copy here too
    socket.on('newFrameAdded', function(msg) {
        if (!realityEditor.network.isMessageForMe(msg)) return;

        var frame = msg.frame;
        // console.log('newFrameAdded', frame);
        var frameKey = getFrameKey(frame);

        console.log('newFrameAdded for ' + objectName + ': ' + frameKey);

        frames[frameKey] = frame;
        frame.screen.scale = frame.ar.scale * scaleRatio; //scaleARFactor;
        // TODO: set screen position based on AR position??
    });

    socket.on('reloadScreen', function(msg) {
        window.location.reload();
    });

};

/**
 * Checks messages coming from the editor to make sure it isnt targeted for another screen
 */
realityEditor.network.isMessageForMe = function(msg) {
    if (msg.targetScreen) {
        if (msg.targetScreen.object.indexOf(objectName) === -1) {
            console.log('this message is not for ' + objectName + ', it is for ' + msg.targetScreen.object);
            return false;
        }
    }
    return true;
};

/**
 * Determines whether to push a frame into the screen or pull it out into AR.
 * Updates state that later renders the DOM and triggers necessary events.
 */
realityEditor.network.updateFrameVisualization = function(objectKey, frameKey, isScreenVisible, touchOffsetX, touchOffsetY, scale) {

    var stateDidChange = false;

    if (objectKey && frameKey) {
        console.log('set visibility: ' + isScreenVisible + ' for object ' + objectKey + ', frame ' + frameKey);
        var frame = frames[frameKey];
        if (frame) {
            var oldVisualization = frame.visualization;
            frame.visualization = isScreenVisible ? 'screen' : 'ar';

            // additional setup for the frame when it first gets pushed into screen
            if (frame.visualization === 'screen' && oldVisualization === 'ar') {
                stateDidChange = true;

                // show SVG overlay and being dragging around
                realityEditor.touchEvents.beginTouchEditing(objectKey, frameKey, null);

                // set scale of screen frame to match AR frame's size
                // and set touchOffset to keep dragging from same point as in AR
                // if (scale !== frame.screen.scale) {
                    frame.ar.scale = scale;
                    frame.screen.scale = scale * scaleRatio; //scaleARFactor;

                    var iframe = document.querySelector('#iframe' + frameKey);
                    if (iframe) {
                        iframe.parentElement.style.transform = 'scale(' + frame.screen.scale + ')';
                        // needs to be reset here otherwise it gets set to bad value in beginTouchEditing because mouseX,mouseY not updated yet
                        editingState.touchOffset.x = (touchOffsetX) ? -1 * touchOffsetX * frame.width * frame.screen.scale : 0;
                        editingState.touchOffset.y = (touchOffsetY) ? -1 * touchOffsetY * frame.height * frame.screen.scale : 0;

                        console.log('received scale, touchOffset', scale, touchOffsetX, touchOffsetY);
                    }
                // }

            } else if (frame.visualization === 'ar' && oldVisualization === 'screen') {
                stateDidChange = true;

                // when sending frame back to AR, only a bit of clean up work required because
                // automatically stops rendering when you set its visualization to ar

                // TODO: post scale if necessary... this causes unintended side effects so we don't do it. only affects if pull out while both pinch fingers active
                // realityEditor.network.postPositionAndSize(editingState.objectKey, editingState.frameKey, editingState.nodeKey);

                // reset editing state...
                realityEditor.utilities.resetEditingState();

                // hide the touchOverlay
                realityEditor.utilities.hideTouchOverlay();

            }

        }
    }

    if (stateDidChange) {
        var iframe = document.querySelector('#iframe' + frameKey);
        if (iframe) {
            var visibilityString = frame.visualization === 'screen' ? 'visible' : 'hidden';
            iframe.contentWindow.postMessage(JSON.stringify({ visibility: visibilityString }), '*');
        }
    }

    return stateDidChange;
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

    // console.log(msgContent);

    if (msgContent.width && msgContent.height && msgContent.frame) {
        console.log('got width and height', msgContent.width, msgContent.height);
        var activeKey = msgContent.node || msgContent.frame;
        var iFrame = document.getElementById('iframe' + activeKey);
        iFrame.style.width = msgContent.width + 'px';
        iFrame.style.height = msgContent.height + 'px';
        var svg = document.getElementById('svg' + activeKey);
        svg.style.width = msgContent.width + 'px';
        svg.style.height = msgContent.height + 'px';
        realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
    }

    if (typeof msgContent.socketReconnect !== 'undefined') {
        setTimeout(function() {
            window.location.reload();
        }, 1000);
    }

    if (typeof msgContent.moveDelay !== "undefined") {
        var activeVehicle = frames[msgContent.frame];
        if (activeVehicle) {
            activeVehicle.moveDelay = msgContent.moveDelay;
            console.log('move delay of ' + activeVehicle.name + ' is set to ' + activeVehicle.moveDelay);
        }
    }
};

realityEditor.network.onElementLoad = function(objectKey, frameKey, nodeKey) {
    console.log('onElementLoad ' + objectKey + ' ' + frameKey + ' ' + nodeKey);

    if (nodeKey === "null") nodeKey = null;

    var frame = frames[frameKey];
    var nodes = (!!frame) ? frame.nodes : {};
    var simpleNodes = realityEditor.utilities.getNodesJsonForIframes(nodes);

    var newStyle = {
        object: objectKey,
        frame: frameKey,
        objectData: {
            ip: SERVER_IP
        },
        node: nodeKey,
        nodes: simpleNodes,
        interface: null
    };

    var activeKey = nodeKey || frameKey;

    var thisIframe = document.querySelector("#iframe" + activeKey);
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
        console.log("could not connect to" + url);
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

realityEditor.network.deleteData = function (url, content) {
    var request = new XMLHttpRequest();
    request.open('DELETE', url, true);
    var _this = this;
    request.onreadystatechange = function () {
        if (request.readyState === 4) console.log("It deleted!");
    };
    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    if (content) {
        request.send(JSON.stringify(content));
    } else {
        request.send();
    }
    console.log("deleteData");
};

realityEditor.network.postPositionAndSize = function(objectKey, frameKey, nodeKey, wasTriggeredFromEditor) {
    if (!objectKey || !frameKey) return;
    if (!frames[frameKey]) return;

    var activeKey = nodeKey || frameKey;
    var isFrame = activeKey === frameKey;

    // post new position to server when you stop moving a frame
    var content;
    if (isFrame) {
        content = {
            x: frames[frameKey].screen.x,
            y: frames[frameKey].screen.y,
            scale: frames[frameKey].screen.scale,
            scaleARFactor: scaleRatio,
            ignoreActionSender: true // We update the position of the AR frames another way -> trying reload the entire object in the editor here messes up the positions
        };
    } else {
        content = {
            x: frames[frameKey].nodes[nodeKey].x,
            y: frames[frameKey].nodes[nodeKey].y,
            scale: frames[frameKey].nodes[nodeKey].scale,
            ignoreActionSender: true // We update the position of the AR frames another way -> trying reload the entire object in the editor here messes up the positions
        };
    }

    if (wasTriggeredFromEditor) {
        content.wasTriggeredFromEditor = true;
    } else {
        if (isFrame) {
            var iframeRect = document.getElementById('iframe' + frameKey).getClientRects()[0];
            var frameCenterX = frames[frameKey].screen.x + iframeRect.width/2;
            var frameCenterY = frames[frameKey].screen.y + iframeRect.height/2;
            var arPosition = getARPosFromScreenPos(frameCenterX, frameCenterY);
            content.arX = arPosition.x;
            content.arY = arPosition.y;
        }
    }
    content.lastEditor = tempUuid;
    var urlEndpoint;
    if (isFrame) {
        urlEndpoint = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/size/";
    } else {
        urlEndpoint = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/nodeSize/";
    }
    this.postData(urlEndpoint, content, function (error, response) {
        console.log(error, response);
    });
};

realityEditor.network.postNewFrame = function(contents, callback) {
    console.log("I am adding a frame: " + contents);
    contents.lastEditor = tempUuid;
    var urlEndpoint = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + getObjectId() + "/addFrame/";
    this.postData(urlEndpoint, contents, callback);
};

realityEditor.network.deleteFrameFromObject = function(frameKey) {
    console.log("I am deleting a frame: " + frameKey);
    // var frameToDelete = realityEditor.getFrame(objectKey, frameKey);
    // if (frameToDelete) {
    //     console.log('deleting ' + frameToDelete.location + ' frame', frameToDelete);
    //     if (frameToDelete.location !== 'global') {
    //         console.warn('WARNING: TRYING TO DELETE A LOCAL FRAME');
    //         return;
    //     }
    // } else {
    //     console.log('cant tell if local or global... frame has already been deleted on editor');
    // }
    var contents = {lastEditor: tempUuid};
    this.deleteData('http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + getObjectId() + "/frames/" + frameKey, contents);
};

realityEditor.network.postNewLink = function (objectKey, frameKey, linkKey, thisLink) {
    // generate action for all links to be reloaded after upload
    thisLink.lastEditor = tempUuid;
    // this.cout("sending Link");
    this.postData('http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + '/addLink/', thisLink, function (err, response) {
        console.log(response);
    });
};

realityEditor.network.deleteLink = function (objectKey, frameKey, linkKey) {// generate action for all links to be reloaded after upload
    this.deleteData('http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/editor/" + tempUuid + "/deleteLink/");
};

// realityEditor.network.postNewLogicNode = function(objectKey, frameKey, nodeKey, logicNode, callback) {
//     console.log("I am adding a logic node: " + contents);
//     var simpleLogic = realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logicNode);
//     simpleLogic.lastEditor = globalStates.tempUuid;
//     this.postData('http://' + SERVER_IP + ':' + SERVER_PORT + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/addLogicNode/", simpleLogic, function () {
//     });
// };