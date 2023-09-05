import * as THREE from 'three';
import FBXLoader from "three-fbx-loader";
import {Path} from "./path";

export class RobotDummy extends THREE.Group {
    constructor() {

        super();

        /*
        // Load FBX model for robot fbx
        const fbxloader = new FBXLoader();

        this.robotModel = null;

        fbxloader.load( 'assets/models/MiR100_STEP.fbx',  ( object ) => {    // Only load FBX once
            console.log('Loaded robot fbx');

            object.traverse( ( child ) => {
                if (child instanceof THREE.Object3D) {
                    child.material = new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: false} );

                    this.robotModel = child;
                    this.robotModel.scale.set(10,10,10);
                    this.robotModel.rotateY(90);

                    this.add(this.robotModel);
                }
            });
        });
         */

        let textureRobotMarker = new THREE.TextureLoader().load( 'assets/textures/robotMarker2.png' );

        let geometryMarker = new THREE.PlaneGeometry( 600, 600, 32 );
        let materialMarker = new THREE.MeshBasicMaterial( {map: textureRobotMarker, color: 0xffffff, side: THREE.DoubleSide, transparent: true} );

        let robotMarker = new THREE.Mesh( geometryMarker, materialMarker );
        robotMarker.rotateX(Math.PI/2);
        robotMarker.position.y += 100;

        this.add(robotMarker);

        /*
        // Robot dummy for Object Target
        const geometrycube = new THREE.BoxGeometry( 50, 50, 50 );
        const materialcube = new THREE.MeshBasicMaterial( {color: 0x836490} );
        let robotDummy = new THREE.Mesh( geometrycube, materialcube );
        //robotDummy.matrixAutoUpdate = false;
        robotDummy.position.set(0,0,0);
        this.add( robotDummy );

        const materialcube_x = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        let dummy_x = new THREE.Mesh( geometrycube, materialcube_x );
        robotDummy.add(dummy_x);
        dummy_x.position.set(50,0,0);

        const materialcube_z = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
        let dummy_z = new THREE.Mesh( geometrycube, materialcube_z );
        robotDummy.add(dummy_z);
        dummy_z.position.set(0,0,50);

        const materialcube_y = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        let dummy_y = new THREE.Mesh( geometrycube, materialcube_y );
        robotDummy.add(dummy_y);
        dummy_y.position.set(0,50,0);
         */

    }
}