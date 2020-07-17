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

var utilities = require('./utilities');
var fs = require('fs');
var debug = false;
var path = require('path');
var hardwareAPI = require('./hardwareInterfaces');

var identityFolderName = '.identity'; // TODO: get this from server.js
var worldObjectPrefix = '_WORLD_'; // TODO: get this from server.js

// Constructor with subset of object information necessary for the web frontend
function ThisObjects() {
    this.name = '';
    this.initialized = false;
    this.frames = {};
    this.visualization = 'AR';
    this.active = false;
    this.zone = '';
    this.screenPort = '';
    this.isWorldObject = false;
}

// Constructor with subset of frame information necessary for the web frontend
function Frame() {
    this.name = '';
    this.location = 'local'; // or 'global'
    this.src = ''; // the frame type, e.g. 'slider-2d' or 'graphUI'
}

/**
 * Injects the specified config.html file for a hardware interface with the relevant state of the server
 * @param {string} hardwareInterfaceName
 * @param {Object.<string, {enabled: boolean, configurable: boolean}>} hardwareInterfaceModules
 * @param {string} version
 * @param {string} ipAddress
 * @param {number} serverPort
 * @param {string} configHtmlPath - absolute path to the config.html file in whatever addon it may belong to
 * @return {string} - returns the page's HTML as a string
 */
exports.generateHtmlForHardwareInterface = function(hardwareInterfaceName, hardwareInterfaceModules, version, ipAddress, serverPort, configHtmlPath) {
    console.log(hardwareInterfaceName, ipAddress, serverPort, hardwareInterfaceModules);

    let html = '';
    try {
        html = fs.readFileSync(configHtmlPath, 'utf8');
    } catch (e) {
        let errorMessage = 'Couldn\'t find config.html file for hardwareInterface: ' + hardwareInterfaceName + ' at path: ' + configHtmlPath;
        console.warn(errorMessage);
        return errorMessage; // render error message instead of html
    }

    // inject the data structure with all the hardware interfaces
    html = html.replace('{/*replace HardwareInterface*/}', JSON.stringify(hardwareInterfaceModules[hardwareInterfaceName], null, 4));

    html = html.replace('{/*replace HardwareInterfaceName*/}', JSON.stringify(hardwareInterfaceName, null, 4));

    // inject the server information
    var states = {
        version: version,
        ipAdress: ipAddress,
        serverPort: serverPort
    };
    html = html.replace('{/*replace States*/}', JSON.stringify(states, null, 4));

    return html;
};

exports.printFolder = function (objects, objectsPath, debug, objectInterfaceName, objectLookup, version, ipAddress, serverPort, frameTypeModules, hardwareInterfaceModules, globalFramesPath) {

    // overall data structure that contains everything that will be passed into the HTML template
    var newObject = {};

    var tempFiles = fs.readdirSync(objectsPath).filter(function (file) {
        return fs.statSync(path.join(objectsPath, file)).isDirectory();
    });
    // remove hidden directories
    while (tempFiles.length > 0 && tempFiles[0][0] === '.') {
        tempFiles.splice(0, 1);
    }

    // populate the data for each object template on the frontend, using data from each directory found in the spatialToolbox directory
    tempFiles.forEach(function(objectKey) {

        var thisObjectKey = objectKey;
        var tempKey = utilities.getObjectIdFromTargetOrObjectFile(objectKey, objectsPath); // gets the object id from the xml target file
        if (tempKey) {
            thisObjectKey = tempKey;
        }

        for (let key in objects) {
            if (objects[key].name === objectKey) {
                if (objects[key].isAnchor || thisObjectKey === objectKey) {
                    thisObjectKey = key;
                }
            }
        }

        // create a data structure for the information to create the DOM elements representing this object
        newObject[thisObjectKey] = new ThisObjects();

        // TODO: more robust way to keep track of world objects that haven't been fully initialized with a target (for now, the name is the only way to tell)
        if (thisObjectKey.indexOf(worldObjectPrefix) > -1) {
            newObject[thisObjectKey].isWorldObject = true;
        }

        // check if the object is correctly initialized with tracking targets
        var datExists = fs.existsSync(path.join(objectsPath, objectKey, identityFolderName, '/target/target.dat'));
        var xmlExists = fs.existsSync(path.join(objectsPath, objectKey, identityFolderName, '/target/target.xml'));
        var jpgExists = fs.existsSync(path.join(objectsPath, objectKey, identityFolderName, '/target/target.jpg'));

        if ((xmlExists && datExists && jpgExists) || (xmlExists && jpgExists)) {
            console.log('object files exist: ' + objectKey);
            newObject[thisObjectKey].initialized = true;
            newObject[thisObjectKey].targetName = thisObjectKey; // obtained earlier from the xml file
        } else {
            newObject[thisObjectKey].initialized = false;
            newObject[thisObjectKey].targetName = objectKey + utilities.uuidTime(); // generates a suggested uuid for the target
        }

        // world objects are always initialized true regardless of target data

        // if (newObject[thisObjectKey].isWorldObject) {
        //   newObject[thisObjectKey].initialized = true;
        // }

        if (thisObjectKey in objects) {
            if (objects[thisObjectKey].isAnchor) {
                newObject[thisObjectKey].initialized = objects[thisObjectKey].isAnchor;
            }
            newObject[thisObjectKey].isAnchor = objects[thisObjectKey].isAnchor;
        }

        newObject[thisObjectKey].targetsExist = {
            datExists: datExists,
            xmlExists: xmlExists,
            jpgExists: jpgExists
        };

        // if the object has been correctly created (with tracking targets), populate the DOM with its frames and other data
        if (newObject[thisObjectKey].initialized && objects[thisObjectKey]) {

            newObject[thisObjectKey].active = !objects[thisObjectKey].deactivated;
            newObject[thisObjectKey].visualization = objects[thisObjectKey].visualization;
            newObject[thisObjectKey].zone = objects[thisObjectKey].zone;
            newObject[thisObjectKey].screenPort = hardwareAPI.getScreenPort(thisObjectKey);

            // populate the data for each frame template on the frontend, using data from the object json structure
            for (var frameKey in objects[thisObjectKey].frames) {
                newObject[thisObjectKey].frames[frameKey] = new Frame(thisObjectKey, frameKey);
                newObject[thisObjectKey].frames[frameKey].name = objects[thisObjectKey].frames[frameKey].name;
                newObject[thisObjectKey].frames[frameKey].location = objects[thisObjectKey].frames[frameKey].location; // 'global' or 'local'
                newObject[thisObjectKey].frames[frameKey].src = objects[thisObjectKey].frames[frameKey].src; // the frame type, e.g. 'graphUI'
            }
        }

        newObject[thisObjectKey].name = objectKey;
    });

    // loads the index.html content
    var html = fs.readFileSync(path.join(__dirname, 'webInterface', 'gui', 'index.html'), 'utf8');

    // update the correct library paths
    html = html.replace(/href="/g, 'href="../libraries/gui/');
    html = html.replace(/src="/g, 'src="../libraries/gui/');

    // inject the data structure with all objects
    html = html.replace('{/*replace Object*/}', JSON.stringify(newObject, null, 4));

    // inject the data structure with all the possible Spatial Tools
    html = html.replace('{/*replace Frames*/}', JSON.stringify(frameTypeModules, null, 4));

    // inject the data structure with all the hardware interfaces
    html = html.replace('{/*replace HardwareInterfaces*/}', JSON.stringify(hardwareInterfaceModules, null, 4));

    // inject the server information
    var states = {
        version: version,
        ipAdress: ipAddress,
        serverPort: serverPort,
        globalFramesPath: globalFramesPath
    };
    html = html.replace('{/*replace States*/}', JSON.stringify(states, null, 4));

    return html;
};

exports.uploadInfoText = function (parm) {
    var text = '<html>\n' +
        '<head>\n' +
        '<head>' +
        '    <link rel="stylesheet" href="../libraries/css/bootstrap.min.css">\n' +
        '    <link rel="stylesheet" href="../libraries/css/bootstrap-adjustments.css">\n' +
        '</head>\n' +
        '<body style="height:100vh; width: 100%">\n' +
        '<div class="container" id="container" style="width: 750px;">\n' +
        '    <div class="panel panel-primary">\n' +
        '<div class="panel-heading">\n' +
        '<h3 class="panel-title"><font size="6">Reality Object - ' + parm + ' - Info&nbsp;&nbsp;&nbsp;&nbsp;<a href="../" style=" color: #ffffff; text-decoration: underline;">back</a></font></h3>\n' +
        '      </div>\n' +
        '</div>\n' +
'<div id="changeContent"></div>' +

'<script>' +

        '/*var myVar = setInterval(loadInfoContent, 100);*/' +
        'loadInfoContent();' +
        'function loadInfoContent () {console.log("newtick");' +

   'var con = document.getElementById("changeContent")' +
    '    ,   xhr = new XMLHttpRequest();' +

    'xhr.onreadystatechange = function (e) {' +
     '   if (xhr.readyState == 4 && xhr.status == 200) {' +
      '      con.innerHTML = xhr.responseText;' +
        'setTimeout(loadInfoContent, 100);' +

       ' }' +
    '}; ' +
        'xhr.open("GET", "/infoLoadData/' + parm + '", true);' +
 '   xhr.setRequestHeader("Content-type", "text/html");' +
  '  xhr.send();' +
'}' +

        '</script>' +
        '</div>\n' +
        '</body>\n' +
        '</html>\n' +
        '';


    return text;


    // var tempFolderName = tempFiles[i] + macAddress.replace(/:/gi, '');

    // fill objects with objects named by the folders in objects
    // objects[tempFolderName] = new ObjectExp();
    // objects[tempFolderName].name = tempFiles[i];
};


exports.uploadInfoContent = function (parm, objectLookup, objects, knownObjects, socketsInfo) {
    var objectName = utilities.readObject(objectLookup, parm); //parm + thisMacAddress;


    var uploadInfoTexttempArray = objects[objectName];
    var uploadInfoTexttempArrayValue = objects[objectName];

    // objects[objectName]

    var text =
        '<div id="actions" class="row">\n' +
        '    <div class="col-xs-6">\n' +
        '       <table class="table table-striped">\n' +
        '            <thead>\n' +
        '          <tr>\n' +
        '            <th class="info">Index</th>\n' +
        '            <th class="info">I/O Name</th>\n' +
        '            <th class="info">Value</th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';

    var protocolText = '';
    if (objects[objectName].protocol === 'R0') protocolText = 'R0 over WebSocket';
    if (objects[objectName].protocol === 'R1') protocolText = 'R1 over WebSocket';

    var infoCount = 0;
    for (var frameKey in uploadInfoTexttempArrayValue.frames) {
        if ( Object.keys(uploadInfoTexttempArrayValue.frames).length > 1) {
            text += '          <tr>\n' +
                '            <td  colspan="3"><b>Frame: ' + uploadInfoTexttempArrayValue.frames[frameKey].name + '</b></td>\n' +
                '        </tr>\n';
        }


        for (let subKey in uploadInfoTexttempArrayValue.frames[frameKey].nodes) {

            var thisHtmlNode = uploadInfoTexttempArrayValue.frames[frameKey].nodes[subKey];


            if (thisHtmlNode.name === '') thisHtmlNode.name = 'LOGIC';

            if (typeof thisHtmlNode.routeBuffer !== 'undefined' && thisHtmlNode.routeBuffer !== null && thisHtmlNode.type === 'logic') {

                text += '<tr> <td>' + infoCount + '</td><td>' + thisHtmlNode.name + '</td><td>' + thisHtmlNode.routeBuffer[0] + '<br>' +
                    '' + thisHtmlNode.routeBuffer[1] + '<br>' +
                    '' + thisHtmlNode.routeBuffer[2] + '<br>' +
                    '' + thisHtmlNode.routeBuffer[3] + '<br></td></tr>';
            } else {
                if (!thisHtmlNode.text) {
                    text += '<tr> <td>' + infoCount + '</td><td>' + thisHtmlNode.name + '</td><td>' + thisHtmlNode.data.value + '</td></tr>';
                } else {
                    text += '<tr> <td>' + infoCount + '</td><td>' + thisHtmlNode.text + '</td><td>' + thisHtmlNode.data.value + '</td></tr>';
                }

            }


            infoCount++;


        }
    }

    if (infoCount === 0) {
        text += '<tr> <td> - </td><td> - </td></tr>';
    }

    text +=
        '        </tbody>\n' +
        '    </table>\n' +
        '</div>\n' +
        '<div class="col-xs-6">\n' +
        '    <table class="table table-striped">\n' +
        '        <thead>\n' +
        '        <tr>\n' +
        '            <th class="info">Object Information</th>\n' +
        '            <th class="info"></th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n' +
        /*     '<tr>\n'+
         '            <th scope="row">Arduino Instance</th>\n'+
         '            <td>'+ArduinoINstance+'</td>\n'+
         '        </tr>\n'+*/
        '        <tr>\n' +
        '            <th scope="row">Ip</th>\n' +
        '            <td>' + objects[objectName].ip + '</td>\n' +
        '        </tr>\n' +
        '        <tr>\n' +
        '            <th scope="row">Version</th>\n' +
        '            <td>' + objects[objectName].version + '</td>\n' +
        '        </tr>\n' +
        '        <tr>\n' +
        '            <th scope="row">Protocol</th>\n' +
        '            <td>' + protocolText + '</td>\n' +
        '        </tr>\n' +
        '        <tr>\n' +
        '            <th scope="row">Amount of Sockets</th>\n' +
        '            <td>' + socketsInfo.sockets + '</td>\n' +
        '        </tr>\n' +
        '        <tr>\n' +
        '            <th scope="row">Connected</th>\n' +
        '            <td>' + socketsInfo.connected + '</td>\n' +
        '        </tr>\n' +
        '        <tr>\n' +
        '            <th scope="row">Disconnected</th>\n' +
        '            <td>' + socketsInfo.notConnected + '</td>\n' +
        '        </tr>\n' +
        '        </tbody>\n' +
        '    </table>\n' +
        '    <table class="table table-striped">\n' +
        '        <thead>\n' +
        '        <tr>\n' +
        '            <th class="info"><small>Known Objects</small></th>\n' +
        '            <th class="info"><small><small><small>Version &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; IP &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Protocol</small></small></small></th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';


    infoCount = 0;
    for (let subKey in knownObjects) {
        text += '<tr><td><small><small><small>' + subKey + '</small></small></small></td>' +
            '<td><small><small><small>' + knownObjects[subKey].version + ' &nbsp; &nbsp; ' + knownObjects[subKey].ip +  ' &nbsp; &nbsp; ' + knownObjects[subKey].protocol +  '</small></small></small></td></tr>';
        infoCount++;
    }

    if (infoCount === 0) {
        text += '<tr> <td><small>no Object found</small></td><td> </td></tr>';
    }

    text +=
        '        </tbody>\n' +
        '    </table>\n' +
        '</div>\n' +
        ' </div>\n' +

        ' <div id="actions" class="row">\n' +
        '<div class="col-xs-6">\n' +

        '   </div>\n' +
        ' </div>\n' +

        ' <div id="actions" class="row">\n' +
        ' <div class="col-xs-12">\n' +
        '   <table class="table table-striped">\n' +
        '        <thead>\n' +
        '        <tr>\n' +
        '            <th class="info"><small>Active Link ID</small></th>\n' +
        '            <th class="info"><small>Origin Object</small></th>\n' +
        '            <th class="info"><small>Origin Node</small></th>\n' +
        '            <th class="info"><small>Destination Object</small></td>\n' +
        '            <th class="info"><small>Destination Node</small></th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';


    infoCount = 0;
    for (var framekey in uploadInfoTexttempArray.frames) {
        if ( Object.keys(uploadInfoTexttempArray.frames).length > 1) {
            text += '          <tr>\n' +
                '            <td  colspan="5"><b>Frame: ' + uploadInfoTexttempArrayValue.frames[frameKey].name + '</b></td>\n' +
                '        </tr>\n';
        }


        for (let subKey in uploadInfoTexttempArray.frames[framekey].links) {
            if (uploadInfoTexttempArray.frames[framekey].links[subKey].hasOwnProperty('namesA'))
                text += '<tr> <td><font size="2">' + subKey + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].namesA[0] + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].namesA[1] + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].namesB[0] + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].namesB[1] + '</font></td></tr>\n';
            else
                text += '<tr> <td><font size="2">' + subKey + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].objectA + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].nodeA + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].objectB + '</font></td><td><font size="2">' + uploadInfoTexttempArray.frames[framekey].links[subKey].nodeB + '</font></td></tr>\n';

            infoCount++;
        }
    }

    if (infoCount === 0) {
        text += '<tr> <td>no Link found</td><td>  </td><td>  </td><td>  </td><td>  </td></tr>';
    }

    text +=
        '        </tbody>\n' +
        '    </table>\n' +
        '</div>\n' +
        '</div>\n' +
        '';


    return text;


    // var tempFolderName = tempFiles[i] + macAddress.replace(/:/gi, '');

    // fill objects with objects named by the folders in objects
    // objects[tempFolderName] = new ObjectExp();
    // objects[tempFolderName].name = tempFiles[i];
};



exports.uploadTargetText = function (parm, objectLookup, objects) {
    if (debug) console.log('target content');
    var objectName = '';
    if (objects.hasOwnProperty(utilities.readObject(objectLookup, parm))) {

        objectName = utilities.readObject(objectLookup, parm);
    } else {
        objectName = parm + utilities.uuidTime();
    }

    var text = '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '   <meta charset="utf-8">\n' +
        '   <link rel="stylesheet" href="../libraries/css/bootstrap.min.css">\n' +
        '   <link rel="stylesheet" href="../libraries/css/bootstrap-adjustments.css">\n' +
        '   <script src="../libraries/js/dropzone.js"></script>\n' +
        '    <style>\n' +
        '        #total-progress {\n' +
        '            opacity: 0;\n' +
        '            transition: opacity 0.3s linear;\n' +
        '        }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body style="height:100vh; weight: 100%; background-color: #ffffff;  background:repeating-linear-gradient(-45deg, #e4f6ff, #e4f6ff 5px, white 5px, white 10px);" >\n' +
        '<div class="container" id="container" style="width: 750px;">\n' +
        '    <div class="panel panel-primary">\n' +
        '        <div class="panel-heading">\n';

    if (parm !== 'allTargetsPlaceholder') {
        text +=
            '            <h3 class="panel-title"><font size="6">Reality Object - ' + parm + ' - Target&nbsp;&nbsp;&nbsp;&nbsp;<a href="../" style=" color: #ffffff; text-decoration: underline;">back</a></font></h3>\n';
    } else {
        text +=
            '            <h3 class="panel-title"><font size="6">Reality Object - single Targets File&nbsp;&nbsp;&nbsp;&nbsp;<a href="../" style=" color: #ffffff; text-decoration: underline;">back</a></font></h3>\n';
    }
    text +=
        '        </div>\n' +
        '    </div>\n' +
        '    <div id="actions" class="row">\n' +
        '        <div class="col-xs-7">\n';

    if (parm !== 'allTargetsPlaceholder') {
        text +=
            '  <b>1. Upload your target source image (jpg only, < 0.5 MB)</b><br>' +
            '            2. Login to the Vuforia Target Manager.<br>' +
            '            3. Create a new or open a Device Databases.<br>' +
            '            4. Create a target for your Object and name it exactly:<br><b>&nbsp;&nbsp;&nbsp;&nbsp;' + objectName + '</b><br>' +
            '            5. Make sure that only this one Target is Activated.<br>' +
            '            6. Download the database and then upload it here:<br>' +
            '            (You can just drag and drop the files anywhere in the striped area)';
    } else {
        text +=
            '  <b>1. Upload a random jpg image (jpg only, < 0.5 MB)</b><br>' +
            '            2. Login to the Vuforia Target Manager.<br>' +
            '            3. Download a device database that includes all targets generated for your objects.<br>' +
            '            6. Download the database and then upload it here:<br>' +
            '            (You can just drag and drop the files anywhere in the striped area)';
    }

    text +=
        '        </div>' +
        '        <div class="col-xs-5">' +
        '            ' +
        '            <button class="btn btn-info" id="copy-button" data-clipboard-text="' + objectName + '"' +
        '                    title="Click to copy me.">Copy Object Name to Clipboard' +
        '            </button>' +
        '    <script src="../libraries/js/ZeroClipboard.js"></script>' +
        '    <script>' +
        '    var client = new ZeroClipboard( document.getElementById("copy-button") );' +
        '</script>' +
        '            <br><br><span class="fileupload-process">' +
        '          <div id="total-progress" class="progress progress-striped active" role="progressbar" aria-valuemin="0"' +
        '               aria-valuemax="100" aria-valuenow="0">' +
        '              <div class="progress-bar progress-bar-success" style="width:100%;" data-dz-uploadprogress></div>' +
        '          </div>' +
        '        </span>' +
        '        <span class="btn btn-primary fileinput-button" id="targetButton">' +
        '            <span>&nbsp;Upload Target zip and jpg Files&nbsp;</span>' +
        '        </span>' +
        '        </div>' +
        '    </div>' +
        '    <div class="table table-striped" class="files" id="previews" style="visibility: hidden">' +
        '        <div id="template" class="file-row">' +
        '        </div>' +
        '    </div>' +
        '    <script>' +
        '        var previewNode = document.querySelector("#template");' +
        '        previewNode.id = "";' +
        '        var previewTemplate = previewNode.parentNode.innerHTML;' +
        '        previewNode.parentNode.removeChild(previewNode);' +
        '        var myDropzone = new Dropzone(document.body, {' +
        '            url: "/content/' + parm + '",' +
        '            autoProcessQueue: true,' +
        '            thumbnailWidth: 80,' +
        '            thumbnailHeight: 80,' +
        'headers: { "type": "targetUpload" },' +
        '            parallelUploads: 20,' +
        '            createImageThumbnails: false,' +
        '            previewTemplate: previewTemplate,' +
        '            autoQueue: true,' +
        '            previewsContainer: "#previews",' +
        '            clickable: ".fileinput-button"' +
        '        });' +
        '        myDropzone.on("addedfile", function (file) {' +
        '           ' +
        '           ' +
        '        });' +
        '        myDropzone.on("drop", function (file) {' +
        '           ' +
        '            myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));' +
        '        });' +
        '        ' +
        '        myDropzone.on("totaluploadprogress", function (progress) {' +
        '            document.querySelector("#total-progress").style.width = progress + "%";' +
        '        });' +
        '        myDropzone.on("sending", function (file) {' +
        '           ' +
        '            document.querySelector("#total-progress").style.opacity = "1";' +
        '           ' +
        '            ' +
        '        });' +
        '        ' +
        '        myDropzone.on("queuecomplete", function (progress) {' +

        '    });' +

        '       myDropzone.on("success", function (file, responseText) {' +
        '   if(responseText  === "done") {      document.querySelector("#total-progress").style.opacity = "0"; ' +
        '        document.getElementById("targetButton").className = "btn btn-success fileinput-button";' +
        // 'location.reload();' +
        '}' +
        '    });' +
        '    </script>' +
        '</div>' +
        '<iframe src="https://developer.vuforia.com/targetmanager/project/checkDeviceProjectsCreated?dataRequestedForUserId=" width="100%" height="1000px" style="left: 15px; position:absolute; width: calc(100% - 30px); background-color: #ffffff; " frameborder="0"></iframe>' +
        '</body>' +
        '</html>' +


        '';

    return text;

};




exports.uploadTargetContent = function (parm, objectsPath, objectInterfaceName) {
    if (debug) console.log('interface content');
    var text = '';

    var objectPath2 = path.join(objectPath2, parm);

    // List all files in a directory in Node.js recursively in a synchronous fashion
    var walk = function (dir) {
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = path.join(dir, file);
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) results = results.concat(walk(file));
            else results.push(file);
        });
        return results;
    };

    var listeliste = walk(objectPath2);

    var nameOld = '';

    text +=
        '<html>\n' +
        '<head>\n' +
        '<head>\n' +
        '    <link rel="stylesheet" href="../libraries/css/bootstrap.min.css">\n' +
        '    <link rel="stylesheet" href="../libraries/css/bootstrap-adjustments.css">\n' +
        '   <script src="../libraries/js/dropzone.js"></script>\n' +
        '    <style>\n' +
        '        #total-progress {\n' +
        '            opacity: 0;\n' +
        '            transition: opacity 0.3s linear;\n' +
        '        }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body style="height: 100%; width: 100%">\n' +
        '<div class="container" id="container" style="width: 750px;">\n' +
        '    <div class="panel panel-primary">\n' +
        '<div class="panel-heading">\n' +
        '<h3 class="panel-title"><font size="6">Reality Object - ' + parm + ' - File&nbsp;&nbsp;&nbsp;&nbsp;<a href="../" style=" color: #ffffff; text-decoration: underline;">back</a></font></h3>\n' +
        '      </div>\n' +
        '</div>\n' +
        '<div id="actions" class="row">\n' +
        ' <div class="col-xs-7">\n' +
        '   <table class="table table-hover">\n' +
        '        <thead>\n' +
        '        <tr>\n' +
        '            <th class="info">Object Folder</th>\n' +
        '            <th class="info"></th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';


    for (var i = 0; i < listeliste.length; i++) {

        var content = listeliste[i].replace(objectPath2 + '/', '').split('/');

        if (content[1] !== undefined) {
            if (content[0] !== nameOld) {

                // console.log("---" + content[0]);

                text += '<tr><td><font size="2"><span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span>&nbsp;&nbsp;' + content[0] + '</font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0];
                text += '<form id=\'2delete' + i + content[0] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';

                text += '<a href="#" onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';

            }
            // console.log("-"+content[0]);
            //  console.log(content[0]+" / "+content[1]);

            if (content[1][0] !== '.' && content[1][0] !== '_') {
                if (debug)console.log(content[1]);
                var fileTypeF = content[1].split('.')[1].toLowerCase();

                text += '<tr ';
                if (content[1] === 'target.dat' || content[1] === 'target.xml' || content[1] === 'target.jpg') {
                    text += 'class="success"';
                }


                text += '><td><font size="2">';
                text += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
                text += '<span class="';

                if (fileTypeF === 'jpg' || fileTypeF === 'png' || fileTypeF === 'gif' || fileTypeF === 'jpeg') {
                    text += 'glyphicon glyphicon-picture';
                } else {
                    text += 'glyphicon glyphicon-file';
                }


                text += ' aria-hidden="true"></span>&nbsp;&nbsp;<a href = "/obj/' + parm + '/' + content[0] + '/' + content[1] + '">' + content[1] + '</a></font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0] + '/' + content[1];
                text += '<form id=\'1delete' + i + content[1] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';
                if (debug) console.log(dateiTobeRemoved);
                text += '<a href="#"  onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';
            }


            nameOld = content[0];
        } else {
            if (content[0][0] !== '.' && content[0][0] !== '_') {
                var fileTypeF2 = content[0].split('.')[1].toLowerCase();
                text += '<tr ';
                if (fileTypeF2 === 'html' || fileTypeF2 === 'htm') {
                    text += 'class="success"';
                } else if (content[0] === 'object.json' || content[0] === 'object.css' || content[0] === 'object.js') {
                    text += 'class="active"';
                }


                text += '><td><font size="2">';
                text += '<span class="';
                if (fileTypeF2 === 'jpg' || fileTypeF2 === 'png' || fileTypeF2 === 'gif' || fileTypeF2 === 'jpeg') {
                    text += 'glyphicon glyphicon-picture';
                } else {
                    text += 'glyphicon glyphicon-file';
                }


                text += '" aria-hidden="true"></span>&nbsp;&nbsp;<a href = "/obj/' + parm + '/' + content[0] + '">' + content[0] + '</a></font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0];
                text += '<form id=\'1delete' + i + content[0] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';


                if (content[0] === 'object.json' || content[0] === 'object.css' || content[0] === 'object.js') {
                    text += '<span class="badge">delete</span></form></td></tr>';

                } else {
                    text += '<a href="#"  onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';
                }
            }

        }

    }

    text +=

        '' +
        '</div>' +
        '        </tbody>\n' +
        '    </table>\n' +
        '</div> <div class="col-xs-5">\n' +
        'Drag and Drop your interface files anywhere on this window. Make sure that <b>index.html</b> is your startpoint.' +
        ' You can drop all your files at the same time.<br><br>' +
        '<b>object.json</b> holds all relevant information about your object.<br>' +

        ' <br><br><span class="fileupload-process">' +
        '          <div id="total-progress" class="progress progress-striped active" role="progressbar" aria-valuemin="0"' +
        '               aria-valuemax="100" aria-valuenow="0">' +
        '              <div class="progress-bar progress-bar-success" style="width:100%;" data-dz-uploadprogress></div>' +
        '          </div>' +
        '        </span>' +
        '        <span class="btn ';
    if (debug)console.log(objectsPath + parm + '/' + identityFolderName + '/target/target.dat');
    if (fs.existsSync(objectsPath + parm + '/index.htm') || fs.existsSync(objectsPath + '/' + parm + '/index.html')) {
        if (fs.existsSync(objectsPath + parm + '/' + identityFolderName + '/target/target.dat') && fs.existsSync(objectsPath + '/' + parm + '/' + identityFolderName + '/target/target.xml') && fs.existsSync(objectsPath + '/' + parm + '/' + identityFolderName + '/target/target.jpg')) {
            text += 'btn-success';
        } else {
            text += 'btn-warning';
        }
    } else {
        text += 'btn-primary';
    }



    text += ' fileinput-button" id="targetButton">' +
        '            <span>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        'Add Interface Files' +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        '               </span>' +
        '        </span>' +

        '   <div class="table table-striped" class="files" id="previews" style="visibility: hidden">' +
        '        <div id="template" class="file-row">' +
        '        </div>' +
        '    </div>' +
        '    <script>' +
        '        var previewNode = document.querySelector("#template");' +
        '        previewNode.id = "";' +
        '        var previewTemplate = previewNode.parentNode.innerHTML;' +
        '        previewNode.parentNode.removeChild(previewNode);' +
        '        var myDropzone = new Dropzone(document.body, {' +
        '            url: "/content/' + parm + '",' +
        '            autoProcessQueue: true,' +
        '            thumbnailWidth: 80,' +
        '            thumbnailHeight: 80,' +
        '            parallelUploads: 20,' +
        'headers: { "type": "contentUpload" },' +
        '            createImageThumbnails: false,' +
        '            previewTemplate: previewTemplate,' +
        '            autoQueue: true,' +
        '            previewsContainer: "#previews",' +
        '            clickable: ".fileinput-button"' +
        '        });' +
        '        myDropzone.on("addedfile", function (file) {' +
        '           ' +
        '           ' +
        '        });' +
        '        myDropzone.on("drop", function (file) {' +
        '           ' +
        '            myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));' +
        '        });' +
        '        ' +
        '        myDropzone.on("totaluploadprogress", function (progress) {' +
        '            document.querySelector("#total-progress").style.width = progress + "%";' +
        '        });' +
        '        myDropzone.on("sending", function (file) {' +
        '           ' +
        '            document.querySelector("#total-progress").style.opacity = "1";' +
        '           ' +
        '            ' +
        '        });' +
        '        ' +
        '        myDropzone.on("queuecomplete", function (progress) {' +
        '        document.querySelector("#total-progress").style.opacity = "0";' +
        '    });' +


        '       myDropzone.on("success", function (file, responseText) {' +
        '      if(responseText  === "done") {   document.querySelector("#total-progress").style.opacity = "0"; ' +
        'location.reload();}' +
        '    });' +


        '    </script>' +
        '</body>\n' +
        '</html>\n';

    return text;

};

exports.uploadTargetContentFrame = function (parm, frame, objectsPath, objectInterfaceName) {
    if (debug) console.log('interface content');
    var text =

        '';

    var framePath = path.join(objectsPath, parm);

    var framePath2 = path.join(framePath, frame);

    // Import the module



    // List all files in a directory in Node.js recursively in a synchronous fashion
    var walk = function (dir) {
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = path.join(dir, file);
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) results = results.concat(walk(file));
            else results.push(file);
        });
        return results;
    };

    var listeliste = walk(framePath2);

    var nameOld = '';

    text +=
        '<html>\n' +
        '<head>\n' +
        '<head>\n' +
        '    <link rel="stylesheet" href="../../libraries/css/bootstrap.min.css">\n' +
        '    <link rel="stylesheet" href="../../libraries/css/bootstrap-adjustments.css">\n' +
        '   <script src="../../libraries/js/dropzone.js"></script>\n' +
        '    <style>\n' +
        '        #total-progress {\n' +
        '            opacity: 0;\n' +
        '            transition: opacity 0.3s linear;\n' +
        '        }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body style="height: 100%; width: 100%">\n' +
        '<div class="container" id="container" style="width: 750px;">\n' +
        '    <div class="panel panel-primary">\n' +
        '<div class="panel-heading">\n' +
        '<h3 class="panel-title"><font size="6">Reality Object - ' + parm + ' - File&nbsp;&nbsp;&nbsp;&nbsp;<a href="/" style=" color: #ffffff; text-decoration: underline;">back</a></font></h3>\n' +
        '      </div>\n' +
        '</div>\n' +
        '<div id="actions" class="row">\n' +
        ' <div class="col-xs-7">\n' +
        '   <table class="table table-hover">\n' +
        '        <thead>\n' +
        '        <tr>\n' +
        '            <th class="info">Object Folder</th>\n' +
        '            <th class="info"></th>\n' +
        '        </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';


    for (var i = 0; i < listeliste.length; i++) {

        var content = listeliste[i].replace(framePath2 + '/', '').split('/');

        if (content[1] !== undefined) {
            if (content[0] !== nameOld) {

                // console.log("---" + content[0]);

                text += '<tr><td><font size="2"><span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span>&nbsp;&nbsp;' + content[0] + '</font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0];
                text += '<form id=\'2delete' + i + content[0] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '/' + frame + '/x\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';

                text += '<a href="#" onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';

            }
            // console.log("-"+content[0]);
            //  console.log(content[0]+" / "+content[1]);

            if (content[1][0] !== '.' && content[1][0] !== '_') {
                if (debug)console.log(content[1]);
                var fileTypeF = content[1].split('.')[1].toLowerCase();

                text += '<tr ';
                if (content[1] === 'target.dat' || content[1] === 'target.xml' || content[1] === 'target.jpg') {
                    text += 'class="success"';
                }


                text += '><td><font size="2">';
                text += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
                text += '<span class="';

                if (fileTypeF === 'jpg' || fileTypeF === 'png' || fileTypeF === 'gif' || fileTypeF === 'jpeg') {
                    text += 'glyphicon glyphicon-picture';
                } else {
                    text += 'glyphicon glyphicon-file';
                }


                text += ' aria-hidden="true"></span>&nbsp;&nbsp;<a href = "/obj/' + parm + '/' + content[0] + '/' + content[1] + '">' + content[1] + '</a></font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0] + '/' + content[1];
                text += '<form id=\'1delete' + i + content[1] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';
                if (debug) console.log(dateiTobeRemoved);
                text += '<a href="#"  onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';
            }


            nameOld = content[0];
        } else {
            if (content[0][0] !== '.' && content[0][0] !== '_') {
                var fileTypeF2 = content[0].split('.')[1].toLowerCase();
                text += '<tr ';
                if (fileTypeF2 === 'html' || fileTypeF2 === 'htm') {
                    text += 'class="success"';
                } else if (content[0] === 'object.json' || content[0] === 'object.css' || content[0] === 'object.js') {
                    text += 'class="active"';
                }


                text += '><td><font size="2">';
                text += '<span class="';
                if (fileTypeF2 === 'jpg' || fileTypeF2 === 'png' || fileTypeF2 === 'gif' || fileTypeF2 === 'jpeg') {
                    text += 'glyphicon glyphicon-picture';
                } else {
                    text += 'glyphicon glyphicon-file';
                }


                text += '" aria-hidden="true"></span>&nbsp;&nbsp;<a href = "/obj/' + parm + '/' + content[0] + '">' + content[0] + '</a></font></td><td>';

                let dateiTobeRemoved = parm + '/' + content[0];
                text += '<form id=\'1delete' + i + content[0] + '\' action=\'' + objectInterfaceName + 'content/' + parm + '\' method=\'post\' style=\'margin: 0px; padding: 0px\'>' +
                    '<input type=\'hidden\' name=\'name\' value=\'' + dateiTobeRemoved + '\'>' +
                    '<input type=\'hidden\' name=\'action\' value=\'delete\'>';


                if (content[0] === 'object.json' || content[0] === 'object.css' || content[0] === 'object.js') {
                    text += '<span class="badge">delete</span></form></td></tr>';

                } else {
                    text += '<a href="#"  onclick="parentNode.submit();"><span class="badge" style="background-color: #d43f3a;">delete</span></a></form></td></tr>';
                }
            }

        }

    }

    text +=

        '' +
        '</div>' +
        '        </tbody>\n' +
        '    </table>\n' +
        '</div> <div class="col-xs-5">\n' +
        'Drag and Drop your interface files anywhere on this window. Make sure that <b>index.html</b> is your startpoint.' +
        ' You can drop all your files at the same time.<br><br>' +
        '<b>object.json</b> holds all relevant information about your object.<br>' +

        ' <br><br><span class="fileupload-process">' +
        '          <div id="total-progress" class="progress progress-striped active" role="progressbar" aria-valuemin="0"' +
        '               aria-valuemax="100" aria-valuenow="0">' +
        '              <div class="progress-bar progress-bar-success" style="width:100%;" data-dz-uploadprogress></div>' +
        '          </div>' +
        '        </span>' +
        '        <span class="btn ';
    if (debug)console.log(framePath + parm + '/' + identityFolderName + '/target/target.dat');
    if (fs.existsSync(framePath + parm + '/index.htm') || fs.existsSync(framePath + '/' + parm + '/index.html')) {
        if (fs.existsSync(framePath + parm + '/' + identityFolderName + '/target/target.dat') && fs.existsSync(framePath + '/' + parm + '/' + identityFolderName + '/target/target.xml') && fs.existsSync(framePath + '/' + parm + '/' + identityFolderName + '/target/target.jpg')) {
            text += 'btn-success';
        } else {
            text += 'btn-warning';
        }
    } else {
        text += 'btn-primary';
    }



    text += ' fileinput-button" id="targetButton">' +
        '            <span>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        'Add Interface Files' +
        '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
        '               </span>' +
        '        </span>' +

        '   <div class="table table-striped" class="files" id="previews" style="visibility: hidden">' +
        '        <div id="template" class="file-row">' +
        '        </div>' +
        '    </div>' +
        '    <script>' +
        '        var previewNode = document.querySelector("#template");' +
        '        previewNode.id = "";' +
        '        var previewTemplate = previewNode.parentNode.innerHTML;' +
        '        previewNode.parentNode.removeChild(previewNode);' +
        '        var myDropzone = new Dropzone(document.body, {' +
        '            url: "/content/' + parm + '",' +
        '            autoProcessQueue: true,' +
        '            thumbnailWidth: 80,' +
        '            thumbnailHeight: 80,' +
        '            parallelUploads: 20,' +
        'headers: { "type": "contentUpload" },' +
        '            createImageThumbnails: false,' +
        '            previewTemplate: previewTemplate,' +
        '            autoQueue: true,' +
        '            previewsContainer: "#previews",' +
        '            clickable: ".fileinput-button"' +
        '        });' +
        '        myDropzone.on("addedfile", function (file) {' +
        '           ' +
        '           ' +
        '        });' +
        '        myDropzone.on("drop", function (file) {' +
        '           ' +
        '            myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));' +
        '        });' +
        '        ' +
        '        myDropzone.on("totaluploadprogress", function (progress) {' +
        '            document.querySelector("#total-progress").style.width = progress + "%";' +
        '        });' +
        '        myDropzone.on("sending", function (file) {' +
        '           ' +
        '            document.querySelector("#total-progress").style.opacity = "1";' +
        '           ' +
        '            ' +
        '        });' +
        '        ' +
        '        myDropzone.on("queuecomplete", function (progress) {' +
        '        document.querySelector("#total-progress").style.opacity = "0";' +
        '    });' +


        '       myDropzone.on("success", function (file, responseText) {' +
        '      if(responseText  === "done") {   document.querySelector("#total-progress").style.opacity = "0"; ' +
        'location.reload();}' +
        '    });' +


        '    </script>' +
        '</body>\n' +
        '</html>\n';

    return text;

};

exports.editContent = function(req, res) {
    console.log(req.params);
    var thisPath = req.params[0];
    // TODO sanitize thisPath for security
    var file = path.basename(thisPath);
    var context = {id: req.params.id, file: file, backUrl: '/content/' + req.params.id, path: thisPath};
    res.render('edit', context);
};
