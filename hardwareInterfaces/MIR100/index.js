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

var events = require('events');

const { WebSocketInterface } = require('./websocketInterface');
const { RestAPIInterface } = require('./restapiInterface');
const { RestAPIServer } = require('./restapiserver');
const { CustomMaths } = require('./customMaths');
const { SocketInterface } = require('./socketInterface');

exports.enabled = true;

if (exports.enabled) {

    let enableMIRConnection = true;
    console.log('\nMIR Connection: ', enableMIRConnection,'\n');

    server.enableDeveloperUI(true);
    server.removeAllNodes('MIR', 'kineticAR'); // We remove all existing nodes from the Frame

    // ROBOT IP
    //const hostIP = "192.168.12.20"; 
    const hostIP = "10.10.10.112";              // reality demo 5G
    const port = 9090;

    //const benIP = "10.10.10.110";
    const benIP = "127.0.0.1";
    const benPort = 8080;
    let websocketToBen = new SocketInterface(benIP, benPort);

    let eventEmitter = new events.EventEmitter();

    let maths = new CustomMaths();

    // MIR100 WEBSOCKET
    let websocket, restapi, serverRest = null;
    if (enableMIRConnection){
        websocket = new WebSocketInterface(hostIP, port);
        restapi = new RestAPIInterface(hostIP);
        serverRest = new RestAPIServer(3030);   // Create server for others to access robot data
    }

    // MIR100 REST API INFO
    const restAddress = "http://" + hostIP + "/api/v2.0.0";

    const endpoints = {
        missions: "/missions",
        status: "/status",
        maps: "/maps",
        positions: "/positions"
    };

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
    let initPositionMIR = {x:0, y:0};
    let initOrientationMIR = 0;
    let initOrientationAR = 0;
    let initialSync = false;

    let mirFollowUser = false;
    let mapGUID = "";                       // Mission GUID needed for REST calls

    // INITIAL REQUESTS
    if (enableMIRConnection) restRequest(endpoints.missions).then(processMissions).catch(error => console.error(error));
    //if (enableMIRConnection) restRequest(endpoints.maps).then(processMaps).catch(error => console.error(error));

    // Request Information to the MIR100
    function restRequest(endpoint){ return restapi.getData(restAddress + endpoint);}

    server.addNode("MIR", "kineticAR", "kineticNode1", "storeData");     // Node for occlusion data
    server.addNode("MIR", "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode("MIR", "kineticAR", "kineticNode3", "storeData");     // Node for receiving AR status
    server.addNode("MIR", "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode1","Follow",function (data) {

        mirFollowUser = data;

    });

    server.addPublicDataListener("MIR", "kineticAR", "kineticNode3","ARstatus",function (data){

        arStatus = data;

        lastPositionAR.x = data.robotInitPosition['x']/groundPlaneScaleFactor;
        lastPositionAR.y = data.robotInitPosition['z']/groundPlaneScaleFactor;

        lastDirectionAR.x = data.robotInitDirection['x'];
        lastDirectionAR.y = data.robotInitDirection['z'];

        //console.log("LAST POSITION AR: ", lastPositionAR);              //       { x: -332.3420, y: 482.1173, z: 1749.54107 }
        //console.log("LAST DIRECTION AR: ", lastDirectionAR);            //       { x: -0.84, y: -0.00424 }

        initOrientationMIR = currentOrientationMIR;                         // Get orientation at this moment in time
        initOrientationAR =  (-1) * maths.signed_angle([1,0], [lastDirectionAR.x, lastDirectionAR.y]) * 180 / Math.PI;
        initPositionMIR.x = currentPositionMIR.x;
        initPositionMIR.y = currentPositionMIR.y;
        initialSync = true;


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

        // We go through array of paths
        data.forEach(framePath => {

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index === framePath.index){   // If this path exists on the server, proceed to compare checkpoints
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

                            //console.log(' ************** Add read listener to ', frameCheckpoint.name);

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
                    restapi.postData(newAddress, missionData)
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

                    restapi.deleteData(newAddress)
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
                        server.write("MIR", "kineticAR", nextCheckpointToTrigger.name, 1);

                    } else {                                                                            // We reached end of path

                        activeCheckpointName = null;

                    }

                }
            }
        }
    }

    function computeMIRCoordinatesTo(newCheckpointX, newCheckpointY, checkpointOrientation){

        let lastDirectionTo = [lastDirectionAR.x, lastDirectionAR.y];

        let from = [lastPositionAR.x, lastPositionAR.y];
        let to = [newCheckpointX / groundPlaneScaleFactor, newCheckpointY / groundPlaneScaleFactor];

        const newDistance = maths.distance(from, to);                                 // Distance that the robot has to travel to get to the next point

        let newDirectionVector = [to[0] - from[0], to[1] - from[1]];                  // newDirection = to - from

        let angleBetween = maths.signed_angle(newDirectionVector, lastDirectionTo);   // Angle between direction vectors

        const newDirectionDeg = maths.radians_to_degrees(angleBetween);               // Angle that the robot has to turn to go to next coordinate in deg

        currentOrientationMIR = currentOrientationMIR + newDirectionDeg;        // Angle in the MIR Coordinate system

        currentPositionMIR.x += newDistance * Math.cos(maths.degrees_to_radians(currentOrientationMIR));
        currentPositionMIR.y += newDistance * Math.sin(maths.degrees_to_radians(currentOrientationMIR));

        let angleDifferenceAR = initOrientationAR + checkpointOrientation;
        let newOrientation = initOrientationMIR - angleDifferenceAR;

        // Normalize to range range (-180, 180]
        if (newOrientation > 180)        { newOrientation -= 360; }
        else if (newOrientation <= -180) { newOrientation += 360; }

        let dataObj = {
            "mission_id": moveToCoordinateGUID,
            "parameters":[{"input_name":"positionX","value": currentPositionMIR.x},
            {"input_name":"positionY","value": currentPositionMIR.y},
            {"input_name":"orientation","value": newOrientation}]
        };

        currentOrientationMIR = newOrientation;
        lastDirectionAR.x = Math.cos(maths.degrees_to_radians(checkpointOrientation));
        lastDirectionAR.y = Math.sin(maths.degrees_to_radians(checkpointOrientation));
        lastPositionAR.x = to[0];
        lastPositionAR.y = to[1];

        return dataObj;
    }

    function processStatus(data) {
        // status

        if (data !== undefined){
            mirStatus = data['position'];
            currentPositionMIR.x = mirStatus['x'];
            currentPositionMIR.y = mirStatus['y'];
            currentOrientationMIR = mirStatus['orientation'];

            // Send info to rest server for others to access it.
            serverRest.RobotStatus = mirStatus;

            //console.log(mirStatus);

            //console.log("   -   -   -   ROBOT POS: ", dataStatus);
            /*console.log("********************************");
            console.log("   -   -   -   ROBOT NAME: " + data['robot_name']);
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
                            
                            if (activeCheckpointName !== null){
                                console.log("\nSetting active checkpoint to 0", activeCheckpointName);
                                server.write("MIR", "kineticAR", activeCheckpointName, 0);
                            } else {
                                console.log("No checkpoint active. Active checkpoint is NULL");
                            }

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

    function processMissions(data){
        for(var i = 0; i < data.length; i++) {  // loop through all objects in array
            var obj = data[i];

            if (obj.name === 'Move To Coordinate'){
                moveToCoordinateGUID = obj.guid;
                //console.log("   -   -   -   ", moveToCoordinateGUID);
            }
        }
    }

    function processMaps(data){
        for(var i = 0; i < data.length; i++) {  // loop through all objects in array
            var obj = data[i];

            if (obj.name === 'FLOOR17'){
                mapGUID = obj.guid;

                restRequest('/maps/' + mapGUID).then(processMap).catch(error => console.error(error));
            }
        }
    }

    function processMap(data){
        if (data['map'] !== undefined){

            serverRest.MapData = data['map'];

            require("fs").writeFile("out.png", data['map'], 'base64', function(err) {
                if (err) throw err;
                console.log('Map File Saved!\n');
            });
        }
    }
    
    function processPaths(data){

        console.log('Path Data: ', data);

        /*
        for(var i = 0; i < data.length; i++) {  // loop through all objects in array

            let obj = data[i];

            let path_guide = obj.path_guide_guid;

            restRequest("/path_guides_positions/" + path_guide)
                .then(processPathPosition)
                .catch(error => console.error(error));
        }

        for(var i = 0; i < data.length; i++) {  // loop through all objects in array

            let obj = data[i];

            let goal_pos = obj.goal_pos;
            let goal_pos_values = goal_pos.split('/');
            restRequest(endpoints.positions + "/" + goal_pos_values[goal_pos_values.length - 1])
                .then(processPathPosition)
                .catch(error => console.error(error));

        }
        */

    }

    function processPathPosition(data){

        console.log(data);

    }


    function sendOcclusionPosition(){

        let _currentOrientation_MIR = websocket.currentYaw();                              // Orientation of the robot at this frame in degrees (from WebSocket)
        let _currentPosition_MIR = websocket.currentRobotPosition;                       // Position of the robot at this frame

        //console.log('Current YAW:', _currentOrientation_MIR);
        //console.log('Current Position:', _currentPosition_MIR);

        let newARPosition = positionFromMIRToAR(_currentPosition_MIR, _currentOrientation_MIR);

        //console.log("SENDING: ", newARPosition);

        // Send newARPosition to frame
        server.writePublicData("MIR", "kineticAR", "kineticNode1", "ARposition", newARPosition);

    }

    function positionFromMIRToAR(newPosition, newDirectionAngle)
    {
        
        let newARPosition = {x:0, y:0, z:0};

        if (newDirectionAngle < 0) newDirectionAngle += 360;                                                    // newDirectionAngle between 0 - 360

        let initialAngleMIR = initOrientationMIR;
        if (initialAngleMIR < 0) initialAngleMIR += 360;                                                        // initialAngleMIR between 0 - 360
        let initialRobotDirectionVectorMIR = [Math.cos(maths.degrees_to_radians(initialAngleMIR)),              // MIR space
                                           Math.sin(maths.degrees_to_radians(initialAngleMIR))];
        
        let from = [initPositionMIR.x, initPositionMIR.y];
        let to = [newPosition.x, newPosition.y];
        
        let newDistance = maths.distance(from, to);                                                             // Distance between points

        let newDir = [to[0] - from[0], to[1] - from[1]];                                                        // newDirection = to - from
        let newDirectionRad = maths.signed_angle(initialRobotDirectionVectorMIR, newDir);                       // Angle between initial direction and new direction

        let angleDifference = newDirectionAngle - initialAngleMIR;                                              // Angle difference between current and initial MIR orientation
        
        let _initialOrientation_AR = maths.signed_angle([arStatus.robotInitDirection['x'],              // Initial AR direction
                                                                 arStatus.robotInitDirection['z']], 
                                                                [1,0]);   

        if (_initialOrientation_AR < 0) _initialOrientation_AR += 2*Math.PI;                                    // _initialOrientation_AR between 0 - 360
        
        let newARAngle = maths.radians_to_degrees(_initialOrientation_AR) + angleDifference;
        
        let newAngleDeg = maths.radians_to_degrees(_initialOrientation_AR) + maths.radians_to_degrees(newDirectionRad);

        newARPosition.x = (arStatus.robotInitPosition['x']/groundPlaneScaleFactor) + (newDistance * Math.cos(maths.degrees_to_radians(newAngleDeg)));
        newARPosition.y = - ((- arStatus.robotInitPosition['z']/groundPlaneScaleFactor) + (newDistance * Math.sin(maths.degrees_to_radians(newAngleDeg))));
        newARPosition.z = maths.degrees_to_radians(newARAngle);

        // Send position and rotation to server. 
        // TODO: This should be sent to frame and frame would display! Not here
        var messageBody = {
            objectKey: "MIRA5el60nk4klg",
            position: {
                x: newARPosition.x * 1000, // 1000 = 1 meter in world space
                y: newARPosition.y * 1000,
                z: 0
            },
            rotationInRadians: maths.degrees_to_radians(newARAngle), // right now this API only supports rotation about the vertical axis. use the other API to pass a full rotation matrix.
            editorId: 'testID' // the actual value doesn't matter but it needs to have one
        };
        websocketToBen.send(JSON.stringify(messageBody));

        return newARPosition;

    }


    // UPDATE FUNCTION
    function updateEvery(i, time) {
        setTimeout(() => {

            // We request status in a loop forever
            if (enableMIRConnection) {

                restRequest(endpoints.status).then(processStatus).catch(error => console.error(error));

                //if (inMotion) restRequest(endpoints.maps + "/" + mapGUID).then(processPaths).catch(error => console.error(error));
                //if (inMotion) restRequest("/path_guides_positions").then(processPaths).catch(error => console.error(error));

                if (initialSync) sendOcclusionPosition();
            }

            updateEvery(++i, time);
        }, time)
    }

    updateEvery(0, 100);

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });

}
