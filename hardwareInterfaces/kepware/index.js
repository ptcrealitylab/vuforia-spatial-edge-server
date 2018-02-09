/**
 * Created by Carsten on 12/06/15.
 * Modified by Peter Som de Cerff (PCS) on 12/21/15
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 *  PHILIPS HUE CONNECTOR
 *
 * This hardware interface can communicate with philips Hue lights. The config.json file specifies the connection information
 * for the lamps in your setup. A light in this config file has the following attributes:
 * {
 * "host":"localhost",                  // ip or hostname of the philips Hue bridge
 * "url":"/api/newdeveloper/lights/1",  // base path of the light on the bridge, replace newdeveloper with a valid username (see http://www.developers.meethue.com/documentation/getting-started)
 * "id":"Light1",                       // the name of the HybridObject
 * "port":"80"                          // port the hue bridge is listening on (80 on all bridges by default)
 *
 * }
 *
 * Some helpful resources on the Philips Hue API:
 * http://www.developers.meethue.com/documentation/getting-started
 * http://www.developers.meethue.com/documentation/lights-api
 *
 * TODO: Add some more functionality, i.e. change color or whatever the philips Hue API offers
 */
//Enable this hardware interface
exports.enabled = true;

if (exports.enabled) {

    var kepwareServerIP = "192.168.56.100";
    var kepwareServerName = "kepwareBox";
    var kepwareServerPort = "39320";
    var kepwareServerRequestInterval = 100;
    var kepwareInterfaces = {};



    var server = require(__dirname + '/../../libraries/hardwareInterfaces');
    var Client = require('node-rest-client').Client;
    var remoteDevice = new Client();

    server.enableDeveloperUI(true);

    var kepwareAddress = "http://" + kepwareServerIP + ":" + kepwareServerPort + "/iotgateway/";

    remoteDevice.registerMethod("browse", kepwareAddress + "browse", "GET");
    remoteDevice.registerMethod("read", kepwareAddress + "read", "GET");
    remoteDevice.registerMethod("write", kepwareAddress + "write", "POST");

    setup();

    function setup () {
        remoteDevice.get(kepwareAddress + "browse", function (data, res) {
            for (i = 0; i < data.browseResults.length; i++) {
                var thisID = data.browseResults[i].id;
                kepwareInterfaces[thisID] = new KepwareData();
                kepwareInterfaces[thisID].id = data.browseResults[i].id;
                kepwareInterfaces[thisID].name = thisID.substr(thisID.lastIndexOf('.') + 1);

                console.log(kepwareInterfaces[thisID].name);
                server.addNode(kepwareServerName, kepwareServerName,kepwareInterfaces[thisID].name, "node");
                setReadList(kepwareServerName, thisID, kepwareInterfaces[thisID].name, kepwareInterfaces);
            }



        });
    }

    function setReadList (object, node, name, kepwareInterfaces){

        server.addReadListener(object,object, name, function (data) {
            kepwareInterfaces[node].data.value = data.value;
            
            var args = {
                data: [{id:node, v :  kepwareInterfaces[node].data.value}],
                headers: { "Content-Type": "application/json" }
            };


            remoteDevice.post(kepwareAddress + "write", args, function (data, res) {
        });

    });
    }

    var interval = setInterval(start, kepwareServerRequestInterval);

        function start(){

            var argstring = "?";
            for (var key in kepwareInterfaces) {
                argstring += "ids="+ key +"&";
            }

            remoteDevice.get(kepwareAddress + "read"+argstring, function (data, res) {
                // parsed response body as js object

                for (i = 0; i < data.readResults.length; i++) {
                    var thisID = data.readResults[i].id;
                    kepwareInterfaces[thisID].data.s = data.readResults[i].s;
                    kepwareInterfaces[thisID].data.r = data.readResults[i].r;
                    kepwareInterfaces[thisID].data.v = data.readResults[i].v;
                    kepwareInterfaces[thisID].data.t = data.readResults[i].t;
                    if(typeof kepwareInterfaces[thisID].data.v === "boolean" ){
                        if(kepwareInterfaces[thisID].data.v)  {kepwareInterfaces[thisID].data.v = 1;}
                        else  {kepwareInterfaces[thisID].data.v = 0;};
                    }
                    if(isNaN(kepwareInterfaces[thisID].data.v)){
                        console.log( kepwareInterfaces[thisID].data.v);
                        kepwareInterfaces[thisID].data.v = 0;
                    }
                    if(kepwareInterfaces[thisID].data.v > kepwareInterfaces[thisID].data.max) {
                        kepwareInterfaces[thisID].data.max = kepwareInterfaces[thisID].data.v;
                    }
                    if(kepwareInterfaces[thisID].data.v < kepwareInterfaces[thisID].data.min) {
                        kepwareInterfaces[thisID].data.min = kepwareInterfaces[thisID].data.v;
                    }

                    if( kepwareInterfaces[thisID].data.v !== 0) {
                        kepwareInterfaces[thisID].data.value = Math.round(server.map(kepwareInterfaces[thisID].data.v, kepwareInterfaces[thisID].data.min, kepwareInterfaces[thisID].data.max, 0, 1) * 1000) / 1000;
                    } else {
                        kepwareInterfaces[thisID].data.value= 0;
                    }

                    if(kepwareInterfaces[thisID].name &&  (kepwareInterfaces[thisID].dataOld.value !== kepwareInterfaces[thisID].data.value)){
                        server.write(kepwareServerName, kepwareServerName,
                            kepwareInterfaces[thisID].name,
                            kepwareInterfaces[thisID].data.value, "f", "",
                            kepwareInterfaces[thisID].data.min,
                            kepwareInterfaces[thisID].data.max)
                    }

                    kepwareInterfaces[thisID].dataOld.value = kepwareInterfaces[thisID].data.value;

                }

               // console.log(kepwareInterfaces);
                // raw response

            });




        }


    /**
    * CONSTRUCTORS
    ***/

    function KepwareData() {
        this.name = "";
        this.id = "";
        this.data = {
            "id": "",
            "s": true,
            "r": "",
            "v": 0,
            "t": 0,
            "min": 10000,
            "max":0,
            "value":0
        };
        this.dataOld = {
            "id": "",
            "s": true,
            "r": "",
            "v": 0,
            "t": 0,
            "min": 10000,
            "max":0,
            "value":0
        };
    };

}



