// Import events module
var events = require('events');
const net = require('net');

/*
*  This class connects to the socket
*  created by the robot in order to access
*  realtime data from the robot
*/
class SocketInterface{

    constructor(hostIP, port){

        this.eventEmitter = new events.EventEmitter();

        console.log('\nSocket: trying to connect...\n');

        this.client = new net.Socket();

        this.client.connect({
            port: port,
            host: hostIP
        }, function () {

            console.log('Robot Connected to socket');

        }.bind(this));

        this.client.on('data', function(data) {

            console.log('Data Received');

        }.bind(this));

    }

    send(data){
        this.client.write(data);
    }

}

exports.SocketInterface = SocketInterface;

