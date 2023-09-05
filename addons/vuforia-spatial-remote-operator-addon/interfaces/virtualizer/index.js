/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var server = require('@libraries/hardwareInterfaces');
var utilities = require('@libraries/utilities');

var settings = server.loadHardwareInterface(__dirname);

exports.enabled = settings('enabled');
exports.configurable = true; // can be turned on/off/adjusted from the web frontend

if (exports.enabled) {
    var express = require('express');
    var app = require('express')();
    var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
    app.use(cors());
    // allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
    app.options('*', cors());

    app.use(express.static(__dirname + '/public'));
    var http = require('http').Server(app);
    var ip = require('ip');
    var glob = require('glob');
    var io = require('socket.io')(http, { wsEngine: 'ws' });

    var socket_list = [];

    var stations = [];
    var viewers = [];
    var editorToSocketId = {};
    var socketToEditorId = {};
    var viewer_width = null;
    var viewer_height = null;

    //custom vuforia server:
    var vuforiaResultClient = null;
    var vuforiaCamClient = null;
    var reality_zone_gifurl_list = ['bogus_url1', 'bogus_url2'];
    //var system = null;

    var tic = 0;
    var toc = 0;

    var desktop_connected_hack = 0;

    let obj = null;
    let realityZoneControlInterface = null;
    let validMatrix = null;

    server.subscribeToUDPMessages(function(msgContent) {
        //console.log('received udp message with content: ' + msgContent);
        //console.dir(msgContent);

        try {
            obj = msgContent;
            //var obj = JSON.parse(msgContent);
            /*
        id: thisId,
        ip: thisIp,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs,
        zone: zone
        */

            //check if its an object on the network:
            if (obj.id && obj.ip && obj.vn ) {


                var objectName = obj.id.slice(0, -12);
                var httpPort = 8080;
                var xmlAddress = 'http://' + obj.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';
                var datAddress = 'http://' + obj.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';

                var messageObject = {
                    id: obj.id,
                    ip: obj.ip,
                    versionNumber: obj.vn,
                    protocol: obj.pr,
                    temporaryChecksum: obj.tcs,
                    zone: obj.zone,
                    xmlAddress: xmlAddress,
                    datAddress: datAddress
                };

                for (let station of stations) {
                    station.emit('realityEditorObject_server_system', JSON.stringify(messageObject));
                }

                //console.log('received udp message: ' + obj.id + " " + obj.ip + " " + obj.vn + " " + obj.pr + " " + obj.tcs + " " + obj.zone);
                //console.log('xml address: ' + xmlAddress);
                //console.log('data address: ' + datAddress);
            }



            if (obj.action != null) {
                //console.dir(obj);
                //console.log('received action: ' + obj.action);

                var action = JSON.parse(obj.action);
                if (action.action == 'advertiseEditor') {
                    console.log('action advertise editor received');
                    console.log('width: ' + action.resolution.width + ' height: ' + action.resolution.height);
                    console.log('editor id: ' + action.editorId);
                    console.log('completed reading json');

                    viewer_width = action.resolution.width;
                    viewer_height = action.resolution.height;

                    //send a message:
                    var zoneResponseMessage = {
                        action: 'zoneDiscovered',
                        ip: ip.address(),
                        port: 3020
                    };
                    utilities.actionSender(JSON.stringify(zoneResponseMessage));
                }
            }


        } catch (e) {
        //console.log('could not parse json message: ' + e);
        }




    });

    io.on('connection', function(socket) {
        console.log('my ip address: ' + ip.address());
        console.log('Client has connected');
        socket.emit('message', 'hello client');
        socket.id = Math.floor(Math.random() * 1000000);
        var temp_ip = socket.request.connection.remoteAddress;
        var parts = temp_ip.split(':');
        temp_ip = parts[parts.length - 1];
        socket_list.push(socket);

        socket.viewer_width = viewer_width;
        socket.viewer_height = viewer_height;

        socket.resolution_set = 0;

        socket.on('disconnect', function () {
            //if it's in the viewer list, remove it:
            var index = viewers.indexOf(socket);
            if (index > -1) {
                viewers.splice(index, 1);
            }

            index = socket_list.indexOf(socket);
            if (index > -1) {
                socket_list.splice(index, 1);
            }

            if (vuforiaCamClient == socket) {
                console.log('vuforiaCamClient disconnecting');
                vuforiaCamClient = null;
            }

            if (vuforiaResultClient == socket) {
                console.log('vuforiaResultClient disconnecting');
                vuforiaCamClient = null;
            }

        });


        socket.on('image', function (data) {
            //console.log('station sent image. viewer list length: ' + viewers.length + ' datalength: ' + data.length);

            // extract editorId if included
            let editorId = null;
            try {
                let parts = data.split(';_;');
                editorId = parts[2];
                // console.log('received image for ' + editorId);
            } catch (e) {
                // console.log('error extracting editorId from image data', e);
            }

            if (stations.length > 0) {
                for (let viewer of viewers) {
                    let viewerEditorId = socketToEditorId[viewer.id];
                    // console.log('send to viewer ' + viewerEditorId + '?');
                    if (editorId && viewerEditorId) {
                        if (viewerEditorId !== editorId) {
                            // console.log('skipping mismatching editorIds');
                            continue;
                        }
                    }

                    viewer.emit('image', data);
                    /*
          //write it to file for debug purposes
          fs.writeFile('debug.jpg', data,'base64', function(err, data){
              if (err) console.log(err);
              console.log("Successfully Written to File.");
          });
          */
                }
            }
        });

        socket.on('name', function(data) {
            console.log('name function called with: ' + data);
            //console.log('data length: ' + data.length);
            //console.log('data = viewer? ' + (data === '"viewer"'));
            let parsedData = {};
            try {
                parsedData = JSON.parse(data);
                console.log(parsedData.type);
            } catch (e) {
                console.log('cant parse ' + data);
            }
            if (parsedData.type === 'viewer') {
                console.log('client identified as viewer. assigning it latest viewer and id: ' + socket.id + ' and editorId: ' + parsedData.editorId);

                socket.type = 'viewer';
                viewers.push(socket);

                editorToSocketId[parsedData.editorId] = socket.id;
                socketToEditorId[socket.id] = parsedData.editorId;

                for (let station of stations) {
                    console.log('setting resolution for the first time: ' + viewer_width + ',' + viewer_height  );
                    station.emit('resolution', '' + viewer_width + ',' + viewer_height);
                }

                //send some matrices to the RDV:
                console.log('now that a desktop has connected');

                var visibleObjectsString = '{"amazonBox0zbc6yetuoyj":[-0.9964230765028328,0.009800613580158324,-0.08393736781840644,0,0.022929297584320937,0.987345281122669,-0.15691860457929643,0,-0.08133670600902992,0.15828222984430484,0.9840378965122027,0,329.2388939106902,77.77425852082308,-1489.0291313193022,1],"kepwareBox4Qimhnuea3n6":[-0.9913746548884379,0.034050970326370084,-0.12655601222953172,0,0.051082427979348755,0.9896809533465255,-0.13387410555924745,0,-0.12069159903807483,0.1391844414830788,0.9828837698713899,0,212.63741144996703,206.15960431449824,-1826.5693898311488,1],"_WORLD_OBJECT_local":[-0.9742120258704184,-0.00437900631612313,-0.22559212287700664,0,-0.035464931453757634,-0.9844127588621392,0.17226278091636868,0,-0.22282991544549868,0.17582138398908906,0.9588711290537871,0,161.99950094104497,-166.5114134489016,-519.0149842693205,1],"_WORLD_OBJECT_PF5x8fv3zcgm":[-0.9742120258704184,-0.00437900631612313,-0.22559212287700664,0,-0.035464931453757634,-0.9844127588621392,0.17226278091636868,0,-0.22282991544549868,0.17582138398908906,0.9588711290537871,0,161.99950094104497,-166.5114134489016,-519.0149842693205,1]}';
                var _visibleObjects = JSON.parse(visibleObjectsString);

                var zoneMatrixMessage = {
                    action: 'zoneMatrixMessage',
                    matrices: visibleObjectsString,
                    ip: ip.address(),
                    port: 3020
                };

                utilities.actionSender(JSON.stringify(zoneMatrixMessage));

                console.log('looking for objects: ');
                var pingMessage = {
                    action: 'ping'
                };
                for (var i = 0; i < 3; i++) {
                    setTimeout(function() {
                        utilities.actionSender(JSON.stringify(pingMessage));
                        //realityEditor.app.sendUDPMessage({action: 'ping'});
                    }, 500 * i); // space out each message by 500ms
                }
            }

            if (data === 'station') {
                console.log('client identified as station');
                stations.push(socket);
                socket.type = 'station';
                if (viewer_width != null) {
                    console.log('sending resolution to station: ' + viewer_width + ','  + viewer_height );
                    socket.emit('resolution', '' + viewer_width + ',' + viewer_height);
                }
            }

            if (data === 'vuforiaCamClient') {
                console.log('client identified as vuforiaCamClient');
                vuforiaCamClient = socket;
                socket.type = 'vuforiaCamClient';
            }

            if (data === 'vuforiaResultClient') {
                console.log('client identified as vuforiaResultClient');
                vuforiaResultClient = socket;
                socket.type = 'vuforiaResultClient';
            }

            if (data === 'realityZoneControlInterface') {
                console.log('client identified as realityZoneControlInterface');
                realityZoneControlInterface = socket;
                socket.type = 'realityZoneControlInterface';


                //find all the gifs:
                var gif_url_token = __dirname + '/public/gifs/*/*.gif';
                reality_zone_gifurl_list = [];
                glob(gif_url_token, function (er, files) {
                    //console.log('dir name: ' + __dirname);
                    //console.log('gif urls: ' + files);
                    for (var i = 0; i < files.length; i++) {
                        var clean_file = files[i];
                        var pos = clean_file.indexOf('/gifs/');
                        clean_file = clean_file.substring(pos);
                        console.log('adding: ' + clean_file);
                        reality_zone_gifurl_list.push(clean_file);
                    }


                    //console.log('reality_zone_gifurl_list: ');
                    //console.dir(reality_zone_gifurl_list);
                    //send it a list of image urls!
                    for (var ii = 0; ii < reality_zone_gifurl_list.length; ii++) {

                        var gifurl_object = new Object();
                        gifurl_object.gifurl = reality_zone_gifurl_list[ii];
                        //console.log('sending: ' + JSON.stringify(gifurl_object));
                        socket.emit('realityZoneGif_server_realityZoneControlInterface', JSON.stringify(gifurl_object));
                    }

                    // files is an array of filenames.
                    // If the `nonull` option is set, and nothing
                    // was found, then files is ["**/*.js"]
                    // er is an error object or null.
                });
            }
        });

        socket.on('message', function(data) {
            console.log('message send', data);
            if (socket.type !== 'viewer') {
                console.log('not a viewer but we will let it slide for now');
            }
            for (let station of stations) {
                station.emit('message', data);
            }
        });

        socket.on('realityZoneGif_system_server', function(data) {
        //add to reality_zone_gifurl_list
            if (realityZoneControlInterface != null) {
                var data_object = JSON.parse(data);
                var clean_file = data_object.gifurl;
                var pos = clean_file.indexOf('gifs');
                clean_file = clean_file.substring(pos - 1);

                var gifurl_object = new Object();
                gifurl_object.gifurl = clean_file;
                realityZoneControlInterface.emit('realityZoneGif_server_realityZoneControlInterface', JSON.stringify(gifurl_object));
            }
        });

        socket.on('stopRecording_realityZoneControlInterface_server', function(_data) {
            console.log('got stop recording command from website');
            for (let station of stations) {
                station.emit('stopRecording_server_system');
            }
        });

        socket.on('startRecording_realityZoneControlInterface_server', function(_data) {
            console.log('got start recording command from website');
            for (let station of stations) {
                station.emit('startRecording_server_system');
            }
        });

        socket.on('twin_realityZoneControlInterface_server', function(_data) {
            console.log('creating twin');
            for (let station of stations) {
                station.emit('twin_server_system');
            }
        });

        socket.on('clearTwins_realityZoneControlInterface_server', function(_data) {
            console.log('clearing twins');
            for (let station of stations) {
                station.emit('clearTwins_server_system');
            }
        });

        socket.on('zoneInteractionMessage_realityZoneControlInterface_server', function(data) {
            console.log('zone interaction message: ' + data);
            for (let station of stations) {
                station.emit('zoneInteractionMessage_server_system', data);
            }
        });



        //viewer resolution information:
        socket.on('resolution', function(data) {
            console.log('received resolution from phone viewer: ' + data);
            var result = data.split(',');
            viewer_width = parseFloat(result[0]);
            viewer_height = parseFloat(result[1]);
            socket.viewer_width = viewer_width;
            socket.viewer_height = viewer_height;

            console.log('width: ' + viewer_width);
            console.log('height: ' + viewer_height);



            for (let station of stations) {
                console.log('found resolution from a phone!');
                station.emit('resolutionPhone', '' + viewer_width + ',' + viewer_height);
                /*
        if(socket.id!=ip.address()){ //this is necessary to fix the issue wiht desktop. todo: explain this better.
          console.log("found resolution from a phone!");
          station.emit('resolutionPhone',""+viewer_width+','+viewer_height);
        }
        */

                console.log('sending resolution to station from phone: ' + viewer_width + ','  + viewer_height );
                station.emit('resolution', '' + viewer_width + ',' + viewer_height);
            }
        });


        //viewer resolution information:
        socket.on('resolutionDesktop', function(data) {
            console.log('received resolution from desktop viewer: ' + data);
            desktop_connected_hack = 1;
            console.log('TURNIGN DESKTOP CONNECTED HACK TO 1');
            var result = data.split(',');
            viewer_width = parseFloat(result[0]);
            viewer_height = parseFloat(result[1]);
            socket.viewer_width = viewer_width;
            socket.viewer_height = viewer_height;

            console.log('width: ' + viewer_width);
            console.log('height: ' + viewer_height);



            for (let station of stations) {
                /*
        if(socket.id!=ip.address()){ //this is necessary to fix the issue wiht desktop. todo: explain this better.
          console.log("found resolution from a phone!");
          station.emit('resolutionPhone',""+viewer_width+','+viewer_height);
        }
        */
                console.log('sending resolution to station from desktop: ' + viewer_width + ','  + viewer_height );
                station.emit('resolution', '' + viewer_width + ',' + viewer_height);
            }
        });


        //viewer pose information:
        socket.on('pose', function(data) {
            //console.log('received position from viewer: ' + socket.id);
            //console.log('current viewer is: ' + viewers[0].id);
            for (let station of stations) {
                if (socket.id == viewers[0].id) { //only capture the most recent one
                    //console.log('sending viewer data to station');
                    station.emit('pose', data);
                } else {
                    //console.log('not sending viewer data to station');
                }
            }
        });

        // this is for the 2020 scene graph version
        socket.on('cameraPosition', function(data) {
            if (stations.length > 0) {
                try {
                    var poseInfo = JSON.parse(data);

                    if (poseInfo.cameraPoseMatrix && poseInfo.projectionMatrix) {

                        if ((socket.viewer_width !== poseInfo.resolution.width) || (socket.viewer_height !== poseInfo.resolution.height)) {
                            socket.viewer_width = poseInfo.resolution.width;
                            socket.viewer_height = poseInfo.resolution.height;
                            console.log('setting unity resolution from valid matrix to: ' + socket.viewer_width + ',' + socket.viewer_height);
                            for (let station of stations) {
                                station.emit('resolution', '' + socket.viewer_width + ',' + socket.viewer_height);
                            }
                        }

                        for (let station of stations) {
                            station.emit('cameraPosition', JSON.stringify(poseInfo));
                        }
                    }

                } catch (e) {
                    console.log('error! could not parse camera pose info: ' + e);
                }
            }
        });

        // ben is testing this with the new version of the RDV camera system - 11/1/19
        socket.on('poseVuforiaCamera', function(data) {
            if (stations.length > 0) {
                try {
                    var poseInfo = JSON.parse(data);

                    var cameraPoseMatrix = poseInfo.cameraPoseMatrix;
                    validMatrix = cameraPoseMatrix;

                    //with RDV origin mode: overwrite with RDV camera to RDV origin matrix
                    if (poseInfo.cameraMode === 'REALITY_ZONE_ORIGIN') {
                        validMatrix = poseInfo.RDVCameraPoseMatrix;
                    }

                    if (validMatrix != -1) {
                        var data_for_old_unity_version = poseInfo;
                        data_for_old_unity_version.modelViewMatrix = validMatrix;
                        data_for_old_unity_version.projectionMatrix = poseInfo.projectionMatrix;
                        data_for_old_unity_version.realProjectionMatrix = poseInfo.realProjectionMatrix;

                        if ((socket.viewer_width != poseInfo.resolution.width) || (socket.viewer_height != poseInfo.resolution.height)) {
                            socket.viewer_width = poseInfo.resolution.width;
                            socket.viewer_height = poseInfo.resolution.height;
                            console.log('setting unity resolution from valid matrix to: ' + socket.viewer_width + ',' + socket.viewer_height);
                            for (let station of stations) {
                                station.emit('resolution', '' + socket.viewer_width + ',' + socket.viewer_height);
                            }
                        }

                        data_for_old_unity_version = JSON.stringify(data_for_old_unity_version);
                        for (let station of stations) {
                            station.emit('poseVuforiaDesktop', data_for_old_unity_version);
                        }
                    }

                } catch (e) {
                    console.log('error! could not parse camera pose info: ' + e);
                }
            }
        });

        //use this for now on, hisham - 5/22/2019
        socket.on('poseVuforia', function(data) {
            //console.log('pose vuforia called: ' + data);
            if (stations.length > 0) {
                try {
                    var poseInfo = JSON.parse(data);



                    //socket.viewer_width = 640;
                    //socket.viewer_height = 480;

                    /*
          if(socket.resolution_set == 0){
            console.log('setting unity resolution to: ' +socket.viewer_width+','+socket.viewer_height);
            station.emit('resolution',""+socket.viewer_width+','+socket.viewer_height);
            socket.resolution_set = 1;
          }
          */


                    var _vuforiaObjectList = poseInfo.visibleObjectMatrices;
                    var objectNameList = Object.keys(poseInfo.visibleObjectMatrices);
                    var validMatrix = -1;
                    for (var i = 0; i < objectNameList.length; i++) {
                        //if(!objectNameList[i].includes('_WORLD_OBJECT')){
                        //if(!objectNameList[i].includes('feederZoneTwo')){
                        if (objectNameList[i].includes('kepwareBox4Qimhnuea3n6')) {
                            validMatrix = poseInfo.visibleObjectMatrices[objectNameList[i]];
                        }
                    }

                    //with RDV origin mode: overwrite with RDV camera to RDV origin matrix
                    if (poseInfo.cameraMode === 'REALITY_ZONE_ORIGIN') {
                        //console.log("reality zone origin!");
                        validMatrix = poseInfo.RDVCameraPoseMatrix;
                    }

                    //console.dir(validMatrix);
                    //vuforiaObjectList = JSON.parse(vuforiaObjectList);
                    //console.dir(vuforiaObjectList);



                    if (validMatrix != -1) {
                        var data_for_old_unity_version = poseInfo;
                        data_for_old_unity_version.modelViewMatrix = validMatrix;
                        data_for_old_unity_version.projectionMatrix = poseInfo.projectionMatrix;
                        data_for_old_unity_version.realProjectionMatrix = poseInfo.realProjectionMatrix;

                        //console.log(poseInfo.cameraPoseMatrix);
                        //console.log(poseInfo.projectionMatrix);
                        //console.log("received resolution: " , poseInfo.resolution.width , "," , poseInfo.resolution.height);
                        //console.log('socket viewer resolution: ',socket.viewer_width , ",",socket.viewer_height);

                        if ((socket.viewer_width != poseInfo.resolution.width) || (socket.viewer_height != poseInfo.resolution.height)) {

                            socket.viewer_width = poseInfo.resolution.width;
                            socket.viewer_height = poseInfo.resolution.height;
                            console.log('change in resolution: ');
                            console.log('setting unity resolution from valid matrix to: ' + socket.viewer_width + ',' + socket.viewer_height);
                            for (let station of stations) {
                                station.emit('resolution', '' + socket.viewer_width + ',' + socket.viewer_height);
                            }
                        }



                        data_for_old_unity_version = JSON.stringify(data_for_old_unity_version);
                        //console.log('sending pose vuforia desktop');
                        for (let station of stations) {
                            station.emit('poseVuforiaDesktop', data_for_old_unity_version);
                        }
                    }

                } catch (e) {
                    console.log('error! could not parse pose info: ' + e);
                }
            }



        });




        //viewer pose information (from vuforia matrix):
        socket.on('poseVuforiaOld', function(data) {
            //console.log('sending pose information from phone to station');
            //console.log('received position from viewer: ' + socket.id + " " + data);
            //console.log('current viewer is: ' + viewers[0].id);
            //console.log('pose vuforia phone: ' + data);

            for (let station of stations) {
                //console.log('sending viewer data to station from: ' + socket.id + " " + data);
                //console.log('station is not null, desktop connected hack: ' + desktop_connected_hack);
                if (desktop_connected_hack == 0) {
                    station.emit('poseVuforia', data);
                }
            }
        });

        socket.on('poseVuforiaDesktop', function(data) {
            //console.log('pose vuforia desktop: ' + data);
            if (desktop_connected_hack == 1) {
                for (let station of stations) {
                    station.emit('poseVuforiaDesktop', data);
                }
            }
        });

        socket.on('debug', function(data) {
            console.log('viewer debug: ' + data);
        });

        socket.on('startPing', function(data) {
            console.log('received start ping from object. emitting data to station');
            //console.log(data);
            for (let station of stations) {
                station.emit('ping', data);
            }
        });

        socket.on('stationPong', function(data) {
            //console.log('got data from station');
            for (let viewer of viewers) {
                viewer.emit('endPong', data);
            }
        });

        socket.on('pong2', function(_data) {
            //console.log('got pong!')
            var d = new Date();
            toc = d.getTime();
            console.log('round trip ping pong: ' + (toc - tic) + ' ms');
        });

        //reality zone vuforia module:
        socket.on('vuforiaModuleUpdate_system_server', function(data) {
            //console.log('received vuforia module update: ' + data);
            if (viewers.length > 0) {
                //console.log('data after parsing json: ');
                //console.log(JSON.parse(data));
                //data = JSON.stringify(JSON.parse(data));
                data = JSON.parse(data);

                var zoneMatrixMessage = {
                    action: 'zoneMatrixMessage',
                    matrices: data,
                    ip: ip.address(),
                    port: 3020
                };

                utilities.actionSender(JSON.stringify(zoneMatrixMessage));
            }
        });



        //custom vuforia server:
        socket.on('vuforiaImage_system_server', function(data) {
            console.log('image received from system');
            console.log('data length: ' + data.length);
            console.log('first 100: ' + data.substring(0, 99));
            if ((vuforiaCamClient != null)) {
                //if((vuforiaCamClient != null) && (vuforiaResultClient!=null)){
                console.log('passing image to vuforia camera');
                vuforiaCamClient.emit('cameraData_server_vuforiaCameraClient', data);
            } else {
                console.log('could not find vuforia camera');
                var response = new Object();
                response.message = 'there was no vuforia cam processor';
                socket.emit('vuforiaResult_server_system', JSON.stringify(response));
            }
        });

        socket.on('vuforiaResult_vuforiaResultClient_server', function(data) {
            if (stations.length === 0) {
                console.log('ERROR: received vuforia result but there is not reality-zone unity system connected');
                return;
            }

            for (let station of stations) {
                station.emit('vuforiaResult_server_system', data);
            }
        });
    });

    http.listen(3020, function() {
        console.log('listening on *:3020');
    });
}
