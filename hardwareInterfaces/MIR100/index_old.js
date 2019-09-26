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
 * Created by Anna Fuste on 03/20/19.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
var server = require(__dirname + '/../../libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = false;

if (exports.enabled) {

    //var fetch = require('fetch');

    // MIR100 REST API INFO
    this.restAddress = "http://mir.com/api/v2.0.0";
    this.authorization = "Basic ZGlzdHJpYnV0b3I6NjJmMmYwZjFlZmYxMGQzMTUyYzk1ZjZmMDU5NjU3NmU0ODJiYjhlNDQ4MDY0MzNmNGNmOTI5NzkyODM0YjAxNA==";

    this.missionMoveToGUID = "";

    // Create a request variable and assign a new XMLHttpRequest object to it.
    var request = new XMLHttpRequest();

    function initRestHeaders() {
        request.setRequestHeader("Content-Type", "application/json");
        request.setRequestHeader("authorization", _authorization);
    }

    function requestStatus(){ restRequest('/status'); }
    function requestMissions(){ restRequest('/missions'); }

    function restRequest(endpoint){

        newAddress = this.restAddress + endpoint;

        // Open a new connection, using the GET request on the URL endpoint
        request.open('GET', newAddress, true);

        request.onload = function () {
            // Begin accessing JSON data here
            var data = JSON.parse(this.response);
    
            if (request.status >= 200 && request.status < 400) {
                
            } else {
                console.log('error');
            }
            
        }
    
        // Send request
        request.send();
    }
    
    function queueMoveToCoordinate(positionX, positionY, orientation){
        
        console.Log("Queue Add Coordinate: " + positionX + " | " + positionY + " | " + orientation);

        requestURL = this.restAddress + '/mission_queue';

        variableName1 = "positionX";
        value1 = positionX;

        variableName2 = "positionY";
        value2 = positionY;

        variableName3 = "orientation";
        value3 = orientation;

        var missionText = '{"mission_id":' + this.missionMoveToGUID 
            + ', "parameters": [{"input_name":' 
            + variableName1 + '"value":' + value1 + '}, {"input_name":' 
            + variableName2 + '"value":' + value2 + '}, {"input_name":' 
            + variableName3 + '"value":' + value3 + '}]}';
        
        var obj = JSON.parse(missionText);

    }
    
}