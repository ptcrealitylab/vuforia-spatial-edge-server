/**
 * This is a much-simplified version of object.js intended to be included by the settings index.html
 * of each logic block, so that the html can communicate with the server backend without importing all of object.js
 */
var realityObject = {
    node: "",
    frame: "",
    object: "",
    logic: "",
    block: "",
    publicData: {},
    modelViewMatrix: [],
    matrices:{
        modelView : [],
        projection : [],
        groundPlane : [],
        devicePose : [],
        allObjects : {},
    },
    projectionMatrix: [],
    visibility: "visible",
    sendMatrix: false,
    sendMatrices: {
        modelView : false,
        devicePose : false,
        groundPlane : false,
        allObjects : false
    },
    sendAcceleration: false,
    sendFullScreen: false,
    sendScreenObject : false,
    fullscreenZPosition: 0,
    sendSticky : false,
    height: "100%",
    width: "100%",
    socketIoScript: {},
    socketIoRequest: {},
    pointerEventsScript: {},
    pointerEventsRequest: {},
    style: document.createElement('style'),
    messageCallBacks: {},
    interface : "gui",
    version: 200,
    moveDelay: 400,
    eventObject : {
        version : null,
        object: null,
        frame : null,
        node : null,
        x: 0,
        y: 0,
        type: null,
        touches:[
            {
                screenX: 0,
                screenY: 0,
                type:null
            },
            {
                screenX: 0,
                screeny: 0,
                type:null
            }
        ]
    },
    touchDecider: null,
    onload: null
};

// adding css styles nessasary for acurate 3D transformations.
realityObject.style.type = 'text/css';
realityObject.style.innerHTML = '* {-webkit-user-select: none; -webkit-touch-callout: none;} body, html{ height: 100%; margin:0; padding:0;}';
document.getElementsByTagName('head')[0].appendChild(realityObject.style);

// Load socket.io.js and pep.min.js synchronous so that it is available by the time the rest of the code is executed.
function loadScriptSync(url, requestObject, scriptObject) {
    requestObject = new XMLHttpRequest();
    requestObject.open('GET', url, false);
    requestObject.send();

    //Only add script if fetch was successful
    if (requestObject.status === 200) {
        scriptObject = document.createElement('script');
        scriptObject.type = "text/javascript";
        scriptObject.text = requestObject.responseText;
        document.getElementsByTagName('head')[0].appendChild(scriptObject);
    } else {
        console.log("Error XMLHttpRequest HTTP status: " + requestObject.status);
    }
}

loadScriptSync('../../socket.io/socket.io.js', realityObject.socketIoRequest, realityObject.socketIoScript);
loadScriptSync('/objectDefaultFiles/pep.min.js', realityObject.pointerEventsRequest, realityObject.pointerEventsScript);

// function for resizing the windows.

window.addEventListener("message", function (MSG) {

    var msgContent = JSON.parse(MSG.data);
    for (var key in realityObject.messageCallBacks) {
        realityObject.messageCallBacks[key](msgContent);
    }
}, false);

realityObject.messageCallBacks.mainCall = function (msgContent) {

    // console.log("------------------------------");
    // console.log(msgContent);

    if (typeof msgContent.node !== "undefined") {

        if (realityObject.sendFullScreen === false) {
            realityObject.height = document.body.scrollHeight;
            realityObject.width = document.body.scrollWidth;
        }

        parent.postMessage(JSON.stringify(
            {
                version: realityObject.version,
                node: msgContent.node,
                frame: msgContent.frame,
                object: msgContent.object,
                height: realityObject.height,
                width: realityObject.width,
                sendMatrix: realityObject.sendMatrix,
                sendMatrices: realityObject.sendMatrices,
                sendAcceleration: realityObject.sendAcceleration,
                fullScreen: realityObject.sendFullScreen,
                stickiness: realityObject.sendSticky,
                moveDelay: realityObject.moveDelay
            }
            )
            // this needs to contain the final interface source
            , "*");

        var alreadyLoaded = !!realityObject.node;
        realityObject.node = msgContent.node;
        realityObject.frame = msgContent.frame;
        realityObject.object = msgContent.object;

        if (!alreadyLoaded) {
            if (realityObject.onload) {
                realityObject.onload();
            }
        }

        if (realityObject.sendScreenObject) {
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    }
    else if (typeof msgContent.logic !== "undefined") {


        parent.postMessage(JSON.stringify(
            {
                version: realityObject.version,
                block: msgContent.block,
                logic: msgContent.logic,
                frame: msgContent.frame,
                object: msgContent.object,
                publicData: msgContent.publicData
            }
            )
            // this needs to contain the final interface source
            , "*");

        realityObject.block = msgContent.block;
        realityObject.logic = msgContent.logic;
        realityObject.frame = msgContent.frame;
        realityObject.object = msgContent.object;
        realityObject.publicData = msgContent.publicData;

        if (realityObject.sendScreenObject) {
            reality.activateScreenObject(); // make sure it gets sent with updated object,frame,node
        }
    }

    if (typeof msgContent.modelViewMatrix !== "undefined") {
        realityObject.matrices.modelView = msgContent.modelViewMatrix;
    }
    if (typeof msgContent.projectionMatrix !== "undefined") {
        realityObject.matrices.projection = msgContent.projectionMatrix;
    }

    if (typeof msgContent.matrices !== "undefined") {
        if (typeof msgContent.matrices.allObjects !== "undefined") {
            realityObject.matrices.allObjects = msgContent.matrices.allObjects;
        }

        if (typeof msgContent.matrices.devicePose !== "undefined") {
            realityObject.matrices.devicePose = msgContent.matrices.devicePose;
        }

        if (typeof msgContent.matrices.groundPlane !== "undefined") {
            realityObject.matrices.groundPlane = msgContent.matrices.groundPlane;
        }
    }



    if (typeof msgContent.visibility !== "undefined") {
        realityObject.visibility = msgContent.visibility;

        // TODO: implement public data subscription in the same way as in object-frames.js

        if(realityObject.visibility === "visible"){
            if (typeof realityObject.node !== "undefined") {
                if(realityObject.sendSticky) {
                    parent.postMessage(JSON.stringify(
                        {
                            version: realityObject.version,
                            node: realityObject.node,
                            frame: realityObject.frame,
                            object: realityObject.object,
                            height: realityObject.height,
                            width: realityObject.width,
                            sendMatrix: realityObject.sendMatrix,
                            sendAcceleration: realityObject.sendAcceleration,
                            fullScreen: realityObject.sendFullScreen,
                            stickiness: realityObject.sendSticky,
                            sendScreenObject : realityObject.sendScreenObject
                        }), "*");
                }
            }
        }
    }

    if (typeof msgContent.interface !== "undefined") {
        realityObject.interface = msgContent.interface
    }
};

// these are functions used for the setup of logic blocks

function RealityLogic() {
    this.publicData = realityObject.publicData;

    this.readPublicData = function (valueName, value) {
        if (!value)  value = 0;

        if (typeof realityObject.publicData[valueName] === "undefined") {
            realityObject.publicData[valueName] = value;
            return value;
        } else {
            return realityObject.publicData[valueName];
        }
    };

    if (typeof io !== "undefined") {
        var _this = this;

        this.ioObject = io.connect();
        this.oldValueList = {};

        this.addReadPublicDataListener = function (valueName, callback) {
            _this.ioObject.on("block", function (msg) {
                var thisMsg = JSON.parse(msg);
                if (typeof thisMsg.publicData !== "undefined") {
                    if (typeof thisMsg.publicData[valueName] !== "undefined") {
                        callback(thisMsg.publicData[valueName]);
                    }
                }
            });
        };



        this.sendRealityEditorSubscribe = setInterval(function () {
            if (realityObject.object) {
                _this.ioObject.emit('/subscribe/realityEditorBlock', JSON.stringify(
                    {
                        object: realityObject.object,
                        frame: realityObject.frame,
                        node: realityObject.logic,
                        block: realityObject.block
                    }));
                clearInterval(_this.sendRealityEditorSubscribe);
            }
        }, 10);

        /**
         ************************************************************
         */

        this.writePublicData = function (valueName, value) {

            realityObject.publicData[valueName] = value;

            this.ioObject.emit('block/publicData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.logic,
                block: realityObject.block,
                publicData: realityObject.publicData
            }));

            parent.postMessage(JSON.stringify(
                {
                    version: realityObject.version,
                    block: realityObject.block,
                    node: realityObject.logic,
                    object: realityObject.object,
                    frame: realityObject.frame,
                    publicData: realityObject.publicData
                }
            ), "*");
        };

        this.writePrivateData = function (valueName, value) {

            var thisItem = {};
            thisItem[valueName] = value;

            this.ioObject.emit('block/privateData', JSON.stringify({
                object: realityObject.object,
                frame: realityObject.frame,
                node: realityObject.logic,
                block: realityObject.block,
                privateData: thisItem
            }));
        };

        console.log("socket.io is loaded");
    }
    else {

        this.addReadPublicDataListener = function (valueName, callback) {

            realityObject.messageCallBacks.updateLogicGUI = function (msgContent) {
                if (typeof msgContent.publicData !== "undefined") {
                    if (typeof msgContent.publicData[valueName] !== "undefined") {
                        callback(msgContent.publicData[valueName]);
                    }
                }
            };
        };

        /**
         ************************************************************
         */
        this.ioObject = {
            on: function (x, cb) {
            }
        };

        /**
         ************************************************************
         */
        this.writePrivateData = function (valueName, value) {
        };

        /**
         ************************************************************
         */
        this.writePublicData = function (valueName, value) {
        };

        console.log("socket.io is not working. This is normal when you work offline.");
    }

}
