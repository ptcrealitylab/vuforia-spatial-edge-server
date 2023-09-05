const axios = require('axios');
const FormData = require('form-data');
const ToolSocket = require('toolsocket');
const io = require('socket.io');
const os = require('os');
const WebSocket = require('ws');

const {log} = require('./utilities.js');
const schemas = require('./schemas.js');
const allowLists = require('./allowLists.js');

const DEBUG = false;

class Cloud {
    constructor(server, setSetting) {
        this.server = server;
        this.setSetting = setSetting;

        this.webSocket = null;
        this.serverUrl = 'toolboxedge.net';
        this.serverPort = 443;
        this.networkUUID = '';
        this.networkSecret = '';
        this.origin = 'edge';
        this.postBuffers = {};
        this.agentEdge = null;

        this.onWebSocketOpen = this.onWebSocketOpen.bind(this);
        this.onWebSocketIo = this.onWebSocketIo.bind(this);
        this.onWebSocketGet = this.onWebSocketGet.bind(this);
        this.onWebSocketPost = this.onWebSocketPost.bind(this);
        this.onWebSocketDelete = this.onWebSocketDelete.bind(this);
        this.onWebSocketAction = this.onWebSocketAction.bind(this);
        this.onWebSocketClose = this.onWebSocketClose.bind(this);
    }

    closeConnection() {
        try {
            if (this.webSocket) {
                this.webSocket.close();
            }
        } catch (error) {
            console.error('webSocket close failed', error);
        }
        this.setSetting('isConnected', false);
    }

    openSocket() {
        const wsURL = 'wss://' + this.serverUrl + ':' + this.serverPort;

        this.closeConnection();

        try {
            this.webSocket = new ToolSocket(wsURL, this.networkUUID, this.origin);

            this.webSocket.on('status', (status) => {
                this.setSetting('isConnected', status === this.webSocket.OPEN);
            });

            this.webSocket.on('error', function(e) {
                console.error('cant open the socket', wsURL, e.message);
            });

            this.service();
        } catch (e) {
            console.error('not a working url', e);
        }
    }

    isSocketOpen() {
        return this.webSocket && this.webSocket.readyState === this.webSocket.OPEN;
    }

    connectDesktopSocket(identifier, ip) {
        const dsPort = os.platform() === 'ios' ? 58081 : 8081; // remoteOperatorUI interface creates its own socket.io server on this port
        const conn = io(`http://${ip}:${dsPort}/`);
        const ioRoutes = [
            'visibleObjects',
            'udpMessage',
            '/matrix/visibleObjects',
            '/update/node',
            '/update/frame',
            '/update/object',
        ];

        for (const ioRoute of ioRoutes) {
            conn.on(ioRoute, (msg) => {
                if (DEBUG) {
                    console.log('io -> toolsocket', msg);
                }
                this.webSocket.io(ioRoute, msg);
            });
        }
    }

    connectSpecialUrls(identifier, ip) {
        const wsPort = 31337;
        const specialUrls = [
            {id: 'color', url: `ws://${ip}:${wsPort}/color`},
            {id: 'depth', url: `ws://${ip}:${wsPort}/depth`},
            {id: 'matrix', url: `ws://${ip}:${wsPort}/matrix`},
            {id: 'signalling', url: `ws://${ip}:${wsPort}/signalling`},
            {id: 'root', url: `ws://${ip}:${wsPort}/`},
        ];

        for (const specialUrl of specialUrls) {
            try {
                const ws = new WebSocket(specialUrl.url);
                const decoder = new TextDecoder();
                const encoder = new TextEncoder();
                ws.addEventListener('message', msg => {
                    if (!this.isSocketOpen()) {
                        console.error('websocket unexpectedly closed', this);
                        return;
                    }

                    if (DEBUG) {
                        console.log('websocket -> toolSocket', msg.data);
                    }
                    this.webSocket.message(this.getIoTitle(identifier, '/wsShim'), {id: specialUrl.id}, null, {
                        data: encoder.encode(msg.data),
                    });
                });

                ws.addEventListener('open', () => {
                    if (DEBUG) {
                        console.log('webSocket open for toolSocket', specialUrl);
                    }
                });

                let knownClientPeerIds = {};

                this.webSocket.on('message', (route, body, cbObj, bin) => {
                    if (ws.readyState !== WebSocket.OPEN) {
                        console.warn('WebSocket message received while forwarding channel not open', ws.readyState);
                        return;
                    }
                    if (specialUrl.id === 'signalling') {
                        if (route === 'leaveNetwork') {
                            if (knownClientPeerIds.hasOwnProperty(body.clientId)) {
                                ws.send(JSON.stringify({
                                    command: 'leaveNetwork',
                                    src: knownClientPeerIds[body.clientId],
                                }));
                            }
                            return;
                        }

                        try {
                            let msg = JSON.parse(decoder.decode(bin.data));
                            if (msg.command === 'joinNetwork') {
                                knownClientPeerIds[body.clientId] = msg.src;
                            }
                        } catch (e) {
                            console.warn('unknown signalling payload', e, route, body, bin.data);
                        }
                    }

                    if (body.id === specialUrl.id) {
                        if (DEBUG) {
                            console.log('toolSocket -> websocket', body, decoder.decode(bin.data));
                        }
                        try {
                            ws.send(decoder.decode(bin.data));
                        } catch (e) {
                            console.error('unable to send special payload', e, ws, bin);
                        }
                    }
                });

                ws.addEventListener('error', e => {
                    console.error('websocket error', e);
                });
            } catch (e) {
                console.error('unhandled error', e);
            }
        }
    }

    /**
     * Adds listeners to cloud.webSocket for coordinating incoming messages
     * from the cloud
     */
    service() {
        this.webSocket.on('open', this.onWebSocketOpen);
        this.webSocket.on('io', this.onWebSocketIo);
        this.webSocket.on('get', this.onWebSocketGet);
        this.webSocket.on('post', this.onWebSocketPost);
        this.webSocket.on('delete', this.onWebSocketDelete);
        this.webSocket.on('action', this.onWebSocketAction);
        this.webSocket.on('close', this.onWebSocketClose);
    }

    onWebSocketOpen() {
        log('websocket Opened');

        this.webSocket.keys('secret', {n: this.networkUUID, s: this.networkSecret});
    }

    onWebSocketIo(route, msg, data) {
        log('agent.cloud.webSocket io', route, msg);
        let thisO = ToolSocket.parseUrl(route, schemas.jsonFromURLRouteSchema);
        if (!thisO) {
            return;
        }
        if (!this.agentEdge.edgeLookup.hasOwnProperty(thisO.i)) {
            return;
        }
        // todo after testing activate secret for readAccess requests
        if (thisO.route === '/object') {
            thisO.route = 'object';
        } else if (thisO.route === '/object/publicData') {
            thisO.route = 'object/publicData';
        } else if (thisO.route === '/node/setup') {
            thisO.route = 'node/setup';
        } else if (thisO.route === '/block/setup') {
            thisO.route = 'block/setup';
        } else if (thisO.route === '/block/publicData') {
            thisO.route = 'block/publicData';
        }

        // make sure that only allowed routes are forwarded
        let allowList = allowLists.ioToEdgeAllowList;

        if (this.networkSecret && thisO.s === this.networkSecret) {
            allowList = allowLists.ioToEdgeReadAccessAllowList;
        }
        if (!allowList.includes(thisO.route)) {
            console.warn('Blocked route', thisO.route);
            return;
        }

        //todo make sure that only acceptable packages are incoming.
        this.agentEdge.connectSocket(thisO.i);
        // console.log(thisO.route)
        // making sure that the connection is compatible with toolbox edge server

        const edgeLookup = this.agentEdge.edgeLookup;
        if (edgeLookup[thisO.i].socketOpen) {
            log('<-edge-- [' + thisO.route + '] [' + msg + ']');
            edgeLookup[thisO.i].socket.io(thisO.route, msg, data);
        } else {
            // make sure any last message of a kind of route is stored until socket open.
            if (!edgeLookup[thisO.i].buffer) {
                edgeLookup[thisO.i].buffer = {};
            }

            if (!edgeLookup[thisO.i].buffer[thisO.route]) {
                edgeLookup[thisO.i].buffer[thisO.route] = [];
            }

            edgeLookup[thisO.i].buffer[thisO.route].push(msg);
            log('cant send anything: ' + thisO.route);
        }
    }

    onWebSocketGet(route, msg, res) {
        const getStart = Date.now();
        log('agent.cloud.webSocket get', route, msg, res);

        let thisO = ToolSocket.parseUrl(route, schemas.jsonFromURLRouteSchema);
        if (!thisO) {
            console.warn('unable to parse url', route);
            return;
        }
        if (!thisO.route) {
            thisO.route = '/';
        }
        const edgeLookup = this.agentEdge.edgeLookup;
        if (!edgeLookup.hasOwnProperty(thisO.i)) {
            console.warn('unknown identifier?', edgeLookup, thisO);
            // Default the unknown identifier to the first known edge server
            // TODO: this is a hack to enable the metaverseManager to connect
            // to the edge server without also connecting to a websocket for
            // heartbeat messages
            thisO.i = Object.keys(edgeLookup)[0];
        }
        let requestURL = 'http://' + edgeLookup[thisO.i].ip + ':' + edgeLookup[thisO.i].port + thisO.route;
        if (thisO.hasOwnProperty('query')) requestURL = requestURL + '?' + thisO.query;
        log('agent.cloud.webSocket get requestURL', requestURL);
        if (thisO.hasOwnProperty('type')) {
            axios({
                method: 'get',
                url: requestURL,
                responseType: 'arraybuffer',
                timeout: 5000,
            }).then(function (response) {
                log('agent.cloud.webSocket get send start', route, msg, Date.now() - getStart);
                res.send(thisO.type, {data: response.data});
                log('agent.cloud.webSocket get sent', route, msg, Date.now() - getStart);
            }).catch(function (error) {
                console.warn('agent get error', error.message, requestURL);
                if (error && error.response) {
                    res.send(error.response.status);
                } else {
                    res.send(500);
                }
            });
        } else {
            axios({
                method: 'get',
                url: requestURL,
                responseType: 'json',
                timeout: 5000,
            }).then(function (response) {
                log('agent.cloud.webSocket get send start', route, msg, Date.now() - getStart);
                res.send(response.data);
                log('agent.cloud.webSocket get sent', route, msg, Date.now() - getStart);
            }).catch(function (error) {
                console.warn('agent get json error', error.message, requestURL);
                if (error && error.response) {
                    res.send(error.response.status);
                } else {
                    res.send(500);
                }
            });

        }
    }

    onWebSocketPost(route, msg, res, data) {
        log('agent.cloud.webSocket post', route, msg, data);

        let thisO = ToolSocket.parseUrl(route, schemas.jsonFromURLRouteSchema);
        if (!thisO) {
            return;
        }

        if (!thisO.route) {
            thisO.route = '/';
        }

        let edgeLookup = this.agentEdge.edgeLookup;
        if (!edgeLookup.hasOwnProperty(thisO.i)) {
            return;
        }

        let requestURL = 'http://' + edgeLookup[thisO.i].ip + ':' + edgeLookup[thisO.i].port + thisO.route;

        if (thisO.hasOwnProperty('query')) {
            requestURL = requestURL + '?' + thisO.query;
        }

        log('post ident ', requestURL, msg, data);

        if (msg.type && msg.name && msg.headersType === 'targetUpload') {
            this.postBuffers[msg.name] = data.data;

            if (Object.keys(this.postBuffers).length >= 5) {
                const formData = new FormData();
                for (let key in this.postBuffers) {
                    formData.append(key, this.postBuffers[key], key);
                }

                axios({
                    method: 'post',
                    url: requestURL,
                    data: formData,
                    headers: {
                        'type': 'targetUpload',
                        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    },
                }).then(function (response) {
                    //handle success
                    log('received from post', response.data);

                    //res.send("ok");
                }).catch(e => {
                    console.error('ws post', e);
                });

                this.postBuffers = {};
            }

            res.send('done');
        } else {
            axios({
                method: 'post',
                url: requestURL,
                data: msg,
                responseType: 'json'
            }).then(function (response) {
                log('received from post', response.data);
                res.send(response.data);
            }).catch(function (error) {
                console.warn('agent post error', error.message, requestURL);
            });
        }
    }

    onWebSocketDelete(route, msg, res) {
        log('agent.cloud.webSocket delete', route, msg);

        let thisO = ToolSocket.parseUrl(route, schemas.jsonFromURLRouteSchema);
        if (!thisO) {
            return;
        }
        if (!thisO.route) {
            thisO.route = '/';
        }

        const edgeLookup = this.agentEdge.edgeLookup;
        log('delete', edgeLookup, thisO);
        if (!edgeLookup.hasOwnProperty(thisO.i)) {
            return;
        }
        let requestURL = 'http://' + edgeLookup[thisO.i].ip + ':' + edgeLookup[thisO.i].port + thisO.route;
        if (thisO.hasOwnProperty('query')) {
            requestURL = requestURL + '?' + thisO.query;
        }

        axios({
            method: 'delete',
            url: requestURL,
            data: msg,
            responseType: 'json'
        }).then(function (response) {
            res.send(response.data);
        }).catch(function (error) {
            console.warn('agent delete error', error.message, requestURL);
        });
    }

    onWebSocketAction(route, msg, res) {
        log('agent.cloud.webSocket action', route, msg, res);
        if (!msg.action) {
            return;
        }

        // ping messages do not provide useful information
        if (msg.action === 'ping') {
            return;
        }

        this.server.actionSender(msg.action);
    }

    onWebSocketClose() {
        this.setSetting('isConnected', false);
        log('websocket Closed');
    }

    /**
     * @param {any} identifier
     * @param {any} title
     * @return {String} some url path
     */
    getIoTitle(identifier, title) {
        let network = null;
        let destinationIdentifier = null;
        if (this.networkUUID) network = this.networkUUID;
        if (identifier) destinationIdentifier = identifier;

        let returnUrl = '';
        if (network) {
            returnUrl += '/n/' + network;
        }
        if (destinationIdentifier) {
            returnUrl += '/i/' + destinationIdentifier;
        }
        if (title.charAt(0) !== '/') {
            returnUrl += '/';
        }
        if (title) {
            returnUrl += title;
        }
        return returnUrl;
    }
}

module.exports = Cloud;
