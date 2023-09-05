import animitter from 'animitter';  // a library for handling animation-loops
import {MainUI} from "./mainUI";
import {ARScene} from "./ARScene";
import {CheckpointUI} from "./checkpointUI";

/**
* MainUI contains all information, assets and logic for the UI on the screen
*/
const mainUI = new MainUI();
mainUI.on('reset', resetTracking);
mainUI.on('clearPath', clearPath);
mainUI.on('closePath', closePathCallback);
mainUI.on('closeAction', closeActionCallback);
mainUI.on('realtimePath', realtimePath);

/**
 * sets isRobotAnchorSet to false so that
 */
function resetTracking(){ 
    if (arScene !== undefined) arScene.isRobotAnchorSet = false; 
}

function realtimePath() {
    if (arScene !== undefined) arScene.triggerRealtimePath();
}

function clearPath() {

    closeActionCallback();

    // Clear paths and send request to server to remove nodes and delete all checkpoints from path
    arScene.paths.forEach(path => { path.clear(); });
    if (arScene.motionViz !== null) arScene.motionViz.clearMotionLine();

    // Call server to delete nodes
    spatialInterface.writePublicData("kineticNode4", "ClearPath", true);

    pushPathsDataToServer();
}

/**
* closeActionCallback() resets the checkpoint mode and closes all editing modes
*/
function closeActionCallback(){
    arScene.activateCheckpointMode(0);
    mainUI.hideCloseActionButton();
    checkpointUI.resetMode();
    mainUI.hideCheckpointPositionMenu();
}

function closePathCallback(){ arScene.currentPath.closePath(); }

document.body.appendChild( mainUI.domElement );

/**
* ARScene contains all information, assets and logic for the threejs scene
*/
const arScene = new ARScene();

arScene.on('robotAnchored', sendRobotPosition);                                                             // Subscribe to send robot position to server
arScene.on('surfaceTracked', function surfaceTracked(){ mainUI.surfaceTracked(); });                        // Subscribe to give feedback on surface tracked in mainUI
arScene.clearRenderInDevices();

arScene.on('newPathPoint', pushPathsDataToServer);

// Send robot position and direction in AR to server
function sendRobotPosition(){
    let arData = {
        "robotInitPosition" : arScene.lastPosition,
        "robotInitDirection" : arScene.lastDirection
    };
    spatialInterface.writePublicData("kineticNode3", "ARstatus", arData);
    mainUI.robotTracked();
}
document.body.appendChild( arScene.renderer.domElement );

/**
* CheckpointUI contains all information, assets and logic for the dynamic UI for each checkpoint
*/
const checkpointUI = new CheckpointUI();
checkpointUI.on('rotate', function(){
    arScene.activateCheckpointMode(1);
    mainUI.showCloseActionButton();
}, false);
checkpointUI.on('speed', function(){
    arScene.activateCheckpointMode(2);
    mainUI.showCloseActionButton();
}, false);
checkpointUI.on('height', function(){
    arScene.activateCheckpointMode(3);
    mainUI.showCloseActionButton();
}, false);

checkpointUI.on('position', function(){
    arScene.activateCheckpointMode(4);
    mainUI.showCheckpointPositionMenu();
    arScene.showCheckpointArrows();
    mainUI.showCloseActionButton();
}, false);

mainUI.on('positionEdit', function (data) {
    arScene.adjustPosition(data);
    arScene.currentPath.updatePathData();
    pushPathsDataToServer();
});

document.body.appendChild( checkpointUI.domElement );

/**
* spatialInterface connects to the server API
*/
const spatialInterface = new SpatialInterface();

spatialInterface.onRealityInterfaceLoaded(function() {
    spatialInterface.setFullScreenOn();
    spatialInterface.setStickyFullScreenOn();
    spatialInterface.subscribeToMatrix();
    spatialInterface.addMatrixListener(renderRobotCallback);
    spatialInterface.addGroundPlaneMatrixListener(groundPlaneCallback);
    spatialInterface.writePublicData("kineticNode4", "ClearPath", true);
    spatialInterface.setVisibilityDistance(100);

    spatialInterface.getScreenDimensions(function(width, height) {      // Resize to screen dimensions
        document.body.width = width + 'px';
        document.body.height = height + 'px';
        arScene.rendererWidth = width;
        arScene.rendererHeight = height;
        arScene.renderer.setSize( arScene.rendererWidth, arScene.rendererHeight );
        spatialInterface.changeFrameSize(width, height);
    });

    spatialInterface.initNode('kineticNode2', 'storeData', 0, 0);
    
    spatialInterface.setMoveDelay(-1);  // Keep pointer move active after some time of pointer down

    spatialInterface.addReadPublicDataListener("kineticNode1", "CheckpointStopped", function (data){
        console.log('Checkpoint STOPPED: ', data);
        if (arScene !== undefined) arScene.checkpointReached(data);
    });

    spatialInterface.addReadPublicDataListener("kineticNode1", "CheckpointTriggered", function (data){
        console.log('Checkpoint TRIGGERED: ', data);
        if (arScene !== undefined) arScene.checkpointTriggered(data);
    });
    
    spatialInterface.addReadPublicDataListener("kineticNode1", "ARposition", function (data){
        if (arScene !== undefined) arScene.moveDummyRobot(data);    // Position robot/occlusion dummy
    });
    
    /**
     * This feauture is currently disabled. 
     * This will update the visualization of the paths and checkpoints in external devices.
     */
    /*spatialInterface.addReadPublicDataListener("kineticNode2", "pathData", function (data) {
        if (arScene !== undefined) arScene.updateDevices(data);
    });*/
});

function groundPlaneCallback(groundPlaneMatrix, projectionMatrix) {
    if (arScene !== undefined) arScene.setGroundPlaneMatrix(groundPlaneMatrix, projectionMatrix);
}

function renderRobotCallback(modelviewmatrix, projectionMatrix) {
    if (arScene !== undefined){
        arScene.renderRobot(modelviewmatrix, projectionMatrix);
    }
}

function pointerDown(eventData) {
    
    if (!mainUI.buttonTouch){
        
        if (checkpointUI.checkpointMode === 4){ // If the adjustment position menu is open, close it
            mainUI.hideCheckpointPositionMenu();
            arScene.hideCheckpointArrows();
            arScene.currentPath.selectedCheckpoint.deselectCheckpoint();
            arScene.currentPath.selectedCheckpoint = null;
        }

        let newRay = arScene.getRayFromMouse(eventData);
        let newPositionOnGroundPlane = arScene.computeGroundPlaneIntersection(newRay);            // Get Intersection with Ground Plane

        if (arScene.currentPath !== null && arScene.currentPath.isActive()){
            
            arScene.currentPath.onGroundPlaneIntersection(newRay, newPositionOnGroundPlane, checkpointUI.checkpointMode);  // Deal with tap on Ground Plane in current path

        } else {

            console.log('NEW PATH');
            arScene.createNewPath();                                      // Create new path with first checkpoint

            console.log('push paths data to server');
            pushPathsDataToServer();

            console.log('New checkpoint');
            arScene.currentPath.newCheckpoint(newPositionOnGroundPlane);    // Create first checkpoint

            arScene.currentPath.updateHeightLinesAndFloorMarks();
            
            console.log('checkpoint menu listener');
            arScene.currentPath.on('checkpoint_menu', checkpointUI.activateCheckpointMenu);       // Subscribe to activate checkpoint menu

            arScene.currentPath.on('reset_mode', function () {
                checkpointUI.resetMode();
                arScene.closeEdit();
                mainUI.hideCloseActionButton();
            });
        }
        pushPathsDataToServer();
    }
}

function pointerMove(eventData){

    if (!mainUI.buttonTouch){

        if (!checkpointUI.isCheckpointMenuVisible()){

            let newRay = arScene.getRayFromMouse(eventData);
            let newPosition = arScene.computeGroundPlaneIntersection(newRay);

            if (checkpointUI.checkpointMode === 0 && arScene.currentPath !== null){

                arScene.moveSelectedCheckpoint(newPosition);
                arScene.currentPath.closeReset();

            } else {
                arScene.editCheckpoint(eventData, newPosition, checkpointUI.checkpointMode);
            }
        }
    }

    if (arScene.currentPath !== null) arScene.currentPath.updatePathData();
}

function pointerUp( eventData ) {

    if (!mainUI.buttonTouch){
        checkpointUI.deactivateCheckpointMenu();
        arScene.closeEdit();
        if (arScene.currentPath !== null) arScene.currentPath.closeReset();

        pushPathsDataToServer();
    }
}

function pushPathsDataToServer(){
    let pathsData = [];
    arScene.paths.forEach(path => { pathsData.push(path.pathData); });

    console.log('pushPathsDataToServer: ', pathsData);
    //console.log('push data to server: ', pathsData);
    spatialInterface.writePublicData("kineticNode2", "pathData", pathsData);
}

const loop = animitter(update);     // creates a loop 60fps using window.requestAnimationFrame

/**
 * @desc update loop called at 60fps
 * @param int $deltaTime - in milliseconds
 * @param int $elapsedTime - in milliseconds
 * @param int $frameCount
 */
function update(deltaTime, elapsedTime, frameCount) {

    //annie.update(deltaTime);

    arScene.paths.forEach(path => {

        path.checkpointsLookAt(arScene.camera.position);                  // Make all checkpoints look at camera
        path.update(deltaTime, elapsedTime, frameCount);
    });

    if (checkpointUI.isCheckpointMenuVisible()){                                // Checkpoint Menu selection
        checkpointUI.showCheckpointMenu(arScene.currentPath, arScene.camera, arScene.renderer);
    } else {
        checkpointUI.resetCheckpointMenu();
    }
    
    
    
}

document.addEventListener( 'pointerdown', pointerDown, false );
document.addEventListener( 'pointermove', pointerMove, false );
document.addEventListener( 'pointerup', pointerUp, false );

loop.start();
