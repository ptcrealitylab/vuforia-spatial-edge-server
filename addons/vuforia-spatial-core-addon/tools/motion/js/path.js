import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { Checkpoint } from '../js/checkpoint';
import EventEmitter from 'eventemitter3';
import {binLerp, closestPointInRay} from "./utils";

/**
 * @desc A path with all its checkpoints and graphics (spline, heightlines etc)
 * examples include activateSelectedCheckpointMode(), newCheckpoint(), newCheckpointInDevices(), updateSpline()
 * @author Anna Fuste
 * @required eventemitter3, three, three.meshline, checkpoint.js, utils.js
 */
export class Path extends THREE.Group {

    constructor(parentObj, index, checkpointFloating, checkpointGrounded){
        super();

        this.eventEmitter = new EventEmitter();

        this.checkpointFloating = checkpointFloating;
        this.checkpointGrounded = checkpointGrounded;

        this.parentContainer = parentObj;
        this.checkpoints = [];
        this.selectedCheckpoint = null;
        this.isClosed = false;

        this.splineMesh = new THREE.Mesh();
        this.splineMesh2 = new THREE.Mesh();
        this.splineMesh3 = new THREE.Mesh();
        this.lineMeshDevices = null;
        this.tubeLine = null;
        this.minDistanceBetweenCheckpoints = 100;
        this.scaleIOValue = 15.0;
        this.heightLines = [];
        this.floorMarks = [];

        this.textureArrow = new THREE.TextureLoader().load ('assets/textures/pathArrow2.png');
        this.textureFloorMark = new THREE.TextureLoader().load( 'assets/textures/checkpointFloor.png' );

        this.geometryFloor = new THREE.PlaneGeometry( 150, 150, 32 );

        this.pathData = {
            index: index,
            checkpoints: []
        };

        this.checkpointTouchCount = 0;    // This will work as a timer for rotating checkpoints
        this.checkpointTouchActive = false;

    }

    on(eventName, listener) {
        this.eventEmitter.on(eventName, listener);
    }

    removeEventListener(eventName, listener) {
        this.eventEmitter.removeListener(eventName, listener);
    }

    emit(event, payload, error = false) {
        this.eventEmitter.emit(event, payload, error);
    }

    activateSelectedCheckpointMode(mode){
        if (this.selectedCheckpoint !== null){
            switch (mode) {
                case 0:
                    this.selectedCheckpoint.deselectCheckpoint();
                    this.selectedCheckpoint = null;
                    break;
                case 1:
                    this.selectedCheckpoint.activateRotation();
                    break;
                case 2:
                    this.selectedCheckpoint.activateSpeed();
                    break;
                case 3:
                    this.selectedCheckpoint.activateHeight();
                    break;
                case 4:
                    break;

                default:
                    break;

            }
        }
    }

    newCheckpointInDevices(position, orientation){

        // Create Checkpoint at new position
        
        console.log('NEW CHECKPOINT IN POSITION: ', position);

        const checkpoint = new Checkpoint(this.checkpoints.length, this.pathData.index, this.checkpointFloating, this.checkpointGrounded);

        checkpoint.scale.set(this.scaleIOValue, this.scaleIOValue, this.scaleIOValue);
        checkpoint.setupFootprintForDevices(1);

        this.parentContainer.add(checkpoint);

        checkpoint.position.copy(position);
        checkpoint.rotateFootprintForDevices(orientation);

        this.selectedCheckpoint = checkpoint;

        this.checkpoints.push(checkpoint);

    }

    newCheckpoint(position){

        // Create Checkpoint at new position

        const checkpoint = new Checkpoint(this.checkpoints.length, this.pathData.index, this.checkpointFloating, this.checkpointGrounded);

        checkpoint.scale.set(this.scaleIOValue, this.scaleIOValue, this.scaleIOValue);
        checkpoint.position.copy(position);

        this.parentContainer.worldToLocal(checkpoint.position);
        this.parentContainer.add(checkpoint);

        //circles.position.copy(checkpoint.position);
        //circles.rotateX(- Math.PI/2);

        //let circlesScaleValue = 20;
        //circles.scale.set(circlesScaleValue, circlesScaleValue, circlesScaleValue);

        checkpoint.selectCheckpoint();
        this.selectedCheckpoint = checkpoint;

        this.checkpoints.push(checkpoint);

        // Update positions and orientations
        this.updatePathData();

    }


    createTubeForDevices() {

        this.parentContainer.remove(this.tubeLine);

        // line material
        var lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });

        const positionsArray = this.checkpoints.map(element => {
            let newPosition = new THREE.Vector3(element.position.x, -50, element.position.z);
            return newPosition;
        });

        // Create Tube Geometry
        var tubeGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(positionsArray),
            512 * positionsArray.length,// path segments
            4,// THICKNESS
            10, //Roundness of Tube
            false //closed
        );

        //add buffer geometry
        let tubeBufferGeomtry = new THREE.BufferGeometry().fromGeometry(
            tubeGeometry
        );

        this.tubeLine = new THREE.Line(tubeGeometry, lineMaterial);
        this.parentContainer.add(this.tubeLine);
    }

    /*
    createSplineForDevices() {

        this.parentContainer.remove(this.splineMesh);

        const spline = new MeshLine();

        const positionsArray = this.checkpoints.map(element => {
            let newPosition = new THREE.Vector3(element.position.x, 0, element.position.z);
            return newPosition;
        });

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3(positionsArray);
        const points = curve.getPoints( this.checkpoints.length * 10 );

        var geometry = new THREE.Geometry();
        geometry.vertices = points;

        spline.setGeometry( geometry );

        //this.textureArrow.wrapS = THREE.RepeatWrapping;
        let material = new MeshLineMaterial({
            //map: this.textureArrow,
            useMap: false,
            color: new THREE.Color('white'),
            transparent: false,
            opacity: 1,
            //repeat: new THREE.Vector2(points.length, 1), // This is never going to look good
            //dashOffset: 10,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            sizeAttenuation: false,
            lineWidth: 100,
            //near: camera.near,
            //far: camera.far
        });


        this.splineMesh = new THREE.Mesh( spline.geometry, material ); // this syntax could definitely be improved!
        //this.splineMesh.position.z += 0;
        this.splineMesh.position.y -= 20;

        console.log('DRAWING SPLINE', this.splineMesh);

        this.parentContainer.add( this.splineMesh );

    }

     */

    /*
    createLineForDevices() {

        this.parentContainer.remove(this.lineMeshDevices);

        var material = new THREE.LineBasicMaterial({
            linewidth: 10,
            color: 0xff0000
        });

        const positionsArray = this.checkpoints.map(element => {
            let newPosition = new THREE.Vector3(element.position.x, 0, element.position.z);
            return newPosition;
        });

        console.log('posArray: ', positionsArray.length);

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3(positionsArray);
        const points = curve.getPoints( this.checkpoints.length * 10 );

        var geometry = new THREE.Geometry();
        geometry.vertices = points;

        this.lineMeshDevices = new THREE.Line( geometry, material );
        this.parentContainer.add( this.lineMeshDevices );

    }*/

    updateSpline(){

        this.parentContainer.remove(this.splineMesh);

        const spline = new MeshLine();

        const positionsArray = this.checkpoints.map(element => {
            return new THREE.Vector3(element.position.x, element.position.y, element.position.z);
        });

        const splinePointMultiplier = 10;
        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3(positionsArray);
        const points = curve.getPoints( this.checkpoints.length * splinePointMultiplier );

        const geometry = new THREE.Geometry();
        geometry.vertices = points;

        spline.setGeometry( geometry, function( p ) {

            let idx = Math.floor(p * (points.length - 2) / splinePointMultiplier);
            return this.checkpoints[idx].speed;

        }.bind(this) );

        const widths = binLerp(spline.width);

        spline.attributes.width.copyArray(new Float32Array(widths));
        spline.attributes.width.needsUpdate = true;

        this.textureArrow.wrapS = THREE.RepeatWrapping;
        let material = new MeshLineMaterial({
            map: this.textureArrow,
            useMap: true,
            color: new THREE.Color('white'),
            transparent:true,
            opacity: 1,
            repeat: new THREE.Vector2(points.length, 1), // This is never going to look good
            dashOffset: 10,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            sizeAttenuation: true,
            lineWidth: 100,
            depthWrite: true,
            depthTest: true
            //near: camera.near,
            //far: camera.far
        });

        this.splineMesh = new THREE.Mesh( spline.geometry, material );
        this.splineMesh.position.y -= 20;

        this.parentContainer.add( this.splineMesh );
    }

    updateFloorSpline(){

        this.parentContainer.remove(this.splineMesh2);

        const spline = new MeshLine();

        const positionsArray = this.checkpoints.map(element => {
            return new THREE.Vector3(element.position.x, 0, element.position.z);
        });

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3(positionsArray);
        const points = curve.getPoints( this.checkpoints.length * 10 );

        const geometry = new THREE.Geometry();
        geometry.vertices = points;

        spline.setGeometry( geometry );

        const material = new MeshLineMaterial({color: 0xffffff, lineWidth: 5});

        this.splineMesh2 = new THREE.Mesh( spline.geometry, material );
        this.splineMesh2.position.y -= 20;

        this.parentContainer.add( this.splineMesh2 );

    }

    updateRealtimeSpline(positions){

        this.parentContainer.remove(this.splineMesh3);

        const spline = new MeshLine();

        
        const positionsArray = positions.map(element => {
            return new THREE.Vector3(element.x, element.y, element.z);
        });

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3(positions);
        const points = curve.getPoints( positions.length * 10 );

        const geometry = new THREE.Geometry();
        geometry.vertices = points;

        spline.setGeometry( geometry );

        const material = new MeshLineMaterial({color: 0xffff00, lineWidth: 5});

        this.splineMesh3 = new THREE.Mesh( spline.geometry, material );
        this.splineMesh3.position.y -= 20;

        this.parentContainer.add( this.splineMesh3 );

    }

    updateHeightLinesAndFloorMarks(){

        this.heightLines.forEach(heightLine => {
            this.parentContainer.remove(heightLine);
        });

        this.floorMarks.forEach(floorMark => {
            this.parentContainer.remove(floorMark);
        });

        this.heightLines = [];  // empty array of heightlines
        this.floorMarks = [];

        this.checkpoints.forEach(checkpoint => {

            const heightLine = new MeshLine();

            let gp_position = new THREE.Vector3(checkpoint.position.x, 0, checkpoint.position.z);
            const positionsArray = [gp_position, checkpoint.position];

            const geometry = new THREE.Geometry();
            geometry.vertices = positionsArray;

            //console.log('heightLine: ', heightLine, 'geometry: ', geometry);
            
            heightLine.setGeometry( geometry );
            let material = new MeshLineMaterial({
                color: new THREE.Color('white'),
                transparent:true,
                opacity: 1,
                dashArray: 0.1,
                dashOffset: 0,
                dashRatio: 0.5,
                resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
                sizeAttenuation: true,
                lineWidth: 5,
                depthWrite: true,
                depthTest: true
                //near: camera.near,
                //far: camera.far
            });

            let heightLineMesh = new THREE.Mesh(heightLine.geometry, material);

            this.heightLines.push(heightLineMesh);

            this.parentContainer.add( heightLineMesh );

            // Update floormarks
            //let materialFloor = new THREE.MeshBasicMaterial( { color: checkpoint.groundedGeom.material.color, map: this.textureFloorMark, transparent: true, depthWrite: true, depthTest: true } );
            let materialFloor = new THREE.MeshBasicMaterial( { color: new THREE.Color('white'), map: this.textureFloorMark, transparent: true, depthWrite: true, depthTest: true } );
            let floorMark = new THREE.Mesh( this.geometryFloor, materialFloor );
            floorMark.position.set(checkpoint.position.x, -20, checkpoint.position.z);
            floorMark.rotateX(- Math.PI/2);
            floorMark.scale.set(1, 1, 1);
            this.floorMarks.push(floorMark);

            this.parentContainer.add( floorMark );

        });
    }

    onGroundPlaneIntersection(newRay, newPosition, mode){

        let checkpointSelected = false;

        this.checkpoints.forEach(checkpoint => {

            let closestPoint = closestPointInRay(newRay, checkpoint.getWorldPosition());

            if (!checkpointSelected && checkpoint.getWorldPosition().distanceTo(closestPoint) < this.minDistanceBetweenCheckpoints){    // Tap very close to an existing Checkpoint

                if (checkpoint === this.selectedCheckpoint){

                    //console.log('THIS CHECKPOINT IS ALREADY SELECTED');

                } else {
                    this.deselectAllCheckpoints();      // Deselect all checkpoints

                    console.log('Activate Checkpoint: ' + checkpoint.name);

                    checkpoint.selectCheckpoint();
                    this.selectedCheckpoint = checkpoint;

                    this.checkpointTouchCount = 0;

                    this.emit('reset_mode');
                }

                checkpointSelected = true;
                this.checkpointTouchActive = true;

            }

        });

        if (!checkpointSelected && mode === 0){

            this.deselectAllCheckpoints();

            console.log('CREATE NEW CHECKPOINT');

            this.newCheckpoint(newPosition);
            if (this.checkpoints.length > 1){
                this.updateSpline();
                this.updateFloorSpline();
            }
            this.updateHeightLinesAndFloorMarks();

        }
    }

    deselectAllCheckpoints(){
        this.checkpoints.forEach(checkpoint => {
            checkpoint.deselectCheckpoint();
        });
    }

    updatePathData(){

        let exists = false;
        // Update checkpoint position in frame data and server data
        this.pathData.checkpoints.forEach(checkpoint => {

            if (checkpoint.name === this.selectedCheckpoint.name){
                exists = true;

                checkpoint.posX = this.selectedCheckpoint.position.x;
                checkpoint.posY = this.selectedCheckpoint.position.y;
                checkpoint.posZ = this.selectedCheckpoint.position.z;
                checkpoint.orientation = this.selectedCheckpoint.getOrientation();
            }
        });

        if (!exists){

            console.log('Add new Checkpoint data to pathData in path');
            // Add new checkpoint name and position to pathData
            this.pathData.checkpoints.push({
                "name" : this.selectedCheckpoint.name,
                "active" : 0,                               // If set to 1, the robot will change state to executing mission to get to this checkpoint
                "posX" : this.selectedCheckpoint.position.x,
                "posY" : this.selectedCheckpoint.position.y,
                "posZ" : this.selectedCheckpoint.position.z,
                "orientation" : this.selectedCheckpoint.getOrientation() // orientation of the footprint
            });
        }
        
        console.log('updatePathData: ', this.pathData);
    }

    clear(){

        this.selectedCheckpoint = null;

        this.checkpoints.forEach(checkpoint => {
            this.parentContainer.remove(checkpoint);
        });
        this.parentContainer.remove(this.splineMesh);
        this.parentContainer.remove(this.splineMesh2);
        this.parentContainer.remove(this.splineMesh3);

        this.checkpoints = [];
        this.pathData.checkpoints = [];

        this.updateHeightLinesAndFloorMarks();

    }

    checkpointsLookAt(){

        // TODO: This needs fixing

        let cameraWorldPos = new THREE.Vector3(0,0,0);
        this.parentContainer.worldToLocal(cameraWorldPos);

        this.checkpoints.forEach(element => {

            let lookPos = new THREE.Vector3(cameraWorldPos.x, 0, cameraWorldPos.z);
            element.faceCamera(lookPos);

        });
    }

    closeReset(){

        this.checkpointTouchCount = 0;
        this.checkpointTouchActive = false;
    }

    closePath(){

        // Close path
        this.isClosed = true;
        this.splineMesh.material.color.setHex(0x42f4ce);

        this.checkpoints.forEach(checkpoint => {
            checkpoint.deselectCheckpoint();
        });

        //console.log('Path Closed');
    }

    isActive(){
        return !this.isClosed;
    }

    update(deltaTime, elapsedTime, frameCount){

        this.checkpoints.forEach(checkpoint => {
            checkpoint.update();
        });

        if (this.checkpointTouchActive){
            this.checkpointTouchCount += 1;
            
            console.log(this.checkpointTouchCount);

            if (this.checkpointTouchCount > 30){

                if (this.selectedCheckpoint !== null) {

                    this.emit('checkpoint_menu');
                }

                this.checkpointTouchActive = false;
                this.checkpointTouchCount = 0;
            }
        }
    }
}
