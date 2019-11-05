const WebSocket = require('ws');

/*
*  This class connects to the WebSocket
*  created by a robot in order to access
*  realtime data from it.
*/
class WebSocketInterface {

    constructor(hostIP, port){

        console.log('\nWebSocket: trying to connect...\n');
        const ws = new WebSocket("ws://" + hostIP + ':' + port);

        ws.on('open', function open(event) {
            
            console.log('\nWebSocket open at: ', hostIP, port, '\n');

        });

        const self = this;

        // Parse robot pose
        ws.on('message', function incoming(data) {

            //console.log(data);
            const parsedData = JSON.parse(data);

        });

        ws.onerror = function(event) {
            console.error("WebSocket error observed:", event);
        };
    }

}

exports.WebSocketInterface = WebSocketInterface;

