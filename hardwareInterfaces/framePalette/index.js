/**
 * @preserve
 *
 *                                     .,,,;;,'''..
 *                                 .'','...     ..',,,.
 *                               .,,,,,,',,',;;:;,.  .,l,
 *                              .,',.     ...     ,;,   :l.
 *                             ':;.    .'.:do;;.    .c   ol;'.
 *      ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *     ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *    .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *     .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *    .:;,,::co0XOko'              ....''..'.'''''''.
 *    .dxk0KKdc:cdOXKl............. .. ..,c....
 *     .',lxOOxl:'':xkl,',......'....    ,'.
 *          .';:oo:...                        .
 *               .cd,    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐   .
 *                 .l;   ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘   '
 *                   'l. ╚═╝└─┘┴└─ └┘ └─┘┴└─  '.
 *                    .o.                   ...
 *                     .''''','.;:''.........
 *                          .'  .l
 *                         .:.   l'
 *                        .:.    .l.
 *                       .x:      :k;,.
 *                       cxlc;    cdc,,;;.
 *                      'l :..   .c  ,
 *                      o.
 *                     .,
 *
 *             ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *             ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *             ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 * Created by Valentin on 10/22/14.
 * Modified by Carsten on 12/06/15.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
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

    var FRAME_NAME = 'zero';

    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
    });

    var filesToServe = [
                        '/index.css',
                        '/frames/decimal.html',
                        '/frames/gauge.html',
                        '/frames/graph.html',
                        '/frames/light.html',
                        '/resources/marker.jpg',
                        '/resources/gauge-outline-1.svg',
                        '/resources/gauge-needle-2.svg',
                        '/resources/light-on.svg',
                        '/resources/light-off.svg'
                        ];


    filesToServe.forEach( function(filename) {

        app.get(filename, function(req, res){
            res.sendFile(__dirname + filename);
        });

    });

    http.listen(3032, function(){
        console.log('listening on *:3032');
    });

    server.enableDeveloperUI(true);

    server.addEventListener('reset', function () {
    });

    server.addEventListener('shutdown', function () {
    });

    io.on('connection', function(socket){

        console.log('frame palette socket connected');

        socket.on('pointerdown', function(msg) {
            // console.log('SERVER POINTER DOWN', msg)
            io.emit('remoteTouchDown', msg);
        });

        socket.on('pointermove', function(msg) {
            // console.log('SERVER POINTER MOVE', msg)
            io.emit('remoteTouchMove', msg);
        });

        socket.on('pointerup', function(msg) {
            // console.log('SERVER POINTER UP', msg)
            io.emit('remoteTouchUp', msg);
        });

        socket.on('zWhilePointerDown', function(msg) {
            // console.log('relaying message... ' + msg.zPosition);
            io.emit('zWhilePointerDown', msg);
        });

        socket.on('transportFrame', function(msg) {

            var xPosition = msg.xPosition;
            var yPosition = msg.yPosition;
            var zPosition = msg.zPosition; // TODO: send this too? (or just remove this declaration)
            var destination = msg.destination;
            var frameData = msg.frameData;

            var width = msg.width;
            var height = msg.height;

            if (destination === 'ar') {
                console.log(frameData.uniqueName);
                server.addFrame('framePalette', frameData.uniqueName, frameData.type, xPosition, yPosition, width, height);
            }

        });

    });

}

