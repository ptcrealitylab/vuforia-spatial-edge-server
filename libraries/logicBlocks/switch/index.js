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

var properties = {
    name : "switch",
    blockSize : 2,
    privateData : {},
    publicData : {switchType : "toggle", switch: false, toggle: false},
    activeInputs : [true, true, false, false],
    activeOutputs : [true, true, false, false],
    iconImage : "icon.png",
    nameInput : ["in", "stream in", "", ""],
    nameOutput : ["out", "stream out", "", ""],
    text : "switch"
};

exports.properties = properties;

//var logicAPI = require(__dirname + '/../../libraries/logicInterfaces');


exports.render = function (objectID, logicID, linkID, blockObject, inputData, callback)  {

    var outputData = [{},{},{},{}];
    var key;

    if(inputData[0].value && blockObject.publicData.toggle === false)
    {
        blockObject.publicData.toggle = true;
        // toggle the value
        blockObject.publicData.switch = !blockObject.publicData.switch;

        // todo we need to test how it behaves when I have a stream and a single data point that changes when switched
        for (key in inputData[0]) {
            outputData[0][key] = inputData[0][key];
        }
        callback(objectID, linkID, outputData);

    } else {
        blockObject.publicData.toggle = false;
    }

    // in case the switch is on, the data will be routed through
    // todo again we have to test how we can handle an on and off switch that only has one data point but then also handle the stream
    if(blockObject.publicData.switch){
        for (key in inputData[1]) {
            outputData[1][key] = inputData[1][key];
        }
        callback(objectID, logicID, linkID, outputData);
    }

};