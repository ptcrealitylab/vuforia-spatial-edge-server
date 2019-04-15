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
 * Created by Anna Fuste on 03/20/19.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
var server = require(__dirname + '/../../libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = true;

if (exports.enabled) {

    server.enableDeveloperUI(true);

    const fetch = require('node-fetch');

    // MIR100 REST API INFO
    const restAddress = "http://mir.com/api/v2.0.0";
    const authorization = "Basic ZGlzdHJpYnV0b3I6NjJmMmYwZjFlZmYxMGQzMTUyYzk1ZjZmMDU5NjU3NmU0ODJiYjhlNDQ4MDY0MzNmNGNmOTI5NzkyODM0YjAxNA==";
    
    let moveToCoordinateGUID = "";

    let dataStatus = {};

    this.missionMoveToGUID = "";

    //console.log("Request Status...");
    requestStatus();

    //console.log("Request Missions...");
    requestMissions();

    //console.log("Adding Node KineticAR");
    server.addNode("MIR", "kineticAR", "kineticNode1", "storeData");     // Node for the data path
    server.addNode("MIR", "kineticAR", "kineticNode2", "storeData");     // Node for the data path

    //server.writePublicData("MIR", "kineticAR", "kineticNode", "MIRStatus", "hola");

    
    server.addPublicDataListener("MIR", "kineticAR", "kineticNode1","requestMIRStatus",function (data){

        console.log("   -   -   -   Frame has requested MIR Status. Let's send it", data);

        if (data === true){

            restRequest('/status')
            .then(
                () => {
                    server.writePublicData("MIR", "kineticAR", "kineticNode2", "MIRStatus", dataStatus)
                });
        }
        
    });

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode2","pathData",function (data){
        
        console.log("   -   -   -   Play path now: ", data);

        // Time to play path
        /*{
            "mission_id":"aaaa",
            "parameters":[{"input_name":"positionX","value":0},
                        {"input_name":"positionY","value":0},
                        {"input_name":"orientation","value":0}]
        }*/

        const dataObjs = [];
        for(var i = 0; i < data.path.length; i++) {
        
            let obj = data.path[i];

            const positionX_value = Number((parseFloat(obj.xcoord)).toFixed(2));
            const positionY_value = Number((parseFloat(obj.ycoord)).toFixed(2));
            const orientation_value = Number((parseFloat(obj.orientation)).toFixed(2));
        
            let dataObj = {
                "mission_id":moveToCoordinateGUID,
                "parameters":[{"input_name":"positionX","value": positionX_value},
                {"input_name":"positionY","value": positionY_value},
                {"input_name":"orientation","value": orientation_value}]
            };
        
            dataObjs.push(dataObj);
        
        }
        
        function next(i) {
           if(i >= dataObjs.length) {
               return;
           }
        
           const dataObj = dataObjs[i];
           //console.log("   -   -   -   New mission: ", dataObj);
        
           newAddress = restAddress + "/mission_queue";
        
        
           postData(newAddress, dataObj)
           //.then(res => console.log(res)) // JSON-string from `response.json()` call
           .then(() => next(i+1))
           .catch(error => console.error(error));
        }
        
        next(0);


    });
    
    function requestStatus(){ restRequest('/status'); }
    function requestMissions(){ restRequest('/missions'); }

    // Request Information to the MIR100
    function restRequest(endpoint){

        newAddress = restAddress + endpoint;

        //console.log("   -   -   -   Request: " + newAddress);
        if (server.getDebug()) console.log("   -   -   -   Request: " + newAddress);

        return getData(newAddress)
        .then(data => processData(data)) // JSON-string from `response.json()` call
        .catch(error => console.error(error));
        
    }

    function processData(data){

        //console.log("   -   -   -   ", data);

        // There has to be a better way of doing this

        if (data['robot_name'] === undefined){ // the robot name appears only when we ask for status
            
            //console.log("   -   -   -   MISSION", data[0]);

            for(var i = 0; i < data.length; i++) {
                var obj = data[i];

                if (obj.name === 'Move To Coordinate'){
                    moveToCoordinateGUID = obj.guid;
                    //console.log("   -   -   -   ", moveToCoordinateGUID);
                }   
            
                //console.log(obj.name);
            }
            
        } else {
            // status
            console.log("   -   -   -   ROBOT NAME: " + data['robot_name']);

            dataStatus = data['position'];
            
            console.log("   -   -   -   ROBOT POS: ", dataStatus);
        }
        
        
    }

    // Example GET method implementation:
    function getData(url = '') {
        
        // Default options are marked with *

        //console.log('   -   -   -   GET: ' + url);

        return fetch(url, {
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                "authorization": authorization,
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
        })
        .then(response => response.json()); // parses JSON response into native Javascript objects 
    }


    // Example POST method implementation:
    function postData(url = '', data = {}) {

        //console.log('   -   -   -   POST: ' + url + " | Body: " + JSON.stringify(data));

        // Default options are marked with *
        return fetch(url, {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                "authorization": authorization,
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
            body: JSON.stringify(data), // body data type must match "Content-Type" header
        })
        //.then(response => response.json()); // parses JSON response into native Javascript objects 
        .then(response => response.text())          // convert to plain text
        //.then(text => console.log(text))  // then log it out
    }

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });
    
}