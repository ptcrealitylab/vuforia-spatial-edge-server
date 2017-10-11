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

    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
    });
    app.get('/marker.jpg', function(req, res){
        res.sendFile(__dirname + '/marker.jpg');
    });
    app.get('/index.css', function(req, res){
        res.sendFile(__dirname + '/index.css');
    });


    http.listen(3030, function(){
        console.log('listening on *:3030');
    });

    // var counter = 0;
    // var timer = false;
    server.enableDeveloperUI(true);

    var nodes = ["topLeft", "topRight", "bottomLeft"];

    nodes.forEach(function(nodeName) {

        server.addNode("dashboard", nodeName, "node");

        server.addReadListener("dashboard", nodeName, function (data) {
            io.emit("dashboard", {nodeName: nodeName, action: "update", data: data});
        });

        server.addConnectionListener("dashboard", nodeName, function(data) {
            io.emit("dashboard", {nodeName: nodeName, action: "connect", data: data});
        })

    });

    // server.addNode("dashboard", "topLeft", "node");
    // server.addNode("dashboard", "topRight", "node");
    // server.addNode("dashboard", "bottomLeft", "node");
    //
    // server.addReadListener("dashboard", "topLeft", function (data) {
    //     io.emit("dashboard", {dashboard: "update"});
    // });

    // server.addReadListener("timer", "start", function (data) {
    //     if (data.value > 0.5) {
    //         if (!timer) {
    //             io.emit('timer', {timer: "start"});
    //             timer = true;
    //             server.write('timer', 'running', 1.0, 'f');
    //         }
    //     }
    // });
    //
    // server.addReadListener("timer", "reset", function (data) {
    //     if (data.value > 0.5) {
    //         io.emit('timer', {timer: "reset"});
    //     }
    // });
    //
    // server.addReadListener("timer", "stop", function (data) {
    //     console.log(data.value);
    //     if (data.value > 0.5) {
    //         if (timer) {
    //             io.emit('timer', {timer: "stop"});
    //             timer = false;
    //             server.write('timer', 'running', 0.0, 'f');
    //         }
    //     }
    // });

    server.addEventListener("reset", function () {
    });

    server.addEventListener("shutdown", function () {
    });

    io.on('connection', function(socket){
        // timer = false;
    });
}

