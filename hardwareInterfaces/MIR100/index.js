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

/*
const add = require('vectors/add')(2);
const sub = require('vectors/sub')(2);
const normalize = require('vectors/normalize')(2);
const dist = require('vectors/dist')(2);
 */

const fetch = require('node-fetch');
const { WebSocketInterface } = require('./websocketInterface');

exports.enabled = true;

if (exports.enabled) {

    server.enableDeveloperUI(true);
    server.removeAllNodes('MIR', 'kineticAR'); // We remove all existing nodes from the Frame

    let enableMIRConnection = true;
    console.log('\nMIR Connection: ', enableMIRConnection,'\n');

    //const hostIP = "10.10.10.121";
    //const hostIP = "10.88.132.58";
    //const hostIP = "192.168.12.20";

    //const hostIP = "192.168.1.103";         // realityHQ-5G
    //const hostIP = "10.10.10.107";        // feederStuttgart-5G
    const hostIP = "10.10.10.111";        // reality demo

    const port = 9090;

    // MIR100 WEBSOCKET
    let websocket = null;
    if (enableMIRConnection) websocket = new WebSocketInterface(hostIP, port);

    // MIR100 REST API INFO
    const restAddress = "http://" + hostIP + "/api/v2.0.0";
    //const restAddress = "http://mir.com/api/v2.0.0";
    const authorization = "Basic ZGlzdHJpYnV0b3I6NjJmMmYwZjFlZmYxMGQzMTUyYzk1ZjZmMDU5NjU3NmU0ODJiYjhlNDQ4MDY0MzNmNGNmOTI5NzkyODM0YjAxNA==";

    /* MISSION STRUCTURE:
    {
        "mission_id":"guid_number_here",
        "parameters":[{"input_name":"positionX","value":0},
                    {"input_name":"positionY","value":0},
                    {"input_name":"orientation","value":0}]
    }
    */

    let mir_current_state = 3;              // MIR starts with state 3: READY! ??
    let mir_mission_interrupted = false;
    let moveToCoordinateGUID = "";          // Mission GUID needed for REST calls
    let inMotion = false;                   // When robot is moving
    let mirStatus = {};                     // MIR STATUS
    let arStatus = {};                      // AR STATUS

    let pathData = [];                      // List of paths with checkpoints
    let activeCheckpointName = null;        // Current active checkpoint

    const groundPlaneScaleFactor = 1000;    // In mm
    let lastPositionAR = {x:0, y:0};        // Variable to keep the last position of the robot in AR
    let lastDirectionAR = {x:0, y:0};       // Variable to keep the last direction of the robot in AR
    let currentPositionMIR = {x:0, y:0};    // Current position of the robot in her MIR map
    let currentOrientationMIR = 0;          // Current orientation of the robot in his MIR map
    let initOrientationMIR = 0;
    let initOrientationAR = 0;

    if (enableMIRConnection) requestMissions();

    server.addNode("MIR", "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode("MIR", "kineticAR", "kineticNode3", "storeData");     // Node for receiving AR status
    server.addNode("MIR", "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path


    server.addPublicDataListener("MIR", "kineticAR", "kineticNode3","ARstatus",function (data){

        //console.log(data);
        arStatus = data;

        lastPositionAR.x = data.robotInitPosition['x']/groundPlaneScaleFactor;
        lastPositionAR.y = data.robotInitPosition['z']/groundPlaneScaleFactor;

        lastDirectionAR.x = data.robotInitDirection['x'];
        lastDirectionAR.y = data.robotInitDirection['z'];

        //console.log("LAST POSITION AR: ", lastPositionAR);              //       { x: -332.3420, y: 482.1173, z: 1749.54107 }
        //console.log("LAST DIRECTION AR: ", lastDirectionAR);            //       { x: -0.84, y: -0.00424 }

        initOrientationMIR = mirStatus['orientation'];
        initOrientationAR =  (-1) * signed_angle([1,0], [lastDirectionAR.x, lastDirectionAR.y]) * 180 / Math.PI;

        //console.log('initOrientationAR', initOrientationAR);
    });

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode4","ClearPath",function (data) {

        console.log("   -   -   -   Frame has requested to clear path: ", data);

        pathData.forEach(path => {
            path.checkpoints.forEach(checkpoint => {
                server.removeNode("MIR", "kineticAR", checkpoint.name);
                server.pushUpdatesToDevices("MIR");
            });
            path.checkpoints = [];
        });

        inMotion = false;
        activeCheckpointName = null;

    });

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode2","pathData",function (data){

        // We go through array of paths. For now there is only 1
        data.forEach(framePath => {

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index === framePath.index){   // If this path exists on the server, proceed to check checkpoints
                    pathExists = true;

                    // Foreach checkpoint received from the frame
                    framePath.checkpoints.forEach(frameCheckpoint => {

                        let exists = false;
                        
                        // Check against each checkpoint stored on the server
                        serverPath.checkpoints.forEach(serverCheckpoint => {

                            if (serverCheckpoint.name === frameCheckpoint.name){
                                // Same checkpoint. Check if position has changed and update
                                exists = true;

                                if (serverCheckpoint.posX !== frameCheckpoint.posX) serverCheckpoint.posX = frameCheckpoint.posX;
                                if (serverCheckpoint.posY !== frameCheckpoint.posY) serverCheckpoint.posY = frameCheckpoint.posY;
                                if (serverCheckpoint.orientation !== frameCheckpoint.orientation) serverCheckpoint.orientation = frameCheckpoint.orientation;

                                server.moveNode("MIR", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posY, 0.3,[
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, 0, 1
                                ], true);
                                server.pushUpdatesToDevices("MIR");

                                //console.log('server checkpoint: ', serverCheckpoint);
                                
                            }
                        });

                        // If the checkpoint is not in the server, add it and add the node listener.
                        if (!exists){
                            serverPath.checkpoints.push(frameCheckpoint);

                            server.addNode("MIR", "kineticAR", frameCheckpoint.name, "node");

                            console.log('NEW ' + frameCheckpoint.name + ' | position: ', frameCheckpoint.posX, frameCheckpoint.posY);

                            server.moveNode("MIR", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posY, 0.3,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, 0, 1
                            ], true);

                            server.pushUpdatesToDevices("MIR");

                            console.log(' ************** Add read listener to ', frameCheckpoint.name);

                            // Add listener to node
                            server.addReadListener("MIR", "kineticAR", frameCheckpoint.name, function(data){

                                let indexValues = frameCheckpoint.name.split("_")[1];
                                let pathIdx = parseInt(indexValues.split(":")[0]);
                                let checkpointIdx = parseInt(indexValues.split(":")[1]);
                                nodeReadCallback(data, checkpointIdx, pathIdx);

                            });
                        }
                    });
                }
            });

            if (!pathExists){   // If the path doesn't exist on the server, add it to the server path data

                pathData.push(framePath);

            }
        });

        console.log("\nCurrent PATH DATA in SERVER: ", JSON.stringify(pathData), '\n');

    });

    function nodeReadCallback(data, checkpointIdx, pathIdx){

        // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint
        // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

        console.log('NODE ', checkpointIdx, ' path: ', pathIdx, ' received ', data);


        let checkpointTriggered = pathData[pathIdx].checkpoints[checkpointIdx];

        if (data.value === 1){

            if (!checkpointTriggered.active){

                console.log('Checkpoint has changed from not active to active: ', checkpointTriggered.name);

                // Checkpoint has changed from not active to active. We have to send robot here
                activeCheckpointName = checkpointTriggered.name;
                checkpointTriggered.active = 1; // This checkpoint gets activated

                let missionData = computeMIRCoordinatesTo(checkpointTriggered.posX, checkpointTriggered.posY, checkpointTriggered.orientation);


                let newAddress = restAddress + "/mission_queue";

                if (enableMIRConnection) {
                    postData(newAddress, missionData)
                        .then(res => console.log(res)) // JSON-string from `response.json()` call
                        .catch(error => console.error(error));
                }

                inMotion = true;
            } else {
                console.log('WARNING: This checkpoint was already active!');
            }

        } else if (data.value === 0){   // If node receives a 0

            console.log('Value === 0');

            if (checkpointTriggered.active){

                console.log('Checkpoint has changed from active to not active: ', checkpointTriggered.name);

                if (inMotion){

                    // The node has been deactivated in the middle of the move mission!
                    // We need to delete the mission from the mission queue

                    console.log('MISSION INTERRUPTED');

                    let newAddress = restAddress + "/mission_queue";

                    deleteData(newAddress)
                        .then(res => console.log(res)) // JSON-string from `response.json()` call
                        .catch(error => console.error(error));

                    mir_mission_interrupted = true;

                } else {

                    // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint

                    console.log('Checkpoint reached: ', checkpointTriggered.name);
                    checkpointTriggered.active = 0; // This checkpoint gets deactivated

                    let nextCheckpointToTrigger = null;

                    if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                      // Next checkpoint in same path
                        nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                        console.log('Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                        server.write("MIR", "kineticAR", nextCheckpointToTrigger.name, 1);   // server write

                    } else {                                                                            // We reached end of path


                        activeCheckpointName = null;


                    }

                }
            }
        }
    }

    function radians_to_degrees(radians)
    {
        var pi = Math.PI;
        return radians * (180/pi);
    }

    function degrees_to_radians(degrees)
    {
        var pi = Math.PI;
        return degrees * (pi/180);
    }

    function distance( a, b )
    {

        //console.log('a: ', a);
        //console.log('b: ', b);

        var dx = a[0] - b[0];
        var dy = a[1] - b[1];

        var distance = Math.sqrt( dx * dx + dy * dy );

        return distance;
    }

    function signed_angle(vector1, vector2){

        let angle = Math.atan2(vector2[1], vector2[0]) - Math.atan2(vector1[1], vector1[0]);

        if (angle > Math.PI)        { angle -= 2 * Math.PI; }
        else if (angle <= -Math.PI) { angle += 2 * Math.PI; }

        return angle;

    }
    
    function computeMIRCoordinatesTo(newCheckpointX, newCheckpointY, checkpointOrientation){

        let lastDirectionTo = [lastDirectionAR.x, lastDirectionAR.y];

        let from = [lastPositionAR.x, lastPositionAR.y];
        let to = [newCheckpointX / groundPlaneScaleFactor, newCheckpointY / groundPlaneScaleFactor];

        console.log('Last Direction To: ', lastDirectionTo);
        console.log('From: ', from);
        console.log('To: ', to);

        const newDistance = distance(from, to);                                 // Distance that the robot has to travel to get to the next point
        console.log('Distance: ', newDistance);

        //let newDirection = to;                                                // to - from --> direction vector
        //sub(newDirection, from);
        //normalize(newDirection);

        let newDirectionVector = [to[0] - from[0], to[1] - from[1]];                  // newDirection = to - from

        console.log('New Direction Vector: ', newDirectionVector);

        let angleBetween = signed_angle(newDirectionVector, lastDirectionTo);   // Angle between direction vectors

        const newDirectionDeg = radians_to_degrees(angleBetween);               // Angle that the robot has to turn to go to next coordinate in deg

        console.log('New direction deg: ', newDirectionDeg);
        console.log('Current orientation MIR: ', currentOrientationMIR);

        currentOrientationMIR = currentOrientationMIR + newDirectionDeg;        // Angle in the MIR Coordinate system

        currentPositionMIR.x += newDistance * Math.cos(degrees_to_radians(currentOrientationMIR));
        currentPositionMIR.y += newDistance * Math.sin(degrees_to_radians(currentOrientationMIR));

        /*
        // Normalize to range range (-180, 180]
        if (currentOrientationMIR > 180)        { currentOrientationMIR -= 360; }
        else if (currentOrientationMIR <= -180) { currentOrientationMIR += 360; }
         */

        let angleDifferenceAR = initOrientationAR + checkpointOrientation;
        let newOrientation = initOrientationMIR - angleDifferenceAR;

        console.log('\ncheckpointOrientation: ', checkpointOrientation);
        console.log('angleDifferenceAR: ', angleDifferenceAR);
        console.log('newOrientation: ', newOrientation);

        // Normalize to range range (-180, 180]
        if (newOrientation > 180)        { newOrientation -= 360; }
        else if (newOrientation <= -180) { newOrientation += 360; }

        console.log('newOrientation normalized: ', newOrientation, '\n');

        let dataObj = {
            "mission_id": moveToCoordinateGUID,
            "parameters":[{"input_name":"positionX","value": currentPositionMIR.x},
            {"input_name":"positionY","value": currentPositionMIR.y},
            {"input_name":"orientation","value": newOrientation}]
        };

        //console.log(dataObj);

        currentOrientationMIR = newOrientation;
        lastDirectionAR.x = Math.cos(degrees_to_radians(checkpointOrientation));
        lastDirectionAR.y = Math.sin(degrees_to_radians(checkpointOrientation));
        lastPositionAR.x = to[0];
        lastPositionAR.y = to[1];

        return dataObj;
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
            currentPositionMIR.x = mirStatus['x'];
            currentPositionMIR.y = mirStatus['y'];
            currentOrientationMIR = mirStatus['orientation'];

            //console.log(mirStatus);

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
                    if (mir_current_state !== 3){

                        if (mir_mission_interrupted){

                            console.log('ALL MISSIONS STOPPED DUE TO INTERRUPTION');

                            mir_mission_interrupted = false;

                            mir_current_state = 3;

                            inMotion = false;

                        } else {

                            console.log("MIR CHANGED STATE TO READY!");
                            inMotion = false;

                            // MIR has finished mission. Send a 0 to current checkpoint

                            console.log("\nSetting active checkpoint to 0", activeCheckpointName);

                            server.write("MIR", "kineticAR", activeCheckpointName, 0);

                            mir_current_state = 3;
                        }
                    }
                    break;
                case 4:
                    // pause
                    //console.log("PAUSE");
                    break;
                case 5:
                    if (mir_current_state !== 5){
                        console.log("MIR CHANGED STATE TO EXECUTING!");

                        mir_current_state = 5;

                        inMotion = true;        // When robot starts moving
                    }
                    break;

                case 10:
                    // emergency stop
                    console.log("EMERGENCY STOP!");
                    break;

                case 11:
                    // manual control
                    //console.log("MANUAL CONTROL");
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

    // Example DELETE method implementation:
    function deleteData(url = '') {

        //console.log('   -   -   -   DELETE: ' + url + ");

        // Default options are marked with *
        return fetch(url, {
            method: "DELETE", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, cors, *same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",
                "authorization": authorization,
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer" // no-referrer, *client
        })

        //.then(response => response.json());   // parses JSON response into native Javascript objects
            .then(response => response.text())      // convert to plain text
        //.then(text => console.log(text))      // then log it out
    }

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });

/*
    function followUser(){

        console.log('Current YAW:', websocket.currentYaw());
        console.log('Current Position:', websocket.currentRobotPosition);

        let _currentOrientation_MIR = websocket.currentYaw();                              // Orientation of the robot at this frame in degrees (from WebSocket)
        let _currentPosition_MIR = websocket.currentRobotPosition();                       // Position of the robot at this frame

        let newARPosition = PositionFromMIRToAR(_currentPosition_MIR, _currentOrientation_MIR);

    }

    function PositionFromMIRToAR(newPosition, newDirectionAngle)
    {

        if (newDirectionAngle < 0) newDirectionAngle += 360;                      // newDirectionAngle must be between 0 - 360

        currentOrientationMIR = mirStatus['orientation'];

        let initialAngleMIR = currentOrientationMIR;
        if (initialAngleMIR < 0) initialAngleMIR += 360;

        let initialRobotDirectionVector = [Math.cos(degrees_to_radians(initialAngleMIR)),                              // MIR space
                                           Math.sin(degrees_to_radians(initialAngleMIR))];

        let from = [mirStatus['x'], mirStatus['y']];
        let to = newPosition;

        let newDir = to;                                                  // to - from --> direction vector
        sub(newDir, from);
        normalize(newDir);

        let newDirectionDeg = signed_angle(initialRobotDirectionVector, newDir);   // Angle between initial direction and new direction
        let newDistance = distance(from, to);                                     // Distance between points

        let angleDifference = newDirectionAngle - initialAngleMIR; // Angle difference between current and initial MIR orientation

        let _initialOrientation_AR = angle([arStatus.robotInitDirection['x'], arStatus.robotInitDirection['z']]);

        let newARAngle = _initialOrientation_AR + angleDifference;

        let newAngle = _initialOrientation_AR + newDirectionDeg + 90;                     // 90 degrees of difference between X axis and Forward (Z) axis

        let newARPosition = {x:0, y:0, z:0};
        newARPosition.x = arStatus.robotInitPosition['x'] + newDistance * Math.cos(degrees_to_radians(newAngle));
        newARPosition.y = arStatus.robotInitPosition['z'] + newDistance * Math.sin(degrees_to_radians(newAngle));
        newARPosition.z = newARAngle;

        return newARPosition;

    }
*/

    // UPDATE FUNCTION

    function updateEvery(i, time) {
        setTimeout(() => {

            // We request status in a loop forever
            if (enableMIRConnection) requestStatus();

            updateEvery(++i, time);
        }, time)
    }
    
    updateEvery(0, 100);
    
}