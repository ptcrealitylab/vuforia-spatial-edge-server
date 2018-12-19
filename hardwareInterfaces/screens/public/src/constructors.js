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