/*
*  This class contains all methods to control
* a robot.
*/
class Robot {

    constructor(name) {

        const status = {
            IDLE: 'idle',
            MOVING: 'moving',
            STOP: 'stop',
            PAUSE: 'pause',
            OFF: 'off'
        }

        this._name = name;
        this._status = status.OFF;


    }

    moveToCoordinate(x, y, z){

    }

    rotateAngle(alpha){

    }

    rotateAxis(rx, ry, rz){

    }
}
