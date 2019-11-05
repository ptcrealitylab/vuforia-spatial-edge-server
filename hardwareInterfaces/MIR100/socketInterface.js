// Import events module
var events = require('events');
const socket = require('socket.io-client');

/*
*  This class connects to the socket
*  created by the robot in order to access
*  realtime data from the robot
*/
class SocketInterface{

    constructor(hostIP, port){


        console.log('\nSocket: trying to connect...\n');

        this.client = socket.connect('http://' + hostIP + ':' + port);

        /*this.client.connect({
            port: port,
            host: hostIP
        }, function () {

            console.log('CONNECTED ***************');

        }.bind(this));

        this.client.on('data', function(data) {

            console.log('Data Received');

        }.bind(this));*/

    }

    send(data){

        console.log("SEND VALUES TO BEN", data);

        this.client.emit('/update/object/position', data);
    }

}

exports.SocketInterface = SocketInterface;

