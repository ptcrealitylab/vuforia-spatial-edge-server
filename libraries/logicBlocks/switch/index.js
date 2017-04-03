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
    name : "switch",
    blockSize : 2,
    privateData : {},
    publicData : {switchType : "toggle", switch: false, toggle: false},
    activeInputs : [true, true, false, false],
    activeOutputs : [true, true, false, false],
    iconImage : "icon.png",
    nameInput : ["in", "stream in", "", ""],
    nameOutput : ["out", "stream out", "", ""],
    type : "switch"
};

var switchValue = 0;

exports.properties = generalProperties;

exports.setup = function (object,logic, block, activeBlockProperties){
// add code here that should be executed once.

};

//var logicAPI = require(__dirname + '/../../libraries/logicInterfaces');

exports.render = function (object, node, block, index, thisBlock, callback)  {

    if(thisBlock.publicData.switchType ===  "toggle"){

        if(thisBlock.data[0].value > 0.5 ){
            if(thisBlock.publicData.toggle !== true) {
                thisBlock.publicData.toggle = true;

                thisBlock.publicData.switch = !thisBlock.publicData.switch;

            }
        } else {
            thisBlock.publicData.toggle = false;
        }

    } else {
        if(thisBlock.data[0].value > 0.5){
            thisBlock.publicData.switch = true;
        } else {
            thisBlock.publicData.switch = false;
        }
    }

    if(thisBlock.publicData.switch) {
        for (var key in thisBlock.data[index]) {
            thisBlock.processedData[index][key] = thisBlock.data[index][key];
        }

        if (index === 0)   thisBlock.processedData[index].value = 1;
    }
    else {
        thisBlock.processedData[index].value = 0;
    }

    callback(object, node, block, index, thisBlock);
};
