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
 * "id":"Light1",                       // the name of the RealityInterface
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
exports.enabled = false;

if (exports.enabled) {

    kepware1 = new Kepware("192.168.56.100", "kepwareBox", "39320", 100);
   kepware1.setup();
/*
  var kepware2 = new Kepware("192.168.56.2", "kepwareBox2", "39320", 100);
     kepware2.setup();
*/


    function Kepware (kepwareServerIP, kepwareServerName, kepwareServerPort, kepwareServerRequestInterval){
        this.KepwareData = function() {
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
        this.kepwareInterfaces ={};
        this.server = require(__dirname + '/../../libraries/hardwareInterfaces');
        this.Client = require('node-rest-client').Client;
        this.remoteDevice = new this.Client();
        this.server.enableDeveloperUI(true);
        this.kepwareAddress = "http://" + kepwareServerIP + ":" + kepwareServerPort + "/iotgateway/";
        this.setup = function () {
            this.thisID = {};
            this.remoteDevice.get(this.kepwareAddress + "browse", function (data, res) {
                for (i = 0; i < data.browseResults.length; i++) {
                    this.thisID = data.browseResults[i].id;
                    this.kepwareInterfaces[this.thisID] = new this.KepwareData();
                    this.kepwareInterfaces[this.thisID].id = data.browseResults[i].id;
                    this.kepwareInterfaces[this.thisID].name = this.thisID.substr(this.thisID.lastIndexOf('.') + 1);

                    console.log(kepwareServerName +"_"+ this.kepwareInterfaces[this.thisID].name);
                    this.server.addNode(kepwareServerName, kepwareServerName+"1",this.kepwareInterfaces[this.thisID].name, "node");
                    this.setReadList(kepwareServerName, kepwareServerName+"1",this.thisID, this.kepwareInterfaces[this.thisID].name, this.kepwareInterfaces);
                }
                this.interval = setInterval(this.start, kepwareServerRequestInterval);



            }.bind(this)).on('error', function (err) {
                this.error();
            }.bind(this));
        }.bind(this);

       this.setReadList = function(object, frame, node, name, kepwareInterfaces){

            this.server.addReadListener(object,frame, name, function (data) {
                console.log(object);
                kepwareInterfaces[node].data.value = data.value;

                var args = {
                    data: [{id:node, v :  kepwareInterfaces[node].data.value}],
                    headers: { "Content-Type": "application/json" }
                };


                this.remoteDevice.post(this.kepwareAddress + "write", args, function (data, res) {
                }).on('error', function (err) {
                    this.error();
                }.bind(this));

            }.bind(this));
        }.bind(this);



        this.start = function (){

            var argstring = "?";
            for (var key in this.kepwareInterfaces) {
                argstring += "ids="+ key +"&";
            }

            this.remoteDevice.get(this.kepwareAddress + "read"+argstring, function (data, res) {
                // parsed response body as js object

                for (i = 0; i < data.readResults.length; i++) {
                    var thisID = data.readResults[i].id;
                    this.kepwareInterfaces[thisID].data.s = data.readResults[i].s;
                    this.kepwareInterfaces[thisID].data.r = data.readResults[i].r;
                    this.kepwareInterfaces[thisID].data.v = data.readResults[i].v;
                    this.kepwareInterfaces[thisID].data.t = data.readResults[i].t;
                    if(typeof this.kepwareInterfaces[thisID].data.v === "boolean" ){
                        if(this.kepwareInterfaces[thisID].data.v)  {this.kepwareInterfaces[thisID].data.v = 1;}
                        else  {this.kepwareInterfaces[thisID].data.v = 0;};
                    }
                    if(isNaN(this.kepwareInterfaces[thisID].data.v)){
                        console.log( this.kepwareInterfaces[thisID].data.v);
                        this.kepwareInterfaces[thisID].data.v = 0;
                    }
                    if(this.kepwareInterfaces[thisID].data.v > this.kepwareInterfaces[thisID].data.max) {
                        this.kepwareInterfaces[thisID].data.max = this.kepwareInterfaces[thisID].data.v;
                    }
                    if(this.kepwareInterfaces[thisID].data.v < this.kepwareInterfaces[thisID].data.min) {
                        this.kepwareInterfaces[thisID].data.min = this.kepwareInterfaces[thisID].data.v;
                    }

                    if( this.kepwareInterfaces[thisID].data.v !== 0) {
                        this.kepwareInterfaces[thisID].data.value = Math.round(this.server.map(this.kepwareInterfaces[thisID].data.v, this.kepwareInterfaces[thisID].data.min, this.kepwareInterfaces[thisID].data.max, 0, 1) * 1000) / 1000;
                    } else {
                        this.kepwareInterfaces[thisID].data.value= 0;
                    }

                    if(this.kepwareInterfaces[thisID].name &&  (this.kepwareInterfaces[thisID].dataOld.value !== this.kepwareInterfaces[thisID].data.value)){


                        this.server.write(kepwareServerName, kepwareServerName+"1",
                            this.kepwareInterfaces[thisID].name,
                            this.kepwareInterfaces[thisID].data.value, "f", this.kepwareInterfaces[thisID].name,
                            this.kepwareInterfaces[thisID].data.min,
                            this.kepwareInterfaces[thisID].data.max)
                    }

                    this.kepwareInterfaces[thisID].dataOld.value = this.kepwareInterfaces[thisID].data.value;
                }
            }.bind(this)).on('error', function (err) {
                this.error();
            }.bind(this));
        }.bind(this);
        this.error = function() {
            console.log("cant find kepware server: \033[33m"+ kepwareServerName +"\033[0m with the IP: \033[33m"+ kepwareServerIP+"\033[0m");
        }
    }
}