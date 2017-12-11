/**
 * @preserve
 *
 *                                     .,,,;;,'''..
 *                                 .'','...     ..',,,.
 *                               .,,,,,,',,',;;:;,.  .,l,
 *                              .,',.     ...     ,;,   :l.
 *                             ':;.    .'.:do;;.    .c   ol;'.
 *      ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *     ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *    .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *     .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *    .:;,,::co0XOko'              ....''..'.'''''''.
 *    .dxk0KKdc:cdOXKl............. .. ..,c....
 *     .',lxOOxl:'':xkl,',......'....    ,'.
 *          .';:oo:...                        .
 *               .cd,    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐   .
 *                 .l;   ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘   '
 *                   'l. ╚═╝└─┘┴└─ └┘ └─┘┴└─  '.
 *                    .o.                   ...
 *                     .''''','.;:''.........
 *                          .'  .l
 *                         .:.   l'
 *                        .:.    .l.
 *                       .x:      :k;,.
 *                       cxlc;    cdc,,;;.
 *                      'l :..   .c  ,
 *                      o.
 *                     .,
 *
 *             ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *             ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *             ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 * Created by Valentin on 10/22/14.
 * Modified by Carsten on 12/06/15.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = true;

if (exports.enabled) {

    var server = require(__dirname + '/../../libraries/hardwareInterfaces');

    var FRAME_NAME = "zero";

    var app = require('express')();
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    app.get('/', function(req, res){
        res.sendFile(__dirname + '/index.html');
    });

    var filesToServe = [
                        '/index.css',
                        '/frames/decimal.html',
                        '/frames/gauge.html',
                        '/frames/graph.html',
                        '/frames/light.html',
                        '/resources/marker.jpg',
                        '/resources/gauge-outline-1.svg',
                        '/resources/gauge-needle-2.svg',
                        '/resources/light-on.svg',
                        '/resources/light-off.svg'
                        ];


    filesToServe.forEach( function(filename) {

        app.get(filename, function(req, res){
            res.sendFile(__dirname + filename);
        });

    });

    http.listen(3030, function(){
        console.log('listening on *:3030');
    });

    server.enableDeveloperUI(true);

    var nodes = [];
    var rows = 2;
    var columns = 3;

    function getIdForPanel(row, column) {
        return "panel_row" + row + "_col" + column;
    }

    function createNodesAndRenderInterface() {
        server.removeAllNodes("dashboard", FRAME_NAME); // TODO: hopefully don't need to do this in the future but necessary now to refresh when loaded

        nodes = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < columns; c++) {
                row.push(getIdForPanel(r,c));
            }
            nodes.push(row);
        }

        forEachNode(createNode);

        server.reloadNodeUI("dashboard"); // TODO: should this include a frame too?

        io.emit("redrawGrid", {rows: rows, columns: columns});
    }

    function createNode(nodeName, row, column) {
        if (row === 0 && column === 0) { return; } // this is always reserved for the marker

        server.addNode("dashboard", FRAME_NAME, nodeName, "node");

        var xSpacing = 300;
        var ySpacing = 300;

        server.moveNode("dashboard", FRAME_NAME, nodeName, column * xSpacing, row * ySpacing);

        // when a new value arrives, forward it to the frontend
        server.addReadListener("dashboard", FRAME_NAME, nodeName, function (data) {
            io.emit("dashboard", {nodeName: nodeName, action: "update", data: data}); // TODO: emit frame name too?
        });

        // when a node gets connected, notify the frontend
        server.addConnectionListener("dashboard", FRAME_NAME, nodeName, function(data) {
            console.log('connection listened');
            io.emit("dashboard", {nodeName: nodeName, action: "connect", data: data}); // TODO: ^
        });
    }

    function deleteNode(nodeName, row, column) {
        if (row === 0 && column === 0) { return; } // this is always reserved for the marker
        server.removeNode("dashboard", FRAME_NAME, nodeName);
    }

    function forEachNode(callback) {
        nodes.forEach(function(row, r) {
            row.forEach(function(node, c) {
                callback(node, r, c);
            });
        });
    }

    function forEachNodeInRow(rowNumber, callback) {
        nodes[rowNumber].forEach(function(node, c) {
            callback(node, rowNumber, c);
        });
    }

    function forEachNodeInColumn(colNumber, callback) {
        nodes.forEach( function (row, rowNumber) {
           callback(row[colNumber], rowNumber, colNumber);
        });
    }

    server.addEventListener("reset", function () {
    });

    server.addEventListener("shutdown", function () {
    });

    io.on('connection', function(socket){

        createNodesAndRenderInterface();

        socket.on('addRow', function() {
            console.log('addRow');
            rows++;
            var newRow = [];
            for (var c = 0; c < columns; c++) {
                newRow.push(getIdForPanel(rows-1,c));
            }
            nodes.push(newRow);
            forEachNodeInRow(rows-1, createNode);
            server.reloadNodeUI("dashboard");
            io.emit("redrawGrid", {rows: rows, columns: columns});
        });

        socket.on('removeRow', function() {
            console.log('removeRow');
            forEachNodeInRow(rows-1, deleteNode);
            rows--;
            nodes.pop();
            server.reloadNodeUI("dashboard");
            io.emit("redrawGrid", {rows: rows, columns: columns});
        });

        socket.on('addColumn', function() {
            console.log('addColumn');
            columns++;
            for (var r = 0; r < rows; r++) {
                console.log("new node id: " + getIdForPanel(r, columns-1));
                nodes[r].push(getIdForPanel(r, columns-1));
            }
            forEachNodeInColumn(columns-1, createNode);
            server.reloadNodeUI("dashboard");
            io.emit("redrawGrid", {rows: rows, columns: columns});
        });

        socket.on('removeColumn', function() {
            console.log('removeColumn');
            forEachNodeInColumn(columns-1, deleteNode);
            columns--;
            nodes.forEach( function(row) {
                row.pop();
            });
            server.reloadNodeUI("dashboard");
            io.emit("redrawGrid", {rows: rows, columns: columns});
        });

        socket.on('dashboardLoaded', function() {
            console.log("ask server for links");
            var links = server.getAllLinksToNodes("dashboard", FRAME_NAME); // TODO: this currently only has all links originating from this object... scan entire object tree to find them all

            // var linkList = Object.values(links);
            // linkList = linkList.map(function(elt) {
            //     return {
            //         namesA: elt.namesA,
            //         namesB: elt.namesB
            //     }
            // });

            console.log("get all links: ");
            // console.log(links);
            // console.log(nodeList);
            io.emit("displayLinks", links);

        });

        socket.on('pointerdown', function(msg) {
            // console.log("SERVER POINTER DOWN", msg)
            io.emit("remoteTouchDown", msg);
        });

        socket.on('pointermove', function(msg) {
            // console.log("SERVER POINTER MOVE", msg)
            io.emit("remoteTouchMove", msg);
        });

        socket.on('pointerup', function(msg) {
            // console.log("SERVER POINTER UP", msg)
            io.emit("remoteTouchUp", msg);
        });

    });

}

