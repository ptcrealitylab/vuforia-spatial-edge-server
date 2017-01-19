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

    var names = {};

    var wedo = require('WeDo2');
    var server = require(__dirname + '/../../libraries/hardwareInterfaces');

    server.enableDeveloperUI(true);

    wedo.on('connected', function (uuid) {


        // todo If both wedos have the same name, give numbers
        // todo make nodes invisible on command

        if (wedo.wedo[uuid]) {
            names[uuid] = {p1 : "port1", p2 : "port2"};
            names[uuid].name = wedo.wedo[uuid].name;
            var thisWedo = wedo.wedo[uuid].name;
            server.activate(thisWedo);
            server.addNode(thisWedo, "port1", "node");
            server.addNode(thisWedo, "port2", "node");

          /* server.addReadListener(names[uuid].name, "port1", function (names,wedo,uuid,data){

               if(names[uuid].p1 === "motor") {
                   wedo.setMotor(server.map(data.value,0,1,-100,100), 1, uuid);
               }
           }.bind(this,names,wedo,uuid));

            server.addReadListener(names[uuid].name, "port2", function (names,wedo,uuid, data){

                if(names[uuid].p1 === "motor") {
                    wedo.setMotor(server.map(data.value,0,1,-100,100), 2, uuid);
                }
            }.bind(this, names,wedo,uuid))
*/
        }
    }.bind(this));

    wedo.on('disconnected', function (uuid) {
        if (names[uuid].name) {
            server.deactivate( names[uuid].name);
        }
    });

    wedo.on('distanceSensor', function (distance, port, uuid) {

        server.write(names[uuid].name, "port"+port, server.map(distance,0,512,0,1), "f");

    }.bind(this,names,wedo));

    wedo.on('tiltSensor', function (x,y, port, uuid ) {

        server.write(names[uuid].name, "port"+port, server.map(x,-100,100,0,1), "f");

    }.bind(this,names,wedo));


    wedo.on('port', function (port, connected, type, uuid) {

        if (wedo.wedo[uuid]) {
            names[uuid] = names[uuid] || {};

            var thisWedo = wedo.wedo[uuid].name;
            if (port === 1 && connected) {
                server.renameNode(thisWedo, names[uuid].p1, type + " 1");
                names[uuid].p1 = type + " 1";
            }
            if (port === 2 && connected) {
                server.renameNode(thisWedo, names[uuid].p2, type + " 2");
                names[uuid].p2 = type + " 2";
            }

            if (port === 1 && !connected) {
                server.renameNode(thisWedo, names[uuid].p1, "port1");
                names[uuid].p1 = "port1";
            }
            if (port === 2 && !connected) {
                server.renameNode(thisWedo, names[uuid].p2, "port2");
                names[uuid].p2 = "port2";
            }
        }
    });
}
