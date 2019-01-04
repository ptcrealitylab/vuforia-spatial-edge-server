/**
 * @fileOverview
 * Modifies the global namespace and variables in a way necessary for the crafting module to work unchanged
 */

var globalStates = globalStates || {};

realityEditor.app = {};
realityEditor.app.setPause = function() {console.log('stubbed out setPause()')};
realityEditor.app.setResume = function() {console.log('stubbed out setResume()')};

realityEditor.cout = function() {
    if (globalStates.debug){
        console.log.apply(this, arguments);
    }
};

// realityEditor.gui.crafting.cout = function() {
//     if (globalStates.debug){
//         console.log.apply(this, arguments);
//     }
// };

realityEditor.gui.menus = {};
realityEditor.gui.menus.on = function(buttonName) {
    // console.log('stubbed out menus.on()')
    var blockTrashButton = document.getElementById('blockTrashButton');
    var blockMenuButton = document.getElementById('blockMenuButton');
    if (!blockTrashButton || !blockMenuButton) return;
    if (buttonName === 'bigTrash') {
        document.getElementById('blockTrashButton').classList.remove('closed');
        document.getElementById('blockMenuButton').classList.add('closed');
    } else {
        document.getElementById('blockTrashButton').classList.add('closed');
        document.getElementById('blockMenuButton').classList.remove('closed');
    }
};
realityEditor.gui.menus.off = function(buttonName) {
    console.log('stubbed out menus.off()');
    // if (buttonName === 'bigTrash') {
    //     document.getElementById('blockTrashButton').classList.add('closed');
    //     document.getElementById('blockMenuButton').classList.remove('closed');
    // }
};
realityEditor.gui.menus.buttonOn = function() {console.log('stubbed out menus.buttonOn()')};
realityEditor.gui.menus.buttonOff = function() {console.log('stubbed out menus.buttonOff()')};

/**********************************************************************************************************************
 ***************************************** datacrafting variables  ****************************************************
 **********************************************************************************************************************/

// var blockColorMap = {
//    bright:["#2DFFFE", "#29FD2F", "#FFFD38", "#FC157D"], // blue, green, yellow, red
//    faded:["#EAFFFF", "#EAFFEB", "#FFFFEB", "#FFE8F2"] // lighter: blue, green, yellow, red
//}

var menuBarWidth = 62;
var blockColorMap = ["#00FFFF", "#00FF00", "#FFFF00", "#FF007C"];
var columnHighlightColorMap = ["rgba(0,255,255,0.15)", "rgba(0,255,0,0.15)", "rgba(255,255,0,0.15)", "rgba(255,0,124,0.15)"];
//var activeBlockColor = "#E6E6E6"; // added blocks are grey
//var movingBlockColor = "#FFFFFF"; // blocks turn white when you start to drag them

var DEBUG_DATACRAFTING = false; // when TRUE -> shows crafting board just by tapping on first menu item (DEBUG mode)

var blockIconCache = {};

var CRAFTING_GRID_WIDTH = 506;
var CRAFTING_GRID_HEIGHT = 320;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// overrides this function to return correct IP address and keys for the screen object/frame/node
/**
 * Returns all identifiers necessary to make an API request for the provided logic object
 * @param logic - logic object
 * @param block - optional param, if included it includes the block key in the return value
 * @return {{ip: string, objectKey: string, frameKey: string, logicKey: string, blockKey: string|undefined}}
 */
realityEditor.gui.crafting.eventHelper.getServerObjectLogicKeys = function(logic, block) {

    var tempKeys = realityEditor.utilities.getKeysFromKey(logic.uuid);

    var keys =  {
        ip: SERVER_IP,
        objectKey: tempKeys.objectKey,
        frameKey: tempKeys.frameKey,
        logicKey: tempKeys.nodeKey
    };

    if (block) {
        for (var blockKey in logic.blocks){
            if(logic.blocks[blockKey] === block) {
                keys.blockKey = blockKey;
            }
        }
    }

    return keys;
};

// ----- Utilities for adding and removing events in a stable way ----- //

/**
 * Converts the string it is called on into a 32-bit integer hash code
 * (e.g. 'abcdef'.hashCode() = -1424385949)
 * The same string always returns the same hash code, which can be easily compared for equality.
 * Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 * @return {number}
 */
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

realityEditor.device = {};
realityEditor.device.utilities = {};
var boundListeners = {};

/**
 * Adds an event listener in a special way so that it can be properly removed later,
 * even if its function signature changed when it was added with bind, by storing a UUID reference to it in a dictionary.
 * https://stackoverflow.com/questions/11565471/removing-event-listener-which-was-added-with-bind
 *
 * @example this.addBoundListener(div, 'pointerdown', realityEditor.gui.crafting.eventHandlers.onPointerDown, realityEditor.gui.crafting.eventHandlers);
 *
 * @param {HTMLElement} element - the element to add the eventListener to
 * @param {string} eventType - the type of the event, e.g. 'pointerdown'
 * @param {Function} functionReference - the function to trigger
 * @param {object} bindTarget - the argument to go within functionReference.bind(___)
 */
realityEditor.device.utilities.addBoundListener = function(element, eventType, functionReference, bindTarget) {
    var boundFunctionReference = functionReference.bind(bindTarget);
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    if (boundListeners.hasOwnProperty(functionUUID)) {
        this.removeBoundListener(element, eventType, functionReference);
    }
    boundListeners[functionUUID] = boundFunctionReference;
    element.addEventListener(eventType, boundFunctionReference, false);
};

/**
 * Generates a unique string address for a bound event listener, so that it can be looked up again.
 * @param {HTMLElement} element
 * @param {string} eventType
 * @param {Function} functionReference
 * @return {string} - e.g. myDiv_pointerdown_1424385949
 */
realityEditor.device.utilities.getEventUUID = function(element, eventType, functionReference) {
    return element.id + '_' + eventType + '_' + functionReference.toString().hashCode();
};

// function getBoundListener(element, eventType, functionReference) {
//     var functionUUID = getEventUUID(element, eventType, functionReference);
//     return boundListeners[functionUUID];
// }

/**
 * Looks up the bound listener by its eventUUID, and properly removes it.
 * @param element
 * @param eventType
 * @param functionReference
 */
realityEditor.device.utilities.removeBoundListener = function(element, eventType, functionReference) {
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    var boundFunctionReference = boundListeners[functionUUID];
    if (boundFunctionReference) {
        element.removeEventListener(eventType, boundFunctionReference, false);
        delete boundListeners[functionUUID];
    }
};
// ------------------------------------------------------------------------ //


realityEditor.gui.ar.draw = realityEditor.gui.ar.draw || {};
realityEditor.gui.ar.draw.updateLogicNodeIcon = function() {console.log('stubbed out gui.ar.draw.updateLogicNodeIcon()')};

realityEditor.device.utilities.uuidTime = realityEditor.utilities.uuidTime;

realityEditor.gui.crafting.eventHelper.toggleDatacraftingExceptPort = function() {/*console.log('stubbed out toggleDatacraftingExceptPort to fix bug')*/};

globalStates.craftingMoveDelay = 400;

realityEditor.gui.ar = realityEditor.gui.ar || {};
realityEditor.gui.ar.lines = realityEditor.gui.ar.lines || {};
realityEditor.gui.ar.lines.drawSimpleLine = realityEditor.draw.drawSimpleLine; //(ctx, tempLine.start.x, tempLine.start.y, tempLine.end.x, tempLine.end.y, tempLine.color, 3);
realityEditor.gui.utilities = realityEditor.gui.utilities || {};
realityEditor.gui.utilities.checkLineCross = realityEditor.utilities.checkLineCross.bind(realityEditor.utilities);

var timeCorrection = {delta: 0, now: 0, then: 0};