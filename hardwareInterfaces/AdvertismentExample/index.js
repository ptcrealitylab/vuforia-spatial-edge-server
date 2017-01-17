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
exports.enabled = false;

if (exports.enabled) {

    var server = require(__dirname + '/../../libraries/hardwareInterfaces');
    var wedo2 = require("wedo2");

    server.enableDeveloperUI(true);

    server.addNode("obj47", "light1", "node");
    server.addNode("obj47", "light2", "node");

    server.addNode("obj47", "light3", "node");
    server.addNode("obj47", "switch", "node");


    server.addNode("obj45", "one", "node");
    server.addNode("obj45", "two", "node");

    var _serialport = require("serialport");

    const serialBaudRate = 9600; // baud rate for connection to arudino
    const serialSource = "/dev/cu.usbmodem1411"; // this is pointing to the arduino

    //initialisation of the socket connection
    var SerialP = _serialport.SerialPort; // localize object constructor
    var serialPort = new SerialP(serialSource, {
        parser: _serialport.parsers.readline("\r\n"),
        baudrate: serialBaudRate
    }, false);

    serialPort.on('error', function (err) {
        console.error("Serial port error", err);
    });

    serialPort.open();
    serialPort.on("open", function () {

        serialPort.on('data', function (data) {

            if(data === "on"){
               server.write("obj47", "switch", 1, "f");
            }
            else if(data === "off"){
              server.write("obj47", "switch", 0, "f");
            }
            else if(data === "2") {
                server.advertiseConnection("obj47","light1");
                console.log("advertise light1");
            }
            else if(data === "1") {
                server.advertiseConnection("obj47","light2");
                console.log("advertise light2");
            }
            else if(data === "0") {
                server.advertiseConnection("obj47","light3");
                console.log("advertise light3");
            }
            else if(data === "3") {
                server.advertiseConnection("obj47", "switch");
                console.log("advertise switch");
            }


            console.log("this: "+data);

        });
    });


/*
    setInterval(function () {

        serialPort.write("0\n");
        setTimeout(function() {
            serialPort.write("1\n");
        }, 1000);


    }, 3000);
*/



    server.addReadListener("obj47", "light1", function (data) {
        if(data.value >0){
            serialPort.write("1\n");
        } else {
            serialPort.write("0\n");
        }
    });
    server.addReadListener("obj47", "light2", function (data) {
        if(data.value >0){
            serialPort.write("3\n");
        } else {
            serialPort.write("2\n");
        }
    });
    server.addReadListener("obj47", "light3", function (data) {
        if(data.value >0){
            serialPort.write("5\n");
        } else {
            serialPort.write("4\n");
        }
    });



    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });

    setInterval(function () {

        server.write("obj45", "one", Math.random(), "f");

    }, 300);

    /*
   setInterval(function () {

        server.advertiseConnection("obj45","one");

       setTimeout(function() {
           server.advertiseConnection("obj47", "hans");
       }, 4000);

    }, 8000);*/

}
