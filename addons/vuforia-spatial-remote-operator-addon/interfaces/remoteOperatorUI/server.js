const cors = require('cors');
const express = require('express');
const expressWs = require('express-ws');
const makeStreamRouter = require('./makeStreamRouter.js');
const path = require('path');
const os = require('os');
const server = require('@libraries/hardwareInterfaces');

let DEBUG_DISABLE_VIDEO_RECORDING = os.platform() === 'ios';

let VideoServer;
if (!DEBUG_DISABLE_VIDEO_RECORDING) {
    try {
        VideoServer = require('./VideoServer.js');
    } catch (e) {
        console.warn('VideoServer unavailable', e);
        DEBUG_DISABLE_VIDEO_RECORDING = true;
    }
}

module.exports.start = function start() {
    const app = express();

    const identityFolderName = '.identity';
    const DEVICE_ID_PREFIX = 'device';

    app.use(cors());
    expressWs(app);
    const streamRouter = makeStreamRouter(app);

    // rgb+depth videos are stored in the Documents/spatialToolbox/.identity/virtualizer_recordings
    let videoServer = null;
    if (!DEBUG_DISABLE_VIDEO_RECORDING) {
        videoServer = new VideoServer(path.join(server.getObjectsPath(), identityFolderName, '/virtualizer_recordings'));
        // trigger events in VideoServer whenever sockets connect, disconnect, or send data
        streamRouter.onFrame((rgb, depth, pose, deviceId) => {
            videoServer.onFrame(rgb, depth, pose, DEVICE_ID_PREFIX + deviceId);
        });
        streamRouter.onConnection((deviceId) => {
            videoServer.onConnection(DEVICE_ID_PREFIX + deviceId);
        });
        streamRouter.onDisconnection((deviceId) => {
            videoServer.onDisconnection(DEVICE_ID_PREFIX + deviceId);
        });
        streamRouter.onError((deviceId) => {
            console.log('on error: ' + deviceId); // haven't seen this trigger yet but probably good to also disconnect
            videoServer.onDisconnection(DEVICE_ID_PREFIX + deviceId);
        });
    }

    let allWebsockets = [];
    let sensorDescriptions = {};

    function broadcast(broadcaster, msgStr) {
        for (let ws of allWebsockets) {
            if (ws === broadcaster) {
                continue;
            }
            ws.send(msgStr);
        }
    }

    let activeSkels = {};

    function requestId(req) {
        return parseInt(req.ip.split(/\./g)[3]);
    }

    app.ws('/', (ws, req) => {
        console.log('an attempt /');
        allWebsockets.push(ws);
        let wsId = '' + (Math.random() * 9999);
        let deviceId = requestId(req);

        ws.addEventListener('close', () => {
            allWebsockets = allWebsockets.filter(a => a !== ws);
        });

        let playback = null;
        ws.on('message', (msgStr, _isBinary) => {

            try {
                const msg = JSON.parse(msgStr);
                switch (msg.command) {
                case '/update/humanPoses':
                    doUpdateHumanPoses(msg);
                    break;
                case '/update/sensorDescription':
                    doUpdateSensorDescription(msg);
                    break;
                case '/videoRecording/start':
                    if (videoServer) {
                        videoServer.startRecording(DEVICE_ID_PREFIX + deviceId);
                    }
                    break;
                case '/videoRecording/stop':
                    if (videoServer) {
                        videoServer.stopRecording(DEVICE_ID_PREFIX + deviceId);
                    }
                    break;
                }
            } catch (error) {
                console.warn('Could not parse message: ', error);
            }

        });

        let cleared = false;
        function doUpdateHumanPoses(msg) {
            if (playback && !playback.running) {
                playback = null;
            }
            if (msg.hasOwnProperty('length')) {
                msg = {
                    time: Date.now(),
                    pose: msg,
                };
            }
            let poses = msg.pose;
            for (let skel of poses) {
                activeSkels[skel.id] = {
                    msgId: wsId,
                    skel,
                    lastUpdate: Date.now(),
                };
            }
            for (let activeSkel of Object.values(activeSkels)) {
                if (activeSkel.skel.joints.length === 0 ||
                    Date.now() - activeSkel.lastUpdate > 1500) {
                    delete activeSkels[activeSkel.skel.id];
                    continue;
                }
                if (activeSkel.msgId !== wsId) {
                    poses.push(activeSkel.skel);
                }
            }
            if (poses.length === 0) {
                if (cleared) {
                    return;
                } else {
                    cleared = true;
                }
            } else {
                cleared = false;
            }

            if (!playback) {
                broadcast(ws, JSON.stringify(msg));
            }

            processSensorActivations(ws, poses);
        }

        function doUpdateSensorDescription(desc) {
            sensorDescriptions[desc.id] = JSON.parse(JSON.stringify(desc)); // desc;
            // const t = desc.x;
            // desc.x = -desc.x;
            // desc.z = -desc.z;
            console.log('sensorDesc', desc);
            // sock.broadcast.emit('/update/sensorDescription', JSON.stringify(desc));
            broadcast(ws, JSON.stringify(desc));
        }

        function processSensorActivations(ws, poses) {
            // for (let pose of poses) {
            //     for (let joint of pose.joints) {
            //         joint.z = -joint.z;
            //     }
            // }

            for (let id in sensorDescriptions) {
                let sensorDesc = sensorDescriptions[id];
                let oldCount = sensorDesc.count;
                sensorDesc.count = 0;

                for (let pose of poses) {
                    for (let joint of pose.joints) {
                        if (joint.x < sensorDesc.x - sensorDesc.width / 2) {
                            continue;
                        }
                        if (joint.x > sensorDesc.x + sensorDesc.width / 2) {
                            continue;
                        }
                        if (joint.y < sensorDesc.y - sensorDesc.height / 2) {
                            continue;
                        }
                        if (joint.y > sensorDesc.y + sensorDesc.height / 2) {
                            continue;
                        }
                        if (joint.z < sensorDesc.z - sensorDesc.depth / 2) {
                            continue;
                        }
                        if (joint.z > sensorDesc.z + sensorDesc.depth / 2) {
                            continue;
                        }

                        sensorDesc.count += 1;
                        break;
                    }
                }

                let sendActivation = oldCount !== sensorDesc.count || Math.random() < 0.03;

                if (sendActivation) {
                    // console.log('yey', sensorDesc);
                    broadcast(ws, JSON.stringify({
                        command: '/update/sensorActivation',
                        id: sensorDesc.id,
                        count: Math.floor(sensorDesc.count),
                        active: sensorDesc.count > 0,
                    }));
                }
            }
        }

    });

    app.listen(31337);
};
