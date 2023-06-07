class Network {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.knownObjects
     * @param {function} dependencies.nodeFetch
     * @param {object} dependencies.dgram
     * @param {function} dependencies.request
     **/
    constructor(dependencies) {
        // node Modules
        this.knownObjects = dependencies.knownObjects;
        this.fetch = dependencies.nodeFetch;
        this.dgram = dependencies.dgram;
        this.request = dependencies.request;
    }

    // network
    restActionSender(action) {
        const ipSet = new Set();
        for (const [_key, value] of Object.entries(this.knownObjects)) {
            ipSet.add(value.ip);
        }
        const body = new URLSearchParams({
            'action': JSON.stringify(action)
        });
        [...ipSet].map(objectIp => {
            this.fetch(`http://${objectIp}:8080/action`, {
                method: 'POST',
                body: body
            }).catch(err => {
                console.warn(`restActionSender: Error sending action to ${objectIp} over REST API.`, err);
            });
        });
    }

    /**
     * Broadcasts a JSON message over UDP
     * @param {*} action - JSON object with no specified structure, contains the message to broadcast
     * @param {number|undefined} timeToLive
     * @param {number|undefined} beatPort
     */
    // network
    actionSender(action, timeToLive, beatPort) {
        if (!timeToLive) timeToLive = 2;
        if (!beatPort) beatPort = 52316;
        //  console.log(action);

        let HOST = '255.255.255.255';
        let message;

        message = Buffer.from(JSON.stringify({action: action}));

        if (message.length > 1472) {
            this.restActionSender(action);
            return;
        }

        // creating the datagram
        let client = this.dgram.createSocket({
            type: 'udp4',
            reuseAddr: true,
        });
        client.bind(function () {
            client.setBroadcast(true);
            client.setTTL(timeToLive);
            client.setMulticastTTL(timeToLive);
        });
        // send the datagram
        client.send(message, 0, message.length, beatPort, HOST, function (err) {
            if (err) {
                if (err.code === 'EMSGSIZE') {
                    console.error('actionSender: UDP Message Too Large.');
                } else {
                    console.log('You\'re not on a network. Can\'t send anything', err);
                }
            }
            client.close();
        });

    }

    // network
    httpGet(url) {
        return new Promise((resolve, reject) => {
            this.request(url, (error, response, body) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (response.statusCode !== 200) {
                    reject('Invalid status code <' + response.statusCode + '>');
                    return;
                }
                resolve(body);
            });
        });
    }
}

module.exports = Network;
