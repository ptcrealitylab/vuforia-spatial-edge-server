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
 * @desc prototype for a source. This prototype is called when a value should be changed.
 * It defines how this value should be transformed before sending it to the destination.
 * @param {object} objectID Origin object in which the related link is saved.
 * @param {string} linkPositionID the id of the link that is related to the call
 * @param {value} inputData the data that needs to be processed
 * @param {function} callback the function that is called for when the process is rendered.
 * @note the callback has the same structure then the initial prototype, however inputData has changed to outputData
 **/

var xml2js = require('xml2js');
var fs = require('fs');
var ip = require('ip');       // get the device IP address library
var dgram = require('dgram'); // UDP Broadcasting library
var os = require('os');
var path = require('path');


var hardwareInterfaces = {};

var identityFolderName = '.identity'; // TODO: get this from server.js
var homedir =  path.join(path.join(os.homedir(), 'Documents'), 'spatialToolbox');
const oldHomeDirectory = path.join(path.join(os.homedir(), 'Documents'), 'realityobjects');

// Default back to old realityObjects dir if it exists
if (!fs.existsSync(homedir) &&
    fs.existsSync(oldHomeDirectory)) {
    homedir = oldHomeDirectory;
}

var hardwareIdentity = homedir + '/.identity';

exports.writeObject = function (objectLookup, folder, id) {
    objectLookup[folder] = {id: id};
};

exports.readObject = function (objectLookup, folder) {
    if (objectLookup.hasOwnProperty(folder)) {
        return objectLookup[folder].id;
    } else {
        return null;
    }
};

exports.createFolder = function (folderVar, objectsPath, debug) {

    var folder = objectsPath + '/' + folderVar + '/';
    var identity = objectsPath + '/' + folderVar + '/' + identityFolderName + '/';
    if (debug) console.log('Creating folder: ' + folder);

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    if (!fs.existsSync(identity)) {
        fs.mkdirSync(identity, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });
    }
/*
        if (!fs.existsSync(firstFrame)) {
            fs.mkdirSync(firstFrame, "0766", function (err) {
                if (err) {
                    console.error(err);
                }
            });


        try {
            //   fs.createReadStream(__dirname + "/objects/object.css").pipe(fs.createWriteStream(__dirname + "/objects/" + folderVar + "/object.css"));
          //  fs.createReadStream(dirnameO + "/libraries/objectDefaultFiles/object.js").pipe(fs.createWriteStream(dirnameO + "/objects/" + folderVar + "/object.js"));
            fs.createReadStream(dirnameO + "/libraries/objectDefaultFiles/index.html").pipe(fs.createWriteStream(dirnameO + "/objects/" + folderVar + "/frames/"+frameVar+"/index.html"));
            fs.createReadStream(dirnameO + "/libraries/objectDefaultFiles/bird.png").pipe(fs.createWriteStream(dirnameO + "/objects/" + folderVar + "/frames/"+frameVar+"/bird.png"));

        } catch (e) {
            if (debug) console.log("Could not copy source files", e);
        }

        //  writeObjectToFile(tempFolderName);
    }
    */
};



exports.createFrameFolder = function (folderVar, frameVar, dirnameO, objectsPath, debug, location) {
    if (location === 'global') return;
    var folder = objectsPath + '/' + folderVar + '/';
    var identity = folder + identityFolderName + '/';
    var firstFrame = folder + frameVar + '/';
    if (debug) console.log('Creating frame folder: ' + folder);

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    if (!fs.existsSync(identity)) {
        fs.mkdirSync(identity, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });
    }

    if (!fs.existsSync(firstFrame)) {
        fs.mkdirSync(firstFrame, '0766', function (err) {
            if (err) {
                console.error(err);
            }
        });


        try {
            //   fs.createReadStream(__dirname + "/objects/object.css").pipe(fs.createWriteStream(__dirname + "/objects/" + folderVar + "/object.css"));
            //  fs.createReadStream(dirnameO + "/libraries/objectDefaultFiles/object.js").pipe(fs.createWriteStream(dirnameO + "/objects/" + folderVar + "/object.js"));
            fs.createReadStream(dirnameO + '/libraries/objectDefaultFiles/index.html').pipe(fs.createWriteStream(objectsPath + '/' + folderVar + '/' + frameVar + '/index.html'));
            fs.createReadStream(dirnameO + '/libraries/objectDefaultFiles/bird.png').pipe(fs.createWriteStream(objectsPath + '/' + folderVar + '/' + frameVar + '/bird.png'));

        } catch (e) {
            if (debug) console.error('Could not copy source files', e);
        }

        //  writeObjectToFile(tempFolderName);
    }
};



/**
 * Deletes a directory from the hierarchy. Intentionally limited to frames so that you don't delete something more important.
 * @param objectKey
 * @param frameKey
 * @param dirname0
 */
exports.deleteFrameFolder = function(objectName, frameName, objectsPath) {

    function deleteFolderRecursive(path) {
        console.log('deleteFolderRecursive');
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file) {
                var curPath = path + '/' + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }

    console.log('objectName', objectName);
    console.log('frameName', frameName);

    var folderPath = objectsPath + '/' + objectName + '/' + frameName;
    console.log('delete frame folder', folderPath);

    var acceptableFrameNames = ['gauge', 'decimal', 'graph', 'light']; // TODO: remove this restriction
    var isDeletableFrame = false;
    acceptableFrameNames.forEach(function(nameOption) {
        if (frameName.indexOf(nameOption) > -1) {
            isDeletableFrame = true;
            console.log('it is a ' + nameOption + ' frame');
        }
    });

    if (isDeletableFrame) {
        deleteFolderRecursive(folderPath);
    }
};

/**
 * Generates a random number between the two inputs, inclusive.
 * @param {number} min - The minimum possible value.
 * @param {number} max - The maximum possible value.
 */
exports.randomIntInc = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Generates a 12-digit unique identifier string, much of which is based on the current time.
 */
exports.uuidTime = function () {
    var dateUuidTime = new Date();
    var abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + '' + dateUuidTime.getTime()).toString(36);
    while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
};

var getObjectIdFromTarget = function (folderName, objectsPath) {

    if (folderName === 'allTargetsPlaceholder') {
        return 'allTargetsPlaceholder000000000000';
    }

    var xmlFile = objectsPath + '/' + folderName + '/' + identityFolderName + '/target/target.xml';

    if (fs.existsSync(xmlFile)) {
        var resultXML = '';
        xml2js.
            Parser().
            parseString(fs.readFileSync(xmlFile, 'utf8'),
                function (err, result) {
                    for (var first in result) {
                        for (var secondFirst in result[first].Tracking[0]) {
                            resultXML = result[first].Tracking[0][secondFirst][0].$.name;
                            break;
                        }
                        break;
                    }
                });

        return resultXML;
    } else {
        return null;
    }
};
exports.getObjectIdFromTarget = getObjectIdFromTarget;

/**
 *
 * @param folderName
 * @param objectsPath
 * @return {Array.<float>}
 */
exports.getTargetSizeFromTarget = function (folderName, objectsPath) {

    if (folderName === 'allTargetsPlaceholder') {
        return 'allTargetsPlaceholder000000000000';
    }

    var xmlFile = objectsPath + '/' + folderName + '/' + identityFolderName + '/target/target.xml';

    var resultXML = {
        width: 0.3, // default width and height so it doesn't crash if there isn't a size in the xml
        height: 0.3
    };

    if (fs.existsSync(xmlFile)) {
        try {
            xml2js.Parser().parseString(fs.readFileSync(xmlFile, 'utf8'), function (err, result) {
                let first = Object.keys(result)[0];
                let secondFirst = Object.keys(result[first].Tracking[0])[0];
                var sizeString = result[first].Tracking[0][secondFirst][0].$.size;
                var sizeFloatArray = sizeString.split(' ').map(function(elt) {
                    // TODO: this assumption makes it backwards compatible but might cause problems in the future
                    return (parseFloat(elt) < 10) ? parseFloat(elt) : 0.001 * parseFloat(elt); // detect meter or mm scale
                });
                resultXML = {
                    width: sizeFloatArray[0],
                    height: sizeFloatArray[1]
                };
            });
        } catch (e) {
            console.warn('error parsing xml, returning default size');
        }
    }

    return resultXML;
};

/**
 * Saves the RealityObject as "object.json"
 * (Writes the object state to permanent storage)
 * @param {object}   objects - The array of objects
 * @param {string}   object    - The key used to look up the object in the objects array
 * @param {string}   objectsPath  - The base directory name in which an "objects" directory resides.
 * @param {boolean}   writeToFile  - Give permission to write to file.
 **/
exports.writeObjectToFile = function (objects, object, objectsPath, writeToFile) {
    if (writeToFile) {
        // console.log("start saving");
        var outputFilename = objectsPath + '/' + objects[object].name + '/' + identityFolderName + '/object.json';
        var objectData = objects[object];

        fs.writeFile(outputFilename, JSON.stringify(objectData, null, '\t'), function (err) {
            if (err) {
                console.error(err);
            } else {
                // console.log("JSON saved to " + outputFilename);
            }
        });
    } else {
        console.error('I am not allowed to save');
    }
};

var crcTable = [0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
    0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
    0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
    0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
    0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
    0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
    0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
    0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
    0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
    0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
    0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
    0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
    0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
    0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
    0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
    0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
    0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
    0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
    0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
    0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
    0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
    0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
    0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
    0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
    0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
    0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
    0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
    0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
    0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
    0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
    0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
    0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
    0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
    0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
    0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
    0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
    0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
    0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
    0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
    0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
    0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
    0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D];


var crc = 0xffffffff;

function crc32(data) {
    for (var i = 0, l = data.length; i < l; i++) {
        crc = crc >>> 8 ^ crcTable[ crc & 255 ^ data[i] ];
    }
    return (crc ^ -1) >>> 0;
}


function crc16reset() {
    crc = 0xffffffff;
}

function itob62(i) {
    var u = i;
    var b32 = '';
    do {
        var d = Math.floor(u % 62);
        if (d < 10) {

            b32 = String.fromCharCode('0'.charCodeAt(0) + d) + b32;
        } else if (d < 36) {
            b32 = String.fromCharCode('a'.charCodeAt(0) + d - 10) + b32;
        } else {
            b32 = String.fromCharCode('A'.charCodeAt(0) + d - 36) + b32;
        }

        u = Math.floor(u / 62);

    } while (u > 0);

    return b32;
}

/**
 * Generates a checksum of all files hand over with fileArray
 * @param objects hand over the overall object list
 * @param fileArray The array that represents all files that should be checksumed
 * @return {string} checksum text
 */
exports.generateChecksums = function(objects, fileArray) {
    crc16reset();
    var checksumText;
    for (var i = 0; i < fileArray.length; i++) {
        if (fs.existsSync(fileArray[i])) {
            checksumText = itob62(crc32(fs.readFileSync(fileArray[i])));
        }
    }
    console.log('created Checksum', checksumText);
    return checksumText;
};


exports.updateObject = function(objectName, objects) {
    console.log('update ', objectName);

    var objectFolderList = fs.readdirSync(homedir).filter(function (file) {
        return fs.statSync(homedir + '/' + file).isDirectory();
    });

    try {
        while (objectFolderList[0][0] === '.') {
            objectFolderList.splice(0, 1);
        }
    } catch (e) {
        console.log('no hidden files');
    }


    for (var i = 0; i < objectFolderList.length; i++) {
        if (objectFolderList[i] === objectName) {
            var tempFolderName = getObjectIdFromTarget(objectFolderList[i], homedir);
            console.log('TempFolderName: ' + tempFolderName);

            if (tempFolderName !== null) {
                // fill objects with objects named by the folders in objects

                objects[tempFolderName].name = objectFolderList[i];

                // try to read a saved previous state of the object
                try {
                    objects[tempFolderName] = JSON.parse(fs.readFileSync(homedir + '/' + objectFolderList[i] + '/' + identityFolderName + '/object.json', 'utf8'));
                    objects[tempFolderName].ip = ip.address();

                    // this is for transforming old lists to new lists
                    if (typeof objects[tempFolderName].objectValues !== 'undefined') {
                        objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].objectValues;
                        delete  objects[tempFolderName].objectValues;
                    }
                    if (typeof objects[tempFolderName].objectLinks !== 'undefined') {
                        objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].objectLinks;
                        delete  objects[tempFolderName].objectLinks;
                    }


                    if (typeof objects[tempFolderName].nodes !== 'undefined') {
                        objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].nodes;
                        delete  objects[tempFolderName].nodes;
                    }
                    if (typeof objects[tempFolderName].links !== 'undefined') {
                        objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].links;
                        delete  objects[tempFolderName].links;
                    }


                    for (var nodeKey in objects[tempFolderName].frames[tempFolderName].nodes) {

                        if (typeof objects[tempFolderName].nodes[nodeKey].item !== 'undefined') {
                            var tempItem = objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].item;
                            objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].data = tempItem[0];
                        }
                    }

                    console.log('I found objects that I want to add');


                } catch (e) {
                    objects[tempFolderName].ip = ip.address();
                    objects[tempFolderName].objectId = tempFolderName;
                    console.log('No saved data for: ' + tempFolderName);
                }

            } else {
                console.log(' object ' + objectFolderList[i] + ' has no marker yet');
            }
            return tempFolderName;
        }
    }
    return null;
};

exports.loadHardwareInterface = function(hardwareInterfaceName) {

    var hardwareFolder = hardwareIdentity + '/' + hardwareInterfaceName + '/';


    if (!fs.existsSync(hardwareIdentity)) {
        fs.mkdirSync(hardwareIdentity, '0766', function (err) {
            if (err) {
                console.log(err);
            }
        });
    }

    if (!fs.existsSync(hardwareFolder)) {
        fs.mkdirSync(hardwareFolder, '0766', function (err) {
            if (err) {
                console.log(err);
            }
        });
    }

    if (!fs.existsSync(hardwareFolder + 'settings.json')) {
        fs.writeFile(hardwareFolder + 'settings.json', '', function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log('JSON created to ' + hardwareFolder + 'settings.json');
            }
        });
    }

    try {
        var fileContents = fs.readFileSync(hardwareFolder + 'settings.json', 'utf8');
        var fileContentsJson = JSON.parse(fileContents);
        hardwareInterfaces[hardwareInterfaceName] = fileContentsJson;

    } catch (e) {
        console.log('Could not Load: ' + hardwareInterfaceName);
        hardwareInterfaces[hardwareInterfaceName] = {};
    }

    this.read = function (settingsName, defaultvalue) {
        if (typeof  hardwareInterfaces[hardwareInterfaceName][settingsName] === 'undefined') {
            if (typeof defaultvalue !== 'undefined')
                hardwareInterfaces[hardwareInterfaceName][settingsName] = defaultvalue;
            else {
                hardwareInterfaces[hardwareInterfaceName][settingsName] = 0;
            }
        }
        return hardwareInterfaces[hardwareInterfaceName][settingsName];
    };
    return this.read;
};

/**
 * Broadcasts a JSON message over UDP
 * @param {*} action - JSON object with no specified structure, contains the message to broadcast
 * @param {number|undefined} timeToLive
 * @param {number|undefined} beatport
 */
exports.actionSender = function(action, timeToLive, beatport) {
    if (!timeToLive) timeToLive = 2;
    if (!beatport) beatport = 52316;
    console.log(action);

    var HOST = '255.255.255.255';
    var message;

    message = new Buffer(JSON.stringify({action: action}));

    // creating the datagram
    var client = dgram.createSocket('udp4');
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(timeToLive);
        client.setMulticastTTL(timeToLive);
    });
    // send the datagram
    client.send(message, 0, message.length, beatport, HOST, function (err) {
        if (err) {
            console.log('You\'re not on a network. Can\'t send anything');
        }
        client.close();
    });

};
