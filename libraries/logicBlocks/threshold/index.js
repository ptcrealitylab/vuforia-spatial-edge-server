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

var generalProperties = {
    name : "threshold",
    blockSize : 1,
    privateData : {},
    publicData : {threshold : 0.5, direction:">", digital:true},
    activeInputs : [true, false, false, false],
    activeOutputs : [true, false, false, false],
    iconImage : "icon.png",
    nameInput : ["stream in", "", "", ""],
    nameOutput : ["stream out", "", "", ""],
    type : "threshold"
};

exports.properties = generalProperties;

exports.setup = function (object,logic, block, activeBlockProperties){
// add code here that should be executed once.

};


//var logicAPI = require(__dirname + '/../../libraries/logicInterfaces');

exports.render = function (objectID, logicID, linkID, activeBlockProperties, callback)  {

    // check orientations and calculate if threshold is meet.
    var pass = false;
    if(activeBlockProperties.publicData.direction = ">")
    {
        if(activeBlockProperties.data[0][value] > activeBlockProperties.publicData.threshold){
            pass = true;
        }
    } else if(activeBlockProperties.publicData.direction = "<")
    {
        if(activeBlockProperties.data[0][value] < activeBlockProperties.publicData.threshold){
            pass = true;
        }
    }

    var outputData = [{},{},{},{}];
    var key;

    for (key in activeBlockProperties.data[0]) {
        outputData[0][key] = activeBlockProperties.data[0][key];
    }

    // calculate final output
    if(pass){
        if(activeBlockProperties.publicData.digital){
            outputData[0][value] = 1;
        }
    } else {
        outputData[0][value] = 0;
    }

    callback(objectID, logicID, linkID, outputData);
};