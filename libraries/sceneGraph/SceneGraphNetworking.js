const SceneGraphEventOpEnum = Object.freeze({
    ADD_OBJECT: "Add Object",
    ADD_FRAME: "Add Frame",
    ADD_NODE: "Add Node",
    REMOVE_ELEMENT: "Remove Element",
    UPDATE_POSITION: "Update Position",
    UPDATE_OBJECT_WORLD_ID: "Update Object World ID",
    DEACTIVATE_ELEMENT: "Deactivate Element",
    ACTIVATE_ELEMENT: "Activate Element",
    FULL_UPDATE: "Full Update",
});

const SceneGraphUpdateRuleTypeEnum = Object.freeze({
    SENSITIVITY: "Sensitivity",
    SPEED: "Speed"
})

class SceneGraphUpdateRule {
    constructor(type, ruleRequirements) {
        this.type = type;
        this.ruleRequirements = ruleRequirements;
    }
    
    isSatisfied(data) {
        switch(this.type) {
            case SceneGraphUpdateRuleTypeEnum.SENSITIVITY: {
                return data.distance > this.ruleRequirements.distance;
            }
            case SceneGraphUpdateRuleTypeEnum.SPEED: {
                return data.speed > this.ruleRequirements.speed;
            }
            default: {
                console.error(`SceneGraphUpdateRule: isSatisfied not implemented for rule of type '${this.type}'.`);
                return;
            }
        }
    }
    
    static Sensitivity(distance) {
        const ruleRequirements = {
            distance // Millimeters
        }
        return new SceneGraphUpdateRule(SceneGraphUpdateRuleTypeEnum.SENSITIVITY, ruleRequirements);
    }
    
    static Speed(speed) {
        const ruleRequirements = {
            speed // Millimeters / Second
        }
        return new SceneGraphUpdateRule(SceneGraphUpdateRuleTypeEnum.SPEED, ruleRequirements);
    }
}

class SceneGraphEvent {
    constructor(op, data) {
        this.op = op;
        this.data = data;
    }
    
    static AddObject(objectId, initialLocalMatrix, needsRotateX) {
        const data = {
            objectId,
            initialLocalMatrix,
            needsRotateX
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.ADD_OBJECT, data);
    }
    static AddFrame(objectId, frameId, linkedFrame, initialLocalMatrix) {
        const data = {
            objectId,
            frameId,
            linkedFrame,
            initialLocalMatrix
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.ADD_FRAME, data);
    }
    static AddNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix) {
        const data = {
            objectId,
            frameId,
            nodeId,
            linkedNode,
            initialLocalMatrix
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.ADD_NODE, data);
    }
    
    static RemoveElement(id) {
        const data = {
            id
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.REMOVE_ELEMENT, data);
    }
    
    static UpdatePosition(id, localMatrix, x, y, scale) {
        const data = {
            id,
            localMatrix,
            x,
            y,
            scale
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.UPDATE_POSITION, data);
    }
    
    static UpdateObjectWorldId(objectId, worldId) {
        const data = {
            objectId,
            worldId
        }
        return new SceneGraphEvent(SceneGraphEventOpEnum.UPDATE_OBJECT_WORLD_ID, data);
    }
    
    static DeactivateElement(id) {
        const data = {
            id
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.DEACTIVATE_ELEMENT, data);
    }
    
    static ActivateElement(id) {
        const data = {
            id
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.ACTIVATE_ELEMENT, data);
    }
    
    static FullUpdate(serializedGraph) {
        const data = {
            serializedGraph
        };
        return new SceneGraphEvent(SceneGraphEventOpEnum.FULL_UPDATE, data);
    }
}

class SceneGraphEventMessage {
    constructor(events, ip) {
        this.timestamp = Date.now();
        this.ip = ip;
        this.type = 'SceneGraphEventMessage';
        this.events = events;
    }
}

class SceneGraphEventQueue {
    constructor() {
        this.events = [];
    }
    
    addEvent(sceneGraphEvent) {
        this.events.push(sceneGraphEvent);
    }
    
    popEvents() {
        const poppedEvents = [];
        while (this.events.length > 0) {
            poppedEvents.push(this.events.shift());
        }
        return poppedEvents;
    }
}

class SceneGraphNetworkManager {
    constructor(actionSender, getIP) {
        this.actionSender = actionSender;
        this.getIP = getIP;
        this.eventQueue = new SceneGraphEventQueue();
    }
    
    addEvent(sceneGraphEvent) {
        this.eventQueue.addEvent(sceneGraphEvent);
    }
    
    sendEventUpdates() {
        const events = this.eventQueue.popEvents();
        if (events.length === 0) {
            console.log('SceneGraphNetworking: No event updates.');
            return;
        }
        const message = new SceneGraphEventMessage(events, this.getIP());
        console.log(`SceneGraphNetworking: Sending ${message.events.length} event updates.`);
        this.actionSender(message);
    }
    
    sendFullUpdate(serializedGraph) {
        const fullUpdateEvent = SceneGraphEvent.FullUpdate(serializedGraph);
        const message = new SceneGraphEventMessage([fullUpdateEvent], this.getIP());
        console.log('SceneGraphNetworking: Sending full update.');
        this.actionSender(message);
    }
}

module.exports = {
    SceneGraphEvent,
    SceneGraphEventOpEnum,
    SceneGraphUpdateRule,
    SceneGraphUpdateRuleTypeEnum,
    SceneGraphNetworkManager
}