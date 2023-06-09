// test for global objects variable
let objects = {};
exports.objects = objects;

// available Modules
let nodeTypes = {};
let hardwareInterfaces = {};
let blockTypes = {};

let Objects = {
    
}



let modules = {

    setNodes: function setNodes(nodeTypeModules) {
        nodeTypes = nodeTypeModules;
    },

    setHardwareInterfaces: function setHardwareInterfaces(hardwareInterfaceModules) {
        hardwareInterfaces = hardwareInterfaceModules;
    },

    setBlocks: function setBlocks(blockTypeModules) {
        blockTypes = blockTypeModules;
    },

    getNodes: function getNodes() {
        return nodeTypes;
    },

    getHardwareInterfaces: function getHardwareInterfaces() {
        return hardwareInterfaces;
    },

    getBlocks: function getBlocks() {
        return blockTypes;
    }
};


exports.modules = modules;
