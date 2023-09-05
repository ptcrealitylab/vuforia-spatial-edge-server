createNameSpace('realityEditor.device');


(function (exports) {

// this port number and local IP MUST match the nerfStudio port
// remember to change this hard-coded URL anytime you change wifi networks / your IP changes
// we can use localhost if you are only going to run the demo on this PC, but needs to
// be the public IP address if you want to load the demo on another laptop
const NERF_STUDIO_WEBSOCKET_URL = 'ws://localhost:7003';
const DEBUG_CAMERA_MESSAGE = false;

const ICE_SERVERS = [
    {
        urls: 'stun:toolboxedge.net:3478',
        username: 'test',
        credential: 'uWmkoS44agy7GTN',
    },
    { urls: 'stun:stun.l.google.com:19302' },
    // {
    // urls: 'stun:openrelay.metered.ca:80',
    // },
    // {
    // urls: 'turn:openrelay.metered.ca:80',
    // username: 'openrelayproject',
    // credential: 'openrelayproject',
    // },
    {
        urls: 'turn:toolboxedge.net:3478',
        username: 'test',
        credential: 'uWmkoS44agy7GTN',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
       credential: 'openrelayproject',
    },
    // {
    // urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    // username: 'openrelayproject',
    // credential: 'openrelayproject',
    // },
];

class NerfStudioConnection {
    constructor() {
        this.isEnabled = false;
        this.websocket = null;
        this.peerConnection = {};
        this.callbacks = {
            onTurnOn: null,
            //onTurnOff: null
        }
    }

    // turn on to create a new websocket for the camera messages, and a new RTCPeerConnection for the images
    turnOn(callback) {
        this.isEnabled = true;
        if (callback) {
            this.callbacks.onTurnOn = callback;
        }
        this.connect();
    }

    // turn off to stop sending camera messages over the websocket
    turnOff(_callback) {
        this.isEnabled = false;
        //if (callback) {
        //    this.callbacks.onTurnOff = callback;
        //}
    }

    // runs the first time you turnOn - creates the websocket and webrtc connection
    connect() {
        if (this.websocket) {
            if (typeof this.callbacks.onTurnOn === 'function') {
                this.callbacks.onTurnOn();
                console.log('turn on (again)');
            }
            return;
        };

        // I think we need to use a standard WebSocket, because socket.io can't send messages encoded by msgpack in the format nerfstudio expects
        this.websocket = new WebSocket(NERF_STUDIO_WEBSOCKET_URL);

        this.websocket.onopen = (e => {
            console.log('Yuanzhi opened connection to nerf studio');
            // we can only establish the webrtc connection after the websocket is ready
            this.establishWebRTCConnection();
        });

        this.websocket.onclose = (e => {
            console.log('Yuanzhi closed connection to nerf studio');
        });

        this.websocket.onerror = (e => {
            console.error('error with nerfstudio websocket', e);
        });
    }

    // this will send a message that will trigger the nerfstudio/viewer/server/server.py, line 52 (on_message)
    sendCameraToNerfStudio(cameraMatrix) {
        if (!this.isEnabled) return;
        if (!this.websocket) {
            console.log('cannot send message, nerf websocket not initialized');
            return;
        }
        if (this.websocket.readyState !== 1) {
            console.log('websocket readyState is not CONNECTED');
            return;
        }

        // this is a value of the camera taken from the nerfstudio viewer, can be used as reference.
        // it makes me think that the units are meters, not mm, so scale the cameraMatrix translation
        //   values down by 1000 before passing into this function.
        // let defaultMatrix = [
        //     0.8768288709363371, -0.48080259056343316, 0, 0,
        //     0.3139440447617337, 0.5725326936841874, 0.7573938548875155, 0,
        //     -0.36415692750674244, -0.6641047986351402, 0.6529583053906498, 0,
        //     -0.4129898476856783, -0.7473400792058696, 0.6822817432737595, 1
        // ];

        const aspectValue = window.innerWidth/window.innerHeight;
        const cam_fov = 41.22673;
        let message = {
            type: 'write', //'toolbox', // the server switches thru type to handle the message differently
            path: 'renderingState/camera', // the server applies the data to the object specified by this path
            data: {
                metadata: {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                object: {
                    "uuid": "15a0a777-f847-40e6-be32-46ce6af1d19d",
                    "type": "PerspectiveCamera",
                    "layers": 1,
                    "matrix": (cameraMatrix), // || defaultMatrix),
                    "fov": cam_fov, // todo: calculate correct value
                    "zoom": 1, // todo: calculate correct value
                    "near": 0.1, // todo: calculate correct value
                    "far": 1000, // todo: calculate correct value
                    "focus": 10,
                    "aspect": aspectValue, // todo: calculate correct value
                    "filmGauge": 35,
                    "filmOffset": 0,
                    "timestamp": Date.now(), //1674073427950,
                    "camera_type": "perspective",
                    "render_aspect": 1/aspectValue // todo: calculate correct value
                }
            }
        };
        
        if (DEBUG_CAMERA_MESSAGE) {
            console.log('send message to nerf studio', message);
        }

        // TODO: do we also need to send to path: 'renderingState/camera_choice'
        const encodedMessage = msgpack.encode(message);
        this.websocket.send(encodedMessage);
    }

    establishWebRTCConnection() {
        console.log('establishWebRTCConnection');

        this.peerConnection.current = this.getRTCPeerConnection((dispatchedResult) => {
            console.log('[webrtc] dispatched', dispatchedResult);
        });

        console.log('[webrtc] starting process');
        
        this.sendOffer();

        this.websocket.addEventListener('message', (originalCmd) => {
            try {
                // NOTE: nerfstudio uses the python "tornado" websocket library to encode the utf-8 webrtc/answer as a binary Blob
                // for whatever reason, the regular Blob decoding method on the dataByteArray from this Blob isn't working for me
                let dataByteArray = new Uint8Array(originalCmd.data);

                // as a result, I am doing some very janky processing of the blob.text() in order to extract the webrtc sdp if I detect that it is an /answer message

                originalCmd.data.text().then(blobText => {
                    // console.log('blobText');
                    // console.log(blobText);
                    if (blobText.split('data:').length > 1) {
                        // todo: this code is no longer needed, it was debugging some test images coming over the websocket
                        // let imageUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(blobText.split('data:')[1].split('base64,')[1]);
                        // console.log('got imageUrl from nerf websocket', imageUrl);
                        // let nerfCanvas = document.getElementById('nerfCanvas');
                        // if (nerfCanvas && imageUrl) {
                        //     nerfCanvas.src = imageUrl;
                        // }
                    } else {
                        if (blobText.includes('path') && blobText.includes('write') &&
                            blobText.includes('answer') && blobText.includes('data'))
                            {
                                console.log('[webrtc] received answer');

                                let sdp = unescape(escape(blobText.split('data')[1]).replaceAll('%uFFFD', '')).replace('typeanswer', '').replace('sdp\x04', '');
                                if (sdp.charAt(0) !== 'v' && sdp.split('v=').length > 1) {
                                    sdp = `v=${sdp.split('v=')[1]}`; // remove the first >, @, etc characters before v=0
                                }
                                // sdp = sdp.replace('@', ''); // remove the first @ sign from the text, if it begins with one

                                // const answer = blobText.split('data')[1];
                                const answer = {
                                    type: 'answer',
                                    sdp: sdp
                                }

                                console.log(answer);
                                if (answer !== null && sdp && sdp.length > 0) {
                                    try {
                                        this.peerConnection.current.setRemoteDescription(answer);
                                        console.log('successfully set description from answer');
                                        if (typeof this.callbacks.onTurnOn === 'function') {
                                            this.callbacks.onTurnOn();
                                            console.log('done turning on (first time)');
                                        }
                                    } catch (e) {
                                        console.error('error setting peerConnection remote description from answer', error, answer);
                                    }
                                }
                            }
                    }
                    // realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
                });
                // if (dataByteArray.byteLength === 0) {
                //     // console.log( ' [ websocket ] skip empty byte array');
                //     return;
                // }

                // console.log(' [ websocket ] ', originalCmd);

                // // set the remote description when the offer is received
                // const cmd = msgpack.decode(dataByteArray);
                // if (cmd.path === '/webrtc/answer') {
                //     console.log('[webrtc] received answer');
                //     const answer = cmd.data;
                //     console.log(answer);
                //     if (answer !== null) {
                //         this.peerConnection.current.setRemoteDescription(answer);
                //     }
                // }
            } catch (err) {
                console.warn(err);
            }
        });
    }

    getRTCPeerConnection(dispatch) {
        console.log('getRTCPeerConnection');

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
        });
        // connect video
        pc.addEventListener('track', (evt) => {
        if (evt.track.kind === 'video') {
            let localVideoRef = document.getElementById('nerfCanvas'); // note: it is named "canvas" but it's actually a video element now
            if (localVideoRef) {
                // also note: this only works if the video element has autoplay=true
                [localVideoRef.srcObject] = evt.streams; // uses array destructuring
            }
        }
        });
        pc.addTransceiver('video', { direction: 'recvonly' });

        // for updating the status of the peer connection
        pc.oniceconnectionstatechange = () => {
            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
            console.log(`[webrtc] connectionState: ${pc.connectionState}`);
            if (
                pc.connectionState === 'connecting' ||
                pc.connectionState === 'connected'
            ) {
                console.log('[webrtc] connected');
                dispatch({
                type: 'write',
                path: 'webrtcState/isConnected',
                data: true,
                });
            } else {
                dispatch({
                type: 'write',
                path: 'webrtcState/isConnected',
                data: false,
                });
            }
        };

        pc.onclose = () => {
            dispatch({
                type: 'write',
                path: 'webrtcState/isConnected',
                data: false,
            });
        };

        return pc;
    }

    sendOffer() {
        this.peerConnection.current.createOffer().then((offer) => {
            console.log('[webrtc] created offer');
            console.log(offer);
            return this.peerConnection.current.setLocalDescription(offer);
        })
        .then(() => {
            // wait for ICE gathering to complete
            console.log('[webrtc] set local description');
            return new Promise((resolve) => {
                if (this.peerConnection.current.iceGatheringState === 'complete') {
                    console.log('[webrtc] ICE gathering complete');
                    resolve();
                } else {
                    const checkState = () => {
                        console.log(
                        `[webrtc] iceGatheringState: ${this.peerConnection.current.iceGatheringState}`,
                        );
                        if (this.peerConnection.current.iceGatheringState === 'complete') {
                        this.peerConnection.current.removeEventListener(
                            'icegatheringstatechange',
                            checkState,
                        );
                        resolve();
                        }
                    };
                    console.log(
                        '[webrtc] adding listener for `icegatheringstatechange`',
                    );
                    this.peerConnection.current.addEventListener(
                        'icegatheringstatechange',
                        checkState,
                    );
                }
            });
        })
        .then(() => {
            // send the offer
            console.log('[webrtc] sending offer');
            const offer = this.peerConnection.current.localDescription;
            const cmd = 'write';
            const path = 'webrtc/offer';
            const data = {
                type: cmd,
                path,
                data: {
                sdp: offer.sdp,
                type: offer.type,
                },
            };
            const message = msgpack.encode(data);
            this.websocket.send(message);
        });
    };
}

exports.NerfStudioConnection = NerfStudioConnection;

})(realityEditor.device);
