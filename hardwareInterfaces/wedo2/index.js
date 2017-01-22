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
    var Wedo = require('WeDo2');
    var wedo = new Wedo("lego");

    var server = require(__dirname + '/../../libraries/hardwareInterfaces');

    server.enableDeveloperUI(true);

    wedo.on('connected', function (uuid) {


        // todo If both wedos have the same name, give numbers
        // todo make nodes invisible on command

        if (wedo.wedo[uuid]) {
            names[uuid] = {px1 : "port 1", px2 : "port 2",py1 : "none 1", py2 : "none 2"};
            names[uuid].name = wedo.wedo[uuid].name;
            if(wedo.wedo[uuid].name) {
                var thisWedo = wedo.wedo[uuid].name;

                server.addNode(thisWedo, "port 1", "node");
                server.addNode(thisWedo, "none 1", "node");

                server.addNode(thisWedo, "port 2", "node");
                server.addNode(thisWedo, "none 2", "node");

                server.addNode(thisWedo, "button", "node");

                server.renameNode(names[uuid].name, "port 1", "x1");
                server.renameNode(names[uuid].name, "none 1", "y1");
                server.renameNode(names[uuid].name, "port 2", "x2");
                server.renameNode(names[uuid].name, "none 2", "y2");

                server.activate(thisWedo);

                server.addReadListener(names[uuid].name, "port 1", function (names, wedo, uuid, data) {
                    // console.log(names[uuid].name,data);
                    if (names[uuid].px1 === "motor 1") {
                        wedo.setMotor(server.map(data.value, 0, 1, -100, 100), 1, uuid);
                    }
                }.bind(this, names, wedo, uuid));

                server.addReadListener(names[uuid].name, "port 2", function (names, wedo, uuid, data) {
                    //  console.log(names[uuid].name,data);
                    if (names[uuid].px2 === "motor 2") {
                        //  console.log(server.map(data.value,0,1,-100,100));
                        wedo.setMotor(server.map(data.value, 0, 1, -100, 100), 2, uuid);
                    }

                }.bind(this, names, wedo, uuid));

                /*  server.addReadListener(names[uuid].name, "port2", function (names,wedo,uuid, data){

                 if(names[uuid].p1 === "motor") {
                 wedo.setMotor(server.map(data.value,0,1,-100,100), 2, uuid);
                 }
                 }.bind(this, names,wedo,uuid))
                 */

                wedo.on('button', function (button, uuid) {
                    if (uuid in names) {
                        server.write(names[uuid].name, "button", button, "f");
                    }

                });

            }




        }
    }.bind(this));



    wedo.on('disconnected', function (uuid) {

        // remove all listeners when disconnected

        if (names[uuid].name) {
            server.deactivate( names[uuid].name);

                server.renameNode(names[uuid].name, "port 1", " ");
                names[uuid].px1 = "port 1";
                server.renameNode(names[uuid].name, "port 2", " ");
                names[uuid].px2 = "port 2";

            server.renameNode(names[uuid].name, "none 1", " ");
            names[uuid].py1 = "none 1";
            server.renameNode(names[uuid].name, "none 2", " ");
            names[uuid].py2 = "none 2";

            server.removeReadListeners(names[uuid].name);

            resetNode(uuid,1);
            resetNode(uuid,2);
        }

    });


    wedo.on('distanceSensor', function (distance, port, uuid) {
       if(uuid in names) {
           server.write(names[uuid].name, "port "+port, server.map(distance,0,10,0,1), "f");
       }
    });

    wedo.on('tiltSensor', function (x,y, port, uuid) {
        if(uuid in names) {
            Math.round( 20.49);
            server.write(names[uuid].name, "port "+port,  Math.round(server.map(x,-45,45,0,1)*100)/100, "f");
            server.write(names[uuid].name, "none "+port,   Math.round(server.map(y,-45,45,0,1)*100)/100, "f");
        }
    });


  wedo.on('port', function (port, connected, type, uuid) {

        if (wedo.wedo[uuid]) {
            names[uuid] = names[uuid] || {};

            var x = "port", y = " ";

            if(type==="distanceSensor"){
                x = "distance";
            }
            if(type==="motor"){
                x = "motor";
            }
            if(type==="tiltSensor"){
                x = "x";
                y = "y";
            }

            var thisWedo = wedo.wedo[uuid].name;
            if (port === 1 && connected) {
                server.renameNode(thisWedo, "port 1", x);
                names[uuid].px1 = x + " 1";
                if(y === " "){
                    server.renameNode(thisWedo, "none 1"," ");
                } else {
                    server.renameNode(thisWedo, "none 1", y);
                }
                names[uuid].py1 = y + " 1";
            }
            if (port === 2 && connected) {
                server.renameNode(thisWedo, "port 2", x);
                names[uuid].px2 = x + " 2";
                if(y === " ") {
                    server.renameNode(thisWedo, "none 2"," ");
                } else {
                    server.renameNode(thisWedo, "none 2", y);
                }
                names[uuid].py2 = y + " 2";
            }

            if (port === 1 && !connected) {
                server.renameNode(thisWedo, "port 1", " ");
                names[uuid].px1 = "port 1";
                server.renameNode(thisWedo, "none 1", " ");
                names[uuid].py1 = "none 1";
                resetNode(uuid,1);
            }
            if (port === 2 && !connected) {
                server.renameNode(thisWedo, "port 2", " ");
                names[uuid].px2 = "port 2";
                server.renameNode(thisWedo, "none 2", " ");
                names[uuid].py2 = "none 2";
                resetNode(uuid,2);
            }

        }
    });
}


function resetNode (uuid, port){
    server.write(names[uuid].name, "port "+port, 0, "f");
    server.write(names[uuid].name, "none "+port, 0, "f");

}