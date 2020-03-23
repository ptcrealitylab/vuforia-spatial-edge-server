/**
 * This is a much-simplified version of object.js intended to be included by the settings index.html
 * of each logic block, so that the html can communicate with the server backend without importing all of object.js
 */
var spatialObject = {
    node: '',
    frame: '',
    object: '',
    logic: '',
    block: '',
    publicData: {},
    modelViewMatrix: [],
    matrices: {
        modelView: [],
        projection: [],
        groundPlane: [],
        devicePose: [],
        allObjects: {},
    },
    projectionMatrix: [],
    visibility: 'visible',
    sendMatrix: false,
    sendMatrices: {
        modelView: false,
        devicePose: false,
        groundPlane: false,
        allObjects: false
    },
    sendAcceleration: false,
    sendFullScreen: false,
    sendScreenObject: false,
    fullscreenZPosition: 0,
    sendSticky: false,
    height: '100%',
    width: '100%',
    socketIoScript: {},
    socketIoRequest: {},
    pointerEventsScript: {},
    pointerEventsRequest: {},
    style: document.createElement('style'),
    messageCallBacks: {},
    interface: 'gui',
    version: 200,
    moveDelay: 400,
    eventObject: {
        version: null,
        object: null,
        frame: null,
        node: null,
        x: 0,
        y: 0,
        type: null,
        touches: [
            {
                screenX: 0,
                screenY: 0,
                type: null
            },
            {
                screenX: 0,
                screeny: 0,
                type: null
            }
        ]
    },
    touchDecider: null,
    onload: null
};

// adding css styles nessasary for acurate 3D transformations.
spatialObject.style.type = 'text/css';
spatialObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(spatialObject.style);

// Load socket.io.js and pep.min.js synchronous so that it is available by the time the rest of the code is executed.
function loadScriptSync(url, requestObject, scriptObject) {
    requestObject = new XMLHttpRequest();
    requestObject.open('GET', url, false);
    requestObject.send();

    //Only add script if fetch was successful
    if (requestObject.status === 200) {
        scriptObject = document.createElement('script');
        scriptObject.type = 'text/javascript';
        scriptObject.text = requestObject.responseText;
        document.getElementsByTagName('head')[0].appendChild(scriptObject);
    } else {
        console.log('Error XMLHttpRequest HTTP status: ' + requestObject.status);
    }
}

loadScriptSync('../../socket.io/socket.io.js', spatialObject.socketIoRequest, spatialObject.socketIoScript);
loadScriptSync('/objectDefaultFiles/pep.min.js', spatialObject.pointerEventsRequest, spatialObject.pointerEventsScript);

// function for resizing the windows.

window.addEventListener('message', function (MSG) {

    var msgContent = JSON.parse(MSG.data);
    for (var key in spatialObject.messageCallBacks) {
        spatialObject.messageCallBacks[key](msgContent);
    }
}, false);

spatialObject.messageCallBacks.mainCall = function (msgContent) {

    // console.log("------------------------------");
    // console.log(msgContent);

    if (typeof msgContent.node !== 'undefined') {

        if (spatialObject.sendFullScreen === false) {
            spatialObject.height = document.body.scrollHeight;
            spatialObject.width = document.body.scrollWidth;
        }

        parent.postMessage(JSON.stringify(
            {
                version: spatialObject.version,
                node: msgContent.node,
                frame: msgContent.frame,
                object: msgContent.object,
                height: spatialObject.height,
                width: spatialObject.width,
                sendMatrix: spatialObject.sendMatrix,
                sendMatrices: spatialObject.sendMatrices,
                sendAcceleration: spatialObject.sendAcceleration,
                fullScreen: spatialObject.sendFullScreen,
                stickiness: spatialObject.sendSticky,
                moveDelay: spatialObject.moveDelay
            }
        )
        // this needs to contain the final interface source
        , '*');

        var alreadyLoaded = !!spatialObject.node;
        spatialObject.node = msgContent.node;
        spatialObject.frame = msgContent.frame;
        spatialObject.object = msgContent.object;

        if (!alreadyLoaded) {
            if (spatialObject.onload) {
                spatialObject.onload();
            }
        }

        if (spatialObject.sendScreenObject) {
            // eslint-disable-next-line no-undef
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    } else if (typeof msgContent.logic !== 'undefined') {


        parent.postMessage(JSON.stringify(
            {
                version: spatialObject.version,
                block: msgContent.block,
                logic: msgContent.logic,
                frame: msgContent.frame,
                object: msgContent.object,
                publicData: msgContent.publicData
            }
        )
        // this needs to contain the final interface source
        , '*');

        spatialObject.block = msgContent.block;
        spatialObject.logic = msgContent.logic;
        spatialObject.frame = msgContent.frame;
        spatialObject.object = msgContent.object;
        spatialObject.publicData = msgContent.publicData;

        if (spatialObject.sendScreenObject) {
            // eslint-disable-next-line no-undef
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    }

    if (typeof msgContent.modelViewMatrix !== 'undefined') {
        spatialObject.matrices.modelView = msgContent.modelViewMatrix;
    }
    if (typeof msgContent.projectionMatrix !== 'undefined') {
        spatialObject.matrices.projection = msgContent.projectionMatrix;
    }

    if (typeof msgContent.matrices !== 'undefined') {
        if (typeof msgContent.matrices.allObjects !== 'undefined') {
            spatialObject.matrices.allObjects = msgContent.matrices.allObjects;
        }

        if (typeof msgContent.matrices.devicePose !== 'undefined') {
            spatialObject.matrices.devicePose = msgContent.matrices.devicePose;
        }

        if (typeof msgContent.matrices.groundPlane !== 'undefined') {
            spatialObject.matrices.groundPlane = msgContent.matrices.groundPlane;
        }
    }



    if (typeof msgContent.visibility !== 'undefined') {
        spatialObject.visibility = msgContent.visibility;

        // TODO: implement public data subscription in the same way as in object-frames.js

        if (spatialObject.visibility === 'visible') {
            if (typeof spatialObject.node !== 'undefined') {
                if (spatialObject.sendSticky) {
                    parent.postMessage(JSON.stringify(
                        {
                            version: spatialObject.version,
                            node: spatialObject.node,
                            frame: spatialObject.frame,
                            object: spatialObject.object,
                            height: spatialObject.height,
                            width: spatialObject.width,
                            sendMatrix: spatialObject.sendMatrix,
                            sendAcceleration: spatialObject.sendAcceleration,
                            fullScreen: spatialObject.sendFullScreen,
                            stickiness: spatialObject.sendSticky,
                            sendScreenObject: spatialObject.sendScreenObject
                        }), '*');
                }
            }
        }
    }

    if (typeof msgContent.interface !== 'undefined') {
        spatialObject.interface = msgContent.interface;
    }
};

// these are functions used for the setup of logic blocks

function SpatialLogic() { // eslint-disable-line no-unused-vars
    this.publicData = spatialObject.publicData;

    this.readPublicData = function (valueName, value) {
        if (!value)  value = 0;

        if (typeof spatialObject.publicData[valueName] === 'undefined') {
            spatialObject.publicData[valueName] = value;
            return value;
        } else {
            return spatialObject.publicData[valueName];
        }
    };

    if (typeof io !== 'undefined') {
        var _this = this;

        this.ioObject = io.connect();
        this.oldValueList = {};

        this.addReadPublicDataListener = function (valueName, callback) {
            _this.ioObject.on('block', function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.publicData !== 'undefined') {
                    if (typeof thisMsg.publicData[valueName] !== 'undefined') {
                        callback(thisMsg.publicData[valueName]);
                    }
                }
            });
        };



        this.sendRealityEditorSubscribe = setInterval(function () {
            if (spatialObject.object) {
                _this.ioObject.emit('/subscribe/realityEditorBlock', JSON.stringify(
                    {
                        object: spatialObject.object,
                        frame: spatialObject.frame,
                        node: spatialObject.logic,
                        block: spatialObject.block
                    }));
                clearInterval(_this.sendRealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */

        this.writePublicData = function (valueName, value) {

            spatialObject.publicData[valueName] = value;

            this.ioObject.emit('block/publicData', JSON.stringify({
                object: spatialObject.object,
                frame: spatialObject.frame,
                node: spatialObject.logic,
                block: spatialObject.block,
                publicData: spatialObject.publicData
            }));

            parent.postMessage(JSON.stringify(
                {
                    version: spatialObject.version,
                    block: spatialObject.block,
                    node: spatialObject.logic,
                    object: spatialObject.object,
                    frame: spatialObject.frame,
                    publicData: spatialObject.publicData
                }
            ), '*');
        };

        this.writePrivateData = function (valueName, value) {

            var thisItem = {};
            thisItem[valueName] = value;

            this.ioObject.emit('block/privateData', JSON.stringify({
                object: spatialObject.object,
                frame: spatialObject.frame,
                node: spatialObject.logic,
                block: spatialObject.block,
                privateData: thisItem
            }));
        };

        console.log('socket.io is loaded');
    } else {

        this.addReadPublicDataListener = function (valueName, callback) {

            spatialObject.messageCallBacks.updateLogicGUI = function (msgContent) {
                if (typeof msgContent.publicData !== 'undefined') {
                    if (typeof msgContent.publicData[valueName] !== 'undefined') {
                        callback(msgContent.publicData[valueName]);
                    }
                }
            };
        };

        /**
         ************************************************************
         */
        this.ioObject = {
            on: function (_x, _cb) {
            }
        };

        /**
         ************************************************************
         */
        this.writePrivateData = function (_valueName, _value) {
        };

        /**
         ************************************************************
         */
        this.writePublicData = function (_valueName, _value) {
        };

        console.log('socket.io is not working. This is normal when you work offline.');
    }

}

var RealityLogic = SpatialLogic;
var realityObject = spatialObject;
