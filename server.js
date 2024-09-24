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
    console.warn('\x1b[33mYou\'re not done with the installation! You need to execute the following commands:');
    console.warn('\x1b[0m1.\x1b[32m npm install');
    console.warn('\x1b[0m2.\x1b[32m git submodule update --init --recursive');
    console.warn('\x1b[0m3.\x1b[32m cd addons/vuforia-spatial-core-addon');
    console.warn('\x1b[0m4.\x1b[32m npm install', '\x1b[0m');
    console.warn('');
    console.warn('');
    console.warn('\x1b[33mWhenever you install a new addon make sure to:', '\x1b[0m');
    console.warn('\x1b[0m3.\x1b[32m cd addons/<new addon folder>');
    console.warn('\x1b[0m4.\x1b[32m npm install', '\x1b[0m');

    if (process.send) {
        process.send('exit');
    }

    let keepRunning = true;
    while (keepRunning) {
        // Since process.send is async, just hold the server for preventing more errors
    }
}

const _logger = require('./logger');
const {objectsPath, beatPort, serverPort, allowSecureMode, persistToCloud} = require('./config');
const {providedServices} = require('./services');

const os = require('os');
const {isLightweightMobile, isStandaloneMobile} = require('./isMobile.js');

// These variables are used for global status, such as if the server sends debugging messages and if the developer
// user interfaces should be accesable
const globalVariables = {
    // Show developer web GUI
    developer: true,
    // Send more debug messages to console
    debug: false,
    isMobile: isLightweightMobile && !isStandaloneMobile,
    // Prohibit saving to file system if we're in a mobile env that doesn't
    // support that
    saveToDisk: !isLightweightMobile || isStandaloneMobile,
    // Create an object for attaching frames to the world
    worldObject: isLightweightMobile || isStandaloneMobile,
    listenForHumanPose: false,
    initializations: {
        udp: false,
        web: false,
        system: false
    },
    useHTTPS: allowSecureMode &&
        !(isLightweightMobile || isStandaloneMobile) // on mobile devices node.js doesn't fully support HTTPS
};

exports.useHTTPS = globalVariables.useHTTPS;

let forceGCInterval = null;
if (global.gc) {
    setInterval(() => {
        const usage = process.memoryUsage();
        // Total memory usage less than 100 MB
        if (!usage || usage.rss < 100 * 1024 * 1024) {
            return;
        }

        global.gc();
    }, 7919); // arbitrary prime number delay to distribute around the gc hitches
}

// ports used to define the server behaviour
/*
 The server uses port 8080 to communicate with other servers and with the Reality Editor.
 As such the Server reacts to http and web sockets on this port.

 The beat port is used to send UDP broadcasting messages in  a local network. The Reality Editor and other Objects
 pick up these messages to identify the object.

 */

const serverUserInterfaceAppPort = 49368;
const socketPort = serverPort;     // server and socket port are always identical
exports.serverPort = serverPort;
exports.beatPort = beatPort;
const timeToLive = 3;                     // the amount of routers a UDP broadcast can jump. For a local network 2 is enough.
const beatInterval = 5000;         // how often is the heartbeat sent
const socketUpdateIntervalMs = 2000; // how often the system checks if the socket connections are still up and running.
let socketUpdaterInterval;

const netmask = '255.255.0.0'; // define the network scope from which this server is accessable.
// for a local network 255.255.0.0 allows a 16 bit block of local network addresses to reach the object.
// basically all your local devices can see the object, however the internet is unable to reach the object.

const fs = require('fs');       // Filesystem library
const fsProm = require('./persistence/fsProm.js');
const SyncInterval = require('./persistence/syncInterval.js');
const syncInterval = new SyncInterval();
const path = require('path');
const DecompressZip = require('decompress-zip');
const dirTree = require('directory-tree');

const addonPaths = [
    path.join(__dirname, 'addons'),
    path.join(os.homedir(), 'Documents', 'spatialToolbox-addons'),
];

const Addons = require('./libraries/addons/Addons');
const AddonFolderLoader = require('./libraries/addons/AddonFolderLoader');
const AddonSecretsLoader = require('./libraries/addons/AddonSecretsLoader');

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
// The web service level on which objects are accessable. http(s)://<IP>:8080 <objectInterfaceFolder> <object>
const objectInterfaceFolder = '/';

/**********************************************************************************************************************
 ******************************************** Requirements ************************************************************
 **********************************************************************************************************************/
const storage = require('./libraries/storage');
let dir = path.join(require('os').homedir(), 'vst-edge-server');

try {
    storage.initSync({dir: dir});
} catch (e) {
    console.error('Something went wrong with initSync', e);
}

var dgram = require('dgram'); // UDP Broadcasting library
let udpServer;

var services = {};
if (!isLightweightMobile) {
    services.networkInterface = require('network-interfaces');
}

services.ips = {activeInterface: null, tempActiveInterface: null, interfaces: {}};
services.ip = null;
services.updateAllObjects = function (ip) {
    for (let key in objects) {
        objects[key].ip = ip;
    }
};
services.getIP = function () {
    this.ips.interfaces = {};
    // if this is mobile, only allow local interfaces
    if (isLightweightMobile) {
        this.ips.interfaces['mobile'] = 'localhost';
        this.ips.activeInterface = 'mobile';
        return 'localhost';
    }

    // Get All available interfaces
    let interfaceNames;
    try {
        interfaceNames = this.networkInterface.getInterfaces({ipVersion: 4});
        let interfaceNamesFiltered = interfaceNames.filter((interfaceName) => {
            return !interfaceName.startsWith('utun'); // discard docker's virtual network interface on mac
        });
        if (interfaceNamesFiltered.length > 0) {
            interfaceNames = interfaceNamesFiltered;
        }
    } catch (e) {
        console.error('Failed to get network interfaces', e);
        return this.ip;
    }

    if (isStandaloneMobile) {
        let knownGoodMobileInterfaces = {
            en0: true,
        };
        interfaceNames = interfaceNames.filter(interfaceName => {
            return knownGoodMobileInterfaces[interfaceName];
        });
        if (interfaceNames.length === 0) {
            this.ips.interfaces['mobile'] = 'localhost';
            this.ips.activeInterface = 'mobile';
            return 'localhost';
        }
    }

    for (let key in interfaceNames) {
        let tempIps = this.networkInterface.toIps(interfaceNames[key], {ipVersion: 4});
        tempIps = tempIps.filter(ip => !['127.0.0.1', 'localhost'].includes(ip));
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
        // No active interface found, defaulting to "en0"
        this.ips.activeInterface = 'en0';
        // make sure all objects got the memo
        this.updateAllObjects(this.ips.interfaces[this.ips.activeInterface]);
    }

    // if activeInterface is not available, get the first available one and refresh all objects
    if (!(this.ips.activeInterface in this.ips.interfaces)) {
        console.warn(`Current active network interface "${this.ips.activeInterface}" not found`);
        this.ips.tempActiveInterface = this.ips.activeInterface;
        for (var tempKey in this.ips.interfaces) {
            if (!this.ips.interfaces[tempKey]) {
                continue;
            }
            console.warn(`Activated fallback network interface "${tempKey}" from`, this.ips.interfaces);
            this.ips.activeInterface = tempKey;
            // make sure all objects got the memo
            this.updateAllObjects(this.ips.interfaces[this.ips.activeInterface]);
            break;
        }
    }

    // check if active interface is back
    if (this.ips.tempActiveInterface) {
        if (this.ips.tempActiveInterface in this.ips.interfaces) {
            console.info(`Re-activated network interface "${this.ips.tempActiveInterface}"`);
            this.ips.activeInterface = this.ips.tempActiveInterface;
            this.ips.tempActiveInterface = null;
        }
    }
    // return active IP
    return this.ips.interfaces[this.ips.activeInterface];
};

exports.getIP = services.getIP.bind(services);

services.ip = services.getIP(); //ip.address();

var express = require('express'); // Web Sever library

const {
    identityFolderName,
    protocol,
    version,
} = require('./constants.js');

// This file hosts the functions related to loading the set of available frames
// from the each add-ons tools directory
const AddonFrames = require('./libraries/addons/AddonFrames');
const addonFrames = new AddonFrames();
const frameFolderLoader = new AddonFolderLoader(frameLibPaths);
frameFolderLoader.calculatePathResolution();

for (const frameLibPath of frameLibPaths) {
    if (fs.existsSync(frameLibPath)) {
        addonFrames.addFramesSource(frameLibPath);
    }
}

if (process.env.NODE_ENV !== 'test' && persistToCloud) {
    syncInterval.start();
}

// constrution for the werbserver using express combined with socket.io
var webServer = express();
exports.webServer = webServer;

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

let httpServer = null;
if (globalVariables.useHTTPS) {
    let options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };
    httpServer = require('https').createServer(options, webServer);
} else {
    httpServer = require('http').createServer(webServer);
}


const http = httpServer.listen(serverPort, function () {
    console.info('Server (http' + (globalVariables.useHTTPS ? 's' : '') + ' and websockets) is listening on port', serverPort);
    checkInit('web');
});

const ToolSocket = require('toolsocket');
const io = new ToolSocket.Server({server: http, maxPayload: 1024 * 1024 * 1024}); // Websocket library
io.addEventListener('listening', () => {
    console.info(`ToolSocket server started`);
});
exports.io = io;

var cors = require('cors');             // Library for HTTP Cross-Origin-Resource-Sharing
var formidable = require('formidable'); // Multiple file upload library
var cheerio = require('cheerio');

// use the cors cross origin REST model
// allow requests from all origins. TODO make it dependent on the local network. this is important for security
webServer.use(cors());

// Image resizing library, not available on mobile
let Jimp = null;
if (!isLightweightMobile) {
    try {
        Jimp = require('jimp');
    } catch (e) {
        console.warn('Unable to import jimp for image resizing on this platform', e);
    }
}

// additional files containing project code

// This file hosts all kinds of utilities programmed for the server
const utilities = require('./libraries/utilities');
const {fileExists, mkdirIfNotExists, rmdirIfExists, unlinkIfExists} = utilities;
const nodeUtilities = require('./libraries/nodeUtilities');
const recorder = require('./libraries/recorder');

// The web frontend a developer is able to see when creating new user interfaces.
let webFrontend;
if (isLightweightMobile) {
    webFrontend = require('./libraries/mobile/webFrontend');
} else {
    webFrontend = require('./libraries/webFrontend');
}

// Definition for a simple API for hardware interfaces talking to the server.
// This is used for the interfaces defined in the hardwareAPI folder.
let hardwareAPI;
if (isLightweightMobile) {
    hardwareAPI = require('./libraries/mobile/hardwareInterfaces');
} else {
    hardwareAPI = require('./libraries/hardwareInterfaces');
}

// This file hosts the constructor and class methods for human pose objects (generated by human body tracking)
const HumanPoseObject = require('./libraries/HumanPoseObject');

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
const {splatTasks} = require('./controllers/object/SplatTask.js');
const spatialController = require('./controllers/spatial');

const signallingController = require('./controllers/signalling.js');

/**********************************************************************************************************************
 ******************************************** Constructors ************************************************************
 **********************************************************************************************************************/
const Frame = require('./models/Frame.js');
const Node = require('./models/Node.js');
const ObjectModel = require('./models/ObjectModel.js');
const ObjectSocket = require('./models/ObjectSocket.js');
const Protocols = require('./models/Protocols.js');

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

const addonSecrets = AddonSecretsLoader.load(addonFolders); // Holds secrets by addon name
const getFrameSecrets = (frameName) => {
    const frameFolderPath = frameFolderLoader.resolvePath(frameName);
    const addonFolderPath = path.dirname(frameFolderPath);
    const addonName = path.basename(addonFolderPath);
    if (!addonSecrets[addonName]) {
        throw new Error(`Addon ${addonName} does not have any registered secrets`);
    }
    return addonSecrets[addonName];
};
exports.getFrameSecrets = getFrameSecrets;

var hardwareInterfaceModules = {}; // Will hold all available hardware interfaces.
var hardwareInterfaceLoader = null;
// A list of all objects known and their IPs in the network. The objects are found via the udp heart beat.
// If a new link is linking to another objects, this knownObjects list is used to establish the connection.
// This list is also used to keep track of the actual IP of an object. If the IP of an object in a network changes,
// It has no influance on the connectivity, as it is referenced by the object UUID through the entire time.
var knownObjects = {};
exports.knownObjects = knownObjects;
// A lookup table used to process faster through the objects.
var objectLookup = {};
// This list holds all the socket connections that are kept alive. Socket connections are kept alive if a link is
// associated with this object. Once there is no more link the socket connection is deleted.
var socketArray = {};     // all socket connections that are kept alive

var realityEditorSocketSubscriptions = [];     // all socket connections that are kept alive
var realityEditorBlockSocketSubscriptions = [];     // all socket connections that are kept alive
var realityEditorUpdateSocketSubscriptions = [];    // all socket connections to keep UIs in sync (frame position, etc)
var realityEditorCameraMatrixSocketSubscriptions = [];    // all socket connections to notify clients of each other's position
var realityEditorObjectMatrixSocketSubscriptions = [];    // all socket connections to keep object world positions in sync

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

// For realtime updates, rather than sending N^2 messages when many clients are updating at once,
//   aggregate them at send at most one aggregate message per small interval.
const BatchedUpdateAggregator = require('./libraries/BatchedUpdateAggregator');
const updateAggregator = new BatchedUpdateAggregator(broadcastAggregatedUpdates, {
    minAggregationIntervalMs: 33,
    maxAggregationIntervalMs: 1000,
    rollingWindowSize: 10
});
// Define the callback function to broadcast updates
function broadcastAggregatedUpdates(aggregatedUpdates) {
    for (const entry of realityEditorUpdateSocketSubscriptions) {
        if (!entry) continue;

        entry.subscriptions.forEach((subscription) => {
            if (aggregatedUpdates.batchedUpdates.some(update => update.editorId === subscription.editorId)) {
                // Don't send updates to the editor that triggered them
                return;
            }

            if (entry.socket.connected) {
                entry.socket.emit('/batchedUpdate', JSON.stringify(aggregatedUpdates));
            }
        });
    }
}

const StaleObjectCleaner = require('./libraries/StaleObjectCleaner');
const staleObjectCleaner = new StaleObjectCleaner(objects, deleteObject);
function resetObjectTimeout(objectKey) {
    staleObjectCleaner.resetObjectTimeout(objectKey);
}
exports.resetObjectTimeout = resetObjectTimeout;

var worldObjectName = '_WORLD_';
if (isLightweightMobile || isStandaloneMobile) {
    worldObjectName += 'local';
}
var worldObject;

const SceneGraph = require('./libraries/sceneGraph/SceneGraph');
const sceneGraph = new SceneGraph(true);

const WorldGraph = require('./libraries/sceneGraph/WorldGraph');
const worldGraph = new WorldGraph(sceneGraph);

const tempUuid = utilities.uuidTime().slice(1);   // UUID of current run of the server  (removed initial underscore)

const HumanPoseFuser = require('./libraries/HumanPoseFuser');
const humanPoseFuser = new HumanPoseFuser(objects, sceneGraph, objectLookup, services.ip, beatPort, tempUuid);

/**********************************************************************************************************************
 ******************************************** Initialisations *********************************************************
 **********************************************************************************************************************/

// Load all the hardware interfaces
const hardwareAPICallbacks = {
    publicData: function (objectKey, frameKey, nodeKey) {
        socketHandler.sendPublicDataToAllSubscribers(objectKey, frameKey, nodeKey);
    },
    actions: function (thisAction) {
        utilities.actionSender(thisAction);
    },
    data: function (objectKey, frameKey, nodeKey, data) {
        //these are the calls that come from the objects before they get processed by the object engine.
        // send the saved value before it is processed
        sendMessageToEditors({
            object: objectKey,
            frame: frameKey,
            node: nodeKey,
            data: data
        });
        hardwareAPI.readCall(objectKey, frameKey, nodeKey, getNode(objectKey, frameKey, nodeKey).data);
        engine.trigger(objectKey, frameKey, nodeKey, getNode(objectKey, frameKey, nodeKey));
    },
    write: function (objectID) {
        // note: throwing away async
        utilities.writeObjectToFile(objects, objectID, globalVariables.saveToDisk);
    }
};
// set all the initial states for the Hardware Interfaces in order to run with the Server.
hardwareAPI.setup(objects, objectLookup, knownObjects, socketArray, globalVariables, __dirname, objectsPath, nodeTypeModules, blockModules, services, serverPort, hardwareAPICallbacks, sceneGraph, worldGraph);

const utilitiesCallbacks = {
    triggerUDPCallbacks: hardwareAPI.triggerUDPCallbacks
};
utilities.setup({realityEditorUpdateSocketSubscriptions}, utilitiesCallbacks);

nodeUtilities.setup(objects, sceneGraph, knownObjects, socketArray, globalVariables, hardwareAPI, objectsPath, linkController);

(async () => {
    // This function will load all the Objects
    await loadObjects();
    if (globalVariables.worldObject) {
        await loadWorldObject();
    }

    await startSystem();

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

    hardwareAPI.reset();

    console.info('Server has the following enabled hardware interfaces: ' + Object.keys(hardwareInterfaceModules).join(', '));
})();

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
 * @param {ObjectModel} obj
 * @param {string} objectKey
 */
function migrateObjectValuesToFrames(obj, objectKey) {
    // this is for transforming old lists to new lists
    if (typeof obj.objectValues !== 'undefined') {
        obj.frames[objectKey].nodes = obj.objectValues;
        delete obj.objectValues;
    }
    if (typeof obj.objectLinks !== 'undefined') {
        obj.frames[objectKey].links = obj.objectLinks;
        delete obj.objectLinks;
    }

    if (typeof obj.nodes !== 'undefined') {
        obj.frames[objectKey].nodes = obj.nodes;
        delete obj.nodes;
    }
    if (typeof obj.links !== 'undefined') {
        obj.frames[objectKey].links = obj.links;
        delete obj.links;
    }
}

/**
 * @desc Add objects from the objects folder to the system
 **/
async function loadObjects() {
    // check for objects in the objects folder by reading the objects directory content.
    // get all directory names within the objects directory
    const objectFolderList = await utilities.getObjectFolderList();

    for (var i = 0; i < objectFolderList.length; i++) {
        const objectFolder = objectFolderList[i];
        const tempFolderName = await utilities.getObjectIdFromObjectFile(objectFolder);

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
            utilities.writeObject(objectLookup, objectFolderList[i], tempFolderName);

            // try to read a saved previous state of the object
            try {
                const objectJsonText = await fsProm.readFile(objectsPath + '/' + objectFolderList[i] + '/' + identityFolderName + '/object.json', 'utf8');
                objects[tempFolderName] = JSON.parse(objectJsonText);
                const obj = objects[tempFolderName];
                obj.ip = services.ip; // ip.address();

                // update the targetId if needed
                try {
                    obj.targetId = await utilities.getTargetIdFromTargetDat(path.join(objectsPath, objectFolderList[i], identityFolderName, 'target'));
                } catch (e) {
                    console.warn(`object ${tempFolderName} has no targetId in .dat file, or no .dat file`);
                }

                migrateObjectValuesToFrames(obj, tempFolderName);

                if (obj.frames[tempFolderName]) {
                    for (var nodeKey in obj.frames[tempFolderName].nodes) {

                        if (typeof obj.nodes[nodeKey].item !== 'undefined') {
                            var tempItem = obj.frames[tempFolderName].nodes[nodeKey].item;
                            obj.frames[tempFolderName].nodes[nodeKey].data = utilities.deepCopy(tempItem[0]);
                        }
                    }
                }

                // fix corrupted state of world objects whose worldId isn't their own id
                if ((obj.isWorldObject || obj.type === 'world') && obj.objectId && obj.worldId !== obj.objectId) {
                    obj.worldId = obj.objectId;
                }

                // cast everything from JSON to Object, Frame, and Node classes
                let newObj = new ObjectModel(obj.ip,
                    obj.version,
                    obj.protocol,
                    obj.objectId);
                newObj.setFromJson(obj);
                objects[tempFolderName] = newObj;
            } catch (e) {
                objects[tempFolderName].ip = services.ip; //ip.address();
                objects[tempFolderName].objectId = tempFolderName;
                console.warn('No saved data for: ' + tempFolderName, e);
            }

            // add this object to the sceneGraph
            sceneGraph.addObjectAndChildren(tempFolderName, objects[tempFolderName]);
        } else {
            console.warn(' object ' + objectFolderList[i] + ' has no marker yet');
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

    // delete each object that represented a client that was connected to the server in its last session
    // this needs to happen before hardwareAPI.reset, or the object will get corrupted when its nodes are parsed
    await removeAvatarAndHumanPoseFiles();

    hardwareAPI.reset();

    sceneGraph.recomputeGraph();

    executeInitialProcessBlockLinks();
}


/**
 * Go through all objects and processBlockLinks once. Useful on initial load
 */
function executeInitialProcessBlockLinks() {
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
}

/**
 * Initialize worldObject to contents of spatialToolbox/_WORLD_local/.identity/object.json
 * Create the json file if doesn't already exist
 */
async function loadWorldObject() {
    const identityPath = path.join(objectsPath, worldObjectName, '.identity');
    const jsonFilePath = path.join(identityPath, 'object.json');

    // create a /.identity folder within it to hold the object.json data
    if (globalVariables.saveToDisk) {
        await mkdirIfNotExists(identityPath, {recursive: true});
    }

    // create a new world object
    let thisWorldObjectId = (isLightweightMobile || isStandaloneMobile) ? worldObjectName : (worldObjectName + utilities.uuidTime());
    worldObject = new ObjectModel(services.ip, version, protocol, thisWorldObjectId);
    worldObject.port = serverPort;
    worldObject.name = worldObjectName;
    worldObject.isWorldObject = true;
    worldObject.type = 'world';

    // try to read previously saved data to overwrite the default world object
    if (globalVariables.saveToDisk) {
        try {
            const contents = await fsProm.readFile(jsonFilePath, 'utf8');
            worldObject = JSON.parse(contents);
        } catch (e) {
            console.error('No saved data for world object on server: ' + services.ip, e);
        }
    }

    worldObject.ip = services.ip;
    worldObject.port = serverPort;

    objects[worldObject.objectId] = worldObject;

    hardwareAPI.reset();

    if (globalVariables.saveToDisk) {
        try {
            await fsProm.writeFile(jsonFilePath, JSON.stringify(worldObject, null, 4));
        } catch (err) {
            console.error('Error saving world object', err);
        }
    } else {
        console.error('Server is not allowed to save to disk');
    }
}


async function loadAnchor(anchorName) {

    // create the file for it if necessary
    var identityPath = path.join(objectsPath, anchorName, '.identity');
    var jsonFilePath = path.join(identityPath, 'object.json');
    let anchorUuid = anchorName + utilities.uuidTime();

    // create a /.identity folder within it to hold the object.json data
    if (globalVariables.saveToDisk) {
        await mkdirIfNotExists(identityPath, {recursive: true});
    }


    // try to read previously saved data to overwrite the default anchor object
    if (globalVariables.saveToDisk) {
        try {
            const contents = await fsProm.readFile(jsonFilePath, 'utf8');
            let anchor = JSON.parse(contents);
            anchorUuid = anchor.objectId;
            if (anchorUuid) {
                objects[anchorUuid] = anchor;
            }
            return;
        } catch (e) {
            console.warn('No saved data for anchor object on server: ' + services.ip, e);
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
        try {
            await fsProm.writeFile(jsonFilePath, JSON.stringify(objects[anchorUuid], null, 4));
        } catch (err) {
            console.log('error persisting anchor object', err);
        }
        await objectBeatSender(beatPort, anchorUuid, objects[anchorUuid].ip);
        hardwareAPI.reset();
    } else {
        console.warn('Server is not allowed to save to disk');
        await objectBeatSender(beatPort, anchorUuid, objects[anchorUuid].ip);
        hardwareAPI.reset();
    }

    // store in lookup table so we can correctly change ID if target data is later uploaded
    utilities.writeObject(objectLookup, anchorName, anchorUuid);

    sceneGraph.addObjectAndChildren(anchorUuid, objects[anchorUuid]);
}

async function setAnchors() {
    let hasValidWorldObject = false;

    // load all object folders
    let tempFiles = await utilities.getObjectFolderList();

    // populate all objects folders with object.json files.
    for (const objectKey of tempFiles) {
        if (objectKey.indexOf('_WORLD_') === -1) {

            let thisObjectKey = null;
            let tempKey = await utilities.getObjectIdFromObjectFile(objectKey); // gets the object id from the xml target file
            if (tempKey) {
                thisObjectKey = tempKey;
            } else {
                thisObjectKey = objectKey;
            }

            if (!(thisObjectKey in objects)) {
                await loadAnchor(objectKey);
            }
        }
    }


    // check if there is an initialized World Object
    for (let key in objects) {
        if (!objects[key]) {
            continue;
        }
        // TODO: world objects are now considered initialized by default... update how anchor objects work (do they still require that the world has target data?)
        if (objects[key].isWorldObject || objects[key].type === 'world') {
            // check if the object is correctly initialized with tracking targets
            let datExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.dat'));
            let xmlExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.xml'));
            let jpgExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.jpg'));

            if ((xmlExists && datExists && jpgExists) || (xmlExists && jpgExists)) {
                hasValidWorldObject = true;
            }
            break;
        }
    }

    // check if there are uninitialized objects and turn them into anchors if an initialized world object exists.
    for (let key in objects) {
        if (!objects[key]) {
            continue;
        }
        objects[key].isAnchor = false;
        if (objects[key].isWorldObject ||
            objects[key].type === 'world' ||
            objects[key].type === 'human' ||
            objects[key].type === 'avatar') {
            continue;
        }

        // check if the object is correctly initialized with tracking targets
        let datExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.dat'));
        let xmlExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.xml'));
        let jpgExists = await fileExists(path.join(objectsPath, objects[key].name, identityFolderName, '/target/target.jpg'));

        if (xmlExists && (datExists || jpgExists)) {
            continue;
        }

        if (hasValidWorldObject) {
            objects[key].isAnchor = true;
            objects[key].tcs = 0;
        }
    }
}

async function removeAvatarAndHumanPoseFiles() {
    let objectsToDelete = [];

    // load all object folders
    let tempFiles = await utilities.getObjectFolderList();

    // remove hidden directories
    for (const objectFolderName of tempFiles) {
        if (objectFolderName.indexOf('_AVATAR_') === 0 || objectFolderName.indexOf('_HUMAN_') === 0) {
            objectsToDelete.push(objectFolderName);
        }
    }

    for (const objectFolderName of objectsToDelete) {
        let objectKey = utilities.readObject(objectLookup, objectFolderName);

        if (objects[objectKey]) {
            await deleteObject(objectKey);
        } else {
            console.warn('problem deleting avatar/humanPose object (' + objectFolderName + ') because can\'t get objectID from name');
        }
    }
}

/**********************************************************************************************************************
 ******************************************** Starting the System ******************************************************
 **********************************************************************************************************************/

/**
 * @desc starting the system
 **/

async function startSystem() {
    // make sure that the system knows about the state of anchors.
    await setAnchors();

    // generating a udp heartbeat signal for every object that is hosted in this device
    for (let key in objects) {
        if (!objects[key]) {
            continue;
        }
        if (!objects[key].deactivated) {
            await objectBeatSender(beatPort, key, objects[key].ip);
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
    setSocketUpdaterInterval();

    // checks if any avatar or humanPose objects haven't been updated in awhile, and deletes them
    const avatarCheckIntervalMs = 5000; // how often to check if avatar objects are inactive
    const avatarDeletionAgeMs = 15000; // how long an avatar object can stale be before being deleted
    staleObjectCleaner.createCleanupInterval(avatarCheckIntervalMs, avatarDeletionAgeMs, ['avatar']);

    const humanCheckIntervalMs = 3000;
    const humanDeletionAgeMs = 15000; // human objects are deleted more aggressively if they haven't been seen recently
    staleObjectCleaner.createCleanupInterval(humanCheckIntervalMs, humanDeletionAgeMs, ['human']);

    recorder.initRecorder(objects);

    humanPoseFuser.start();

    serverBeatSender(beatPort, false);
}

/**********************************************************************************************************************
 ******************************************** Stopping the System *****************************************************
 **********************************************************************************************************************/

function clearActiveHeartbeat(activeHeartbeat) {
    clearInterval(activeHeartbeat.interval);
    activeHeartbeat.socket.close();
}

function clearActiveHeartbeats() {
    for (const key of Object.keys(activeHeartbeats)) {
        clearActiveHeartbeat(activeHeartbeats[key]);
        delete activeHeartbeats[key];
    }
}

function sleep(ms) {
    return new Promise((res) => {
        const t = setTimeout(res, ms);
        t.unref(); // Ensures the process can exit without waiting for timeout to complete
    });
}

function closeServer(server) {
    return Promise.race([new Promise((res, rej) => {
        if (server.closeAllConnections) {
            server.closeAllConnections();
        }
        if (server.unref) {
            server.unref();
        }

        server.close((err) => {
            if (err) {
                console.error('Error closing server', err);
                rej(err);
            } else {
                res();
            }
        });
    }), sleep(2000).then(() => {
        console.warn('Server close timed out');
    })]);
}

async function exit() {
    syncInterval.stop();
    hardwareAPI.shutdown();
    await closeServer(http);
    await closeServer(io.server);
    sceneGraph.clearIntervals();
    await recorder.stop();
    clearActiveHeartbeats();
    try {
        udpServer.close();
    } catch (e) {
        console.warn('unable to close udpServer', e);
    }
    clearInterval(socketUpdaterInterval);
    if (forceGCInterval) {
        clearInterval(forceGCInterval);
    }
    staleObjectCleaner.clearCleanupIntervals();
    humanPoseFuser.stop();
    for (const splatTask of Object.values(splatTasks)) {
        splatTask.stop();
    }
    updateAggregator.stop();
    console.info('Server exited successfully');
    if (process.env.NODE_ENV !== 'test') {
        process.exit(0);
    }
}
exports.exit = exit;

process.on('SIGINT', exit);
process.on('SIGTERM', exit);

process.on('exit', function() {
    // Always, even when crashing, try to persist the recorder log
    recorder.persistToFileSync();
});

if (process.pid) {
    console.info('server.js process is running with PID ' + process.pid);
}

/**********************************************************************************************************************
 ******************************************** Emitter/Client/Sender ***************************************************
 **********************************************************************************************************************/

// send a message on a repeated interval, advertising this server and the services it supports
function serverBeatSender(udpPort, oneTimeOnly = true) {
    if (isLightweightMobile) {
        return;
    }

    const udpHost = '255.255.255.255';

    services.ip = services.getIP();

    const messageObj = {
        ip: services.ip,
        port: serverPort,
        vn: version,
        // zone: serverSettings.zone || '', // todo: provide zone on a per-server level
        services: providedServices || [] // e.g. ['world'] if it can support a world object
    };

    // const message = Buffer.from(JSON.stringify(messageObj));

    // creating the datagram
    const client = dgram.createSocket('udp4');
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(timeToLive);
        client.setMulticastTTL(timeToLive);
    });

    if (oneTimeOnly) {
        utilities.sendWithFallback(client, udpPort, udpHost, messageObj, {closeAfterSending: true});
        return;
    }

    if (providedServices.length > 0) {
        console.info('Server has the following heartbeat services (use --services to enable services): ' + providedServices.join(', '));
    } else {
        console.info('Server has no heartbeat services registered (use --services to enable services)');
    }

    // if oneTimeOnly specifically set to false, create a new update interval that broadcasts every N seconds
    const interval = setInterval(() => {
        utilities.sendWithFallback(client, udpPort, udpHost, messageObj, {closeAfterSending: false});
    }, beatInterval + utilities.randomIntInc(-250, 250));
    activeHeartbeats['server_' + services.ip] = {
        interval,
        socket: client,
    };
}

/**
 * @desc Sends out a Heartbeat broadcast via UDP in the local network.
 * @param {Number} PORT The port where to start the Beat
 * @param {string} thisId The name of the Object
 * @param {string} thisIp The IP of the Object
 * @param {string} thisVersion The version of the Object
 * @param {string} thisTcs The target checksum of the Object.
 * @param {boolean} oneTimeOnly if true the beat will only be sent once.
 * @param {boolean} immediate if true the firdt beat will be sent immediately, not after beatInterval (works for one-time and periodic beats)
 **/

async function objectBeatSender(PORT, thisId, thisIp, oneTimeOnly = false, immediate = false) {
    if (isLightweightMobile) {
        return;
    }

    if (!oneTimeOnly && activeHeartbeats[thisId]) {
        // already created beat for object
        return;
    }

    if (!objects[thisId]) {
        return;
    }

    var HOST = '255.255.255.255';

    objects[thisId].version = version;
    objects[thisId].protocol = protocol;
    objects[thisId].port = serverPort;

    var thisVersionNumber = parseInt(objects[thisId].version.replace(/\./g, ''));

    // try re-generating checksum if it doesn't exist - in some cases it gets
    // corrupted and beats won't send
    if (!objects[thisId].tcs) {
        let targetDir = path.join(objectsPath, objects[thisId].name, identityFolderName, 'target');
        let jpgPath = path.join(targetDir, 'target.jpg');
        let datPath = path.join(targetDir, 'target.dat');
        let xmlPath = path.join(targetDir, 'target.xml');
        let glbPath = path.join(targetDir, 'target.glb');
        let tdtPath = path.join(targetDir, 'target.3dt');
        let splatPath = path.join(targetDir, 'target.splat');
        var fileList = [jpgPath, xmlPath, datPath, glbPath, tdtPath, splatPath];
        const tcs = await utilities.generateChecksums(objects, fileList);
        if (objects[thisId]) {
            // if no target files exist, checksum will be undefined, so mark
            // with checksum 0 (anchors have this)
            if (typeof tcs === 'undefined') {
                objects[thisId].tcs = 0;
            } else {
                objects[thisId].tcs = tcs;
            }
        }
    }

    // creating the datagram
    const client = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });
    client.bind(function () {
        client.setBroadcast(true);
        client.setTTL(timeToLive);
        client.setMulticastTTL(timeToLive);
    });

    if (!oneTimeOnly) {

        function sendBeat() {
            // send the beat#
            if (thisId in objects && !objects[thisId].deactivated) {
                let zone = '';
                if (objects[thisId].zone) zone = objects[thisId].zone;
                if (!objects[thisId].hasOwnProperty('port')) objects[thisId].port = serverPort;

                services.ip = services.getIP();

                const messageObj = {
                    id: thisId,
                    ip: services.ip,
                    port: serverPort,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone: zone
                };
                // we enumerate the object types that can be sent without target files.
                // currently, only regular objects (type='object') require target files to send heartbeats.
                let sendWithoutTargetFiles = objects[thisId].isAnchor ||
                    objects[thisId].type === 'anchor' ||
                    objects[thisId].type === 'human' ||
                    objects[thisId].type === 'avatar' ||
                    objects[thisId].type === 'world';
                if (objects[thisId].tcs || sendWithoutTargetFiles) {
                    utilities.sendWithFallback(client, PORT, HOST, messageObj, {
                        closeAfterSending: false,
                        onErr: (_err) => {
                            for (let key in objects) {
                                objects[key].ip = services.ip;
                            }
                        }
                    });
                }
            }
        }

        // send one beat immediately and then start interval timer triggering beats
        if (immediate) {
            sendBeat();
        }
        // perturb the inverval a bit so that not all objects send the beat in the same time.
        activeHeartbeats[thisId] = {
            interval: setInterval(sendBeat, beatInterval + utilities.randomIntInc(-250, 250)),
            socket: client,
        };
    } else {
        // Single-shot, one-time heartbeat
        // delay the signal with timeout so that not all objects send the beat in the same time.
        let delay = immediate ? 0 : utilities.randomIntInc(1, 250);

        setTimeout(function () {
            // send the beat
            if (thisId in objects && !objects[thisId].deactivated) {

                let zone = '';
                if (objects[thisId].zone) zone = objects[thisId].zone;
                if (!objects[thisId].hasOwnProperty('port')) objects[thisId].port = serverPort;

                services.ip = services.getIP();

                let messageObj = {
                    id: thisId,
                    ip: services.ip,
                    port: serverPort,
                    vn: thisVersionNumber,
                    pr: protocol,
                    tcs: objects[thisId].tcs,
                    zone: zone
                };

                utilities.sendWithFallback(client, PORT, HOST, messageObj, {closeAfterSending: true});
            }
        }, delay);
    }
}
exports.objectBeatSender = objectBeatSender;

/**********************************************************************************************************************
 ******************************************** Server Objects **********************************************************
 **********************************************************************************************************************/

/**
 * @desc Receives a Heartbeat broadcast via UDP in the local network and updates the knownObjects Array in case of a
 * new object
 * @note if action "ping" is received, the object calls a heartbeat that is send one time.
 **/

services.ip = services.getIP(); //ip.address();

async function handleActionMessage(action) {
    if (action === 'ping') {
        for (let key in objects) {
            if (objects[key]) {
                await objectBeatSender(beatPort, key, objects[key].ip, true);
            }
        }
        serverBeatSender(beatPort);
        return;
    }

    // non-string actions can be processed after this point
    action = (typeof action === 'string') ? JSON.parse(action) : action;

    if (action.type === 'SceneGraphEventMessage') {
        if (action.ip === services.getIP()) { // UDP also broadcasts to yourself
            return;
        }
        worldGraph.handleMessage(action);
    }

    // clients can use this to signal that the avatar objects are still being used
    if (action.type === 'keepObjectAlive') {
        resetObjectTimeout(action.objectKey);
    }
}

function objectBeatServer() {
    if (isLightweightMobile) {
        return;
    }

    // creating the udp server
    udpServer = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });

    udpServer.on('error', function (err) {
        // Permanently log so that it's clear udp support is down
        setInterval(() => {
            console.error('udpServer closed due to error', err);
        }, 5000);

        udpServer.close();
    });

    udpServer.on('message', async function (msg) {

        var msgContent;
        // check if object ping
        msgContent = JSON.parse(msg);

        if (msgContent.id && msgContent.ip && !checkObjectActivation(msgContent.id) && !(msgContent.id in knownObjects)) {

            if (!knownObjects[msgContent.id]) {
                knownObjects[msgContent.id] = {};
            }

            if (msgContent.vn) {
                knownObjects[msgContent.id].version = msgContent.vn;
            }

            if (msgContent.pr) {
                knownObjects[msgContent.id].protocol = msgContent.pr;
            } else {
                knownObjects[msgContent.id].protocol = 'R0';
            }

            if (msgContent.ip) {
                knownObjects[msgContent.id].ip = msgContent.ip;
            }

            if (msgContent.port) {
                knownObjects[msgContent.id].port = msgContent.port;
            }

            // each time we discover a new object from another, also get the scene graph from that server
            getKnownSceneGraph(msgContent.ip, msgContent.port);
        }
        // check if action 'ping'
        if (msgContent.action) {
            await handleActionMessage(msgContent.action);
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
        console.info('UDP Server is listening on port ' + address.port);
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
    const url = (globalVariables.useHTTPS ? 'https' : 'http') + '://' + ip + ':' + (port || 8080) + '/spatial/sceneGraph';
    let response = null;
    try {
        response = await utilities.httpGet(url);
    } catch (e) {
        console.error('error awaiting /spatial/sceneGraph', e);
        return;
    }

    // 3. parse the results and add it as a known scene graph
    var thatSceneGraph = typeof response === 'string' ? JSON.parse(response) : response;

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

    webServer.use(function (req, res, next) {

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
    webServer.use(express.urlencoded({
        extended: true,
        limit: '5mb',
    }));
    webServer.use(express.json({limit: '5mb'}));
    // define a couple of static directory routs

    webServer.use('/objectDefaultFiles', express.static(__dirname + '/libraries/objectDefaultFiles/'));

    if (isStandaloneMobile) {
        const LocalUIApp = require('./libraries/LocalUIApp.js');
        const uiPath = path.join(__dirname, '../vuforia-spatial-toolbox-userinterface');
        const alternativeUiPath = path.join(__dirname, '../userinterface'); // for backwards compatibility
        const selectedUiPath = fs.existsSync(uiPath) ? uiPath : alternativeUiPath;
        console.info('UI path for LocalUIApp: ' + selectedUiPath);
        const localUserInterfaceApp = new LocalUIApp(selectedUiPath, addonFolders);
        localUserInterfaceApp.setup();
        localUserInterfaceApp.app.use('/objectDefaultFiles', express.static(__dirname + '/libraries/objectDefaultFiles/'));
        localUserInterfaceApp.listen(serverUserInterfaceAppPort);
    }

    // webServer.use('/frames', express.static(__dirname + '/libraries/frames/'));

    webServer.use('/frames/:frameName', async function (req, res, next) {
        if (!utilities.isValidId(req.params.frameName)) {
            res.status(400).send('Invalid frame name. Must be alphanumeric.');
            console.error('Recevied invalid frame name. Must be alphanumeric.', req.params.frameName);
            return;
        }

        var urlArray = req.originalUrl.split('/');
        const frameLibPath = frameFolderLoader.resolvePath(req.params.frameName);
        if (!frameLibPath) {
            next();
            return;
        }
        var fileName = path.join(frameLibPath, req.originalUrl.split('/frames/')[1]); //__dirname + '/libraries' + req.originalUrl;
        // we need to check without any ?options=xyz at the end or it might not find the file
        let fileNameWithoutQueryParams = fileName.split('?')[0];
        if (!await fileExists(fileNameWithoutQueryParams)) {
            next();
            return;
        }

        // Non HTML files just get sent normally
        if (urlArray[urlArray.length - 1].indexOf('html') === -1) {
            res.sendFile(fileNameWithoutQueryParams);
            return;
        }

        // HTML files get object.js injected
        var html = await fsProm.readFile(fileNameWithoutQueryParams, 'utf8');

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

        html = html.replace('objectDefaultFiles/SpatialApplicationAPI.js', level + 'objectDefaultFiles/SpatialApplicationAPI.js');
        html = html.replace('objectDefaultFiles/LanguageInterface.js', level + 'objectDefaultFiles/LanguageInterface.js');

        html = html.replace('objectDefaultFiles/styles/', level + 'objectDefaultFiles/styles/');

        var loadedHtml = cheerio.load(html);
        var scriptNode = '<script src="' + level + 'objectDefaultFiles/object.js"></script>';
        scriptNode += '<script src="' + level + 'objectDefaultFiles/pep.min.js"></script>';

        // inject the server IP address, but don't inject the objectKey and frameKey, as those come from the editor
        scriptNode += '<script> realityObject.serverIp = "' + services.ip + '"</script>';//ip.address()
        loadedHtml('head').prepend(scriptNode);
        res.send(loadedHtml.html());
    });

    webServer.use('/logicNodeIcon', async function (req, res) {
        var urlArray = req.originalUrl.split('/');
        var objectName = urlArray[2];
        var fileName = objectsPath + '/' + objectName + '/' + identityFolderName + '/logicNodeIcons/' + urlArray[3];
        if (!await fileExists(fileName)) {
            res.sendFile(__dirname + '/libraries/emptyLogicIcon.png'); // default to blank image if not custom saved yet
            return;
        }
        res.sendFile(fileName);
    });

    webServer.use('/mediaFile', async function (req, res) {
        var urlArray = req.originalUrl.split('/');

        var objectId = urlArray[2];
        if (!getObject(objectId)) {
            res.status(404).send('object ' + objectId + ' not found');
            return;
        }

        var objectName = getObject(objectId).name;
        var fileName = objectsPath + '/' + objectName + '/' + identityFolderName + '/mediaFiles/' + urlArray[3];
        if (!await fileExists(fileName)) {
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
            'target.splat',
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
                        // TODO: the code originally here was broken and
                        // provided `undefined` instead of the object name
                        root: utilities.getVideoDir(urlArray[0]),
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
                console.error('Failed to find file for /obj request at ' + filename);
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

            html = html.replace('objectDefaultFiles/SpatialApplicationAPI.js', level + 'objectDefaultFiles/SpatialApplicationAPI.js');
            html = html.replace('objectDefaultFiles/LanguageInterface.js', level + 'objectDefaultFiles/LanguageInterface.js');

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

    webServer.post('/action', async (req, res) => {
        const action = JSON.parse(req.body.action);
        await handleActionMessage(action);
        res.send();
    });

    // Express router routes
    const objectRouter = require('./routers/object');
    const logicRouter = require('./routers/logic');
    const spatialRouter = require('./routers/spatial');
    const historyRouter = require('./routers/history');
    objectRouter.setup(globalVariables);
    logicRouter.setup(globalVariables);
    spatialRouter.setup(globalVariables);
    webServer.use('/object', objectRouter.router);
    webServer.use('/logic', logicRouter.router);
    webServer.use('/spatial', spatialRouter.router);
    webServer.use('/history', historyRouter.router);

    /**
     * Checks whether the server is online. Can be used by clients to also calculate the round-tip-time to the server.
     * Clients can optionally include prevRTT and clientId in the query params, and the server will track the RTTs.
     * This helps to deal with server congestion.
     */
    webServer.get('/status', function(req, res) {
        // Check if the RTT parameter exists in the query string
        const clientRTT = parseFloat(req.query.prevRTT);
        const clientId = req.query.clientId;

        if (typeof clientRTT === 'number' && !isNaN(clientRTT) && clientId) {
            // Track the client's RTT in the BatchedUpdateAggregator
            updateAggregator.trackClientRTT(clientId, clientRTT);
        }

        res.sendStatus(200); // Respond OK
    });

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
        res.json(addonFrames.getFrameList());
    });

    // sends json object for a specific reality object. * is the object name
    // ths is the most relevant for
    // ****************************************************************************************************************
    webServer.get('/availableLogicBlocks/', function (req, res) {
        res.json(blockController.getLogicBlockList());
    });

    // TODO: is the developer flag ever not true anymore? is it still useful to have?
    if (globalVariables.developer === true) {
        // // TODO: ask Valentin what this route was used for?
        // webServer.post('/object/*/size/*', function (req, res) {
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
            if (!utilities.isValidId(req.params.id)) {
                res.status(400).send('Invalid object id. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadInfoText(req.params.id, objectLookup, objects, knownObjects, sockets));
        });

        webServer.get(objectInterfaceFolder + 'infoLoadData/:id', function (req, res) {
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
            var objectPath = objectsPath + '/' + req.params.objectName + '/' + req.params.frameName;
            var tree = dirTree(objectPath, {exclude: /\.DS_Store/}, function (item) {
                item.path = item.path.replace(objectsPath, '/obj');
            });
            res.json(tree);
        });


        webServer.get(objectInterfaceFolder + 'content/:objectName/:frameName', function (req, res) {
            if (!utilities.isValidId(req.params.objectName) || !utilities.isValidId(req.params.frameName)) {
                res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                return;
            }
            res.send(webFrontend.uploadTargetContentFrame(req.params.objectName, req.params.frameName, objectsPath, objectInterfaceFolder));
        });

        webServer.get(objectInterfaceFolder + 'edit/:objectName/:frameName', function (req, res) {
            webFrontend.editContent(req, res);
        });

        webServer.put(objectInterfaceFolder + 'edit/:objectName/:frameName', async function (req, res) {
            if (utilities.goesUpDirectory(req.path)) {
                res.status(400).send('Invalid path. Cannot go up directories.');
                return;
            }
            try {
                await fsProm.writeFile(__dirname + '/' + req.path.replace('edit', 'objects'), req.body.content);
            } catch (err) {
                // TODO: update path with objectsPath
                console.error('unable to PUT edit', err);
            }
            // Success!
            res.end('');
        });
        // sends the target page for the object :id
        // ****************************************************************************************************************
        webServer.get(objectInterfaceFolder + 'target/:objectName', function (req, res) {
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
        webServer.get(objectInterfaceFolder, async function (req, res) {
            let framePathList = frameLibPaths.join(' ');
            await setAnchors();
            res.send(await webFrontend.printFolder(objects, objectsPath, globalVariables.debug, objectInterfaceFolder, objectLookup, version, services.ips /*ip.address()*/, serverPort, globalVariables.useHTTPS, addonFrames.getFrameList(), hardwareInterfaceModules, framePathList));
        });

        webServer.get(objectInterfaceFolder + 'hardwareInterface/:interfaceName/config.html', function (req, res) {
            if (!utilities.isValidId(req.params.interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            let interfacePath = hardwareInterfaceLoader.resolvePath(req.params.interfaceName);
            let configHtmlPath = path.join(interfacePath, req.params.interfaceName, 'config.html');
            res.send(webFrontend.generateHtmlForHardwareInterface(req.params.interfaceName, hardwareInterfaceModules, version, services.ips, serverPort, globalVariables.useHTTPS, configHtmlPath));
        });

        // Proxies requests to spatial.ptc.io, for CORS video playback
        const proxyRequestHandler = require('./libraries/serverHelpers/proxyRequestHandler.js');
        webServer.get('/proxy/*', proxyRequestHandler);

        const {oauthRefreshRequestHandler, oauthAcquireRequestHandler} = require('./libraries/serverHelpers/oauthRequestHandlers.js');
        webServer.post('/oauthRefresh', oauthRefreshRequestHandler);
        webServer.post('/oauthAcquire', oauthAcquireRequestHandler);

        // restart the server from the web frontend to load
        webServer.get('/restartServer/', function () {
            if (process.send) {
                process.send('restart');
            } else {
                exit();
            }
        });

        webServer.get('/server/networkInterface/:activeInterface/', function (req, res) {
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
            utilities.actionSender({
                spatial: {locator: JSON.parse(req.body.locator), ip: services.ip},
                lastEditor: null
            });
            res.status(200).send('ok');
        });

        webServer.post('/webUI/REC/START', function (req, res) {
            recorder.start();
            res.status(200).send('ok');
        });

        webServer.post('/webUI/REC/STOP', function (req, res) {
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

            hardwareAPI.setHardwareInterfaceSettings(interfaceName, req.body.settings, req.body.limitToKeys, function (success, errorMessage) {
                if (success) {
                    res.status(200).send('ok');
                    hardwareAPI.reset();
                } else {
                    res.status(500).send(errorMessage);
                }
            });
        });

        webServer.get('/hardwareInterface/:interfaceName/disable/', function (req, res) {
            var interfaceName = req.params.interfaceName;

            if (!utilities.isValidId(interfaceName)) {
                res.status(400).send('Invalid interface name. Must be alphanumeric.');
                return;
            }

            hardwareAPI.setHardwareInterfaceEnabled(interfaceName, false, function (success, errorMessage) {
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

            hardwareAPI.setHardwareInterfaceEnabled(interfaceName, true, function (success, errorMessage) {
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
        webServer.get('/frame/:frameName/zipBackup/', async function (req, res) {
            if (isLightweightMobile) {
                res.status(500).send('zipBackup unavailable on mobile');
                return;
            }

            var frameName = req.params.frameName;

            if (!utilities.isValidId(frameName)) {
                res.status(400).send('Invalid frame name. Must be alphanumeric.');
                return;
            }

            const frameLibPath = frameFolderLoader.resolvePath(frameName);
            if (!frameLibPath) {
                res.sendStatus(404);
                return;
            }
            var framePath = path.join(frameLibPath, frameName);

            if (!await fileExists(framePath)) {
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
        webServer.post(objectInterfaceFolder + 'contentDelete/:object/:frame', async function (req, res) {
            if (req.body.action === 'delete') {
                if (utilities.goesUpDirectory(req.path)) {
                    res.status(400).send('Invalid path. Cannot contain \'..\'.');
                    return;
                }
                const folderDel = __dirname + req.path.substr(4);
                try {
                    const folderStats = await fsProm.stat(folderDel);
                    if (folderStats.isDirectory()) {
                        await rmdirIfExists(folderDel);
                    } else {
                        await unlinkIfExists(folderDel);
                    }
                } catch (_e) {
                    console.warn('contentDelete frame path already deleted', folderDel);
                }

                res.send('ok');

            }
        });

        webServer.post(objectInterfaceFolder + 'contentDelete/:id', async function (req, res) {
            if (req.body.action === 'delete') {

                if (!utilities.isValidId(req.body.name)) {
                    res.status(400).send('Invalid object name. Must be alphanumeric.');
                    return;
                }

                if (!utilities.isValidId(req.params.id)) {
                    res.status(400).send('Invalid object id. Must be alphanumeric.');
                    return;
                }

                const folderDel = objectsPath + '/' + req.body.name;
                try {
                    const folderStats = await fsProm.stat(folderDel);

                    if (folderStats.isDirectory()) {
                        await rmdirIfExists(folderDel);
                    } else {
                        await unlinkIfExists(folderDel);
                    }
                } catch (_e) {
                    console.warn('contentDelete path already deleted', folderDel);
                }

                res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
            }

        });

        //*****************************************************************************************
        webServer.post(objectInterfaceFolder, async function (req, res) {

            if (req.body.action === 'zone') {
                let objectKey = utilities.readObject(objectLookup, req.body.name);
                objects[objectKey].zone = req.body.zone;
                await utilities.writeObjectToFile(objects, objectKey, globalVariables.saveToDisk);
                res.send('ok');
            }

            if (req.body.action === 'new') {
                if (req.body.name !== '' && !req.body.frame) {
                    if (!utilities.isValidId(req.body.name)) {
                        res.status(400).send('Invalid object name. Must be alphanumeric.');
                        return;
                    }

                    await utilities.createFolder(req.body.name);

                    // immediately create world or human object rather than wait for target data to instantiate
                    let isWorldObject = JSON.parse(req.body.isWorld || 'false');
                    let isHumanObject = JSON.parse(req.body.isHuman || 'false');
                    let isAvatarObject = JSON.parse(req.body.isAvatar || 'false');

                    if (isWorldObject || isHumanObject || isAvatarObject) {
                        let objectId = req.body.name;
                        let objectType = 'object';
                        if (isWorldObject) {
                            objectType = 'world';
                            objectId += utilities.uuidTime();
                        } else if (isHumanObject) {
                            objectType = 'human';
                            objectId += ('_' + utilities.uuidTime());
                        } else if (isAvatarObject) {
                            objectType = 'avatar';
                            // objectId += utilities.uuidTime();
                        }

                        if (isHumanObject) {
                            // special constructor for HumanPoseObject that also creates a frame for each joint
                            objects[objectId] = new HumanPoseObject(services.ip, version, protocol, objectId, JSON.parse(req.body.poseJointSchema));
                        } else {
                            objects[objectId] = new ObjectModel(services.ip, version, protocol, objectId);
                        }

                        objects[objectId].name = req.body.name;
                        objects[objectId].port = serverPort;
                        objects[objectId].isWorldObject = isWorldObject; // backwards compatible world objects

                        objects[objectId].type = objectType;

                        if (typeof req.body.worldId !== 'undefined') {
                            objects[objectId].worldId = req.body.worldId;
                        }

                        await utilities.writeObjectToFile(objects, objectId, globalVariables.saveToDisk);
                        utilities.writeObject(objectLookup, req.body.name, objectId);

                        if (!objects[objectId]) {
                            console.error('Object deleted during creation', objectId);
                            return;
                        }

                        // automatically create a tool and a node on the avatar object
                        if (isAvatarObject) {
                            let toolName = 'Avatar';
                            let toolId = objectId + toolName;
                            if (!objects[objectId].frames[toolId]) {
                                await utilities.createFrameFolder(req.body.name, toolName, __dirname, 'local');

                                if (!objects[objectId]) {
                                    console.error('Object deleted during creation', objectId);
                                    return;
                                }

                                objects[objectId].frames[toolId] = new Frame(objectId, toolId);
                                objects[objectId].frames[toolId].name = toolName;
                                await utilities.writeObjectToFile(objects, objectId, globalVariables.saveToDisk);

                                // now add a publicData storage node to the tool
                                let nodeInfo = {
                                    name: 'storage',
                                    type: 'storeData',
                                    x: 0,
                                    y: 0
                                };
                                nodeController.addNodeToFrame(objectId, toolId, toolId + 'storage', nodeInfo, function() {});
                            } else {
                                await utilities.createFrameFolder(req.body.name, toolName, __dirname, objects[objectId].frames[toolId].location);
                            }
                        }

                        if (!objects[objectId]) {
                            console.error('Object deleted during creation', objectId);
                            return;
                        }

                        sceneGraph.addObjectAndChildren(objectId, objects[objectId]);

                        // send the first beat immediately, so that there is a fast transmission of new object to all listeners
                        await objectBeatSender(beatPort, objectId, objects[objectId].ip, false, true);

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

                    await setAnchors(); // Needed to initialize non-world (anchor) objects

                } else if (req.body.name !== '' && req.body.frame !== '') {
                    if (!utilities.isValidId(req.body.name) || !utilities.isValidId(req.body.frame)) {
                        res.status(400).send('Invalid object or frame name. Must be alphanumeric.');
                        return;
                    }

                    let objectKey = utilities.readObject(objectLookup, req.body.name);

                    if (!objects[objectKey]) {
                        console.error('Object deleted during creation', objectKey);
                        return;
                    }

                    if (!objects[objectKey].frames[objectKey + req.body.frame]) {

                        await utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, 'local');

                        if (!objects[objectKey]) {
                            console.error('Object deleted during creation', objectKey);
                            return;
                        }

                        objects[objectKey].frames[objectKey + req.body.frame] = new Frame(objectKey, objectKey + req.body.frame);
                        objects[objectKey].frames[objectKey + req.body.frame].name = req.body.frame;
                        await utilities.writeObjectToFile(objects, objectKey, globalVariables.saveToDisk);
                        // sceneGraph.addObjectAndChildren(tempFolderName, objects[tempFolderName]);
                        sceneGraph.addFrame(objectKey, objectKey + req.body.frame, objects[objectKey].frames[objectKey + req.body.frame]);
                    } else {
                        await utilities.createFrameFolder(req.body.name, req.body.frame, __dirname, objects[objectKey].frames[objectKey + req.body.frame].location);
                    }
                }
                // res.send(webFrontend.printFolder(objects, __dirname, globalVariables.debug, objectInterfaceFolder, objectLookup, version));

                res.send('ok');
            }

            // deprecated route for deleting objects or frames
            // check routers/object.js for DELETE /object/objectKey and DELETE /object/objectKey/frames/frameKey
            if (req.body.action === 'delete') {
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
                    await fsProm.unlink(objectsPath + pathKey.substring(4));
                    res.send('ok');
                    return;
                }

                if (frameName !== '') {
                    if (!utilities.isValidId(frameName)) {
                        res.status(400).send('Invalid frame name. Must be alphanumeric.');
                        return;
                    }

                    var folderDelFrame = objectsPath + '/' + req.body.name + '/' + frameName;

                    await rmdirIfExists(folderDelFrame);

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

                    await utilities.writeObjectToFile(objects, objectKey, globalVariables.saveToDisk);
                    utilities.actionSender({reloadObject: {object: objectKey}, lastEditor: null});

                    sceneGraph.removeElementAndChildren(frameNameKey);

                    res.send('ok');

                } else {

                    const folderDel = objectsPath + '/' + req.body.name;
                    await rmdirIfExists(folderDel);

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);

                    if (tempFolderName2 !== null) {

                        // remove object from tree
                        if (objects[tempFolderName2]) {
                            if (activeHeartbeats[tempFolderName2]) {
                                clearActiveHeartbeat(activeHeartbeats[tempFolderName2]);
                                delete activeHeartbeats[tempFolderName2];
                            }
                            try {
                                // deconstructs frames and nodes of this object, too
                                objects[tempFolderName2].deconstruct();
                            } catch (e) {
                                console.warn('Object exists without proper prototype: ' + tempFolderName2, objects[tempFolderName2], e);
                            }
                            delete objects[tempFolderName2];
                            delete knownObjects[tempFolderName2];
                            delete objectLookup[req.body.name];

                            sceneGraph.removeElementAndChildren(tempFolderName2);
                        }

                    }

                    await setAnchors();

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
                    if (getFileExtension(filename) === 'zip') {
                        try {
                            var unzipper = new DecompressZip(path.join(folderD, filename));

                            unzipper.on('error', function (err) {
                                console.error('Unzipper Error', err);
                            });

                            unzipper.on('extract', async function () {
                                await createObjectFromTarget(filename.substr(0, filename.lastIndexOf('.')));

                                //todo add object to the beatsender.

                                await fsProm.unlink(folderD + '/' + filename);

                                res.status(200);
                                res.send('done');

                            });

                            unzipper.on('progress', function (_fileIndex, _fileCount) {
                                // console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                            });

                            unzipper.extract({
                                path: folderD,
                                filter: function (file) {
                                    return file.type !== 'SymbolicLink';
                                }
                            });
                        } catch (err) {
                            console.error('Unzipper Error', err);
                        }
                    }
                });
            }
        );

        // this for all the upload to content
        //***********************************************************************

        webServer.post(objectInterfaceFolder + 'content/:id',
            async function (req, res) {
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

                    if (await fileExists(folderDel)) {
                        try {
                            if ((await fsProm.stat(folderDel)).isDirectory()) {
                                await rmdirIfExists(folderDel);
                            } else {
                                await unlinkIfExists(folderDel);
                            }
                        } catch (e) {
                            console.warn(`Unable to unlink '${folderDel}'`, e);
                        }
                    }

                    var tempFolderName2 = utilities.readObject(objectLookup, req.body.name);
                    // remove object from tree
                    if (tempFolderName2 !== null) {
                        if (activeHeartbeats[tempFolderName2]) {
                            clearActiveHeartbeat(activeHeartbeats[tempFolderName2]);
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

                    res.send(webFrontend.uploadTargetContent(req.params.id, objectsPath, objectInterfaceFolder));
                }

                var form = new formidable.IncomingForm({
                    uploadDir: objectsPath + '/' + req.params.id,  // don't forget the __dirname here
                    keepExtensions: true,
                    maxFieldsSize: 1024 * 1024 * 1024, // 1 GB
                    maxFileSize: 1024 * 1024 * 1024,
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
                        if (typeof req.headers.folder !== 'undefined') {
                            file.path = form.uploadDir + '/' + req.headers.frame + '/' + req.headers.folder + '/' + file.name;
                        } else {
                            file.path = form.uploadDir + '/' + req.headers.frame + '/' + file.name;
                        }
                    }
                });

                try {
                    form.parse(req);
                } catch (e) {
                    console.warn('error parsing formidable', e);
                    res.status(500).send(`error parsing formidable: ${e}`);
                    return;
                }

                form.on('end', function () {
                    var folderD = form.uploadDir;
                    // by default, uploading any other target file will auto-generate a target.xml file
                    //   specify `autogeneratexml: false` in the headers to prevent this behavior
                    let autoGenerateXml = typeof req.headers.autogeneratexml !== 'undefined' ? JSON.parse(req.headers.autogeneratexml) : true;
                    fileInfoList = fileInfoList.filter(fileInfo => !fileInfo.completed); // Don't repeat processing for completed files
                    fileInfoList.forEach(async fileInfo => {
                        if (!await fileExists(path.join(form.uploadDir, fileInfo.name))) { // Ignore files that haven't finished uploading
                            return;
                        }
                        fileInfo.completed = true; // File has downloaded
                        let filename = fileInfo.name;
                        if (req.headers.type === 'targetUpload') {
                            var fileExtension = getFileExtension(filename);

                            if (fileExtension === 'jpeg') { // Needed for compatibility, .JPEG is equivalent to .JPG
                                fileExtension = 'jpg';
                            }

                            if (fileExtension === 'jpg' || fileExtension === 'dat' || fileExtension === 'xml' ||
                                fileExtension === 'glb' || fileExtension === '3dt'  || fileExtension === 'splat') {
                                if (!await fileExists(folderD + '/' + identityFolderName + '/target/')) {
                                    try {
                                        await fsProm.mkdir(folderD + '/' + identityFolderName + '/target/', '0766');
                                    } catch (err) {
                                        console.error('Error creating target upload directory', err);
                                        res.send('ERROR! Can\'t make the directory! \n');    // echo the result back
                                    }
                                }

                                try {
                                    await fsProm.rename(folderD + '/' + filename, folderD + '/' + identityFolderName + '/target/target.' + fileExtension);
                                } catch (e) {
                                    console.error(`error renaming ${filename} to target.${fileExtension}`, e);
                                }

                                // extract the targetId from the dat file when the dat file is uploaded
                                if (fileExtension === 'dat') {
                                    try {
                                        let targetUniqueId = await utilities.getTargetIdFromTargetDat(path.join(folderD, identityFolderName, 'target'));
                                        let thisObjectId = utilities.readObject(objectLookup, req.params.id);
                                        objects[thisObjectId].targetId = targetUniqueId;
                                        console.log(`set targetId for ${thisObjectId} to ${targetUniqueId}`);
                                    } catch (e) {
                                        console.log('unable to extract targetId from dat file');
                                    }
                                    // Step 1) - resize image if necessary. Vuforia can make targets from jpgs of up to 2048px
                                    // but we scale down to 1024px for a larger margin of error and (even) smaller filesize
                                } else if (fileExtension === 'jpg') {

                                    var rawFilepath = folderD + '/' + identityFolderName + '/target/target.' + fileExtension;
                                    var tempFilepath = folderD + '/' + identityFolderName + '/target/target-temp.' + fileExtension;
                                    var originalFilepath = folderD + '/' + identityFolderName + '/target/target-original-size.' + fileExtension;

                                    try {
                                        const image = await Jimp.read(rawFilepath);
                                        var desiredMaxDimension = 1024;

                                        if (Math.max(image.bitmap.width, image.bitmap.height) <= desiredMaxDimension) {
                                            // JPEG doesn't need resizing
                                            continueProcessingUpload();
                                        } else {
                                            var aspectRatio = image.bitmap.width / image.bitmap.height;
                                            var newWidth = desiredMaxDimension;
                                            if (image.bitmap.width < image.bitmap.height) {
                                                newWidth = desiredMaxDimension * aspectRatio;
                                            }

                                            // copy fullsize file as backup
                                            await unlinkIfExists(originalFilepath);
                                            await fsProm.copyFile(rawFilepath, originalFilepath);

                                            // copied file into temp file to be used during the resize operation
                                            await unlinkIfExists(tempFilepath);
                                            await fsProm.copyFile(rawFilepath, tempFilepath);

                                            const tempImage = await Jimp.read(tempFilepath);
                                            await tempImage.resize(newWidth, Jimp.AUTO).write(rawFilepath);

                                            await unlinkIfExists(tempFilepath);
                                            continueProcessingUpload();
                                        }
                                    } catch (e) {
                                        console.error('Error using sharp to load and resize image from: ' + rawFilepath + ', but trying to continue upload process anyways', e);
                                        continueProcessingUpload();
                                    }

                                } else {
                                    continueProcessingUpload();
                                }

                                // Step 2) - Generate a default XML file if needed
                                async function continueProcessingUpload() { // eslint-disable-line no-inner-declarations
                                    if (!autoGenerateXml) {
                                        await onXmlVerified();
                                        return;
                                    }

                                    var objectName = req.params.id + utilities.uuidTime();
                                    var documentcreate = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                                       '<ARConfig xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
                                       '   <Tracking>\n' +
                                       '   <ImageTarget name="' + objectName + '" size="0.30000000 0.30000000" />\n' +
                                       '   </Tracking>\n' +
                                       '   </ARConfig>';


                                    var xmlOutFile = path.join(folderD, identityFolderName, '/target/target.xml');
                                    if (!await fileExists(xmlOutFile)) {
                                        try {
                                            await fsProm.writeFile(xmlOutFile, documentcreate);
                                            await onXmlVerified();
                                        } catch (err) {
                                            await onXmlVerified(err);
                                        }
                                    } else {
                                        await onXmlVerified();
                                    }
                                }

                                // create the object data and respond to the webFrontend once the XML file is confirmed to exist
                                async function onXmlVerified(err) { // eslint-disable-line no-inner-declarations
                                    let thisObjectId = utilities.readObject(objectLookup, req.params.id);

                                    if (err) {
                                        console.error('XML verification error', err);
                                    } else {
                                        // create the object if needed / possible
                                        if (typeof objects[thisObjectId] === 'undefined') {
                                            await createObjectFromTarget(tmpFolderFile);

                                            //todo send init to internal modules

                                            hardwareAPI.reset();
                                        }
                                    }

                                    let jpgPath = path.join(folderD, identityFolderName, '/target/target.jpg');
                                    let datPath = path.join(folderD, identityFolderName, '/target/target.dat');
                                    let xmlPath = path.join(folderD, identityFolderName, '/target/target.xml');
                                    let glbPath = path.join(folderD, identityFolderName, '/target/target.glb');
                                    let tdtPath = path.join(folderD, identityFolderName, '/target/target.3dt');
                                    let splatPath = path.join(folderD, identityFolderName, '/target/target.splat');

                                    var fileList = [jpgPath, xmlPath, datPath, glbPath, tdtPath, splatPath];

                                    if (typeof objects[thisObjectId] !== 'undefined') {
                                        var thisObject = objects[thisObjectId];
                                        var jpg = await fileExists(jpgPath);
                                        var dat = await fileExists(datPath);
                                        var xml = await fileExists(xmlPath);
                                        var glb = await fileExists(glbPath);
                                        var tdt = await fileExists(tdtPath);
                                        var splat = await fileExists(splatPath);

                                        var sendObject = {
                                            id: thisObjectId,
                                            name: thisObject.name,
                                            initialized: (jpg && xml),
                                            jpgExists: jpg,
                                            xmlExists: xml,
                                            datExists: dat,
                                            glbExists: glb,
                                            tdtExists: tdt,
                                            splatExists: splat
                                        };

                                        thisObject.tcs = await utilities.generateChecksums(objects, fileList);
                                        await utilities.writeObjectToFile(objects, thisObjectId, globalVariables.saveToDisk);
                                        await setAnchors();

                                        // Removes old heartbeat if it used to be an anchor
                                        var oldObjectId = await utilities.getAnchorIdFromObjectFile(req.params.id);
                                        if (oldObjectId && oldObjectId !== thisObjectId) {
                                            clearActiveHeartbeat(activeHeartbeats[oldObjectId]);
                                            delete activeHeartbeats[oldObjectId];
                                            try {
                                                // deconstructs frames and nodes of this object, too
                                                objects[oldObjectId].deconstruct();
                                            } catch (e) {
                                                console.warn('Object exists without proper prototype: ' + tempFolderName2, e);
                                            }
                                            delete objects[oldObjectId];
                                        }

                                        await objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);
                                        // res.status(200).send('ok');
                                        try {
                                            res.status(200).json(sendObject);
                                        } catch (e) {
                                            console.error('unable to send res', e);
                                        }

                                    } else {
                                        // var sendObject = {
                                        //     initialized : false
                                        // };
                                        try {
                                            res.status(200).send('ok');
                                        } catch (e) {
                                            console.error('unable to send res', e);
                                        }
                                    }
                                }

                            } else if (fileExtension === 'zip') {
                                const zipfileName = filename;
                                try {
                                    var unzipper = new DecompressZip(path.join(folderD, zipfileName));

                                    unzipper.on('error', function (err) {
                                        console.error('Unzipper error', err);
                                    });

                                    unzipper.on('extract', async function (_log) {
                                        const targetFolderPath = path.join(folderD, identityFolderName, 'target');
                                        const folderFiles = await fsProm.readdir(targetFolderPath);
                                        const targetTypes = ['xml', 'dat', 'glb', 'unitypackage', '3dt', 'jpg', 'splat'];

                                        let anyTargetsUploaded = false;

                                        for (var i = 0; i < folderFiles.length; i++) {
                                            const folderFile = folderFiles[i];
                                            const folderFileType = folderFile.substr(folderFile.lastIndexOf('.') + 1);
                                            if (targetTypes.includes(folderFileType)) {
                                                await fsProm.rename(
                                                    path.join(targetFolderPath, folderFile),
                                                    path.join(targetFolderPath, 'target.' + folderFileType)
                                                );
                                                anyTargetsUploaded = true;
                                            }
                                            if (folderFile === 'target') {
                                                const innerFolderFiles = await fsProm.readdir(folderD + '/' + identityFolderName + '/target/' + folderFile);
                                                let deferred = false;
                                                function finishFn(folderName) {
                                                    return async function() {
                                                        // cleanup the target directory after uploading files
                                                        let nestedTargetDirPath = path.join(folderD, identityFolderName, 'target', folderName);

                                                        try {
                                                            // Attempt to delete .DS_Store if it exists
                                                            await fsProm.unlink(path.join(nestedTargetDirPath, '.DS_Store'));
                                                        } catch (error) {
                                                            // Ignore if .DS_Store doesn't exist; display other warnings
                                                            if (error.code !== 'ENOENT') console.warn(error);
                                                        }

                                                        try {
                                                            await fsProm.rmdir(nestedTargetDirPath);
                                                        } catch (e) {
                                                            console.warn('target zip already cleaned up', folderName, e);
                                                        }

                                                        try {
                                                            await fsProm.rename(
                                                                path.join(folderD, identityFolderName, 'target', 'authoringMesh.glb'),
                                                                path.join(folderD, identityFolderName, 'target', 'target.glb')
                                                            );
                                                        } catch (e) {
                                                            console.log('no authoringMesh.glb to rename to target.glb', e);
                                                        }

                                                        try {
                                                            // Attempt to delete __MACOSX zip artifact, if it exists
                                                            await fsProm.rmdir(path.join(folderD, identityFolderName, 'target', '__MACOSX'), { recursive: true });
                                                        } catch (error) {
                                                            if (error.code !== 'ENOENT') console.warn(error);
                                                        }
                                                    };
                                                }
                                                const finish = finishFn(folderFile);

                                                for (let j = 0; j < innerFolderFiles.length; j++) {
                                                    let innerFolderFile = innerFolderFiles[j];
                                                    const innerFolderFileType = innerFolderFile.substr(innerFolderFile.lastIndexOf('.') + 1);
                                                    if (targetTypes.includes(innerFolderFileType)) {
                                                        await fsProm.rename(
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
                                                            console.error('3dt Unzipper Error', err);
                                                        });

                                                        unzipper3dt.on('extract', function () {
                                                            finish();
                                                        });

                                                        unzipper3dt.on('progress', function (_fileIndex, _fileCount) {
                                                            // console.log('Extracted 3dt file ' + (fileIndex + 1) + ' of ' + fileCount);
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
                                        await fsProm.unlink(path.join(folderD, zipfileName));

                                        // evnetually create the object.

                                        if (await fileExists(path.join(targetFolderPath, 'target.dat')) && await fileExists(path.join(targetFolderPath, 'target.xml'))) {
                                            await createObjectFromTarget(tmpFolderFile);

                                            //todo send init to internal modules

                                            hardwareAPI.reset();

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
                                                    targetFileExts[ext] = await fileExists(filePath);
                                                }

                                                thisObject.tcs = await utilities.generateChecksums(objects, fileList);

                                                await utilities.writeObjectToFile(objects, thisObjectId, globalVariables.saveToDisk);
                                                await setAnchors();
                                                await objectBeatSender(beatPort, thisObjectId, objects[thisObjectId].ip, true);

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

                                    unzipper.on('progress', function (_fileIndex, _fileCount) {
                                        // console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                                    });

                                    unzipper.extract({
                                        path: path.join(folderD, identityFolderName, 'target'),
                                        filter: function (file) {
                                            return file.type !== 'SymbolicLink';
                                        }
                                    });
                                } catch (err) {
                                    console.error('Unzipper Error', err);
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

        webServer.delete(objectInterfaceFolder + 'content/:id', async function (req, res) {
            if (!utilities.isValidId(req.params.id)) {
                res.status(400).send('Invalid object name. Must be alphanumeric.');
                return;
            }

            tmpFolderFile = req.params.id;

            let objectKey = utilities.readObject(objectLookup, tmpFolderFile);

            // reset checksum
            if (objects[objectKey]) { // allows targets from corrupted objects to be deleted
                objects[objectKey].tcs = 0;
            }

            // delete target files

            let targetDir = path.join(objectsPath, tmpFolderFile, identityFolderName, 'target');
            try {
                await fsProm.unlink(path.join(targetDir, 'target.xml'));
            } catch (e) {
                console.error('Error while trying to delete ' + path.join(targetDir, 'target.xml'), e);
            }
            try {
                await fsProm.unlink(path.join(targetDir, 'target.jpg'));
            } catch (e) {
                console.error('Error while trying to delete ' + path.join(targetDir, 'target.jpg'), e);
            }
            try {
                await fsProm.unlink(path.join(targetDir, 'target.dat'));
            } catch (e) {
                console.error('Error while trying to delete ' + path.join(targetDir, 'target.dat'), e);
            }

            // recompute isAnchor (depends if there is an initialized world object)
            await setAnchors();

            // save to disk and respond
            if (objects[objectKey]) { // allows targets from corrupted objects to be deleted
                await utilities.writeObjectToFile(objects, objectKey, globalVariables.saveToDisk);
            }
            res.send('ok');
        });

    } else {
        webServer.get(objectInterfaceFolder, function (req, res) {
            res.send('Objects<br>Developer functions are off');
        });
    }
}

/**
 * Gets triggered when uploading a ZIP with XML and Dat. Generates a new object and saves it to object.json.
 * @param {string} folderVar
 */
async function createObjectFromTarget(folderVar) {
    var folder = objectsPath + '/' + folderVar + '/';

    if (!await fileExists(folder)) {
        return;
    }

    // This isn't retrieved from the XML file anymore - we use the name the object was created with
    let objectId = utilities.readObject(objectLookup, folderVar);
    let objectSizeXML = await utilities.getTargetSizeFromTarget(folderVar);

    let targetUniqueId = await utilities.getTargetIdFromTargetDat(path.join(objectsPath, folderVar, identityFolderName, 'target'));

    objects[objectId] = new ObjectModel(services.ip, version, protocol, objectId);
    objects[objectId].port = serverPort;
    objects[objectId].name = folderVar;
    objects[objectId].targetSize = objectSizeXML;

    try {
        const contents = await fsProm.readFile(objectsPath + '/' + folderVar + '/' + identityFolderName + '/object.json', 'utf8');
        objects[objectId] = JSON.parse(contents);
        // objects[objectId].objectId = objectId;
        objects[objectId].ip = services.ip; //ip.address();
    } catch (e) {
        objects[objectId].ip = services.ip; //ip.address();
        console.warn('No saved data for: ' + objectId, e);
    }

    if (objectId.indexOf(worldObjectName) > -1) { // TODO: implement a more robust way to tell if it's a world object
        objects[objectId].isWorldObject = true;
        objects[objectId].type = 'world';
        objects[objectId].timestamp = Date.now();
    }

    objects[objectId].targetId = targetUniqueId;

    // entering the object in to the lookup table
    utilities.writeObject(objectLookup, folderVar, objectId);

    // ask the object to reinitialize
    //serialPort.write("ok\n");
    // todo send init to internal

    hardwareAPI.reset();

    await utilities.writeObjectToFile(objects, objectId, globalVariables.saveToDisk);

    if (!objects[objectId]) {
        console.error('Object deleted during createObjectFromTarget', objectId);
        return;
    }

    sceneGraph.addObjectAndChildren(objectId, objects[objectId]);

    await objectBeatSender(beatPort, objectId, objects[objectId].ip);
}


/**
 * @desc Check for incoming MSG from other objects or the User. Make changes to the objectValues if changes occur.
 **/

const socketHandler = {};

socketHandler.sendPublicDataToAllSubscribers = function (objectKey, frameKey, nodeKey, sessionUuid) {
    const node = getNode(objectKey, frameKey, nodeKey);
    if (node) {
        realityEditorSocketSubscriptions.forEach(entry => {
            entry.subscriptions.forEach(subscription => {
                if (objectKey === subscription.object && frameKey === subscription.frame) {
                    entry.socket.emit('object/publicData', JSON.stringify({
                        object: objectKey,
                        frame: frameKey,
                        node: nodeKey,
                        publicData: node.publicData,
                        sessionUuid: sessionUuid // used to filter out messages received by the original sender
                    }));
                }
            });
        });
    }
};

/**
 * Helper function to trigger the addReadListeners for the data of a particular node (data value, not publicData)
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} sessionUuid – the uuid of the client sending the message, so the sender can ignore their own message
 */
socketHandler.sendDataToAllSubscribers = function (objectKey, frameKey, nodeKey, sessionUuid = '0') {
    let node = getNode(objectKey, frameKey, nodeKey);
    if (!node) return;

    realityEditorSocketSubscriptions.forEach(entry => {
        entry.subscriptions.filter(subscription => {
            return subscription.object === objectKey && subscription.frame === frameKey;
        }).forEach(_info => {
            entry.socket.emit('object', JSON.stringify({
                object: objectKey,
                frame: frameKey,
                node: nodeKey,
                data: node.data,
                sessionUuid: sessionUuid
            }));
        });
    });
};

/**
 * Send updates of objects/frames/nodes to all editors/clients subscribed to 'subscribe/realityEditorUpdates'
 * @param {Array.<Object>} batchedUpdates
 */
socketHandler.sendUpdateToAllSubscribers = function (batchedUpdates) {
    if (!batchedUpdates) { return; }
    if (batchedUpdates.length == 0) { return; }
    let senderId = batchedUpdates[0].editorId;

    let msgContent = {};
    msgContent.batchedUpdates = batchedUpdates;

    for (const entry of realityEditorUpdateSocketSubscriptions) {
        entry.subscriptions.forEach(subscription => {
            if (senderId === subscription.editorId) {
                // Don't send updates to the editor that triggered it
                return;
            }

            if (entry.socket.connected) {
                entry.socket.emit('/batchedUpdate', JSON.stringify(msgContent));
            }
        });
    }
};

exports.socketHandler = socketHandler;

function socketServer() {
    io.on('connection', function (socket) {
        /**
         * @type {{[objectKey: string]: bool}}
         * tracks if we have already sent a reloadObject message in response to
         * an unknown objectKey
         */
        const knownUnknownObjects = {};

        socket.on('/subscribe/realityEditor', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            var thisProtocol = 'R1';

            if (!msgContent.object) {
                msgContent.object = msgContent.obj;
                thisProtocol = 'R0';
            }

            if (doesObjectExist(msgContent.object)) {
                if (!realityEditorSocketSubscriptions.some(entry => entry.socket === socket)) {
                    const newEntry = {
                        subscriptions: [],
                        socket: socket
                    };
                    realityEditorSocketSubscriptions.push(newEntry);
                }

                const entry = realityEditorSocketSubscriptions.find(thisEntry => thisEntry.socket === socket);

                let isNew = true;
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.object === subscription.object && msgContent.frame === subscription.frame) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    entry.subscriptions.push({
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

                    socket.emit('object', JSON.stringify({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        node: key,
                        data: frame.nodes[key].data
                    }));

                    socket.emit('object/publicData', JSON.stringify({
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
                if (!realityEditorSocketSubscriptions.some(entry => entry.socket === socket)) {
                    const newEntry = {
                        subscriptions: [],
                        socket: socket
                    };
                    realityEditorSocketSubscriptions.push(newEntry);
                }

                const entry = realityEditorSocketSubscriptions.find(thisEntry => thisEntry.socket === socket);

                let isNew = true;
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.object === subscription.object && msgContent.frame === subscription.frame) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    entry.subscriptions.push({
                        object: msgContent.object,
                        frame: msgContent.frame,
                        protocol: thisProtocol
                    });
                }
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

                    socket.emit('object/publicData', JSON.stringify({
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
                if (!realityEditorBlockSocketSubscriptions.some(entry => entry.socket === socket)) {
                    const newEntry = {
                        subscriptions: [],
                        socket: socket
                    };
                    realityEditorBlockSocketSubscriptions.push(newEntry);
                }

                const entry = realityEditorBlockSocketSubscriptions.find(thisEntry => thisEntry.socket === socket);

                let isNew = true;
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.object === subscription.object) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    entry.subscriptions.push({object: msgContent.object});
                }
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
            socket.emit('block', JSON.stringify({
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
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (msgContent.interfaceName) {
                hardwareAPI.addSettingsCallback(msgContent.interfaceName, function (interfaceName, currentSettings) {
                    if (socket.connected) {
                        socket.emit('interfaceSettings', JSON.stringify({
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

                sendMessageToEditors({
                    object: msgContent.object,
                    frame: msgContent.frame,
                    node: msgContent.node,
                    data: msgContent.data
                }, socket);
            }
        });

        socket.on('object/publicData', async function (_msg) {
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

            var object = getObject(msg.object);
            if (object) {
                // frequently updated objects like avatar and human pose are excluded from writing to file
                if (object.type !== 'avatar' && object.type !== 'human') {
                    await utilities.writeObjectToFile(objects, msg.object, globalVariables.saveToDisk);
                }

                // NOTE: string 'whole_pose' is defined in JOINT_PUBLIC_DATA_KEYS in UI codebase
                if (object.type == 'human' && msg.publicData['whole_pose']) {
                    // TODO: clear additional framedata from the message which are not needed on other clients, so they are not transmitted by sendPublicDataToAllSubscribers below

                    // unpack public data with the whole pose to the human pose object
                    if (typeof msg.publicData['whole_pose'].joints !== 'undefined' &&
                        typeof msg.publicData['whole_pose'].timestamp !== 'undefined') {

                        // add poses to huamn pose fusion (including empty poses when body tracking failed)
                        humanPoseFuser.addPoseData(object.objectId, msg.publicData['whole_pose']);

                        // if no pose is detected (empty joints array), don't update the object (even its update timestamp)
                        if (msg.publicData['whole_pose'].joints.length > 0) {
                            object.updateJoints(msg.publicData['whole_pose'].joints);
                            object.lastUpdateDataTS = msg.publicData['whole_pose'].timestamp;
                            // keep the object alive
                            resetObjectTimeout(msg.object);
                        }
                    }
                }
            } else {
                const objectKey = msg.object;
                if (!knownUnknownObjects[objectKey]) {
                    console.warn('publicData update of unknown object', msg.object);
                    knownUnknownObjects[objectKey] = true;
                    utilities.actionSender({
                        reloadObject: {
                            object: objectKey,
                        },
                    });
                    setTimeout(() => {
                        delete knownUnknownObjects[objectKey];
                    }, 2000);
                }
            }

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
            messageToSend(msgContent, socket);
        });

        socket.on('/object/screenObject', function (_msg) {
            let msg = typeof _msg === 'string' ? JSON.parse(_msg) : _msg;
            hardwareAPI.screenObjectCall(msg);
        });

        socket.on('/subscribe/realityEditorUpdates', function (msg) {
            const msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            if (!realityEditorUpdateSocketSubscriptions.some(entry => entry.socket === socket)) {
                const newEntry = {
                    subscriptions: [],
                    socket: socket
                };
                realityEditorUpdateSocketSubscriptions.push(newEntry);
            }

            const entry = realityEditorUpdateSocketSubscriptions.find(thisEntry => thisEntry.socket === socket);

            let isNew = true;
            entry.subscriptions.forEach(subscription => {
                if (msgContent.editorId === subscription.editorId) {
                    isNew = false;
                }
            });
            if (isNew) {
                entry.subscriptions.push({editorId: msgContent.editorId});
            }
        });

        /**
         * Applies update to object based on the property path and new value found within
         * @param {any} obj
         * @param {{objectKey: string, frameKey: string?, nodeKey: string?, propertyPath: string, newValue: any}} update
         */
        function applyPropertyUpdate(obj, update) {
            let keys = update.propertyPath.split('.');
            let target = obj;
            for (let key of keys.slice(0, -1)) {
                if (!obj.hasOwnProperty(key)) {
                    obj[key] = {};
                }
                target = obj[key];
            }
            target[keys[keys.length - 1]] = update.newValue;
        }

        /**
         * Alters objects based on the change described by `update`
         * @param {{objectKey: string, frameKey: string?, nodeKey: string?, propertyPath: string, newValue: any}} update
         */
        function applyUpdate(update) {
            if (!update.objectKey) {
                console.error('malformed update', update);
                return;
            }
            let obj = objects[update.objectKey];
            if (!obj) {
                console.warn('update of unknown object', update);
                const objectKey = update.objectKey;
                if (!knownUnknownObjects[objectKey]) {
                    knownUnknownObjects[objectKey] = true;
                    utilities.actionSender({
                        reloadObject: {
                            object: objectKey,
                        },
                    });
                    setTimeout(() => {
                        delete knownUnknownObjects[objectKey];
                    }, 2000);
                }
                return;
            }
            if (!update.frameKey) {
                applyPropertyUpdate(obj, update);
                return;
            }
            let frame = obj.frames[update.frameKey];
            if (!frame) {
                console.warn('update of unknown object frame', update);
                return;
            }
            if (!update.nodeKey) {
                applyPropertyUpdate(frame, update);
                return;
            }
            let node = frame.nodes[update.nodeKey];
            if (!node) {
                console.warn('update of unknown object frame node', update);
                return;
            }
            applyPropertyUpdate(node, update);

            // recorder.update();
        }

        socket.on('/update', function (msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            applyUpdate(msgContent);

            for (const entry of realityEditorUpdateSocketSubscriptions) {
                if (!entry) {
                    continue;
                }
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.hasOwnProperty('editorId') && msgContent.editorId === subscription.editorId) {
                    // Don't send updates to the editor that triggered it
                        return;
                    }
                    if (entry.socket.connected) {
                        entry.socket.emit('/update', JSON.stringify(msgContent));
                    }
                });
            }
        });

        // relays realtime updates (to matrix, x, y, scale, etc) from one client to the rest of the clients
        // clients are responsible for batching and processing the batched updates at whatever frequency they prefer
        socket.on('/batchedUpdate', function (msg) {
            let msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            let batchedUpdates = msgContent.batchedUpdates;
            if (!batchedUpdates) { return; }

            // Add the incoming update to the aggregator, which will relay the message to other clients after additional batching
            updateAggregator.addUpdate(msgContent);

            // immediately apply the update to the data model on the server, rather than waiting for more batching
            for (let update of batchedUpdates) {
                resetObjectTimeout(update.objectKey);
                applyUpdate(update);
            }
        });

        // remote operators can subscribe to all other remote operator's camera positions using this method
        // body should contain a unique "editorId" string identifying the client
        socket.on('/subscribe/cameraMatrix', function (msg) {
            const msgContent = JSON.parse(msg);
            const subscription = {editorId: msgContent.editorId, socket: socket};
            realityEditorCameraMatrixSocketSubscriptions.push(subscription);
        });

        // remote operators can broadcast their camera position to all others using this method
        // body should contain the unique "editorId" of the client as well as its "cameraMatrix" (length 16 array)
        socket.on('/cameraMatrix', function (msg) {
            const msgContent = JSON.parse(msg);

            for (const entry of realityEditorCameraMatrixSocketSubscriptions) {
                if (msgContent.hasOwnProperty('editorId') && msgContent.editorId === entry.editorId) {
                    continue; // dont send updates to the editor that triggered it
                }

                if (entry.socket.connected) {
                    entry.socket.emit('/cameraMatrix', JSON.stringify(msgContent));
                }
            }
        });

        socket.on('/signalling', function (msgRaw) {
            try {
                const msg = typeof msgRaw === 'string' ? JSON.parse(msgRaw) : msgRaw;
                signallingController.onMessage(socket, msg);
            } catch (e) {
                console.error('Malformed signalling message', msgRaw);
            }
        });

        socket.on('/subscribe/objectUpdates', function (msg) {
            const msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;

            if (!realityEditorObjectMatrixSocketSubscriptions.some(entry => entry.socket === socket)) {
                const newEntry = {
                    subscriptions: [],
                    socket: socket
                };
                realityEditorObjectMatrixSocketSubscriptions.push(newEntry);
            }

            const entry = realityEditorObjectMatrixSocketSubscriptions.find(s => s.socket === socket);

            let isNew = true;
            entry.subscriptions.forEach(subscription => {
                if (msgContent.editorId === subscription.editorId) {
                    isNew = false;
                }
            });

            if (isNew) {
                entry.subscriptions.push({editorId: msgContent.editorId});
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
                sceneGraph.updateObjectWorldId(msgContent.objectKey, object.worldId);
            }

            for (const entry of realityEditorObjectMatrixSocketSubscriptions) {
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.hasOwnProperty('editorId') && subscription && msgContent.editorId === subscription.editorId) {
                        // don't send updates to the editor that triggered it
                        return;
                    }

                    if (entry.socket.connected) {
                        const updateResponse = {
                            objectKey: msgContent.objectKey,
                            propertyPath: 'matrix',
                            newValue: msgContent.matrix,
                        };
                        if (typeof msgContent.editorId !== 'undefined') {
                            updateResponse.editorId = msgContent.editorId;
                        }

                        entry.socket.emit('/update/object/matrix', JSON.stringify(updateResponse));
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

            for (const entry of realityEditorObjectMatrixSocketSubscriptions) {
                entry.subscriptions.forEach(subscription => {
                    if (msgContent.hasOwnProperty('editorId') && subscription && msgContent.editorId === subscription.editorId) {
                        // Don't send updates to the editor that triggered it
                        return;
                    }

                    if (entry.socket.connected) {
                        const updateResponse = {
                            objectKey: msgContent.objectKey,
                            propertyPath: 'matrix',
                            newValue: object.matrix,
                        };
                        if (typeof msgContent.editorId !== 'undefined') {
                            updateResponse.editorId = msgContent.editorId;
                        }

                        entry.socket.emit('/update/object/matrix', JSON.stringify(updateResponse));
                    }
                });
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

        /**
         * Handles messages from local remote operators who don't have access
         * to sending actions through the cloud proxy or native udp broadcast
         */
        socket.on('udp/action', async function(msgRaw) {
            let msg;
            try {
                msg = typeof msgRaw === 'object' ? msgRaw : JSON.parse(msgRaw);
            } catch (_) {
                // parse failed
            }
            if (!msg || !msg.action) {
                return;
            }

            await handleActionMessage(msg.action);
        });

        socket.on('/disconnectEditor', async function(msgRaw) {
            let msg = typeof msgRaw === 'object' ? msgRaw : JSON.parse(msgRaw);
            let avatarKeys = Object.keys(objects).filter(key => key.includes('_AVATAR_') && key.includes(msg.editorId));
            await deleteObjects(avatarKeys);

            let humanPoseKeys = Object.keys(objects).filter(key => key.includes('_HUMAN_') && key.includes(msg.editorId));
            await deleteObjects(humanPoseKeys);
        });

        socket.on('disconnect', async function () {
            const socketEntry = realityEditorSocketSubscriptions.find(entry => entry.socket === socket);
            if (socketEntry) {
                realityEditorSocketSubscriptions.splice(realityEditorSocketSubscriptions.indexOf(socketEntry), 1);
            }

            const blockSocketEntry = realityEditorBlockSocketSubscriptions.find(entry => entry.socket === socket);
            if (blockSocketEntry) {
                for (const subscription of blockSocketEntry.subscriptions) {
                    await utilities.writeObjectToFile(objects, subscription.object, globalVariables.saveToDisk);
                    utilities.actionSender({reloadObject: {object: subscription.object}});
                }
                realityEditorBlockSocketSubscriptions.splice(realityEditorBlockSocketSubscriptions.indexOf(blockSocketEntry), 1);
            }

            const objectMatrixSocketEntry = realityEditorObjectMatrixSocketSubscriptions.find(entry => entry.socket === socket);
            if (objectMatrixSocketEntry) {
                realityEditorObjectMatrixSocketSubscriptions.splice(realityEditorObjectMatrixSocketSubscriptions.indexOf(objectMatrixSocketEntry), 1);
            }

            const updateSocketEntry = realityEditorUpdateSocketSubscriptions.find(entry => entry.socket === socket);
            if (updateSocketEntry) {
                let keysToDelete = [];
                updateSocketEntry.subscriptions.forEach(subscription => {
                    let avatarKeys = Object.keys(objects).filter(key => key.includes('_AVATAR_') && key.includes(subscription.editorId));
                    let humanPoseKeys = Object.keys(objects).filter(key => key.includes('_HUMAN_') && key.includes(subscription.editorId));
                    keysToDelete.push(avatarKeys);
                    keysToDelete.push(humanPoseKeys);
                });

                await deleteObjects(keysToDelete.flat());

                realityEditorUpdateSocketSubscriptions.splice(realityEditorUpdateSocketSubscriptions.indexOf(updateSocketEntry), 1);
            }

            const cameraMatrixSocketEntry = realityEditorCameraMatrixSocketSubscriptions.find(entry => entry.socket === socket);
            if (cameraMatrixSocketEntry) {
                realityEditorCameraMatrixSocketSubscriptions.splice(realityEditorCameraMatrixSocketSubscriptions.indexOf(cameraMatrixSocketEntry), 1);
            }
        });
    });
    this.io = io;
}

async function deleteObjects(objectKeysToDelete) {
    for (const objectKey of objectKeysToDelete) {
        await deleteObject(objectKey);
    }
}

async function deleteObject(objectKey) {
    if (objects[objectKey]) {
        await utilities.deleteObject(objects[objectKey].name, objects, objectLookup, activeHeartbeats, knownObjects, sceneGraph, setAnchors);
    }
    // try to clean up any other state that might be remaining

    if (objectKey.includes('_HUMAN_')) {
        humanPoseFuser.removeHumanObject(objectKey);
    }
    if (activeHeartbeats[objectKey]) {
        clearActiveHeartbeat(activeHeartbeats[objectKey]);
        delete activeHeartbeats[objectKey];
    }
    delete knownObjects[objectKey];
    delete objectLookup[objectKey];
    delete objects[objectKey];
    sceneGraph.removeElementAndChildren(objectKey);
}

function sendMessageToEditors(msgContent, sourceSocket) {
    realityEditorSocketSubscriptions.forEach(entry => {
        entry.subscriptions.forEach(subscription => {
            if (sourceSocket && entry.socket === sourceSocket && msgContent.object === subscription.object && msgContent.frame === subscription.frame) {
                return; // don't trigger the read listener of the socket that originally wrote the data
            }

            if (msgContent.object === subscription.object && msgContent.frame === subscription.frame) {
                messageToSend(msgContent, entry.socket);
            }
        });
    });
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

function _forEachHumanPoseObject(callback) {
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

/**
 * @param {any} msgContent
 * @param {ToolSocket} socket
 */
function messageToSend(msgContent, socket) {
    const node = getNode(msgContent.object, msgContent.frame, msgContent.node);
    if (!node) {
        console.warn('messageToSend unable to find node', msgContent);
    }

    socket.emit('object', JSON.stringify({
        object: msgContent.object,
        frame: msgContent.frame,
        node: msgContent.node,
        data: (node && node.data) || msgContent.data,
    }));
}


hardwareAPI.screenObjectServerCallBack(function (object, frame, node, touchOffsetX, touchOffsetY) {
    for (const entry of realityEditorSocketSubscriptions) {
        entry.socket.emit('/object/screenObject', JSON.stringify({
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
            console.warn('temporarily ignored undefined destination in computeProcessedData', thisLink);
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
        sendMessageToEditors({
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
        sendMessageToEditors({
            object: thisLink.objectB,
            frame: thisLink.frameB,
            node: thisLink.nodeB,
            data: internalObjectDestination.data
        });

        // trigger the next round of the engine on the next object
        this.trigger(thisLink.objectB, thisLink.frameB, thisLink.nodeB, internalObjectDestination);
    }
};
const protocols = new Protocols(objects, engine, doesObjectExist, getNode);

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
            console.error('can not emit from link ID:' + link + 'and object: ' + object, e);
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
                        let socket = new ToolSocket.Io();
                        socketArray[thisOtherIp] = new ObjectSocket(socket, socketPort, thisOtherIp);
                    }
                }
            }
        }
    });

    socketIndicator();

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
function setSocketUpdaterInterval() {
    socketUpdaterInterval = setInterval(function () {
        socketUpdater();
    }, socketUpdateIntervalMs);
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
    blockLinkController.setup(objects, globalVariables);
    frameController.setup(objects, globalVariables, hardwareAPI, __dirname, objectsPath, nodeTypeModules, sceneGraph);
    linkController.setup(objects, knownObjects, socketArray, globalVariables, hardwareAPI, objectsPath, socketUpdater, engine);
    logicNodeController.setup(objects, globalVariables, objectsPath);
    nodeController.setup(objects, globalVariables, objectsPath, sceneGraph);
    objectController.setup(objects, globalVariables, hardwareAPI, objectsPath, sceneGraph, objectLookup, activeHeartbeats, knownObjects, setAnchors, objectBeatSender);
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
