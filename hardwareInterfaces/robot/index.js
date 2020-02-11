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
 * Created by Anna Fuste on 10/23/19.
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

const { SocketInterface } = require('./socketinterface');
const { CustomMaths } = require('./customMaths');
const { Robot } = require('./robot');

exports.enabled = false;
exports.configurable = false;

if (exports.enabled) {

    let enableConnection = true;
    console.log('\nRobot Connection: ', enableConnection,'\n');

    server.enableDeveloperUI(true);

    // TODO: This should not be happening here!
    server.removeAllNodes('UR3E', 'kineticAR');   // We remove all existing nodes from the Frame

    const hostIP = "10.10.10.108";
    const port = 30002;

    let maths = new CustomMaths();
    let robot = new Robot('MIR');

    let activeCheckpointName = null;        // Current active checkpoint

    let socket;
    if (enableConnection){
        socket = new SocketInterface(hostIP, port);

    }

    server.addNode("UR3E", "kineticAR", "kineticNode1", "storeData");     // Node for checkpoint stop feedback
    server.addNode("UR3E", "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode("UR3E", "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path

    server.addPublicDataListener("UR3E", "kineticAR", "kineticNode4","ClearPath",function (data) {

        console.log("   -   -   -   Frame has requested to clear path: ", data);

        pathData.forEach(path => {
            path.checkpoints.forEach(checkpoint => {
                server.removeNode("UR3E", "kineticAR", checkpoint.name);
                server.pushUpdatesToDevices("UR3E");
            });
            path.checkpoints = [];
        });

        inMotion = false;
        activeCheckpointName = null;

    });

    server.addPublicDataListener("UR3E", "kineticAR", "kineticNode2","pathData",function (data){

        // We go through array of paths
        data.forEach(framePath => {

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index === framePath.index){   // If this path exists on the server, proceed to update checkpoints
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
                                if (serverCheckpoint.posZ !== frameCheckpoint.posZ) serverCheckpoint.posZ = frameCheckpoint.posZ;
                                if (serverCheckpoint.posXUR !== frameCheckpoint.posXUR) serverCheckpoint.posXUR = frameCheckpoint.posXUR;
                                if (serverCheckpoint.posYUR !== frameCheckpoint.posYUR) serverCheckpoint.posYUR = frameCheckpoint.posYUR;
                                if (serverCheckpoint.posZUR !== frameCheckpoint.posZUR) serverCheckpoint.posZUR = frameCheckpoint.posZUR;
                                if (serverCheckpoint.orientation !== frameCheckpoint.orientation) serverCheckpoint.orientation = frameCheckpoint.orientation;

                                // <node>, <frame>, <Node>, x, y, scale, matrix
                                server.moveNode("UR3E", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.1,[
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, frameCheckpoint.posY * 6, 1
                                ], true);
                                server.pushUpdatesToDevices("UR3E");

                                //console.log('server checkpoint: ', serverCheckpoint);
                            }
                        });

                        // If the checkpoint is not in the server, add it and add the node listener.
                        if (!exists){
                            serverPath.checkpoints.push(frameCheckpoint);

                            server.addNode("UR3E", "kineticAR", frameCheckpoint.name, "node");

                            console.log('NEW ' + frameCheckpoint.name + ' | position: ', frameCheckpoint.posX, frameCheckpoint.posY, frameCheckpoint.posZ);

                            // <node>, <frame>, <Node>, x, y, scale, matrix
                            server.moveNode("UR3E", "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.1,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, frameCheckpoint.posY * 6, 1
                            ], true);

                            server.pushUpdatesToDevices("UR3E");

                            console.log(' ************** Add read listener to ', frameCheckpoint.name);

                            // Add listener to node
                            server.addReadListener("UR3E", "kineticAR", frameCheckpoint.name, function(data){

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

                // Send UR EE to position in METERS!!!!

                let offsetZ = 0.170;

                socket.moveURto(checkpointTriggered.posXUR * 0.001, checkpointTriggered.posYUR * 0.001, offsetZ + checkpointTriggered.posZUR * 0.001, 0, Math.PI, 0);
                //socket.moveURto(checkpointTriggered.posXUR * 0.001, checkpointTriggered.posYUR * 0.001, 0.3, 0, Math.PI, 0);

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

                    // TODO: STOP UR

                    ur_mission_interrupted = true;

                } else {

                    // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint

                    console.log('Checkpoint reached: ', checkpointTriggered.name);
                    checkpointTriggered.active = 0; // This checkpoint gets deactivated

                    // TODO: Send acknowledgement to frame
                    // Send newARPosition to frame
                    server.writePublicData("UR3E", "kineticAR", "kineticNode1", "CheckpointStopped", checkpointIdx);

                    let nextCheckpointToTrigger = null;

                    if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                      // Next checkpoint in same path
                        nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                        console.log('Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                        server.write("UR3E", "kineticAR", nextCheckpointToTrigger.name, 1);

                    } else {                                                                            // We reached end of path

                        activeCheckpointName = null;

                    }

                }
            }
        }
    }

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });
    
}
