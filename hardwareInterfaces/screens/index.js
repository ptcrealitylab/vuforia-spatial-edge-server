/**
 * Created by Ben Reynolds on 2/21/18.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
var server = require(__dirname + '/../../libraries/hardwareInterfaces');
var utilities = require(__dirname + '/../../libraries/utilities');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = settings("enabled");

if (exports.enabled) {

    var activeScreens = [];

    // !!! TO ADD NEW SCREENS, JUST ADD A LINE WITH THE OBJECT NAME AND WHICH PORT YOU WANT IT TO BE SERVED ON !!! //
    // Then make sure to add [objectName].jpg to the hardwareInterfaces/screens/public/resources/ directory
    // And call activateScreenObject() from the index.html of a frame in that object to enable touch controls
    // ----------------------------------------------------------------------------------------------------------- //

    for(var key in settings("screens")){
        bindScreen(key, settings("screens")[key]);
    }

    // ----------------------------------------------------------------------------------------------------------- //

    var express = require('express');
    var app = express();
    var bodyParser = require('body-parser');
    var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing

    function Screen(objectName, port) {
        this.objectName = objectName;
        this.port = port;
    }

    function bindScreen(objectName, port) {
        var screen = new Screen(objectName, port);
        console.log('activating screen for ' + objectName + ' on port ' + port);
        server.activateScreen(objectName, port);
        activeScreens.push(screen);
    }

    // var httpServers = {};
    // var ioSockets = {};

    // add the middleware
    // use the CORS cross origin REST model
    app.use(cors());
    // allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
    app.options('*', cors());
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    activeScreens.forEach(function(screen) {
        startHTTPServer(screen);
    });

    function startHTTPServer(screen) {

        var port = screen.port;
        var objectName = screen.objectName;

        console.log('startHTTPServer on port ' + port + ' with dir: ' + __dirname);

        var http = require('http').Server(app);
        var io = require('socket.io')(http);

        // httpServers[port] = http;
        // ioSockets[port] = io;

        http.listen(port, function() {
            console.log('started screen for object ' + objectName + ' on port ' + port);
        });

        // TODO: make this port-specific
        server.addScreenObjectListener(objectName, function(screenObject){
            io.emit('screenObject', screenObject);
        });

        // TODO: make this port-specific
        server.subscribeToNewFramesAdded(objectName, function(data) {
            var msg = {
                frame: data,
                targetScreen: {
                    object: objectName
                }
            };
            io.emit('newFrameAdded', msg);
        });

        server.subscribeToReset(objectName, function() {
            io.emit('reloadScreen');
        });

        server.subscribeToUDPMessages(function(msgContent) {
            // console.log('received UDP message: ' + JSON.stringify(msgContent));
            if (typeof msgContent.action !== 'undefined') {
                console.log('received action message: ' + JSON.stringify(msgContent.action));
                io.emit('actionMessage', msgContent.action);
            }
        });

        io.on('connection', function(socket) {
            console.log('frame screen socket connected');
            // relay messages from the AR interface to this app's frontend
            socket.on('writeScreenObject', function(msg) {
                console.log('writeScreenObject', msg.objectKey, msg.frameKey, msg.nodeKey, msg.touchOffsetX, msg.touchOffsetY);
                server.writeScreenObjects(msg.objectKey, msg.frameKey, msg.nodeKey, msg.touchOffsetX, msg.touchOffsetY);
            });

            socket.on('getFramesForScreen', function(msg) {
                console.log('getFramesForScreen');
                var frames = server.getAllFrames(objectName);
                // console.log(frames);
                socket.emit('framesForScreen', frames);
            });

            socket.on('getObjectName', function(msg) {
                console.log('getObjectName', msg);
                socket.emit('objectName', {objectName: objectName});
            });

            socket.on('getObjectTargetSize', function(msg) {
                console.log('getObjectTargetSize', msg);

                var mmToMeterScale = 1000;
                var targetSize = {
                    width: server.getMarkerSize(objectName).width * mmToMeterScale,
                    height: server.getMarkerSize(objectName).height * mmToMeterScale
                };
                socket.emit('objectTargetSize', {targetSize: targetSize});
            });

            socket.on('/nativeAPI/sendUDPMessage', function(msg) {
                if (typeof msg === 'string') {
                    msg = JSON.parse(msg);
                }
                console.log('send UDP message from screen client', msg);
                utilities.actionSender(msg);
            });

            socket.on('getAllObjects', function() {
                var objects = server.getAllObjects();
                socket.emit('allObjects', objects);

                var objectsOnOtherServers = server.getKnownObjects();
                socket.emit('allObjectsOnOtherServers', objectsOnOtherServers);
            })
        });
    }

}