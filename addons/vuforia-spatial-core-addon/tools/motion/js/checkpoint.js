import * as THREE from 'three';
window.THREE = THREE;

import { AnimatedGeometry } from './animatedGeometry';

export class Checkpoint extends THREE.Group {

    constructor(index = 0, pathIndex = 0, checkpointFloating, checkpointGrounded){
        super();

        this.idx = index;
        this.name = "checkpoint_" + pathIndex + ":" + index;
        this.orientation = 0;
        this.speed = 2;
        this.height = 0;
        this.initHeight = this.position.y;

        this.rotationActive = this.speedActive = this.heightActive = false;
        this.footprintActive = this.isFirstMove = false;

        this.previousMouseY = 0;

        this.edit = false;
        this.goalAnim = false;

        this.floatingGeom = checkpointFloating;
        this.groundedGeom = checkpointGrounded;

        this.generateBaseObject();

        this.generateHexLabel(index);

        this.generateFootprint();

        this.activateRotation();

        /*
        // MESHES WITH ANIMATED TEXTURES!
        var circlesTexture = new THREE.ImageUtils.loadTexture( 'assets/textures/feedback_circles.png' );
        let annie = new TextureAnimator( circlesTexture, 6, 3, 18, 75 ); // texture, #horiz, #vert, #total, duration.
        var circlesMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, map: circlesTexture, side:THREE.DoubleSide, transparent: true } );
        var circlesGeometry = new THREE.PlaneGeometry(10, 10, 1, 1);
        var circles = new THREE.Mesh(circlesGeometry, circlesMaterial);
        circles.rotateX(Math.PI/2);
        circles.position.y -= 3;
        groundPlaneContainerObj.add(circles);
        */

    }

    generateBaseObject(){
        this.groundedGeom.material = new THREE.MeshBasicMaterial({
            color: 0x00d4d2,
            side: THREE.DoubleSide,
            wireframe: false
        });

        this.floatingGeom.material = new THREE.MeshBasicMaterial({
            color: 0x00d4d2,
            side: THREE.DoubleSide,
            wireframe: false
        });

        this.animatedGeom = new AnimatedGeometry(this.floatingGeom.geometry, this.groundedGeom.geometry);

        // adds the varying vUv to pass the mixed UV coordinates to the fragment shader
        var myVertexShader = `
            varying vec2 vUv;
            uniform float u_morphFactor;
            uniform float u_time;
            attribute vec3 a_targetPosition;
            attribute vec2 a_targetUV;

            void main(){
             vUv = mix(uv, a_targetUV, u_morphFactor);
             vec3 new_position = mix(position, a_targetPosition, u_morphFactor);
             gl_Position =  projectionMatrix * modelViewMatrix * vec4( new_position, 1.0 );
            }
        `;

        var myFragmentShader = `
            uniform vec3 u_color;
            varying vec2 vUv;
            void main(){
            	gl_FragColor = vec4(mix(vec3(0.0, vUv.g, vUv.r), u_color, 0.6), 0.7 );
            	
            }
        `;

        let myUniforms = {
            u_time: { value: 0 },
            u_morphFactor: { value: 1 }, // show first model by default
            u_color: { value: new THREE.Color(0x01FFFD)}
        }

        this.myShaderMat = new THREE.ShaderMaterial({
            uniforms: myUniforms,
            vertexShader: myVertexShader,
            fragmentShader: myFragmentShader,
            //wireframe: true
        });

        this.checkpointMesh = new THREE.Mesh(this.animatedGeom, this.myShaderMat );
        this.checkpointMesh.position.y += 1.5;
        this.add( this.checkpointMesh );
    }

    generateHexLabel(index){

        // Create top
        var texture = new THREE.TextureLoader().load( 'assets/textures/hexagon.png' );
        // immediately use the texture for material creation
        var materialHex = new THREE.MeshBasicMaterial( { map: texture, transparent: true, side: THREE.DoubleSide } );
        let geometry = new THREE.PlaneGeometry( 4.5, 4.5, 1 );
        this.hexPlane = new THREE.Mesh( geometry, materialHex );
        this.hexPlane.position.y += 7;
        this.add( this.hexPlane );

        // create number labels
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = 128;
        ctx.fillStyle = 'white';
        ctx.font = '65px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), canvas.width/2, canvas.height/2);

        let materialText = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide });
        let geometryNumber = new THREE.PlaneGeometry( 4.5, 4.5, 1 );
        this.planeNumber = new THREE.Mesh( geometryNumber, materialText );
        this.planeNumber.position.y += 7;
        this.add( this.planeNumber );
    }

    showPositionArrows(){
        this.deselectCheckpoint();

        var textureFootprintArrows = new THREE.TextureLoader().load( 'assets/textures/footprint_arrows.png' );
        this.planeFootprint.material = new THREE.MeshBasicMaterial( {map: textureFootprintArrows, color: 0xffffff, side: THREE.DoubleSide, transparent: true} );

        this.footprintActive = true;
    }
    hidePositionArrows(){
        var textureFootprint = new THREE.TextureLoader().load( 'assets/textures/footprint2.png' );
        this.planeFootprint.material = new THREE.MeshBasicMaterial( {map: textureFootprint, color: 0xffffff, side: THREE.DoubleSide, transparent: true} );

        this.footprintActive = false;
        this.deselectCheckpoint();
    }

    generateFootprint(){
        var textureFootprint = new THREE.TextureLoader().load( 'assets/textures/footprint2.png' );
        var textureFootprintStatic = new THREE.TextureLoader().load( 'assets/textures/footprint_static2.png' );

        var geometryFootprint = new THREE.PlaneGeometry( 60, 60, 32 );
        var materialFootprint = new THREE.MeshBasicMaterial( {map: textureFootprint, color: 0xffffff, side: THREE.DoubleSide, transparent: true} );
        var materialFootprintStatic = new THREE.MeshBasicMaterial( {map: textureFootprintStatic, color: 0xffffff, side: THREE.DoubleSide, transparent: true} );

        this.planeFootprint = new THREE.Mesh( geometryFootprint, materialFootprint );
        this.planeFootprint.rotateX(Math.PI/2);
        this.planeFootprint.position.y -= 5;

        this.planeFootprintStatic = new THREE.Mesh( geometryFootprint, materialFootprintStatic );
        this.planeFootprintStatic.rotateX(Math.PI/2);
        this.planeFootprintStatic.position.y -= 4.8;

        this.canvas2 = document.createElement('canvas');
        const ctx2 = this.canvas2.getContext('2d');
        this.canvas2.width = this.canvas2.height = 800;
        ctx2.strokeStyle = '#79fa54';
        ctx2.lineWidth = 50;
        ctx2.setLineDash([15, 10]);
        ctx2.opacity = 0.5;
        ctx2.beginPath();
        ctx2.arc(400, 400, 250, 0, 0);
        ctx2.stroke();

        let materialText2 = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(this.canvas2), transparent: true, side: THREE.DoubleSide })
        let geometryFillRotation = new THREE.PlaneGeometry( 60, 60, 1 );
        this.planeFootprintRotationProgress = new THREE.Mesh( geometryFillRotation, materialText2 );
        this.planeFootprintRotationProgress.rotateX(Math.PI/2);
        this.planeFootprintRotationProgress.position.y -= 4.6;

        this.add( this.planeFootprint );
        this.add( this.planeFootprintStatic );
        this.add( this.planeFootprintRotationProgress );

        // create angle label
        this.canvasAngle = document.createElement('canvas');
        const ctx = this.canvasAngle.getContext('2d');
        this.canvasAngle.width = 300;
        this.canvasAngle.height = 128;
        ctx.fillStyle = 'white';
        ctx.font = '65px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText("0", this.canvasAngle.width/2, this.canvasAngle.height/2);

        let materialText = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(this.canvasAngle), transparent: true, side: THREE.DoubleSide });
        let geometryNumber = new THREE.PlaneGeometry( 8, 4, 1 );
        this.planeNumberAngle = new THREE.Mesh( geometryNumber, materialText );
        this.planeNumberAngle.rotation.set(-Math.PI / 2, 0,0);
        this.planeNumberAngle.position.y += 2;
        this.planeNumberAngle.position.x += 10;
        this.add( this.planeNumberAngle );

    }

    updateRotationSpin(angle){

        const ctx2 = this.canvas2.getContext('2d');
        ctx2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
        ctx2.beginPath();
        ctx2.arc(400, 400, 250, 0, Math.abs(angle));
        ctx2.stroke();

        this.planeFootprintRotationProgress.rotation.set(- Math.sign(angle) * Math.PI / 2, 0, 0);
        this.planeFootprintRotationProgress.material.map.needsUpdate = true;
        this.planeFootprintRotationProgress.material.opacity = 0.8;

        const ctx = this.canvasAngle.getContext('2d');
        ctx.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
        const angleS = (angle * (180 / Math.PI)).toFixed(2) + "°";
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.canvasAngle.width, this.canvasAngle.height);
        ctx.fillStyle = "#79fa54";
        ctx.fillText(angleS, this.canvasAngle.width/2, this.canvasAngle.height/2);
        this.planeNumberAngle.material.map.needsUpdate = true;
        this.planeNumberAngle.position.set(30 * Math.sin(-(angle - Math.PI/2)), -4, 30 * Math.cos(-(angle - Math.PI/2)));

    }

    selectCheckpoint(){
        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x01FFFD);
    }

    deselectCheckpoint(){

        console.log("Deselect checkpoint");

        this.rotationActive = false;
        this.speedActive = false;
        this.heightActive = false;

        this.footprintActive = false;

        this.isFirstMove = true;
        this.edit = false;

        this.planeFootprint.material.opacity = 0;
        this.planeFootprintStatic.material.opacity = 0;
        this.planeFootprintRotationProgress.material.opacity = 0;
        this.planeNumberAngle.material.opacity = 0;

        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x01FFFD);

        this.planeFootprint.scale.set(0, 0, 0);
        this.planeFootprintStatic.scale.set(0, 0, 0);
        this.planeFootprintRotationProgress.scale.set(0, 0, 0);
        this.planeNumberAngle.scale.set(0, 0, 0);

    }

    /**
     * @desc activates rotation edition for this checkpoint
     */
    activateRotation(){

        // In our case, we will only show the MIR footprint if the checkpoint is on the ground
        // TODO: If the checkpoint is risen, another gizmo should be used in order to adjust the rotation of the end effector

        if (this.myShaderMat.uniforms.u_morphFactor.value > 0.5){
            this.hidePositionArrows();
            this.deselectCheckpoint();

            this.edit = true;
            this.rotationActive = true;
            //this.footprintActive = true;

            this.checkpointMesh.material.uniforms.u_color.value.setHex(0x00ff77);
            this.isFirstMove = true;
        }
    }

    /**
     * @desc activates speed edition for this checkpoint
     */
    activateSpeed(){
        this.edit = true;
        this.speedActive = true;
        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x00ff77);
        this.isFirstMove = true;
    }

    /**
     * @desc activates height edition for this checkpoint
     */
    activateHeight(){
        this.edit = true;
        this.heightActive = true;
        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x00ff77);
        this.isFirstMove = true;
    }

    /**
     * @desc rotates footprint in other devices connected to the server
     * @param int $orientation - in degrees
     */
    rotateFootprintForDevices(orientation){

        this.planeFootprint.rotation.z = orientation * Math.PI / 180;

        this.orientation = orientation;

        this.updateRotationSpin(this.planeFootprint.rotation.z);

    }

    /**
     * @desc sets initial scale and opacity for footprint to show in other devices connected to the server
     * @param int $scale - footprint scale
     */
    setupFootprintForDevices(scale){
        this.planeFootprint.scale.set(scale, scale, scale);
        this.planeFootprintStatic.scale.set(scale, scale, scale);
        this.planeFootprintRotationProgress.scale.set(scale, scale, scale);
        this.planeNumberAngle.scale.set(scale, scale, scale);

        this.planeFootprint.material.opacity = 1.0;
        this.planeFootprintStatic.material.opacity = 1.0;
        this.planeFootprintRotationProgress.material.opacity = 1.0;
        this.planeNumberAngle.material.opacity = 1.0;
    }

    editPosition(newPositionInGP){

        let newPosition = new THREE.Vector3(newPositionInGP.x, this.height, newPositionInGP.z);
        this.position.copy(newPosition);

    }

    editRotation(newAngle){

        this.planeFootprint.rotateZ(newAngle * 3);
        this.orientation = this.planeFootprint.rotation.z * 180 / Math.PI;
        this.updateRotationSpin(this.planeFootprint.rotation.z);

    }

    editSpeed(newSpeed){

        this.speed += newSpeed * 10;

    }

    editHeight(newHeight){

        this.position.set(this.position.x, newHeight, this.position.z);
        this.height = this.position.y;

    }

    isEditionActive(){
        return this.edit;
    }

    faceCamera(lookPos){
        this.planeNumber.lookAt(lookPos);
        this.hexPlane.lookAt(lookPos);
    }

    getOrientation(){
        return this.orientation;
    }

    activateNextAnimation(){
        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x00ff44);
        this.goalAnim = true;
    }

    deactivateNextAnimation(){
        this.checkpointMesh.material.uniforms.u_color.value.setHex(0x4400ff);
        this.goalAnim = false;
    }

    update(){

        if (this.footprintActive && this.planeFootprint.material.opacity < 0.8) {                                       // Fade in opacity animation
            this.planeFootprint.material.opacity += 0.05;
            this.planeFootprintStatic.material.opacity += 0.05;
            this.planeFootprintRotationProgress.material.opacity += 0.05;
            this.planeNumberAngle.material.opacity += 0.05;
        }

        if (this.footprintActive && this.planeFootprint.scale.x < 1) {                                                  // Fade in scale animation
            let newScale = this.planeFootprint.scale.x + 0.07;
            this.planeFootprint.scale.set(newScale, newScale, newScale);
            this.planeFootprintStatic.scale.set(newScale, newScale, newScale);
            this.planeFootprintRotationProgress.scale.set(newScale, newScale, newScale);
            this.planeNumberAngle.scale.set(newScale, newScale, newScale);
        }

        if (this.goalAnim){                                                                                             // Slightly rotate pyramid when animation is happening
            this.checkpointMesh.rotateOnAxis(new THREE.Vector3(0,1,0), 0.02);
        }

        if (this.position.y > this.initHeight + 10){                                                                    // Pyramid to rhombe animation (from floor to floating)
            if (this.myShaderMat.uniforms.u_morphFactor.value > 0){
                this.myShaderMat.uniforms.u_morphFactor.value -= 0.1;
                this.checkpointMesh.position.y -= 0.2;
                this.checkpointMesh.rotateY(0.1);
            }
        } else {
            if (this.myShaderMat.uniforms.u_morphFactor.value < 1) {                                                    // Rhombe to pyramid animation (from floating to floor)
                this.myShaderMat.uniforms.u_morphFactor.value += 0.1;
                this.checkpointMesh.position.y += 0.2;
                this.checkpointMesh.rotateY(0.1);
            }
        }
    }
}



