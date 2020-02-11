// Import events module
var events = require('events');
const net = require('net');

/*
*  This class connects to the WebSocket
*  created by the UR in order to access
*  realtime data from the robot through port 30002
*/
class SocketInterface{

    constructor(hostIP, port){

        // Create an eventEmitter object
        this.eventEmitter = new events.EventEmitter();

        this._isURmoving = false;

        console.log('\nSocket: trying to connect...\n');

        this.client = new net.Socket();

        this.client.connect({
            port: port,
            host: hostIP

        }, function () {

            console.log('UR3E CONNECTED');

        }.bind(this));

        var pack;
        var URindex = 0;
        var TCPindex = 0;
        var URsize = 0;

        this.client.on('data', function(data) {

            TCPindex = 0;   // New TCP package, reset TCPindex

            if (URindex >= URsize) {
                URsize = data.readUIntBE(0, 4);
                pack = Buffer.alloc(URsize);                            // create a new buffer to allocate all the UR packet
                URindex = 0;
            }

            while(TCPindex < data.length){                              // Let's go through all the TCP packet
                pack[URindex] = data[TCPindex];
                URindex++;
                TCPindex++;

                if (URindex === URsize){                                // we reached the end of the UR packet
                    this.processURPacket(pack);
                    URindex = 0;
                    URsize = 0;
                    if (TCPindex > data.length - 4) break;
                    URsize = data.readUIntBE(TCPindex, 4);               // New UR packet
                    pack = Buffer.alloc(URsize);                        // create a new buffer to allocate all the UR packet

                }
            }

        }.bind(this));

        const self = this;

    }

    processURPacket(data){

        var type = data[4].toString();  // Type of message

        if (type === '16'){

            var subpackageLength = data.readUIntBE(5, 4);
            var subtype = 0;

            if (subpackageLength > 0){

                subtype = data[9].toString();

                if (subtype === '0'){

                    /*
                    console.log('ROBOT_STATE_PACKAGE_TYPE_ROBOT_MODE_DATA');

                    var isRealRobotConnected = data.readUIntBE(18, 1);
                    console.log('isRealRobotConnected', isRealRobotConnected);

                    var isRealRobotEnabled = data.readUIntBE(19, 1);
                    console.log('isRealRobotEnabled',isRealRobotEnabled);

                    var isRobotPowerOn = data.readUIntBE(20, 1);
                    console.log('isRobotPowerOn', isRobotPowerOn);

                    var isEmergencyStopped = data.readUIntBE(21, 1);
                    console.log('isEmergencyStopped', isEmergencyStopped);

                    var isProtectiveStopped = data.readUIntBE(22, 1);
                    console.log('isProtectiveStopped', isEmergencyStopped);
                     */

                    var isProgramRunning = data.readUIntBE(23, 1);              // This indicates if the robot arm is moving
                    //console.log('isProgramRunning', isProgramRunning);
                    if (!this._isURmoving){
                        if (isProgramRunning === 1){
                            this._isURmoving = true;
                            this.eventEmitter.emit('ur_play');    // Notify indexjs
                        }
                    } else {
                        if (isProgramRunning === 0){
                            this._isURmoving = false;
                            this.eventEmitter.emit('ur_stop');    // Notify indexjs
                        }
                    }

                    /*
                    var isProgramPaused = data.readUIntBE(24, 1);
                    console.log('isProgramPaused', isProgramPaused);

                    var robotMode = data[25].toString();
                    console.log('robotMode', robotMode);

                    var controlMode = data[26].toString();
                    console.log('controlMode', controlMode);

                    var targetSpeedFraction = data.readDoubleBE(26, 8);
                    console.log('targetSpeedFraction', targetSpeedFraction);

                    var speedScaling = data.readDoubleBE(34, 8);
                    console.log('speedScaling', speedScaling);
                     */
                }
            }
        }
    }

    moveURto(x, y, z, rx, ry, rz){

        let s = 'movej(p[' + x.toString() + ', ' + y.toString() + ', ' + z.toString() + ', ' + rx.toString() + ', ' + ry.toString() + ', ' + rz.toString() + '], a=1.0, v=0.1)\n';
        console.log('Send: ', s);
        this.send(s);

    }

    send(data){
        this.client.write(data);
    }

}

exports.SocketInterface = SocketInterface;

