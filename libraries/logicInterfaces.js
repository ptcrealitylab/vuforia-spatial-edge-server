

// Todo this are just some thoughts about the API

exports.writePublicData = function () { };
exports.writePrivateData = function () { };

exports.readPublicData = function () { };
exports.readPrivateData = function () { };

exports.shape = function () { };

exports.activeInputs = function () { };
exports.activeInputs = function () { };



this.name = "";

this.x = null;
this.y = null;
// amount of elements the IO point is created of. Single IO nodes have the size 1.
this.blockSize = 1;
// the global / world wide id of the actual reference block design.
this.globalId = null;
// the checksum should be identical with the checksum for the persistent package files of the reference block design.
this.checksum = null; // checksum of the files for the program
// data for logic blocks. depending on the blockSize which one is used.
this.item = [new Data(), new Data(), new Data(), new Data()];
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
this.text = "";
// indicates how much calls per second is happening on this block
this.stress = 0;