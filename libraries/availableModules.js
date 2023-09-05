let nodeTypes = {};
let hardwareInterfaces = {};
let blockTypes = {};

exports.setNodes = function setNodes(nodeTypeModules) {
    nodeTypes = nodeTypeModules;
};

exports.setHardwareInterfaces = function setHardwareInterfaces(hardwareInterfaceModules) {
    hardwareInterfaces = hardwareInterfaceModules;
};

exports.setBlocks = function setBlocks(blockTypeModules) {
    blockTypes = blockTypeModules;
};

exports.getNodes = function getNodes() {
    return nodeTypes;
};

exports.getHardwareInterfaces = function getHardwareInterfaces() {
    return hardwareInterfaces;
};

exports.getBlocks = function getBlocks() {
    return blockTypes;
};
