/*
 * Created by Ben Reynolds on 1/12/18
 */

module.exports = function(rootDirectory) {

    var express = require('express');
    var app = express();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    var bodyParser = require('body-parser');

    function startHTTPServer(port) {
        console.log('startHTTPServer on port' + port + ' with dir: ' + rootDirectory);

        // add the middleware
        app.use(express.static(rootDirectory + '/public'));
        app.use(express.static(__dirname + '/public'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        app.post('/frame', function(req, res) {
            console.log('received a frame!', req.body);
            if (req.body.type) { // received a frame able to be transported
                io.emit('frameReceived', req.body);
            }
            res.json({success: true}).end();
        });

        http.listen(port, function() {
            console.log('listening on *:' + port);
        });
    }

    function createSocketListeners(addFrameCallback) {
        console.log('createSocketListeners');

        io.on('connection', function(socket) {

            console.log('frame palette socket connected');

            // relay messages (touch events and transformation data) from the AR interface to this app's frontend
            socket.on('pointerdown', function(msg) {
                io.emit('remoteTouchDown', msg);
            });

            socket.on('pointermove', function(msg) {
                io.emit('remoteTouchMove', msg);
            });

            socket.on('pointerup', function(msg) {
                io.emit('remoteTouchUp', msg);
            });

            socket.on('zPosition', function(msg) {
                io.emit('zPosition', msg);
            });

            // make a callback to the server to notify it to add a frame to AR space
            socket.on('transportFrame', function(msg) {

                var objectName = msg.objectName;
                var xPosition = msg.xPosition;
                var yPosition = msg.yPosition;
                var destination = msg.destination; // TODO: not necessary with new design
                var frameData = msg.frameData;
                var width = msg.width;
                var height = msg.height;

                if (destination === 'ar') {
                    addFrameCallback(objectName, frameData.uniqueName, frameData.type, xPosition, yPosition, width, height);
                }

            });

        });
    }

    return {
        startHTTPServer: startHTTPServer,
        createSocketListeners: createSocketListeners,
        io: io
    };
};