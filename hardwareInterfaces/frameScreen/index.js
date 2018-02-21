/**
 * Created by Ben Reynolds on 2/21/18.
 *
 * Copyright (c) 2015 Carsten Strunk
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = false;

if (exports.enabled) {

    var server = require(__dirname + '/../../libraries/hardwareInterfaces');
    var frameAR = require(__dirname + '/../../libraries/frameScreenTransfer/frameAR-server')(__dirname);
    frameAR.startHTTPServer(3034);
    // frameAR.createSocketListeners(server.addFrame.bind(server));

    server.addScreenObjectListener("frameScreen",function(screenObject){
        server.writeScreenObjects("objectKey", "frameKey", "nodeKey");
        console.log(screenObject);
    });

}