// ************************************* WEBSOCKET
const WebSocket = require('ws');

class WebSocketInterface {

    constructor(){

        const ws_host = "ws://192.168.12.20";
        const ws_port = 9090;
        const currentRobotAngle = {x:0, y:0, z:0, w:0};
        const currentRobotPosition = {x:0, y:0};

        console.log('WebSocket: trying to connect...');
        this.ws = new WebSocket(ws_host + ':' + ws_port);

        this.ws.on('open', function open() {
            console.log('WebSocket: ready!');

            console.log('WebSocket: subscribing to robot pose...');

            const s = '{"op":"subscribe","topic":"/robot_pose"}';
            ws.send(s);

        });

        // Parse robot pose
        this.ws.on('message', function incoming(data) {
            
            const parsedData = JSON.parse(data);

            currentRobotAngle['x'] = parsedData['msg']['orientation']['x'];
            currentRobotAngle['y'] = parsedData['msg']['orientation']['y'];
            currentRobotAngle['z'] = parsedData['msg']['orientation']['z'];
            currentRobotAngle['w'] = parsedData['msg']['orientation']['w'];

            currentRobotPosition['x'] = parsedData['msg']['position']['x'];
            currentRobotPosition['y'] = parsedData['msg']['position']['y'];

        });
    }
}

exports.WebSocketInterface = WebSocketInterface;

