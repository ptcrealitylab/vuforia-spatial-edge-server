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
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
exports.enabled = false;

if (exports.enabled) {
    var _ = require('lodash');
    var serialport = require("serialport");
    var server = require(__dirname + '/../../libraries/hardwareInterfaces');


    const serialBaudRate = 115200; // baud rate for connection to arudino

    // change this to what ever is your Arudino Serial Port

    const serialSource = "/dev/cu.usbmodem141141"; // this is pointing to the arduino

    function ArduinoIndex() {
        this.objName = null;
        this.ioName = null;
        this.index = null;
    }

    var ArduinoLookup = {};
    var ArduinoLookupByIndex = {};
    var FullLookup = {};
    var serialPortOpen = false;

    //initialisation of the socket connection
   /* var SerialP = serialport.SerialPort; // localize object constructor
    var serialPort = new SerialP(serialSource, {
        parser: serialport.parsers.readline("\n"),
        baudrate: serialBaudRate
    }, false);
    */
    const SerialPort = require('serialport');
    const Readline = SerialPort.parsers.Readline;

    var serialPort;

    var _this = this;

    SerialPort.list().then(function(ports) {
        for(var i = 0; i < ports.length; i++){
            if(ports[i].manufacturer){
                 if(ports[i].manufacturer.includes("Arduino")) {
                     serialPort = new SerialPort(ports[i].comName, {
                         baudRate: 19200
                     });
                     serialPort.on('error', function (err) {
                         console.error("Serial port error", err);
                     });
                     serialServer(serialPort);
                     break;
                }
            }
        }
    }).catch(function (err) {
        // return err;  // code doesn't come here
    });

    function serialServer(serialPort) {

        const parser = serialPort.pipe(new Readline({ delimiter: '\n' }));
        parser.on('data', function (data){
            // get a buffer of data from the serial port
            // console.log(data,"test");
        });
        if (server.getDebug()) console.log("opneserial");
       // serialPort.open();

        serialPort.on('open', function () {

            if (server.getDebug()) console.log('Serial port opened');
            serialPortOpen = true;
            var dataSwitch = 0;
            var pos = null;
            var objID = null;
            var obj = null;
            var object = null;
            var arrayID = null;
            var valueMode = "";
            var value = null;
            var thisName = "";
            var thisPlugin = "default";
            var amount = 0;
            //var okCounter = 0;

        parser.on('data', function (data) {
           // console.log(data.toString());
               // console.log(data);
                switch (dataSwitch) {
                    case 0:
                        if (data === "f") {
                            //if (server.getClear()) {
                            valueMode = "f";
                            dataSwitch = 1;
                            //}
                        }
                        else if (data === "d") {
                            //if (server.getClear()) {
                            valueMode = "d";
                            dataSwitch = 1;
                            //}
                        }
                        else if (data === "p") { // positive step value
                            //if (server.getClear()) {
                            valueMode = "p";
                            dataSwitch = 1;
                            //}
                        }
                        else if (data === "n") {// negative step value
                            //if (server.getClear()) {
                            valueMode = "n";
                            dataSwitch = 1;
                            //}
                        }
                        else if (data === "a") {
                            dataSwitch = 20;
                        }
                        else if (data === "okbird") {

                            serialPort.write(" \n");
                            serialPort.write("okbird\n");
                            if (server.getDebug()) console.log("ok as respond");
                            dataSwitch = 0;
                        }
                        else if (data === "def") {
                            if (server.getDebug()) console.log("developer");
                            dataSwitch = 40;
                        }
                        else if (data === "c") {
                            if (server.getDebug()) console.log("clear");
                            dataSwitch = 50;

                        }
                        break;
                    case 1:
                        arrayID = parseInt(data, 10);
                        dataSwitch = 2;
                        break;
                    case 2:
                        value = parseFloat(data);

                        if (ArduinoLookupByIndex.hasOwnProperty(arrayID))
                            server.write(ArduinoLookupByIndex[arrayID].objName, "arduino01", ArduinoLookupByIndex[arrayID].ioName, value, valueMode);


                        dataSwitch = 0;
                        break;
                    case 20:
                        object = data.split("\t");
                        dataSwitch = 21;
                        break;
                    case 21:
                        arrayID = parseInt(data, 10);
                        dataSwitch = 23;
                        break;
                    case 23:
                        thisPlugin = data;
                        obj = object[1];
                        pos = object[0];

                        if (server.getDebug()) console.log("Add Arduino Yun");

                        ArduinoLookup[obj + pos] = new ArduinoIndex();
                        ArduinoLookup[obj + pos].objName = obj;
                        ArduinoLookup[obj + pos].ioName = pos;
                        ArduinoLookup[obj + pos].index = arrayID;

                        ArduinoLookupByIndex[arrayID] = new ArduinoIndex();
                        ArduinoLookupByIndex[arrayID].objName = obj;
                        ArduinoLookupByIndex[arrayID].ioName = pos;
                        ArduinoLookupByIndex[arrayID].index = arrayID;

                        var thisObjectID = server.getObjectIdFromObjectName(obj);


                        if (!FullLookup.hasOwnProperty(thisObjectID)) {
                            FullLookup[thisObjectID] = {};
                        }
                        server.addNode(obj, "arduino01", pos, "node");

                        if(thisObjectID) {
                            FullLookup[thisObjectID][thisObjectID+pos] = arrayID;

                           // console.log("dddddsasdasdasdasdasdasdasdasdasdsd ",obj, pos);
                            server.addReadListener(obj, "arduino01", pos, function (obj,pos,node,data) {
                             //   console.log(obj,pos,data);
                              serialSender(serialPort, obj, pos, data.value, "f");
                            }.bind(data,thisObjectID,thisObjectID+pos,"node"));

                        }





                        dataSwitch = 0;
                        break;
                    case 40:
                        if (parseInt(data, 10) === 1) {
                            // server.developerOn();
                            server.enableDeveloperUI(true);
                        }
                        dataSwitch = 0;
                        break;
                    case 50:
                        amount = parseInt(data, 10);
                        //server.clearIO("arduinoYun");
                        dataSwitch = 0;
                        break;
                }

            });

            // this is for when the server is started...
            serialPort.write(" \n");
            serialPort.write("okbird\n");

        });
        if (server.getDebug()) console.log("no problem");
    }


    function serialSender(serialPort, objName, ioName, value, mode) {
       // console.log("check index: ", objName);

       // console.log(FullLookup);
        if (FullLookup.hasOwnProperty(objName)) {

            if (FullLookup[objName].hasOwnProperty(ioName)) {

                var index = FullLookup[objName][ioName];

               // console.log("check index: ", index);
                var yunModes = ["f", "d", "p", "n"];
                if (_.includes(yunModes, mode)) {
                    serialPort.write(mode + "\n");
                } else {
                    serialPort.write("f\n");
                }
                serialPort.write(index + "\n");
                serialPort.write(value + "\n");
            }
        }
    }

    server.addEventListener("reset", function () {
        if (serialPortOpen) {
            serialPort.write(" \n");
            serialPort.write("okbird\n");
        }
    });
}