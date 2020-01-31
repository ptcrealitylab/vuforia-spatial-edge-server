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
var logger = require('../../logger');

exports.enabled = settings("enabled");
if (exports.enabled) {

    const SerialPort = require('serialport');
    const Readline = SerialPort.parsers.Readline;
    var serialPort;

    SerialPort.list().then(function(ports) {
        for(var i = 0; i < ports.length; i++){
            if(ports[i].manufacturer){

                 if(ports[i].manufacturer.includes(settings("serialID"))) {
                     serialPort = new SerialPort(ports[i].comName, {
                         baudRate: 9600
                     });
                     serialPort.on('error', function (err) {
                         logger.error('Serial port error', err);
                     });
                     serialServer(serialPort);
                     break;
                }
            }
        }
    }).catch(function (err) {
        // return err;  // code doesn't come here
    });

    function serialServer(serialPort) {
        server.addNode(settings("object"), settings("frame"), settings("node"), settings("kind"));

        const parser = serialPort.pipe(new Readline({ delimiter: '\r\n' }));
        parser.on('data', function (data){
            var values = data.split(" ");

            values = values.filter(function(item) {
                return item !== ""
            });

            var max = settings("max");
            var min = 0;

            if(values[1]>=max) {
                values[1] = max;
            }
            values[1] = values[1]/max;
            server.write(settings("object"), settings("frame"), settings("node"), values[1], 'f', values[2], min, max);
        });
    }
}
