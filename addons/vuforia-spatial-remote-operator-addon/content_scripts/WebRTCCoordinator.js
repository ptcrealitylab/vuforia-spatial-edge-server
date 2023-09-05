createNameSpace('realityEditor.device.cameraVis');

import RVLParser from '../../thirdPartyCode/rvl/RVLParser.js';

(function(exports) {
    const PROXY = /(\w+\.)?toolboxedge.net/.test(window.location.host);
    const DEPTH_REPR_FORCE_PNG = false;
    const DEBUG = false;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    class WebRTCCoordinator {
        constructor(cameraVisCoordinator, ws, consumerId) {
            this.cameraVisCoordinator = cameraVisCoordinator;
            this.ws = ws;
            this.audioStream = null;
            this.consumerId = consumerId;
            this.muted = false;

            this.webrtcConnections = {};

            this.onWsOpen = this.onWsOpen.bind(this);
            this.onWsMessage = this.onWsMessage.bind(this);
            this.onToolsocketMessage = this.onToolsocketMessage.bind(this);

            if (!PROXY) {
                this.ws.addEventListener('open', this.onWsOpen);
                this.ws.addEventListener('message', this.onWsMessage);
            } else {
                this.ws.on('message', this.onToolsocketMessage);
                this.ws.message('unused', {id: 'signalling'}, null, {
                    data: encoder.encode(JSON.stringify({
                        command: 'joinNetwork',
                        src: this.consumerId,
                        role: 'consumer',
                    })),
                });
            }

            navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    noiseSuppression: true,
                },
            }).then((stream) => {
                this.audioStream = this.improveAudioStream(stream);
                this.updateMutedState();
                for (let conn of Object.values(this.webrtcConnections)) {
                    conn.audioStream = this.audioStream;
                    conn.localConnection.addStream(conn.audioStream);
                }
            });
        }

        improveAudioStream(stream) {
            const context = new AudioContext();
            const src = context.createMediaStreamSource(stream);
            const dst = context.createMediaStreamDestination();
            const gainNode = context.createGain();
            gainNode.gain.value = 6;
            src.connect(gainNode);
            gainNode.connect(dst);
            return dst.stream;
        }

        updateMutedState() {
            if (!this.audioStream) return;
            for (let track of this.audioStream.getTracks()) {
                track.enabled = !this.muted;
            }
        }

        mute() {
            this.muted = true;
            this.updateMutedState();
        }

        unmute() {
            this.muted = false;
            this.updateMutedState();
        }

        onWsOpen() {
            this.ws.send(JSON.stringify({
                command: 'joinNetwork',
                src: this.consumerId,
                role: 'consumer',
            }));
        }

        onWsMessage(event) {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                console.warn('ws parse error', e, event);
                return;
            }
            if (DEBUG) {
                console.log('webrtc msg', msg);
            }

            if (msg.command === 'joinNetwork') {
                if (msg.role === 'provider') {
                    this.initConnection(msg.src);
                }
                return;
            }

            if (msg.command === 'discoverPeers' && msg.dest === this.consumerId) {
                for (let provider of msg.providers) {
                    this.initConnection(provider);
                }
                for (let consumer of msg.consumers) {
                    if (consumer !== this.consumerId) {
                        this.initConnection(consumer);
                    }
                }
                return;
            }

            if (msg.dest !== this.consumerId) {
                if (DEBUG) {
                    console.warn('discarding not mine', msg);
                }
                return;
            }

            if (!this.webrtcConnections[msg.src]) {
                this.webrtcConnections[msg.src] = new WebRTCConnection(
                    this.cameraVisCoordinator,
                    this.ws,
                    this.audioStream,
                    this.consumerId,
                    msg.src
                );
                this.webrtcConnections[msg.src].initLocalConnection();
            }
            this.webrtcConnections[msg.src].onSignallingMessage(msg);
        }

        onToolsocketMessage(route, body, cbObj, bin) {
            if (body.id !== 'signalling') {
                return;
            }
            this.onWsMessage({data: decoder.decode(bin.data)});
        }

        initConnection(otherId) {
            const conn = this.webrtcConnections[otherId];
            const goodChannelStates = ['connecting', 'open'];

            if (conn) {
                // connection already as good as it gets
                if (conn.receiveChannel &&
                    goodChannelStates.includes(conn.receiveChannel.readyState)) {
                    return;
                }

                // This was initiated by the provider side, don't mess with it
                if (!conn.offered) {
                    return;
                }
            }

            let newConn = new WebRTCConnection(
                this.cameraVisCoordinator,
                this.ws,
                this.audioStream,
                this.consumerId,
                otherId,
            );

            this.webrtcConnections[otherId] = newConn;
            newConn.connect();
        }
    }

    class WebRTCConnection {
        constructor(cameraVisCoordinator, ws, audioStream, consumerId, providerId) {
            this.cameraVisCoordinator = cameraVisCoordinator;
            this.ws = ws;
            this.consumerId = consumerId;
            this.providerId = providerId;
            this.audioStream = audioStream;
            this.offered = false;

            this.receiveChannel = null;
            this.localConnection = null;

            this.onSignallingMessage = this.onSignallingMessage.bind(this);

            this.onReceiveChannelStatusChange =
                this.onReceiveChannelStatusChange.bind(this);
            this.onReceiveChannelMessage =
                this.onReceiveChannelMessage.bind(this);
            this.onSendChannelStatusChange =
                this.onSendChannelStatusChange.bind(this);
            this.onWebRTCError =
                this.onWebRTCError.bind(this);
        }

        async onSignallingMessage(msg) {
            if (msg.command === 'newIceCandidate') {
                if (DEBUG) {
                    console.log('webrtc remote candidate', msg);
                }
                this.localConnection.addIceCandidate(msg.candidate)
                    .catch(this.onWebRTCError);
                return;
            }

            if (msg.command === 'newDescription') {
                try {
                    await this.localConnection.setRemoteDescription(msg.description);
                    if (!this.offered) {
                        let answer = await this.localConnection.createAnswer();
                        await this.localConnection.setLocalDescription(answer);
                        this.sendSignallingMessage({
                            src: this.consumerId,
                            dest: this.providerId,
                            command: 'newDescription',
                            description: this.localConnection.localDescription,
                        });
                    }
                } catch (e) {
                    this.onWebRTCError(e);
                }
            }
        }

        initLocalConnection() {
            this.localConnection = new RTCPeerConnection({
                iceServers: [{
                    urls: [
                        'stun:stun.l.google.com:19302',
                        'stun:stun4.l.google.com:19305',
                    ],
                }, {
                    urls: [
                        'turn:turn.meta.ptc.io:443'
                    ],
                    username: 'test',
                    credential: 'uWmkoS44agy7GTN',
                }],
            });

            this.receiveChannel = this.localConnection.createDataChannel(
                'sendChannel',
                {
                    ordered: false,
                    maxRetransmits: 0,
                },
            );
            this.receiveChannel.binaryType = 'arraybuffer';
            this.receiveChannel.onopen = this.onReceiveChannelStatusChange;
            this.receiveChannel.onclose = this.onReceiveChannelStatusChange;
            this.receiveChannel.addEventListener('message', this.onReceiveChannelMessage);

            if (this.audioStream) {
                this.localConnection.addStream(this.audioStream);
            } else {
                console.warn('missing audiostream');
            }

            this.localConnection.addEventListener('icecandidate', (e) => {
                if (DEBUG) {
                    console.log('webrtc local candidate', e);
                }

                if (!e.candidate) {
                    return;
                }

                this.sendSignallingMessage({
                    src: this.consumerId,
                    dest: this.providerId,
                    command: 'newIceCandidate',
                    candidate: e.candidate,
                });
            });

            this.localConnection.addEventListener('datachannel', (e) => {
                if (DEBUG) {
                    console.log('webrtc datachannel', e);
                }

                this.sendChannel = e.channel;
                this.sendChannel.addEventListener('open', this.onSendChannelStatusChange);
                this.sendChannel.addEventListener('close', this.onSendChannelStatusChange);
            });

            this.localConnection.addEventListener('track', (e) => {
                if (DEBUG) {
                    console.log('webrtc track event', e);
                }

                if (e.streams.length === 0) {
                    return;
                }
                const elt = document.createElement('video');
                // elt.style.position = 'absolute';
                // elt.style.top = 0;
                // elt.style.left = 0;
                // elt.style.zIndex = 10000;
                // elt.style.transform = 'translateZ(10000px)';
                // elt.controls = true;

                elt.autoplay = true;
                elt.srcObject = e.streams[0];
                let autoplayWhenAvailableInterval = setInterval(() => {
                    try {
                        elt.play();
                    } catch (err) {
                        if (DEBUG) {
                            console.log('autoplay failed', err);
                        }
                    }
                }, 250);
                elt.addEventListener('play', function clearAutoplayInterval() {
                    clearInterval(autoplayWhenAvailableInterval);
                    elt.removeEventListener('play', clearAutoplayInterval);
                });
                document.body.appendChild(elt);
            });
        }

        async connect() {
            if (!this.localConnection) {
                this.initLocalConnection();
            }

            this.offered = true;
            const offer = await this.localConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.localConnection.setLocalDescription(offer);

            this.sendSignallingMessage({
                src: this.consumerId,
                dest: this.providerId,
                command: 'newDescription',
                description: this.localConnection.localDescription,
            });
        }

        sendSignallingMessage(message) {
            if (PROXY) {
                this.ws.message('unused', {id: 'signalling'}, null, {
                    data: encoder.encode(JSON.stringify(message)),
                });
            } else {
                this.ws.send(JSON.stringify(message));
            }
        }


        onSendChannelStatusChange() {
            if (!this.sendChannel) {
                return;
            }

            const state = this.sendChannel.readyState;
            if (DEBUG) {
                console.log('webrtc onSendChannelStatusChange', state);
            }
        }

        onReceiveChannelStatusChange() {
            if (!this.receiveChannel) {
                return;
            }

            const state = this.receiveChannel.readyState;
            if (DEBUG) {
                console.log('webrtc onReceiveChannelStatusChange', state);
            }

            if (state === 'open') {
                // create cameravis with receiveChannel
            }
        }

        async onReceiveChannelMessage(event) {
            const id = this.providerId;
            let bytes = event.data;
            if (bytes instanceof ArrayBuffer) {
                bytes = new Uint8Array(event.data);
            }
            if (bytes.length === 0) {
                return;
            }

            if (bytes.length < 1000) {
                // const decoder = new TextDecoder();
                const matricesMsg = decoder.decode(bytes);
                // blah blah it's matrix
                const matrices = JSON.parse(matricesMsg);
                this.onMatrices(id, matrices);
                return;
            }

            if (DEPTH_REPR_FORCE_PNG) {
                switch (bytes[0]) {
                case 0xff: {
                    const imageUrl = URL.createObjectURL(new Blob([event.data], {type: 'image/jpeg'}));
                    // Color is always JPEG which has first byte 0xff
                    this.cameraVisCoordinator.renderPointCloud(id, 'texture', imageUrl);
                }
                    break;

                case 0x89: {
                    const imageUrl = URL.createObjectURL(new Blob([event.data], {type: 'image/png'}));
                    // Depth is always PNG which has first byte 0x89
                    this.cameraVisCoordinator.renderPointCloud(id, 'textureDepth', imageUrl);
                }
                    break;
                }
            } else {
                // jpeg start of image, chance of this happening from rvl is probably 0 but at most 1/(1 << 16)
                if (bytes[0] === 0xff && bytes[1] === 0xd8) {
                    const imageUrl = URL.createObjectURL(new Blob([event.data], {type: 'image/jpeg'}));
                    // Color is always JPEG which has first byte 0xff
                    this.cameraVisCoordinator.renderPointCloud(id, 'texture', imageUrl);
                // PNG header for depth just in case
                } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
                    const imageUrl = URL.createObjectURL(new Blob([event.data], {type: 'image/png'}));
                    this.cameraVisCoordinator.renderPointCloud(id, 'textureDepth', imageUrl);
                } else {
                    // if (!window.timings) {
                    //     window.timings = {
                    //         parseFrame: [],
                    //         parseDepth: [],
                    //         parseMats: [],
                    //         doMats: [],
                    //         doDepth: [],
                    //     };
                    // }
                    // let start = window.performance.now();
                    const parser = new RVLParser(bytes.buffer);
                    // let parseFrame = window.performance.now();
                    const rawDepth = parser.getFrameRawDepth(parser.currentFrame);
                    // let parseDepth = window.performance.now();
                    const matricesMsg = decoder.decode(parser.currentFrame.payload);
                    const matrices = JSON.parse(matricesMsg);
                    // let parseMats = window.performance.now();
                    this.onMatrices(id, matrices);
                    // let doMats = window.performance.now();
                    if (!rawDepth) {
                        console.warn('RVL depth unparsed');
                        return;
                    }
                    this.cameraVisCoordinator.renderPointCloudRawDepth(id, rawDepth);
                    // let doDepth = window.performance.now();
                    // window.timings.parseFrame.push(parseFrame - start);
                    // window.timings.parseDepth.push(parseDepth - parseFrame);
                    // window.timings.parseMats.push(parseMats - parseDepth);
                    // window.timings.doMats.push(doMats - parseMats);
                    // window.timings.doDepth.push(doDepth - doMats);
                }
            }
        }

        onMatrices(id, matrices) {
            let cameraNode = new realityEditor.sceneGraph.SceneNode(id + '-camera');
            cameraNode.setLocalMatrix(matrices.camera);
            cameraNode.updateWorldMatrix();

            let gpNode = new realityEditor.sceneGraph.SceneNode(id + '-gp');
            gpNode.needsRotateX = true;
            let gpRxNode = new realityEditor.sceneGraph.SceneNode(id + '-gp' + 'rotateX');
            gpRxNode.addTag('rotateX');
            gpRxNode.setParent(gpNode);

            const c = Math.cos(-Math.PI / 2);
            const s = Math.sin(-Math.PI / 2);
            let rxMat = [
                1, 0, 0, 0,
                0, c, -s, 0,
                0, s, c, 0,
                0, 0, 0, 1
            ];
            gpRxNode.setLocalMatrix(rxMat);

            // let gpNode = realityEditor.sceneGraph.getSceneNodeById(
            //     realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
            // if (!gpNode) {
            //     gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
            // }
            gpNode.setLocalMatrix(matrices.groundplane);
            gpNode.updateWorldMatrix();
            // gpRxNode.updateWorldMatrix();

            let sceneNode = new realityEditor.sceneGraph.SceneNode(id);
            sceneNode.setParent(realityEditor.sceneGraph.getSceneNodeById('ROOT'));

            let initialVehicleMatrix = [
                -1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, 1,
            ];

            sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
            sceneNode.updateWorldMatrix();

            let cameraMat = sceneNode.getMatrixRelativeTo(gpRxNode);
            this.cameraVisCoordinator.updateMatrix(id, new Float32Array(cameraMat), false, matrices);
        }

        onWebRTCError(e) {
            console.error('webrtc error', e);
        }

        disconnect() {
            this.sendSignallingMessage({
                src: this.consumerId,
                dest: this.providerId,
                command: 'leaveNetwork',
            });

            this.sendChannel.close();
            this.receiveChannel.close();

            this.localConnection.close();

            this.sendChannel = null;
            this.receiveChannel = null;
            this.localConnection = null;
        }
    }

    exports.WebRTCCoordinator = WebRTCCoordinator;
})(realityEditor.device.cameraVis);

