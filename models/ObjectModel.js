const Frame = require('./Frame.js'); // needs reference to Frame constructor

/**
 * This is the default constructor for the Reality Object.
 * It contains information about how to render the UI and how to process the internal data.
 *
 * @constructor
 * @param {string} ip - ip address of server
 * @param {string} version - Version number of server, currently 3.1.0 or 3.2.0
 * @param {string} protocol - Protocol of object, one of R0, R1, or R2 (current)
 * @param {string} objectId - Stores its own UUID
 */
function ObjectModel(ip, version, protocol, objectId) {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = objectId;
    // The name for the object used for interfaces.
    this.name = '';
    this.matrix = [];
    this.isAnchor = false;
    // The IP address for the object is relevant to point the Reality Editor to the right server.
    // It will be used for the UDP broadcasts.
    this.ip = ip;
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
    this.memoryCameraMatrix = {};
    this.memoryProjectionMatrix = {};
    // Store the frames. These embed content positioned relative to the object
    this.frames = {};
    // keep a memory of the last commit state of the frames.
    this.framesHistory = {};
    // which visualization mode it should use right now ("ar" or "screen")
    this.visualization = 'ar';

    this.zone = '';
    // taken from target.xml. necessary to make the screens work correctly.
    this.targetSize = {
        width: 0.3, // default size should always be overridden, but exists in case xml doesn't contain size
        height: 0.3
    };
    this.isWorldObject = false;
    this.timestamp = null; // timestamp optionally stores when the object was first created
}

/**
 * Should be called before deleting the object in order to properly destroy it
 * Gives all this object's frames the chance to deconstruct when the object is deconstructed
 */
ObjectModel.prototype.deconstruct = function() {
    for (let frameKey in this.frames) {
        if (typeof this.frames[frameKey].deconstruct === 'function') {
            this.frames[frameKey].deconstruct();
        } else {
            console.warn('Frame exists without proper prototype: ' + frameKey);
        }
    }
};

/**
 * Sets the properties of this object based on a JSON blob, recursively constructing
 * its frames and its nodes and casting their JSON data to Frame and Node instances
 * @param {JSON} object
 */
ObjectModel.prototype.setFromJson = function(object) {
    Object.assign(this, object);
    this.setFramesFromJson(object.frames);
};

/**
 * Parses a json blob of a set of frames' data into properly constructed Frames
 * attached to this object. Should be used instead of object.frames = frames
 * @param {JSON} frames
 */
ObjectModel.prototype.setFramesFromJson = function(frames) {
    this.frames = {};
    for (var frameKey in frames) {
        let newFrame = new Frame(this.objectId, frameKey);
        Object.assign(newFrame, frames[frameKey]);
        newFrame.setNodesFromJson(frames[frameKey].nodes);
        this.frames[frameKey] = newFrame;
    }
};

module.exports = ObjectModel;
