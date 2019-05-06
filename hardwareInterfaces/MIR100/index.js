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

const add = require('vectors/add')(2);
const sub = require('vectors/sub')(2);
const normalize = require('vectors/normalize')(2);
const dist = require('vectors/dist')(2);

const fetch = require('node-fetch');
const { WebSocketInterface } = require('./websocketInterface');

exports.enabled = true;

if (exports.enabled) {

    server.enableDeveloperUI(true);
    server.removeAllNodes('MIR', 'kineticAR'); // We remove all existing nodes from the Frame

    //const hostIP = "10.10.10.121";
    //const hostIP = "10.88.132.58";
    const hostIP = "192.168.12.20";
    const port = 9090;

    // MIR100 WEBSOCKET
    const websocket = new WebSocketInterface(hostIP, port);

    // MIR100 REST API INFO
    //const restAddress = "http://" + hostIP + "/api/v2.0.0";
    const restAddress = "http://mir.com/api/v2.0.0";
    const authorization = "Basic ZGlzdHJpYnV0b3I6NjJmMmYwZjFlZmYxMGQzMTUyYzk1ZjZmMDU5NjU3NmU0ODJiYjhlNDQ4MDY0MzNmNGNmOTI5NzkyODM0YjAxNA==";
    
    let mir_current_state = 3;  // MIR starts with state 3: READY!
    let moveToCoordinateGUID = "";
    /* MISSION STRUCTURE:
    {
        "mission_id":"aaaa",
        "parameters":[{"input_name":"positionX","value":0},
                    {"input_name":"positionY","value":0},
                    {"input_name":"orientation","value":0}]
    }
    */

    let pathData = [];          // List of paths with checkpoints
    
    let mirStatus = {};        // MIR STATUS
    let arStatus = {};          // AR STATUS
    
    let lastPositionAR = null;
    let lastDirectionAR = null;
    let currentPositionMIR = null;
    let currentOrientationMIR = null;

    //console.log("Request Missions...");
    requestMissions();

    console.log(websocket.currentYaw());

    //console.log("Adding Node KineticAR");
    server.addNode("MIR", "kineticAR", "kineticNode1", "storeData");     // Node for the data path. Request status listener
    server.addNode("MIR", "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode("MIR", "kineticAR", "kineticNode3", "storeData");     // Node for receiving AR status

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode1","requestMIRStatus",function (data){

        console.log("   -   -   -   Frame has requested MIR Status. Let's send it", data);

        if (data === true){

            restRequest('/status')
            .then(
                () => {
                    server.writePublicData("MIR", "kineticAR", "kineticNode1", "MIRStatus", mirStatus)
                });
        }
    });

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode2","pathData",function (data){

        // We go through array of paths. For now there is only 1
        data.forEach(framePath => {

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index == framePath.index){   // If this path exists on the server, proceed to check checkpoints
                    pathExists = true;

                    // Foreach checkpoint received from the frame
                    framePath.checkpoints.forEach(frameCheckpoint => {

                        let exists = false;
                        
                        // Check against each checkpoint stored on the server
                        serverPath.checkpoints.forEach(serverCheckpoint => {

                            if (serverCheckpoint.name == frameCheckpoint.name){
                                // Same checkpoint. Check if position has changed and update
                                exists = true;

                                if (serverCheckpoint.posX != frameCheckpoint.posX) serverCheckpoint.posX = frameCheckpoint.posX;
                                if (serverCheckpoint.posY != frameCheckpoint.posY) serverCheckpoint.posY = frameCheckpoint.posY;

                                server.moveNode("MIR", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX,frameCheckpoint.posY,0.3,[
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    frameCheckpoint.posX, frameCheckpoint.posY, 0, 1
                                ], true);
                                server.pushUpdatesToDevices("MIR");
                                
                            }
                        });

                        // If the checkpoint is not in the server, add it and add the node listener.
                        if (!exists){
                            serverPath.checkpoints.push(frameCheckpoint);

                            server.addNode("MIR", "kineticAR", frameCheckpoint.name, "node");

                            server.moveNode("MIR", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX,frameCheckpoint.posY,0.3,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                frameCheckpoint.posX, frameCheckpoint.posY, 0, 1
                            ], true);

                            server.pushUpdatesToDevices("MIR");
                            

                            console.log("Adding listener to node: ", frameCheckpoint.name);
                            // Add listener to node
                            server.addReadListener("MIR", "kineticAR", frameCheckpoint.name, function (data) {
                                console.log('HOLAAA');
                            });

                            
                        }

                    });

                }

            });

            if (!pathExists){   // If the path doesn't exist on the server, add it to the server path data

                pathData.push(framePath);

            }
            
        });

        console.log("Current PATH DATA in SERVER: ", pathData);

        /*
        for(var i = 0; i < data.path.length; i++) {
        
            let obj = data.path[i];

            const positionX_value = Number((parseFloat(obj.xcoord)).toFixed(2));
            const positionY_value = Number((parseFloat(obj.ycoord)).toFixed(2));
            const orientation_value = Number((parseFloat(obj.orientation)).toFixed(2));
        
            let dataObj = {
                "mission_id": moveToCoordinateGUID,
                "parameters":[{"input_name":"positionX","value": positionX_value},
                {"input_name":"positionY","value": positionY_value},
                {"input_name":"orientation","value": orientation_value}]
            };
            pathData.push(dataObj);
        }

        followPath();
        */

    });

    function nodeReadCallback(objectKey, frameKey, nodeKey, data, objects, nodeTypeModules){

        console.log('Value received in NODE');

        // here's a change in a node
        console.log(obj, checkpoint, node, data);

        // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint


        //computeMIRCoordinates(newCheckpoint);   // this new checkpoint should come from the node in data ??

        // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

    }
/*
    function angle(vector_2) {

		// computes the angle in radians with respect to the positive x-axis

		var angle = Math.atan2( vector_2[1], vector_2[0] );

        if ( angle < 0 ) angle += 2 * Math.PI;
        
		return angle;

	}
    
    function computeMIRCoordinates(newCheckpoint){

        let lastDirectionTo = [lastDirection['x'], lastDirection['z']];

        const groundPlaneScaleFactor = 1000; // ???

        let from = [ lastPositionAR['x'] / groundPlaneScaleFactor, lastPositionAR['z'] / groundPlaneScaleFactor];
        let to = [newCheckpoint.position.x / groundPlaneScaleFactor, newCheckpoint.position.z / groundPlaneScaleFactor];

        let newDirection = to;
        sub(newDirection, from);
        normalize(newDirection);

        let angleBetween = angle(lastDirectionTo) - angle(newDirection);  // angle between direction vectors

        // Normalize to range range (-π, π]
        if (angleBetween > Math.PI)        { angleBetween -= 2 * Math.PI; }
        else if (angleBetween <= -Math.PI) { angleBetween += 2 * Math.PI; }

        const newDirectionDeg = Math.radToDeg(angleBetween);          // Angle that the robot has to turn to go to next coordinate in deg
        const newDistance = dist(from, to);                            // Distance that the robot has to travel to get to the next point
        currentOrientationMIR = currentOrientationMIR + newDirectionDeg;    // Angle in the MIR Coordinate system

        currentPositionMIR.x += newDistance * Math.cos(Math.degToRad(currentOrientationMIR));
        currentPositionMIR.y += newDistance * Math.sin(Math.degToRad(currentOrientationMIR));

        // Normalize to range range (-180, 180]
        if (currentOrientationMIR > 180)        { currentOrientationMIR -= 360; }
        else if (currentOrientationMIR <= -180) { currentOrientationMIR += 360; }

        dataObj.path.push({
            "xcoord" : currentPositionMIR.x.toString(),
            "ycoord" : currentPositionMIR.y.toString(),
            "orientation" : currentOrientationMIR.toString(),
        });

    }
*/

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode3","ARstatus",function (data){
        
        console.log(data);
        arStatus = data;

        lastPositionAR = data.robotInitPosition;
        lastDirectionAR = data.robotInitDirection;

        console.log("LAST POSITION AR: ", lastPositionAR); // { x: -332.3420, y: 482.1173, z: 1749.54107 }
        console.log("LAST DIRECTION AR: ", lastDirectionAR); // { x: -0.84, y: -0.00424, z: -0.5303 }

    });

    function followPath(){
        function next(i) {
            if(i >= pathData.length) {
                return;
            }
         
            const dataObj = pathData[i];
            //console.log("   -   -   -   New mission: ", dataObj);
         
            newAddress = restAddress + "/mission_queue";
         
            postData(newAddress, dataObj)
            //.then(res => console.log(res)) // JSON-string from `response.json()` call
            .then(() => next(i+1))
            .catch(error => console.error(error));
         }
         
         next(0);
    }
    
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
            //console.log("   -   -   -   ROBOT NAME: " + data['robot_name']);

            mirStatus = data['position'];
            
            //console.log("   -   -   -   ROBOT POS: ", dataStatus);
            /*console.log("********************************");
            console.log("   -   -   -   mission_queue_id: " + data['mission_queue_id']);
            console.log("   -   -   -   mission_queue_url: " + data['mission_queue_url']);
            console.log("   -   -   -   mission_text: " + data['mission_text']);
            console.log("   -   -   -   mode_id: " + data['mode_id']);
            console.log("   -   -   -   state_id: " + data['state_id']);
            console.log("   -   -   -   state_text: " + data['state_text']);*/

            const state_id = parseInt(data['state_id']);

            switch(state_id){
                case 3:
                    if (mir_current_state != 3){
                        console.log("MIR CHANGED STATE TO READY!");

                        // HERE we should send a 0 to the checkpoint node
                        server.write("MIR", "kineticAR", "name_of_current_checkpointnode", 0);

                        // HERE we should send a 1 to the next checkpoint node
                        server.write("MIR", "kineticAR", "name_of_next_checkpointnode", 1);

                        mir_current_state = 3;
                    }
                    break;
                case 4:
                    // pause
                    break;
                case 5:
                    if (mir_current_state != 5){
                        console.log("MIR CHANGED STATE TO EXECUTING!");

                        mir_current_state = 5;
                    }
                    break;

                case 10:
                    // emergency stop
                    break;

                case 11:
                    // manual control
                    break;
                default:
                    // code block
            }

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

        //.then(response => response.json());   // parses JSON response into native Javascript objects 
        .then(response => response.text())      // convert to plain text
        //.then(text => console.log(text))      // then log it out
    }

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });


    // UPDATE FUNCTION

    function updateEvery(i, time) {
        setTimeout(() => {

            //console.log('Current YAW:', websocket.currentYaw());
            //console.log('Current Position:', websocket.currentRobotPosition);

            // We request status in a loop forever
            requestStatus();

            updateEvery(++i, time);
        }, time)
    }
    
    updateEvery(0, 100);
    
}