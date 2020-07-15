let nodeTypes = {};
let hardwareInterfaces = {};
let blockTypes = {};

const setNodes = function(nodeTypeModules) {
    nodeTypes = nodeTypeModules;
};
exports.setNodes = setNodes;

const setHardwareInterfaces = function(hardwareInterfaceModules) {
    hardwareInterfaces = hardwareInterfaceModules;
};
exports.setHardwareInterfaces = setHardwareInterfaces;

const setBlocks = function(blockTypeModules) {
    blockTypes = blockTypeModules;
};
exports.setBlocks = setBlocks;

const getNodes = function() {
    return nodeTypes;
};
exports.getNodes = getNodes;

const getHardwareInterfaces = function() {
    return hardwareInterfaces;
};
exports.getHardwareInterfaces = getHardwareInterfaces;

const getBlocks = function() {
    return blockTypes;
};
exports.getBlocks = getBlocks;
