/**
 * Various communication protocols used by the reality editor
 */
module.exports = function Protocols() {
    this.R2 = {
        objectData :{},
        buffer : {},
        blockString : "",
        send: function (object, frame, node, logic, data) {
            return JSON.stringify({object: object, frame: frame, node: node, logic: logic, data: data})
        },
        // process the data received by a node
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.object) return null;
            if (!msgContent.frame) return null;
            if (!msgContent.node) return null;
            if (!msgContent.logic && msgContent.logic !== 0) msgContent.logic = false;
            if (!msgContent.data) return null;

            if (doesObjectExist(msgContent.object)) {

                var foundNode = getNode(msgContent.object, msgContent.frame, msgContent.node);
                if (foundNode) {

                    // if the node is a Logic Node, process the blocks/links inside of it
                    if (msgContent.logic === 0 || msgContent.logic === 1 || msgContent.logic === 2 || msgContent.logic === 3) {
                        this.blockString = "in" + msgContent.logic;
                        if (foundNode.blocks) {
                            if (this.blockString in foundNode.blocks) {
                                this.objectData = foundNode.blocks[this.blockString];

                                for (var key in msgContent.data) {
                                    this.objectData.data[0][key] = msgContent.data[key];
                                }

                                this.buffer = foundNode;

                                // this needs to be at the beginning;
                                if (!this.buffer.routeBuffer)
                                    this.buffer.routeBuffer = [0, 0, 0, 0];

                                this.buffer.routeBuffer[msgContent.logic] = msgContent.data.value;

                                engine.blockTrigger(msgContent.object, msgContent.frame, msgContent.node, this.blockString, 0, this.objectData);
                                // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
                            }
                        }

                    } else { // otherwise this is a regular node so just continue to send the data to any linked nodes
                        this.objectData = foundNode;

                        for (var key in msgContent.data) {
                            this.objectData.data[key] = msgContent.data[key];
                        }
                        engine.trigger(msgContent.object, msgContent.frame, msgContent.node, this.objectData);
                        // return {object: msgContent.object, frame: msgContent.frame, node: msgContent.node, data: objectData};
                    }
                }

                return {
                    object: msgContent.object,
                    frame: msgContent.frame,
                    node: msgContent.node,
                    logic: msgContent.logic,
                    data: this.objectData.data
                };

            }

            // return null if we can't even find the object it belongs to
            return null;
        }
    };
    this.R1 = {
        send: function (object, node, data) {
            return JSON.stringify({object: object, node: node, data: data})
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.object) return null;
            if (!msgContent.node) return null;
            if (!msgContent.data) return null;

            var foundNode = getNode(msgContent.object, msgContent.frame, msgContent.node);
            if (foundNode) {
                for (var key in foundNode.data) {
                    foundNode.data[key] = msgContent.data[key];
                }
                engine.trigger(msgContent.object, msgContent.object, msgContent.node, foundNode);
                return {object: msgContent.object, node: msgContent.node, data: foundNode};
            }

            return null;
        }
    };
    /**
     * @deprecated - the old protocol hasn't been tested in a long time, might not work
     */
    this.R0 = {
        send: function (object, node, data) {
            return JSON.stringify({obj: object, pos: node, value: data.value, mode: data.mode})
        },
        receive: function (message) {
            if (!message) return null;
            var msgContent = JSON.parse(message);
            if (!msgContent.obj) return null;
            if (!msgContent.pos) return null;
            if (!msgContent.value) msgContent.value = 0;
            if (!msgContent.mode) return null;

            if (msgContent.obj in objects) {
                if (msgContent.pos in objects[msgContent.obj].nodes) {

                    var objectData = objects[msgContent.obj].frames[msgContent.object].nodes[msgContent.pos];

                    objectData.data.value = msgContent.value;
                    objectData.data.mode = msgContent.mode;

                    engine.trigger(msgContent.object, msgContent.object, msgContent.node, objectData);

                    return {object: msgContent.obj, node: msgContent.pos, data: objectData};
                }

            }
            return null
        }
    };
};
