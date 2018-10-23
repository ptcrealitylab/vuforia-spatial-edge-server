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
var server = require(__dirname + '/../../libraries/hardwareInterfaces');
var path = require('path');
var thisHardwareInterface = __dirname.split(path.sep).pop();
var settings = server.loadHardwareInterface(thisHardwareInterface);

exports.enabled = true;

if (exports.enabled) {

    server.enableDeveloperUI(true);

   // server.addNode("thisDemo", "zero", "distance", "node");
 //   server.addNode("thisDemo", "zero", "motor", "node");

  //  server.addNode("frameExperiements", "graph", "value", "node");
   // server.addNode("frameExperiements", "graph", "out", "node");

   // server.addNode("frameExperiements", "youtube", "play", "node");




   // server.addNode("thisDemo", "zero2", "distance", "node");
   // server.addNode("thisDemo", "zero2", "motor", "node");

  //  server.addNode("thatDemo", "zero", "distance", "node");
  //  server.addNode("thatDemo", "zero", "motor", "node");

var count = 0;
   // server.write("thisDemo", "zero2", "distance", 0.5);
  /* setInterval(function(){
        server.write("frameExperiements", "graph", "out",  ((Math.random() * (0 - 100) + 100))/100, "f", "F", -20, 10);


        /*count++;
        if (count >= 100){
            count = 0;
        }*/
   /* }, 10);*/



/*
    server.addNode("obj45", "one", "node");
    server.addNode("obj45", "two", "node");
    server.addNode("obj45", "three", "node");
    server.addNode("obj45", "four", "node");
    */

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {

    });

    /*
   setInterval(function () {

        server.advertiseConnection("obj45","one");

       setTimeout(function() {
           server.advertiseConnection("obj47", "hans");
       }, 4000);

    }, 8000);*/

}
