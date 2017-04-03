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

/**
 * @desc prototype for a plugin. This prototype is called when a value should be changed.
 * It defines how this value should be transformed before sending it to the destination.
 * @param {object} objectID Origin object in which the related link is saved.
 * @param {string} linkID the id of the link that is related to the call
 * @param {object} inputData the data that needs to be processed
 * @param {function} callback the function that is called for when the process is rendered.
 * @note the callback has the same structure then the initial prototype, however inputData has changed to outputData
 **/

var request = require('request');

var generalProperties = {
    name : "IFTTT",
    blockSize : 1,
    privateData : {},
    publicData : {
        eventName: "reality_editor_43bb26f9",
        ifttt_key: "cjizq-2cjLs9dasYKceqOB" //"d7KguEO4Vn2Xhut0sR0_JI"
    },
    activeInputs : [true, false, false, false],
    activeOutputs : [true, false, false, false],
    iconImage : "icon.png",
    nameInput : ["in", "", "", ""],
    nameOutput : ["out", "", "", ""],
    type : "IFTTT"
};

//endpointUrl : "http://192.168.1.12:8082/test",
//https://maker.ifttt.com/trigger/{event}/with/key/d7KguEO4Vn2Xhut0sR0_JI

exports.properties = generalProperties;

exports.setup = function (object,logic, block, activeBlockProperties){
// add code here that should be executed once.

};

//var logicAPI = require(__dirname + '/../../libraries/logicInterfaces');

exports.render = function (object, node, block, index, thisBlock, callback) {

    // data flows through it like normal
    for (var key in thisBlock.data[index]) {
        thisBlock.processedData[index][key] = thisBlock.data[index][key];
    }

    // BUT ALSO: makes a post request to the server endpoint configured in publicData
    console.log("making ifttt request to " + JSON.stringify(thisBlock.publicData));

    if (index === 0) {

        var endpointUrl = "https://maker.ifttt.com/trigger/" + thisBlock.publicData.eventName + "/with/key/" + thisBlock.publicData.ifttt_key;
        //var jsonBody = {value1: thisBlock.processedData[0].value};

        var requestBody = {value1: thisBlock.processedData[0].value};
        //var requestBody = {"value1":"1"};
        //var requestBody = { json: {value1: thisBlock.processedData[0].value} };

        //request.post(
        //    endpointUrl,
        //    requestBody,
        //    function (error, response, body) {
        //        if (!error && response.statusCode == 200) {
        //            console.log(body);
        //        }
        //    }
        //);

        var options = {
            method: 'post',
            //body: {},
            body: requestBody,
            json: true,
            url: endpointUrl
        };

        request(options, function (err, res, body) {
            if (err) {
                console.error('error posting json: ', err);
                throw err
            }
            var headers = res.headers;
            var statusCode = res.statusCode;
            console.log('headers: ', headers);
            console.log('statusCode: ', statusCode);
            console.log('body: ', body);
        });


    }

    //console.log(endpointUrl, requestBody);

    callback(object, node, block, index, thisBlock);
};
