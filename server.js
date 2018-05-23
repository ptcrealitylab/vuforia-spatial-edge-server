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
    debug: false,
    saveToDisk : true // allow system to save to file system// debug messages to console
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
const version = "3.0.0";           // the version of this server
const protocol = "R2";           // the version of this server
const netmask = "255.255.0.0"; // define the network scope from which this server is accessable.
// for a local network 255.255.0.0 allows a 16 bit block of local network addresses to reach the object.
// basically all your local devices can see the object, however the internet is unable to reach the object.

console.log(parseInt(version.replace(/\./g, "")));

var os = require('os');
var path = require('path');

// All objects are stored in this folder:
// Look for objects in the user Documents directory instead of __dirname+"/objects"
var objectsPath = path.join(path.join(os.homedir(), 'Documents'), 'realityobjects');
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
var exphbs = require('express-handlebars'); // View Template library

// create objects folder at objectsPath if necessary
if(!fs.existsSync(objectsPath)) {
    console.log('created objects directory at ' + objectsPath);
    fs.mkdirSync(objectsPath);
}

var identityFolderName = '.identity';

// constrution for the werbserver using express combined with socket.io
var webServer = express();
webServer.set('views', 'libraries/webInterface/views');

webServer.engine('handlebars', exphbs({
    defaultLayout: 'main',
    layoutsDir: 'libraries/webInterface/views/layouts',
    partialsDir: 'libraries/webInterface/views/partials'
}));
webServer.set('view engine', 'handlebars');

var http = require('http').createServer(webServer).listen(serverPort, function () {
    cout('webserver + socket.io is listening on port: ' + serverPort);
});
var io = require('socket.io')(http); // Websocket library
var socket = require('socket.io-client'); // websocket client source
var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
var formidable = require('formidable'); // Multiple file upload library
var cheerio = require('cheerio');
var request = require('request');
var sharp = require('sharp'); // Image resizing library

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
 * @desc This is the default constructor for the Reality Object.
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
    // Used internally from the reality editor to indicate if an object should be rendered or not.
    this.visible = false;
    // Used internally from the reality editor to trigger the visibility of naming UI elements.
    this.visibleText = false;
    // Used internally from the reality editor to indicate the editing status.
    this.visibleEditing = false;
    // Intended future use is to keep a memory of the last matrix transformation when interacted.
    // This data can be used for interacting with objects for when they are not visible.
    this.memory = {};
    // Store the frames. These embed content positioned relative to the object
    this.frames = {};
    // which visualization mode it should use right now ("ar" or "screen")
    this.visualization = "ar";

    this.zone = "";

    this.targetSize = null; // taken from target.xml. necessary to make the screens work correctly.

}

function Frame() {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = null;
    // The name for the object used for interfaces.
    this.name = "";
    // which visualization mode it should use right now ("ar" or "screen")
    this.visualization = "ar";
    // position data for the ar visualization mode
    this.ar = {
        // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
        x : 0,
        // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
        y : 0,
        // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
        scale : 1,
        // Unconstrained positioning in 3D space
        matrix : []
    };
    // position data for the screen visualization mode
    this.screen = {
        // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
        x : 0,
        // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
        y : 0,
        // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
        scale : 1
    };
    // Used internally from the reality editor to indicate if an object should be rendered or not.
    this.visible = false;
    // Used internally from the reality editor to trigger the visibility of naming UI elements.
    this.visibleText = false;
    // Used internally from the reality editor to indicate the editing status.
    this.visibleEditing = false;
    // every object holds the developer mode variable. It indicates if an object is editable in the Reality Editor.
    this.developer = true;
    // Stores all the links that emerge from within the object. If a IOPoint has new data,
    // the server looks through the Links to find if the data has influence on other IOPoints or Objects.
    this.links = {};
    // Stores all IOPoints. These points are used to keep the state of an object and process its data.
    this.nodes = {};
    // local or global. If local, node-name is exposed to hardware interface
    this.location = "local";
    // source
    this.src = "editor";

    this.privateData = {};
    this.publicData = {};
}


/**
 * @desc The Link constructor is used every time a new link is stored in the links object.
 * The link does not need to keep its own ID since it is created with the link ID as Obejct name.
 **/

function Link() {
    // The origin object from where the link is sending data from
    this.objectA = null;
    // The origin frame
    this.frameA = null;
    // The origin IOPoint from where the link is taking its data from
    this.nodeA = null;
    // if origin location is a Logic Node then set to Logic Node output location (which is a number between 0 and 3) otherwise null
    this.logicA = null;
    // Defines the type of the link origin. Currently this function is not in use.
    this.namesA = ["", "", ""];
    // The destination object to where the origin object is sending data to.
    // At this point the destination object accepts all incoming data and routs the data according to the link data sent.
    this.objectB = null;
    // destination frame
    this.frameB = null;
    // The destination IOPoint to where the link is sending data from the origin object.
    // objectB and nodeB will be send with each data package.
    this.nodeB = null;
    // if destination location is a Logic Node then set to logic block input location (which is a number between 0 and 3) otherwise null
    this.logicB = null;
    // Defines the type of the link destination. Currently this function is not in use.
    this.namesB = ["", "", ""];
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
    // the ID of the containing object.
    this.objectId = null;
    // the ID of the containing frame.
    this.frameId = null;
    // the actual data of the node
    this.data = new Data();
    // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
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

    this.privateData = {};
    this.publicData = {};

}

/**
 * @desc Constructor used to define every logic node generated in the Object. It does not need to contain its own ID
 * since the object is created within the nodes with the ID as object name.
 **/

function Logic() {
    this.name = "";
    // data for logic blocks. depending on the blockSize which one is used.
    this.data = new Data();
    // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 1;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // if showLastSettingFirst is true then lastSetting is the name of the last block that was moved or set.
    this.lastSetting = false;

    this.lastSettingBlock = "";
    // the iconImage is in png or jpg format and will be stored within the logicBlock folder. A reference is placed here.
    this.iconImage = 'auto';
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
    this.routeBuffer = [0, 0, 0, 0];
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
    this.R2 = {
        objectData :{},
        buffer : {},
        blockString : "",
        send: function (object, frame, node, logic, data) {
            return JSON.stringify({object: object, frame: frame, node: node, logic: logic, data: data})
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.object) return null;
            if (!msgContent.frame) return null;
            if (!msgContent.node) return null;
            if (!msgContent.logic) msgContent.logic = false;
            if (!msgContent.data) return null;

            if (msgContent.object in objects) {
                if (msgContent.frame in objects[msgContent.object].frames) {
                    if (msgContent.node in objects[msgContent.object].frames[msgContent.frame].nodes) {

                        if (msgContent.logic === 0 || msgContent.logic === 1 || msgContent.logic === 2 || msgContent.logic === 3) {
                            this.blockString = "in" + msgContent.logic;
                            if (objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node].blocks) {
                                if (this.blockString in objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node].blocks) {


                                    this.objectData = objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node].blocks[this.blockString];

                                    for (var key in msgContent.data) {
                                        this.objectData.data[0][key] = msgContent.data[key];
                                    }

                                    this.buffer = objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node];

                                    // this needs to be at the beginning;
                                    if (!this.buffer.routeBuffer)
                                        this.buffer.routeBuffer = [0, 0, 0, 0];

                                    this.buffer.routeBuffer[msgContent.logic] = msgContent.data.value;

                                    engine.blockTrigger(msgContent.object, msgContent.frame, msgContent.node, this.blockString, 0, this.objectData.data);
                                   // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
                                }
                            }
                        }

                        else {
                            this.objectData = objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node];

                            for (var key in msgContent.data) {
                                this.objectData.data[key] = msgContent.data[key];
                            }
                            engine.trigger(msgContent.object, msgContent.frame, msgContent.node, this.objectData);
                           // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
                        }
                    }
                }

                return {
                    object: msgContent.object,
                    frame: msgContent.frame,
                    node: msgContent.node,
                    logic: msgContent.logic,
                    data: this.objectData.data
                };
            }
            return null
        }
    };
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

                    var objectData = objects[msgContent.object].frames[msgContent.object].nodes[msgContent.node];

                    for (var key in msgContent.data) {
                        objectData.data[key] = msgContent.data[key];
                    }

                    engine.trigger(msgContent.object, msgContent.object, msgContent.node, objectData);

                    return {object: msgContent.object, node: msgContent.node, data: objectData};
                }

            }

            return null
        }
    };
    this.R0 = {
        send: function (object, node, data) {
            return JSON.stringify({obj: object, pos: node, value: data.value, mode: data.mode})
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.obj) return null;
            if (!msgContent.pos) return null;
            if (!msgContent.value) msgContent.value = 0;
            if (!msgContent.mode) return null;

            if (msgContent.obj in objects) {
                if (msgContent.pos in objects[msgContent.obj].nodes) {

                    var objectData = objects[msgContent.obj].frames[msgContent.object].nodes[msgContent.pos].data;

                    objectData.value = msgContent.value;
                    objectData.mode = msgContent.mode;

                    engine.trigger(msgContent.object, msgContent.object, msgContent.node, objectData);

                    return {object: msgContent.obj, node: msgContent.pos, data: objectData};
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

// Remove eventually hidden files from the Reality Object list.
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

// Remove eventually hidden files from the Reality Object list.
while (blockFolderList[0][0] === ".") {
    blockFolderList.splice(0, 1);
}

// Create an objects list with all IO-Points code.
for (var i = 0; i < blockFolderList.length; i++) {
    blockModules[blockFolderList[i]] = require(blockPath + '/' + blockFolderList[i] + "/index.js");
}


cout("Initialize System: ");
cout("Loading Hardware interfaces");
// set all the initial states for the Hardware Interfaces in order to run with the Server.
hardwareAPI.setup(objects, objectLookup, globalVariables, __dirname, objectsPath, nodeTypeModules, blockModules, function (objectKey, frameKey, nodeKey, data, objects, nodeTypeModules) {

    //these are the calls that come from the objects before they get processed by the object engine.
    // send the saved value before it is processed
    sendMessagetoEditors({
        object: objectKey,
        frame: frameKey,
        node: nodeKey,
        data: data
    });
    engine.trigger(objectKey, frameKey, nodeKey, objects[objectKey].frames[frameKey].nodes[nodeKey]);


}, Node, function (thisAction) {
    actionSender(thisAction);
}, function(objectID) {
    utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
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
    var objectFolderList = fs.readdirSync(objectsPath).filter(function (file) {
        return fs.statSync(objectsPath + '/' + file).isDirectory();
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
        var tempFolderName = utilities.getObjectIdFromTarget(objectFolderList[i], objectsPath);
        cout("TempFolderName: " + tempFolderName);

        if (tempFolderName !== null) {
            // fill objects with objects named by the folders in objects
            objects[tempFolderName] = new Objects();
            objects[tempFolderName].name = objectFolderList[i];

            // create first frame
            // todo this need to be checked in the system
           // objects[tempFolderName].frames[tempFolderName] = new Frame();
            //objects[tempFolderName].frames[tempFolderName].name = objectFolderList[i];

            // add object to object lookup table
            utilities.writeObject(objectLookup, objectFolderList[i], tempFolderName, globalVariables.saveToDisk);

            // try to read a saved previous state of the object
            try {
                objects[tempFolderName] = JSON.parse(fs.readFileSync(objectsPath + '/' + objectFolderList[i] + '/' + identityFolderName + "/object.json", "utf8"));
                objects[tempFolderName].ip = ip.address();

                // this is for transforming old lists to new lists
                if (typeof objects[tempFolderName].objectValues !== "undefined") {
                    objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].objectValues;
                    delete  objects[tempFolderName].objectValues;
                }
                if (typeof objects[tempFolderName].objectLinks !== "undefined") {
                    objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].objectLinks;
                    delete  objects[tempFolderName].objectLinks;
                }


                if (typeof objects[tempFolderName].nodes !== "undefined") {
                    objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].nodes;
                    delete  objects[tempFolderName].nodes;
                }
                if (typeof objects[tempFolderName].links !== "undefined") {
                    objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].links;
                    delete  objects[tempFolderName].links;
                }


                for (var nodeKey in objects[tempFolderName].frames[tempFolderName].nodes) {

                    if (typeof objects[tempFolderName].nodes[nodeKey].item !== "undefined") {
                        var tempItem = objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].item;
                        objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].data = tempItem[0];
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
        if (!objects[key].deactivated) {
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

if (process.pid) {
    console.log('Reality Server server.js process is running with PID ' + process.pid);
}

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
    if (typeof oneTimeOnly === "undefined") {
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
    var zone = "";
    if(objects[thisId].zone) zone = objects[thisId].zone;

    // json string to be send
    var message = new Buffer(JSON.stringify({
        id: thisId,
        ip: thisIp,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs,
        zone: zone
    }));

    if (globalVariables.debug) console.log("UDP broadcasting on port: " + PORT);
    if (globalVariables.debug) console.log("Sending beats... Content: " + JSON.stringify({
        id: thisId,
        ip: thisIp,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs,
        zone: zone
    }));
    cout("UDP broadcasting on port: " + PORT);
    cout("Sending beats... Content: " + JSON.stringify({
        id: thisId,
        ip: thisIp,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs,
        zone: zone
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
                var zone = "";
                if(objects[thisId].zone) zone = objects[thisId].zone;

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone: zone
                }));

// this is an uglly trick to sync each object with being a developer object
//                 console.warn('ugly trick');
                /*
                if (globalVariables.developer) {
                    objects[thisId].developer = true;
                } else {
                    objects[thisId].developer = false;
                }
                */
                //console.log(globalVariables.developer);

                client.send(message, 0, message.length, PORT, HOST, function (err) {
                    if (err) {
                        cout("error in beatSender");
                        console.log(err);
                        //throw err;
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

                var zone = "";
                if(objects[thisId].zone) zone = objects[thisId].zone;

                var message = new Buffer(JSON.stringify({
                    id: thisId,
                    ip: thisIp,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone : zone
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

        if (msgContent.id && msgContent.ip && !checkObjectActivation(msgContent.id) && !(msgContent.id in knownObjects)) {

            if (!knownObjects[msgContent.id]) {
                knownObjects[msgContent.id] = {};
            }

            if (msgContent.vn)
                knownObjects[msgContent.id].version = msgContent.vn;

            if (msgContent.pr)
                knownObjects[msgContent.id].protocol = msgContent.pr;
            else {
                knownObjects[msgContent.id].protocol = "R0";
            }

            if (msgContent.ip)
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
var parseIpSpace = function (ip_string) {

    // Use Regex to get the parts of the ip address
    var ip_parts = ip_regex.exec(ip_string);
    var ip_parts2 = ip_regex2.exec(ip_string);
    // Set ip address if the regex executed successfully
    var thisresult = "";

    if (ip_parts && ip_parts.length > 6) {
        thisresult = [parseInt(ip_parts[1]), parseInt(ip_parts[2]), parseInt(ip_parts[3]), parseInt(ip_parts[4])];
    } else if (ip_parts2 && ip_parts2.length > 3) {
        thisresult = [parseInt(ip_parts2[1]), parseInt(ip_parts2[2]), parseInt(ip_parts2[3]), parseInt(ip_parts2[4])];
    }
    else if (ip_string === "::1") {
        thisresult = [127, 0, 0, 1];
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

        if (!(remoteIP[0] === localIP[0] || remoteIP[0] <= (255 - thisNetmask[0]))) {
            checkThisNetwork = false;
        }

        if (!(remoteIP[1] === localIP[1] || remoteIP[1] <= (255 - thisNetmask[1]))) {
            checkThisNetwork = false;
        }

        if (!(remoteIP[2] === localIP[2] || remoteIP[2] <= (255 - thisNetmask[2]))) {
            checkThisNetwork = false;
        }

        if (!(remoteIP[3] === localIP[3] || remoteIP[3] <= (255 - thisNetmask[3]))) {
            checkThisNetwork = false;
        }

        if (!checkThisNetwork)
            if (remoteIP[0] === 127 && remoteIP[1] === 0 && remoteIP[2] === 0 && remoteIP[3] === 1) {
                checkThisNetwork = true;
            }

        if (checkThisNetwork) {
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
    webServer.use('/frames', express.static(__dirname + '/libraries/frames/'));

    webServer.use('/logicNodeIcon', function (req, res, next) {
        var urlArray = req.originalUrl.split("/");
        console.log(urlArray);
        var objectName = urlArray[2];
        var fileName = objectsPath + '/' + objectName + '/' + identityFolderName + '/logicNodeIcons/' + urlArray[3];
        if (!fs.existsSync(fileName)) {
            res.sendFile(__dirname + '/libraries/emptyLogicIcon.png'); // default to blank image if not custom saved yet
            return;
        }
        res.sendFile(fileName);
    });

    webServer.use("/obj", function (req, res, next) {

        var urlArray = req.originalUrl.split("/");
        urlArray.splice(0, 1);
        urlArray.splice(0, 1);
        if(urlArray[1] === "frames") {
            urlArray.splice(1, 1);
        }

        if((urlArray[urlArray.length-1] === "target.dat" || urlArray[urlArray.length-1] === "target.jpg"|| urlArray[urlArray.length-1] === "target.xml")
            && urlArray[urlArray.length-2] === "target"){
            urlArray[urlArray.length-2] = identityFolderName+"/target";
        }

        if ((urlArray[urlArray.length-1] === "memory.jpg" || urlArray[urlArray.length-1] === "memoryThumbnail.jpg")
            && urlArray[urlArray.length-2] === "memory") {
            urlArray[urlArray.length-2] = identityFolderName+"/memory";
        }

        var newUrl = "";
        for(var i = 0; i< urlArray.length; i++){
                newUrl += "/"+ urlArray[i];
        }

        if(newUrl.slice(-1) === "/"){
            newUrl += "index.html";
            urlArray.push("index.html");
        }
        console.log(newUrl);

        if ((req.method === "GET") && (req.url.slice(-1) === "/" || urlArray[urlArray.length-1].match(/\.html?$/))) {
            var fileName = objectsPath + newUrl;

            if (urlArray[urlArray.length-1] !== "index.html" && urlArray[urlArray.length-1] !== "index.htm") {
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

            var level = "../";
            for(var i = 0; i < urlArray.length; i++){
                level += "../";
            }
            var loadedHtml = cheerio.load(html);
            var scriptNode = '<script src="'+level+'objectDefaultFiles/object.js"></script>';

            var objectKey = utilities.readObject(objectLookup,urlArray[0]);
            var frameKey = utilities.readObject(objectLookup,urlArray[0])+urlArray[1];

             scriptNode += '<script> realityObject.object = "'+objectKey+'";</script>';
             scriptNode += '<script> realityObject.frame = "'+frameKey+'";</script>';
            loadedHtml('head').prepend(scriptNode);
            res.send(loadedHtml.html());
        }
        else if ((req.method === "GET") && (req.url.slice(-1) === "/" || urlArray[urlArray.length-1].match(/\.json?$/))) {

            var fileName = objectsPath + req.url + identityFolderName + "/object.json";

            if (!fs.existsSync(fileName)) {
                next();
                return;
            }

            var json = JSON.parse(fs.readFileSync(fileName, "utf8"));

            // todo check if the data is still filtered with the new frames system
            for (var thisKey in json.logic) {
                for (var thisKey2 in json.nodes[thisKey].blocks) {
                    delete json.nodes[thisKey].blocks[thisKey2].privateData;
                }
            }
            res.json(json);
        }
        else {
           console.log("end: "+newUrl);
            res.sendFile(newUrl, {root: objectsPath});
        }
    });

    if (globalVariables.developer === true) {
        webServer.use("/libraries", express.static(__dirname + '/libraries/webInterface/'));
        webServer.use("/libraries/monaco-editor/", express.static(__dirname + '/node_modules/monaco-editor/'));
    }

    // use the cors cross origin REST model
    webServer.use(cors());
    // allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
    webServer.options('*', cors());


    // Utility functions for getting object, frame, and node in a safe way that reports errors for network requests

    /**
     * @param objectKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object)
     */
    function getObject(objectKey, callback) {

        if (!objects.hasOwnProperty(objectKey)) {
            callback({failure: true, error: 'Object ' + objectKey + ' not found'});
            return;
        }

        var object = objects[objectKey];

        callback(null, object);

    }

    /**
     * @param objectKey
     * @param frameKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object, frame)
     */
    function getFrame(objectKey, frameKey, callback) {

        getObject(objectKey, function(error, object) {
            if (error) {
                callback(error);
                return;
            }

            if (!object.frames.hasOwnProperty(frameKey)) {
                callback({failure: true, error: 'Frame ' + frameKey + ' not found'});
                return;
            }

            var frame = object.frames[frameKey];

            callback(null, object, frame);

        });

    }

    /**
     * @param objectKey
     * @param frameKey
     * @param nodeKey
     * @param {Function} callback - (error: {failure: bool, error: string}, object, frame)
     */
    function getNode(objectKey, frameKey, nodeKey, callback) {

        getFrame(objectKey, frameKey, function(error, object, frame) {
            if (error) {
                callback(error);
                return;
            }

            if (!frame.nodes.hasOwnProperty(nodeKey)) {
                callback({failure: true, error: 'Node ' + nodeKey + ' not found'});
                return;
            }

            var node = frame.nodes[nodeKey];

            callback(null, object, frame, node);

        });

    }

    /**
     * Returns node if a nodeKey is provided, otherwise the frame
     * @param objectKey
     * @param frameKey
     * @param nodeKey
     * @param callback
     */
    function getFrameOrNode(objectKey, frameKey, nodeKey, callback) {

        getFrame(objectKey, frameKey, function(error, object, frame) {
            if (error) {
                callback(error);
                return;
            }

            var node = null;

            if (nodeKey && nodeKey !== 'null') {
                if (!frame.nodes.hasOwnProperty(nodeKey)) {
                    callback({failure: true, error: 'Node ' + nodeKey + ' not found'});
                    return;
                }
                node = frame.nodes[nodeKey];
            }

            callback(null, object, frame, node);
        });

    }


    /// logic node handling


    /**
     * Logic Links
     **/

    // support for frames
    webServer.delete('/object/*/frame/*/node/*/link/*/editor/*/deleteBlockLink/', function (req, res) {
        res.send(deleteLogicLink(req.params[0], req.params[1], req.params[2], req.params[3], req.params[4]));
    });


    // delete a logic link. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/logic/*/*/link/*/lastEditor/*/', function (req, res) {
        res.send(deleteLogicLink(req.params[0], req.params[0], req.params[1], req.params[2], req.params[3]));
    });

    function deleteLogicLink(objectID, frameID, nodeID, linkID, lastEditor) {

        var fullEntry = objects[objectID].frames[frameID].nodes[nodeID].links[linkID];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[objectID].frames[frameID].nodes[nodeID].links[linkID];
        cout("deleted link: " + linkID);
        actionSender({reloadNode: {object: objectID, frame: frameID, node: nodeID}, lastEditor: lastEditor});
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        return "deleted: " + linkID + " in logic " + nodeID + " in frame: " + frameID + " from object: " + objectID;
    }


    // adding a new logic link to an object. *1 is the object *2 is the logic *3 is the link id
    //
    // ****************************************************************************************************************

    webServer.post('/logic/*/*/link/*/', function (req, res) {
        res.send(addLogicLink(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
    });
    // support for frames
    webServer.post('/object/*/frame/*/node/*/link/*/addBlockLink/', function (req, res) {
        res.send(addLogicLink(req.params[0], req.params[1], req.params[2], req.params[3], req.body));
    });

    function addLogicLink(objectID, frameID, nodeID, linkID, body) {

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(objectID)) {

            objects[objectID].frames[frameID].nodes[nodeID].links[linkID] = body;

            var thisObject = objects[objectID].frames[frameID].nodes[nodeID].links[linkID];

            thisObject.loop = false;

            // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
            // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
            if (thisObject.nodeA === thisObject.nodeB && thisObject.logicA === thisObject.logicB) {
                thisObject.loop = true;
            }

            if (!thisObject.loop) {
                // call an action that asks all devices to reload their links, once the links are changed.
                actionSender({
                    reloadNode: {object: objectID, frame: frameID, node: nodeID},
                    lastEditor: body.lastEditor
                });
                updateStatus = "added";
                cout("added link: " + linkID);
                // check if there are new connections associated with the new link.
                // write the object state to the permanent storage.
                utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            } else {
                updateStatus = "found endless Loop";
            }
            return updateStatus;
        }
    }

    /**
     * Logic Blocks
     **/

    // adding a new block to an object. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.post('/object/:objectID/frame/:frameID/node/:nodeID/block/:blockID/addBlock/', function (req, res) {
        res.send(addNewBlock(req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.body));
    });

    webServer.post('/logic/*/*/block/*/', function (req, res) {
        res.send(addNewBlock(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
    });

    function addNewBlock(objectID, frameID, nodeID, blockID, body) {

        console.log("where is this object");

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(objectID)) {

            var thisBlocks = objects[objectID].frames[frameID].nodes[nodeID].blocks;

            thisBlocks[blockID] = new Block();


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

            thisBlocks[blockID] = body;

            // todo this can be removed once the system runs smoothly
            if (typeof thisBlocks[blockID].type === "undefined") {
                thisBlocks[blockID].type = thisBlocks[blockID].name;
            }

            // for (var k in  objects[objectID].frames[frameID].nodes[nodeID].blocks) {
            //     console.log("k");
            // }

            // call an action that asks all devices to reload their links, once the links are changed.
            actionSender({reloadNode: {object: objectID, frame: frameID, node: nodeID}, lastEditor: body.lastEditor});
            updateStatus = "added";
            cout("added block: " + blockID);
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            return updateStatus;
        }
    }

    // delete a block from the logic. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/object/:objectID/frame/:frameID/node/:nodeID/block/:blockID/editor/:lastEditor/deleteBlock/', function (req, res) {
        res.send(deleteBlock(req.params.objectID, req.params.frameID, req.params.nodeID, req.params.blockID, req.params.lastEditor));
    });
    // webServer.delete('/logic/*/*/*/block/*/lastEditor/*/', function (req, res) {
    //     res.send(deleteBlock(req.params[0], req.params[1], req.params[2], req.params[3], req.params[4]));
    // });

    function deleteBlock(objectID, frameID, nodeID, blockID, lastEditor) {
        var thisLinkId = blockID;
        console.log(objectID, frameID, nodeID, blockID, lastEditor);
        console.log(objects[objectID].frames[frameID]);
        var fullEntry = objects[objectID].frames[frameID].nodes[nodeID].blocks[thisLinkId];
        var destinationIp = knownObjects[fullEntry.objectB];

        delete objects[objectID].frames[frameID].nodes[nodeID].blocks[thisLinkId];
        cout("deleted block: " + thisLinkId);

        var thisLinks = objects[objectID].frames[frameID].nodes[nodeID].links;
        // Make sure that no links are connected to deleted objects
        for (var linkCheckerKey in thisLinks) {
            if (thisLinks[linkCheckerKey].nodeA === thisLinkId || thisLinks[linkCheckerKey].nodeB === thisLinkId) {
                delete objects[objectID].frames[frameID].nodes[nodeID].links[linkCheckerKey];
            }
        }

        actionSender({reloadNode: {object: objectID, frame: nodeID, node: nodeID}, lastEditor: lastEditor});
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        return "deleted: " + thisLinkId + " in blocks for object: " + objectID;
    }


    webServer.post('/logic/*/*/blockPosition/*/', function (req, res) {
        res.send(postBlockPosition(req.params[0], req.params[0], req.params[1], req.params[2], req.body));
    });
    webServer.post('/object/*/frame/*/node/*/block/*/blockPosition/', function (req, res) {
        res.send(postBlockPosition(req.params[0], req.params[1], req.params[2], req.params[3], req.body));
    });

    function postBlockPosition(objectID, frameID, nodeID, blockID, body) {

        var updateStatus = "nothing happened";

        cout("changing Position for :" + objectID + " : " + nodeID + " : " + blockID);

        var tempObject = objects[objectID].frames[frameID].nodes[nodeID].blocks[blockID];

        // check that the numbers are valid numbers..
        if (typeof body.x === "number" && typeof body.y === "number") {

            tempObject.x = body.x;
            tempObject.y = body.y;

            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
            actionSender({reloadNode: {object: objectID, frame: frameID, node: nodeID}, lastEditor: body.lastEditor});
            updateStatus = "ok";
        }

        return updateStatus;
    }


    /**
     * Logic Nodes
     **/

    // adding a new logic node block to an object. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.post('/logic/*/*/node/', function (req, res) {
        res.send(addLogicNode(req.params[0], req.params[0], req.params[1], req.body));
    });

    webServer.post('/object/*/frame/*/node/*/addLogicNode/', function (req, res) {
        res.send(addLogicNode(req.params[0], req.params[1], req.params[2], req.body));
    });

    function addLogicNode(objectID, frameID, nodeID, body) {
        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(objectID)) {

            objects[objectID].frames[frameID].nodes[nodeID] = body;

            objects[objectID].frames[frameID].nodes[nodeID].blocks["in0"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["in1"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["in2"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["in3"] = new EdgeBlock();

            objects[objectID].frames[frameID].nodes[nodeID].blocks["out0"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["out1"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["out2"] = new EdgeBlock();
            objects[objectID].frames[frameID].nodes[nodeID].blocks["out3"] = new EdgeBlock();
            console.log("added tons of nodes ----------");

            objects[objectID].frames[frameID].nodes[nodeID].type = "logic";

            // call an action that asks all devices to reload their links, once the links are changed.
            updateStatus = "added";
            cout("added logic node: " + nodeID);
            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            //	console.log(objects[req.params[0]].nodes[req.params[1]]);
            actionSender({reloadNode: {object: objectID, frame: frameID, node: nodeID}, lastEditor: body.lastEditor});

        }
        return updateStatus;
    }

    // delete a logic node from the logic. *1 is the object *2 is the logic *3 is the link id
    // ****************************************************************************************************************
    webServer.delete('/logic/*/*/node/lastEditor/*/', function (req, res) {
        res.send(deleteLogicNode(req.params[0], req.params[0], req.params[1], req.params[2]));
    });

    webServer.delete('/object/*/frame/*/node/*/editor/*/deleteLogicNode', function (req, res) {
        res.send(deleteLogicNode(req.params[0], req.params[1], req.params[2], req.params[3]));
    });

    function deleteLogicNode(objectID, frameID, nodeID, lastEditor) {
        var fullEntry = objects[objectID].frames[frameID].nodes[nodeID];

        delete objects[objectID].frames[frameID].nodes[nodeID];
        cout("deleted node: " + nodeID);


        //todo check all links as well in object

        // Make sure that no links are connected to deleted objects
        /*  for (var subCheckerKey in  objects[req.params[0]].links) {

              if (objects[req.params[0]].links[subCheckerKey].nodeA === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectA === req.params[0]) {
                  delete objects[req.params[0]].links[subCheckerKey];
              }
              if (objects[req.params[0]].links[subCheckerKey].nodeB === req.params[1] && objects[req.params[0]].links[subCheckerKey].objectB === req.params[0]) {
                  delete objects[req.params[0]].links[subCheckerKey];
              }
          }*/

        console.log("deleted Object");
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
        actionSender({reloadNode: {object: objectID, frame: frameID, node: nodeID}, lastEditor: lastEditor});

        return "deleted: " + nodeID + " in frame: " + frameID + " of object: " + objectID;
    }


    webServer.post('/logic/*/*/nodeSize/', function (req, res) {
        changeNodeSize(req.params[0], req.params[0], req.params[1], req.body, function(statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });

    webServer.post('/object/*/frame/*/node/*/nodeSize/', function (req, res) {
        changeNodeSize(req.params[0], req.params[1], req.params[2], req.body, function(statusCode, responseContents) {
            res.status(statusCode).send(responseContents);
        });
    });

    function changeNodeSize(objectID, frameID, nodeID, body, callback) {
        // cout("post 2");
        var updateStatus = "nothing happened";

        cout("changing Size for :" + objectID + " : " + nodeID);

        getNode(objectID, frameID, nodeID, function(error, object, frame, node) {
            if (error) {
                callback(404, error);
                return;
            }

            var tempObject = node;

            // check that the numbers are valid numbers..
            if (typeof body.x === "number" && typeof body.y === "number" && typeof body.scale === "number") {

                // if the object is equal the datapoint id, the item is actually the object it self.

                tempObject.x = body.x;
                tempObject.y = body.y;
                tempObject.scale = body.scale;
                // console.log(req.body);
                // ask the devices to reload the objects
            }

            if (typeof body.matrix === "object") {

                tempObject.matrix = body.matrix;
            }

            if ((typeof body.x === "number" && typeof body.y === "number" && typeof body.scale === "number") || (typeof body.matrix === "object" )) {
                utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

                //  actionSender({reloadObject: {object: thisObject}});
                actionSender({reloadObject: {object: objectID, frame: frameID, node: nodeID}, lastEditor: body.lastEditor});
                updateStatus = "ok";
            }

            callback(200, updateStatus);
        });

    }


    // sends json object for a specific reality object. * is the object name
    // ths is the most relevant for
    // ****************************************************************************************************************
    webServer.get('/availableLogicBlocks/', function (req, res) {
        console.log("get available logic blocks");
        res.json(getLogicBlockList())
    });

    function getLogicBlockList() {

        console.log("list");

        //  cout("get 7");
        var blockList = {};
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
        return blockList;
    }

    // uploads a new name for a logic node (or could be used for any type of node)
    // ****************************************************************************************************************
    webServer.post('/object/:objectID/frame/:frameID/node/:nodeID/rename/', function (req, res) {

        var objectID = req.params.objectID;
        var frameID = req.params.frameID;
        var nodeID = req.params.nodeID;

        console.log('received name for', objectID, frameID, nodeID);

        getNode(objectID, frameID, nodeID, function(error, object, frame, node) {
            if (error) {
                res.status(404);
                res.json(error).end();
                return;
            }

            node.name = req.body.nodeName;

            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            res.status(200);
            res.json({success: true}).end();
        });

    });

    // uploads a new iconImage for a logic block
    // ****************************************************************************************************************
    webServer.post('/object/:objectID/frame/:frameID/node/:nodeID/uploadIconImage', function(req, res) {

        var objectID = req.params.objectID;
        var frameID = req.params.frameID;
        var nodeID = req.params.nodeID;

        console.log('received icon image for', objectID, frameID, nodeID);

        getNode(objectID, frameID, nodeID, function(error, object, frame, node) {
            if (error) {
                res.status(404);
                res.json(error).end();
                return;
            }

            var iconDir = objectsPath + '/' + object.name + '/' + identityFolderName + '/logicNodeIcons';
            if (!fs.existsSync(iconDir)) {
                fs.mkdirSync(iconDir);
            }

            var form = new formidable.IncomingForm({
                uploadDir: iconDir,
                keepExtensions: true,
                accept: 'image/jpeg'
            });

            console.log('created form');

            form.on('error', function (err) {
                res.status(500);
                res.send(err);
                throw err;
            });

            var rawFilepath = form.uploadDir + '/' + nodeID + '_fullSize.jpg';

            if (fs.existsSync(rawFilepath)) {
                console.log('deleted old raw file');
                fs.unlinkSync(rawFilepath);
            }

            form.on('fileBegin', function (name, file) {
                console.log('fileBegin loading', name, file);
                file.path = rawFilepath;
            });

            console.log('about to parse');

            form.parse(req, function (err, fields) {

                console.log('successfully created icon image', err, fields);

                var resizedFilepath = form.uploadDir + '/' + nodeID + '.jpg';
                console.log('attempting to write file to ' + resizedFilepath);

                if (fs.existsSync(resizedFilepath)) {
                    console.log('deleted old resized file');
                    fs.unlinkSync(resizedFilepath);
                }

                // copied fullsize file into resized image file as backup, in case resize operation fails
                fs.copyFileSync(rawFilepath, resizedFilepath);

                sharp(rawFilepath).resize(200).toFile(resizedFilepath, function(err, info) {
                    if (!err) {
                        console.log('done resizing', info);

                        if (node) {
                            node.iconImage = 'custom'; //'http://' + object.ip + ':' + serverPort + '/logicNodeIcon/' + object.name + '/' + nodeID + '.jpg';
                            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
                            actionSender({loadLogicIcon: {object: objectID, frame: frameID, node: nodeID, ip: object.ip, iconImage: node.iconImage}}); // TODO: decide whether to send filepath directly or just tell it to reload the logic node from the server... sending directly is faster, fewer side effects
                        }

                        res.status(200);
                        res.json({success: true}).end();

                    } else {
                        console.log('error resizing', err);
                        res.status(500);
                        res.send(err);
                        throw err;
                    }
                });

            });

            console.log('parse called');

        });


    });

    /**
     * Normal Links
     **/

    // delete a link. *1 is the object *2 is the link id
    // ****************************************************************************************************************
    webServer.delete('/object/*/link/*/lastEditor/*/', function (req, res) {
        res.send(deleteLink(req.params[0], req.params[0], req.params[1], req.params[2]));
    });

    webServer.delete('/object/*/frame/*/link/*/editor/*/deleteLink', function (req, res) {
        res.send(deleteLink(req.params[0], req.params[1], req.params[2], req.params[3]));
    });

    function getLinkData(fullEntry, wasAdded) {
        var linkAddedData = null;

        if (fullEntry) {
            console.log(fullEntry);

            var linkObjectA = fullEntry["objectA"];
            var linkObjectB = fullEntry["objectB"];
            var linkFrameA = fullEntry["frameA"];
            var linkFrameB = fullEntry["frameB"];
            var linkNodeA = fullEntry["nodeA"];
            var linkNodeB = fullEntry["nodeB"];
            var objectAName = fullEntry["namesA"][0];
            var objectBName = fullEntry["namesB"][0];
            var frameAName = fullEntry["namesA"][1];
            var frameBName = fullEntry["namesB"][1];
            var nodeAName = fullEntry["namesA"][2]; // TODO: implement a single, safe way to get the object/frame/node (like in the editor) and return null if not found (instead of crashing)
            var nodeBName = fullEntry["namesB"][2];

            linkAddedData = {
                added: wasAdded,
                idObjectA: linkObjectA,
                idObjectB: linkObjectB,
                idFrameA: linkFrameA,
                idFrameB: linkFrameB,
                idNodeA: linkNodeA,
                idNodeB: linkNodeB,
                nameObjectA: objectAName,
                nameObjectB: objectBName,
                nameFrameA: frameAName,
                nameFrameB: frameBName,
                nameNodeA: nodeAName,
                nameNodeB: nodeBName
            };

        } else {
            console.log("thisObject does not exist");
        }
        return linkAddedData;
    }

    function deleteLink(objectKey, frameKey, linkKey, editorID){

        var fullEntry = objects[objectKey].frames[frameKey].links[linkKey]; // TODO: retrieve this in a safe way (everywhere)
        var destinationIp = knownObjects[fullEntry.objectB];

        /////
        // notify subscribed interfaces that a new link was DELETED // TODO: make sure this is the right place for this
        var linkAddedData = getLinkData(fullEntry, false);
        if (linkAddedData) {
            hardwareAPI.connectCall(linkAddedData.idObjectA, linkAddedData.idFrameA, linkAddedData.idNodeA, linkAddedData);
            hardwareAPI.connectCall(linkAddedData.idObjectB, linkAddedData.idFrameB, linkAddedData.idNodeB, linkAddedData);
        }
        /////

        delete objects[objectKey].frames[frameKey].links[linkKey];

        cout("deleted link: " + linkKey);
        // cout(objects[req.params[0]].links);
        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
        actionSender({reloadLink: {object: objectKey, frame: frameKey}, lastEditor: editorID});

        var checkIfIpIsUsed = false;
        for (var objectCheckerKey in objects) {
            for (var frameCheckerKey in objects[objectCheckerKey].frames) {
                for (var linkCheckerKey in objects[objectCheckerKey].frames[frameCheckerKey].links) {
                    if (objects[objectCheckerKey].frames[frameCheckerKey].links[linkCheckerKey].objectB === fullEntry.objectB) {
                        checkIfIpIsUsed = true;
                    }
                }
            }
        }

        if (fullEntry.objectB !== fullEntry.objectA && !checkIfIpIsUsed) {
            // socketArray.splice(destinationIp, 1);
            delete socketArray[destinationIp];
        }
        return "deleted: " + linkKey + " in object: " + objectKey + " frame: " + frameKey;
    }

    // todo links for programms as well
    // adding a new link to an object. *1 is the object *2 is the link id
    // ****************************************************************************************************************

    webServer.post('/object/:objectID/frame/:frameID/link/:linkID/addLink/', function (req, res) {
        console.log("routed by 2");
        res.status(200).send(newLink(req.params.objectID, req.params.frameID, req.params.linkID, req.body));
    });

    webServer.post('/object/*/link/*/', function (req, res) {
        console.log("routed by 1");
        res.status(200).send(newLink(req.params[0], req.params[0], req.params[1], req.body));
    });

    function newLink(objectID, frameID, linkID, body) {
        console.log("new link");
        console.log("object: " + objectID);
        console.log("frame: " + frameID);
        console.log("link: " + linkID);

        var updateStatus = "nothing happened";

        for (var objectKey in objects) {
            console.log(objectKey);
        }

        if (objects.hasOwnProperty(objectID)) {

            var thisObject = objects[objectID];
            if (thisObject && thisObject.frames.hasOwnProperty(frameID)) {
                var thisFrame = thisObject.frames[frameID];
                if (thisFrame) {

                    console.log("found frame to add link to");

                    // todo the first link in a chain should carry a UUID that propagates through the entire chain each time a change is done to the chain.
                    // todo endless loops should be checked by the time of creation of a new loop and not in the Engine
                    body.loop = (body.objectA === body.objectB &&
                                 body.frameA === body.frameB &&
                                 body.nodeA === body.nodeB);

                    thisFrame.links[linkID] = body;

                    if (!body.loop) {
                        updateStatus = "added";
                        cout("added link: " + linkID);
                        // check if there are new connections associated with the new link.
                        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
                        // write the object state to the permanent storage.
                        socketUpdater();

                        /////
                        // notify subscribed interfaces that a new link was DELETED // TODO: make sure this is the right place for this
                        var fullEntry = objects[objectID].frames[frameID].links[linkID]; // TODO: retrieve this in a safe way (everywhere)
                        var linkAddedData = getLinkData(fullEntry, true);
                        if (linkAddedData) {
                            hardwareAPI.connectCall(linkAddedData.idObjectA, linkAddedData.idFrameA, linkAddedData.idNodeA, linkAddedData);
                            hardwareAPI.connectCall(linkAddedData.idObjectB, linkAddedData.idFrameB, linkAddedData.idNodeB, linkAddedData);
                        }
                        /////

                        // call an action that asks all devices to reload their links, once the links are changed.
                        actionSender({reloadLink: {object: objectID, frame:frameID}, lastEditor: body.lastEditor});

                    } else {
                        updateStatus = "found endless Loop";
                    }

                }
            }
        }
        return updateStatus;
    }

    // todo change the rest of the code following this methods
    // Add a new node to an object linked to a frame
    webServer.post('/object/:objectKey/frame/:frameKey/node/:nodeKey/addNode', function (req, res) {
        addNodeToFrame(req.params.objectKey, req.params.frameKey, req.params.nodeKey, req, res);
    });

    webServer.post('/object/:objectKey/node/:nodeKey/', function (req, res) {
        addNodeToFrame(req.params.objectKey, req.params.objectKey, req.params.nodeKey, req, res);
    });

    function addNodeToFrame(objectKey, frameKey, nodeKey, req, res){

        var node = req.body;

        if (!objects.hasOwnProperty(objectKey)) {
            res.status(404);
            res.json({failure: true, error: 'Object ' + objectKey + ' not found'}).end();
            return;
        }

        if (!objects[objectKey].frames.hasOwnProperty(frameKey)) {
            res.status(404);
            res.json({failure: true, error: 'Object ' + objectKey + ' frame '+frameKey+' not found'}).end();
            return;
        }

        var obj = objects[objectKey].frames[frameKey];
        obj.nodes[nodeKey] = node;
        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
        actionSender({reloadObject: {object: objectKey}, lastEditor: req.body.lastEditor});

        res.json({success: 'true'}).end();
    };

    // adding a new lock to an object. *1 is the object *2 is the datapoint id
    // ****************************************************************************************************************

    webServer.post('/object/*/nodeLock/*/', function (req, res) {
        res.send(addNodeLock(req.params[0],  req.params[0],  req.params[1],  req.body));
    });

    webServer.post('/object/*/frame/*/node/*/addLock/', function (req, res) {
        res.send(addNodeLock(req.params[0],  req.params[1],  req.params[2],  req.body));
    });

    function addNodeLock (object, frame, node, body) {

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(object)) {

            var previousLockPassword = objects[object].frames[frame].nodes[node].lockPassword;
            var newLockPassword = body['lockPassword'];
            var previousLockType = objects[object].frames[frame].nodes[node].lockType;
            var newLockType = body['lockType'];

            var isLockActionAllowed = (!previousLockPassword && !!newLockPassword) ||
                (!!newLockPassword && previousLockPassword === newLockPassword && newLockType !== previousLockType);

            if (isLockActionAllowed) {
                objects[object].frames[frame].nodes[node].lockPassword = newLockPassword;
                objects[object].frames[frame].nodes[node].lockType = newLockType;

                utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);

                actionSender({reloadNode: {object: object, frame: frame, node: node}});

                updateStatus = "added";

            } else {
                if (previousLockPassword === newLockPassword) {
                    updateStatus = "already locked by this user";
                } else {
                    updateStatus = "not authorized to add";
                }
            }
        }

        return updateStatus;
    };

    // delete a lock. *1 is the object *2 is the datapoint id *3 is the encrypted user id
    // ****************************************************************************************************************
    webServer.delete('/object/*/frame/*/node/*/password/*/deleteLock', function (req, res) {
        res.send(deleteNodeLock(req.params[0],  req.params[1],  req.params[2],  req.params[3]));
    });

    webServer.delete('/object/*/nodeLock/*/password/*/', function (req, res) {
        res.send(deleteNodeLock(req.params[0],  req.params[0],  req.params[1],  req.params[2]));
    });

    function deleteNodeLock(object, frame, node, password){

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(object)) {

            var previousLockPassword = objects[object].frames[frame].nodes[node].lockPassword;
            var newLockPassword = password;

            if (newLockPassword === previousLockPassword || newLockPassword === "DEBUG") { // TODO: remove DEBUG mode
                objects[object].frames[frame].nodes[node].lockPassword = null;
                objects[object].frames[frame].nodes[node].lockType = null;
                utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);

                actionSender({reloadNode: {object: object, frame:frame, node: node}});

                updateStatus = "deleted";
            } else {
                updateStatus = "not authorized to delete"
            }
        }
        return updateStatus;
    };

    // adding a new lock to an object link. *1 is the object *2 is the link id
    // ****************************************************************************************************************
    webServer.post('/object/*/linkLock/*/', function (req, res) {
        res.send(addLinkLock(req.params[0],  req.params[0],  req.params[1], req.body));
    });

    webServer.post('/object/*/frame/*/link/*/addLock', function (req, res) {
        res.send(addLinkLock(req.params[0],  req.params[1],  req.params[2], req.body));
    });

    function addLinkLock(object, frame, link, body){
        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(object)) {

            if (!objects[object].frames.hasOwnProperty(frames)){
                return "frame not found"
            }

            var previousLockPassword = objects[object].frames[frame].links[link].lockPassword;
            var newLockPassword = body['lockPassword'];
            var previousLockType = objects[object].frames[frame].links[link].lockType;
            var newLockType = body['lockType'];

            var isLockActionAllowed = (!previousLockPassword && !!newLockPassword) ||
                (!!newLockPassword && previousLockPassword === newLockPassword && newLockType !== previousLockType);

            if (isLockActionAllowed) {
                objects[object].frames[frame].links[link].lockPassword = newLockPassword;
                objects[object].frames[frame].links[link].lockType = newLockType;
                utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);

                actionSender({reloadLink: {object: object}});

                updateStatus = "added";

            } else {
                if (previousLockPassword === newLockPassword) {
                    updateStatus = "already locked by this user";
                } else {
                    updateStatus = "not authorized to add";
                }
            }
        }
        return updateStatus;
    };

    // delete a lock from a link. *1 is the object *2 is the link id *3 is the encrypted user id
    // ****************************************************************************************************************
    webServer.delete('/object/*/linkLock/*/password/*/', function (req, res) {
        res.send(deleteLinkLock(req.params[0],req.params[0],req.params[1],req.params[2]));
    });

    webServer.delete('/object/*/frame/*/link/*/password/*/deleteLock', function (req, res) {
        res.send(deleteLinkLock(req.params[0],req.params[1],req.params[2],req.params[3]));
    });

    function deleteLinkLock(object, frame, node, password){

        var updateStatus = "nothing happened";

        if (objects.hasOwnProperty(object)) {
            var previousLockPassword = objects[object].frames[frame].links[node].lockPassword;
            var newLockPassword = password;

            if (newLockPassword === previousLockPassword || newLockPassword === "DEBUG") { // TODO: remove DEBUG mode
                objects[object].frames[frame].links[node].lockPassword = null;
                objects[object].frames[frame].links[node].lockType = null;
                utilities.writeObjectToFile(objects, object, objectsPath, globalVariables.saveToDisk);

                actionSender({reloadLink: {object: object}});

                updateStatus = "deleted";
            } else {
                updateStatus = "not authorized to delete"
            }
        }

      return updateStatus;
    };


    // Handler of new memory uploads
    webServer.post('/object/:id/memory', function (req, res) {
        memoryUpload(req.params.id, /*req.params.id,*/ req, res);
    });

    // webServer.post('/object/:id/frame/:frame/memory', function (req, res) {
    //     memoryUpload(req.params.id, req.params.frame, req, res);
    // });

    function memoryUpload(objectID, /*frame,*/ req, res){

        if (!objects.hasOwnProperty(objectID)) {
            res.status(404);
            res.json({failure: true, error: 'Object ' + objectID + ' not found'}).end();
            return;
        }

        // if (!objects[objectID].frames.hasOwnProperty(frame)) {
        //     res.status(404);
        //     res.json({failure: true, error: 'Object ' + objId + ' frame '+frame+' not found'}).end();
        //     return;
        // }

        var obj = objects[objectID];//.frames[frame];

        var memoryDir = objectsPath + '/' + obj.name + '/' + identityFolderName + '/memory/';
        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir);
        }

        var form = new formidable.IncomingForm({
            uploadDir: memoryDir,
            keepExtensions: true,
            accept: 'image/jpeg'
        });

        form.on('error', function (err) {
            res.status(500);
            res.send(err);
            throw err;
        });

        form.on('fileBegin', function (name, file) {
            if (name === 'memoryThumbnailImage') {
                file.path = form.uploadDir + '/memoryThumbnail.jpg';
            } else {
                file.path = form.uploadDir + '/memory.jpg';
            }
        });

        form.parse(req, function (err, fields) {
            if (obj) {
                obj.memory = JSON.parse(fields.memoryInfo);
                utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
                actionSender({loadMemory: {object: objectID, ip: obj.ip}});
            }

            console.log('successfully created memory');

            res.status(200);
            res.json({success: true}).end();
        });
    }

    // Create a frame for an object
    webServer.post('/object/*/frames/', function (req, res) {
        var frameId = 'frame' + utilities.uuidTime();
        addFrameToObject(req.params[0], frameId, req.body, res);

    });

    webServer.post('/object/*/addFrame/', function(req, res) {
        var frame = req.body;
        addFrameToObject(req.params[0], frame.uuid, frame, res);
    });

    function addFrameToObject(objectKey, frameKey, frame, res) {

        console.log('added new frame: ' + frameKey);

        if (!objects.hasOwnProperty(objectKey)) {
            res.status(404).json({ failure: true, error: 'Object ' + objectKey + ' not found' }).end();
            return;
        }

        var object = objects[objectKey];

        if (!frame.src) {
            res.status(500).json({ failure: true, error: 'frame must have src' }).end();
            return;
        }

        if (!object.frames) {
            object.frames = {};
        }

        utilities.createFrameFolder(object.name, frame.name, __dirname, objectsPath, globalVariables.debug, frame.location);

        var newFrame = new Frame();
        newFrame.objectId = frame.objectId;
        newFrame.uuid = frameKey;
        newFrame.name = frame.name;
        newFrame.visualization = frame.visualization;
        newFrame.ar = frame.ar;
        newFrame.screen = frame.screen;
        newFrame.visible = frame.visible;
        newFrame.visibleText = frame.visibleText;
        newFrame.visibleEditing = frame.visibleEditing;
        newFrame.developer = frame.developer;
        newFrame.links = frame.links;
        newFrame.nodes = frame.nodes;
        newFrame.location = frame.location;
        newFrame.src = frame.src;
        newFrame.width = frame.width;
        newFrame.height = frame.height;
        object.frames[frameKey] = newFrame;

        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);

        actionSender({reloadObject: {object: objectKey}, lastEditor: frame.lastEditor});
        hardwareAPI.runFrameAddedCallbacks(objectKey, newFrame);

        res.json({success: true, frameId: frameKey}).end();
    }

    webServer.post('/object/:objectID/frames/:frameID/copyFrame/', function(req, res) {
        var objectID = req.params.objectID;
        var frameID = req.params.frameID;
        console.log('making a copy of frame: ' + frameID);

        getFrame(objectID, frameID, function(error, object, frame) {
            if (error) {
                res.status(404).json(error).end();
                return;
            }

            if (frame.location !== 'global') {
                console.warn('trying to clone a non-global frame... not allowed');
                return;
            }

            // don't need to create a folder because we already ensured it is a global frame
            // (otherwise we would need... utilities.createFrameFolder(object.name, frame.name, ... )

            var newFrame = new Frame();
            newFrame.objectId = frame.objectId;
            newFrame.name = frame.src + utilities.uuidTime();
            var newFrameKey = objectID + newFrame.name;
            newFrame.uuid = newFrameKey;
            newFrame.visualization = /*req.body.newVisualization ||*/ frame.visualization; // TODO: should we automatically move it to AR? or set to old
            newFrame.ar = frame.ar;
            newFrame.screen = frame.screen;
            newFrame.visible = frame.visible;
            newFrame.visibleText = frame.visibleText;
            newFrame.visibleEditing = frame.visibleEditing;
            newFrame.developer = frame.developer;
            newFrame.links = frame.links;

            newFrame.nodes = {}; // adjust node keys, etc, for copy
            Object.keys(frame.nodes).forEach(function(oldNodeKey) {
                var node = frame.nodes[oldNodeKey];
                node.frameId = newFrameKey;
                var newNodeKey = node.frameId + node.name;
                node.uuid = newNodeKey;
                newFrame.nodes[newNodeKey] = node;
            });

            newFrame.location = frame.location;
            newFrame.src = frame.src;
            newFrame.width = frame.width;
            newFrame.height = frame.height;
            object.frames[newFrameKey] = newFrame;

            utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);

            // TODO: by not sending action sender, we assume this is a screen frame -- is that an ok assumption?
            // actionSender({reloadObject: {object: objectID}, lastEditor: frame.lastEditor});
            actionSender({reloadFrame: {object: objectID, frame: newFrameKey}, lastEditor: req.body.lastEditor});


            hardwareAPI.runFrameAddedCallbacks(objectID, newFrame); // creates frame in screen hardware interface

            res.status(200).json({success: true, frameId: newFrameKey}).end();
        });

    });

    // Update an object's frame
    webServer.post('/object/*/frames/*/', function (req, res) {
        var objectId = req.params[0];
        var frameId = req.params[1];

        if (!objects.hasOwnProperty(objectId)) {
            res.status(404).json({failure: true, error: 'Object ' + objectId + ' not found'}).end();
            return;
        }

        var object = objects[objectId];
        var frame = req.body;

        if (!frame.src) {
            res.status(500).json({failure: true, error: 'frame must have src'}).end();
            return;
        }

        if (!object.frames) {
            object.frames = {};
        }

        if (!object.frames[frameId]) {
            object.frames[frameId] = new ObjectFrame(frame.src);
        }

        frame.loaded = false;
        // Copy over all properties of frame
        Object.assign(object.frames[frameId], frame);

        utilities.writeObjectToFile(objects, objectId, objectsPath, globalVariables.saveToDisk);

        actionSender({reloadObject: {object: objectId}, lastEditor: req.body.lastEditor});

        res.json({success: true}).end();
    });

    ///object/:objectId/frames/:frameId/sendToScreen
    // webServer.post('/object/:objectId/frames/:frameId/sendToScreen', function (req, res) {
    webServer.post('/screen/:objectId/frames/:frameId', function (req, res) {

        var objectId = req.params.objectId;
        var frameId = req.params.frameId;

        console.log('send frame to screen: ' + objectId + ' :: ' + frameId);
        console.log(req.body.x, req.body.y);

        var object = objects[objectId];
        var frame = object.frames[frameId];

        frame.screen.x = req.body.x;
        frame.screen.y = req.body.y;

        console.log(object);

        ////////////////////
        // make a POST request to the framePalette hardwareInterface, which will create the frame on the screen

        var SCREEN_PORT_MAP = {
            'framePalette': 3032,
            'framePalette2': 3033
        };

        var screenPort = SCREEN_PORT_MAP[object.name];

        console.log('got object port: ', object.name, screenPort);

        if (!screenPort) {
            res.json({success: false}).end();
            return;
        }

        // TODO: get 3032 port from req - needs to be stored in object or frame somewhere
        var options = { method: 'POST',
            url: 'http://' + object.ip + ':' + screenPort + '/frame',
            headers:
                {   'cache-control': 'no-cache',
                    'content-type': 'application/json' },
            body: frame,
            json: true };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            console.log(body);
        });

        // var options = {
        //     "method": "POST",
        //     "hostname": object.ip,
        //     "port": "3032",
        //     "path": "/frame",
        //     "headers": {
        //         "cache-control": "no-cache"
        //     }
        // };
        //
        // var request = http.request(options, function (response) {
        //     var chunks = [];
        //
        //     response.on("data", function (chunk) {
        //         chunks.push(chunk);
        //     });
        //
        //     response.on("end", function () {
        //         var body = Buffer.concat(chunks);
        //         console.log(body.toString());
        //     });
        // });

        // var body = JSON.stringify(frame);
        // request.write(body); // JSON.stringify({ type: 'graph' }));
        // request.end();
        ////////////////////

        res.json({success: true}).end();
    });

    // delete a frame from an object
    webServer.delete('/object/:objectId/frames/:frameId/', function (req, res) {

        var objectId = req.params.objectId;
        var frameId = req.params.frameId;

        console.log('delete frame from server: ' + objectId + ' :: ' + frameId);

        // Delete frame
        var object = objects[objectId];
        if (!object) {
            res.status(404).json({failure: true, error: 'object ' + objectId + ' not found'}).end();
            return;
        }

        var frame = object.frames[frameId];
        if (!frame) {
            res.status(404).json({failure: true, error: 'frame ' + frameId + ' not found'}).end();
            return;
        }

        var objectName = object.name;
        var frameName = object.frames[frameId].name;

        delete object.frames[frameId];

        // remove the frame directory from the object
        utilities.deleteFrameFolder(objectName, frameName, objectsPath);

        // Delete frame's nodes
        var deletedNodes = {};
        for (var nodeId in object.nodes) {
            var node = object.nodes[nodeId];
            if (node.frame === frameId) {
                deletedNodes[nodeId] = true;
                delete object.nodes[nodeId];
            }
        }

        // Delete links involving frame's nodes
        for (var linkObjectId in objects) {
            var linkObject = objects[linkObjectId];
            var linkObjectHasChanged = false;

            for (var linkId in linkObject.links) {
                var link = linkObject.links[linkId];
                if (link.objectA === objectId || link.objectB === objectId) {
                    if (deletedNodes[link.nodeA] || deletedNodes[link.nodeB]) {
                        linkObjectHasChanged = true;
                        delete linkObject.links[linkId];
                    }
                }
            }

            if (linkObjectHasChanged) {
                utilities.writeObjectToFile(objects, linkObjectId, objectsPath, globalVariables.saveToDisk);
                actionSender({reloadObject: {object: linkObjectId}, lastEditor: req.body.lastEditor});
            }
        }

        // write changes to object.json
        utilities.writeObjectToFile(objects, objectId, objectsPath, globalVariables.saveToDisk);

        actionSender({reloadObject: {object: objectId}, lastEditor: req.body.lastEditor});

        res.json({success: true}).end();
    });

    // changing the size and position of an item. *1 is the object *2 is the datapoint id

    // ****************************************************************************************************************

    if (globalVariables.developer === true) {

        webServer.post('/object/:objectID/frame/:frameID/node/:nodeID/size/', function (req, res) {
            changeSize(req.params.objectID, req.params.frameID, req.params.nodeID, req.body, function(statusCode, responseContents) {
                res.status(statusCode).send(responseContents);
            });
        });

        webServer.post('/object/:objectID/frame/:frameID/size/', function (req, res) {
            changeSize(req.params.objectID, req.params.frameID, null, req.body, function(statusCode, responseContents) {
                res.status(statusCode).send(responseContents);
            });
        });

        // // TODO: ask Valentin what this route was used for?
        // webServer.post('/object/*/size/*', function (req, res) {
        //     console.log("post 1");
        //     console.log(req.params);
        //     res.send(changeSize(req.params[0], req.params[1], null, req.body));
        // });

        function changeSize(objectID, frameID, nodeID, body, callback) {

            cout("changing Size for :" + objectID + " : " + frameID + " : " + nodeID);

            var activeVehicle = null;

            getFrameOrNode(objectID, frameID, nodeID, function(error, object, frame, node) {
                if (error) {
                    callback(404, error);
                    return;
                }

                var activeVehicle = node || frame; // use node if it found one, frame otherwise

                console.log('really changing size for ... ' + activeVehicle.uuid, body);

                // cout("post 2");
                var updateStatus = "nothing happened";

                // the reality editor will overwrite all properties from the new frame except these.
                // useful to not overwrite AR position when sending pos or scale from screen.
                var propertiesToIgnore = [];

                // for frames, the position data is inside "ar" or "screen"
                if (activeVehicle.hasOwnProperty('visualization')) {
                    if (activeVehicle.visualization === "ar") {
                        activeVehicle = activeVehicle.ar;
                        propertiesToIgnore.push('screen');
                    } else if (activeVehicle.visualization === "screen") {
                        if (typeof body.scale === "number" && typeof body.scaleARFactor === "number") {
                            activeVehicle.ar.scale = body.scale / body.scaleARFactor;
                        }
                        activeVehicle = activeVehicle.screen;
                        propertiesToIgnore.push('ar.x', 'ar.y'); // TODO: decoding this is currently hard-coded in the editor, make generalized
                    }
                }

                var didUpdate = false;

                // check that the numbers are valid numbers..
                if (typeof body.x === "number" && typeof body.y === "number" && typeof body.scale === "number") {

                    // if the object is equal the datapoint id, the item is actually the object it self.
                    activeVehicle.x = body.x;
                    activeVehicle.y = body.y;
                    activeVehicle.scale = body.scale;

                    // console.log(req.body);
                    // ask the devices to reload the objects
                    didUpdate = true;
                }

                if (typeof body.matrix === "object" && activeVehicle.hasOwnProperty('matrix')) {
                    activeVehicle.matrix = body.matrix;
                    didUpdate = true;
                }

                if (didUpdate) {
                    utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
                    actionSender({reloadFrame: {object: objectID, frame: frameID, propertiesToIgnore: propertiesToIgnore}, lastEditor: body.lastEditor});
                    updateStatus = "added object";
                }

                callback(200, updateStatus);
            });

        }

        webServer.post('/object/*/frame/*/visualization/', function (req, res) {
            console.log('change visualization');
            changeVisualization(req.params[0], req.params[1], req.body, res);
        });

        function changeVisualization(objectKey, frameKey, body, res) {
            var newVisualization = body.visualization;
            // var newPosition = body.positionData;

            var object = objects[objectKey];
            if (object) {
                var frame = object.frames[frameKey];
                if (frame) {
                    frame.visualization = newVisualization;
                    // if (newPosition) {
                    //     frame[newVisualization].x = newPosition.x;
                    //     frame[newVisualization].y = newPosition.y;
                    // }
                    utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                    // for (var i = 0; i < 5; i++) {
                    //     setTimeout(function() {
                    //         actionSender({reloadObject: {object: objectKey, frame: frameKey}});
                    //         console.log("Send visualization heartbeat");
                    //     }, 1000 * i);
                    // }
                    res.status(200).json({success: true}).end();
                    return;
                }
                res.status(404).json({failure: true, error: 'frame ' + frameKey + ' not found on ' + objectKey}).end();
                return;
            }
            res.status(404).json({failure: true, error: 'object ' + objectKey + ' not found'}).end();
        }
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

    // Version 3 #### Active Version
    webServer.get('/nodes/*/gui/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(nodePath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    // Version 3 #### Active Version *1 Block *2 file
    webServer.get('/logicBlock/*/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
        res.sendFile(blockPath + "/" + req.params[0] + '/gui/' + req.params[1]);
    });

    webServer.get('/logicBlock/*/gui/*/', function (req, res) {   // watch out that you need to make a "/" behind request.
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
        webServer.get(objectInterfaceFolder + 'object/:object/:frame/frameFolder', function (req, res) {
            console.log(req.params.object, req.params.frame);
            const dirTree = require('directory-tree');
            var objectPath = objectsPath + '/' + req.params.object +"/" + req.params.frame;
            var tree = dirTree(objectPath, {exclude:/\.DS_Store/}, function (item){
                item.path = item.path.replace(objectsPath, "/obj");
            });
            res.json(tree);
        });


        webServer.get(objectInterfaceFolder + 'content/:object/:frame', function (req, res) {
            // cout("get 13");
            console.log(req.params);
            res.send(webFrontend.uploadTargetContentFrame(req.params.object, req.params.frame, objectsPath, objectInterfaceFolder));
        });

        webServer.get(objectInterfaceFolder + 'edit/:id/*', function (req, res) {
            webFrontend.editContent(req, res);
        });

        webServer.put(objectInterfaceFolder + 'edit/:id/*', function (req, res) {
            // TODO insecure, requires sanitization of path
            console.log('PUT', req.path, req.body.content);
            fs.writeFile(__dirname + '/' + req.path.replace('edit', 'objects'), req.body.content, function (err) { //TODO: update path with objectsPath
                if (err) {
                    throw err;
                }
                // Success!
                res.end('');
            });
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
            res.send(webFrontend.printFolder(objects, objectsPath, globalVariables.debug, objectInterfaceFolder, objectLookup, version, ip.address(), serverPort));
        });

        // restart the server from the web frontend to load

        webServer.get('/restartServer/', function(req, res) {
            exit();
        });

        //  deactivated

        webServer.get('/object/*/deactivate/', function (req, res) {
            objects[req.params[0]].deactivated = true;
            utilities.writeObjectToFile(objects, req.params[0], objectsPath, globalVariables.saveToDisk);

            res.send("ok");
          //  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
           // res.redirect(req.get('referer'));
        });

        webServer.get('/object/*/activate/', function (req, res) {
            console.log("------------------");
            console.log(objects);
            console.log("------------------");
            console.log(req.params[0]);
            objects[req.params[0]].deactivated = false;
            utilities.writeObjectToFile(objects, req.params[0], objectsPath, globalVariables.saveToDisk);

            res.send("ok");
           // res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
           // res.redirect(req.get('referer'));
        });


        webServer.get('/object/*/screen/', function (req, res) {
            objects[req.params[0]].visualization = "screen";
            console.log(req.params[0], "screen");
            utilities.writeObjectToFile(objects, req.params[0], objectsPath, globalVariables.saveToDisk);
            res.send("ok");
        });

        webServer.get('/object/*/ar/', function (req, res) {
            objects[req.params[0]].visualization = "ar";
            console.log(req.params[0], "ar");
            utilities.writeObjectToFile(objects, req.params[0], objectsPath, globalVariables.saveToDisk);
            res.send("ok");
        });

        webServer.get('/object/*/*/reset/', function (req, res) {
            objects[req.params[0]].frames[req.params[1]].ar = {
                x : 0,
                y : 0,
                scale : 1,
                matrix : []
            };
            // position data for the screen visualization mode
            objects[req.params[0]].frames[req.params[1]].screen = {
                x : 0,
                y : 0,
                scale : 1,
                matrix : []
            };
            utilities.writeObjectToFile(objects, req.params[0], objectsPath, globalVariables.saveToDisk);
            res.send("ok");
        });

        // request a zip-file with the object stored inside. *1 is the object
        // ****************************************************************************************************************
        webServer.get('/object/*/zipBackup/', function (req, res) {
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
            //  cout("get 3");
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-disposition': 'attachment; filename=' + req.params[0] + '.zip'
            });

            var Archiver = require('archiver');

            var zip = Archiver.create('zip', false);
            zip.pipe(res);
            zip.directory(objectsPath + '/' + req.params[0], req.params[0] + "/");
            zip.finalize();
        });

        // sends json object for a specific reality object. * is the object name
        // ths is the most relevant for
        // ****************************************************************************************************************
        webServer.get('/object/:objectID/frame/:frameID/node/:nodeID/', function (req, res) {
            //  cout("get 7");
            res.json(objects[req.params.objectID].frames[req.params.frameID].nodes[req.params.nodeID] || {});
        });

        // sends json object for a specific reality frame. 1st * is the object name, 2nd * is the frame name
        // ths is the most relevant for
        // ****************************************************************************************************************
        webServer.get('/object/*/frame/*/', function (req, res) {
            //  cout("get 7");

            var thisObject = objects[req.params[0]];
            if (thisObject) {
                var thisFrame = thisObject.frames[req.params[1]];
                if (thisFrame) {
                    res.status(200).json(thisFrame);
                    return;
                }
            }

            res.status(404).json({failure: true, error: 'Object: ' + req.params[0] + ', frame: ' + req.params[1] + ' not found'}).end();
        });

        // sends json object for a specific reality object. * is the object name
        // ths is the most relevant for
        // ****************************************************************************************************************
        webServer.get('/object/*/', function (req, res) {
            //  cout("get 7");

            console.log("----x---xx----xx--x-----");
            // console.log(objects[req.params[0]]);
            res.json(objects[req.params[0]]);
        });


        // use allObjects for TCP/IP object discovery
        // ****************************************************************************************************************

        webServer.get('/allObjects/', function (req, res) {

            var returnJSON = [];

            for (var thisId in objects) {
                if (objects[thisId].deactivated) continue;

                objects[thisId].version = version;
                objects[thisId].protocol = protocol;

                var thisVersionNumber = parseInt(objects[thisId].version.replace(/\./g, ""));

                if (typeof objects[thisId].tcs === "undefined") {
                    objects[thisId].tcs = 0;
                }
                returnJSON.push({
                    id: thisId,
                    ip: objects[thisId].ip,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs
                });
            }

            res.json(returnJSON);
        });

        // ****************************************************************************************************************
        // post interfaces
        // ****************************************************************************************************************
        webServer.post(objectInterfaceFolder + "contentDelete/:object/:frame", function (req, res) {
            if (req.body.action === "delete") {
                var folderDel = __dirname + req.path.substr(4);
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

                res.send("ok");

            }
        });

        webServer.post(objectInterfaceFolder + "contentDelete/:id", function (req, res) {
            if (req.body.action === "delete") {
                var folderDel = objectsPath + '/' + req.body.name;

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

                res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
            }

        });

        //*****************************************************************************************
        webServer.post(objectInterfaceFolder, function (req, res) {

            if (req.body.action === "zone") {
                var objectKey = utilities.readObject(objectLookup, req.body.name);
                objects[objectKey].zone = req.body.zone;
                utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                res.send("ok");
            }

            if (req.body.action === "new") {
                console.log("got NEW "+req.body.name );
                // cout(req.body);
                if (req.body.name !== "" && !req.body.frame) {
                   // var defaultFrameName = 'zero'; // TODO: put this in the request body, like the object name
                    utilities.createFolder(req.body.name, objectsPath, globalVariables.debug);

                } else if(req.body.name !== "" && req.body.frame !== ""){
                    var objectKey = utilities.readObject(objectLookup, req.body.name);

                    if(!objects[objectKey].frames[objectKey+ req.body.frame]) {

                        utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, objectsPath, globalVariables.debug, "local");
                        objects[objectKey].frames[objectKey+ req.body.frame] = new Frame();
                        objects[objectKey].frames[objectKey+ req.body.frame].name = req.body.frame;
                        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                    } else {
                        utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, objectsPath, globalVariables.debug, objects[objectKey].frames[objectKey+ req.body.frame].location);
                    }
                }
              //  res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));

            res.send("ok");
            }
            if (req.body.action === "delete") {

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


                // remove when frame is implemented

                var objectKey = utilities.readObject(objectLookup, req.body.name);// req.body.name + thisMacAddress;
                var frameName = req.body.frame;
                var frameNameKey = req.body.frame;
                var pathKey = req.body.path;
                if(objects[objectKey]) {
                    if (req.body.frame in objects[objectKey].frames) {
                        frameName = objects[objectKey].frames[req.body.frame].name;
                    } else {
                        frameNameKey = objectKey + req.body.frame;
                    }
                }

                if(pathKey && pathKey !== ""){
                   fs.unlinkSync(objectsPath + pathKey.substring(4));
                    res.send("ok");
                    return;
                };

                if (frameName !== "") {
                    var folderDelFrame = objectsPath + '/' + req.body.name + "/" + frameName;

                    deleteFolderRecursive(folderDelFrame);

                    if (objectKey !== null && frameNameKey !== null) {
                        if(objects[objectKey]) {
                            delete objects[objectKey].frames[frameNameKey];
                        }
                    }

                    utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                    res.send("ok");

                } else {

                    var folderDel = objectsPath + '/' + req.body.name;
                    deleteFolderRecursive(folderDel);

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);// req.body.name + thisMacAddress;

                    if (tempFolderName2 !== null) {

                        // remove object from tree
                        if(objects[tempFolderName2]) {
                            delete objects[tempFolderName2];
                            delete knownObjects[tempFolderName2];
                            delete objectLookup[req.body.name];
                        }

                    }

                    cout("i deleted: " + tempFolderName2);

                    //   res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
                    res.send("ok");
                }
            }
            //delete end
        });

        var tmpFolderFile = "";

        // this is all used just for the backup folder
        //*************************************************************************************
        webServer.post(objectInterfaceFolder + 'backup/',
            function (req, res) {
                // cout("post 23");

                cout("komm ich hier hin?");

                var form = new formidable.IncomingForm({
                    uploadDir: objectsPath,  // don't forget the __dirname here
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

                form.parse(req);

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
                    var folderDel = objectsPath + '/' + req.body.name;

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

                    res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
                }

                var form = new formidable.IncomingForm({
                    uploadDir: objectsPath + '/' + req.params.id,  // don't forget the __dirname here
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
                    } else if(req.headers.type === "fileUpload") {
                        console.log(form.uploadDir);
                        console.log(req.headers.folder);

                        if(typeof req.headers.folder !== "undefined"){
                            file.path = form.uploadDir + "/" + req.headers.frame +"/"+ req.headers.folder +"/" +file.name;
                        } else {
                            file.path = form.uploadDir + "/" + req.headers.frame +"/"+ file.name;
                        }
                    }
                });

                form.parse(req);

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    cout("------------" + form.uploadDir + "/" + filename);

                    if (req.headers.type === "targetUpload") {
                        console.log(req.params.id);
                        console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
                        var fileExtension = getFileExtension(filename);

                        if (fileExtension === "jpg") {
                            if (!fs.existsSync(folderD + '/' + identityFolderName + "/target/")) {
                                fs.mkdirSync(folderD + '/' + identityFolderName + "/target/", "0766", function (err) {
                                    if (err) {
                                        cout(err);
                                        res.send("ERROR! Can't make the directory! \n");    // echo the result back
                                    }
                                });
                            }

                            fs.renameSync(folderD + "/" + filename, folderD + '/' + identityFolderName + "/target/target.jpg");

                            var objectName = req.params.id + utilities.uuidTime();

                            var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                                '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
                                '   <Tracking>\n' +
                                '   <ImageTarget name="' + objectName + '" size="300.000000 300.000000" />\n' +
                                '   </Tracking>\n' +
                                '   </ARConfig>';

                            var xmlOutFile = folderD + '/' + identityFolderName + "/target/target.xml";
                            if (!fs.existsSync(xmlOutFile)) {
                                fs.writeFile(xmlOutFile, documentcreate, function (err) {
                                    if (err) {
                                        cout(err);
                                    } else {
                                        cout("XML saved to " + xmlOutFile);
                                    }
                                });
                            }

                            var fileList = [folderD + '/' + identityFolderName + "/target/target.jpg", folderD + '/' + identityFolderName + "/target/target.xml", folderD + '/' + identityFolderName + "/target/target.dat"];

                            var thisObjectId = utilities.readObject(objectLookup, req.params.id);


                            if (typeof  objects[thisObjectId] !== "undefined") {
                                var thisObject = objects[thisObjectId];

                                var jpg = false;
                                if(fs.existsSync(folderD + '/' + identityFolderName + "/target/target.jpg")) jpg = true;
                                var dat = false;
                                if(fs.existsSync(folderD + '/' + identityFolderName + "/target/target.dat") && fs.existsSync(folderD + '/' + identityFolderName + "/target/target.xml")) dat = true;


                                var sendObject = {
                                    id : thisObjectId,
                                    name: thisObject.name,
                                    initialized : true,
                                    jpgExists :jpg,
                                    targetExists: dat
                                };

                                thisObject.tcs = utilities.genereateChecksums(objects, fileList);

                                utilities.writeObjectToFile(objects, thisObjectId, objectsPath, globalVariables.saveToDisk);

                                objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

                                res.status(200);
                                res.json(sendObject);
                            } else {
                                res.status(200);

                                var sendObject = {
                                    initialized : false
                                };

                                res.json("ok");
                            }


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
                                    var folderFile = fs.readdirSync(folderD + '/' + identityFolderName + "/target");
                                    var folderFileType;

                                    for (var i = 0; i < folderFile.length; i++) {
                                        cout(folderFile[i]);
                                        folderFileType = folderFile[i].substr(folderFile[i].lastIndexOf('.') + 1);
                                        if (folderFileType === "xml" || folderFileType === "dat") {
                                            fs.renameSync(folderD + '/' + identityFolderName + "/target/" + folderFile[i], folderD + '/' + identityFolderName + "/target/target." + folderFileType);
                                        }
                                    }
                                    fs.unlinkSync(folderD + "/" + filename);

                                    // evnetually create the object.

                                    if (fs.existsSync(folderD + '/' + identityFolderName + "/target/target.dat") && fs.existsSync(folderD + '/' + identityFolderName + "/target/target.xml")) {

                                        cout("creating object from target file " + tmpFolderFile);
                                        // createObjectFromTarget(tmpFolderFile);
                                        createObjectFromTarget(Objects, objects, tmpFolderFile, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                        //todo send init to internal modules
                                        cout("have created a new object");

                                        hardwareAPI.reset();
                                        cout("have initialized the modules");

                                        var fileList = [folderD + '/' + identityFolderName + "/target/target.jpg", folderD + '/' + identityFolderName + "/target/target.xml", folderD + '/' + identityFolderName + "/target/target.dat"];

                                        var thisObjectId = utilities.readObject(objectLookup, req.params.id);

                                        if (typeof  objects[thisObjectId] !== "undefined") {
                                            var thisObject = objects[thisObjectId];

                                            thisObject.tcs = utilities.genereateChecksums(objects, fileList);

                                            utilities.writeObjectToFile(objects, thisObjectId, objectsPath, globalVariables.saveToDisk);

                                            objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

                                            res.status(200);


                                            var jpg = false;
                                            if(fs.existsSync(folderD + '/' + identityFolderName + "/target/target.jpg")) jpg = true;
                                            var dat = false;
                                            if(fs.existsSync(folderD + '/' + identityFolderName + "/target/target.dat") && fs.existsSync(folderD + '/' + identityFolderName + "/target/target.xml")) dat = true;


                                            var sendObject = {
                                                id : thisObjectId,
                                                name: thisObject.name,
                                                initialized : true,
                                                jpgExists :jpg,
                                                targetExists: dat
                                            };

                                            res.json(sendObject);
                                        }

                                    }

                                    var sendObject = {
                                        initialized : false
                                    };
                                    res.status(200);
                                    res.json(sendObject);
                                });

                                unzipper.on('progress', function (fileIndex, fileCount) {
                                    cout('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                                });

                                unzipper.extract({
                                    path: folderD + '/' + identityFolderName + "/target",
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

    var folder = objectsPath + '/' + folderVar + '/';
    cout(folder);

    if (fs.existsSync(folder)) {
        cout("folder exists");
        var objectIDXML = utilities.getObjectIdFromTarget(folderVar, objectsPath);
        var objectSizeXML = utilities.getTargetSizeFromTarget(folderVar, objectsPath);
        cout("got ID: objectIDXML");
        if (!_.isUndefined(objectIDXML) && !_.isNull(objectIDXML)) {
            if (objectIDXML.length > 13) {

                objects[objectIDXML] = new Objects();
                objects[objectIDXML].name = folderVar;
                objects[objectIDXML].objectId = objectIDXML;
                objects[objectIDXML].targetSize = objectSizeXML;

                cout("this should be the IP" + objectIDXML);

                try {
                    objects[objectIDXML] = JSON.parse(fs.readFileSync(objectsPath + '/' + folderVar + '/' + identityFolderName + "/object.json", "utf8"));
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
                utilities.writeObject(objectLookup, folderVar, objectIDXML, globalVariables.saveToDisk);
                // entering the obejct in to the lookup table

                // ask the object to reinitialize
                //serialPort.write("ok\n");
                // todo send init to internal

                hardwareAPI.reset();

                cout("weiter im text " + objectIDXML);
                utilities.writeObjectToFile(objects, objectIDXML, objectsPath, globalVariables.saveToDisk);

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

        console.log('connected to socket ' + socket.id);

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

            var publicData = {};
            var object = objects[msgContent.object];
            if (object) {
                var frame = object.frames[msgContent.frame];
                if (frame) {
                    for(key in frame.nodes){
                        if(typeof frame.nodes[key].publicData === undefined) frame.nodes[key].publicData = {};
                        publicData[key] = frame.nodes[key].publicData;
                    }
                }
            };

            io.sockets.connected[socket.id].emit('object/publicData', JSON.stringify({
                object: msgContent.object,
                frame: msgContent.frame,
                publicData: publicData
            }));//       socket.emit('object', msgToSend);
        });

        socket.on('/subscribe/realityEditorBlock', function (msg) {
            var msgContent = JSON.parse(msg);

            if (objects.hasOwnProperty(msgContent.object)) {
                cout("reality editor block: " + msgContent.object);
                cout("the latest socket has the ID: " + socket.id);

                realityEditorBlockSocketArray[socket.id] = {object: msgContent.object};
                cout(realityEditorBlockSocketArray);
            }

            var publicData = {};
            var object = objects[msgContent.object];
            if (object) {
                var frame = object.frames[msgContent.frame];
                if (frame) {
                    var node = frame.nodes[msgContent.logic];
                    if (node) {
                        var block = node.blocks[msgContent.block];
                        if (block) {
                            publicData = block.publicData;
                        }
                    }
                }
            }

            io.sockets.connected[socket.id].emit('block', JSON.stringify({
                object: msgContent.object,
                frame: msgContent.frame,
                node: msgContent.node,
                block: msgContent.block,
                publicData: publicData
            }));//       socket.emit('object', msgToSend);
        });


        socket.on('object', function (msg) {
            var msgContent = protocols[protocol].receive(msg);
            if (msgContent === null) {
                msgContent = protocols["R0"].receive(msg);
            }



            if (msgContent !== null) {
                hardwareAPI.readCall(msgContent.object, msgContent.frame, msgContent.node, msgContent.data);

                sendMessagetoEditors({
                    object: msgContent.object,
                    frame: msgContent.frame,
                    node: msgContent.node,
                    data: msgContent.data
                });
            }
        });
// todo do this stuff tomorrrow



        socket.on('object/publicData', function (_msg) {
            var msg = JSON.parse(_msg);
            // console.log(msg);
            if (typeof msg.object !== "undefined" && typeof  msg.frame !== "undefined" && typeof  msg.node !== "undefined") {
                if (msg.object in objects) {
                    if (msg.frame in objects[msg.object].frames) {
                        if (msg.node in objects[msg.object].frames[msg.frame].nodes) { //TODO: msg.logic or msg.node ??
                                if (typeof objects[msg.object].frames[msg.frame].nodes[msg.node].publicData !== "undefined") {

                                    var thisPublicData = objects[msg.object].frames[msg.frame].nodes[msg.node].publicData;

                                    for (var key in msg.publicData) {
                                        thisPublicData[key] = msg.publicData[key];
                                    }
                            }
                        }
                    }
                }
            }
        });

        socket.on('block/setup', function (_msg) {
            var msg = JSON.parse(_msg);

            if (typeof msg.object !== "undefined" && typeof  msg.frame !== "undefined" && typeof  msg.node !== "undefined" && typeof  msg.block !== "undefined") {
                if (msg.object in objects) {
                    if (msg.frame in objects[msg.object].frames) {
                        if (msg.node in objects[msg.object].frames[msg.frame].nodes) { //TODO: msg.logic or msg.node ??
                            if (msg.block in objects[msg.object].frames[msg.frame].nodes[msg.node].blocks) {
                                if (typeof objects[msg.object].frames[msg.frame].nodes[msg.node].blocks[msg.block].publicData !== "undefined") {

                                    var thisPublicData = objects[msg.object].frames[msg.frame].nodes[msg.node].blocks[msg.block].publicData;
                                    blockModules[thisPublicData.type].setup(msg.object, msg.frame, msg.node, msg.block, thisPublicData);

                                }
                            }
                        }
                    }
                }
            }

        });


        socket.on('block/publicData', function (_msg) {
            var msg = JSON.parse(_msg);
            // console.log(msg);
            if (typeof msg.object !== "undefined" && typeof  msg.frame !== "undefined" && typeof  msg.node !== "undefined" && typeof  msg.block !== "undefined") {
                if (msg.object in objects) {
                    if (msg.frame in objects[msg.object].frames) {
                        if (msg.node in objects[msg.object].frames[msg.frame].nodes) { //TODO: msg.logic or msg.node ??
                            if (msg.block in objects[msg.object].frames[msg.frame].nodes[msg.node].blocks) {
                                if (typeof objects[msg.object].frames[msg.frame].nodes[msg.node].blocks[msg.block].publicData !== "undefined") {

                                    var thisPublicData = objects[msg.object].frames[msg.frame].nodes[msg.node].blocks[msg.block].publicData;

                                    for (var key in msg.publicData) {
                                        thisPublicData[key] = msg.publicData[key];
                                    }
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

        socket.on('/object/screenObject', function (msg) {
            hardwareAPI.screenObjectCall(JSON.parse(msg));
        });

        socket.on('disconnect', function () {


            if (socket.id in realityEditorSocketArray) {
                delete realityEditorSocketArray[socket.id];
                console.log("GUI for " + socket.id + " has disconnected");
            }

            if (socket.id in realityEditorBlockSocketArray) {
                utilities.writeObjectToFile(objects, realityEditorBlockSocketArray[socket.id].object, objectsPath, globalVariables.saveToDisk);
                actionSender({reloadObject: {object: realityEditorBlockSocketArray[socket.id].object}});
                delete realityEditorBlockSocketArray[socket.id];
                console.log("Settings for " + socket.id + " has disconnected");
            }

            //utilities.writeObjectToFile(objects, req.params[0], __dirname, globalVariables.saveToDisk);

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
        if (objects[msgContent.object].frames.hasOwnProperty(msgContent.frame)) {
            if (objects[msgContent.object].frames[msgContent.frame].nodes.hasOwnProperty(msgContent.node)) {

                io.sockets.connected[socketID].emit('object', JSON.stringify({
                    object: msgContent.object,
                    frames: msgContent.frame,
                    node: msgContent.node,
                    data: objects[msgContent.object].frames[msgContent.frame].nodes[msgContent.node].data
                }));//       socket.emit('object', msgToSend);
            }
        }
    }
}


hardwareAPI.screenObjectServerCallBack(function(object, frame, node, touchOffsetX, touchOffsetY){
    for (var thisEditor in realityEditorSocketArray) {
        io.sockets.connected[thisEditor].emit('/object/screenObject', JSON.stringify({
            object: object,
            frame: frame,
            node: node,
            touchOffsetX: touchOffsetX,
            touchOffsetY: touchOffsetY
        }));
    }
});

/**********************************************************************************************************************
 ******************************************** Engine ******************************************************************
 **********************************************************************************************************************/

/**
 * @desc Take the id of a value in objectValue and look through all links, if this id is used.
 * All links that use the id will fire up the engine to process the link.
 **/

var engine = {
    link: undefined,
    internalObjectDestination: undefined,
    blockKey: undefined,
    objects: objects,
    router: undefined,
    nodeTypeModules: nodeTypeModules,
    blockModules: blockModules,
    hardwareAPI: hardwareAPI,
    nextLogic: undefined,
    logic: undefined,

    // triggered by normal inputs from hardware or network
    trigger: function (object, frame, node, thisNode) {
        if (!thisNode.processedData)
            thisNode.processedData = {};

        var _this = this;
        if ((thisNode.type in this.nodeTypeModules)) {
            this.nodeTypeModules[thisNode.type].render(object, frame, node, thisNode, function (object, frame, node, thisNode) {
                _this.processLinks(object, frame, node, thisNode);
            });
        }
    },
    // once data is processed it will determin where to send it.
    processLinks: function (object, frame, node, thisNode) {

        var linkKey;

        for (linkKey in this.objects[object].frames[frame].links) {

            this.link = this.objects[object].frames[frame].links[linkKey];

            if (this.link.nodeA === node && this.link.objectA === object && this.link.frameA === frame ) {
                if (!checkObjectActivation(this.link.objectB)) {
                    socketSender(object, frame, linkKey, thisNode.processedData);
                }
                else {

                    // console.log('testing...');
                    // console.log(this.link);

                    if(!(this.link.objectB in this.objects)) return;
                    if(!(this.link.frameB in this.objects[this.link.objectB].frames)) return;
                    if(!(this.link.nodeB in this.objects[this.link.objectB].frames[this.link.frameB].nodes)) return;


                    this.internalObjectDestination = this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB];

                    if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                        this.computeProcessedData(thisNode, this.link, this.internalObjectDestination)
                    }
                    else {
                        this.blockKey = "in" + this.link.logicB;

                        if (this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB] && this.blockKey) {
                            if (this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB].blocks) {
                                this.internalObjectDestination = this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB].blocks[this.blockKey];

                                for (var key in thisNode.processedData) {
                                    this.internalObjectDestination.data[0][key] = thisNode.processedData[key];
                                }

                                this.nextLogic = this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB];
                                // this needs to be at the beginning;
                                if (!this.nextLogic.routeBuffer)
                                    this.nextLogic.routeBuffer = [0, 0, 0, 0];

                                this.nextLogic.routeBuffer[this.link.logicB] = thisNode.processedData.value;
                                this.blockTrigger(this.link.objectB, this.link.frameB, this.link.nodeB, this.blockKey, 0, this.internalObjectDestination);
                            }
                        }
                    }

                }
            }
        }
    },
    // this is a helper for internal nodes.
    computeProcessedData: function (thisNode, thisLink, internalObjectDestination) {
        if (!internalObjectDestination) {
            console.log('temporarily ignored undefined destination in computeProcessedData', thisLink);
            return;
        }

        // save data in local destination object;
        var key;
        for (key in thisNode.processedData) {
            internalObjectDestination.data[key] = thisNode.processedData[key];
        }

        // trigger hardware API to push data to the objects
        this.hardwareAPI.readCall(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination.data);

        // push the data to the editor;
        sendMessagetoEditors({
            object: thisLink.objectB,
            frame: thisLink.frameB,
            node: thisLink.nodeB,
            data: internalObjectDestination.data
        });

        // trigger the next round of the engine on the next object
        this.trigger(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination);
    },
    // this is when a logic block is triggered.
    blockTrigger: function (object, frame, node, block, index, thisBlock) {
      //  console.log(objects[object].frames[frame].nodes[node].blocks[block]);
        if (!thisBlock.processedData)
            thisBlock.processedData = [{}, {}, {}, {}];

        var _this = this;

        if ((thisBlock.type in this.blockModules)) {
            this.blockModules[thisBlock.type].render(object, frame, node, block, index, thisBlock, function (object, frame, node, block, index, thisBlock) {
                _this.processBlockLinks(object, frame, node, block, index, thisBlock);
            });
        }
    },
// this is for after a logic block is processed.
    processBlockLinks: function (object, frame, node, block, index, thisBlock) {

        for (var i = 0; i < 4; i++) {

            // check if there is data to be processed
            if (typeof thisBlock.processedData[i].value === "number") {

                this.router = null;

                if (block === "out0") this.router = 0;
                if (block === "out1") this.router = 1;
                if (block === "out2") this.router = 2;
                if (block === "out3") this.router = 3;

                var linkKey;

                if (this.router !== null) {

                    for (linkKey in this.objects[object].frames[frame].links) {
                        this.link = this.objects[object].frames[frame].links[linkKey];

                        if (this.link.nodeA === node &&
                            this.link.objectA === object && this.link.frameA === frame && this.link.logicA === this.router) {
                            if (!(checkObjectActivation(this.link.objectB))) {
                                socketSender(object, frame, linkKey, thisBlock.processedData[i]);
                            }
                            else {
                                this.internalObjectDestination = this.objects[this.link.objectB].frames[this.link.frameB].nodes[this.link.nodeB];

                                if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                                    this.computeProcessedBlockData(thisBlock, this.link, i, this.internalObjectDestination)
                                }
                            }
                        }
                    }
                }
                else {
                    this.logic = this.objects[object].frames[frame].nodes[node];
                    // process all links in the block
                    for (linkKey in this.logic.links) {
                        if (this.logic.links[linkKey])
                            if (this.logic.links[linkKey].nodeA === block) {
                                if (this.logic.links[linkKey].logicA === i) {

                                    this.link = this.logic.links[linkKey];

                                    this.internalObjectDestination = this.logic.blocks[this.link.nodeB];
                                    var key;
                                    for (key in thisBlock.processedData[i]) {
                                        this.internalObjectDestination.data[this.link.logicB][key] = thisBlock.processedData[i][key];
                                    }
                                    this.blockTrigger(object, frame, node, this.link.nodeB, this.link.logicB, this.internalObjectDestination);
                                }
                            }
                    }
                }
            }
        }
    },

    computeProcessedBlockData: function (thisNode, thisLink, index, internalObjectDestination) {
        // save data in local destination object;
        var key1;
        for (key1 in thisNode.processedData[index]) {
            internalObjectDestination.data[key1] = thisNode.processedData[index][key1];
        }

        // trigger hardware API to push data to the objects
        this.hardwareAPI.readCall(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination.data);

        // push the data to the editor;
        sendMessagetoEditors({
            object: thisLink.objectB,
            frame: thisLink.frameB,
            node: thisLink.nodeB,
            data: internalObjectDestination.data
        });

        // console.log( thisNode.processedData[index].value)
        // trigger the next round of the engine on the next object
        this.trigger(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination);
    }
};

/**
 * @desc Sends processedValue to the responding Object using the data saved in the LinkArray located by IDinLinkArray
 **/

function socketSender(object, frame, link, data) {
    var thisLink = objects[object].frames[frame].links[link];

    var msg = "";

    if (thisLink.objectB in knownObjects) {
        if (knownObjects[thisLink.objectB].protocol) {
            var thisProtocol = knownObjects[thisLink.objectB].protocol;
            if (thisProtocol in protocols) {
                msg = protocols[thisProtocol].send(thisLink.objectB, thisLink.frameB,thisLink.nodeB, thisLink.logicB, data);
            }
            else {
                msg = protocols["R0"].send(thisLink.objectB, thisLink.nodeB, data);
            }
        } else {
            msg = protocols["R0"].send(thisLink.objectB, thisLink.nodeB, data);
        }

        try {
            var thisIp = knownObjects[thisLink.objectB].ip;
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
    var sockKey, objectKey, nodeKey, frameKey;

    for (sockKey in socketArray) {
        var socketIsUsed = false;

        // check if the link is used somewhere. if it is not used delete it.
        for (objectKey in objects) {
            for(frameKey in objects[objectKey].frames) {
                for (nodeKey in objects[objectKey].frames[frameKey].links) {
                    var thisSocket = knownObjects[objects[objectKey].frames[frameKey].links[nodeKey].objectB];

                    if (thisSocket === sockKey) {
                        socketIsUsed = true;
                    }
                }
            }
        }
        if (!socketArray[sockKey].io.connected || !socketIsUsed) {
            // delete socketArray[sockKey];
        }
    }
    for (objectKey in objects) {
        for(frameKey in objects[objectKey].frames){
        for (nodeKey in objects[objectKey].frames[frameKey].links) {
            var thisLink = objects[objectKey].frames[frameKey].links[nodeKey];

            if (!checkObjectActivation(thisLink.objectB) && (thisLink.objectB in knownObjects)) {

                var thisIp = knownObjects[thisLink.objectB].ip;
                //cout("this ip: "+ip);
                if (!(thisIp in socketArray)) {
                    // cout("shoudl not show up -----------");
                    socketArray[thisIp] = new ObjectSockets(socketPort, thisIp);
                }
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

function checkObjectActivation(id) {
    if (id in objects) {
        return !objects[id].deactivated
    } else return false;
}
