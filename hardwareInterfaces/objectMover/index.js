/**
 * Created by Ben Reynolds on 10/01/18.
 */

/**
 * Set to true to enable the hardware interface
 **/

var server = require(__dirname + '/../../libraries/hardwareInterfaces');
var utilities = require(__dirname + '/../../libraries/utilities');
var settings = server.loadHardwareInterface(__dirname);

// exports.enabled = settings("enabled");
exports.enabled = true;
exports.configurable = false;

if (exports.enabled) {
    
    var express = require('express');
    var app = express();
    var bodyParser = require('body-parser');
    var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
    // add the middleware
    // use the CORS cross origin REST model
    app.use(cors());
    // allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
    app.options('*', cors());
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    startHTTPServer(8082);
    
    var xOffset = 0;
    var yOffset = 0;
    
    function startHTTPServer(port) {

        console.log('startHTTPServer on port ' + port + ' with dir: ' + (__dirname + '/public'));

        var http = require('http').Server(app);
        var io = require('socket.io')(http);

        // var ioClient = require("socket.io-client");
        // var ioClientConnection = ioClient.connect("http://localhost:8000");
        //
        // // var serverSocket = io.connect('http://localhost:8080', {reconnect: true});
        // ioClientConnection.on('connect', function(socket) {
        //     console.log('socket connection opened properly');
        // });

        http.listen(port, function() {
            
            server.subscribeToMatrixStream(function(visibleObjects) {
                io.emit('visibleObjects', visibleObjects);
            });

            server.subscribeToUDPMessages(function(msgContent) {
                io.emit('udpMessage', msgContent);
            });

            function socketServer() {

                io.on('connection', function (socket) {

                    console.log('connected to socket ' + socket.id);
                    io.emit('newValue', 1234);

                    socket.on('newX', function (msg) {
                        var msgContent = JSON.parse(msg);
                        console.log('newX', msgContent);
                    });

                    socket.on('newY', function (msg) {
                        var msgContent = JSON.parse(msg);
                        console.log('newY', msgContent);
                    });

                    socket.on('getAllObjects', function() {
                        var objects = server.getAllObjects();
                        socket.emit('allObjects', objects);

                        // var objectsOnOtherServers = server.getKnownObjects();
                        // socket.emit('allObjectsOnOtherServers', objectsOnOtherServers);
                    });

                    // socket.on('/matrix/visibleObjects', function (msg) {
                    //
                    //     var msgContent = JSON.parse(msg);
                    //     // console.log(msgContent);
                    //
                    //     io.emit('/matrix/visibleObjects', msgContent);
                    // });
                    //
                    // socket.on('/update', function(msg) {
                    //     var objectKey;
                    //     var frameKey;
                    //     var nodeKey;
                    //
                    //     var msgContent = JSON.parse(msg);
                    //     if (typeof msgContent.objectKey !== 'undefined') {
                    //         objectKey = msgContent.objectKey;
                    //     }
                    //     if (typeof msgContent.frameKey !== 'undefined') {
                    //         frameKey = msgContent.frameKey;
                    //     }
                    //     if (typeof msgContent.nodeKey !== 'undefined') {
                    //         nodeKey = msgContent.nodeKey;
                    //     }
                    //
                    //     if (objectKey && frameKey && nodeKey) {
                    //         io.emit('/update/node', msgContent);
                    //     } else if (objectKey && frameKey) {
                    //         io.emit('/update/frame', msgContent);
                    //     } else if (objectKey) {
                    //         io.emit('/update/object', msgContent);
                    //     }
                    //
                    // });
                    //
                    // /**
                    //  * Implements the native API functionality of UDP sending for the hosted reality editor desktop app
                    //  */
                    // socket.on('/nativeAPI/sendUDPMessage', function(msg) {
                    //     var msgContent = JSON.parse(msg);
                    //     utilities.actionSender(msgContent);
                    // });
                    //
                    // var callibrationFrames = 100;
                    //
                    // connectTo6DMouse();
                    // function connectTo6DMouse() {
                    //     if (!mouseConnected) {
                    //         mouseConnected = true;
                    //         sm = require("../6DMouse/3DConnexion.js");
                    //         var callibration = null;
                    //         sm.spaceMice.onData = function(mouse) {
                    //             // translation
                    //             // console.log("desktop editor translate", JSON.stringify(mouse.mice[0]["translate"]));
                    //             // rotation
                    //             // console.log("desktop editor rotate", JSON.stringify(mouse.mice[0]["rotate"]));
                    //             mouseTranslation = mouse.mice[0]["translate"];
                    //             mouseRotation = mouse.mice[0]["rotate"];
                    //
                    //             if (!callibration) {
                    //                 callibrationFrames--;
                    //                 if (callibrationFrames === 0) {
                    //                     callibration = {
                    //                         x: mouseTranslation.x,
                    //                         y: mouseTranslation.y,
                    //                         z: mouseTranslation.z
                    //                     };
                    //                     console.log('callibrated mouse at ', callibration);
                    //                 }
                    //             } else {
                    //
                    //                 io.emit('/mouse/transformation', {
                    //                     translation: {
                    //                         x: mouseTranslation.x - callibration.x,
                    //                         y: mouseTranslation.y - callibration.y,
                    //                         z: mouseTranslation.z - callibration.z
                    //                     },
                    //                     rotation: mouseRotation
                    //                 });
                    //
                    //             }
                    //         }
                    //     }
                    // }

                });
            }

            socketServer();
        });
    }

}
