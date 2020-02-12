/**
 * @desc This is the default constructor for the Reality Object.
 * It contains information about how to render the UI and how to process the internal data.
 **/
module.exports = function ObjectModel() {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = null;
    // The name for the object used for interfaces.
    this.name = "";
    this.matrix = [];
    // The IP address for the object is relevant to point the Reality Editor to the right server.
    // It will be used for the UDP broadcasts.
    this.ip = ips.interfaces[ips.activeInterface];
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
    this.visualization = "ar";

    this.zone = "";
    // taken from target.xml. necessary to make the screens work correctly.
    this.targetSize = {
        width: 0.3, // default size should always be overridden, but exists in case xml doesn't contain size
        height: 0.3
    };
    this.isWorldObject = false;
    this.timestamp = null; // timestamp optionally stores when the object was first created
};

