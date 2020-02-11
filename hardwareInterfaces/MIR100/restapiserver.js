const express = require('express');

/*
*  This class creates a RESTful API to access robot data
*  from other connections to this server.
*/
class restapiserver {

    constructor(port){

        let app = express();
        this._mapData = 0;
        this._robotStatus = null;

        // get map
        app.get('/api/v1/map', (req, res) => {
            res.json(this.MapData)
        });

        // get map
        app.get('/api/v1/robot', (req, res) => {
            res.json(this.RobotStatus)
        });

        app.listen(port, () => {
            console.log(`server running on port ${port}`)
        });
    }

    get MapData(){
        return this._mapData;
    }

    set MapData(data){
        this._mapData = data;
    }

    set RobotStatus(data){
        this._robotStatus = data;
    }

}

exports.RestAPIServer = restapiserver;