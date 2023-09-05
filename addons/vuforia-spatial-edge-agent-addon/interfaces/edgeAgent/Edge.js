const ToolSocket = require('toolsocket');
const {log, print, deepCopy, createChecksum} = require('./utilities.js');

class Edge {
    constructor(server) {
        this.server = server;

        this.origin = 'edge';
        this.edgeLookup = {};
        this.agentCloud = null;
    }

    /**
     * Creates a new socket and attaches listeners to it
     * Updates edgeLookup
     * @param {any} identifier
     */
    connectSocket(identifier) {
        log('connectSocket', identifier);
        if (!this.edgeLookup.hasOwnProperty(identifier)) {
            return;
        }

        let thisEdge = this.edgeLookup[identifier];

        if (thisEdge.socket) {
            return;
        }

        log('new socket for', identifier);
        let wsURL = 'ws://' + thisEdge.ip + ':' + thisEdge.port;
        thisEdge.socket = new ToolSocket(wsURL, this.agentCloud.networkUUID, this.origin);
        thisEdge.socketOpen = false;

        thisEdge.socket.on('open', () => {
            print(identifier + ' is open');
            thisEdge.socketOpen = true;
            if (thisEdge.buffer) {
                // log(thisEdge.buffer);
                for (let key in thisEdge.buffer) {
                    if (thisEdge.buffer[key]) {
                        thisEdge.buffer[key].forEach((msg) => {
                            log('<-buffer [' + key + '] [' + msg + ']');
                            thisEdge.socket.io(key, msg);
                        });
                        delete thisEdge.buffer[key];
                    }
                }
            }
        });
        thisEdge.socket.on('close', () => {
            print(identifier + ' closed');
            thisEdge.socketOpen = false;

            if (thisEdge.buffer) {
                for (let key in thisEdge.buffer) {
                    delete thisEdge.buffer[key];
                }
            }
        });

        thisEdge.socket.on('io', (route, msg, data) => {
            log('thisEdge io', route, msg);
            if (this.agentCloud.isSocketOpen()) {
                log('-cloud-> [' + route + '] [' + msg + ']');
                this.agentCloud.webSocket.io(this.agentCloud.getIoTitle(identifier, route), msg, data);
            }
        });

        try {
            log('connectSpecialUrls', identifier, thisEdge.ip);
            const ip = thisEdge.ip === '127.0.0.1' ? 'localhost' : thisEdge.ip;
            this.agentCloud.connectSpecialUrls(identifier, ip);
        } catch (e) {
            console.warn('edge agent unable to connect to special urls', e);
        }
    }

    /**
     * Forwards UDP messages received by this edge server
     */
    service() {
        this.server.subscribeToUDPMessages(msg => {
            if (msg.matrixBroadcast) return;
            if (msg.action) {
                this.actionCall(msg);
            }
            if (msg.id && msg.ip && msg.vn) {
                this.beatCall(msg);
            }
        });
    }

    /**
     * Forward a broadcasted heartbeat message to the cloud server
     * @param {any} msgOrig
     */
    beatCall(msgOrig) {
        const msg = deepCopy(msgOrig);
        if (msg.ip) {
            msg.network = this.agentCloud.networkUUID;
        }

        let edgeKeyExists = false;
        let edgeUuid = null;
        for (let key of Object.keys(this.edgeLookup)) {
            if (this.edgeLookup[key].ip === msg.ip && this.edgeLookup[key].port === msg.port) {
                edgeKeyExists = true;
                edgeUuid = key;
                break;
            }
        }
        if (!edgeKeyExists) {
            edgeUuid = createChecksum(msg.ip + msg.port, 12);
            print('identifier for ' + msg.ip + ':' + msg.port + ' = ' + edgeUuid);
            this.edgeLookup[edgeUuid] = {ip: msg.ip, port: msg.port};
        }

        msg.ip = 'NULL';
        msg.port = edgeUuid;

        if (!this.agentCloud.isSocketOpen()) {
            return;
        }

        this.agentCloud.webSocket.beat('/udp/beat', msg);
    }

    /**
     * Forward a broadcasted action message to the cloud server
     * @param {any} msg
     */
    actionCall(msg) {
        if (!this.agentCloud.isSocketOpen()) {
            return;
        }
        this.agentCloud.webSocket.action('/udp/action', msg);
    }
}

module.exports = Edge;
