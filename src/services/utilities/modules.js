class Modules {
    constructor() {
        this.nodeTypes = {};
        this.hardwareInterfaces = {};
        this.blockTypes = {};
    }

    setNodes(nodeTypeModules) {
        this.nodeTypes = nodeTypeModules;
    }

    setHardwareInterfaces(hardwareInterfaceModules) {
        this.hardwareInterfaces = hardwareInterfaceModules;
    }

    setBlocks(blockTypeModules) {
        this.blockTypes = blockTypeModules;
    }

    getNodes() {
        return this.nodeTypes;
    }

    getHardwareInterfaces() {
        return this.hardwareInterfaces;
    }

    getBlocks() {
        return this.blockTypes;
    }
}

module.exports = Modules;
