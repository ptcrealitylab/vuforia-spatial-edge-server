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
var server = require('../../libraries/hardwareInterfaces');

var settings = server.loadHardwareInterface(__dirname);

exports.enabled = false;
exports.configurable = true; // can be turned on/off/adjusted from the web frontend

if (exports.enabled) {



    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);


    app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
    });
    app.get('/marker.jpg', function(req, res){
        res.sendFile(__dirname + '/marker.jpg');
    });


    http.listen(3000, function(){
        console.log('listening on *:3000');
    });

    var counter = 0;
    var timer = false;
    server.enableDeveloperUI(true);

    server.addNode("timer", "timer01", "start", "node");
    server.addNode("timer", "timer01", "stop", "node");
    server.addNode("timer", "timer01", "reset", "node");
    server.addNode("timer", "timer01", "running", "node");

    server.addReadListener("timer", "timer01", "start", function (data) {
        if (data.value > 0.5) {
            if (!timer) {
                io.emit('timer', {timer: "start"});
                timer = true;
                server.write('timer', "timer01", 'running', 1.0, 'f');
            }
        }
    });

    server.addReadListener("timer", "timer01", "reset", function (data) {
        if (data.value > 0.5) {
            io.emit('timer', {timer: "reset"});
        }
    });

    server.addReadListener("timer", "timer01", "stop", function (data) {
        console.log('timer01 value', data.value);
        if (data.value > 0.5) {
            if (timer) {
                io.emit('timer', {timer: "stop"});
                timer = false;
                server.write('timer', "timer01", 'running', 0.0, 'f');
            }
        }
    });

    server.addEventListener("reset", function () {
    });

    server.addEventListener("shutdown", function () {
    });

    io.on('connection', function(socket){
        timer = false;
    });
}

