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
 * Modified by Psomdecerff (PCS) on 12/21/15.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*********************************************************************************************************************
 ******************************************** TODOS *******************************************************************
 **********************************************************************************************************************

 **

 * TODO - Only allow upload backups and not any other data....
 *
 * TODO - check any collision with knownObjects -> Show collision with other object....
 * TODO - Check if Targets are double somehwere. And iff Target has more than one target in the file...
 *
 * TODO - Check the socket connections
 * TODO - check if links are pointing to values that actually exist. - (happens in browser at the moment)
 * TODO - Test self linking from internal to internal value (endless loop) - (happens in browser at the moment)
 *
 * TODO - Checksum for marker needs to be verified on the server side as well.
 **

 **********************************************************************************************************************
 ******************************************** constant settings *******************************************************
 **********************************************************************************************************************/

// These variables are used for global status, such as if the server sends debugging messages and if the developer
// user interfaces should be accesable

var globalVariables = {
    developer: true, // show developer web GUI
    debug: true      // debug messages to console
};

// ports used to define the server behaviour
/*
 The server uses port 8080 to communicate with other servers and with the Reality Editor.
 As such the Server reacts to http and web sockets on this port.

 The beat port is used to send UDP broadcasting messages in  a local network. The Reality Editor and other Objects
 pick up these messages to identify the object.

 */

const serverPort = 8080;
const socketPort = serverPort;     // server and socket port are always identical
const beatPort = 52316;            // this is the port for UDP broadcasting so that the objects find each other.
const timeToLive = 2;                     // the amount of routers a UDP broadcast can jump. For a local network 2 is enough.
const beatInterval = 5000;         // how often is the heartbeat sent
const socketUpdateInterval = 2000; // how often the system checks if the socket connections are still up and running.
const version = "1.7.0";           // the version of this server
const protocol = "R1";           // the version of this server
const netmask = "255.255.0.0"; // define the network scope from which this server is accessable.
// for a local network 255.255.0.0 allows a 16 bit block of local network addresses to reach the object.
// basically all your local devices can see the object, however the internet is unable to reach the object.

console.log(parseInt(version.replace(/\./g, "")));

// All objects are stored in this folder:
const objectPath = __dirname + "/objects";
// All visual UI representations for IO Points are stored in this folder:
const nodePath = __dirname + "/libraries/nodes";
// All visual UI representations for IO Points are stored in this folder:
const blockPath = __dirname + "/libraries/logicBlocks";
// All interfaces for different hardware such as Arduino Yun, PI, Philips Hue are stored in this folder.
const hardwarePath = __dirname + "/hardwareInterfaces";
// The web service level on which objects are accessable. http://<IP>:8080 <objectInterfaceFolder> <object>
const objectInterfaceFolder = "/";

/**********************************************************************************************************************
 ******************************************** Requirements ************************************************************
 **********************************************************************************************************************/

var _ = require('lodash');    // JavaScript utility library
var fs = require('fs');       // Filesystem library
var dgram = require('dgram'); // UDP Broadcasting library
var ip = require("ip");       // get the device IP address library
var bodyParser = require('body-parser');  // body parsing middleware
var express = require('express'); // Web Sever library

// constrution for the werbserver using express combined with socket.io
var webServer = express();
var http = require('http').createServer(webServer).listen(serverPort, function () {
    cout('webserver + socket.io is listening on port: ' + serverPort);
});
var io = require('socket.io')(http); // Websocket library
var socket = require('socket.io-client'); // websocket client source
var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
var formidable = require('formidable'); // Multiple file upload library
var cheerio = require('cheerio');

// additional files containing project code

// This file hosts all kinds of utilities programmed for the server
var utilities = require(__dirname + '/libraries/utilities');
// The web frontend a developer is able to see when creating new user interfaces.
var webFrontend = require(__dirname + '/libraries/webFrontend');
// Definition for a simple API for hardware interfaces talking to the server.
// This is used for the interfaces defined in the hardwareAPI folder.
var hardwareAPI = require(__dirname + '/libraries/hardwareInterfaces');

var util = require("util"); // node.js utility functionality
var events = require("events"); // node.js events used for the socket events.

// Set web frontend debug to inherit from global debug
webFrontend.debug = globalVariables.debug;

/**********************************************************************************************************************
 ******************************************** Constructors ************************************************************
 **********************************************************************************************************************/

/**
 * @desc This is the default constructor for the Hybrid Object.
 * It contains information about how to render the UI and how to process the internal data.
 **/

function Objects() {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = null;
    // The name for the object used for interfaces.
    this.name = "";
    // The IP address for the object is relevant to point the Reality Editor to the right server.
    // It will be used for the UDP broadcasts.
    this.ip = ip.address();
    // The version number of the Object.
    this.version = version;

    this.deactivated = false;

    this.protocol = protocol;
    // The (t)arget (C)eck(S)um is a sum of the checksum values for the target files.
    this.tcs = null;
    // Reality Editor: This is used to possition the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to possition the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // Used internally from the reality editor to indicate if an object should be rendered or not.
    this.visible = false;
    // Used internally from the reality editor to trigger the visibility of naming UI elements.
    this.visibleText = false;
    // Used internally from the reality editor to indicate the editing status.
    this.visibleEditing = false;
    // every object holds the developer mode variable. It indicates if an object is editable in the Reality Editor.
    this.developer = true;
    // Intended future use is to keep a memory of the last matrix transformation when interacted.
    // This data can be used for interacting with objects for when they are not visible.
    this.memory = {}; // TODO use this to store UI interface for image later.
    // Stores all the links that emerge from within the object. If a IOPoint has new data,
    // the server looks through the Links to find if the data has influence on other IOPoints or Objects.
    this.links = {};
    // Stores all IOPoints. These points are used to keep the state of an object and process its data.
    this.nodes = {};
}

/**
 * @desc The Link constructor is used every time a new link is stored in the links object.
 * The link does not need to keep its own ID since it is created with the link ID as Obejct name.
 **/

function Link() {
    // The origin object from where the link is sending data from
    this.objectA = null;
    // The origin IOPoint from where the link is taking its data from
    this.nodeA = null;
    // if origin location is a Logic Node then set to Logic Node output location (which is a number between 0 and 3) otherwise null
    this.logicA = null;
    // Defines the type of the link origin. Currently this function is not in use.
    this.namesA = ["",""];
    // The destination object to where the origin object is sending data to.
    // At this point the destination object accepts all incoming data and routs the data according to the link data sent.
    this.objectB = null;
    // The destination IOPoint to where the link is sending data from the origin object.
    // objectB and nodeB will be send with each data package.
    this.nodeB = null;
    // if destination location is a Logic Node then set to logic block input location (which is a number between 0 and 3) otherwise null
    this.logicB = null;
    // Defines the type of the link destination. Currently this function is not in use.
    this.namesB = ["",""];
    // check that there is no endless loop in the system
    this.loop = false;
    // Will be used to test if a link is still able to find its destination.
    // It needs to be discussed what to do if a link is not able to find the destination and for what time span.
    this.health = 0; // todo use this to test if link is still valid. If not able to send for some while, kill link.
}

/**
 * @desc Constructor used to define every nodes generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 **/

function Node() {
    // the name of each link. It is used in the Reality Editor to show the IO name.
    this.name = "";
    // the actual data of the node
    this.data = new Data();
    // Reality Editor: This is used to possition the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to possition the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // defines the nodeInterface that is used to process data of this type. It also defines the visual representation
    // in the Reality Editor. Such data points interfaces can be found in the nodeInterface folder.
    this.type = "node";
    // defines the origin Hardware interface of the IO Point. For example if this is arduinoYun the Server associates
    // this IO Point with the Arduino Yun hardware interface.
    //this.type = "arduinoYun"; // todo "arduinoYun", "virtual", "edison", ... make sure to define yours in your internal_module file
    // indicates how much calls per second is happening on this node
    this.stress = 0;
}

/**
 * @desc Constructor used to define every logic node generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 **/

function Logic() {
    this.name = "";
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = new Data();
    // Reality Editor: This is used to possition the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to possition the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // if showLastSettingFirst is true then lastSetting is the name of the last block that was moved or set.
    this.lastSetting = false;

    this.lastSettingBlock = "";
    // the iconImage is in png or jpg format and will be stored within the logicBlock folder. A reference is placed here.
    this.iconImage = null;
    // nameInput are the names given for each IO.
    this.nameInput = ["", "", "", ""];
    // nameOutput are the names given for each IO
    this.nameOutput = ["", "", "", ""];
    // the array of possible connections within the logicBlock.
    // if a block is set, a new Node instance is coppied in to the spot.
    this.type = "logic";
    this.links = {};
    this.blocks = {};

    this.route = 0;
    this.routeBuffer = [0,0,0,0];
}

/**
 * @desc The Link constructor for Blocks is used every time a new logic Link is stored in the logic Node.
 * The block link does not need to keep its own ID since it is created with the link ID as Object name.
 **/

function BlockLink() {
    // origin block UUID
    this.nodeA = null;
    // item in that block
    this.logicA = 0;
    // destination block UUID
    this.nodeB = null;
    // item in that block
    this.logicB = 0;
    // check if the links are looped.
    this.loop = false;
    // Will be used to test if a link is still able to find its destination.
    // It needs to be discussed what to do if a link is not able to find the destination and for what time span.
    this.health = 0; // todo use this to test if link is still valid. If not able to send for some while, kill link.
}

/**
 * @desc Constructor used to define every block within the logicNode.
 * The block does not need to keep its own ID since it is created with the link ID as Object name.
 **/


function Block() {
    // name of the block
    this.name = "";
    // local ID given to a used block.
    this.id = null;

    this.x = null;
    this.y = null;
    // amount of elements the IO point is created of. Single IO nodes have the size 1.
    this.blockSize = 1;
    // the category for the editor
    this.category = 1;
    // the global / world wide id of the actual reference block design. // checksum of the block??
    this.globalId = null;
    // the checksum should be identical with the checksum for the persistent package files of the reference block design.
    this.checksum = null; // checksum of the files for the program
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = [new Data(), new Data(), new Data(), new Data()];
    // experimental. This are objects for data storage. Maybe it makes sense to store data in the general object
    // this would allow the the packages to be persistent. // todo discuss usability with Ben.
    this.privateData = {};
    this.publicData = {};

    // IO for logic
    // define how many inputs are active.
    this.activeInputs = [true, false, false, false];
    // define how many outputs are active.
    this.activeOutputs = [true, false, false, false];
    // define the names of each active IO
    this.nameInput = ["", "", "", ""];
    this.nameOutput = ["", "", "", ""];
    // A specific icon for the node, png or jpg.
    this.iconImage = null;
    // Text within the node, if no icon is available.
    // indicates how much calls per second is happening on this block
    this.stress = 0;
    // this is just a compatibility with the original engine. Maybe its here to stay
    this.type = "default";
}

/**
 * @desc Constructor used to define special blocks that are connecting the logic crafting with the outside system.
 **/

function EdgeBlock() {
    // name of the block
    this.name = "";
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = [new Data(), new Data(), new Data(), new Data()];
    // indicates how much calls per second is happening on this block
    this.stress = 0;
    this.type = "default";
}


/**
 * @desc Definition for Values that are sent around.
 **/

function Data() {
    // storing the numerical content send between nodes. Range is between 0 and 1.
    this.value = 0;
    // Defines the kind of data send. At this point we have 3 active data modes and one future possibility.
    // (f) defines floating point values between 0 and 1. This is the default value.
    // (d) defines a digital value exactly 0 or 1.
    // (+) defines a positive step with a floating point value for compatibility.
    // (-) defines a negative step with a floating point value for compatibility.
    this.mode = "f";
    // string of the name for the unit used (for Example "C", "F", "cm"). Default is set to no unit.
    this.unit = "";
    // scale of the unit that is used. Usually the scale is between 0 and 1.
    this.unitMin = 0;
    this.unitMax = 1;
}

/**
 * @desc This Constructor is used when a new socket connection is generated.
 **/

function ObjectSockets(socketPort, ip) {
    // keeps the own IP of an object
    this.ip = ip;
    // defines where to connect to
    this.io = socket.connect('http://' + ip + ':' + socketPort, {
        // defines the timeout for a connection between objects and the reality editor.
        'connect timeout': 5000,
        // try to reconnect
        'reconnect': true,
        // time between re-connections
        'reconnection delay': 500,
        // the amount of reconnection attempts. Once the connection failed, the server kicks in and tries to reconnect
        // infinitely. This behaviour can be changed once discussed what the best model would be.
        // At this point the invinit reconnection attempt keeps the system optimal running at all time.
        'max reconnection attempts': 20,
        // automatically connect a new conneciton.
        'auto connect': true,
        // fallbacks connection models for socket.io
        'transports': [
            'websocket'
            , 'flashsocket'
            , 'htmlfile'
            , 'xhr-multipart'
            , 'xhr-polling'
            , 'jsonp-polling']
    });
}

function EditorSocket(socketID, object) {
    // keeps the own IP of an object
    this.id = socketID;
    // defines where to connect to
    this.obj = object;

}

function Protocols() {

    this.R1 = {
        send: function (object, node, data) {
            return JSON.stringify({object: object, node: node, data: data})
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.object) return null;
            if (!msgContent.node) return null;
            if (!msgContent.data) return null;

            if (msgContent.object in objects) {
                if (msgContent.node in objects[msgContent.object].nodes) {

                    var objectData = objects[msgContent.object].nodes[msgContent.node].data;

                        for (var key in msgContent.data) {
                            objectData[key] = msgContent.data[key];
                        }
                    return {object:msgContent.object, node:msgContent.node, data: objectData};
                }

            }

return null
        }
    };
    this.R0 = {
        send: function (object, node, data) {
            return JSON.stringify({obj: object, pos: node, value: data.value, mode: data.mode})},
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.obj) return null;
            if (!msgContent.pos) return null;
            if (!msgContent.value) msgContent.value = 0;
            if (!msgContent.mode) return null;

            if (msgContent.obj in objects) {
                if (msgContent.pos in objects[msgContent.obj].nodes) {

                    var objectData = objects[msgContent.obj].nodes[msgContent.pos].data;

                    objectData.value = msgContent.value;
                    objectData.mode = msgContent.mode;

                    return {object:msgContent.obj, node:msgContent.pos, data: objectData};
                }

            }
            return null
        }
    };
}

/**********************************************************************************************************************
 ******************************************** Variables and Objects ***************************************************
 **********************************************************************************************************************/

// This variable will hold the entire tree of all objects and their sub objects.
var objects = {};
var nodeTypeModules = {};   // Will hold all available data point interfaces
var blockModules = {};   // Will hold all available data point interfaces
var hardwareInterfaceModules = {}; // Will hold all available hardware interfaces.
// A list of all objects known and their IPs in the network. The objects are found via the udp heart beat.
// If a new link is linking to another objects, this knownObjects list is used to establish the connection.
// This list is also used to keep track of the actual IP of an object. If the IP of an object in a network changes,
// It has no influance on the connectivity, as it is referenced by the object UUID through the entire time.
var protocols = new Protocols();
var knownObjects = {};
// A lookup table used to process faster through the objects.
var objectLookup = {};
// This list holds all the socket connections that are kept alive. Socket connections are kept alive if a link is
// associated with this object. Once there is no more link the socket connection is deleted.
var socketArray = {};     // all socket connections that are kept alive

var realityEditorSocketArray = {};     // all socket connections that are kept alive
var realityEditorBlockSocketArray = {};     // all socket connections that are kept alive

// counter for the socket connections
// this counter is used for the Web Developer Interface to reflect the state of the server socket connections.
var sockets = {
    sockets: 0, // amount of created socket connections
    connected: 0, // amount of connected socket connections
    notConnected: 0, // not connected
    socketsOld: 0,  // used internally to react only on updates
    connectedOld: 0, // used internally to react only on updates
    notConnectedOld: 0 // used internally to react only on updates
};

/**********************************************************************************************************************
 ******************************************** Initialisations *********************************************************
 **********************************************************************************************************************/


cout("Starting the Server");

// get a list with the names for all IO-Points, based on the folder names in the nodeInterfaces folder folder.
// Each folder represents on IO-Point.
var nodeFolderList = fs.readdirSync(nodePath).filter(function (file) {
    return fs.statSync(nodePath + '/' + file).isDirectory();
});

// Remove eventually hidden files from the Hybrid Object list.
while (nodeFolderList[0][0] === ".") {
    nodeFolderList.splice(0, 1);
}

// Create a objects list with all IO-Points code.
for (var i = 0; i < nodeFolderList.length; i++) {
    nodeTypeModules[nodeFolderList[i]] = require(nodePath + '/' + nodeFolderList[i] + "/index.js");
}


// get a list with the names for all IO-Points, based on the folder names in the nodeInterfaces folder folder.
// Each folder represents on IO-Point.
var blockFolderList = fs.readdirSync(blockPath).filter(function (file) {
    return fs.statSync(blockPath + '/' + file).isDirectory();
});

// Remove eventually hidden files from the Hybrid Object list.
while (blockFolderList[0][0] === ".") {
    blockFolderList.splice(0, 1);
}





// Create a objects list with all IO-Points code.
for (var i = 0; i < blockFolderList.length; i++) {
    blockModules[blockFolderList[i]] = require(blockPath + '/' + blockFolderList[i] + "/index.js");
}


cout("Initialize System: ");
cout("Loading Hardware interfaces");
// set all the initial states for the Hardware Interfaces in order to run with the Server.
hardwareAPI.setup(objects, objectLookup, globalVariables, __dirname, nodeTypeModules, blockModules, function (objectKey, nodeKey, data, objects, nodeTypeModules) {

    //these are the calls that come from the objects before they get processed by the object engine.
    // send the saved value before it is processed

    sendMessagetoEditors({
        object: objectKey,
        node: nodeKey,
        data: data
    });
    objectEngine(objectKey, nodeKey, null, objects, nodeTypeModules);

}, Node, function(thisAction){
    actionSender(thisAction);
});
cout("Done");

cout("Loading Objects");
// This function will load all the Objects
loadObjects();
cout("Done");

startSystem();
cout("started");

// get the directory names of all available soutyperces for the 3D-UI
var hardwareAPIFolderList = fs.readdirSync(hardwarePath).filter(function (file) {
    return fs.statSync(hardwarePath + '/' + file).isDirectory();
});
// remove hidden directories
while (hardwareAPIFolderList[0][0] === ".") {
    hardwareAPIFolderList.splice(0, 1);
}

// add all types to the nodeTypeModules object. Iterate backwards because splice works inplace
for (var i = hardwareAPIFolderList.length - 1; i >= 0; i--) {
    //check if hardwareInterface is enabled, if it is, add it to the hardwareInterfaceModules
    if (require(hardwarePath + "/" + hardwareAPIFolderList[i] + "/index.js").enabled) {
        hardwareInterfaceModules[hardwareAPIFolderList[i]] = require(hardwarePath + "/" + hardwareAPIFolderList[i] + "/index.js");
    } else {
        hardwareAPIFolderList.splice(i, 1);
    }
}

cout("ready to start internal servers");

hardwareAPI.reset();

cout("found " + hardwareAPIFolderList.length + " internal server");
cout("starting internal Server.");

/**
 * Returns the file extension (portion after the last dot) of the given filename.
 * If a file name starts with a dot, returns an empty string.
 *
 * @author VisioN @ StackOverflow
 * @param {string} fileName - The name of the file, such as foo.zip
 * @return {string} The lowercase extension of the file, such has "zip"
 */
function getFileExtension(fileName) {
    return fileName.substr((~-fileName.lastIndexOf(".") >>> 0) + 2).toLowerCase();
}

/**
 * @desc Add objects from the objects folder to the system
 **/
function loadObjects() {
    cout("Enter loadObjects");
    // check for objects in the objects folder by reading the objects directory content.
    // get all directory names within the objects directory
    var objectFolderList = fs.readdirSync(objectPath).filter(function (file) {
        return fs.statSync(objectPath + '/' + file).isDirectory();
    });

    // remove hidden directories
    try {
        while (objectFolderList[0][0] === ".") {
            objectFolderList.splice(0, 1);
        }
    } catch (e) {
        cout("no hidden files");
    }

    for (var i = 0; i < objectFolderList.length; i++) {
        var tempFolderName = utilities.getObjectIdFromTarget(objectFolderList[i], __dirname);
        cout("TempFolderName: " + tempFolderName);

        if (tempFolderName !== null) {
            // fill objects with objects named by the folders in objects
            objects[tempFolderName] = new Objects();
            objects[tempFolderName].name = objectFolderList[i];

            // add object to object lookup table
            utilities.writeObject(objectLookup, objectFolderList[i], tempFolderName);

            // try to read a saved previous state of the object
            try {
                objects[tempFolderName] = JSON.parse(fs.readFileSync(__dirname + "/objects/" + objectFolderList[i] + "/object.json", "utf8"));
                objects[tempFolderName].ip = ip.address();

               // this is for transforming old lists to new lists

                if(typeof objects[tempFolderName].objectValues !== "undefined")
                {
                    objects[tempFolderName].nodes =  objects[tempFolderName].objectValues;
                    delete  objects[tempFolderName].objectValues;
                }
                if(typeof objects[tempFolderName].objectLinks !== "undefined")
                {
                    objects[tempFolderName].links =  objects[tempFolderName].objectLinks;
                    delete  objects[tempFolderName].objectLinks;
                }



                    for (var nodeKey in objects[tempFolderName].nodes) {

                        if(typeof objects[tempFolderName].nodes[nodeKey].item !== "undefined"){
                            var tempItem = objects[tempFolderName].nodes[nodeKey].item;
                            objects[tempFolderName].nodes[nodeKey].data = tempItem[0];
                        }
                    }

                cout("I found objects that I want to add");


            } catch (e) {
                objects[tempFolderName].ip = ip.address();
                objects[tempFolderName].objectId = tempFolderName;
                cout("No saved data for: " + tempFolderName);
            }

        } else {
            cout(" object " + objectFolderList[i] + " has no marker yet");
        }
    }

    hardwareAPI.reset();
}

/**********************************************************************************************************************
 ******************************************** Starting the System ******************************************************
 **********************************************************************************************************************/

/**
 * @desc starting the system
 **/

function startSystem() {

    // generating a udp heartbeat signal for every object that is hosted in this device
    for (var key in objects) {
        if(!objects[key].deactivated) {
            objectBeatSender(beatPort, key, objects[key].ip);
        }
    }

    // receiving heartbeat messages and adding new objects to the knownObjects Array
    objectBeatServer();

    // serving the visual frontend with web content as well serving the REST API for add/remove links and changing
    // object sizes and positions
    objectWebServer();

    // receives all socket connections and processes the data
    socketServer();

    // initializes the first sockets to be opened to other objects
    socketUpdater();

    // keeps sockets to other objects alive based on the links found in the local objects
    // removes socket connections to objects that are no longer linked.
    socketUpdaterInterval();

}

/**********************************************************************************************************************
 ******************************************** Stopping the System *****************************************************
 **********************************************************************************************************************/

function exit() {
    var mod;

    hardwareAPI.shutdown();

    process.exit();
}

process.on('SIGINT', exit);

/**********************************************************************************************************************
 ******************************************** Emitter/Client/Sender ***************************************************
 **********************************************************************************************************************/

/**
 * @desc Sends out a Heartbeat broadcast via UDP in the local network.
 * @param {Number} PORT The port where to start the Beat
 * @param {string} thisId The name of the Object
 * @param {string} thisIp The IP of the Object
 * @param {string} thisVersion The version of the Object
 * @param {string} thisTcs The target checksum of the Object.
 * @param {boolean} oneTimeOnly if true the beat will only be sent once.
 **/

function objectBeatSender(PORT, thisId, thisIp, oneTimeOnly) {
    if (_.isUndefined(oneTimeOnly)) {
        oneTimeOnly = false;
    }

    var HOST = '255.255.255.255';

    cout("creating beat for object: " + thisId);
    objects[thisId].version = version;
    objects[thisId].protocol = protocol;

    var thisVersionNumber = parseInt(objects[thisId].version.replace(/\./g, ""));

    if (typeof objects[thisId].tcs === "undefined") {
        objects[thisId].tcs = 0;
    }

    // Objects
    cout("with version number: " + thisVersionNumber);

    // json string to be send
    var message = new Buffer(JSON.stringify({
        id: thisId,
        ip: thisIp,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs
    }));

    if (globalVariables.debug) console.log("UDP broadcasting on port: " + PORT);
    if (globalVariables.debug) console.log("Sending beats... Content: " + JSON.stringify({
            id: thisId,
            ip: thisIp,
            vn: thisVersionNumber,
            pr: protocol,
            tcs: objects[thisId].tcs
        }));
    cout("UDP broadcasting on port: " + PORT);
    cout("Sending beats... Content: " + JSON.stringify({
            id: thisId,
            ip: thisIp,
            vn: thisVersionNumber,
            pr: protocol,
            tcs: objects[thisId].tcs
        }));

    // creating the datagram
    var client = dgram.createSocket('udp4');
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(timeToLive);
        client.setMulticastTTL(timeToLive);
    });

    if (!oneTimeOnly) {
        setInterval(function () {
            // send the beat#
            if (thisId in objects && !objects[thisId].deactivated) {
                // cout("Sending beats... Content: " + JSON.stringify({ id: thisId, ip: thisIp, vn:thisVersionNumber, tcs: objects[thisId].tcs}));

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs
                }));

// this is an uglly trick to sync each object with being a developer object
                if (globalVariables.developer) {
                    objects[thisId].developer = true;
                } else {
                    objects[thisId].developer = false;
                }
                //console.log(globalVariables.developer);

                client.send(message, 0, message.length, PORT, HOST, function (err) {
                    if (err) {
                        cout("error in beatSender");
                        throw err;
                    }
                    // client is not being closed, as the beat is send ongoing
                });
            }
        }, beatInterval + _.random(-250, 250));
    }
    else {
        // Single-shot, one-time heartbeat
        // delay the signal with timeout so that not all objects send the beat in the same time.
        setTimeout(function () {
            // send the beat
            if (thisId in objects && !objects[thisId].deactivated) {

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs
                }));

                client.send(message, 0, message.length, PORT, HOST, function (err) {
                    if (err) throw err;
                    // close the socket as the function is only called once.
                    client.close();
                });
            }
        }, _.random(1, 250));
    }
}

/**
 * @desc sends out an action json object via udp. Actions are used to cause actions in all objects and devices within the network.
 * @param {Object} action string of the action to be send to the system. this can be a jason object
 **/

function actionSender(action) {

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
    client.send(message, 0, message.length, beatPort, HOST, function (err) {
        if (err) {
            throw err;
        }
        client.close();
    });
}

/**********************************************************************************************************************
 ******************************************** Server Objects **********************************************************
 **********************************************************************************************************************/

/**
 * @desc Receives a Heartbeat broadcast via UDP in the local network and updates the knownObjects Array in case of a
 * new object
 * @note if action "ping" is received, the object calls a heartbeat that is send one time.
 **/

var thisIP = ip.address();
function objectBeatServer() {

    // creating the udp server
    var udpServer = dgram.createSocket("udp4");
    udpServer.on("error", function (err) {
        cout("server error:\n" + err);
        udpServer.close();
    });

    udpServer.on("message", function (msg) {

        var msgContent;
        // check if object ping
        msgContent = JSON.parse(msg);

        if (msgContent.id && msgContent.ip && !(msgContent.id in objects) && !(msgContent.id in knownObjects)) {

            if(!knownObjects[msgContent.id]){
           knownObjects[msgContent.id] = {};
            }

            if(msgContent.vn)
            knownObjects[msgContent.id].version = msgContent.vn;

            if(msgContent.pr)
                knownObjects[msgContent.id].protocol = msgContent.pr;
            else
            {
                knownObjects[msgContent.id].protocol = "R0";
            }

            if(msgContent.ip)
                knownObjects[msgContent.id].ip = msgContent.ip;

            cout("I found new Objects: " + JSON.stringify(knownObjects[msgContent.id]));
        }
        // check if action 'ping'
        if (msgContent.action === "ping") {
            cout(msgContent.action);
            for (var key in objects) {
                objectBeatSender(beatPort, key, objects[key].ip, true);
            }
        }
    });

    udpServer.on("listening", function () {
        var address = udpServer.address();
        cout("UDP listening on port: " + address.port);
    });

    // bind the udp server to the udp beatPort

    udpServer.bind(beatPort);
}

/**
 * @desc A static Server that serves the user, handles the links and
 * additional provides active modification for objectDefinition.
 **/

function existsSync(filename) {
    try {
        fs.accessSync(filename);
        return true;
    } catch (ex) {
        return false;
    }
}

// REGEX to break an ip address into parts
var ip_regex = /(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?::(\d+))?/ig;
var ip_regex2 = /(\d+)\.(\d+)\.(\d+)\.(\d+)/;

// Parse the ip string into an object containing it's parts
var parseIpSpace = function(ip_string){

    // Use Regex to get the parts of the ip address
    var ip_parts = ip_regex.exec(ip_string);
    var ip_parts2 = ip_regex2.exec(ip_string);
    // Set ip address if the regex executed successfully
    var thisresult = "";

    if( ip_parts && ip_parts.length > 6 ){
         thisresult = [parseInt(ip_parts[1]),parseInt(ip_parts[2]),parseInt(ip_parts[3]),parseInt(ip_parts[4])];
    } else if( ip_parts2 && ip_parts2.length > 3){
            thisresult = [parseInt(ip_parts2[1]),parseInt(ip_parts2[2]),parseInt(ip_parts2[3]),parseInt(ip_parts2[4])];
        }
    else if(ip_string === "::1"){
        thisresult = [127,0,0,1];
    }
    // Return object
    return thisresult;
};

function objectWebServer() {
    thisIP = ip.address();
    // security implemented

    // check all sever requests for being inside the netmask parameters.
    // the netmask is set to local networks only.

    webServer.use("*", function (req, res, next) {



        var remoteIP = parseIpSpace(req.ip);
        var localIP = parseIpSpace(thisIP);
        var thisNetmask = parseIpSpace(netmask);

        var checkThisNetwork = true;

        if (!(remoteIP[0] === localIP[0] || remoteIP[0] <= (255- thisNetmask[0]))){
            checkThisNetwork = false;
        }

        if (!(remoteIP[1] === localIP[1] || remoteIP[1] <= (255- thisNetmask[1]))){
            checkThisNetwork = false;
        }

        if (!(remoteIP[2] === localIP[2] || remoteIP[2] <= (255- thisNetmask[2]))){
            checkThisNetwork = false;
        }

        if (!(remoteIP[3] === localIP[3] || remoteIP[3] <= (255- thisNetmask[3]))){
            checkThisNetwork = false;
        }

        if(!checkThisNetwork)
        if (remoteIP[0] === 127 && remoteIP[1] === 0 && remoteIP[2] === 0 && remoteIP[3] === 1){
            checkThisNetwork = true;
        }

        if(checkThisNetwork)
        {
            next();
        } else {
            res.status(403).send('Error 400: Forbidden. The requested page may be only available in a local network.');
        }
    });
    // define the body parser
    webServer.use(bodyParser.urlencoded({
        extended: true
    }));
    webServer.use(bodyParser.json());
    // define a couple of static directory routs

    webServer.use('/objectDefaultFiles', express.static(__dirname + '/libraries/objectDefaultFiles/'));

    webServer.use("/obj", function (req, res, next) {

        var urlArray = req.originalUrl.split("/");

       // console.log(urlArray);
        if ((req.method === "GET" && urlArray[2] !== "nodes") && (req.url.slice(-1) === "/" || urlArray[3].match(/\.html?$/))) {

            var fileName = __dirname + "/objects" + req.url;

            if (urlArray[3] !== "index.html" && urlArray[3] !== "index.htm") {

                if (fs.existsSync(fileName + "index.html")) {
                    fileName = fileName + "index.html";
                } else if (fs.existsSync(fileName + "index.htm")) {
                    fileName = fileName + "index.htm";
                }
            }

            if (!fs.existsSync(fileName)) {
                next();
                return;
            }

            var html = fs.readFileSync(fileName, 'utf8');

            html = html.replace('<script src="object.js"></script>', '');
            html = html.replace('<script src="objectIO.js"></script>', '');
            html = html.replace('<script src="/socket.io/socket.io.js"></script>', '');

            var loadedHtml = cheerio.load(html);
            var scriptNode = '<script src="../../objectDefaultFiles/object.js"></script>';
            loadedHtml('head').prepend(scriptNode);
            res.send(loadedHtml.html());
        }
        else if ((req.method === "GET" && urlArray[2] !== "nodes") && (req.url.slice(-1) === "/" || urlArray[3].match(/\.json?$/))) {

            var fileName = __dirname + "/objects" + req.url + "object.json";

            if (!fs.existsSync(fileName)) {
                next();
                return;
            }

            var json =  JSON.parse(fs.readFileSync(fileName, "utf8"));

            for(var thisKey in json.logic) {
                for (var thisKey2 in json.nodes[thisKey].blocks) {
                    delete json.nodes[thisKey].blocks[thisKey2].privateData;
                }
            }
            res.json(json);
        }
        else
            next();
    }, express.static(__dirname + '/objects/'));

    if (globalVariables.developer === true) {
        webServer.use("/libraries", express.static(__dirname + '/libraries/webInterface/'));
    }

    // use the cors cross origin REST model
    webServer.use(cors());
    // allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
    webServer.options('*', cors());


    /// logic node handling


    /**
     * Logic Links
     **/

    // delete a logic link. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/logic/*/*/link/*/', function (req, res) {

        var thisLinkId = req.params[2];
        var fullEntry = objects[req.params[0]].nodes[req.params[1]].links[thisLinkId];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[req.params[0]].nodes[req.params[1]].links[thisLinkId];
        cout("deleted link: " + thisLinkId);
        // cout(objects[req.params[0]].links);
        actionSender({reloadLink: {object: req.params[0]}});
        utilities.writeObjectToFile(objects, req.params[0], __dirname);
        res.send("deleted: " + thisLinkId + " in logic "+ req.params[1] +" for object: " + req.params[0]);

    });

    // adding a new logic link to an object. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.post('/logic/*/*/link/*/', function (req, res) {

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(req.params[0])) {

            objects[req.params[0]].nodes[req.params[1]].links[req.params[2]] = req.body;

            var thisObject = objects[req.params[0]].nodes[req.params[1]].links[req.params[2]];

            thisObject.loop = false;

            // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
            // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
            if (thisObject.nodeA === thisObject.nodeB && thisObject.logicA === thisObject.logicB) {
                thisObject.loop = true;
            }

            if (!thisObject.loop) {
                // call an action that asks all devices to reload their links, once the links are changed.
                actionSender({reloadLink: {object: req.params[0]}});
                updateStatus = "added";
                cout("added link: " + req.params[2]);
                // check if there are new connections associated with the new link.
                // write the object state to the permanent storage.
                utilities.writeObjectToFile(objects, req.params[0], __dirname);
            } else {
                updateStatus = "found endless Loop";
            }

            res.send(updateStatus);
        }
    });

    /**
     * Logic Blocks
     **/

    // adding a new block to an object. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.post('/logic/*/*/block/*/', function (req, res) {

        console.log("where is this object");

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(req.params[0])) {

            var thisBlocks = objects[req.params[0]].nodes[req.params[1]].blocks;

            thisBlocks[req.params[2]] = new Block();



            // todo activate when system is working to increase security
           /* var thisMessage = req.body;

            var thisModule = {};

            var breakPoint = false;

            if (thisMessage.type in blockFolderList) {
                thisModule = blockModules[thisMessage.type];

                for (var thisKey in thisMessage.publicData) {
                    if (typeof thisMessage.publicData[thisKey] !== typeof thisModule.publicData[thisKey]) {
                        breakPoint = true;
                    }
                }

                for (var thisKey in thisMessage.privateData) {
                    if (typeof thisMessage.privateData[thisKey] !== typeof thisModule.privateData[thisKey]) {
                        breakPoint = true;
                    }
                }
            }
            else {
                breakPoint = true;
            }

            if (!breakPoint)*/

            thisBlocks[req.params[2]] = req.body;

            // todo this can be removed once the system runs smoothly
            if(typeof thisBlocks[req.params[2]].type === "undefined"){
                thisBlocks[req.params[2]].type = thisBlocks[req.params[2]].name;
            }

for( var k in  objects[req.params[0]].nodes[req.params[1]].blocks){
    console.log(k);
}

            // call an action that asks all devices to reload their links, once the links are changed.
            actionSender({reloadLink: {object: req.params[0]}});
            updateStatus = "added";
            cout("added block: " + req.params[2]);
            utilities.writeObjectToFile(objects, req.params[0], __dirname);
            res.send(updateStatus);
        }
    });

    // delete a block from the logic. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/logic/*/*/block/*/', function (req, res) {

        var thisLinkId = req.params[2];
        var fullEntry = objects[req.params[0]].nodes[req.params[1]].blocks[thisLinkId];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[req.params[0]].nodes[req.params[1]].blocks[thisLinkId];
        cout("deleted block: " + thisLinkId);

        var thisLinks = objects[req.params[0]].nodes[req.params[1]].links;
        // Make sure that no links are connected to deleted objects
        for (var subCheckerKey in thisLinks) {
            if (thisLinks[subCheckerKey].nodeA === thisLinkId || thisLinks[subCheckerKey].nodeB === thisLinkId) {
                delete objects[req.params[0]].nodes[req.params[1]].links[subCheckerKey];
            }
        }

        actionSender({reloadLink: {object: req.params[0]}});
        utilities.writeObjectToFile(objects, req.params[0], __dirname);
        res.send("deleted: " + thisLinkId + " in blocks for object: " + req.params[0]);
    });


    webServer.post('/logic/*/*/blockPosition/*/', function (req, res) {

        // cout("post 2");
        var updateStatus = "nothing happened";
        var thisObject = req.params[0];
        var thisNode = req.params[1];
        var thisBlock = req.params[2];

        cout("changing Possition for :" + thisObject + " : " + thisNode+ " : " + thisBlock);

        var tempObject = objects[thisObject].nodes[thisNode].blocks[thisBlock];


        // check that the numbers are valid numbers..
        if (typeof req.body.x === "number" && typeof req.body.y === "number") {

            tempObject.x = req.body.x;
            tempObject.y = req.body.y;

            utilities.writeObjectToFile(objects, req.params[0], __dirname);

            actionSender({reloadObject: {object: thisObject}});
            updateStatus = "ok";
            res.send(updateStatus);
        } else
        res.send(updateStatus);
    });


    /**
     * Logic Nodes
     **/

    // adding a new block to an object. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.post('/logic/*/*/node/', function (req, res) {

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(req.params[0])) {

            objects[req.params[0]].nodes[req.params[1]] = req.body;

            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderIn0"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderIn1"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderIn2"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderIn3"] = new EdgeBlock();

            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderOut0"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderOut1"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderOut2"] = new EdgeBlock();
            objects[req.params[0]].nodes[req.params[1]].blocks["edgePlaceholderOut3"] = new EdgeBlock();
console.log("added tons of nodes ----------");

            objects[req.params[0]].nodes[req.params[1]].type = "logic";
            
            // call an action that asks all devices to reload their links, once the links are changed.
            actionSender({reloadLink: {object: req.params[0]}});
            updateStatus = "added";
            cout("added logic node: " + req.params[1]);
            utilities.writeObjectToFile(objects, req.params[0], __dirname);
            res.send(updateStatus);
        }
    });

    // delete a block from the logic. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/logic/*/*/node/', function (req, res) {

        var fullEntry = objects[req.params[0]].nodes[req.params[1]];

        delete objects[req.params[0]].nodes[req.params[1]];
        cout("deleted node: " + req.params[1]);

        // Make sure that no links are connected to deleted objects
        for (var subCheckerKey in  objects[req.params[0]].links) {
            if (objects[req.params[0]].links[subCheckerKey].nodeA === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectA === req.params[0]) {
                delete objects[req.params[0]].links[subCheckerKey];
            }
            if (objects[req.params[0]].links[subCheckerKey].nodeB === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectB === req.params[0]) {
                delete objects[req.params[0]].links[subCheckerKey];
            }
        }

        actionSender({reloadLink: {object: req.params[0]}});
        utilities.writeObjectToFile(objects, req.params[0], __dirname);
        res.send("deleted: " + req.params[1] + " in object: " + req.params[0]);

    });


    webServer.post('/logic/*/*/nodeSize/', function (req, res) {

        // cout("post 2");
        var updateStatus = "nothing happened";
        var thisObject = req.params[0];
        var thisValue = req.params[1];

        cout("changing Size for :" + thisObject + " : " + thisValue);

        var  tempObject = objects[thisObject].nodes[thisValue];


        // check that the numbers are valid numbers..
        if (typeof req.body.x === "number" && typeof req.body.y === "number" && typeof req.body.scale === "number") {

            // if the object is equal the datapoint id, the item is actually the object it self.

            tempObject.x = req.body.x;
            tempObject.y = req.body.y;
            tempObject.scale = req.body.scale;
            // console.log(req.body);
            // ask the devices to reload the objects
        }

        if (typeof req.body.matrix === "object") {

            tempObject.matrix = req.body.matrix;
        }

        if ((typeof req.body.x === "number" && typeof req.body.y === "number" && typeof req.body.scale === "number") || (typeof req.body.matrix === "object" )) {
            utilities.writeObjectToFile(objects, req.params[0], __dirname);

            actionSender({reloadObject: {object: thisObject}});
            updateStatus = "ok";
        }

        res.send(updateStatus);
    });



    // sends json object for a specific hybrid object. * is the object name
    // ths is the most relevant for
    // ****************************************************************************************************************
    webServer.get('/availableLogicBlocks/', function (req, res) {
        //  cout("get 7");
var blockList = {}
        // Create a objects list with all IO-Points code.
        for (var i = 0; i < blockFolderList.length; i++) {

            // make sure that each block contains always all keys.
            blockList[blockFolderList[i]] = new Block();

            var thisBlock = blockModules[blockFolderList[i]].properties;

            for (var key in thisBlock) {
                blockList[blockFolderList[i]][key] = thisBlock[key];
            }
            // this makes sure that the type of the block is set.
            blockList[blockFolderList[i]].type = blockFolderList[i];

        }
        res.json(blockList);
    });



    /**
     * Normal Links
     **/

    // delete a link. *1 is the object *2 is the link id
    // ****************************************************************************************************************
    webServer.delete('/object/*/link/*/', function (req, res) {

        var thisLinkId = req.params[1];
        var fullEntry = objects[req.params[0]].links[thisLinkId];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[req.params[0]].links[thisLinkId];
        cout("deleted link: " + thisLinkId);
        // cout(objects[req.params[0]].links);
        actionSender({reloadLink: {object: req.params[0]}});
        utilities.writeObjectToFile(objects, req.params[0], __dirname);
        res.send("deleted: " + thisLinkId + " in object: " + req.params[0]);

        var checkIfIpIsUsed = false;
        var checkerKey, subCheckerKey;
        for (checkerKey in objects) {
            for (subCheckerKey in objects[checkerKey].links) {
                if (objects[checkerKey].links[subCheckerKey].objectB === fullEntry.objectB) {
                    checkIfIpIsUsed = true;
                }
            }
        }

        if (fullEntry.objectB !== fullEntry.objectA && !checkIfIpIsUsed) {
            // socketArray.splice(destinationIp, 1);
            delete socketArray[destinationIp];
        }
    });

    // todo links for programms as well
    // adding a new link to an object. *1 is the object *2 is the link id
    // ****************************************************************************************************************
    webServer.post('/object/*/link/*/', function (req, res) {

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(req.params[0])) {

            objects[req.params[0]].links[req.params[1]] = req.body;

            var thisObject = objects[req.params[0]].links[req.params[1]];

            thisObject.loop = false;

            // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
            // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
            if (thisObject.objectA === thisObject.objectB && thisObject.nodeA === thisObject.nodeB) {
                thisObject.loop = true;
            }

            if (!thisObject.loop) {
                // call an action that asks all devices to reload their links, once the links are changed.
                actionSender({reloadLink: {object: req.params[0]}});
                updateStatus = "added";
                cout("added link: " + req.params[1]);
                // check if there are new connections associated with the new link.
                socketUpdater();

                // write the object state to the permanent storage.
                utilities.writeObjectToFile(objects, req.params[0], __dirname);
            } else {
                updateStatus = "found endless Loop";
            }

            res.send(updateStatus);
        }
    });

    // changing the size and possition of an item. *1 is the object *2 is the node id
    // ****************************************************************************************************************

    if (globalVariables.developer === true) {
        webServer.post('/object/*/size/*/', function (req, res) {

            // cout("post 2");
            var updateStatus = "nothing happened";
            var thisObject = req.params[0];
            var thisValue = req.params[1];

            cout("changing Size for :" + thisObject + " : " + thisValue);

            var tempObject;
            if (thisObject === thisValue) {
                tempObject = objects[thisObject];
            } else {
                tempObject = objects[thisObject].nodes[thisValue];
            }

            // check that the numbers are valid numbers..
            if (typeof req.body.x === "number" && typeof req.body.y === "number" && typeof req.body.scale === "number") {

                // if the object is equal the datapoint id, the item is actually the object it self.

                tempObject.x = req.body.x;
                tempObject.y = req.body.y;
                tempObject.scale = req.body.scale;
                // console.log(req.body);
                // ask the devices to reload the objects
            }

            if (typeof req.body.matrix === "object") {

                tempObject.matrix = req.body.matrix;
            }

            if ((typeof req.body.x === "number" && typeof req.body.y === "number" && typeof req.body.scale === "number") || (typeof req.body.matrix === "object" )) {
                utilities.writeObjectToFile(objects, req.params[0], __dirname);

                actionSender({reloadObject: {object: thisObject}});
                updateStatus = "added object";
            }

            res.send(updateStatus);
        });
    }

    /**
     * Send the programming interface static web content [This is the older form. Consider it deprecated.
    */

    // Version 1
    webServer.get('/obj/dataPointInterfaces/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(nodePath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    // Version 2
    webServer.get('/dataPointInterfaces/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(nodePath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    // Version 3 #### Active Version
    webServer.get('/nodes/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(nodePath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    // Version 3 #### Active Version *1 Block *2 file
    webServer.get('/logicBlock/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(blockPath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    // ****************************************************************************************************************
    // frontend interface
    // ****************************************************************************************************************

    if (globalVariables.developer === true) {

        // sends the info page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'info/:id', function (req, res) {
            // cout("get 12");
            res.send(webFrontend.uploadInfoText(req.params.id, objectLookup, objects, knownObjects, sockets));
        });

        webServer.get(objectInterfaceFolder + 'infoLoadData/:id', function (req, res) {
            // cout("get 12");
            res.send(webFrontend.uploadInfoContent(req.params.id, objectLookup, objects, knownObjects, sockets));
        });

        // sends the content page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'content/:id', function (req, res) {
            // cout("get 13");
            res.send(webFrontend.uploadTargetContent(req.params.id, __dirname, objectInterfaceFolder));
        });

        // sends the target page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'target/:id', function (req, res) {
            //   cout("get 14");
            res.send(webFrontend.uploadTargetText(req.params.id, objectLookup, objects, globalVariables.debug));
            // res.sendFile(__dirname + '/'+ "index2.html");
        });

        webServer.get(objectInterfaceFolder + 'target/*/*/', function (req, res) {
            res.sendFile(__dirname + '/' + req.params[0] + '/' + req.params[1]);
        });

        // Send the main starting page for the web user interface
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder, function (req, res) {
            // cout("get 16");
            res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
        });



      //  deactivated

        webServer.get('/object/*/deactivate/', function (req, res) {
            objects[req.params[0]].deactivated = true;
            utilities.writeObjectToFile(objects, req.params[0], __dirname);

            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.redirect(req.get('referer'));
            });

        webServer.get('/object/*/activate/', function (req, res) {
            objects[req.params[0]].deactivated = false;
            utilities.writeObjectToFile(objects, req.params[0], __dirname);
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.redirect(req.get('referer'));
        });

        // request a zip-file with the object stored inside. *1 is the object
        // ****************************************************************************************************************
        webServer.get('/object/*/zipBackup/', function (req, res) {
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
            //  cout("get 3");
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-disposition': 'attachment; filename='+req.params[0]+'.zip'
            });

            var Archiver = require('archiver');

            var zip = Archiver('zip', false);
            zip.pipe(res);
            zip.directory(__dirname + "/objects/" + req.params[0], req.params[0] + "/");
            zip.finalize();
        });

        // sends json object for a specific hybrid object. * is the object name
        // ths is the most relevant for
        // ****************************************************************************************************************
        webServer.get('/object/*/', function (req, res) {
            //  cout("get 7");
            res.json(objects[req.params[0]]);
        });

        // ****************************************************************************************************************
        // post interfaces
        // ****************************************************************************************************************

        webServer.post(objectInterfaceFolder + "contentDelete/:id", function (req, res) {
            if (req.body.action === "delete") {
                var folderDel = __dirname + '/objects/' + req.body.name;

                if (fs.lstatSync(folderDel).isDirectory()) {
                    var deleteFolderRecursive = function (folderDel) {
                        if (fs.existsSync(folderDel)) {
                            fs.readdirSync(folderDel).forEach(function (file, index) {
                                var curPath = folderDel + "/" + file;
                                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                                    deleteFolderRecursive(curPath);
                                } else { // delete file
                                    fs.unlinkSync(curPath);
                                }
                            });
                            fs.rmdirSync(folderDel);
                        }
                    };

                    deleteFolderRecursive(folderDel);
                }
                else {
                    fs.unlinkSync(folderDel);
                }

                res.send(webFrontend.uploadTargetContent(req.params.id, __dirname, objectInterfaceFolder));
            }

        });

        //*****************************************************************************************
        webServer.post(objectInterfaceFolder, function (req, res) {
            // cout("post 22");
            if (req.body.action === "new") {
                // cout(req.body);
                if (req.body.name !== "") {

                    utilities.createFolder(req.body.name, __dirname, globalVariables.debug);

                }
                res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
            }
            if (req.body.action === "delete") {
                var folderDel = __dirname + '/objects/' + req.body.name;

                var deleteFolderRecursive = function (folderDel) {
                    if (fs.existsSync(folderDel)) {
                        fs.readdirSync(folderDel).forEach(function (file, index) {
                            var curPath = folderDel + "/" + file;
                            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                                deleteFolderRecursive(curPath);
                            } else { // delete file
                                fs.unlinkSync(curPath);
                            }
                        });
                        fs.rmdirSync(folderDel);
                    }
                };

                deleteFolderRecursive(folderDel);

                var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);// req.body.name + thisMacAddress;

                if (tempFolderName2 !== null) {
                    if (tempFolderName2 in objects) {
                        cout("ist noch da");
                    } else {
                        cout("ist weg");
                    }
                    if (tempFolderName2 in knownObjects) {
                        cout("ist noch da");
                    } else {
                        cout("ist weg");
                    }

                    // remove object from tree
                    delete objects[tempFolderName2];
                    delete knownObjects[tempFolderName2];
                    delete objectLookup[req.body.name];

                    if (tempFolderName2 in objects) {
                        cout("ist noch da");
                    } else {
                        cout("ist weg");
                    }
                    if (tempFolderName2 in knownObjects) {
                        cout("ist noch da");
                    } else {
                        cout("ist weg");
                    }
                }

                cout("i deleted: " + tempFolderName2);

                res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
            }

        });

        var tmpFolderFile = "";

        // this is all used just for the backup folder
        //*************************************************************************************
        webServer.post(objectInterfaceFolder + 'backup/',
            function (req, res) {
                // cout("post 23");

                cout("komm ich hier hin?");

                var form = new formidable.IncomingForm({
                    uploadDir: __dirname + '/objects',  // don't forget the __dirname here
                    keepExtensions: true
                });

                var filename = "";

                form.on('error', function (err) {
                    throw err;
                });

                form.on('fileBegin', function (name, file) {
                    filename = file.name;
                    //rename the incoming file to the file's name
                    file.path = form.uploadDir + "/" + file.name;
                });

                form.parse(req, function (err, fields, files) {
                    var old_path = files.file.path,
                        file_size = files.file.size;
                });

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    // cout("------------" + form.uploadDir + " " + filename);

                    if (getFileExtension(filename) === "zip") {

                        cout("I found a zip file");

                        try {
                            var DecompressZip = require('decompress-zip');
                            var unzipper = new DecompressZip(folderD + "/" + filename);

                            unzipper.on('error', function (err) {
                                cout('Caught an error');
                            });

                            unzipper.on('extract', function (log) {
                                cout('Finished extracting');
                                cout("have created a new object");
                                //createObjectFromTarget(filename.substr(0, filename.lastIndexOf('.')));
                                createObjectFromTarget(Objects, objects, filename.substr(0, filename.lastIndexOf('.')), __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                //todo add object to the beatsender.

                                cout("have created a new object");
                                fs.unlinkSync(folderD + "/" + filename);

                                res.status(200);
                                res.send("done");

                            });

                            unzipper.on('progress', function (fileIndex, fileCount) {
                                cout('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                            });

                            unzipper.extract({
                                path: folderD + "/",
                                filter: function (file) {
                                    return file.type !== "SymbolicLink";
                                }
                            });

                            cout("extracting: " + filename + "  " + folderD);

                        } catch (err) {
                            cout("could not unzip file");
                        }
                    }
                });
            });

        // this for all the upload to content
        //***********************************************************************

        webServer.post(objectInterfaceFolder + 'content/:id',
            function (req, res) {

                cout("object is: " + req.params.id);

                tmpFolderFile = req.params.id;

                if (req.body.action === "delete") {
                    var folderDel = __dirname + '/objects/' + req.body.name;

                    if (fs.existsSync(folderDel)) {
                        if (fs.lstatSync(folderDel).isDirectory()) {
                            var deleteFolderRecursive = function (folderDel) {
                                if (fs.existsSync(folderDel)) {
                                    fs.readdirSync(folderDel).forEach(function (file, index) {
                                        var curPath = folderDel + "/" + file;
                                        if (fs.lstatSync(curPath).isDirectory()) { // recurse
                                            deleteFolderRecursive(curPath);
                                        } else { // delete file
                                            fs.unlinkSync(curPath);
                                        }
                                    });
                                    fs.rmdirSync(folderDel);
                                }
                            };

                            deleteFolderRecursive(folderDel);
                        }
                        else {
                            fs.unlinkSync(folderDel);
                        }
                    }

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);//req.body.name + thisMacAddress;
                    // remove object from tree
                    if (tempFolderName2 !== null) {
                        delete objects[tempFolderName2];
                        delete knownObjects[tempFolderName2];
                    }

                    cout("i deleted: " + tempFolderName2);

                    res.send(webFrontend.uploadTargetContent(req.params.id, __dirname, objectInterfaceFolder));
                }

                var form = new formidable.IncomingForm({
                    uploadDir: __dirname + '/objects/' + req.params.id,  // don't forget the __dirname here
                    keepExtensions: true
                });

                var filename = "";

                form.on('error', function (err) {
                    throw err;
                });

                form.on('fileBegin', function (name, file) {
                    filename = file.name;
                    //rename the incoming file to the file's name
                    if (req.headers.type === "targetUpload") {
                        file.path = form.uploadDir + "/" + file.name;
                    } else {
                        file.path = form.uploadDir + "/" + file.name;
                    }
                });

                form.parse(req, function (err, fields, files) {
                    var old_path = files.file.path,
                        file_size = files.file.size;
                    // new_path = path.join(__dirname, '/uploads/', files.file.name);
                });

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    cout("------------" + form.uploadDir + "/" + filename);

                    if (req.headers.type === "targetUpload") {
                        var fileExtension = getFileExtension(filename);

                        if (fileExtension === "jpg") {
                            if (!fs.existsSync(folderD + "/target/")) {
                                fs.mkdirSync(folderD + "/target/", "0766", function (err) {
                                    if (err) {
                                        cout(err);
                                        res.send("ERROR! Can't make the directory! \n");    // echo the result back
                                    }
                                });
                            }

                            fs.renameSync(folderD + "/" + filename, folderD + "/target/target.jpg");

                            var objectName = req.params.id + utilities.uuidTime();

                            var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                                '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
                                '   <Tracking>\n' +
                                '   <ImageTarget name="' + objectName + '" size="300.000000 300.000000" />\n' +
                                '   </Tracking>\n' +
                                '   </ARConfig>';

                            var xmlOutFile = folderD + "/target/target.xml";
                            if (!fs.existsSync(xmlOutFile)) {
                                fs.writeFile(xmlOutFile, documentcreate, function (err) {
                                    if (err) {
                                        cout(err);
                                    } else {
                                        cout("XML saved to " + xmlOutFile);
                                    }
                                });
                            }

                            var fileList = [folderD + "/target/target.jpg", folderD + "/target/target.xml", folderD + "/target/target.dat"];

                            var thisObjectId = utilities.readObject(objectLookup, req.params.id);

                            if (typeof  objects[thisObjectId] !== "undefined") {
                                var thisObject = objects[thisObjectId];

                                thisObject.tcs = utilities.genereateChecksums(objects, fileList);

                                utilities.writeObjectToFile(objects, thisObjectId, __dirname);

                                objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

                            }

                            res.status(200);
                            res.send("done");
                            //   fs.unlinkSync(folderD + "/" + filename);
                        }

                        else if (fileExtension === "zip") {

                            cout("I found a zip file");

                            try {
                                var DecompressZip = require('decompress-zip');
                                var unzipper = new DecompressZip(folderD + "/" + filename);

                                unzipper.on('error', function (err) {
                                    cout('Caught an error in unzipper');
                                });

                                unzipper.on('extract', function (log) {
                                    var folderFile = fs.readdirSync(folderD + "/target");
                                    var folderFileType;

                                    for (var i = 0; i < folderFile.length; i++) {
                                        cout(folderFile[i]);
                                        folderFileType = folderFile[i].substr(folderFile[i].lastIndexOf('.') + 1);
                                        if (folderFileType === "xml" || folderFileType === "dat") {
                                            fs.renameSync(folderD + "/target/" + folderFile[i], folderD + "/target/target." + folderFileType);
                                        }
                                    }
                                    fs.unlinkSync(folderD + "/" + filename);

                                    // evnetually create the object.

                                    if (fs.existsSync(folderD + "/target/target.dat") && fs.existsSync(folderD + "/target/target.xml")) {

                                        cout("creating object from target file " + tmpFolderFile);
                                        // createObjectFromTarget(tmpFolderFile);
                                        createObjectFromTarget(Objects, objects, tmpFolderFile, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                        //todo send init to internal modules
                                        cout("have created a new object");

                                        hardwareAPI.reset();
                                        cout("have initialized the modules");

                                        var fileList = [folderD + "/target/target.jpg", folderD + "/target/target.xml", folderD + "/target/target.dat"];

                                        var thisObjectId = utilities.readObject(objectLookup, req.params.id);

                                        if (typeof  objects[thisObjectId] !== "undefined") {
                                            var thisObject = objects[thisObjectId];

                                            thisObject.tcs = utilities.genereateChecksums(objects, fileList);

                                            utilities.writeObjectToFile(objects, thisObjectId, __dirname);

                                            objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

                                        }

                                    }

                                    res.status(200);
                                    res.send("done");
                                });

                                unzipper.on('progress', function (fileIndex, fileCount) {
                                    cout('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                                });

                                unzipper.extract({
                                    path: folderD + "/target",
                                    filter: function (file) {
                                        return file.type !== "SymbolicLink";
                                    }
                                });
                            } catch (err) {
                                cout("could not unzip file");
                            }
                        } else {
                            res.status(200);
                            res.send("done");
                        }

                    } else {
                        res.status(200);
                        res.send("done");
                    }

                });
            });
    } else {
        webServer.get(objectInterfaceFolder, function (req, res) {
            //   cout("GET 21");
            res.send("Objects<br>Developer functions are off");
        });
    }
}

// TODO this should move to the utilities section
//createObjectFromTarget(Objects, objects, tmpFolderFile, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

function createObjectFromTarget(Objects, objects, folderVar, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, debug) {
    cout("I can start");

    var folder = __dirname + '/objects/' + folderVar + '/';
    cout(folder);

    if (fs.existsSync(folder)) {
        cout("folder exists");
        var objectIDXML = utilities.getObjectIdFromTarget(folderVar, __dirname);
        cout("got ID: objectIDXML");
        if (!_.isUndefined(objectIDXML) && !_.isNull(objectIDXML)) {
            if (objectIDXML.length > 13) {

                objects[objectIDXML] = new Objects();
                objects[objectIDXML].name = folderVar;
                objects[objectIDXML].objectId = objectIDXML;

                cout("this should be the IP" + objectIDXML);

                try {
                    objects[objectIDXML] = JSON.parse(fs.readFileSync(__dirname + "/objects/" + folderVar + "/object.json", "utf8"));
                    objects[objectIDXML].ip = ip.address();
                    cout("testing: " + objects[objectIDXML].ip);
                } catch (e) {
                    objects[objectIDXML].ip = ip.address();
                    cout("testing: " + objects[objectIDXML].ip);
                    cout("No saved data for: " + objectIDXML);
                }

                if (utilities.readObject(objectLookup, folderVar) !== objectIDXML) {
                    delete objects[utilities.readObject(objectLookup, folderVar)];
                }
                utilities.writeObject(objectLookup, folderVar, objectIDXML);
                // entering the obejct in to the lookup table

                // ask the object to reinitialize
                //serialPort.write("ok\n");
                // todo send init to internal

                hardwareAPI.reset();

                cout("weiter im text " + objectIDXML);
                utilities.writeObjectToFile(objects, objectIDXML, __dirname);

                objectBeatSender(beatPort, objectIDXML, objects[objectIDXML].ip);
            }
        }
    }
}

/**
 * @desc Check for incoming MSG from other objects or the User. Make changes to the objectValues if changes occur.
 **/

function socketServer() {

    io.on('connection', function (socket) {

        socket.on('/subscribe/realityEditor', function (msg) {

            var msgContent = JSON.parse(msg);
            var thisProtocol = "R1";

            if (!msgContent.object) {
                msgContent.object = msgContent.obj;
                thisProtocol = "R0";
            }

            if (objects.hasOwnProperty(msgContent.object)) {
                cout("reality editor subscription for object: " + msgContent.object);
                cout("the latest socket has the ID: " + socket.id);

                realityEditorSocketArray[socket.id] = {object: msgContent.object, protocol: thisProtocol};
                cout(realityEditorSocketArray);
            }
        });

        socket.on('/subscribe/realityEditorBlock', function (msg) {
            var msgContent = JSON.parse(msg);

            if (objects.hasOwnProperty(msgContent.object)) {
                cout("reality editor block: " + msgContent.object);
                cout("the latest socket has the ID: " + socket.id);

                realityEditorBlockSocketArray[socket.id] = {object: msgContent.object};
                cout(realityEditorBlockSocketArray);
            }

            io.sockets.connected[socket.id].emit('block', JSON.stringify({
                object: msgContent.object,
                node: msgContent.node,
                block: msgContent.block,
                publicData: objects[msgContent.object].nodes[msgContent.logic].blocks[msgContent.block].publicData
            }));//       socket.emit('object', msgToSend);
        });


        socket.on('object', function (msg) {

            var msgContent = protocols[protocol].receive(msg);
            if (msgContent === null) {
                msgContent = protocols["R0"].receive(msg);
            }

            if (msgContent !== null) {
                hardwareAPI.readCall(msgContent.object, msgContent.node, msgContent.data);

                sendMessagetoEditors({
                    object: msgContent.object,
                    node: msgContent.node,
                    data: msgContent.data
                });
                objectEngine(msgContent.object, msgContent.node, null, objects, nodeTypeModules);
            }

        });
// todo do this stuff tomorrrow

        socket.on('block/setup', function (_msg) {
            var msg = JSON.parse(_msg);

            if (typeof msg.object !== "undefined" && typeof  msg.logic !== "undefined" && typeof  msg.block !== "undefined") {
                if (msg.object in objects) {
                    if (msg.logic in objects[msg.object].nodes) {
                        if (msg.block in objects[msg.object].nodes[msg.logic].blocks) {
                            if (typeof objects[msg.object].nodes[msg.logic].blocks[msg.block].publicData !== "undefined") {

                                var thisPublicData = objects[msg.object].nodes[msg.logic].blocks[msg.block];
                                blockModules[thisPublicData.type].setup(msg.object, msg.logic, msg.block, thisPublicData);

                            }

                        }
                    }
                }

            }
        });


        socket.on('block/publicData', function (_msg) {
           var msg = JSON.parse(_msg);
console.log(msg);
            if (typeof msg.object !== "undefined" && typeof  msg.logic !== "undefined" && typeof  msg.block !== "undefined") {
                if (msg.object in objects) {
                    if (msg.logic in objects[msg.object].nodes) {
                        if (msg.block in objects[msg.object].nodes[msg.logic].blocks) {
                            if(typeof objects[msg.object].nodes[msg.logic].blocks[msg.block].publicData !== "undefined"){

                                var thisPublicData = objects[msg.object].nodes[msg.logic].blocks[msg.block].publicData;

                                for (var key in msg.publicData) {
                                    thisPublicData[key] = msg.publicData[key];
                                }
                            }
                        }

                    }
                }
            }
        });


        // this is only for down compatibility for when the UI would request a readRequest
        socket.on('/object/readRequest', function (msg) {
            var msgContent = JSON.parse(msg);
            messagetoSend(msgContent, socket.id);
        });

        socket.on('disconnect', function () {


            if(socket.id in realityEditorSocketArray) {
                delete realityEditorSocketArray[socket.id];
                console.log("GUI for "+ socket.id + " has disconnected");
            }

            if(socket.id in realityEditorBlockSocketArray) {
                utilities.writeObjectToFile(objects, realityEditorBlockSocketArray[socket.id].object, __dirname);
                actionSender({reloadObject: {object: realityEditorBlockSocketArray[socket.id].object}});
                delete realityEditorBlockSocketArray[socket.id];
                console.log("Settings for "+ socket.id + " has disconnected");
            }

            //utilities.writeObjectToFile(objects, req.params[0], __dirname);

        });
    });
    this.io = io;
    cout('socket.io started');
}

function sendMessagetoEditors(msgContent) {

    for (var thisEditor in realityEditorSocketArray) {
        if (msgContent.object === realityEditorSocketArray[thisEditor].object) {
            messagetoSend(msgContent, thisEditor);
        }
    }
}

function messagetoSend(msgContent, socketID) {

    if (objects.hasOwnProperty(msgContent.object)) {
        if (objects[msgContent.object].nodes.hasOwnProperty(msgContent.node)) {

            io.sockets.connected[socketID].emit('object', JSON.stringify({
                object: msgContent.object,
                node: msgContent.node,
                data: objects[msgContent.object].nodes[msgContent.node].data
            }));//       socket.emit('object', msgToSend);
        }
    }
}























/**********************************************************************************************************************
 ******************************************** Engine ******************************************************************
 **********************************************************************************************************************/

/**
 * @desc Take the id of a value in objectValue and look through all links, if this id is used.
 * All links that use the id will fire up the engine to process the link.
 **/

// dependencies aftertypeProcessing

function objectEngine(object, node, routingKey, objects, nodeTypeModules) {
//console.log(objects[object].links);

    var thisLink;

    for (var linkKey in objects[object].links) {

        thisLink = objects[object].links[linkKey];

        if (thisLink.nodeA === node) {

            if(routingKey === null || thisLink.logicA === routingKey) {

                // console.log(object + " "+ node +" "+ logic);
                var thisNode = objects[object].nodes[node];
              /*  thisNode.route = thisLink.logicA;
                console.log("+++: "+thisLink.logicA);
                */

                // console.log(node + " : "+thisNode.type);
                if ((thisNode.type in nodeTypeModules)) {

                    nodeTypeModules[thisNode.type].render(object, linkKey, thisNode.data, function (object, link, processedData) {

                        enginePostProcessing(object, link, processedData);
                    });

                }
            }
        }
    }

   //

   /* for (var linkKey in objects[object].nodes[node].links) {
        console.log("here");
    }

    for (var linkKey in objects[object].nodes[node].links) {
        console.log("here");
    }
    for (var linkKey in objects[object].nodes[node].links) {
        console.log("here");
    }*/
}

/**
 * @desc This has to be the callback for the processed types. The type should give back a processed object.
 * @param {Object} processedValue Any kind of object simple or complex
 * @param {String} IDinLinkArray Id to search for in the Link Array.
 **/

function enginePostProcessing(object, link, processedData) {

    var thisLink = objects[object].links[link];

    if (!(thisLink.objectB in objects)) {
        socketSender(object, link, processedData);
    }
    else {

        var objSend = objects[thisLink.objectB].nodes[thisLink.nodeB];

        if(typeof thisLink.logicB !== "number") {
      
                for (var key in processedData) {
                    objSend.data[key] = processedData[key];
                }

            hardwareAPI.readCall(thisLink.objectB, thisLink.nodeB, objSend.data);

            sendMessagetoEditors({object: thisLink.objectB, node: thisLink.nodeB, data: objSend.data});
            objectEngine(thisLink.objectB, thisLink.nodeB, null, objects, nodeTypeModules);
        }
         else
        {

           var thisString= "edgePlaceholderIn"+thisLink.logicB;

            var objSend = objects[thisLink.objectB].nodes[thisLink.nodeB].blocks[thisString];

            for (var key in processedData) {
                objSend.data[0][key] = processedData[key];
            }

            logicEngine(thisLink.objectB, thisLink.nodeB, thisString, 0, objects, blockModules)
        }

    }
}



















/**********************************************************************************************************************
 ******************************************** Logic Engine ************************************************************
 **********************************************************************************************************************/


/**
 * @desc Take the id of a value in objectValue and look through all links, if this id is used.
 * All links that use the id will fire up the engine to process the link.
 **/

// dependencies aftertypeProcessing
function logicEngine(object, logic, block, item, objects, blockModules) {


    if(object in objects) {

        if (logic in objects[object].nodes) {

            var thisLogic = objects[object].nodes[logic];

           // console.log(logic);


            /**
            * If (anzahl is grösser als 1){
            * Suche nach den anderen möglichen connections
            *
            * }

             */

            for (var linkKey in thisLogic.links) {

               // console.log(thisLogic.links[linkKey]);

                if (thisLogic.links[linkKey].nodeA === block && thisLogic.links[linkKey].logicA === item) {

                    var thisBlock = thisLogic.blocks[block];
                    thisBlock.route = item;

                   // console.log(block);

                   // console.log(thisBlock.type);


                    if ((thisBlock.type in blockModules)) {

                        blockModules[thisBlock.type].render(object, logic, linkKey, thisBlock, function (object, logic, link, processedData) {

                            logicEnginePostProcessing(object, logic, link, processedData);
                        });
                    }
                }
            }
        }
    }
}

/**
 * @desc This has to be the callback for the processed types. The type should give back a processed object.
 * @param {Object} processedValue Any kind of object simple or complex
 * @param {String} IDinLinkArray Id to search for in the Link Array.
 **/

function logicEnginePostProcessing(object, logic, link, processedData) {


    //console.log("+++++++"+objects[object].nodes[logic].links[link]);
    //console.log(object +" "+ logic +" " + link + " : "+ processedData);
        var thisLink = objects[object].nodes[logic].links[link];
        var thisLogic = objects[object].nodes[logic];

    console.log("------------------");
    console.log(objects[object].nodes[logic].blocks[thisLink.nodeA].data);
    console.log(processedData);

        //logicEngine(thisLink.objectB, thisLink.nodeB, thisString, 0, objects, blockModules)

        var routingKey = null;

        if (thisLink.nodeB === "edgePlaceholderOut0") routingKey = 0;
        else if (thisLink.nodeB === "edgePlaceholderOut1") routingKey = 1;
        else if (thisLink.nodeB === "edgePlaceholderOut2") routingKey = 2;
        else if (thisLink.nodeB === "edgePlaceholderOut3") routingKey = 3;

        if (routingKey !== null) {

            var objSend = objects[object].nodes[logic];

            for (var key in processedData[thisLink.logicA]) {
                objSend.data[key] = processedData[thisLink.logicA][key];
                thisLogic.blocks[thisLink.nodeB].data[thisLink.logicB][key] = processedData[thisLink.logicA][key];
            }

            if(typeof objSend.routeBuffer === "undefined")
                objSend.routeBuffer =[0,0,0,0];

            objSend.routeBuffer[routingKey] =  objSend.data.value;

            objectEngine(object, logic, routingKey, objects, nodeTypeModules);
            //logicEngine(object, logic, thisLink.nodeB, thisLink.logicB, objects, blockModules);

        } else {

            var objSend = thisLogic.blocks[thisLink.nodeB];
            for (var key in processedData[thisLink.logicA]) {
                objSend.data[thisLink.logicB][key] = processedData[thisLink.logicA][key];
            }

            logicEngine(object, logic, thisLink.nodeB, thisLink.logicB, objects, blockModules);

        }
    // maybe: var re = /^(in|out)\d$/; re.test(blockId)  // or  /^out(0|1|2|3)$/
}

















/**
 * @desc Sends processedValue to the responding Object using the data saved in the LinkArray located by IDinLinkArray
 **/

function socketSender(object, link, data) {
    var thisLink = objects[object].links[link];

    var msg = "";

    if(thisLink.objectB in knownObjects){
        if (knownObjects[thisLink.objectB].protocol){
            var thisProtocol = knownObjects[thisLink.objectB].protocol;
            if(thisProtocol in protocols){
                 msg = protocols[thisProtocol].send(thisLink.objectB, thisLink.nodeB, data);
            }
            else {
                msg = protocols["R0"].send(thisLink.objectB, thisLink.nodeB, data);
            }
        } else {
            msg = protocols["R0"].send(thisLink.objectB, thisLink.nodeB, data);
        }

        try {
            var thisIp = knownObjects[thisLink.objectB];
            var presentObjectConnection = socketArray[thisIp].io;
            if (presentObjectConnection.connected) {
                presentObjectConnection.emit("object", msg);
            }
        }
        catch (e) {
            cout("can not emit from link ID:" + link + "and object: " + object);
        }

    }
}

/**********************************************************************************************************************
 ******************************************** Socket Utilities Section ************************************************
 **********************************************************************************************************************/

/**
 * @desc  Watches the connections to all objects that have stored links within the object.
 * If an object is disconnected, the object tries to reconnect on a regular basis.
 **/

function socketUpdater() {
    // cout(knownObjects);
    // delete unconnected connections
    var sockKey, objectKey, nodeKey;

    for (sockKey in socketArray) {
        var socketIsUsed = false;

        // check if the link is used somewhere. if it is not used delete it.
        for (objectKey in objects) {
            for (nodeKey in objects[objectKey].links) {
                var thisIp = knownObjects[objects[objectKey].links[nodeKey].objectB];

                if (thisIp === sockKey) {
                    socketIsUsed = true;
                }
            }
        }
        if (!socketArray[sockKey].io.connected || !socketIsUsed) {
            // delete socketArray[sockKey];
        }
    }
    for (objectKey in objects) {
        for (nodeKey in objects[objectKey].links) {
            var thisLink = objects[objectKey].links[nodeKey];

            if (!(thisLink.objectB in objects) && (thisLink.objectB in knownObjects)) {

                var thisIp = knownObjects[thisLink.objectB];
                //cout("this ip: "+ip);
                if (!(thisIp in socketArray)) {
                    // cout("shoudl not show up -----------");
                    socketArray[thisIp] = new ObjectSockets(socketPort, thisIp);
                }
            }
        }
    }

    socketIndicator();

    if (sockets.socketsOld !== sockets.sockets || sockets.notConnectedOld !== sockets.notConnected || sockets.connectedOld !== sockets.connected) {
        for (var socketKey in socketArray) {
            if (!socketArray[socketKey].io.connected) {
                for (var objectKey in knownObjects) {
                    if (knownObjects[objectKey] === socketKey) {
                        cout("Looking for: " + objectKey + " with the ip: " + socketKey);
                    }
                }
            }
        }

        cout(sockets.sockets + " connections; " + sockets.connected + " connected and " + sockets.notConnected + " not connected");

    }
    sockets.socketsOld = sockets.sockets;
    sockets.connectedOld = sockets.connected;
    sockets.notConnectedOld = sockets.notConnected;
}

/**
 * Updates the global saved sockets data
 */
function socketIndicator() {
    sockets.sockets = 0;
    sockets.connected = 0;
    sockets.notConnected = 0;

    for (var sockKey2 in socketArray) {
        if (socketArray[sockKey2].io.connected) {
            sockets.connected++;
        } else {
            sockets.notConnected++;
        }
        sockets.sockets++;
    }
}

/**
 * @desc
 * @param
 * @param
 * @return
 **/

function socketUpdaterInterval() {
    setInterval(function () {
        socketUpdater();
    }, socketUpdateInterval);
}

function cout(msg) {
    if (globalVariables.debug) console.log(msg);
}