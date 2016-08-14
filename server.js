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
const beatInterval = 5000;         // how often is the heartbeat sent
const socketUpdateInterval = 2000; // how often the system checks if the socket connections are still up and running.
const version = "1.7.0";           // the version of this server


// All objects are stored in this folder:
const objectPath = __dirname + "/objects";
// All visual UI representations for IO Points are stored in this folder:
const modulePath = __dirname + "/nodes";
// All interfaces for different hardware such as Arduino Yun, PI, Philips Hue are stored in this folder.
const internalPath = __dirname + "/hardwareInterfaces";
// The web service level on wich objects are accessable. http://<IP>:8080 <objectInterfaceFolder> <object>
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
// This is used for the interfaces defined in the hardwareInterfaces folder.
var hardwareInterfaces = require(__dirname + '/libraries/hardwareInterfaces');

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
    // The (t)arget (C)eck(S)um is a sum of the checksum values for the target files.
    this.tcs = null;
    // Position X, Y, Scale and Matrix
    this.position = new Position();
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
    this.matrixMemory = false; // TODO use this to store UI interface for image later.
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
    // if origin location is a Logic Block then set to logic block location otherwise null
    this.blockA = false;
    // Defines the type of the link origin. Currently this function is not in use.
    this.nameA = "";
    // The destination object to where the origin object is sending data to.
    // At this point the destination object accepts all incoming data and routs the data according to the link data sent.
    this.objectB = null;
    // The destination IOPoint to where the link is sending data from the origin object.
    // objectB and nodeB will be send with each data package.
    this.nodeB = null;
    // if destination location is a Logic Block then set to logic block location otherwise null
    this.blockB = false;
    // Defines the type of the link destination. Currently this function is not in use.
    this.nameB = "";
    // check that there is no endless loop in the system
    this.loop = false;
    // Will be used to test if a link is still able to find its destination.
    // It needs to be discussed what to do if a link is not able to find the destination and for what time span.
    this.count = 0; // todo use this to test if link is still valid. If not able to send for some while, kill link.
}

/**
 * @desc Constructor used to define every IO Point generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 **/

function Node() {
    // the name of each link. It is used in the Reality Editor to show the IO name.
    this.name = "";
    // defines if IO-Point is a logic block
    this.isLogicNode = false;
    // this is storing the actual value representing the actual state of a IO Point
    // todo check how a block is processed when its spanns more then one blocks.
    this.blocks = {
        "R0C0": new Block(),"R0C1": null,"R0C2": null,"R0C3": null,
        "R1C0": null,"R1C1": null,"R1C2": null,"R1C3": null,
        "R2C0": null,"R2C1": null,"R2C2": null,"R2C3": null,
        "R3C0": null,"R3C1": null,"R3C2": null,"R3C3": null,
    };
    // nameInput are the names given for each IO
    this.nameInput =  [false,false,false,false];
    // nameOutput are the names given for each IO
    this.nameOutput = [false,false,false,false];

    // Position X, Y, Scale and Matrix
    this.position = new Position();

    // the iconImage is in png or jpg format and will be stored within the logicBlock folder. A reference is placed here.
    this.iconImage = null;
    // if logicNode and lastSetting is not false then the last node setting will be shown instead of the crafting board.
    this.lastSetting = false;
    // defines the nodeInterface that is used to process data of this type. It also defines the visual representation
    // in the Reality Editor. Such data points interfaces can be found in the nodeInterface folder.
    // todo plugin should be removed eventually
    this.plugin = "default";
    // this is an optional parameter object for the plugin. As this parameter is stored with the object on disk. It can be used
    // as non fluctuating storage.
    this.pluginParameter = null;
    // defines the origin Hardware interface of the IO Point. For example if this is arduinoYun the Server associates
    // this IO Point with the Arduino Yun hardware interface.
    this.type = "arduinoYun"; // todo "arduinoYun", "virtual", "edison", ... make sure to define yours in your internal_module file
}

/**
 * @desc Constructor used to define every Node possitioned in the logicBlock.
 **/

function Block() {
    /// Data
    // this array saves the actual state value. Array size depends on size of node.
    this.data = [new Data()];

    // experimental. This are objects for data storage. Maybe it makes sense to store data in the general object
    // this would allow the the packages to be persistant. // todo discuss usability with Ben.
    this.privateData = {};
    this.publicData = {};

    // State
    // indicates how much calls per second is happening on this node
    this.health = 0;

    // setup
    // The package ID is a specific UUID for all nodes of the same kind.
    // nodes are saved as ZIP files for sharing. The ZIP file has the same ID.
    this.id = null;
    // the checksum should be identical with the checksum for the persistent package files.
    this.checksum = null; // checksum of the files for the program
    // name of the node
    this.name = null;
    // amount of elements the IO point is created of. Single IO nodes have the size 1.
    this.size = 1;
    // The position on the crafting board.
    this.x = 0;
    this.y = 0;
    // A specific icon for the node, png or jpg.
    this.iconImage = null;
    // Name for the node, if no icon is available.
    this.nodeText = "node";

    // IO
    // define how many inputs are active.
    this.activeInput = [true];
    // define how many outputs are active.
    this.activeOutput = [true];
    // define the names of each active IO
    this.nameInput = [""];
    this.nameOutput = [""];

}

/**
 * @desc Definition for Values that are sent around.
 **/

function Data() {
    // this is storing the actual value representing the actual state of a IO Point
    this.number = null;
    // if isLogicBlock is true, then this.value = new Logic();

    // Defines the kind of data send. At this point we have 3 active data modes and one future possibility.
    // (f) defines floating point values between 0 and 1. This is the default value.
    // (d) defines a digital value exactly 0 or 1.
    // (+) defines a positive step with a floating point value for compatibility.
    // (-) defines a negative step with a floating point value for compatibility.
    // (m) defines a future possible data value for mime type media
    // todo combine value and type in one object. which allows for future more stable type processing.
    this.mode = "f";
    // string of the name for the unit used (for Example "C", "F", "cm"). Default is set to no unit.
    this.unit = false;
    // scale of the unit that is used. Usually the scale is between 0 and 1.
    this.unitMin = 0;
    this.unitMax = 1;
}

function Position() {
    // Reality Editor: This is used to possition the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to possition the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = false;
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
/**********************************************************************************************************************
 ******************************************** Variables and Objects ***************************************************
 **********************************************************************************************************************/

// This variable will hold the entire tree of all objects and their sub objects.
var objects = {};


var nodeModules = {};   // Will hold all available data point interfaces
var hardwareInterfaceModules = {}; // Will hold all available hardware interfaces.
// A list of all objects known and their IPs in the network. The objects are found via the udp heart beat.
// If a new link is linking to another objects, this knownObjects list is used to establish the connection.
// This list is also used to keep track of the actual IP of an object. If the IP of an object in a network changes,
// It has no influance on the connectivity, as it is referenced by the object UUID through the entire time.
var knownObjects = {};
// A lookup table used to process faster through the objects.
var objectLookup = {};
// This list holds all the socket connections that are kept alive. Socket connections are kept alive if a link is
// associated with this object. Once there is no more link the socket connection is deleted.
var socketArray = {};     // all socket connections that are kept alive

var realityEditorSocketArray = {};     // all socket connections that are kept alive

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
var nodeFolderList = fs.readdirSync(modulePath).filter(function (file) {
    return fs.statSync(modulePath + '/' + file).isDirectory();
});

// Remove eventually hidden files from the Hybrid Object list.
while (nodeFolderList[0][0] === ".") {
    nodeFolderList.splice(0, 1);
}

// Create a objects list with all IO-Points code.
for (var i = 0; i < nodeFolderList.length; i++) {
    nodeModules[nodeFolderList[i]] = require(modulePath + '/' + nodeFolderList[i] + "/index.js").render;
}

cout("Initialize System: ");
cout("Loading Hardware interfaces");
// set all the initial states for the Hardware Interfaces in order to run with the Server.
hardwareInterfaces.setup(objects, objectLookup, globalVariables, __dirname, nodeModules, function (objectKey, nodeKey, blockKey, number, mode, unit, unitMin, unitMax, objects, nodeModules) {

    //these are the calls that come from the objects before they get processed by the object engine.
    // send the saved value before it is processed

    sendMessagetoEditors({object: objectKey, node: nodeKey, block: blockKey, data: {number:number, mode: mode, unit: unit, unitMin:unitMin, unitMax:unitMax}});
    objectEngine(objectKey, nodeKey, blockKey, objects, nodeModules);

}, Node);
cout("Done");

cout("Loading Hybrid Objects");
// This function will load all the Hybrid Objects
loadHybridObjects();
cout("Done");

startSystem();
cout("started");


// get the directory names of all available plugins for the 3D-UI
var hardwareInterfacesFolderList = fs.readdirSync(internalPath).filter(function (file) {
    return fs.statSync(internalPath + '/' + file).isDirectory();
});
// remove hidden directories
while (hardwareInterfacesFolderList[0][0] === ".") {
    hardwareInterfacesFolderList.splice(0, 1);
}

// add all plugins to the nodeModules object. Iterate backwards because splice works inplace
for (var i = hardwareInterfacesFolderList.length - 1; i >= 0; i--) {
    //check if hardwareInterface is enabled, if it is, add it to the hardwareInterfaceModules
    if (require(internalPath + "/" + hardwareInterfacesFolderList[i] + "/index.js").enabled) {
        hardwareInterfaceModules[hardwareInterfacesFolderList[i]] = require(internalPath + "/" + hardwareInterfacesFolderList[i] + "/index.js");
    } else {
        hardwareInterfacesFolderList.splice(i, 1);
    }
}

cout("ready to start internal servers");

// starting the internal servers (receive)
for (var i = 0; i < hardwareInterfacesFolderList.length; i++) {
    hardwareInterfaceModules[hardwareInterfacesFolderList[i]].init();
    hardwareInterfaceModules[hardwareInterfacesFolderList[i]].receive();
}

cout("found " + hardwareInterfacesFolderList.length + " internal server");
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
function loadHybridObjects() {
    cout("Enter loadHybridObjects");
    // check for objects in the objects folder by reading the objects directory content.
    // get all directory names within the objects directory
    var HybridObjectFolderList = fs.readdirSync(objectPath).filter(function (file) {
        return fs.statSync(objectPath + '/' + file).isDirectory();
    });

    // remove hidden directories
    try {
        while (HybridObjectFolderList[0][0] === ".") {
            HybridObjectFolderList.splice(0, 1);
        }
    } catch (e) {
        cout("no hidden files");
    }

    for (var i = 0; i < HybridObjectFolderList.length; i++) {
        var tempFolderName = utilities.getObjectIdFromTarget(HybridObjectFolderList[i], __dirname);
        cout("TempFolderName: " + tempFolderName);

        if (tempFolderName !== null) {
            // fill objects with objects named by the folders in objects
            objects[tempFolderName] = new Objects();
            objects[tempFolderName].folder = HybridObjectFolderList[i];

            // add object to object lookup table
            utilities.writeObject(objectLookup, HybridObjectFolderList[i], tempFolderName);

            // try to read a saved previous state of the object
            try {
                objects[tempFolderName] = JSON.parse(fs.readFileSync(__dirname + "/objects/" + HybridObjectFolderList[i] + "/object.json", "utf8"));
                objects[tempFolderName].ip = ip.address();

                // adding the values to the arduino lookup table so that the serial connection can take place.
                // todo this is maybe obsolete.
                for (var nodeKey in objects[tempFolderName].nodes) {
                    ArduinoLookupTable.push({object: HybridObjectFolderList[i], node: nodeKey});
                }
                // todo the sizes do not really save...


                // todo new Data points are never writen in to the file. So this full code produces no value
                // todo Instead keep the board clear=false forces to read the data points from the arduino every time.
                // todo this is not true the nodes are writen in to the object. the sizes are wrong
                // if not uncommented the code does not connect to the arduino side.
                // data comes always from the arduino....
                // clear = true;

                cout("I found objects that I want to add");
                cout("---");
                cout(ArduinoLookupTable);
                cout("---");

            } catch (e) {
                objects[tempFolderName].ip = ip.address();
                objects[tempFolderName].objectId = tempFolderName;
                cout("No saved data for: " + tempFolderName);
            }

        } else {
            cout(" object " + HybridObjectFolderList[i] + " has no marker yet");
        }
    }

    for (var keyint in hardwareInterfaceModules) {
        hardwareInterfaceModules[keyint].init();
    }
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
        objectBeatSender(beatPort, key, objects[key].ip);
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

    // shut down the internal servers (teardown)
    for (var i = 0; i < hardwareInterfacesFolderList.length; i++) {
        mod = hardwareInterfaceModules[hardwareInterfacesFolderList[i]];
        if ("shutdown" in mod) {
            mod.shutdown();
        }
    }

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
        tcs: objects[thisId].tcs
    }));

    if (globalVariables.debug) console.log("UDP broadcasting on port: " + PORT);
    if (globalVariables.debug) console.log("Sending beats... Content: " + JSON.stringify({
            id: thisId,
            ip: thisIp,
            vn: thisVersionNumber,
            tcs: objects[thisId].tcs
        }));
    cout("UDP broadcasting on port: " + PORT);
    cout("Sending beats... Content: " + JSON.stringify({
            id: thisId,
            ip: thisIp,
            vn: thisVersionNumber,
            tcs: objects[thisId].tcs
        }));

    // creating the datagram
    var client = dgram.createSocket('udp4');
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(2);
        client.setMulticastTTL(2);
    });

    if (!oneTimeOnly) {
        setInterval(function () {
            // send the beat#
            if (thisId in objects) {
                // cout("Sending beats... Content: " + JSON.stringify({ id: thisId, ip: thisIp, vn:thisVersionNumber, tcs: objects[thisId].tcs}));

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
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
                        cout("error ");
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
            if (thisId in objects) {

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
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
        client.setTTL(64);
        client.setMulticastTTL(64);
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
        if (msgContent.hasOwnProperty("id") && msgContent.hasOwnProperty("ip") && !(msgContent.id in objects) && !(msgContent.id in knownObjects)) {
            knownObjects[msgContent.id] = msgContent.ip;
            cout("I found new Objects: " + JSON.stringify({
                    id: msgContent.id,
                    ip: msgContent.ip
                }));
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

function objectWebServer() {

    // define the body parser
    webServer.use(bodyParser.urlencoded({
        extended: true
    }));
    webServer.use(bodyParser.json());
    // define a couple of static directory routs


    webServer.use('/objectDefaultFiles', express.static(__dirname + '/libraries/objectDefaultFiles/'));

    webServer.use("/obj", function (req, res, next) {

        var urlArray = req.originalUrl.split("/");

        console.log(urlArray);
        if ((req.method === "GET" && urlArray[2] !== "nodes") && (req.url.slice(-1) === "/" || urlArray[3].match(/\.html?$/))) {

            var fileName = __dirname + "/objects" + req.url;

            if (urlArray[3] !== "index.html" && urlArray[3] !== "index.htm") {

                if (fs.existsSync(fileName + "index.html")) {
                    fileName = fileName + "index.html";
                } else {
                    fileName = fileName + "index.htm";
                }
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

    // sends json object for a specific hybrid object. * is the object name
    // ths is the most relevant for
    // ****************************************************************************************************************
    webServer.get('/object/*/', function (req, res) {
        //  cout("get 7");
        res.json(objects[req.params[0]]);
    });

    // delete a link. *1 is the object *2 is the link id
    // ****************************************************************************************************************
    webServer.delete('/object/*/link/*/', function (req, res) {

        var thisLinkId = req.params[1];
        var fullEntry = objects[req.params[0]].links[thisLinkId];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[req.params[0]].links[thisLinkId];
        cout("deleted link: " + thisLinkId);
        // cout(objects[req.params[0]].links);
        actionSender(JSON.stringify({reloadLink: {id: req.params[0], ip: objects[req.params[0]].ip}}));
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
            if (thisObject.objectA === thisObject.objectB && thisObject.nodeA === thisObject.nodeB && thisObject.blockA === thisObject.blockB) {
                thisObject.loop = true;
            }

            if (!thisObject.loop) {
                // call an action that asks all devices to reload their links, once the links are changed.
                actionSender(JSON.stringify({reloadLink: {id: req.params[0], ip: objects[req.params[0]].ip}}));
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

            var tempObject = {};
            if (thisObject === thisValue) {
                tempObject = objects[thisObject];
            } else {
                tempObject = objects[thisObject].nodes[thisValue];
            }

            // check that the numbers are valid numbers..
            if (typeof req.body.position.x === "number" && typeof req.body.position.y === "number" && typeof req.body.position.scale === "number") {
                // if the object is equal the node id, the item is actually the object it self.
                tempObject.position = req.body.position;

                if (typeof req.body.matrix !== "object") {
                    tempObject.position.matrix = false;
                }
            }

            if ((typeof req.body.position.x === "number" && typeof req.body.position.y === "number" && typeof req.body.position.scale === "number") || (typeof req.body.position.matrix === "object" )) {
                utilities.writeObjectToFile(objects, req.params[0], __dirname);

                actionSender(JSON.stringify({reloadObject: {id: thisObject, ip: objects[thisObject].ip}}));
                updateStatus = "added object";
            }

            res.send(updateStatus);
        });
    }

    // this is the newer form.
    // in future the data programming interface should be accessable directly like so. because the obj is reserved for the object content only
    webServer.get('/nodes/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(__dirname + "/nodes/" + req.params[0] + '/gui/' + req.params[1]);
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

        // request a zip-file with the object stored inside. *1 is the object
        // ****************************************************************************************************************
        webServer.get('/object/*/zipBackup/', function (req, res) {
            //  cout("get 3");
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-disposition': 'attachment; filename=HybridObjectBackup.zip'
            });

            var Archiver = require('archiver');

            var zip = Archiver('zip', false);
            zip.pipe(res);
            zip.directory(__dirname + "/objects/" + req.params[0], req.params[0] + "/");
            zip.finalize();
        });

        // ****************************************************************************************************************
        // post interfaces
        // ****************************************************************************************************************

        webServer.post(objectInterfaceFolder + "contentDelete/:id", function (req, res) {
            ;
            if (req.body.action === "delete") {
                var folderDel = __dirname + '/objects/' + req.body.folder;

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
                if (req.body.folder !== "") {

                    utilities.createFolder(req.body.folder, __dirname, globalVariables.debug);

                }
                res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
            }
            if (req.body.action === "delete") {
                var folderDel = __dirname + '/objects/' + req.body.folder;

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

                var tempFolderName2 = utilities.readObject(objectLookup, req.body.folder);// req.body.folder + thisMacAddress;

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
                    delete objectLookup[req.body.folder];

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
                    var folderDel = __dirname + '/objects/' + req.body.folder;


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

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.folder);//req.body.folder + thisMacAddress;
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

                                        for (var keyint in hardwareInterfaceModules) {
                                            hardwareInterfaceModules[keyint].init();
                                        }
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
            res.send("Hybrid Objects<br>Developer functions are off");
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
                objects[objectIDXML].folder = folderVar;
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
                for (var keyint in hardwareInterfaceModules) {
                    hardwareInterfaceModules[keyint].init();
                }

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

function socketServer(params) {

    io.on('connection', function (socket) {

        socket.on('/subscribe/realityEditor', function (msg) {

            if (objects.hasOwnProperty(JSON.parse(msg).object)) {
                cout("reality editor subscription for object: " + JSON.parse(msg).object);
                cout("the letated socket has the ID: " + socket.id);

                realityEditorSocketArray[socket.id] = JSON.parse(msg).object;
                cout(realityEditorSocketArray);
            }
        });

        socket.on('object', function (msg) {

            var msgContent = JSON.parse(msg);
            
            if ((msgContent.object in objects) && typeof msgContent.data !== "undefined") {
                if (msgContent.node in objects[msgContent.obj].nodes) {
                    if (msgContent.block in objects[msgContent.obj].nodes[msgContent.node].blocks) {

                        var objSend = objects[msgContent.object].nodes[msgContent.node].blocks[msgContent.block];
                        
                        var key;
                        for(key in msgContent.data)
                        {
                            objSend.data[key] = msgContent.data[key];
                        }

                        if (hardwareInterfaceModules.hasOwnProperty(objSend.type)) {
                            hardwareInterfaceModules[objSend.type].send(msgContent.object, msgContent.node, msgContent.block, objSend.data, objSend.type);
                        }

                        sendMessagetoEditors({
                            object: msgContent.object,
                            node: msgContent.node,
                            block: msgContent.block,
                            data: objSend.data
                        });
                        objectEngine(msgContent.object, msgContent.node, msgContent.block, objects, nodeModules);
                    }

                }
            }
        });

        // this is only for down compatibility for when the UI would request a readRequest
        socket.on('/object/value', function (msg) {
            var msgContent = JSON.parse(msg);
            messagetoSend(msgContent, socket.id);
        });

        socket.on('disconnect', function () {
            console.log(socket.id + " has disconnected");
            delete realityEditorSocketArray[socket.id];
        });
    });
    this.io = io;
    cout('socket.io started');
}

function sendMessagetoEditors(msgContent) {

    for (var thisEditor in realityEditorSocketArray) {
        if (msgContent.object === realityEditorSocketArray[thisEditor]) {
            messagetoSend(msgContent, thisEditor);
        }
    }
}

function messagetoSend(msgContent, socketID) {

    if (objects.hasOwnProperty(msgContent.object)) {
        if (objects[msgContent.object].nodes.hasOwnProperty(msgContent.node)) {
            if (objects[msgContent.object].nodes[msgContent.node].blocks.hasOwnProperty(msgContent.block)) {

                io.sockets.connected[socketID].emit('object', JSON.stringify({
                    object: msgContent.object,
                    node: msgContent.node,
                    block: msgContent.block,
                    data: objects[msgContent.object].nodes[msgContent.node].blocks[msgContent.block].data
                }));//       socket.emit('object', msgToSend);

            }
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

// dependencies afterPluginProcessing

function objectEngine(object, node, block, objects, nodeModules) {
    // cout("engine started");
    var linkKey;
    for (linkKey in objects[object].links) {
        if (objects[object].links[linkKey].nodeA === node) {
            if(objects[object].links[linkKey].blockA === block) {

                var dataBlock = objects[object].nodes[node].blocks[block];

                if ((dataBlock.plugin in nodeModules)) {
                    nodeModules[dataBlock.plugin](object, linkKey, dataBlock.data, function (object, linkId, processedData) {
                        enginePostProcessing(object, linkId, processedData);
                    });
                }
            }
        }
    }
}

/**
 * @desc This has to be the callback for the processed plugin. The plugin should give back a processed object.
 * @param {Object} processedValue Any kind of object simple or complex
 * @param {String} IDinLinkArray Id to search for in the Link Array.
 **/

function enginePostProcessing(object, linkId, processedData) {
    var link = objects[object].links[linkId];

    if (!(link.objectB in objects)) {

        socketSender(object, linkId, processedData);
    }
    else {

        var objSend = objects[link.objectB].nodes[link.nodeB];
        var objDataSend = objSend.blocks[link.blockB];

        var key;
        for(key in processedData)
        {
            objDataSend.data[key] = processedData[key];
        }

        if (hardwareInterfaceModules.hasOwnProperty(objSend.type)) {
            hardwareInterfaceModules[objSend.type].send(link.objectB, link.nodeB, link.blockB, objDataSend.data, objSend.type);
        }
        // send data to listening editor

        sendMessagetoEditors({object: link.objectB, node: link.nodeB, block: link.blockB, data: objDataSend.data});
        objectEngine(link.objectB, link.nodeB, link.blockB, objects, nodeModules);
    }
}

/**
 * @desc Sends processedValue to the responding Object using the data saved in the LinkArray located by IDinLinkArray
 **/

function socketSender(object, linkId, data) {
    var link = objects[object].links[linkId];
    var msg = JSON.stringify({object: link.objectB, node: link.nodeB, block: link.blockB, data: data});

    //todo this should be rewritten with handling an array of connected objects similar the connected Reality Editors
    if (!(link.objectB in objects)) {
        try {
            var objIp = knownObjects[link.objectB];
            var presentObjectConnection = socketArray[objIp].io;
            if (presentObjectConnection.connected) {
                presentObjectConnection.emit("object", msg);
            }
        }
        catch (e) {
            cout("can not emit from link ID:" + linkId + "and object: " + object);
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
            var link = objects[objectKey].links[nodeKey];

            if (!(link.objectB in objects) && (link.objectB in knownObjects)) {


                var ip = knownObjects[link.objectB];
                //cout("this ip: "+ip);
                if (!(ip in socketArray)) {
                    // cout("shoudl not show up -----------");
                    socketArray[ip] = new ObjectSockets(socketPort, ip);
                }
            }
        }
    }

    socketIndicator();

    var sockKey3, objectKey2;
    if (sockets.socketsOld !== sockets.sockets || sockets.notConnectedOld !== sockets.notConnected || sockets.connectedOld !== sockets.connected) {
        for (sockKey3 in socketArray) {
            if (!socketArray[sockKey3].io.connected) {
                for (objectKey2 in knownObjects) {
                    if (knownObjects[objectKey2] === sockKey3) {
                        cout("Looking for: " + objectKey2 + " with the ip: " + sockKey3);
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