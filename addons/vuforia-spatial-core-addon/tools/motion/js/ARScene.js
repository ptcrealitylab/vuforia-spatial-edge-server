import * as THREE from 'three';
import FBXLoader from "three-fbx-loader";
import {AxisDummy} from "./axisdummy";
import {RobotDummy} from "./robotdummy";
import {setMatrixFromArray} from "./utils";
import EventEmitter from 'eventemitter3';
import {Path} from "./path";
import {MotionVisualization} from "./motionvisualization";

window.THREE = THREE;

/**
 * @desc this class will hold functions for the THREEjs view
 * examples include createNewPath(), moveSelectedCheckpoint(), activateCheckpointMode(), showCheckpointArrows()
 * @author Anna Fuste
 * @required eventemitter3, three, three-fbx-loader, axisdummy.js, robotdummy.js, utils.js, path.js, motionvisualization.js
 */
export class ARScene extends EventEmitter{
    constructor(){

        super();

        this.scene = new THREE.Scene();

        this.rendererWidth = screen.height;
        this.rendererHeight = screen.width;
        let aspectRatio = this.rendererWidth / this.rendererHeight;

        this.camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, Number.MAX_VALUE );
        this.camera.matrixAutoUpdate = false;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize( this.rendererWidth, this.rendererHeight );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.previousMouseY = 0;

        // create a parent 3D object to contain all the three js objects
        // we can apply the marker transform to this object and all of its
        // children objects will be affected
        this.groundPlaneContainerObj = new THREE.Object3D();
        this.groundPlaneContainerObj.matrixAutoUpdate = false;
        this.scene.add(this.groundPlaneContainerObj);

        this.robotDummy = new AxisDummy(0xffffff);                                                                      // Object overlaid on object target when tracked
        this.robotDummy.matrixAutoUpdate = false;
        this.scene.add( this.robotDummy );

        this.dummy_anchor = null;                                                                                       // Robot Anchor to Ground Plane

        this.dummy_groundPlaneOrigin = this.robotDummy.clone();                                                         // Ground Plane Origin
        this.scene.remove(this.dummy_groundPlaneOrigin);
        this.groundPlaneContainerObj.add(this.dummy_groundPlaneOrigin);
        this.dummy_groundPlaneOrigin.position.set(0,0,0);

        /*this.dummy_occlusion = new RobotDummy();                                                                        // Realtime robot object from physical robot
        this.dummy_occlusion.matrixAutoUpdate = false;
        this.groundPlaneContainerObj.add(this.dummy_occlusion);
        this.dummy_occlusion.position.set(0,0,0);
        this.dummy_occlusion.updateMatrix();*/

        /*
        // Phone pointer on surface
        this.dummy_phonePointer = new SurfaceMarker();
        this.groundPlaneContainerObj.add(this.dummy_phonePointer);
        this.dummy_phonePointer.position.set(0,0,0);
        */

        this.scene.add( new THREE.AmbientLight( 0x333333 ) );

        this.motionViz = new MotionVisualization(this.groundPlaneContainerObj);

        this.counter = 0;

        this.isProjectionMatrixSet = false;
        this.isGroundPlaneTracked = false;
        this.isRobotAnchorSet = false;

        this.lastPosition = new THREE.Vector3(0,0,0);                                                          // Last position to compute path
        this.lastDirection = new THREE.Vector3(1,1,1);                                                         // Last direction to compute path

        this.paths = [];                                                                                                // List with all path objects
        this.pathsDevices = [];                                                                                         // List with all path objects in the server
        this.currentPath = null;

        // Load FBX model for checkpoints base
        const fbxloader = new FBXLoader();
        this.checkpointbaseFloating = null;
        this.checkpointbaseGrounded = null;

        fbxloader.load( 'assets/models/KineticAR_Locator_01.fbx',  ( object ) => {                          // Only load FBX once
            this.checkpointbaseFloating = object.getObjectByName( "LOCATOR___FLOATINGModel" );
            this.checkpointbaseGrounded = object.getObjectByName( "LOCATOR___GROUNDEDModel" );
            console.log('FBX LOADED');
        });

        this.firstEdit = true;
        
        this.realtimePath = false;
        this.realtimePathCounter = 0;
        this.realtimePositions = [];

        this.activateCheckpointMode = this.activateCheckpointMode.bind(this);
        this.editCheckpoint = this.editCheckpoint.bind(this);
        this.anchorRobotToGroundPlane = this.anchorRobotToGroundPlane.bind(this);
        this.updateDevices = this.updateDevices.bind(this);
        this.clearRenderInDevices = this.clearRenderInDevices.bind(this);
    }

    /*
    * Create a new path with first checkpoint and send path data to server
    */
    createNewPath(){

        this.currentPath = new Path(this.groundPlaneContainerObj, this.paths.length, this.checkpointbaseFloating, this.checkpointbaseGrounded); // We create the first path

        this.paths.push(this.currentPath);

    }

    moveSelectedCheckpoint(newPosition){

        let positionGP = new THREE.Vector3();
        positionGP.copy(newPosition);
        this.currentPath.parentContainer.worldToLocal(positionGP);

        //this.currentPath.selectedCheckpoint.position.copy(positionGP);
        this.currentPath.selectedCheckpoint.editPosition(positionGP);

        if (this.currentPath.checkpoints.length > 1){
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();

        }
        this.currentPath.updateHeightLinesAndFloorMarks();

    }

    activateCheckpointMode(mode){
        if (this.currentPath !== null) this.currentPath.activateSelectedCheckpointMode(mode);
    }

    showCheckpointArrows(){
        this.currentPath.selectedCheckpoint.showPositionArrows();
    }
    hideCheckpointArrows(){
        this.currentPath.selectedCheckpoint.hidePositionArrows();
    }

    adjustPosition(mode){
        switch (mode) {
            case 0:
                // Position Right
                this.currentPath.selectedCheckpoint.position.x += 10;
                break;
            case 1:
                // Position Left
                this.currentPath.selectedCheckpoint.position.x -= 10;
                break;
            case 2:
                // Position Up
                this.currentPath.selectedCheckpoint.position.z += 10;
                break;
            case 3:
                // Position Down
                this.currentPath.selectedCheckpoint.position.z -= 10;
                break;
            default:
                break;
        }
        if (this.currentPath.checkpoints.length > 1) {
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();
            this.currentPath.updateHeightLinesAndFloorMarks();
        }
    }

    editCheckpoint(eventData, newPosition, mode){

        if (this.currentPath !== null &&
            this.currentPath.selectedCheckpoint !== null &&
            this.currentPath.selectedCheckpoint.isEditionActive()){

            this.currentPath.closeReset();  // Reset the counter in order to not show the checkpointUI when editing

            switch (mode) {
                case 1:
                    this.currentPath.selectedCheckpoint.editRotation(this.getDeltaMouse(eventData));
                    break;
                case 2:
                    this.currentPath.selectedCheckpoint.editSpeed(this.getDeltaMouse(eventData));

                    if (this.currentPath.checkpoints.length > 1){
                        this.currentPath.updateSpline();
                        this.currentPath.updateFloorSpline();
                    }
                    break;
                case 3:

                    let delta = this.getDeltaMouse(eventData);
                    let newHeight = this.currentPath.selectedCheckpoint.height + delta * 1000;  // In mm

                    if (newHeight >= 0){    // prevent from going under the surface

                        this.currentPath.selectedCheckpoint.editHeight(newHeight);

                        if (this.currentPath.checkpoints.length > 1){
                            this.currentPath.updateSpline();
                            this.currentPath.updateFloorSpline();
                        }

                        this.currentPath.updateHeightLinesAndFloorMarks();
                    }

                    break;
                default:
                    break;
            }
        }
    }

    closeEdit(){
        this.firstEdit = true;
    }

    setGroundPlaneMatrix(groundPlaneMatrix, projectionMatrix){
        // only set the projection matrix for the camera 1 time, since it stays the same
        if (!this.isProjectionMatrixSet && projectionMatrix.length > 0) {
            setMatrixFromArray(this.camera.projectionMatrix, projectionMatrix);
            this.isProjectionMatrixSet = true;
        }

        if (this.isProjectionMatrixSet) {                                                // don't turn into else statement, both can happen

            setMatrixFromArray(this.groundPlaneContainerObj.matrix, groundPlaneMatrix);  // update model view matrix
            this.groundPlaneContainerObj.visible = true;

            this.update();

            if (!this.isGroundPlaneTracked) this.emit('surfaceTracked');
            this.isGroundPlaneTracked = true;
        }
    }

    renderRobot(modelviewmatrix, projectionMatrix){

        // Once the object is tracked and the frame is set to full frame, this callback keeps on getting called even if we don't see the object target.
        // This is needed to prevent from assigning a null matrix to the robot dummy
        // If this is not checked, we will get a constant warning when loosing the object target
        if (modelviewmatrix[0] !== null){

            // Update model view matrix
            setMatrixFromArray(this.robotDummy.matrix, modelviewmatrix);
            this.robotDummy.visible = true;

            this.counter++;
            if (this.counter > 100 && !this.isRobotAnchorSet && this.isGroundPlaneTracked){

                this.anchorRobotToGroundPlane();

                this.emit('robotAnchored');

                this.isRobotAnchorSet = true;
            }
        } else {
            this.robotDummy.visible = false;
        }
    }

    anchorRobotToGroundPlane(){

        if (this.dummy_anchor !== null) this.groundPlaneContainerObj.remove(this.dummy_anchor);                         // Remove previous anchor from ground plane
        if (this.motionViz !== null) this.motionViz.clearMotionLine();                                                  // Reset motion visualization

        this.dummy_anchor = this.robotDummy.clone();

        THREE.SceneUtils.attach( this.dummy_anchor, this.scene, this.groundPlaneContainerObj );                         // This will remove robot dummy from scene and anchor to ground plane

        /**** Adjust position to center of robot ****/

        var translation = new THREE.Matrix4().makeTranslation(-250, -170,-300);                                // Distance from the object target origin to the center of the robot
        var  robotWorld = new THREE.Matrix4();
        robotWorld.copy(this.dummy_anchor.matrixWorld);
        robotWorld.premultiply(translation);
        var newRobotPosition = new THREE.Vector3();
        var newRobotRotation = new THREE.Quaternion();
        var newRobotScale = new THREE.Vector3();
        robotWorld.decompose(newRobotPosition,newRobotRotation,newRobotScale);
        robotWorld.getInverse(this.groundPlaneContainerObj.matrix);
        newRobotPosition.applyMatrix4(robotWorld);

        this.dummy_anchor.position.copy(newRobotPosition);
        this.dummy_anchor.matrixAutoUpdate = true;
        this.dummy_anchor.updateMatrix();

        this.lastPosition.copy(this.dummy_anchor.position);

        /* The robot was scanned as an object target with an offset of 90 degrees
        * so the forward vector is actually the up vector */
        this.lastDirection.copy(this.dummy_anchor.up);
        this.lastDirection = this.lastDirection.applyQuaternion( this.dummy_anchor.quaternion );                        // This gets direction in ground plane coordinates

    }

    /**
    ** Method to update realtime Robot dummy in frame
    ** data that comes from server:
    **      data.x, data.y          - realtime MIR AR position
    **      data.z                  - realtime MIR AR orientation
    */
    moveDummyRobot(data){
        /*if (this.dummy_anchor != null){
            let newPosition = new THREE.Vector3(data.x * 1000, this.dummy_anchor.position.y , data.y * 1000);
            this.dummy_occlusion.position.set(newPosition.x, newPosition.y , newPosition.z);
            this.dummy_occlusion.rotation.set(this.dummy_occlusion.rotation.x, data.z, this.dummy_occlusion.rotation.z);
            this.dummy_occlusion.updateMatrix();
            this.motionViz.newMotionPoint(newPosition);
        }*/
    }

    clearRenderInDevices(){
        //console.log("clear render in devices");
        if (this.pathsDevices !== null){
            this.pathsDevices.forEach(path => {
                path.checkpoints.forEach(checkpoint => { this.groundPlaneContainerObj.remove(checkpoint); });
                this.groundPlaneContainerObj.remove(path.tubeLine);
            });
        }
    }

    updateDevices(data){
        
        console.log('Update devices: ', data);

        this.clearRenderInDevices();
        this.pathsDevices = [];
        
        data.forEach(framePath => {                                                                                     // We go through array of paths

            this.pathsDevices.push(new Path(this.groundPlaneContainerObj, framePath.index, this.checkpointbaseFloating, this.checkpointbaseGrounded));

            framePath.checkpoints.forEach(frameCheckpoint => {

                this.pathsDevices[framePath.index].newCheckpointInDevices(new THREE.Vector3(frameCheckpoint.posX, frameCheckpoint.posY, frameCheckpoint.posZ), frameCheckpoint.orientation);
            });
            if (framePath.checkpoints.length > 1) this.pathsDevices[framePath.index].createTubeForDevices();
        });
    }

    getDeltaMouse(eventData){

        this.mouseCoordinates(eventData);

        if (this.firstEdit){
            this.previousMouseY = this.mouse.y;
            this.firstEdit = false;
        }

        let delta = this.mouse.y - this.previousMouseY;
        this.previousMouseY = this.mouse.y;

        return delta;

    }

    getRayFromMouse(eventData){

        this.mouseCoordinates(eventData);

        //2. Set the picking ray from the camera position and mouse coordinates
        this.raycaster.setFromCamera( this.mouse, this.camera );

        return this.raycaster.ray;

    }

    computeCameraHeightFromGroundPlane(){

        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin

        let camdown = new THREE.Vector3();                                        // Normal to gp
        camdown.copy(this.groundPlaneContainerObj.up);
        camdown.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates
        camdown = camdown.multiplyScalar(-1);

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = camdown.dot(normal);
        const d = top/bottom;

        let newPosition = camdown.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return this.camera.position.distanceTo(newPosition);
    }

    computeGroundPlaneIntersection(ray){

        // Formulas for line and plane intersection
        // plane: (p - p0) . n = 0
        // line: p = dl + l0
        // d = (p0 - l0) . n / l . n

        //3. Compute intersection from ray to ground plane
        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin
        const l = ray.direction;                                  // line direction

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = l.dot(normal);
        const d = top/bottom;

        let newPosition = l.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return newPosition;
    }

    checkpointReached(idx){
        if (idx + 1 < this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
            //this.currentPath.checkpoints[idx + 1].activateNextAnimation();
        } else if (idx + 1 === this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
        }
    }

    checkpointTriggered(idx){
        this.currentPath.checkpoints[idx].activateNextAnimation();
    }

    // Sets the mouse position with a coordinate system where the center of the screen is the origin
    mouseCoordinates(eventData){

        if (eventData === 0){
            this.mouse.x = 0;
            this.mouse.y = 0;
        } else {
            //1. Sets the mouse position with a coordinate system where the center of the screen is the origin
            this.mouse.x = ( eventData.x / window.innerWidth ) * 2 - 1;
            this.mouse.y = - ( eventData.y / window.innerHeight ) * 2 + 1;
        }

    }
    
    triggerRealtimePath(){
        this.realtimePath = !this.realtimePath;
        
        if (this.realtimePath){ // Triggered new realtime path
            this.createNewPath();
            this.realtimePathCounter = 0;
        }
    }

    update() {

        this.renderer.render(this.scene, this.camera);  // RENDER SCENE!
        
        // Generate path of checkpoints in realtime
        if (this.realtimePath){
            this.realtimePathCounter += 1;

            /*
            - add time threshold
            - add distance threshold
             */
            let newPos = this.camera.position.clone();
            this.groundPlaneContainerObj.worldToLocal(newPos);

            if (this.realtimePathCounter % 10 === 0){
                this.realtimePositions.push(newPos);
                if (this.realtimePositions.length > 1) this.currentPath.updateRealtimeSpline(this.realtimePositions);
            }
            
            if (this.realtimePathCounter > 50){
                
                console.log('New Checkpoint');
                this.currentPath.newCheckpoint(this.camera.position);
                if (this.currentPath.checkpoints.length > 1){
                    this.currentPath.updateSpline();
                    this.currentPath.updateFloorSpline();
                }
                this.currentPath.updateHeightLinesAndFloorMarks();
                
                this.realtimePathCounter = 0;

                this.emit('newPathPoint');
            }
        }

        /*
        // Surface Tracking Feedback
        let newRay = this.getRayFromMouse(0);
        let phonePointingAtfloorPosition = this.computeGroundPlaneIntersection(newRay);
        this.groundPlaneContainerObj.worldToLocal(phonePointingAtfloorPosition);
        this.dummy_phonePointer.position.copy(phonePointingAtfloorPosition);
         */

    }

}
