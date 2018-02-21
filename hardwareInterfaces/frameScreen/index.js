/**
 * Created by Ben Reynolds on 2/21/18.
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = true;

if (exports.enabled) {

    var server = require(__dirname + '/../../libraries/hardwareInterfaces');
    var frameAR = require(__dirname + '/../../libraries/frameScreenTransfer/frameAR-server')(__dirname);
    frameAR.startHTTPServer(3034);
    // frameAR.createSocketListeners(server.addFrame.bind(server));

    server.addScreenObjectListener("frameScreen",function(screenObject){
        server.writeScreenObjects("objectKey", "frameKey", "nodeKey");
        // console.log(screenObject);
        frameAR.io.emit('screenObject', screenObject);
    });

    server.subscribeToFrameData(function(data) {
        //frameAR.frameDataCallback.bind(frameAR)
        frameAR.io.emit('frameDataCallback', data);
    });

    frameAR.io.on('connection', function(socket) {

        console.log('frame screen socket connected');

        // relay messages (touch events and transformation data) from the AR interface to this app's frontend
        socket.on('pointerdown', function (msg) {
            frameAR.io.emit('remoteTouchDown', msg);
        });

        socket.on('pointermove', function (msg) {
            frameAR.io.emit('remoteTouchMove', msg);
        });

        socket.on('pointerup', function (msg) {
            frameAR.io.emit('remoteTouchUp', msg);
        });

        socket.on('zPosition', function (msg) {
            frameAR.io.emit('zPosition', msg);
        });

        socket.on('createFrame', function(msg) {

            // objectName, frameName, src, x, y, width, height
            var objectName = 'framePalette';
            function uuidTime() {
                var dateUuidTime = new Date();
                var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
                while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
                return stampUuidTime;
            }
            var frameName = msg.src + uuidTime();
            var src = msg.src;
            var x = 100 + Math.random() * 400;
            var y = 100 + Math.random() * 400;
            var width = 300;
            var height = 200;

            // createFrameCallback(src);
            // createFrameCallback(objectName, frameName, src, x, y, width, height);

            server.createFrame(objectName, frameName, src, x, y, width, height);

        });

    });

}