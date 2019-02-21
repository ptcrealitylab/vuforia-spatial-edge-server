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
        scale : 0.5,
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
        scale : 0.5
    };
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
    // local or global. If local, node-name is exposed to hardware interface
    this.location = "global";
    // source
    this.src = "editor";
    // if true, cannot move the frame but copies are made from it when you pull into unconstrained
    this.staticCopy = false;
}

function Node() {
    // the name of each link. It is used in the Reality Editor to show the IO name.
    this.name = "";
    // the ID of the containing object.
    this.objectId = null;
    // the ID of the containing frame.
    this.frameId = null;
    // the actual data of the node
    this.data = new Data(); // todo maybe value
    // Reality Editor: This is used to position the UI element within its x axis in 3D Space. Relative to Marker origin.
    this.x = 0;
    // Reality Editor: This is used to position the UI element within its y axis in 3D Space. Relative to Marker origin.
    this.y = 0;
    // Reality Editor: This is used to scale the UI element in 3D Space. Default scale is 1.
    this.scale = 0.5;
    // Unconstrained positioning in 3D space
    this.matrix = [];
    // defines the nodeInterface that is used to process data of this type. It also defines the visual representation
    // in the Reality Editor. Such data points interfaces can be found in the nodeInterface folder.
    this.type = "node";
    // todo implement src
    this.src = "";
    // defines the origin Hardware interface of the IO Point. For example if this is arduinoYun the Server associates
    // indicates how much calls per second is happening on this node
    this.stress = 0;

    this.lockPassword = null;
    this.lockType = null;
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
    this.logicA = false;
    // Defines the type of the link origin. Currently this function is not in use.
    this.namesA = ["",""];
    // The destination object to where the origin object is sending data to.
    // At this point the destination object accepts all incoming data and routs the data according to the link data sent.
    this.objectB = null;
    // The destination IOPoint to where the link is sending data from the origin object.
    // objectB and nodeB will be send with each data package.
    this.nodeB = null;
    // if destination location is a Logic Node then set to logic block input location (which is a number between 0 and 3) otherwise null
    this.logicB = false;
    // Defines the type of the link destination. Currently this function is not in use.
    this.namesB = ["",""];
    // check that there is no endless loop in the system
    this.loop = false;
    // Will be used to test if a link is still able to find its destination.
    // It needs to be discussed what to do if a link is not able to find the destination and for what time span.
    this.health = 0; // todo use this to test if link is still valid. If not able to send for some while, kill link.

    this.lockPassword = null;
    this.lockType = null;
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
    this.scale = 0.5;
    // Unconstrained positioning in 3D space
    this.matrix = [];

    // Used internally from the reality editor to indicate if an object should be rendered or not.
    this.visible = false;
    // Used internally from the reality editor to indicate the editing status.
    this.visibleEditing = false;

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
    /*  this.block = [
     [[null, 0], [null, 0], [null, 0], [null, 0]],
     [[null, 0], [null, 0], [null, 0], [null, 0]],
     [[null, 0], [null, 0], [null, 0], [null, 0]],
     [[null, 0], [null, 0], [null, 0], [null, 0]]
     ];*/

    this.type = "logic";

    this.links = {};
    this.blocks = {};

    this.guiState = new LogicGUIState();

    this.lockPassword = null;
    this.lockType = null;
}

/**
 * @desc Constructor used to define temporary state for drawing the GUI of a Logic node's crafting board
 **/

function LogicGUIState() {
    // lookup table for all the current dom elements for the UI of the blocks
    this.blockDomElements = {};
    // block link currently being drawn
    this.tempLink = null;
    // keeps track of which block/item are currently being interacted with
    this.tappedContents = null;
    // keeps track of whether the background has been hidden to show nodes
    this.isCraftingBackgroundShown = true;
    // when moving a block, traces outlines of incoming links and re-adds them
    this.tempIncomingLinks = [];
    // when moving a block, traces outlines of outgoing links and re-adds them
    this.tempOutgoingLinks = [];
    // endpoints of line used to cut links
    this.cutLine = {
        start: null,
        end: null
    };
    // endpoints of visual-feedback line showing you the new link you are drawing
    this.tempLine = {
        start: null,
        end: null,
        color: null
    };
    // which block you tapped on in the block menu
    this.menuSelectedBlock = null;
    // block to add to crafting board when menu closes
    this.menuBlockToAdd = null;
    // touch interaction state in the menu
    this.menuIsPointerDown = false;
    // which menu tab is open
    this.menuSelectedTab = 0;
    // dom elements for the menu tab buttons
    this.menuTabDivs = [];
    // menuBlockData[i] stores an array of json data describing each block in the ith menu tab
    this.menuBlockData = [ [], [], [], [], [] ]; //defaultBlockData(); //TODO: load cached blocks instead of empty
    // dom elements for blocks in menu
    this.menuBlockDivs = [];
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
    // keeps track of the path from the start block to end block and how to draw it
    this.route = null;
    this.ballAnimationCount = 0;
    this.globalId = null;
}

/**
 * @desc Constructor used to define every block within the logicNode.
 * The block does not need to keep its own ID since it is created with the link ID as Object name.
 **/


function Block() {
    // name of the block
    this.type = "";

    this.x = null;
    this.y = null;
    // amount of elements the IO point is created of. Single IO nodes have the size 1.
    this.blockSize = 1;
    // the global / world wide id of the actual reference block design.
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
    this.name = "";
    // indicates how much calls per second is happening on this block
    this.stress = 0;

    this.isTempBlock = false;
    this.isPortBlock = false;
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
}

/**
 * @desc Definition for Values that are sent around.
 **/

function Data() {
    // storing the numerical content send between nodes. Range is between 0 and 1.
    this.value = 0;
    // Defines the type of data send. At this point we have 3 active data modes and one future possibility.
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

