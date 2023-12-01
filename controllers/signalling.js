const SIGNALLING = '/signalling';

let providers = [];
let consumers = [];
let idToSocket = {};

function onClose(wsId) {
    delete idToSocket[wsId];
    providers = providers.filter(provId => provId !== wsId);
    consumers = consumers.filter(conId => conId !== wsId);
}

function addSocket(ws) {
    ws.on('close', function() {
        onClose(ws.signallingId);
    });

    ws.on('error', function(e) {
        console.error('signalling ws error', e);
    });
}

function onMessage(ws, msg) {
    if (msg.command === 'joinNetwork') {
        ws.signallingId = msg.src;
        if (!idToSocket[ws.signallingId]) {
            idToSocket[ws.signallingId] = ws;
            addSocket(ws);
        }

        if (msg.role === 'consumer') {
            // new remote operator, send list of iphones
            ws.emit(SIGNALLING, JSON.stringify({
                command: 'discoverPeers',
                dest: msg.src,
                providers: providers,
                consumers: consumers,
            }));

            consumers.push(ws.signallingId);
        }

        if (msg.role === 'provider') {
            if (!providers.includes(ws.signallingId)) {
                providers.push(ws.signallingId);
            }
            // idToSocket may have duplicates
            let socketsSentTo = [];
            for (let peerId in idToSocket) {
                if (providers.includes(peerId)) {
                    continue;
                }
                let sock = idToSocket[peerId];
                if (socketsSentTo.includes(sock)) {
                    continue;
                }
                socketsSentTo.push(sock);
                sock.emit(SIGNALLING, JSON.stringify(msg));
            }
        }
    }

    if (msg.command === 'leaveNetwork') {
        onClose(msg.src);
        return;
    }

    if (msg.dest) {
        if (!idToSocket.hasOwnProperty(msg.dest)) {
            console.warn('missing dest', msg.dest);
            return;
        }
        idToSocket[msg.dest].emit(SIGNALLING, JSON.stringify(msg));
    }
}

module.exports.onMessage = onMessage;
