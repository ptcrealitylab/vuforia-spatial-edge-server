/**
 * Created by Carsten on 12/06/15.
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 *  KODI Client
 *
 * This hardware interface can communicate with a KODI Media Centre using the JSON RPC API
 *
 *
 */
//Enable this hardware interface
exports.enabled = true;

if (exports.enabled) {
    var fs = require('fs');
    var kodi = require('kodi-ws');
    var _ = require('lodash');
    var server = require(__dirname + '/../../libraries/HybridObjectsHardwareInterfaces');

    var kodiServers;


    /**
     * @desc setup() runs once, adds and clears the IO points
     **/
    function setup() {
        server.developerOn();

        kodiServers = JSON.parse(fs.readFileSync(__dirname + "/config.json", "utf8"));

        console.log("KODI setup");

        for (var key in kodiServers) {
            var kodiServer = kodiServers[key];
            kodiServer.connection = null;

            kodi(kodiServer.host, kodiServer.port).then(function (connection) {
                kodiServer.connection = connection;
                kodiServer.connection.on('error', function (error) { console.log("KODI error: " + error) });

                //Add Event Handlers
                kodiServer.connection.Application.OnVolumeChanged(function () {
                    console.log("Kodi Volume changed");
                    var volume = kodiServer.connection.Application.GetProperties({ properties: ['volume'] });
                    volume.then(function (data) {
                        console.log("KODI Volume: " + data.volume);
                        server.writeIOToServer(key, "volume", data.volume / 100, "f");
                    });

                });

                kodiServer.connection.Player.OnPause(function () {
                    console.log("Kodi Pause");
                    server.writeIOToServer(key, "status", 0.5, "f");
                });

                kodiServer.connection.Player.OnPlay(function () {
                    console.log("Kodi Play");
                    server.writeIOToServer(key, "status", 1, "f");
                });

                kodiServer.connection.Player.OnStop(function () {
                    console.log("Kodi Stop");
                    server.writeIOToServer(key, "status", 0, "f");
                });

            });


            server.addIO(key, "volume", "default", "kodi");
            server.addIO(key, "status", "default", "kodi");
        }




        server.clearIO("kodi");
    }


    exports.receive = function () {
        setup();

    };

    exports.send = function (objName, ioName, value, mode, type) {
        console.log("Incoming: " + objName + " " + ioName + " " + value);
        if (kodiServers.hasOwnProperty(objName) && !_.isNull(kodiServers[objName].connection)) {
            if (ioName == "volume") {
                kodiServers[objName].connection.Application.SetVolume(_.floor(value * 100));
            } else if (ioName == "status") {
                //play, pause, stop all of the currently active players
                kodiServers[objName].connection.Player.GetActivePlayers().then(function (data) {
                    for (var i = 0; i < data.length; i++) {
                        if (value < 0.33) {
                            kodiServers[objName].connection.Player.Stop({ playerid: data[i].playerid });
                        } else if (value < 0.66) {
                            kodiServers[objName].connection.Player.PlayPause({ playerid: data[i].playerid, play:false });
                        } else {
                            kodiServers[objName].connection.Player.PlayPause({ playerid: data[i].playerid, play:true });
                        }
                    }

                });
                
            }
        }
    };

    exports.init = function () {
    };
}

