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


/**********************************************************************************************************************
 ******************************************** constant settings *******************************************************
 **********************************************************************************************************************/

try {
    require('module-alias/register');
} catch (err) {
    console.clear();
    console.log('\x1b[33mYou\'re not done with the installation! You need to execute the following commands:');
    console.log('\x1b[0m1.\x1b[32m npm install');
    console.log('\x1b[0m2.\x1b[32m git submodule update --init --recursive');
    console.log('\x1b[0m3.\x1b[32m cd addons/vuforia-spatial-core-addon');
    console.log('\x1b[0m4.\x1b[32m npm install', '\x1b[0m');
    console.log('');
    console.log('');
    console.log('\x1b[33mWhenever you install a new addon make sure to:', '\x1b[0m');
    console.log('\x1b[0m3.\x1b[32m cd addons/<new addon folder>');
    console.log('\x1b[0m4.\x1b[32m npm install', '\x1b[0m');

    if (process.send) {
        process.send('exit');
    }

    let keepRunning = true;
    while (keepRunning) {
        // Since process.send is async, just hold the server for preventing more errors
    }
}
const _logger = require('./logger');

const os = require('os');
const isLightweightMobile = os.platform() === 'android' || process.env.FORCE_MOBILE;
const isStandaloneMobile = os.platform() === 'ios';

// These variables are used for global status, such as if the server sends debugging messages and if the developer
// user interfaces should be accesable
const globalVariables = {
    // Show developer web GUI
    developer: true,
    // Send more debug messages to console
    debug: false,
    isMobile: isLightweightMobile && !isStandaloneMobile,
    // Prohibit saving to file system if we're on mobile or just running tests
    saveToDisk: (!isLightweightMobile && process.env.NODE_ENV !== 'test') || isStandaloneMobile,
    // Create an object for attaching frames to the world
    worldObject: isLightweightMobile || isStandaloneMobile,
    listenForHumanPose: false,
    initializations: {
        udp: false,
        web: false,
        system: false
    }
};

// ports used to define the server behaviour
/*
 The server uses port 8080 to communicate with other servers and with the Reality Editor.
 As such the Server reacts to http and web sockets on this port.

 The beat port is used to send UDP broadcasting messages in  a local network. The Reality Editor and other Objects
 pick up these messages to identify the object.

 */

var serverPort = (isLightweightMobile || isStandaloneMobile) ? 49369 : 8080;
const serverUserInterfaceAppPort = 49368;
const socketPort = serverPort;     // server and socket port are always identical
const beatPort = 52316;            // this is the port for UDP broadcasting so that the objects find each other.
const timeToLive = 3;                     // the amount of routers a UDP broadcast can jump. For a local network 2 is enough.
const beatInterval = 5000;         // how often is the heartbeat sent
const socketUpdateInterval = 2000; // how often the system checks if the socket connections are still up and running.


// todo why would you alter the version of the server for mobile. There should only be one version of the server.
// The version of this server
const version = '3.2.2';
// The protocol of this server
const protocol = 'R2';
const netmask = '255.255.0.0'; // define the network scope from which this server is accessable.
// for a local network 255.255.0.0 allows a 16 bit block of local network addresses to reach the object.
// basically all your local devices can see the object, however the internet is unable to reach the object.

//console.log(parseInt(version.replace(/\./g, "")));

const fs = require('fs');       // Filesystem library
const path = require('path');
const DecompressZip = require('decompress-zip');

const spatialToolboxPath = path.join(os.homedir(), 'Documents', 'spatialToolbox');
const oldRealityObjectsPath = path.join(os.homedir(), 'Documents', 'realityobjects');

// All objects are stored in this folder:
// Look for objects in the user Documents directory instead of __dirname+"/objects"
let objectsPath = spatialToolboxPath;

if (process.env.NODE_ENV === 'test' || os.platform() === 'android' || !fs.existsSync(path.join(os.homedir(), 'Documents'))) {
    objectsPath = path.join(__dirname, 'spatialToolbox');
}

const addonPaths = [
    path.join(__dirname, 'addons'),
    path.join(os.homedir(), 'Documents', 'spatialToolbox-addons'),
];

const Addons = require('./libraries/addons/Addons');
const AddonFolderLoader = require('./libraries/addons/AddonFolderLoader');

const addons = new Addons(addonPaths);
const addonFolders = addons.listAddonFolders();

// The path to all frames types that this server hosts, containing a directory for each frame (containing the html/etc).
const frameLibPaths = addonFolders.map(folder => path.join(folder, 'tools'));

// All visual UI representations for IO Points are stored in this folder:
const nodePaths = addonFolders.map(folder => path.join(folder, 'nodes'));
// All visual UI representations for logic blocks are stored in this folder:
const blockPaths = addonFolders.map(folder => path.join(folder, 'blocks'));
// All interfaces for different hardware such as Arduino Yun, PI, Philips Hue are stored in this folder.
const hardwareInterfacePaths = addonFolders.map(folder => path.join(folder, 'interfaces'));
// The web service level on which objects are accessable. http://<IP>:8080 <objectInterfaceFolder> <object>
const objectInterfaceFolder = '/';

/**********************************************************************************************************************
 ******************************************** Requirements ************************************************************
 **********************************************************************************************************************/
const storage = require('./libraries/storage');
let dir = path.join(require('os').homedir(), 'vst-edge-server');
//fs.mkdirSync('/Users/Anna/my-test-dir');
console.log('**** DIR: ', dir);

try {
    storage.initSync({dir: dir});
} catch (e) {
    console.log('Something went wrong with initSync', e);
}

var dgram = require('dgram'); // UDP Broadcasting library

var services = {};
if (!isLightweightMobile) {
    services.networkInterface = require('network-interfaces');
}

services.ips = {activeInterface: null, tempActiveInterface: null, interfaces: {}};
services.ip = null;
services.updateAllObjcts = function (ip) {
    console.log('updating all objects with new IP: ', ip);
    for (let key in objects) {
        objects[key].ip = ip;
    }
};
services.getIP = function () {
    this.ips.interfaces = {};
    // if this is mobile, only allow local interfaces
    if (isLightweightMobile || isStandaloneMobile) {
        this.ips.interfaces['mobile'] = '127.0.0.1';
        this.ips.activeInterface = 'mobile';
        return '127.0.0.1';
    }

    // Get All available interfaces
    let interfaceNames;
    try {
        interfaceNames = this.networkInterface.getInterfaces({ipVersion: 4});
    } catch (e) {
        console.error('getInterfaces failed', e);
        return this.ip;
    }

    for (let key in interfaceNames) {
        let tempIps = this.networkInterface.toIps(interfaceNames[key], {ipVersion: 4});
        for (let key2 in tempIps) if (tempIps[key2] === '127.0.0.1') tempIps.splice(key2, 1);
        this.ips.interfaces[interfaceNames[key]] = tempIps[0];
    }

    // if activeInterface is empty, read from storage and check if it exists in found interfaces
    if (storage.getItemSync('activeNetworkInterface') !== undefined && this.ips.activeInterface === null) {
        var storedIPS = null;
        storedIPS = storage.getItemSync('activeNetworkInterface');
        if (storedIPS in this.ips.interfaces) {
            this.ips.activeInterface = storedIPS;
        }
    }

    // if it is still empty give it a default
    if (this.ips.activeInterface === null) {
        console.warn('No active interface found, defaulting to "en0"');
        this.ips.activeInterface = 'en0';
        // make sure all objects got the memo
        this.updateAllObjcts(this.ips.interfaces[this.ips.activeInterface]);
    }

    // if activeInterface is not available, get the first available one and refresh all objects
    if (!(this.ips.activeInterface in this.ips.interfaces)) {
        console.warn(`Current activeInterface "${this.ips.activeInterface}" not found`);
        this.ips.tempActiveInterface = this.ips.activeInterface;
        for (var tempKey in this.ips.interfaces) {
            if (!this.ips.interfaces[tempKey]) {
                continue;
            }
            console.warn(`Selecting "${tempKey}" from`, this.ips.interfaces);
            this.ips.activeInterface = tempKey;
            // make sure all objects got the memo
            this.updateAllObjcts(this.ips.interfaces[this.ips.activeInterface]);
            break;
        }
    }

    // check if active interface is back
    if (this.ips.tempActiveInterface) {
        if (this.ips.tempActiveInterface in this.ips.interfaces) {
            console.warn(`Activating temp interface "${this.ips.tempActiveInterface}"`);
            this.ips.activeInterface = this.ips.tempActiveInterface;
            this.ips.tempActiveInterface = null;
        }
    }
    // return active IP
    return this.ips.interfaces[this.ips.activeInterface];
};

exports.getIP = services.getIP.bind(services);

services.ip = services.getIP(); //ip.address();

var bodyParser = require('body-parser');  // body parsing middleware
var express = require('express'); // Web Sever library

// Default back to old realityObjects dir if it exists
if (!fs.existsSync(objectsPath) &&
    objectsPath === spatialToolboxPath &&
    fs.existsSync(oldRealityObjectsPath)) {
    console.warn('Please rename your realityobjects directory to spatialToolbox');
    objectsPath = oldRealityObjectsPath;
}

// create objects folder at objectsPath if necessary
if (!fs.existsSync(objectsPath)) {
    console.log('created objects directory at ' + objectsPath);
    fs.mkdirSync(objectsPath);
}

var identityFolderName = '.identity';

// This file hosts the functions related to loading the set of available frames
// from the each add-ons tools directory
const AddonFrames = require('./libraries/addons/AddonFrames');
const addonFrames = new AddonFrames();
const frameFolderLoader = new AddonFolderLoader(frameLibPaths);
frameFolderLoader.calculatePathResolution();

for (const frameLibPath of frameLibPaths) {
    if (fs.existsSync(frameLibPath)) {
        addonFrames.addFramesSource(frameLibPath, identityFolderName);
    }
}

// constrution for the werbserver using express combined with socket.io
var webServer = express();

if (!isLightweightMobile) {
    webServer.set('views', 'libraries/webInterface/views');

    var exphbs = require('express-handlebars'); // View Template library
    webServer.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: 'libraries/webInterface/views/layouts',
        partialsDir: 'libraries/webInterface/views/partials'
    }));
    webServer.set('view engine', 'handlebars');
}

var http = require('http').createServer(webServer).listen(serverPort, function () {
    console.log('webserver + socket.io is listening on port', serverPort);
    checkInit('web');
});
const ToolSocket = require('toolsocket');
var io = new ToolSocket.Io.Server({server: http}); // Websocket library
var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
var formidable = require('formidable'); // Multiple file upload library
var cheerio = require('cheerio');

// use the cors cross origin REST model
webServer.use(cors());
// allow requests from all origins with '*'. TODO make it dependent on the local network. this is important for security
webServer.options('*', cors());

// Image resizing library, not available on mobile
let Jimp = null;
if (!isLightweightMobile) {
    try {
        Jimp = require('jimp');
    } catch (e) {
        console.warn('Image resizing unsupported', e);
    }
}

// additional files containing project code

// This file hosts all kinds of utilities programmed for the server
var utilities = require('./libraries/utilities');
var nodeUtilities = require('./libraries/nodeUtilities');
var recorder = require('./libraries/recorder');

// The web frontend a developer is able to see when creating new user interfaces.
var webFrontend;
if (isLightweightMobile) {
    webFrontend = require('./libraries/mobile/webFrontend');
} else {
    webFrontend = require('./libraries/webFrontend');
}

// Definition for a simple API for hardware interfaces talking to the server.
// This is used for the interfaces defined in the hardwareAPI folder.
var hardwareAPI = require('./libraries/hardwareInterfaces');

if (isLightweightMobile) {
    hardwareAPI = require('./libraries/mobile/hardwareInterfaces');
} else {
    hardwareAPI = require('./libraries/hardwareInterfaces');
}

// This file hosts the constructor and class methods for human pose objects (generated from kinect skeleton data)
const HumanPoseObject = require('./libraries/HumanPoseObject');

var git;
if (isLightweightMobile || process.env.NODE_ENV === 'test') {
    git = null;
} else {
    git = require('./libraries/gitInterface');
}

// Set web frontend debug to inherit from global debug
webFrontend.debug = globalVariables.debug;

// Controller imports
const blockController = require('./controllers/block.js');
const blockLinkController = require('./controllers/blockLink.js');
const frameController = require('./controllers/frame.js');
const linkController = require('./controllers/link.js');
const logicNodeController = require('./controllers/logicNode.js');
const nodeController = require('./controllers/node.js');
const objectController = require('./controllers/object.js');
const spatialController = require('./controllers/spatial');

/**********************************************************************************************************************
 ******************************************** Constructors ************************************************************
 **********************************************************************************************************************/
const Frame = require('./models/Frame.js');
const Node = require('./models/Node.js');
const ObjectModel = require('./models/ObjectModel.js');
const ObjectSocket = require('./models/ObjectSocket.js');

/**
 * Various communication protocols used by the reality editor
 */
function Protocols() {
    this.R2 = {
        objectData: {},
        buffer: {},
        blockString: '',
        send: function (object, frame, node, logic, data) {
            return JSON.stringify({object: object, frame: frame, node: node, logic: logic, data: data});
        },
        // process the data received by a node
        receive: function (message) {
            if (!message) return null;
            var msgContent = typeof message === 'string' ? JSON.parse(message) : message;
            if (!msgContent.object) return null;
            if (!msgContent.frame) return null;
            if (!msgContent.node) return null;
            if (!msgContent.logic && msgContent.logic !== 0) msgContent.logic = false;
            if (!msgContent.data) return null;

            if (doesObjectExist(msgContent.object)) {

                var foundNode = getNode(msgContent.object, msgContent.frame, msgContent.node);
                if (foundNode) {

                    // if the node is a Logic Node, process the blocks/links inside of it
                    if (msgContent.logic === 0 || msgContent.logic === 1 || msgContent.logic === 2 || msgContent.logic === 3) {
                        this.blockString = 'in' + msgContent.logic;
                        if (foundNode.blocks) {
                            if (this.blockString in foundNode.blocks) {
                                this.objectData = foundNode.blocks[this.blockString];

                                for (let key in msgContent.data) {
                                    this.objectData.data[0][key] = msgContent.data[key];
                                }

                                this.buffer = foundNode;

                                // this needs to be at the beginning;
                                if (!this.buffer.routeBuffer)
                                    this.buffer.routeBuffer = [0, 0, 0, 0];

                                this.buffer.routeBuffer[msgContent.logic] = msgContent.data.value;

                                engine.blockTrigger(msgContent.object, msgContent.frame, msgContent.node, this.blockString, 0, this.objectData);
                                // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
                            }
                        }

                    } else { // otherwise this is a regular node so just continue to send the data to any linked nodes
                        this.objectData = foundNode;

                        for (let key in msgContent.data) {
                            this.objectData.data[key] = msgContent.data[key];
                        }
                        engine.trigger(msgContent.object, msgContent.frame, msgContent.node, this.objectData);
                        // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
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

            // return null if we can't even find the object it belongs to
            return null;
        }
    };
    this.R1 = {
        send: function (object, node, data) {
            return JSON.stringify({object: object, node: node, data: data});
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = typeof message === 'string' ? JSON.parse(message) : message;
            if (!msgContent.object) return null;
            if (!msgContent.node) return null;
            if (!msgContent.data) return null;

            var foundNode = getNode(msgContent.object, msgContent.frame, msgContent.node);
            if (foundNode) {
                for (let key in foundNode.data) {
                    foundNode.data[key] = msgContent.data[key];
                }
                engine.trigger(msgContent.object, msgContent.object, msgContent.node, foundNode);
                return {object: msgContent.object, node: msgContent.node, data: foundNode};
            }

            return null;
        }
    };
    /**
     * @deprecated - the old protocol hasn't been tested in a long time, might not work
     */
    this.R0 = {
        send: function (object, node, data) {
            return JSON.stringify({obj: object, pos: node, value: data.value, mode: data.mode});
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = typeof message === 'string' ? JSON.parse(message) : message;
            if (!msgContent.obj) return null;
            if (!msgContent.pos) return null;
            if (!msgContent.value) msgContent.value = 0;
            if (!msgContent.mode) return null;

            if (msgContent.obj in objects) {
                if (msgContent.pos in objects[msgContent.obj].nodes) {

                    var objectData = objects[msgContent.obj].frames[msgContent.object].nodes[msgContent.pos];

                    objectData.data.value = msgContent.value;
                    objectData.data.mode = msgContent.mode;

                    engine.trigger(msgContent.object, msgContent.object, msgContent.node, objectData);

                    return {object: msgContent.obj, node: msgContent.pos, data: objectData};
                }

            }
            return null;
        }
    };
}

/**********************************************************************************************************************
 ******************************************** Variables and Objects ***************************************************
 **********************************************************************************************************************/

// This variable will hold the entire tree of all objects and their sub objects.
var objects = {};

const availableModules = require('./libraries/availableModules');

const nodeFolderLoader = new AddonFolderLoader(nodePaths);
const nodeTypeModules = nodeFolderLoader.loadModules();   // Will hold all available data point interfaces
availableModules.setNodes(nodeTypeModules);

const blockFolderLoader = new AddonFolderLoader(blockPaths);
const blockModules = blockFolderLoader.loadModules();   // Will hold all available data point interfaces
availableModules.setBlocks(blockModules);

var hardwareInterfaceModules = {}; // Will hold all available hardware interfaces.
var hardwareInterfaceLoader = null;
// A list of all objects known and their IPs in the network. The objects are found via the udp heart beat.
// If a new link is linking to another objects, this knownObjects list is used to establish the connection.
// This list is also used to keep track of the actual IP of an object. If the IP of an object in a network changes,
// It has no influance on the connectivity, as it is referenced by the object UUID through the entire time.
var protocols = new Protocols();
var knownObjects = {};
exports.knownObjects = knownObjects;
// A lookup table used to process faster through the objects.
var objectLookup = {};
// This list holds all the socket connections that are kept alive. Socket connections are kept alive if a link is
// associated with this object. Once there is no more link the socket connection is deleted.
var socketArray = {};     // all socket connections that are kept alive

var realityEditorSocketArray = {};     // all socket connections that are kept alive
var realityEditorBlockSocketArray = {};     // all socket connections that are kept alive
var realityEditorUpdateSocketArray = {};    // all socket connections to keep UIs in sync (frame position, etc)
var realityEditorCameraMatrixSocketArray = {};    // all socket connections to notify clients of each other's position
var realityEditorObjectMatrixSocketArray = {};    // all socket connections to keep object world positions in sync

var activeHeartbeats = {}; // Prevents multiple recurring beats for the same object

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

var worldObjectName = '_WORLD_';
if (isLightweightMobile || isStandaloneMobile) {
    worldObjectName += 'local';
}
var worldObject;

const SceneGraph = require('./libraries/sceneGraph/SceneGraph');
const sceneGraph = new SceneGraph(true);
const WorldGraph = require('./libraries/sceneGraph/WorldGraph');
const worldGraph = new WorldGraph(sceneGraph);

/**********************************************************************************************************************
 ******************************************** Initialisations *********************************************************
 **********************************************************************************************************************/


console.log('Starting the Server');
console.log('Initialize System: ');
console.log('Loading Hardware interfaces');


var hardwareAPICallbacks = {
    publicData: function (objectKey, frameKey, nodeKey) {
        socketHandler.sendPublicDataToAllSubscribers(objectKey, frameKey, nodeKey);
    },
    actions: function (thisAction) {
        utilities.actionSender(thisAction);
    },
    data: function (objectKey, frameKey, nodeKey, data, _objects, _nodeTypeModules) {
        //these are the calls that come from the objects before they get processed by the object engine.
        // send the saved value before it is processed
        sendMessagetoEditors({
            object: objectKey,
            frame: frameKey,
            node: nodeKey,
            data: data
        });
        hardwareAPI.readCall(objectKey, frameKey, nodeKey, getNode(objectKey, frameKey, nodeKey).data);
        engine.trigger(objectKey, frameKey, nodeKey, getNode(objectKey, frameKey, nodeKey));
    },
    write: function (objectID) {
        utilities.writeObjectToFile(objects, objectID, objectsPath, globalVariables.saveToDisk);
    }
};
// set all the initial states for the Hardware Interfaces in order to run with the Server.
hardwareAPI.setup(objects, objectLookup, knownObjects, socketArray, globalVariables, __dirname, objectsPath, nodeTypeModules, blockModules, services, version, protocol, serverPort, hardwareAPICallbacks, sceneGraph, worldGraph);

nodeUtilities.setup(objects, sceneGraph, knownObjects, socketArray, globalVariables, hardwareAPI, objectsPath, linkController);

console.log('Done');

console.log('Loading Objects');
// This function will load all the Objects
loadObjects();
console.log('Done loading objects');
if (globalVariables.worldObject) {
    loadWorldObject();
}
console.log('Done loading world object');

startSystem();
console.log('started');

// Get the directory names of all available sources for the 3D-UI
if (!isLightweightMobile) {
    hardwareInterfaceLoader = new AddonFolderLoader(hardwareInterfacePaths);
    hardwareInterfaceModules = hardwareInterfaceLoader.loadModules();
    availableModules.setHardwareInterfaces(hardwareInterfaceModules);

    // statically serve the "public" directory in each hardware interface
    for (let folderName in hardwareInterfaceLoader.folderMap) {
        let publicPath = path.join(hardwareInterfaceLoader.folderMap[folderName], folderName, 'public');
        webServer.use('/hardwareInterface/' + folderName + '/public', express.static(publicPath));
    }
}

console.log('ready to start internal servers');

hardwareAPI.reset();

console.log('found ' + Object.keys(hardwareInterfaceModules).length + ' enabled hardware interfaces');
console.log('starting internal Server.');

// This function calls an initialization callback that will help hardware interfaces to start after the entire system
// is initialized.

/**
 * Returns the file extension (portion after the last dot) of the given filename.
 * If a file name starts with a dot, returns an empty string.
 *
 * @author VisioN @ StackOverflow
 * @param {string} fileName - The name of the file, such as foo.zip
 * @return {string} The lowercase extension of the file, such has "zip"
 */
function getFileExtension(fileName) {
    return fileName.substr((~-fileName.lastIndexOf('.') >>> 0) + 2).toLowerCase();
}

/**
 * @desc Add objects from the objects folder to the system
 **/
function loadObjects() {
    console.log('Enter loadObjects');
    // check for objects in the objects folder by reading the objects directory content.
    // get all directory names within the objects directory
    var objectFolderList = fs.readdirSync(objectsPath).filter(function (file) {
        return fs.statSync(objectsPath + '/' + file).isDirectory();
    });

    // remove hidden directories
    try {
        while (objectFolderList[0][0] === '.') {
            objectFolderList.splice(0, 1);
        }
    } catch (e) {
        console.log('no hidden files', e);
    }

    for (var i = 0; i < objectFolderList.length; i++) {
        var tempFolderName = utilities.getObjectIdFromTargetOrObjectFile(objectFolderList[i], objectsPath);
        console.log('TempFolderName: ' + tempFolderName);

        if (tempFolderName !== null) {
            // fill objects with objects named by the folders in objects
            objects[tempFolderName] = new ObjectModel(services.ip, version, protocol, tempFolderName);
            objects[tempFolderName].port = serverPort;
            objects[tempFolderName].name = objectFolderList[i];

            // create first frame
            // todo this need to be checked in the system
            // objects[tempFolderName].frames[tempFolderName] = new Frame();
            //objects[tempFolderName].frames[tempFolderName].name = objectFolderList[i];

            // add object to object lookup table
            utilities.writeObject(objectLookup, objectFolderList[i], tempFolderName, globalVariables.saveToDisk);

            // try to read a saved previous state of the object
            try {
                objects[tempFolderName] = JSON.parse(fs.readFileSync(objectsPath + '/' + objectFolderList[i] + '/' + identityFolderName + '/object.json', 'utf8'));
                objects[tempFolderName].ip = services.ip; // ip.address();

                // this is for transforming old lists to new lists
                if (typeof objects[tempFolderName].objectValues !== 'undefined') {
                    objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].objectValues;
                    delete objects[tempFolderName].objectValues;
                }
                if (typeof objects[tempFolderName].objectLinks !== 'undefined') {
                    objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].objectLinks;
                    delete objects[tempFolderName].objectLinks;
                }


                if (typeof objects[tempFolderName].nodes !== 'undefined') {
                    objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].nodes;
                    delete objects[tempFolderName].nodes;
                }
                if (typeof objects[tempFolderName].links !== 'undefined') {
                    objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].links;
                    delete objects[tempFolderName].links;
                }


                if (objects[tempFolderName].frames[tempFolderName]) {
                    for (var nodeKey in objects[tempFolderName].frames[tempFolderName].nodes) {

                        if (typeof objects[tempFolderName].nodes[nodeKey].item !== 'undefined') {
                            var tempItem = objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].item;
                            objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].data = utilities.deepCopy(tempItem[0]);
                        }
                    }
                }

                // cast everything from JSON to Object, Frame, and Node classes
                let newObj = new ObjectModel(objects[tempFolderName].ip,
                    objects[tempFolderName].version,
                    objects[tempFolderName].protocol,
                    objects[tempFolderName].objectId);
                newObj.setFromJson(objects[tempFolderName]);
                objects[tempFolderName] = newObj;

                console.log('I found objects that I want to add');

            } catch (e) {
                objects[tempFolderName].ip = services.ip; //ip.address();
                objects[tempFolderName].objectId = tempFolderName;
                console.log('No saved data for: ' + tempFolderName, e);
            }

            // add this object to the sceneGraph
            sceneGraph.addObjectAndChildren(tempFolderName, objects[tempFolderName]);
        } else {
            console.log(' object ' + objectFolderList[i] + ' has no marker yet');
        }
        utilities.actionSender({reloadObject: {object: tempFolderName}, lastEditor: null});
    }

    // update parents of any sceneGraph nodes to be relative to the world where they were localized
    for (let objectId in objects) {
        let thisObject = objects[objectId];
        if (thisObject.worldId && typeof objects[thisObject.worldId] !== 'undefined') {
            sceneGraph.updateObjectWorldId(objectId, thisObject.worldId);
        }
        if (thisObject.deactivated) {
            sceneGraph.deactivateElement(objectId);
        }
    }

    hardwareAPI.reset();

    sceneGraph.recomputeGraph();
    // console.log(sceneGraph.graph);
}


var executeSetups = function () {

    for (let objectKey in objects) {
        for (let frameKey in objects[objectKey].frames) {
            var thisFrame = objects[objectKey].frames[frameKey];
            for (let nodeKey in thisFrame.nodes) {
                for (let blockKey in thisFrame.nodes[nodeKey].blocks) {
                    var thisBlock = objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[blockKey];
                    if (blockModules[thisBlock.type]) {
                        blockModules[thisBlock.type].setup(
                            objectKey, frameKey, nodeKey, blockKey, thisBlock,
                            function (object, frame, node, block, index, thisBlockCb) {
                                engine.processBlockLinks(object, frame, node, block, index, thisBlockCb);
                            }
                        );
                    }
                }
            }
        }
    }
};
executeSetups();

/**
 * Initialize worldObject to contents of spatialToolbox/_WORLD_local/.identity/object.json
 * Create the json file if doesn't already exist
 */
function loadWorldObject() {

    // create the file for it if necessary
    var folder = path.join(objectsPath, worldObjectName);
    var identityPath = path.join(folder, '.identity');
    var jsonFilePath = path.join(folder, 'object.json');

    // create objects folder at objectsPath if necessary
    if (globalVariables.saveToDisk && !fs.existsSync(folder)) {
        console.log('created worldObject directory at ' + folder);
        fs.mkdirSync(folder);
    }

    // create a /.identity folder within it to hold the object.json data
    if (globalVariables.saveToDisk && !fs.existsSync(identityPath)) {
        console.log('created worldObject identity at ' + identityPath);
        fs.mkdirSync(identityPath);
    }

    // create a new world object
    let thisWorldObjectId = (isLightweightMobile || isStandaloneMobile) ? worldObjectName : (worldObjectName + utilities.uuidTime());
    worldObject = new ObjectModel(services.ip, version, protocol, thisWorldObjectId);
    worldObject.port = serverPort;
    worldObject.name = worldObjectName;
    worldObject.isWorldObject = true;

    // try to read previously saved data to overwrite the default world object
    if (globalVariables.saveToDisk) {
        try {
            worldObject = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            console.log('Loaded world object for server: ' + services.ip);
        } catch (e) {
            console.log('No saved data for world object on server: ' + services.ip, e);
        }
    }

    worldObject.ip = services.ip;
    worldObject.port = serverPort;

    objects[worldObject.objectId] = worldObject;

    hardwareAPI.reset();

    if (globalVariables.saveToDisk) {

        fs.writeFile(jsonFilePath, JSON.stringify(worldObject, null, 4), function (err) {
            if (err) {
                console.log('worldObject save error', err);
            } else {
                //console.log('JSON saved to ' + jsonFilePath);
            }
        });
    } else {
        console.log('I am not allowed to save');
    }
}


function loadAnchor(anchorName) {

    // create the file for it if necessary
    var folder = path.join(objectsPath, anchorName);
    var identityPath = path.join(folder, '.identity');
    var jsonFilePath = path.join(identityPath, 'object.json');
    let anchorUuid = anchorName + utilities.uuidTime();

    // create objects folder at objectsPath if necessary
    if (globalVariables.saveToDisk && !fs.existsSync(folder)) {
        console.log('created anchor directory at ' + folder);
        fs.mkdirSync(folder);
    }

    // create a /.identity folder within it to hold the object.json data
    if (globalVariables.saveToDisk && !fs.existsSync(identityPath)) {
        console.log('created anchor identity at ' + identityPath);
        fs.mkdirSync(identityPath);
    }


    // try to read previously saved data to overwrite the default anchor object
    if (globalVariables.saveToDisk) {
        try {
            let anchor = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            anchorUuid = anchor.objectId;
            if (anchorUuid) {
                objects[anchorUuid] = anchor;
            }
            console.log('Loaded anchor object for server: ' + services.ip);
            return;
        } catch (e) {
            console.log('No saved data for anchor object on server: ' + services.ip, e);
        }
    }

    // create a new anchor object
    objects[anchorUuid] = new ObjectModel(services.ip, version, protocol, anchorUuid);
    objects[anchorUuid].port = serverPort;
    objects[anchorUuid].name = anchorName;

    objects[anchorUuid].isAnchor = false;
    objects[anchorUuid].matrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    objects[anchorUuid].tcs = 0;

    if (globalVariables.saveToDisk) {
        fs.writeFileSync(jsonFilePath, JSON.stringify(objects[anchorUuid], null, 4));
        // console.log('JSON saved to ' + jsonFilePath);
        objectBeatSender(beatPort, anchorUuid, objects[anchorUuid].ip);
        hardwareAPI.reset();
    } else {
        console.log('I am not allowed to save');
        objectBeatSender(beatPort, anchorUuid, objects[anchorUuid].ip);
        hardwareAPI.reset();
    }

    // store in lookup table so we can correctly change ID if target data is later uploaded
    utilities.writeObject(objectLookup, anchorName, anchorUuid);

    sceneGraph.addObjectAndChildren(anchorUuid, objects[anchorUuid]);
}

function setAnchors() {
    let hasValidWorldObject = false;

    // load all object folders
    let tempFiles = fs.readdirSync(objectsPath).filter(function (file) {
        return fs.statSync(path.join(objectsPath, file)).isDirectory();
    });
    // remove hidden directories
    while (tempFiles.length > 0 && tempFiles[0][0] === '.') {
        tempFiles.splice(0, 1);
    }

    // populate all objects folders with object.json files.
    tempFiles.forEach(function (objectKey) {

        if (objectKey.indexOf('_WORLD_') === -1) {

            let thisObjectKey = null;
            let tempKey = utilities.getObjectIdFromTargetOrObjectFile(objectKey, objectsPath); // gets the object id from the xml target file
            if (tempKey) {
                thisObjectKey = tempKey;
            } else {
                thisObjectKey = objectKey;
            }

            if (!(thisObjectKey in objects)) {
                loadAnchor(objectKey);
            }
        }
    });


    // check if there is an initialized World Object
    for (let key in objects) {
        if (objects[key].isWorldObject) {
            // check if the object is correctly initialized with tracking targets
            let datExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.dat'));
            let xmlExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.xml'));
            let jpgExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.jpg'));

            if ((xmlExists && datExists && jpgExists) || (xmlExists && jpgExists)) {
                hasValidWorldObject = true;
            }
            break;
        }
    }

    // check if there are uninitialized objects and turn them into anchors if an initialized world object exists.
    for (let key in objects) {
        objects[key].isAnchor = false;
        if (!(objects[key].isWorldObject || objects[key].type === 'world' || objects[key].type === 'human' || objects[key].type === 'avatar')) {
            // check if the object is correctly initialized with tracking targets
            let datExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.dat'));
            let xmlExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.xml'));
            let jpgExists = fs.existsSync(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.jpg'));

            if (!(xmlExists && (datExists || jpgExists))) {
                if (hasValidWorldObject) {
                    objects[key].isAnchor = true;
                    objects[key].tcs = 0;
                    continue;
                }
            }
        }
    }
}

function removeAvatars() {
    let objectsToDelete = [];

    // load all object folders
    let tempFiles = fs.readdirSync(objectsPath).filter(function (file) {
        return fs.statSync(path.join(objectsPath, file)).isDirectory();
    });
    // remove hidden directories
    while (tempFiles.length > 0 && tempFiles[0][0] === '.') {
        tempFiles.splice(0, 1);
    }

    // populate all objects folders with object.json files.
    tempFiles.forEach(function (objectKey) {
        if (objectKey.includes('_AVATAR_')) {
            objectsToDelete.push(objectKey);
        }
    });
    
    objectsToDelete.forEach(objectKey => {
        console.log('deleting object: ' + objectKey);
        fs.rmSync(path.join(objectsPath, objectKey), { recursive: true });
    });
}

/**********************************************************************************************************************
 ******************************************** Starting the System ******************************************************
 **********************************************************************************************************************/

/**
 * @desc starting the system
 **/

function startSystem() {
    // delete each object that represented a client that was connected to the server in its last session
    removeAvatars();

    // make sure that the system knows about the state of anchors.
    setAnchors();

    // generating a udp heartbeat signal for every object that is hosted in this device
    for (let key in objects) {
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

    recorder.initRecorder(objects);
}

/**********************************************************************************************************************
 ******************************************** Stopping the System *****************************************************
 **********************************************************************************************************************/

function exit() {
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
    if (isLightweightMobile) {
        return;
    }

    if (typeof oneTimeOnly === 'undefined') {
        oneTimeOnly = false;
    }

    if (!oneTimeOnly && activeHeartbeats[thisId]) {
        console.log('already created beat for object: ' + thisId);
        return;
    }

    var HOST = '255.255.255.255';

    //console.log('creating beat for object: ' + thisId);
    objects[thisId].version = version;
    objects[thisId].protocol = protocol;
    objects[thisId].port = serverPort;

    var thisVersionNumber = parseInt(objects[thisId].version.replace(/\./g, ''));

    // try re-generating checksum if it doesn't exist - in some cases it gets corrupted and beats won't send
    if (!objects[thisId].tcs) {
        let targetDir = path.join(objectsPath, objects[thisId].name, identityFolderName, 'target');
        let jpgPath = path.join(targetDir, 'target.jpg');
        let datPath = path.join(targetDir, 'target.dat');
        let xmlPath = path.join(targetDir, 'target.xml');
        let glbPath = path.join(targetDir, 'target.glb');
        let tdtPath = path.join(targetDir, 'target.3dt');
        var fileList = [jpgPath, xmlPath, datPath, glbPath, tdtPath];
        objects[thisId].tcs = utilities.generateChecksums(objects, fileList);
        console.log('regenerated checksum for ' + thisId + ': ' + objects[thisId].tcs);
    }

    // if no target files exist, checksum will be undefined, so mark with checksum 0 (anchors have this)
    if (typeof objects[thisId].tcs === 'undefined') {
        objects[thisId].tcs = 0;
    }

    // Objects
    //  console.log('with version number: ' + thisVersionNumber);

    // json string to be sent
    const messageStr = JSON.stringify({
        id: thisId,
        ip: services.ip,
        port: serverPort,
        vn: thisVersionNumber,
        pr: protocol,
        tcs: objects[thisId].tcs,
        zone: objects[thisId].zone || '',
    });

    if (globalVariables.debug) console.log('UDP broadcasting on port', PORT);
    if (globalVariables.debug) console.log('Sending beats... Content', messageStr);

    // creating the datagram
    var client = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(timeToLive);
        client.setMulticastTTL(timeToLive);
    });

    if (!oneTimeOnly) {
        activeHeartbeats[thisId] = setInterval(function () {
            // send the beat#
            if (thisId in objects && !objects[thisId].deactivated) {
                // console.log("Sending beats... Content: " + JSON.stringify({ id: thisId, ip: thisIp, vn:thisVersionNumber, tcs: objects[thisId].tcs}));
                let zone = '';
                if (objects[thisId].zone) zone = objects[thisId].zone;
                if (!objects[thisId].hasOwnProperty('port')) objects[thisId].port = serverPort;

                services.ip = services.getIP();

                const message = Buffer.from(JSON.stringify({
                    id: thisId,
                    ip: services.ip,
                    port: serverPort,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone: zone
                }));
                if (objects[thisId].tcs || objects[thisId].isAnchor) {
                    client.send(message, 0, message.length, PORT, HOST, function (err) {
                        if (err) {
                            console.log('You\'re not on a network. Can\'t send anything', err);
                            //throw err;
                            for (var key in objects) {
                                objects[key].ip = services.ip;
                            }
                        }
                        // client is not being closed, as the beat is send ongoing
                    });
                }
            }
        }, beatInterval + utilities.randomIntInc(-250, 250));
    } else {
        // Single-shot, one-time heartbeat
        // delay the signal with timeout so that not all objects send the beat in the same time.
        setTimeout(function () {
            // send the beat
            if (thisId in objects && !objects[thisId].deactivated) {

                let zone = '';
                if (objects[thisId].zone) zone = objects[thisId].zone;
                if (!objects[thisId].hasOwnProperty('port')) objects[thisId].port = serverPort;

                services.ip = services.getIP();

                var message = Buffer.from(JSON.stringify({
                    id: thisId,
                    ip: services.ip,
                    port: serverPort,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone: zone
                }));
                client.send(message, 0, message.length, PORT, HOST, function (err) {
                    if (err) throw err;
                    // close the socket as the function is only called once.
                    client.close();
                });
            }
        }, utilities.randomIntInc(1, 250));
    }
}

/**********************************************************************************************************************
 ******************************************** Server Objects **********************************************************
 **********************************************************************************************************************/

/**
 * @desc Receives a Heartbeat broadcast via UDP in the local network and updates the knownObjects Array in case of a
 * new object
 * @note if action "ping" is received, the object calls a heartbeat that is send one time.
 **/

services.ip = services.getIP(); //ip.address();

function handleActionMessage(action) {
    if (action === 'ping') {
        for (let key in objects) {
            objectBeatSender(beatPort, key, objects[key].ip, true);
        }
        return;
    }
    if (action.type === 'SceneGraphEventMessage') {
        if (action.ip === services.getIP()) { // UDP also broadcasts to yourself
            return;
        }
        worldGraph.handleMessage(action);
    }
}

function objectBeatServer() {
    if (isLightweightMobile) {
        return;
    }

    // creating the udp server
    var udpServer = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });
    udpServer.on('error', function (err) {
        console.log('server error', err);
        udpServer.close();
    });

    udpServer.on('message', function (msg) {

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
                knownObjects[msgContent.id].protocol = 'R0';
            }

            if (msgContent.ip)
                knownObjects[msgContent.id].ip = msgContent.ip;

            console.log('I found new Objects: ' + JSON.stringify(knownObjects[msgContent.id]));

            // each time we discover a new object from another, also get the scene graph from that server
            getKnownSceneGraph(msgContent.ip);
        }
        // check if action 'ping'
        if (msgContent.action) {
            handleActionMessage(msgContent.action);
        }

        if (typeof msgContent.matrixBroadcast !== 'undefined') {
            // if (Object.keys(msgContent.matrixBroadcast).length > 0) {
            // console.log(msgContent.matrixBroadcast);
            hardwareAPI.triggerMatrixCallbacks(msgContent.matrixBroadcast);
            // }
        } else {
            hardwareAPI.triggerUDPCallbacks(msgContent);
        }

    });

    udpServer.on('listening', function () {
        var address = udpServer.address();
        console.log('UDP listening on port: ' + address.port);
        checkInit('udp');
    });

    // bind the udp server to the udp beatPort

    udpServer.bind(beatPort);
}

async function getKnownSceneGraph(ip, port) {
    // 1. check if we already have an up-to-date sceneGraph from this server
    let needsThisGraph = true;
    if (!needsThisGraph) {
        return;
    } // TODO: implement placeholder

    // 2. if not, make an HTTP GET request to the other server's /spatial/sceneGraph endpoint to get it
    const url = 'http://' + ip + ':' + (port || 8080) + '/spatial/sceneGraph';
    let response = null;
    try {
        response = await utilities.httpGet(url);
    } catch (e) {
        console.warn('error awaiting /spatial/sceneGraph', e);
        return;
    }

    // 3. parse the results and add it as a known scene graph
    var thatSceneGraph = typeof response === 'string' ? JSON.parse(response) : response;
    console.log('Discovered scene graph from server ' + ip + ' with keys:');
    // console.log(Object.keys(thatSceneGraph));

    // 4. create a method to compile all known scene graphs with this server's graph to be visualized
    worldGraph.addKnownGraph(ip, thatSceneGraph);
}

var ip_regex = /(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?::(\d+))?/ig;
var ip_regex2 = /(\d+)\.(\d+)\.(\d+)\.(\d+)/;

// Parse the ip string into an object containing it's parts
var parseIpSpace = function (ip_string) {

    // Use Regex to get the parts of the ip address
    var ip_parts = ip_regex.exec(ip_string);
    var ip_parts2 = ip_regex2.exec(ip_string);
    // Set ip address if the regex executed successfully
    var thisresult = '';

    if (ip_parts && ip_parts.length > 6) {
        thisresult = [parseInt(ip_parts[1]), parseInt(ip_parts[2]), parseInt(ip_parts[3]), parseInt(ip_parts[4])];
    } else if (ip_parts2 && ip_parts2.length > 3) {
        thisresult = [parseInt(ip_parts2[1]), parseInt(ip_parts2[2]), parseInt(ip_parts2[3]), parseInt(ip_parts2[4])];
    } else if (ip_string === '::1') {
        thisresult = [127, 0, 0, 1];
    }
    // Return object
    return thisresult;
};

function objectWebServer() {
    services.ip = services.getIP(); // ip.address();
    // security implemented

    // check all server requests for being inside the netmask parameters.
    // the netmask is set to local networks only.

    webServer.use('*', function (req, res, next) {

        var remoteIP = parseIpSpace(req.ip);
        var localIP = parseIpSpace(services.ip);
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

        checkThisNetwork = true;
        if (services.ips.activeInterface in services.ips.interfaces) {
            if (checkThisNetwork) {
                next();
            } else {
                res.status(403).send('Error 400: Forbidden. The requested page may be only available in a local network.');
            }
        } else {
            next();
        }
    });
    // define the body parser
    webServer.use(bodyParser.urlencoded({
        extended: true
    }));
    webServer.use(bodyParser.json());
    // define a couple of static directory routs

    webServer.use('/objectDefaultFiles', express.static(__dirname + '/libraries/objectDefaultFiles/'));

    const LocalUIApp = require('./libraries/LocalUIApp.js');
    const uiPath = path.join(__dirname, '../vuforia-spatial-toolbox-userinterface');
    const alternativeUiPath = path.join(__dirname, '../userinterface'); // for backwards compatibility
    const selectedUiPath = fs.existsSync(uiPath) ? uiPath : alternativeUiPath;
    console.log('SELECTED UI PATH: ' + selectedUiPath);
    const localUserInterfaceApp = new LocalUIApp(selectedUiPath, addonFolders);
    localUserInterfaceApp.setup();
    localUserInterfaceApp.listen(serverUserInterfaceAppPort);

    // webServer.use('/frames', express.static(__dirname + '/libraries/frames/'));

    webServer.use('/frames/:frameName', function (req, res, next) {

        if (!utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid frame name. Must be alphanumeric.');
            console.log(req.params.frameName);
            return;
        }

        var urlArray = req.originalUrl.split('/');
        const frameLibPath = frameFolderLoader.resolvePath(req.params.frameName);
        if (!frameLibPath) {
            next();
            return;
        }
        var fileName = path.join(frameLibPath, req.originalUrl.split('/frames/')[1]); //__dirname + '/libraries' + req.originalUrl;

        if (!fs.existsSync(fileName)) {
            next();
            return;
        }

        // Non HTML files just get sent normally
        if (urlArray[urlArray.length - 1].indexOf('html') === -1) {
            res.sendFile(fileName);
            return;
        }

        // HTML files get object.js injected
        var html = fs.readFileSync(fileName, 'utf8');

        // remove any hard-coded references to object.js (or object-frames.js) and pep.min.js
        html = html.replace('<script src="object.js"></script>', '');
        html = html.replace('<script src="../resources/object.js"></script>', '');
        html = html.replace('<script src="objectDefaultFiles/object.js"></script>', '');

        html = html.replace('<script src="object-frames.js"></script>', '');
        html = html.replace('<script src="../resources/object-frames.js"></script>', '');
        html = html.replace('<script src="objectDefaultFiles/object-frames.js"></script>', '');

        html = html.replace('<script src="../resources/pep.min.js"></script>', '');
        html = html.replace('<script src="objectDefaultFiles/pep.min.js"></script>', '');

        var level = '../';
        for (var i = 0; i < urlArray.length - 3; i++) {
            level += '../';
        }

        html = html.replace('objectDefaultFiles/envelope.js', level + 'objectDefaultFiles/envelope.js');
        html = html.replace('objectDefaultFiles/envelopeContents.js', level + 'objectDefaultFiles/envelopeContents.js');

        html = html.replace('objectDefaultFiles/gl-worker.js', level + 'objectDefaultFiles/gl-worker.js');

        var loadedHtml = cheerio.load(html);
        var scriptNode = '<script src="' + level + 'objectDefaultFiles/object.js"></script>';
        scriptNode += '<script src="' + level + 'objectDefaultFiles/pep.min.js"></script>';

        // inject the server IP address, but don't inject the objectKey and frameKey, as those come from the editor
        scriptNode += '<script> realityObject.serverIp = "' + services.ip + '"</script>';//ip.address()
        loadedHtml('head').prepend(scriptNode);
        res.send(loadedHtml.html());

    });

    webServer.use('/logicNodeIcon', function (req, res) {
        var urlArray = req.originalUrl.split('/');
        console.log('logicNodeIcon urlArray', urlArray);
        var objectName = urlArray[2];
        var fileName = objectsPath + '/' + objectName + '/' + identityFolderName + '/logicNodeIcons/' + urlArray[3];
        if (!fs.existsSync(fileName)) {
            res.sendFile(__dirname + '/libraries/emptyLogicIcon.png'); // default to blank image if not custom saved yet
            return;
        }
        res.sendFile(fileName);
    });

    webServer.use('/mediaFile', function (req, res) {
        var urlArray = req.originalUrl.split('/');

        var objectId = urlArray[2];
        if (!getObject(objectId)) {
            res.status(404).send('object ' + objectId + ' not found');
            return;
        }

        var objectName = getObject(objectId).name;
        var fileName = objectsPath + '/' + objectName + '/' + identityFolderName + '/mediaFiles/' + urlArray[3];
        if (!fs.existsSync(fileName)) {
            res.sendFile(__dirname + '/libraries/emptyLogicIcon.png'); // default to blank image if not found
            return;
        }
        res.sendFile(fileName);
    });

    webServer.use('/obj', function (req, res, next) {

        var urlArray = req.originalUrl.split('/');
        urlArray.splice(0, 1);
        urlArray.splice(0, 1);
        if (urlArray[1] === 'frames') {
            let objectKey = utilities.readObject(objectLookup, urlArray[0]);
            let frameKey = utilities.readObject(objectLookup, urlArray[0]) + urlArray[2];
            let thisFrame = getFrame(objectKey, frameKey);

            var toolpath = null;

            if (thisFrame !== null) {
                if (thisFrame.hasOwnProperty('tool')) {
                    if (thisFrame.tool.hasOwnProperty('addon') && thisFrame.tool.hasOwnProperty('interface') && thisFrame.tool.hasOwnProperty('tool')) {
                        toolpath = __dirname + '/addons/' + thisFrame.tool.addon + '/interfaces/' + thisFrame.tool.interface + '/tools/' + thisFrame.tool.tool;
                    }
                }
            }

            urlArray.splice(1, 1);
        }

        var switchToInteraceTool = true;
        if (!toolpath) switchToInteraceTool = false;

        let filename = urlArray[urlArray.length - 1];
        let targetFiles = [
            'target.dat',
            'target.jpg',
            'target.xml',
            'target.glb',
            'target.unitypackage',
            'target.3dt',
        ];

        if (targetFiles.includes(filename) && urlArray[urlArray.length - 2] === 'target') {
            urlArray[urlArray.length - 2] = identityFolderName + '/target';
            switchToInteraceTool = false;
        }

        if ((filename === 'memory.jpg' || filename === 'memoryThumbnail.jpg')
            && urlArray[urlArray.length - 2] === 'memory') {
            urlArray[urlArray.length - 2] = identityFolderName + '/memory';
            switchToInteraceTool = false;
        }

        if ((urlArray[urlArray.length - 2] === 'videos') && filename.split('.').pop() === 'mp4') {
            // videoDir differs on mobile due to inability to call mkdir
            if (!isLightweightMobile) {
                urlArray[urlArray.length - 2] = identityFolderName + '/videos';
            } else {
                try {
                    res.sendFile(filename, {
                        root: utilities.getVideoDir(objectsPath, identityFolderName, isLightweightMobile),
                    });
                } catch (e) {
                    console.warn('error sending video file', e);
                }
                return;
            }

            switchToInteraceTool = false;
        }

        var newUrl = '';
        var newToolUrl = '';
        for (let i = 0; i < urlArray.length; i++) {
            newUrl += '/' + urlArray[i];
        }

        if (toolpath !== null) {
            for (let i = 2; i < urlArray.length; i++) {
                newToolUrl += '/' + urlArray[i];
            }
        }

        if (newUrl.slice(-1) === '/') {
            newUrl += 'index.html';
            if (toolpath !== null) {
                newToolUrl += 'index.html';
            }
            urlArray.push('index.html');
        }

        // TODO: ben - may need to update objectsPath if the object is a world object

        if ((req.method === 'GET') && (req.url.slice(-1) === '/' || urlArray[urlArray.length - 1].match(/\.html?$/))) {
            let fileName = objectsPath + newUrl;
            let fileName2 = toolpath + newToolUrl;

            if (toolpath && switchToInteraceTool && fs.existsSync(fileName2)) fileName = fileName2;

            if (urlArray[urlArray.length - 1] !== 'index.html' && urlArray[urlArray.length - 1] !== 'index.htm') {
                if (fs.existsSync(fileName + 'index.html')) {
                    fileName = fileName + 'index.html';
                } else if (fs.existsSync(fileName + 'index.htm')) {
                    fileName = fileName + 'index.htm';
                }
            }

            if (!fs.existsSync(fileName)) {
                console.log('file is not here is it there?');
                res.send(404);
                next();
                return;
            }

            var html = fs.readFileSync(fileName, 'utf8');

            html = html.replace('<script src="object.js"></script>', '');
            html = html.replace('<script src="objectIO.js"></script>', '');
            html = html.replace('<script src="/socket.io/socket.io.js"></script>', '');

            var level = '../';
            for (let i = 0; i < urlArray.length; i++) {
                level += '../';
            }

            html = html.replace('objectDefaultFiles/envelope.js', level + 'objectDefaultFiles/envelope.js');
            html = html.replace('objectDefaultFiles/envelopeContents.js', level + 'objectDefaultFiles/envelopeContents.js');

            html = html.replace('objectDefaultFiles/gl-worker.js', level + 'objectDefaultFiles/gl-worker.js');

            var loadedHtml = cheerio.load(html);
            var scriptNode = '<script src="' + level + 'objectDefaultFiles/object.js"></script>';
            scriptNode += '<script src="' + level + 'objectDefaultFiles/pep.min.js"></script>';

            let objectKey = utilities.readObject(objectLookup, urlArray[0]);
            let frameKey = utilities.readObject(objectLookup, urlArray[0]) + urlArray[1];

            scriptNode += '\n<script> realityObject.object = "' + objectKey + '";</script>\n';
            scriptNode += '<script> realityObject.frame = "' + frameKey + '";</script>\n';
            scriptNode += '<script> realityObject.serverIp = "' + services.ip + '"</script>';//ip.address()
            loadedHtml('head').prepend(scriptNode);
            res.send(loadedHtml.html());
        } else if ((req.method === 'GET') && (req.url.slice(-1) === '/' || urlArray[urlArray.length - 1].match(/\.json?$/))) {

            let fileName = objectsPath + req.url + identityFolderName + '/object.json';

            if (!fs.existsSync(fileName)) {
                res.send(404);
                next();
                return;
            }

            var json = JSON.parse(fs.readFileSync(fileName, 'utf8'));

            // todo check if the data is still filtered with the new frames system
            for (var thisKey in json.logic) {
                for (var thisKey2 in json.nodes[thisKey].blocks) {
                    delete json.nodes[thisKey].blocks[thisKey2].privateData;
                }
            }
            res.json(json);
        } else {

            let fileName2 = toolpath + newToolUrl;
            if (toolpath && switchToInteraceTool && fs.existsSync(fileName2)) {
                res.sendFile(newToolUrl, {root: toolpath});
            } else {
                res.sendFile(newUrl, {root: objectsPath});
            }
        }
    });

    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        webServer.use('/libraries', express.static(__dirname + '/libraries/webInterface/'));
        webServer.use('/hardwareInterface/libraries', express.static(__dirname + '/libraries/webInterface/'));
        webServer.use('/libraries/monaco-editor/', express.static(__dirname + '/node_modules/monaco-editor/'));
    }

    webServer.post('/action', (req, res) => {
        const action = JSON.parse(req.body.action);
        handleActionMessage(action);
        res.send();
    });

    // Express router routes
    const objectRouter = require('./routers/object');
    const logicRouter = require('./routers/logic');
    const spatialRouter = require('./routers/spatial');
    objectRouter.setup(globalVariables);
    logicRouter.setup(globalVariables);
    spatialRouter.setup(globalVariables);
    webServer.use('/object', objectRouter.router);
    webServer.use('/logic', logicRouter.router);
    webServer.use('/spatial', spatialRouter.router);

    // receivePost blocks can be triggered with a post request. *1 is the object *2 is the logic *3 is the link id
    // abbreviated POST syntax, searches over all objects and frames to find the block with that ID
    webServer.post('/triggerBlock/:blockName', function (req, res) {
        if (!utilities.isValidId(req.params.blockName)) {
            res.status(400).send('Invalid block name. Must be alphanumeric.');
            return;
        }
        blockController.triggerBlockSearch(req.params.blockName, req.body, function (statusCode, responseContents) {
            res.status(statusCode).json(responseContents).end();
        });
    });

    // Responds with the set of Spatial Tools that this server is hosting
    webServer.get('/availableFrames/', function (req, res) {
        console.log('get available frames');
        res.json(addonFrames.getFrameList());
    });

    // sends json object for a specific reality object. * is the object name
    // ths is the most relevant for
    // ****************************************************************************************************************
    webServer.get('/availableLogicBlocks/', function (req, res) {
        console.log('get available logic blocks');
        res.json(blockController.getLogicBlockList());
    });

    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        // // TODO: ask Valentin what this route was used for?
        // webServer.post('/object/*/size/*', function (req, res) {
        //     console.log("post 1");
        //     console.log(req.params);
        //     res.send(changeSize(req.params[0], req.params[1], null, req.body));
        // });
    }

    /**
     * Send the programming interface static web content [This is the older form. Consider it deprecated.
     */
    // Version 1
    webServer.get('/obj/dataPointInterfaces/:nodeName/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let nodePath = nodeFolderLoader.resolvePath(req.params.nodeName);
        if (!nodePath) {
            res.sendStatus(404);
            return;
        }
        if (utilities.goesUpDirectory(req.params.fileName)) {
            res.status(400).send('Invalid file name. Cannot go up directories.');
            return;
        }
        res.sendFile(path.join(nodePath, req.params.nodeName, 'gui', req.params.fileName));
    });

    // Version 2
    webServer.get('/dataPointInterfaces/:nodeName/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let nodePath = nodeFolderLoader.resolvePath(req.params.nodeName);
        if (!nodePath) {
            res.sendStatus(404);
            return;
        }
        if (utilities.goesUpDirectory(req.params.fileName)) {
            res.status(400).send('Invalid file name. Cannot go up directories.');
            return;
        }
        res.sendFile(path.join(nodePath, req.params.nodeName, 'gui', req.params.fileName));
    });

    // Version 3 #### Active Version
    webServer.get('/nodes/:nodeName/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let nodePath = nodeFolderLoader.resolvePath(req.params.nodeName);
        if (!nodePath) {
            res.sendStatus(404);
            return;
        }
        res.sendFile(path.join(nodePath, req.params.nodeName, 'gui', req.params.fileName));
    });

    // Version 3 #### Active Version
    webServer.get('/nodes/:nodeName/gui/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let nodePath = nodeFolderLoader.resolvePath(req.params.nodeName);
        if (!nodePath) {
            res.sendStatus(404);
            return;
        }
        res.sendFile(path.join(nodePath, req.params.nodeName, 'gui', req.params.fileName));
    });

    // Version 3 #### Active Version *1 Block *2 file
    webServer.get('/logicBlock/:blockName/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let blockPath = blockFolderLoader.resolvePath(req.params.blockName);
        if (!blockPath) {
            res.sendStatus(404);
            return;
        }
        res.sendFile(path.join(blockPath, req.params.blockName, 'gui', req.params.fileName));
    });

    webServer.get('/logicBlock/:blockName/gui/:fileName/', function (req, res) {   // watch out that you need to make a "/" behind request.
        let blockPath = blockFolderLoader.resolvePath(req.params.blockName);
        if (!blockPath) {
            res.sendStatus(404);
            return;
        }
        res.sendFile(path.join(blockPath, req.params.blockName, 'gui', req.params.fileName));
    });


    // ****************************************************************************************************************
    // frontend interface
    // ****************************************************************************************************************

    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {

        // sends the info page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'info/:id', function (req, res) {
            // console.log("get 12");
            if (!utilities.isValidId(req.params.id)) {
                res.status(400).send('Invalid object id. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadInfoText(req.params.id, objectLookup, objects, knownObjects, sockets));
        });

        webServer.get(objectInterfaceFolder + 'infoLoadData/:id', function (req, res) {
            // console.log("get 12");
            if (!utilities.isValidId(req.params.id)) {
                res.status(400).send('Invalid object id. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadInfoContent(req.params.id, objectLookup, objects, knownObjects, sockets));
        });

        // sends the content page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'object/:objectName/:frameName/frameFolder', function (req, res) {
            if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
                res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                return;
            }
            const dirTree = require('directory-tree');
            var objectPath = objectsPath + '/' + req.params.objectName + '/' + req.params.frameName;
            var tree = dirTree(objectPath, {exclude: /\.DS_Store/}, function (item) {
                item.path = item.path.replace(objectsPath, '/obj');
            });
            res.json(tree);
        });


        webServer.get(objectInterfaceFolder + 'content/:objectName/:frameName', function (req, res) {
            // console.log("get 13");
            console.log('get frame index', req.params);
            if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
                res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadTargetContentFrame(req.params.objectName, req.params.frameName, objectsPath, objectInterfaceFolder));
        });

        webServer.get(objectInterfaceFolder + 'edit/:objectName/:frameName', function (req, res) {
            webFrontend.editContent(req, res);
        });

        webServer.put(objectInterfaceFolder + 'edit/:objectName/:frameName', function (req, res) {
            if (utilities.goesUpDirectory(req.path)) {
                res.status(400).send('Invalid path. Cannot go up directories.');
                return;
            }
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
        webServer.get(objectInterfaceFolder + 'target/:objectName', function (req, res) {
            //   console.log("get 14");
            if (!utilities.isValidId(req.params.objectName)) {
                res.status(400).send('Invalid object name. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadTargetText(req.params.objectName, objectLookup, objects, globalVariables.debug));
            // res.sendFile(__dirname + '/'+ "index2.html");
        });

        webServer.get(objectInterfaceFolder + 'target/:objectName/:frameName/', function (req, res) {
            if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
                res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                return;
            }
            res.sendFile(__dirname + '/' + req.params.objectName + '/' + req.params.frameName);
        });

        // Send the main starting page for the web user interface
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder, function (req, res) {
            // console.log("get 16");
            let framePathList = frameLibPaths.join(' ');
            setAnchors();
            res.send(webFrontend.printFolder(objects, objectsPath, globalVariables.debug, objectInterfaceFolder, objectLookup, version, services.ips /*ip.address()*/, serverPort, addonFrames.getFrameList(), hardwareInterfaceModules, framePathList));
        });

        webServer.get(objectInterfaceFolder + 'hardwareInterface/:interfaceName/config.html', function (req, res) {
            if (!utilities.isValidId(req.params.interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            let interfacePath = hardwareInterfaceLoader.resolvePath(req.params.interfaceName);
            let configHtmlPath = path.join(interfacePath, req.params.interfaceName, 'config.html');
            res.send(webFrontend.generateHtmlForHardwareInterface(req.params.interfaceName, hardwareInterfaceModules, version, services.ips, serverPort, configHtmlPath));
        });
        // restart the server from the web frontend to load

        webServer.get('/restartServer/', function () {
            if (process.send) {
                process.send('restart');
            } else {
                exit();
            }
        });

        webServer.get('/server/networkInterface/:activeInterface/', function (req, res) {
            console.log('--------------------------------------------------------get networkInterface', req.params.activeInterface);
            services.ips.activeInterface = req.params.activeInterface;
            res.json(services.ips);

            storage.setItemSync('activeNetworkInterface', req.params.activeInterface);
            //  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            // res.redirect(req.get('referer'));

            if (process.send) {
                process.send('restart');
            }
        });

        // webFrontend realtime messaging
        webServer.post('/webUI/spatial/locator', function (req, res) {
            console.log({
                spatial: {locator: JSON.parse(req.body.locator), ip: services.ip},
                lastEditor: null
            });
            utilities.actionSender({
                spatial: {locator: JSON.parse(req.body.locator), ip: services.ip},
                lastEditor: null
            });
            res.status(200).send('ok');
        });

        webServer.post('/webUI/REC/START', function (req, res) {
            console.log('Starting LOG Recording');
            recorder.start();
            res.status(200).send('ok');
        });

        webServer.post('/webUI/REC/STOP', function (req, res) {
            console.log('Stop LOG Recording and save file');
            recorder.stop();
            res.status(200).send('ok');
        });

        webServer.get('/hardwareInterface/', function (req, res) {
            res.json(Object.keys(hardwareInterfaceModules));
        });

        webServer.get('/hardwareInterface/:interfaceName/settings/', function (req, res) {
            const interfaceName = req.params.interfaceName;

            if (!utilities.isValidId(interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            if (!hardwareInterfaceModules.hasOwnProperty(interfaceName)) {
                res.sendStatus(404);
                return;
            }

            res.json(hardwareInterfaceModules[interfaceName].settings);
        });

        webServer.post('/hardwareInterface/:interfaceName/settings/', function (req, res) {
            var interfaceName = req.params.interfaceName;

            if (!utilities.isValidId(interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            setHardwareInterfaceSettings(interfaceName, req.body.settings, req.body.limitToKeys, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    hardwareAPI.reset();
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        /**
         * Updates the settings.json for a particular hardware interface, based on changes from the webFrontend.
         * @param {string} interfaceName - the folder name of the hardwareInterface
         * @param {JSON} settings - JSON structure of the new settings to be written to settings.json
         * @param {Array.<string>} limitToKeys - if provided, only affects the properties of settings whose keys are included in this array
         * @param {successCallback} callback
         */
        function setHardwareInterfaceSettings(interfaceName, settings, limitToKeys, callback) { // eslint-disable-line no-inner-declarations
            var interfaceSettingsPath = path.join(objectsPath, identityFolderName, interfaceName, 'settings.json');

            try {
                const rawSettings = fs.readFileSync(interfaceSettingsPath, 'utf8') || '{}';
                console.log('rawSettings', rawSettings);
                let existingSettings = {};
                try {
                    existingSettings = JSON.parse(rawSettings);
                } catch (e) {
                    console.warn('Unable to parse settings', e, rawSettings);
                }

                console.log('before:', hardwareInterfaceModules[interfaceName]);

                for (let key in settings) {
                    if (!settings.hasOwnProperty(key)) {
                        continue;
                    }
                    if (limitToKeys && !limitToKeys.includes(key)) {
                        continue;
                    }

                    // update value that will get written to disk
                    if (typeof settings[key].value !== 'undefined') {
                        existingSettings[key] = settings[key].value;
                    } else {
                        existingSettings[key] = settings[key];
                    }
                    console.log('set ' + key + ' to ' + existingSettings[key]);

                    // update hardwareInterfaceModules so that refreshing the page preserves the in-memory changes
                    if (typeof hardwareInterfaceModules[interfaceName].settings !== 'undefined') {
                        hardwareInterfaceModules[interfaceName].settings[key] = settings[key];
                    }
                }

                console.log('after:', hardwareInterfaceModules[interfaceName]);

                if (globalVariables.saveToDisk) {
                    fs.writeFile(interfaceSettingsPath, JSON.stringify(existingSettings, null, 4), function (err) {
                        if (err) {
                            console.log(err);
                            callback(false, 'error writing to file');
                        } else {
                            console.log('successfully wrote settings hardwareInterface: ' + interfaceName);
                            callback(true);
                            hardwareAPI.pushSettingsToGui(interfaceName, existingSettings);
                        }
                    });
                } else {
                    console.log('I am not allowed to save');
                    callback(false, 'saveToDisk globally disabled for this server');
                }
            } catch (e) {
                console.log('error writing settings.json for ' + interfaceName + '.', e);
                callback(false, 'error writing to file');
            }
        }

        /**
         * @callback successCallback
         * @param {boolean} success
         * @param {string?} error message
         */

        // TODO(hobinjk): break the back-and-forth web of dependencies with hardwareAPI
        hardwareAPI.setHardwareInterfaceSettingsImpl(setHardwareInterfaceSettings);

        webServer.get('/hardwareInterface/:interfaceName/disable/', function (req, res) {
            var interfaceName = req.params.interfaceName;

            if (!utilities.isValidId(interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            setHardwareInterfaceEnabled(interfaceName, false, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    hardwareAPI.reset();
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        webServer.get('/hardwareInterface/:interfaceName/enable/', function (req, res) {
            var interfaceName = req.params.interfaceName;

            if (!utilities.isValidId(interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            setHardwareInterfaceEnabled(interfaceName, true, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    hardwareAPI.reset();
                    // Manually reload interface to pick up disabled -> enabled transition
                    hardwareInterfaceLoader.reloadModule(interfaceName);
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        /**
         * Overwrites the 'enabled' property in the spatialToolbox/.identity/hardwareInterfaceName/settings.json
         * If the file is new (empty), write a default json blob into it with the new enabled value
         * @param {string} interfaceName
         * @param {boolean} shouldBeEnabled
         * @param {successCallback} callback
         */
        function setHardwareInterfaceEnabled(interfaceName, shouldBeEnabled, callback) { // eslint-disable-line no-inner-declarations
            var interfaceSettingsPath = path.join(objectsPath, identityFolderName, interfaceName, 'settings.json');
            console.log('interfaceSettingsPath', interfaceSettingsPath);

            try {
                const rawSettings = fs.readFileSync(interfaceSettingsPath, 'utf8') || '{}';
                var settings = JSON.parse(rawSettings);
                settings.enabled = shouldBeEnabled;

                if (globalVariables.saveToDisk) {
                    fs.writeFile(interfaceSettingsPath, JSON.stringify(settings, null, 4), function (err) {
                        if (err) {
                            console.log(err);
                            callback(false, 'error writing to file');
                        } else {
                            console.log('successfully ' + (shouldBeEnabled ? 'enabled' : 'disabled') + ' hardwareInterface: ' + interfaceName);
                            callback(true);
                        }
                    });
                } else {
                    console.log('I am not allowed to save');
                    callback(false, 'saveToDisk globally disabled for this server');
                }
            } catch (e) {
                console.log('error reading settings.json for ' + interfaceName + '. try reverting to default settings', e);
                var defaultSettings = {
                    enabled: shouldBeEnabled
                };
                fs.writeFile(interfaceSettingsPath, JSON.stringify(defaultSettings, null, 4), function (err) {
                    if (err) {
                        console.log(err);
                        callback(false, 'error writing to file');
                    } else {
                        console.log('successfully ' + (shouldBeEnabled ? 'enabled' : 'disabled') + ' hardwareInterface: ' + interfaceName);
                        callback(true);
                    }
                });
            }
        }

        webServer.get('/globalFrame/:frameName/disable/', function (req, res) {
            var frameName = req.params.frameName;

            if (!utilities.isValidId(frameName)) {
                res.status(400).send('Invalid frame name. Must be alphanumeric.');
                return;
            }

            addonFrames.setFrameEnabled(frameName, false, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    utilities.actionSender({
                        reloadAvailableFrames: {serverIP: services.ip, frameName: frameName},
                        lastEditor: null
                    });
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        webServer.get('/globalFrame/:frameName/enable/', function (req, res) {
            var frameName = req.params.frameName;

            if (!utilities.isValidId(frameName)) {
                res.status(400).send('Invalid frame name. Must be alphanumeric.');
                return;
            }

            addonFrames.setFrameEnabled(frameName, true, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    utilities.actionSender({
                        reloadAvailableFrames: {serverIP: services.ip, frameName: frameName},
                        lastEditor: null
                    });
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        // request a zip-file with the frame stored inside. *1 is the frameName
        // ****************************************************************************************************************
        webServer.get('/frame/:frameName/zipBackup/', function (req, res) {
            if (isLightweightMobile) {
                res.status(500).send('zipBackup unavailable on mobile');
                return;
            }

            var frameName = req.params.frameName;

            if (!utilities.isValidId(frameName)) {
                res.status(400).send('Invalid frame name. Must be alphanumeric.');
                return;
            }

            console.log('++++++++++++++++++++++++++++++++++++++++++++++++');

            const frameLibPath = frameFolderLoader.resolvePath(frameName);
            if (!frameLibPath) {
                res.sendStatus(404);
                return;
            }
            var framePath = path.join(frameLibPath, frameName);

            if (!fs.existsSync(framePath)) {
                res.status(404).send('frame directory for ' + frameName + 'does not exist at ' + framePath);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-disposition': 'attachment; filename=' + frameName + '.zip'
            });

            var archiver = require('archiver');

            var zip = archiver('zip');
            zip.pipe(res);
            zip.directory(framePath, frameName + '/');
            zip.finalize();
        });

        /**
         * Previously, retrieved the worldObject from the spatialToolbox/.identity/_WORLD_OBJECT_/ folder
         * Now it is deprecated, because world objects are discovered using UDP broadcasts
         */
        webServer.get('/worldObject/', function (req, res) {
            res.status(410).send('This API has been removed. World objects should be discovered the same way as any other object.');
        });

        // use allObjects for TCP/IP object discovery
        // ****************************************************************************************************************
        webServer.get('/allObjects/', function (req, res) {

            var returnJSON = [];

            for (var thisId in objects) {
                if (objects[thisId].deactivated) continue; // todo: filter by zone, too?

                objects[thisId].version = version;
                objects[thisId].protocol = protocol;
                objects[thisId].port = serverPort;

                var thisVersionNumber = parseInt(objects[thisId].version.replace(/\./g, ''));

                if (typeof objects[thisId].tcs === 'undefined') {
                    objects[thisId].tcs = 0;
                }
                returnJSON.push({
                    id: thisId,
                    ip: objects[thisId].ip,
                    port: serverPort,
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
        webServer.post(objectInterfaceFolder + 'contentDelete/:object/:frame', function (req, res) {
            if (req.body.action === 'delete') {
                if (utilities.goesUpDirectory(req.path)) {
                    res.status(400).send('Invalid path. Cannot contain \'..\'.');
                    return;
                }
                const folderDel = __dirname + req.path.substr(4);
                if (fs.lstatSync(folderDel).isDirectory()) {
                    utilities.deleteFolderRecursive(folderDel);
                } else {
                    fs.unlinkSync(folderDel);
                }

                res.send('ok');

            }
        });

        webServer.post(objectInterfaceFolder + 'contentDelete/:id', function (req, res) {
            if (req.body.action === 'delete') {

                if (!utilities.isValidId(req.body.name)) {
                    res.status(400).send('Invalid object name. Must be alphanumeric.');
                    return;
                }

                if (!utilities.isValidId(req.params.id)) {
                    res.status(400).send('Invalid object id. Must be alphanumeric.');
                    return;
                }

                var folderDel = objectsPath + '/' + req.body.name;

                if (fs.lstatSync(folderDel).isDirectory()) {
                    utilities.deleteFolderRecursive(folderDel);
                } else {
                    fs.unlinkSync(folderDel);
                }

                res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
            }

        });

        //*****************************************************************************************
        webServer.post(objectInterfaceFolder, function (req, res) {

            if (req.body.action === 'zone') {
                let objectKey = utilities.readObject(objectLookup, req.body.name);
                objects[objectKey].zone = req.body.zone;
                utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                res.send('ok');
            }

            if (req.body.action === 'new') {
                console.log('got NEW', req.body.name);
                // console.log(req.body);
                if (req.body.name !== '' && !req.body.frame) {
                    if (!utilities.isValidId(req.body.name)) {
                        res.status(400).send('Invalid object name. Must be alphanumeric.');
                        return;
                    }

                    utilities.createFolder(req.body.name, objectsPath, globalVariables.debug);

                    // immediately create world or human object rather than wait for target data to instantiate
                    let isWorldObject = JSON.parse(req.body.isWorld || 'false');
                    let isHumanObject = JSON.parse(req.body.isHuman || 'false');
                    let isAvatarObject = JSON.parse(req.body.isAvatar || 'false');

                    if (isWorldObject || isHumanObject || isAvatarObject) {
                        let objectId = req.body.name + utilities.uuidTime();
                        objects[objectId] = new ObjectModel(services.ip, version, protocol, objectId);
                        objects[objectId].name = req.body.name;
                        objects[objectId].port = serverPort;
                        objects[objectId].isWorldObject = isWorldObject; // backwards compatible world objects
                        let objectType = 'object';
                        if (isWorldObject) {
                            objectType = 'world';
                        } else if (isHumanObject) {
                            objectType = 'human';
                        } else if (isAvatarObject) {
                            objectType = 'avatar';
                        }
                        objects[objectId].type = objectType;
                        utilities.writeObjectToFile(objects, objectId, objectsPath, globalVariables.saveToDisk);
                        sceneGraph.addObjectAndChildren(objectId, objects[objectId]);

                        objectBeatSender(beatPort, objectId, objects[objectId].ip);

                        var sendObject = {
                            id: objectId,
                            name: req.body.name,
                            initialized: true,
                            jpgExists: false,
                            xmlExists: false,
                            datExists: false,
                            glbExists: false
                        };
                        res.status(200).json(sendObject);
                        return;
                    }

                    setAnchors(); // Needed to initialize non-world (anchor) objects

                } else if (req.body.name !== '' && req.body.frame !== '') {
                    if (!utilities.isValidId(req.body.name) || !utilities.isValidId(req.body.frame)) {
                        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                        return;
                    }

                    let objectKey = utilities.readObject(objectLookup, req.body.name);

                    if (!objects[objectKey].frames[objectKey + req.body.frame]) {

                        utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, objectsPath, globalVariables.debug, 'local');
                        objects[objectKey].frames[objectKey + req.body.frame] = new Frame(objectKey, objectKey + req.body.frame);
                        objects[objectKey].frames[objectKey + req.body.frame].name = req.body.frame;
                        utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                        // sceneGraph.addObjectAndChildren(tempFolderName, objects[tempFolderName]);
                        sceneGraph.addFrame(objectKey, objectKey + req.body.frame, objects[objectKey].frames[objectKey + req.body.frame]);
                    } else {
                        utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, objectsPath, globalVariables.debug, objects[objectKey].frames[objectKey + req.body.frame].location);
                    }
                }
                // res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));

                res.send('ok');
            }
            if (req.body.action === 'delete') {

                var deleteFolderRecursive = function (folderDel) {
                    if (fs.existsSync(folderDel)) {
                        fs.readdirSync(folderDel).forEach(function (file) {
                            var curPath = folderDel + '/' + file;
                            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                                deleteFolderRecursive(curPath);
                            } else { // delete file
                                fs.unlinkSync(curPath);
                            }
                        });
                        fs.rmdirSync(folderDel);
                    }
                };

                if (!utilities.isValidId(req.body.name)) {
                    res.status(400).send('Invalid object name. Must be alphanumeric.');
                    return;
                }

                // remove when frame is implemented
                var objectKey = utilities.readObject(objectLookup, req.body.name);// req.body.name + thisMacAddress;
                var frameName = req.body.frame;
                var frameNameKey = req.body.frame;
                var pathKey = req.body.path;

                var thisObject = getObject(objectKey);
                if (thisObject) {
                    if (req.body.frame in thisObject.frames) {
                        frameName = thisObject.frames[req.body.frame].name;
                    } else {
                        frameNameKey = objectKey + req.body.frame;
                    }
                }

                if (pathKey && pathKey !== '') {
                    if (utilities.goesUpDirectory(pathKey)) {
                        res.status(400).send('Invalid path. Cannot contain \'..\'.');
                        return;
                    }
                    fs.unlinkSync(objectsPath + pathKey.substring(4));
                    res.send('ok');
                    return;
                }

                if (frameName !== '') {
                    if (!utilities.isValidId(frameName)) {
                        res.status(400).send('Invalid frame name. Must be alphanumeric.');
                        return;
                    }

                    var folderDelFrame = objectsPath + '/' + req.body.name + '/' + frameName;

                    deleteFolderRecursive(folderDelFrame);

                    if (objectKey !== null && frameNameKey !== null) {
                        if (thisObject) {
                            try {
                                // deconstructs the nodes on this frame too, if needed
                                thisObject.frames[frameNameKey].deconstruct();
                            } catch (e) {
                                console.warn('Frame exists without proper prototype: ' + frameNameKey, e);
                            }
                            delete thisObject.frames[frameNameKey];
                        }
                    }

                    utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
                    utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: null});

                    sceneGraph.removeElementAndChildren(frameNameKey);

                    res.send('ok');

                } else {

                    var folderDel = objectsPath + '/' + req.body.name;
                    deleteFolderRecursive(folderDel);

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);// req.body.name + thisMacAddress;

                    if (tempFolderName2 !== null) {

                        // remove object from tree
                        if (objects[tempFolderName2]) {
                            if (activeHeartbeats[tempFolderName2]) {
                                clearInterval(activeHeartbeats[tempFolderName2]);
                                delete activeHeartbeats[tempFolderName2];
                            }
                            try {
                                // deconstructs frames and nodes of this object, too
                                objects[tempFolderName2].deconstruct();
                            } catch (e) {
                                console.warn('Object exists without proper prototype: ' + tempFolderName2, e);
                            }
                            delete objects[tempFolderName2];
                            delete knownObjects[tempFolderName2];
                            delete objectLookup[req.body.name];

                            sceneGraph.removeElementAndChildren(tempFolderName2);
                        }

                    }

                    console.log('i deleted: ' + tempFolderName2);
                    setAnchors();

                    //   res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));
                    res.send('ok');
                }
            }
            //delete end
        });

        var tmpFolderFile = '';

        // this is all used just for the backup folder
        //*************************************************************************************
        webServer.post(objectInterfaceFolder + 'backup/',
            function (req, res) {
                // console.log("post 23");

                console.log('komm ich hier hin?');

                var form = new formidable.IncomingForm({
                    uploadDir: objectsPath,  // don't forget the __dirname here
                    keepExtensions: true
                });

                let filename = '';

                form.on('error', function (err) {
                    throw err;
                });

                form.on('fileBegin', function (name, file) {
                    if (!file.name) {
                        file.name = file.newFilename;
                    }
                    filename = file.name;
                    //rename the incoming file to the file's name
                    file.path = form.uploadDir + '/' + file.name;
                });

                form.parse(req);

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    // console.log("------------" + form.uploadDir + " " + filename);

                    if (getFileExtension(filename) === 'zip') {

                        console.log('I found a zip file');

                        try {
                            var unzipper = new DecompressZip(path.join(folderD, filename));

                            unzipper.on('error', function (err) {
                                console.log('Caught an error', err);
                            });

                            unzipper.on('extract', function () {
                                console.log('Finished extracting');
                                console.log('have created a new object');
                                //createObjectFromTarget(filename.substr(0, filename.lastIndexOf('.')));
                                createObjectFromTarget(objects, filename.substr(0, filename.lastIndexOf('.')), __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                //todo add object to the beatsender.

                                console.log('have created a new object');
                                fs.unlinkSync(folderD + '/' + filename);

                                res.status(200);
                                res.send('done');

                            });

                            unzipper.on('progress', function (fileIndex, fileCount) {
                                console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                            });

                            unzipper.extract({
                                path: folderD,
                                filter: function (file) {
                                    return file.type !== 'SymbolicLink';
                                }
                            });

                            console.log('extracting: ' + filename + '  ' + folderD);

                        } catch (err) {
                            console.log('could not unzip file', err);
                        }
                    }
                });
            });

        // this for all the upload to content
        //***********************************************************************

        webServer.post(objectInterfaceFolder + 'content/:id',
            function (req, res) {

                console.log('object is: ' + req.params.id);

                if (!utilities.isValidId(req.params.id)) {
                    res.status(400).send('Invalid object name. Must be alphanumeric.');
                    return;
                }

                tmpFolderFile = req.params.id;

                if (req.body.action === 'delete') {
                    if (!utilities.isValidId(req.body.name)) {
                        res.status(400).send('Invalid object name. Must be alphanumeric.');
                        return;
                    }

                    var folderDel = objectsPath + '/' + req.body.name;

                    if (fs.existsSync(folderDel)) {
                        if (fs.lstatSync(folderDel).isDirectory()) {
                            utilities.deleteFolderRecursive(folderDel);
                        } else {
                            fs.unlinkSync(folderDel);
                        }
                    }

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);//req.body.name + thisMacAddress;
                    // remove object from tree
                    if (tempFolderName2 !== null) {
                        if (activeHeartbeats[tempFolderName2]) {
                            clearInterval(activeHeartbeats[tempFolderName2]);
                            delete activeHeartbeats[tempFolderName2];
                        }
                        try {
                            // deconstructs frames and nodes of this object, too
                            objects[tempFolderName2].deconstruct();
                        } catch (e) {
                            console.warn('Object exists without proper prototype: ' + tempFolderName2, e);
                        }
                        delete objects[tempFolderName2];
                        delete knownObjects[tempFolderName2];
                    }

                    console.log('i deleted: ' + tempFolderName2);

                    res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
                }

                var form = new formidable.IncomingForm({
                    uploadDir: objectsPath + '/' + req.params.id,  // don't forget the __dirname here
                    keepExtensions: true,
                });

                let fileInfoList = [];

                form.on('error', function (err) {
                    throw err;
                });

                form.on('fileBegin', function (name, file) {
                    if (!file.name) {
                        file.name = file.newFilename;
                    }
                    fileInfoList.push({name: file.name, completed: false});
                    //rename the incoming file to the file's name
                    if (req.headers.type === 'targetUpload') {
                        file.path = form.uploadDir + '/' + file.name;
                    } else if (req.headers.type === 'fileUpload') {
                        console.log('upload begins', form.uploadDir, req.headers.folder);

                        if (typeof req.headers.folder !== 'undefined') {
                            file.path = form.uploadDir + '/' + req.headers.frame + '/' + req.headers.folder + '/' + file.name;
                        } else {
                            file.path = form.uploadDir + '/' + req.headers.frame + '/' + file.name;
                        }
                    }
                });

                form.parse(req);

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    fileInfoList = fileInfoList.filter(fileInfo => !fileInfo.completed); // Don't repeat processing for completed files
                    fileInfoList.forEach(fileInfo => {
                        if (!fs.existsSync(path.join(form.uploadDir, fileInfo.name))) { // Ignore files that haven't finished uploading
                            return;
                        }
                        fileInfo.completed = true; // File has downloaded
                        let filename = fileInfo.name;
                        console.log('------------' + form.uploadDir + '/' + filename);
                        if (req.headers.type === 'targetUpload') {
                            console.log('targetUpload', req.params.id);
                            var fileExtension = getFileExtension(filename);

                            if (fileExtension === 'jpeg') { // Needed for compatibility, .JPEG is equivalent to .JPG
                                fileExtension = 'jpg';
                            }

                            if (fileExtension === 'jpg' || fileExtension === 'dat' || fileExtension === 'xml' || fileExtension === 'glb') {
                                if (!fs.existsSync(folderD + '/' + identityFolderName + '/target/')) {
                                    fs.mkdirSync(folderD + '/' + identityFolderName + '/target/', '0766', function (err) {
                                        if (err) {
                                            console.log(err);
                                            res.send('ERROR! Can\'t make the directory! \n');    // echo the result back
                                        }
                                    });
                                }

                                fs.renameSync(folderD + '/' + filename, folderD + '/' + identityFolderName + '/target/target.' + fileExtension);

                                // Step 1) - resize image if necessary. Vuforia can make targets from jpgs of up to 2048px
                                // but we scale down to 1024px for a larger margin of error and (even) smaller filesize
                                if (fileExtension === 'jpg') {

                                    var rawFilepath = folderD + '/' + identityFolderName + '/target/target.' + fileExtension;
                                    var tempFilepath = folderD + '/' + identityFolderName + '/target/target-temp.' + fileExtension;
                                    var originalFilepath = folderD + '/' + identityFolderName + '/target/target-original-size.' + fileExtension;

                                    try {
                                        Jimp.read(rawFilepath).then(image => {
                                            var desiredMaxDimension = 1024;

                                            if (Math.max(image.bitmap.width, image.bitmap.height) <= desiredMaxDimension) {
                                                console.log('jpg doesnt need resizing');
                                                continueProcessingUpload();

                                            } else {
                                                console.log('attempting to resize file to ' + rawFilepath);

                                                var aspectRatio = image.bitmap.width / image.bitmap.height;
                                                var newWidth = desiredMaxDimension;
                                                if (image.bitmap.width < image.bitmap.height) {
                                                    newWidth = desiredMaxDimension * aspectRatio;
                                                }

                                                // copy fullsize file as backup
                                                if (fs.existsSync(originalFilepath)) {
                                                    console.log('deleted old original file');
                                                    fs.unlinkSync(originalFilepath);
                                                }
                                                fs.copyFileSync(rawFilepath, originalFilepath);

                                                // copied file into temp file to be used during the resize operation
                                                if (fs.existsSync(tempFilepath)) {
                                                    console.log('deleted old temp file');
                                                    fs.unlinkSync(tempFilepath);
                                                }
                                                fs.copyFileSync(rawFilepath, tempFilepath);

                                                Jimp.read(tempFilepath).then(tempImage => {
                                                    return tempImage.resize(newWidth, Jimp.AUTO).write(rawFilepath);
                                                }).then(() => {
                                                    console.log('done resizing');
                                                    if (fs.existsSync(tempFilepath)) {
                                                        fs.unlinkSync(tempFilepath);
                                                    }
                                                    continueProcessingUpload();
                                                }).catch(err => {
                                                    console.warn('error resizing', err);
                                                    continueProcessingUpload();
                                                });
                                            }
                                        });
                                    } catch (e) {
                                        console.warn('error using sharp to load and resize image from: ' + rawFilepath + ', but trying to continue upload process anyways', e);
                                        continueProcessingUpload();
                                    }

                                } else {
                                    continueProcessingUpload();
                                }

                                // Step 2) - Generate a default XML file if needed
                                function continueProcessingUpload() { // eslint-disable-line no-inner-declarations
                                    var objectName = req.params.id + utilities.uuidTime();

                                    var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                                       '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
                                       '   <Tracking>\n' +
                                       '   <ImageTarget name="' + objectName + '" size="0.30000000 0.30000000" />\n' +
                                       '   </Tracking>\n' +
                                       '   </ARConfig>';


                                    var xmlOutFile = path.join(folderD, identityFolderName, '/target/target.xml');
                                    if (!fs.existsSync(xmlOutFile)) {
                                        fs.writeFile(xmlOutFile, documentcreate, function (err) {
                                            onXmlVerified(err);
                                        });
                                    } else {
                                        onXmlVerified();
                                    }
                                }

                                // create the object data and respond to the webFrontend once the XML file is confirmed to exist
                                function onXmlVerified(err) { // eslint-disable-line no-inner-declarations
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        // create the object if needed / possible
                                        if (typeof objects[thisObjectId] === 'undefined') { // TODO: thisObjectId is always undefined?
                                            console.log('creating object from target file ' + tmpFolderFile);
                                            // createObjectFromTarget(tmpFolderFile);
                                            createObjectFromTarget(objects, tmpFolderFile, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                            //todo send init to internal modules
                                            console.log('have created a new object');

                                            hardwareAPI.reset();
                                            console.log('have initialized the modules');
                                        }
                                    }

                                    let jpgPath = path.join(folderD, identityFolderName, '/target/target.jpg');
                                    let datPath = path.join(folderD, identityFolderName, '/target/target.dat');
                                    let xmlPath = path.join(folderD, identityFolderName, '/target/target.xml');
                                    let glbPath = path.join(folderD, identityFolderName, '/target/target.glb');
                                    let tdtPath = path.join(folderD, identityFolderName, '/target/target.3dt');

                                    var fileList = [jpgPath, xmlPath, datPath, glbPath, tdtPath];
                                    var thisObjectId = utilities.readObject(objectLookup, req.params.id);

                                    if (typeof objects[thisObjectId] !== 'undefined') {
                                        var thisObject = objects[thisObjectId];
                                        var jpg = fs.existsSync(jpgPath);
                                        var dat = fs.existsSync(datPath);
                                        var xml = fs.existsSync(xmlPath);
                                        var glb = fs.existsSync(glbPath);

                                        var sendObject = {
                                            id: thisObjectId,
                                            name: thisObject.name,
                                            initialized: (jpg && xml),
                                            jpgExists: jpg,
                                            xmlExists: xml,
                                            datExists: dat,
                                            glbExists: glb
                                        };

                                        thisObject.tcs = utilities.generateChecksums(objects, fileList);
                                        utilities.writeObjectToFile(objects, thisObjectId, objectsPath, globalVariables.saveToDisk);
                                        setAnchors();

                                        // Removes old heartbeat if it used to be an anchor
                                        var oldObjectId = utilities.getAnchorIdFromObjectFile(req.params.id, objectsPath);
                                        if (oldObjectId && oldObjectId != thisObjectId) {
                                            console.log('removed old heartbeat for', oldObjectId);
                                            clearInterval(activeHeartbeats[oldObjectId]);
                                            delete activeHeartbeats[oldObjectId];
                                            try {
                                                // deconstructs frames and nodes of this object, too
                                                objects[oldObjectId].deconstruct();
                                            } catch (e) {
                                                console.warn('Object exists without proper prototype: ' + tempFolderName2, e);
                                            }
                                            delete objects[oldObjectId];
                                        }

                                        objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);
                                        // res.status(200).send('ok');
                                        try {
                                            res.status(200).json(sendObject);
                                        } catch (e) {
                                            console.warn('unable to send res', e);
                                        }

                                    } else {
                                        // var sendObject = {
                                        //     initialized : false
                                        // };
                                        try {
                                            res.status(200).send('ok');
                                        } catch (e) {
                                            console.warn('unable to send res', e);
                                        }
                                    }
                                }

                            } else if (fileExtension === 'zip') {
                                const zipfileName = filename;

                                console.log('I found a zip file');

                                try {
                                    var unzipper = new DecompressZip(path.join(folderD, zipfileName));

                                    unzipper.on('error', function (err) {
                                        console.log('Caught an error in unzipper', err);
                                    });

                                    unzipper.on('extract', function (_log) {
                                        const targetFolderPath = path.join(folderD, identityFolderName, 'target');
                                        const folderFiles = fs.readdirSync(targetFolderPath);
                                        const targetTypes = ['xml', 'dat', 'glb', 'unitypackage', '3dt'];

                                        let anyTargetsUploaded = false;

                                        for (var i = 0; i < folderFiles.length; i++) {
                                            const folderFile = folderFiles[i];
                                            const folderFileType = folderFile.substr(folderFile.lastIndexOf('.') + 1);
                                            if (targetTypes.includes(folderFileType)) {
                                                fs.renameSync(
                                                    path.join(targetFolderPath, folderFile),
                                                    path.join(targetFolderPath, 'target.' + folderFileType)
                                                );
                                                anyTargetsUploaded = true;
                                            }
                                            if (folderFile === 'target') {
                                                console.log('zip contained a folder of the same name');
                                                const innerFolderFiles = fs.readdirSync(folderD + '/' + identityFolderName + '/target/' + folderFile);
                                                let deferred = false;
                                                function finishFn(folderName) {
                                                    return function() {
                                                        fs.rmdirSync(path.join(folderD, identityFolderName, 'target', folderName));
                                                        let newFolderFiles = fs.readdirSync(path.join(folderD, identityFolderName, 'target'));
                                                        console.log('nff', newFolderFiles);
                                                        fs.renameSync(
                                                            path.join(folderD, identityFolderName, 'target', 'authoringMesh.glb'),
                                                            path.join(folderD, identityFolderName, 'target', 'target.glb')
                                                        );
                                                    };
                                                }
                                                const finish = finishFn(folderFile);

                                                for (let j = 0; j < innerFolderFiles.length; j++) {
                                                    let innerFolderFile = innerFolderFiles[j];
                                                    console.log(innerFolderFile);

                                                    const innerFolderFileType = innerFolderFile.substr(innerFolderFile.lastIndexOf('.') + 1);
                                                    if (targetTypes.includes(innerFolderFileType)) {
                                                        fs.renameSync(
                                                            path.join(targetFolderPath, folderFile, innerFolderFile),
                                                            path.join(targetFolderPath, 'target.' + innerFolderFileType),
                                                        );
                                                        anyTargetsUploaded = true;
                                                    }

                                                    if (innerFolderFile === 'target.3dt') {
                                                        deferred = true;
                                                        // unzip target.3dt
                                                        let unzipper3dt = new DecompressZip(path.join(targetFolderPath, 'target.3dt'));

                                                        unzipper3dt.on('error', function (err) {
                                                            console.log('Caught an error for 3dt', err);
                                                        });

                                                        unzipper3dt.on('extract', function () {
                                                            console.log('Finished extracting 3dt');
                                                            finish();
                                                        });

                                                        unzipper3dt.on('progress', function (fileIndex, fileCount) {
                                                            console.log('Extracted 3dt file ' + (fileIndex + 1) + ' of ' + fileCount);
                                                        });

                                                        unzipper3dt.extract({
                                                            path: targetFolderPath,
                                                            filter: function (file) {
                                                                // skipping over frame_%d.jpg, images.json, and tileset.json
                                                                return file.type !== 'SymbolicLink' && file.filename.endsWith('glb');
                                                            }
                                                        });
                                                    }
                                                }
                                                if (!deferred) {
                                                    finish();
                                                }
                                            }
                                        }
                                        fs.unlinkSync(path.join(folderD, zipfileName));

                                        // evnetually create the object.

                                        if (fs.existsSync(path.join(targetFolderPath, 'target.dat')) && fs.existsSync(path.join(targetFolderPath, 'target.xml'))) {

                                            console.log('creating object from target file ' + tmpFolderFile);
                                            // createObjectFromTarget(tmpFolderFile);
                                            createObjectFromTarget(objects, tmpFolderFile, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, globalVariables.debug);

                                            //todo send init to internal modules
                                            console.log('have created a new object');

                                            hardwareAPI.reset();
                                            console.log('have initialized the modules');

                                            const targetFileExts = {
                                                jpg: '',
                                                xml: '',
                                                dat: '',
                                                glb: '',
                                                '3dt': '',
                                            };

                                            const thisObjectId = utilities.readObject(objectLookup, req.params.id);

                                            if (typeof objects[thisObjectId] !== 'undefined') {
                                                const thisObject = objects[thisObjectId];

                                                const fileList = [];
                                                for (const ext of Object.keys(targetFileExts)) {
                                                    const filePath = path.join(targetFolderPath, 'target.' + ext);
                                                    fileList.push(filePath);
                                                    targetFileExts[ext] = fs.existsSync(filePath);
                                                }

                                                thisObject.tcs = utilities.generateChecksums(objects, fileList);

                                                utilities.writeObjectToFile(objects, thisObjectId, objectsPath, globalVariables.saveToDisk);
                                                setAnchors();
                                                objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

                                                let sendObject = {
                                                    id: thisObjectId,
                                                    name: thisObject.name,
                                                    initialized: (targetFileExts.jpg && targetFileExts.xml && targetFileExts.dat),
                                                };

                                                for (const ext of Object.keys(targetFileExts)) {
                                                    sendObject[ext + 'Exists'] = targetFileExts[ext];
                                                }

                                                res.status(200).json(sendObject);
                                                return;
                                            }

                                        }

                                        let sendObject = {
                                            initialized: false
                                        };
                                        if (anyTargetsUploaded) {
                                            res.status(200).json(sendObject);
                                        } else {
                                            res.status(400).json({
                                                error: 'Unable to extract any target data from provided zip'
                                            });
                                        }
                                    });

                                    unzipper.on('progress', function (fileIndex, fileCount) {
                                        console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                                    });

                                    unzipper.extract({
                                        path: path.join(folderD, identityFolderName, 'target'),
                                        filter: function (file) {
                                            return file.type !== 'SymbolicLink';
                                        }
                                    });
                                } catch (err) {
                                    console.log('could not unzip file', err);
                                }
                            } else {
                                let errorString = 'File type is not recognized target data. ' +
                                    'You uploaded .' + fileExtension + ' but only ' +
                                    '.dat, .jpg, .xml, and .zip are supported.';
                                res.status(400).send({
                                    error: errorString
                                });
                            }

                        } else {
                            res.status(200);
                            res.send('done');
                        }
                    });
                });
            });

        webServer.delete(objectInterfaceFolder + 'content/:id', function (req, res) {
            if (!utilities.isValidId(req.params.id)) {
                res.status(400).send('Invalid object name. Must be alphanumeric.');
                return;
            }

            tmpFolderFile = req.params.id;
            console.log('DELETING TARGET FROM OBJECT: ' + tmpFolderFile);

            let objectKey = utilities.readObject(objectLookup, tmpFolderFile);

            // reset checksum
            if (objects[objectKey]) { // allows targets from corrupted objects to be deleted
                objects[objectKey].tcs = 0;
            }

            // delete target files

            let targetDir = path.join(objectsPath, tmpFolderFile, identityFolderName, 'target');
            try {
                fs.unlinkSync(path.join(targetDir, 'target.xml'));
            } catch (e) {
                console.log('error while trying to delete ' + path.join(targetDir, 'target.xml'), e);
            }
            try {
                fs.unlinkSync(path.join(targetDir, 'target.jpg'));
            } catch (e) {
                console.log('error while trying to delete ' + path.join(targetDir, 'target.jpg'), e);
            }
            try {
                fs.unlinkSync(path.join(targetDir, 'target.dat'));
            } catch (e) {
                console.log('error while trying to delete ' + path.join(targetDir, 'target.dat'), e);
            }

            // recompute isAnchor (depends if there is an initialized world object)
            setAnchors();

            // save to disk and respond
            if (objects[objectKey]) { // allows targets from corrupted objects to be deleted
                utilities.writeObjectToFile(objects, objectKey, objectsPath, globalVariables.saveToDisk);
            }
            res.send('ok');
        });

    } else {
        webServer.get(objectInterfaceFolder, function (req, res) {
            //   console.log("GET 21");
            res.send('Objects<br>Developer functions are off');
        });
    }
}

/**
 * Gets triggered when uploading a ZIP with XML and Dat. Generates a new object and saves it to object.json.
 * @param {Record<string, Object>} objects
 * @param {string} folderVar
 * @param {string} __dirname
 * @param {Record<string, unknown>} objectLookup
 * @param {unknown} hardwareInterfaceModules
 * @param {unknown} objectBeatSender
 * @param {unknown} beatPort
 * @param {unknown} _debug
 */
function createObjectFromTarget(objects, folderVar, __dirname, objectLookup, hardwareInterfaceModules, objectBeatSender, beatPort, _debug) {
    console.log('I can start');

    var folder = objectsPath + '/' + folderVar + '/';
    console.log(folder);

    if (fs.existsSync(folder)) {
        console.log('folder exists');
        var objectIDXML = utilities.getObjectIdFromTargetOrObjectFile(folderVar, objectsPath);
        var objectSizeXML = utilities.getTargetSizeFromTarget(folderVar, objectsPath);
        console.log('got ID: objectIDXML');
        if (objectIDXML && objectIDXML.length > 13) {
            objects[objectIDXML] = new ObjectModel(services.ip, version, protocol, objectIDXML);
            objects[objectIDXML].port = serverPort;
            objects[objectIDXML].name = folderVar;
            objects[objectIDXML].targetSize = objectSizeXML;

            if (objectIDXML.indexOf(worldObjectName) > -1) { // TODO: implement a more robust way to tell if it's a world object
                objects[objectIDXML].isWorldObject = true;
                objects[objectIDXML].timestamp = Date.now();
            }

            console.log('this should be the IP' + objectIDXML);

            try {
                objects[objectIDXML] = JSON.parse(fs.readFileSync(objectsPath + '/' + folderVar + '/' + identityFolderName + '/object.json', 'utf8'));
                objects[objectIDXML].objectId = objectIDXML;
                objects[objectIDXML].ip = services.ip; //ip.address();
                console.log('testing: ' + objects[objectIDXML].ip);
            } catch (e) {
                objects[objectIDXML].ip = services.ip; //ip.address();
                console.log('testing: ' + objects[objectIDXML].ip);
                console.log('No saved data for: ' + objectIDXML, e);
            }

            if (utilities.readObject(objectLookup, folderVar) !== objectIDXML) {
                let oldObjectId = utilities.readObject(objectLookup, folderVar);
                try {
                    objects[oldObjectId].deconstruct();
                } catch (e) {
                    console.warn('Object exists without proper prototype: ' + oldObjectId, e);
                }
                delete objects[oldObjectId];
                delete knownObjects[oldObjectId];
                delete objectLookup[oldObjectId];
                sceneGraph.removeElementAndChildren(oldObjectId);
            }
            utilities.writeObject(objectLookup, folderVar, objectIDXML, globalVariables.saveToDisk);
            // entering the obejct in to the lookup table

            // ask the object to reinitialize
            //serialPort.write("ok\n");
            // todo send init to internal

            hardwareAPI.reset();

            console.log('weiter im text ' + objectIDXML);
            utilities.writeObjectToFile(objects, objectIDXML, objectsPath, globalVariables.saveToDisk);

            sceneGraph.addObjectAndChildren(objectIDXML, objects[objectIDXML]);

            objectBeatSender(beatPort, objectIDXML, objects[objectIDXML].ip);
        }
    }
}


/**
 * @desc Check for incoming MSG from other objects or the User. Make changes to the objectValues if changes occur.
 **/

var socketHandler = {};

socketHandler.sendPublicDataToAllSubscribers = function (objectKey, frameKey, nodeKey, sessionUuid) {
    var node = getNode(objectKey, frameKey, nodeKey);
    if (node) {
        for (var thisEditor in realityEditorSocketArray) {
            realityEditorSocketArray[thisEditor].forEach((thisObj) => {
                if (objectKey === thisObj.object) {
                    io.sockets.connected[thisEditor].emit('object/publicData', JSON.stringify({
                        object: objectKey,
                        frame: frameKey,
                        node: nodeKey,
                        publicData: node.publicData,
                        sessionUuid: sessionUuid // used to filter out messages received by the original sender
                    }));
                }
            });
        }
    }
};

function socketServer() {
    io.on('connection', function (socket) {
        console.log('------------ ', socket.id);
        socketHandler.socket = socket;
        //console.log('connected to socket ' + socket.id);

        socket.on('/subscribe/realityEditor', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            var thisProtocol = 'R1';

            if (!msgContent.object) {
                msgContent.object = msgContent.obj;
                thisProtocol = 'R0';
            }

            if (doesObjectExist(msgContent.object)) {
                console.log('reality editor subscription for object: ' + msgContent.object);
                console.log('the latest socket has the ID: ' + socket.id);

                if (!realityEditorSocketArray[socket.id]) realityEditorSocketArray[socket.id] = [];

                let isNew = true;
                realityEditorSocketArray[socket.id].forEach((thisObj) => {
                    if (msgContent.object === thisObj.object && msgContent.frame === thisObj.frame) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    realityEditorSocketArray[socket.id].push({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        protocol: thisProtocol
                    });
                }

            }
            var publicData = {};

            var frame = getFrame(msgContent.object, msgContent.frame);
            if (frame) {
                for (let key in frame.nodes) {
                    if (!frame.nodes[key].publicData) {
                        frame.nodes[key].publicData = {};
                    }
                    //todo Public data is owned by nodes not frames. A frame can have multiple nodes
                    // it is more efficiant to call individual public data per node.
                    //  publicData[frame.nodes[key].name] = frame.nodes[key].publicData;

                    var nodeName = frame.nodes[key].name;
                    publicData[nodeName] = frame.nodes[key].publicData;

                    io.sockets.connected[socket.id].emit('object', JSON.stringify({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        node: key,
                        data: frame.nodes[key].data
                    }));

                    io.sockets.connected[socket.id].emit('object/publicData', JSON.stringify({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        node: key,
                        publicData: frame.nodes[key].publicData
                    }));
                }
            }


        });

        socket.on('/subscribe/realityEditorPublicData', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            var thisProtocol = 'R1';

            if (!msgContent.object) {
                msgContent.object = msgContent.obj;
                thisProtocol = 'R0';
            }

            if (doesObjectExist(msgContent.object)) {
                console.log('reality editor subscription for object: ' + msgContent.object);
                console.log('the latest socket has the ID: ' + socket.id);

                if (!realityEditorSocketArray[socket.id]) realityEditorSocketArray[socket.id] = [];

                let isNew = true;
                realityEditorSocketArray[socket.id].forEach((thisObj) => {
                    if (msgContent.object === thisObj.object && msgContent.frame === thisObj.frame) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    realityEditorSocketArray[socket.id].push({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        protocol: thisProtocol
                    });
                }
                // console.log(realityEditorSocketArray);
            }

            var frame = getFrame(msgContent.object, msgContent.frame);
            if (frame) {
                for (let key in frame.nodes) {
                    if (!frame.nodes[key].publicData) {
                        frame.nodes[key].publicData = {};
                    }
                    //todo Public data is owned by nodes not frames. A frame can have multiple nodes
                    // it is more efficiant to call individual public data per node.
                    //publicData[frame.nodes[key].name] = frame.nodes[key].publicData;

                    io.sockets.connected[socket.id].emit('object/publicData', JSON.stringify({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        node: key,
                        publicData: frame.nodes[key].publicData
                    }));
                }
            }


        });

        socket.on('/subscribe/realityEditorBlock', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            if (doesObjectExist(msgContent.object)) {
                console.log('reality editor block: ' + msgContent.object);
                console.log('the latest socket has the ID: ' + socket.id);

                if (!realityEditorBlockSocketArray[socket.id])  realityEditorBlockSocketArray[socket.id] = [];
                let isNew = true;
                realityEditorBlockSocketArray[socket.id].forEach((thisObj) => {
                    if (msgContent.object === thisObj.object) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    realityEditorBlockSocketArray[socket.id].push({object: msgContent.object});
                }

                // console.log(realityEditorBlockSocketArray);
            }

            var publicData = {};

            var node = getNode(msgContent.object, msgContent.frame, msgContent.node);
            if (node) {
                var block = node.blocks[msgContent.block];
                if (block) {
                    publicData = block.publicData;
                }
            }

            // todo for each
            io.sockets.connected[socket.id].emit('block', JSON.stringify({
                object: msgContent.object,
                frame: msgContent.frame,
                node: msgContent.node,
                block: msgContent.block,
                publicData: publicData
            }));
        });

        /**
         * A hardware interface's config.html makes use of this to subscribe to
         * realtime settings updates from the hardware interface's index.js
         */
        socket.on('/subscribe/interfaceSettings', function (msg) {
            console.log('recieved /subscribe/interfaceSettings');
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (msgContent.interfaceName) {
                console.log('/subscribe/interfaceSettings for ' + msgContent.interfaceName);
                hardwareAPI.addSettingsCallback(msgContent.interfaceName, function (interfaceName, currentSettings) {
                    if (io.sockets.connected[socket.id]) {
                        io.sockets.connected[socket.id].emit('interfaceSettings', JSON.stringify({
                            interfaceName: interfaceName,
                            currentSettings: currentSettings
                        }));
                    }
                });
            }
        });

        socket.on('object', function (msg) {
            var msgContent = protocols[protocol].receive(msg);
            if (msgContent === null) {
                msgContent = protocols['R0'].receive(msg);
            }

            if (msgContent !== null) {
                hardwareAPI.readCall(msgContent.object, msgContent.frame, msgContent.node, msgContent.data);

                sendMessagetoEditors({
                    object: msgContent.object,
                    frame: msgContent.frame,
                    node: msgContent.node,
                    data: msgContent.data
                }, socket.id);
            }
        });

        socket.on('object/publicData', function (_msg) {
            var msg = typeof _msg === 'string' ? JSON.parse(_msg) : _msg;

            var node = getNode(msg.object, msg.frame, msg.node);
            if (node && msg && typeof msg.publicData !== 'undefined') {
                if (typeof node.publicData === 'undefined') {
                    node.publicData = {};
                }
                var thisPublicData = node.publicData;
                for (let key in msg.publicData) {
                    thisPublicData[key] = msg.publicData[key];
                }
            }
            hardwareAPI.readPublicDataCall(msg.object, msg.frame, msg.node, thisPublicData);
            utilities.writeObjectToFile(objects, msg.object, objectsPath, globalVariables.saveToDisk);

            // msg.sessionUuid isused to exclude sending public data to the session that sent it
            socketHandler.sendPublicDataToAllSubscribers(msg.object, msg.frame, msg.node, msg.sessionUuid);
        });

        socket.on('block/setup', function (_msg) {
            var msg = typeof _msg === 'string' ? JSON.parse(_msg) : _msg;

            const node = getNode(msg.object, msg.frame, msg.node);

            if (node) {
                if (msg.block in node.blocks && typeof msg.block !== 'undefined' && typeof node.blocks[msg.block].publicData !== 'undefined') {
                    var thisBlock = node.blocks[msg.block];
                    blockModules[thisBlock.type].setup(msg.object, msg.frame, msg.node, msg.block, thisBlock,
                        engine.processBlockLinks.bind(engine));
                }
            }
        });

        socket.on('block/publicData', function (_msg) {
            var msg = typeof _msg === 'string' ? JSON.parse(_msg) : _msg;
            var node = getNode(msg.object, msg.frame, msg.node);
            if (node) {
                if (msg.block in node.blocks && typeof msg.block !== 'undefined' && typeof node.blocks[msg.block].publicData !== 'undefined') {
                    var thisPublicData = node.blocks[msg.block].publicData;
                    for (let key in msg.publicData) {
                        thisPublicData[key] = msg.publicData[key];
                    }
                }
            }
        });

        // this is only for down compatibility for when the UI would request a readRequest
        socket.on('/object/readRequest', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            messagetoSend(msgContent, socket.id);
        });

        socket.on('/object/screenObject', function (_msg) {
            var msg = typeof _msg === 'string' ? JSON.parse(_msg) : _msg;
            hardwareAPI.screenObjectCall(JSON.parse(msg));
        });

        socket.on('/subscribe/realityEditorUpdates', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            if (!realityEditorUpdateSocketArray[socket.id]) realityEditorUpdateSocketArray[socket.id] = [];
            let isNew = true;
            realityEditorUpdateSocketArray[socket.id].forEach((thisObj) => {
                if (msgContent.editorId === thisObj.editorId) {
                    isNew = false;
                }
            });
            if (isNew) {
                realityEditorUpdateSocketArray[socket.id].push({editorId: msgContent.editorId});
                console.log('editor ' + msgContent.editorId + ' subscribed to updates', realityEditorUpdateSocketArray);
            }
        });

        socket.on('/update', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            for (const socketId in realityEditorUpdateSocketArray) {
                const subList = realityEditorUpdateSocketArray[socketId];
                if (!subList) {
                    continue;
                }
                subList.forEach((thisObj) => {
                    if (msgContent.hasOwnProperty('editorId') && msgContent.editorId === thisObj.editorId) {
                    //  console.log('dont send updates to the editor that triggered it');
                        return;
                    }
                    var thisSocket = io.sockets.connected[socketId];
                    if (thisSocket) {
                        console.log('update ' + msgContent.propertyPath + ' to ' + msgContent.newValue + ' (from ' + msgContent.editorId + ' -> ' + thisObj.editorId + ')');
                        thisSocket.emit('/update', JSON.stringify(msgContent));
                    }
                });
            }
        });

        // relays realtime updates (to matrix, x, y, scale, etc) from one client to the rest of the clients
        // clients are responsible for batching and processing the batched updates at whatever frequency they prefer
        socket.on('/batchedUpdate', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            let batchedUpdates = msgContent.batchedUpdates;
            if (!batchedUpdates) { return; }

            for (const socketId in realityEditorUpdateSocketArray) {
                const subList = realityEditorUpdateSocketArray[socketId];
                if (!subList) {
                    continue;
                }

                subList.forEach((sub) => {
                    if (msgContent.hasOwnProperty('editorId') && msgContent.editorId === sub.editorId) {
                        //  console.log('dont send updates to the editor that triggered it');
                        return;
                    }
                    var thisSocket = io.sockets.connected[socketId];
                    if (thisSocket) {
                        thisSocket.emit('/batchedUpdate', JSON.stringify(msgContent));
                    }
                });
            }
        });

        // remote operators can subscribe to all other remote operator's camera positions using this method
        // body should contain a unique "editorId" string identifying the client
        socket.on('/subscribe/cameraMatrix', function (msg) {
            var msgContent = JSON.parse(msg);
            realityEditorCameraMatrixSocketArray[socket.id] = {editorId: msgContent.editorId};
            console.log('editor ' + msgContent.editorId + ' subscribed to camera matrices', realityEditorCameraMatrixSocketArray);
        });

        // remote operators can broadcast their camera position to all others using this method
        // body should contain the unique "editorId" of the client as well as its "cameraMatrix" (length 16 array)
        socket.on('/cameraMatrix', function (msg) {
            var msgContent = JSON.parse(msg);

            for (const socketId in realityEditorCameraMatrixSocketArray) {
                if (msgContent.hasOwnProperty('editorId') && msgContent.editorId === realityEditorCameraMatrixSocketArray[socketId].editorId) {
                    continue; // dont send updates to the editor that triggered it
                }

                var thisSocket = io.sockets.connected[socketId];
                if (thisSocket) {
                    thisSocket.emit('/cameraMatrix', JSON.stringify(msgContent));
                }
            }
        });

        socket.on('/subscribe/objectUpdates', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (!realityEditorObjectMatrixSocketArray[socket.id]) realityEditorObjectMatrixSocketArray[socket.id] = [];

            let isNew = true;
            realityEditorObjectMatrixSocketArray[socket.id].forEach((thisObj) => {
                if (msgContent.editorId === thisObj.editorId) {
                    isNew = false;
                }
            });

            if (isNew) {
                realityEditorObjectMatrixSocketArray[socket.id].push({editorId: msgContent.editorId});
                console.log('editor ' + msgContent.editorId + ' subscribed to object matrix updates');
            }

        });

        socket.on('/update/object/matrix', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            var object = getObject(msgContent.objectKey);
            if (!object) {
                return;
            }
            if (!msgContent.hasOwnProperty('matrix')) {
                return;
            }

            object.matrix = msgContent.matrix;

            if (typeof msgContent.worldId !== 'undefined' && msgContent.worldId !== object.worldId) {
                object.worldId = msgContent.worldId;
                console.log('object ' + object.name + ' is relative to world: ' + object.worldId);
                sceneGraph.updateObjectWorldId(msgContent.objectKey, object.worldId);
            }

            for (var socketId in realityEditorObjectMatrixSocketArray) {
                realityEditorObjectMatrixSocketArray[socketId].forEach((thisObj) => {
                    if (msgContent.hasOwnProperty('editorId') && thisObj && msgContent.editorId === thisObj.editorId) {
                        // don't send updates to the editor that triggered it
                        return;
                    }

                    var thisSocket = io.sockets.connected[socketId];
                    if (thisSocket) {
                        // console.log('update matrix for ' + msgContent.objectKey + ' (from ' + msgContent.editorId + ' -> ' + realityEditorUpdateSocketArray[socketId].editorId + ')');

                        var updateResponse = {
                            objectKey: msgContent.objectKey,
                            propertyPath: 'matrix',
                            newValue: msgContent.matrix,
                        };
                        if (typeof msgContent.editorId !== 'undefined') {
                            updateResponse.editorId = msgContent.editorId;
                        }

                        thisSocket.emit('/update/object/matrix', JSON.stringify(updateResponse));
                    }
                });
            }
        });

        socket.on('/update/object/position', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            var object = getObject(msgContent.objectKey);
            if (!object) {
                return;
            }

            var position = msgContent.position;
            var rotationInRadians;
            if (typeof msgContent.rotationInRadians !== 'undefined') {
                rotationInRadians = msgContent.rotationInRadians;
            } else if (typeof msgContent.rotationInDegrees !== 'undefined') {
                rotationInRadians = (msgContent.rotationInDegrees / 180) * Math.PI;
            }

            var matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            matrix[0] = Math.cos(rotationInRadians);
            matrix[1] = -Math.sin(rotationInRadians);
            matrix[4] = Math.sin(rotationInRadians);
            matrix[5] = Math.cos(rotationInRadians);
            matrix[12] = position.x;
            matrix[13] = position.y;
            matrix[14] = position.z;

            object.matrix = matrix;

            for (var socketId in realityEditorObjectMatrixSocketArray) {
                realityEditorObjectMatrixSocketArray[socketId].forEach((thisObj) => {
                    if (msgContent.hasOwnProperty('editorId') && thisObj && msgContent.editorId === thisObj.editorId) {
                        // don't send updates to the editor that triggered it
                        return;
                    }

                    var thisSocket = io.sockets.connected[socketId];
                    if (thisSocket) {
                        // console.log('update matrix for ' + msgContent.objectKey + ' (from ' + msgContent.editorId + ' -> ' + realityEditorUpdateSocketArray[socketId].editorId + ')');

                        var updateResponse = {
                            objectKey: msgContent.objectKey,
                            propertyPath: 'matrix',
                            newValue: object.matrix,
                        };
                        if (typeof msgContent.editorId !== 'undefined') {
                            updateResponse.editorId = msgContent.editorId;
                        }

                        thisSocket.emit('/update/object/matrix', JSON.stringify(updateResponse));
                    }
                });
            }
        });

        // create or update the position of a HumanPoseObject
        socket.on('/update/humanPoses', function (msg) {
            if (!globalVariables.listenForHumanPose) {
                return;
            }
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (!msgContent) {
                return;
            }

            // if no poses changed this frame, don't clog the network with sending the same information
            var didAnythingChange = false;
            forEachHumanPoseObject(function (objectKey, thisObject) {
                thisObject.wasUpdated = false;
            });

            msgContent.forEach(function (poseInfo) {
                var objectId = HumanPoseObject.getObjectId(poseInfo.id);
                var thisObject = objects[objectId];
                if (!doesObjectExist(objectId)) {
                    // create an object if needed
                    const ip = services.ip;
                    objects[objectId] = new HumanPoseObject(ip, version, protocol, poseInfo.id);
                    thisObject = objects[objectId];
                    // advertise to editors
                    objectBeatSender(beatPort, objectId, thisObject.ip, true);
                    // currently doesn't writeObjectToFile, because I've found no need for human objects to persist
                }
                // update the position of each frame based on the poseInfo
                thisObject.updateJointPositions(poseInfo.joints);
                thisObject.wasUpdated = true; // flags objects to be deleted if they are not updated
                didAnythingChange = true;
            });

            // check if any Human Objects were not contained in msgContent, and delete them
            forEachHumanPoseObject(function (objectKey, thisObject) {
                if (!thisObject.wasUpdated) {
                    console.log('delete human pose object', objectKey);
                    didAnythingChange = true;
                    try {
                        objects[objectKey].deconstruct();
                    } catch (e) {
                        console.warn('(Human) Object exists without proper prototype: ' + objectKey, e);
                    }
                    delete objects[objectKey];
                    // todo: delete folder recursive if necessary?
                    // ^ might not actually be needed, why would human object need to persist?
                }
            });

            if (!didAnythingChange) {
                return;
            }

            // send updated objects / positions to all known editors. right now piggybacks on sockets opened for other realtime communications.
            for (var socketId in realityEditorObjectMatrixSocketArray) {
                var thisSocket = io.sockets.connected[socketId];
                if (thisSocket) {
                    // sends an array of objectIds for the visible poses in this timestep
                    var visibleHumanPoseObjects = Object.keys(objects).filter(function (objectKey) {
                        return objects[objectKey].isHumanPose;
                    });
                    var updateResponse = {
                        visibleHumanPoseObjects: visibleHumanPoseObjects
                    };
                    // also sends all object JSON data for each visible pose object
                    var objectData = {};
                    visibleHumanPoseObjects.forEach(function (objectKey) {
                        objectData[objectKey] = objects[objectKey];
                    });
                    updateResponse.objectData = objectData;

                    // TODO: we should only need to send object matrix, and each frame.ar (x,y,matrix) for each pose object
                    // this doesn't work right now because we also need the full JSON to instantly create the object on the client for a newly detected pose
                    // but there might be a way in the future to only send full data for objects that are newly detected
                    // to reduce the bandwidth used by constantly sending object/frame/pose information to all clients
                    // var compressedObjectData = {};
                    // visibleHumanPoseObjects.forEach(function(objectKey) {
                    //     compressedObjectData[objectKey] = {
                    //         ip: objects[objectKey].ip
                    //         matrix: objects[objectKey].matrix
                    //     };
                    //     for (var frameKey in objects[objectKey].frames) {
                    //         compressedObjectData[frameKey] = objects[objectKey].frames[frameKey].ar;
                    //     }
                    // });
                    // updateResponse.compressedObjectData = compressedObjectData;

                    thisSocket.emit('/update/humanPoses', JSON.stringify(updateResponse));
                }
            }
        });

        socket.on('node/setup', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (!msgContent) {
                return;
            }

            var objectKey = msgContent.object;
            var frameKey = msgContent.frame;
            var nodeData = msgContent.nodeData;

            var frame = getFrame(objectKey, frameKey);
            if (!frame) {
                console.warn('could not find frame for node/setup', objectKey, frameKey, nodeData);
                return;
            }

            var nodeKey = frameKey + nodeData.name;

            // this function can be called multiple times... only set up the new node if it doesnt already exist
            if (typeof frame.nodes[nodeKey] === 'undefined') {
                console.log('creating node ' + nodeKey);
                var newNode = new Node(nodeData.name, nodeData.type, objectKey, frameKey, nodeKey);
                frame.nodes[nodeKey] = newNode;
                newNode.objectId = objectKey;
                newNode.frameId = frameKey;

                if (typeof nodeData.x !== 'undefined') {
                    newNode.x = nodeData.x;
                } else {
                    newNode.x = utilities.randomIntInc(0, 200) - 100; // nodes are given a random position if not specified
                }
                if (typeof nodeData.y !== 'undefined') {
                    newNode.y = nodeData.y;
                } else {
                    newNode.y = utilities.randomIntInc(0, 200) - 100;
                }
                if (typeof nodeData.scaleFactor !== 'undefined') {
                    newNode.scale = nodeData.scaleFactor;
                }
                newNode.scale *= 0.25; // TODO fix this without hard coding
                if (typeof nodeData.defaultValue !== 'undefined') {
                    newNode.data.value = nodeData.defaultValue;
                }

                // notify each editor to reload the frame with the new node it has
                utilities.actionSender({reloadFrame: {object: objectKey, frame: frameKey}, lastEditor: null});
            }
        });

        socket.on('disconnect', function () {

            if (socket.id in realityEditorSocketArray) {
                delete realityEditorSocketArray[socket.id];
                console.log('GUI for ' + socket.id + ' has disconnected');
            }

            if (socket.id in realityEditorBlockSocketArray) {
                realityEditorBlockSocketArray[socket.id].forEach((thisObj) => {
                    utilities.writeObjectToFile(objects, thisObj.object, objectsPath, globalVariables.saveToDisk);
                    utilities.actionSender({reloadObject: {object: thisObj.object}});
                });
                delete realityEditorBlockSocketArray[socket.id];
                console.log('Settings for ' + socket.id + ' has disconnected');
            }

            if (socket.id in realityEditorObjectMatrixSocketArray) {
                delete realityEditorObjectMatrixSocketArray[socket.id];
            }

            if (socket.id in realityEditorUpdateSocketArray) {
                let matchingAvatarKeys = [];
                realityEditorUpdateSocketArray[socket.id].forEach(entry => {
                    let matchingKeys = Object.keys(objects).filter(key => key.includes('_AVATAR_') && key.includes(entry.editorId));
                    matchingAvatarKeys.push(matchingKeys);
                });
                
                console.log('delete avatar objects: ', matchingAvatarKeys.flat());
                matchingAvatarKeys.flat().forEach(avatarObjectKey => {
                    utilities.deleteObject(objects[avatarObjectKey].name, objectsPath, objectLookup, activeHeartbeats, knownObjects, sceneGraph, setAnchors);
                });

                delete realityEditorUpdateSocketArray[socket.id];
            }

            if (socket.id in realityEditorCameraMatrixSocketArray) {
                delete realityEditorCameraMatrixSocketArray[socket.id];
            }
        });
    });
    this.io = io;
    console.log('socket.io started');
}

function sendMessagetoEditors(msgContent, sourceSocketID) {

    // console.log(Object.keys(realityEditorSocketArray).length + ' editor sockets connected');

    for (var thisEditor in realityEditorSocketArray) {
        realityEditorSocketArray[thisEditor].forEach((thisObj) => {
            if (typeof sourceSocketID !== 'undefined' && thisEditor === sourceSocketID && msgContent.object === thisObj.object && msgContent.frame === thisObj.frame) {
                return; // don't trigger the read listener of the socket that originally wrote the data
            }

            if (msgContent.object === thisObj.object && msgContent.frame === thisObj.frame) {
                messagetoSend(msgContent, thisEditor);
            }
        });
    }
}

/////////
// UTILITY FUNCTIONS FOR SAFELY GETTING OBJECTS, FRAMES, AND NODES
/////////

function doesObjectExist(objectKey) {
    return objects.hasOwnProperty(objectKey);
}

function getObject(objectKey) {
    if (doesObjectExist(objectKey)) {
        return objects[objectKey];
    }
    return null;
}

// invokes callback(objectID, object) for each object
function forEachObject(callback) {
    for (var objectID in objects) {
        callback(objectID, objects[objectID]);
    }
}

function forEachHumanPoseObject(callback) {
    for (var objectID in objects) {
        if (objects[objectID].isHumanPose) {
            callback(objectID, objects[objectID]);
        }
    }
}

function doesFrameExist(objectKey, frameKey) {
    if (doesObjectExist(objectKey)) {
        var foundObject = getObject(objectKey);
        if (foundObject) {
            return foundObject.frames.hasOwnProperty(frameKey);
        }
    }
    return false;
}

function getFrame(objectKey, frameKey) {
    if (doesFrameExist(objectKey, frameKey)) {
        var foundObject = getObject(objectKey);
        if (foundObject) {
            return foundObject.frames[frameKey];
        }
    }
    return null;
}

function doesNodeExist(objectKey, frameKey, nodeKey) {
    if (doesFrameExist(objectKey, frameKey)) {
        var foundFrame = getFrame(objectKey, frameKey);
        if (foundFrame) {
            return foundFrame.nodes.hasOwnProperty(nodeKey);
        }
    }
    return false;
}

function getNode(objectKey, frameKey, nodeKey) {
    if (doesNodeExist(objectKey, frameKey, nodeKey)) {
        var foundFrame = getFrame(objectKey, frameKey);
        if (foundFrame) {
            return foundFrame.nodes[nodeKey];
        }
    }
    return null;
}

function messagetoSend(msgContent, socketID) {

    var node = getNode(msgContent.object, msgContent.frame, msgContent.node);
    if (node) {
        // console.log(socketID);
        io.sockets.connected[socketID].emit('object', JSON.stringify({
            object: msgContent.object,
            frame: msgContent.frame,
            node: msgContent.node,
            data: node.data
        }));
    }
}


hardwareAPI.screenObjectServerCallBack(function (object, frame, node, touchOffsetX, touchOffsetY) {
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
    trigger: function (object, frame, node, thisNode, link = null) {
        if (!thisNode.processedData)
            thisNode.processedData = {};

        thisNode.processLink = link;

        if (!this.nodeTypeModules.hasOwnProperty(thisNode.type)) {
            return;
        }

        this.nodeTypeModules[thisNode.type].render(
            object, frame, node, thisNode, this.processLinks.bind(this), nodeUtilities
        );
    },
    // once data is processed it will determin where to send it.
    processLinks: function (object, frame, node, thisNode) {

        var thisFrame = getFrame(object, frame);

        // process a single link or all links for a node.
        if (thisNode.processLink) {
            this.link = thisFrame.links[thisNode.processLink];
            this.processLink(object, frame, node, thisNode, thisNode.processLink);
        } else {
            for (var linkKey in thisFrame.links) {
                this.link = thisFrame.links[linkKey];
                this.processLink(object, frame, node, thisNode, linkKey);
            }
        }
    },
    processLink: function (object, frame, node, thisNode, linkKey) {
        if (this.link.nodeA === node && this.link.objectA === object && this.link.frameA === frame) {
            if (!checkObjectActivation(this.link.objectB)) {
                socketSender(object, frame, linkKey, thisNode.processedData);
            } else {

                if (!doesNodeExist(this.link.objectB, this.link.frameB, this.link.nodeB)) return;

                this.internalObjectDestination = getNode(this.link.objectB, this.link.frameB, this.link.nodeB);

                // if this is a regular node, not a logic node, process normally
                if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                    this.computeProcessedData(thisNode, this.link, this.internalObjectDestination);
                } else {
                    // otherwise process as logic node by triggering its internal blocks connected to each input
                    this.blockKey = 'in' + this.link.logicB;

                    if (this.internalObjectDestination && this.blockKey) {
                        if (this.internalObjectDestination.blocks) {
                            this.internalObjectDestination = this.internalObjectDestination.blocks[this.blockKey];

                            /* for (let key in thisNode.processedData) {
                                this.internalObjectDestination.data[0][key] = thisNode.processedData[key];
                            }*/
                            this.internalObjectDestination.data[0] = utilities.deepCopy(thisNode.processedData);

                            this.nextLogic = getNode(this.link.objectB, this.link.frameB, this.link.nodeB);
                            // this needs to be at the beginning;
                            if (!this.nextLogic.routeBuffer) {
                                this.nextLogic.routeBuffer = [0, 0, 0, 0];
                            }

                            this.nextLogic.routeBuffer[this.link.logicB] = thisNode.processedData.value;
                            this.blockTrigger(this.link.objectB, this.link.frameB, this.link.nodeB, this.blockKey, 0, this.internalObjectDestination);
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
        /*  let key;
        for (key in thisNode.processedData) {
            internalObjectDestination.data[key] = thisNode.processedData[key];
        }*/
        internalObjectDestination.data = utilities.deepCopy(thisNode.processedData);

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

        if (!this.blockModules.hasOwnProperty(thisBlock.type)) {
            return;
        }

        this.blockModules[thisBlock.type].render(
            object, frame, node, block, index, thisBlock,
            this.processBlockLinks.bind(this), nodeUtilities);
    },
    // this is for after a logic block is processed.
    processBlockLinks: function (object, frame, node, block, index, thisBlock) {

        for (var i = 0; i < 4; i++) {

            // check if there is data to be processed
            if (typeof thisBlock.processedData[i].value === 'number' || typeof thisBlock.processedData[i].value === 'object') {

                this.router = null;

                if (block === 'out0') this.router = 0;
                if (block === 'out1') this.router = 1;
                if (block === 'out2') this.router = 2;
                if (block === 'out3') this.router = 3;

                var linkKey;

                var foundFrame = getFrame(object, frame);

                if (this.router !== null) {

                    for (linkKey in foundFrame.links) {
                        this.link = foundFrame.links[linkKey];

                        if (this.link.nodeA === node && this.link.objectA === object && this.link.frameA === frame && this.link.logicA === this.router) {
                            if (!(checkObjectActivation(this.link.objectB))) {
                                socketSender(object, frame, linkKey, thisBlock.processedData[i]);
                            } else {
                                this.internalObjectDestination = getNode(this.link.objectB, this.link.frameB, this.link.nodeB);

                                if (this.link.logicB !== 0 && this.link.logicB !== 1 && this.link.logicB !== 2 && this.link.logicB !== 3) {
                                    this.computeProcessedBlockData(thisBlock, this.link, i, this.internalObjectDestination);
                                }
                            }
                        }
                    }
                } else {
                    this.logic = getNode(object, frame, node);
                    // process all links in the block
                    for (linkKey in this.logic.links) {
                        if (this.logic.links[linkKey] && this.logic.links[linkKey].nodeA === block && this.logic.links[linkKey].logicA === i) {

                            this.link = this.logic.links[linkKey];

                            this.internalObjectDestination = this.logic.blocks[this.link.nodeB];
                            /* let key;
                            for (key in thisBlock.processedData[i]) {
                                this.internalObjectDestination.data[this.link.logicB][key] = thisBlock.processedData[i][key];
                            }*/
                            this.internalObjectDestination.data[this.link.logicB] = utilities.deepCopy(thisBlock.processedData[i]);
                            this.blockTrigger(object, frame, node, this.link.nodeB, this.link.logicB, this.internalObjectDestination);
                        }
                    }
                }
            }
        }
    },

    computeProcessedBlockData: function (thisNode, thisLink, index, internalObjectDestination) {
        // save data in local destination object;
        /* for (let key1 in thisNode.processedData[index]) {
            internalObjectDestination.data[key1] = thisNode.processedData[index][key1];
        }*/
        internalObjectDestination.data = utilities.deepCopy(thisNode.processedData[index]);

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
    var foundFrame = getFrame(object, frame);
    var thisLink = foundFrame.links[link];

    var msg = '';

    if (thisLink.objectB in knownObjects) {
        if (knownObjects[thisLink.objectB].protocol) {
            var thisProtocol = knownObjects[thisLink.objectB].protocol;
            if (thisProtocol in protocols) {
                msg = protocols[thisProtocol].send(thisLink.objectB, thisLink.frameB, thisLink.nodeB, thisLink.logicB, data);
            } else {
                msg = protocols['R0'].send(thisLink.objectB, thisLink.nodeB, data);
            }
        } else {
            msg = protocols['R0'].send(thisLink.objectB, thisLink.nodeB, data);
        }

        try {
            var thisOtherIp = knownObjects[thisLink.objectB].ip;
            var presentObjectConnection = socketArray[thisOtherIp].io;
            if (presentObjectConnection.connected) {
                presentObjectConnection.emit('object', msg);
            }
        } catch (e) {
            console.log('can not emit from link ID:' + link + 'and object: ' + object, e);
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
// TODO: implement new object lookup functions here
function socketUpdater() {
    // console.log(knownObjects);
    // delete unconnected connections
    for (let sockKey in socketArray) {
        var socketIsUsed = false;

        // check if the link is used somewhere. if it is not used delete it.
        forEachObject(function (objectKey, object) {
            for (var frameKey in object.frames) {
                var frame = getFrame(objectKey, frameKey);
                for (var linkKey in frame.links) {
                    var thisSocket = knownObjects[frame.links[linkKey].objectB];
                    if (thisSocket === sockKey) {
                        socketIsUsed = true;
                    }
                }
            }
        });
        if (!socketArray[sockKey].io.connected || !socketIsUsed) {
            // delete socketArray[sockKey]; // TODO: why is this removed? can it safely be added again?
        }
    }

    forEachObject(function (objectKey, object) {
        for (var frameKey in object.frames) {
            for (var linkKey in object.frames[frameKey].links) {
                var thisLink = object.frames[frameKey].links[linkKey];

                if (!checkObjectActivation(thisLink.objectB) && (thisLink.objectB in knownObjects)) {
                    var thisOtherIp = knownObjects[thisLink.objectB].ip;
                    if (!(thisOtherIp in socketArray)) {
                        // console.log("should not show up -----------");
                        let socket = new ToolSocket.Io();
                        socketArray[thisOtherIp] = new ObjectSocket(socket, socketPort, thisOtherIp);
                    }
                }
            }
        }
    });

    socketIndicator();

    if (sockets.socketsOld !== sockets.sockets || sockets.notConnectedOld !== sockets.notConnected || sockets.connectedOld !== sockets.connected) {
        for (var socketKey in socketArray) {
            if (!socketArray[socketKey].io.connected) {
                for (var objectKey in knownObjects) {
                    if (knownObjects[objectKey] === socketKey) {
                        console.log('Looking for: ' + objectKey + ' with the ip: ' + socketKey);
                    }
                }
            }
        }

        console.log(sockets.sockets + ' connections; ' + sockets.connected + ' connected and ' + sockets.notConnected + ' not connected');

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
 * Runs socketUpdater every socketUpdateInterval milliseconds
 */
function socketUpdaterInterval() {
    setInterval(function () {
        socketUpdater();
    }, socketUpdateInterval);
}

/**
 * @param {string} id - object id
 * @return {boolean} whether the object is activated
 */
function checkObjectActivation(id) {
    var object = getObject(id);
    if (object) {
        return !object.deactivated;
    }
    return false;
}

// sets up controllers with access to various objects
setupControllers();

function setupControllers() {
    blockController.setup(objects, blockModules, globalVariables, engine, objectsPath);
    blockLinkController.setup(objects, globalVariables, objectsPath);
    frameController.setup(objects, globalVariables, hardwareAPI, __dirname, objectsPath, identityFolderName, nodeTypeModules, sceneGraph);
    linkController.setup(objects, knownObjects, socketArray, globalVariables, hardwareAPI, objectsPath, socketUpdater, engine);
    logicNodeController.setup(objects, globalVariables, objectsPath, identityFolderName, Jimp);
    nodeController.setup(objects, globalVariables, objectsPath, sceneGraph);
    objectController.setup(objects, globalVariables, hardwareAPI, objectsPath, identityFolderName, git, sceneGraph);
    spatialController.setup(objects, globalVariables, hardwareAPI, sceneGraph);
}

checkInit('system');

function checkInit(init) {
    var initializations = globalVariables.initializations;
    if (init == 'web') initializations.web = true;
    if (init == 'udp') initializations.udp = true;
    if (init == 'system') initializations.system = true;

    if (initializations.web && initializations.udp && initializations.system) {
        hardwareAPI.initialize();
    }
}
