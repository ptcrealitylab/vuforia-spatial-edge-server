const WebSocket = require('ws');

/*
*  This class connects to the WebSocket
*  created by the MIR in order to access
*  realtime data from the robot.
*/
class WebSocketInterface {

    constructor(hostIP, port){

        const ws_host = "ws://" + hostIP;
        //const ws_host = "ws://mir.com";
        const ws_port = port;
        this._currentRobotAngle = {x:1, y:1, z:1, w:1};
        this._currentRobotPosition = {x:1, y:1};

        console.log('\nWebSocket: trying to connect...\n');
        const ws = new WebSocket(ws_host + ':' + ws_port);

        ws.on('open', function open(event) {
            
            console.log('\nWebSocket open at: ', hostIP, port, '\n');

            //console.log('WebSocket: subscribing to robot pose...');

            const s = '{"op":"subscribe","topic":"/robot_pose"}';
            ws.send(s);

        });

        const self = this;

        // Parse robot pose
        ws.on('message', function incoming(data) {

            //console.log(data);

            const parsedData = JSON.parse(data);

            self._currentRobotAngle = {x:parseFloat(parsedData['msg']['orientation']['x']), 
                                        y:parseFloat(parsedData['msg']['orientation']['y']), 
                                        z:parseFloat(parsedData['msg']['orientation']['z']), 
                                        w:parseFloat(parsedData['msg']['orientation']['w'])};
            
            self._currentRobotPosition = {x:parseFloat(parsedData['msg']['position']['x']), 
                                        y:parseFloat(parsedData['msg']['position']['y'])};

        });

        ws.onerror = function(event) {
            console.error("WebSocket error observed:", event);
        };
    }

    get currentRobotAngle(){
        return _currentRobotAngle;
    }
    set currentRobotAngle(currentAngle){
        this._currentRobotAngle = currentAngle;
    }

    get currentRobotPosition(){
        return this._currentRobotPosition;
    }
    set currentRobotPosition(currentPos){
        this._currentRobotPosition = currentPos;
    }

    currentYaw(){

        let yaw = 2 * Math.asin(this._currentRobotAngle.z);

        if ((this._currentRobotAngle.w * this._currentRobotAngle.z) < 0.0){
            yaw = -Math.abs(yaw);
        }

        return yaw * (180 / Math.PI);
    }
}

exports.WebSocketInterface = WebSocketInterface;

