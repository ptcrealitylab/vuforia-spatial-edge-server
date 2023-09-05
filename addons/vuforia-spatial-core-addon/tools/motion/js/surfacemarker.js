import * as THREE from 'three';

/**
 * @desc this class contains the object that represents the surface tracked with the Vuforia ground plane
 * @author Anna Fuste
 * @required three
 */
export class SurfaceMarker extends THREE.Group {
    constructor() {

        super();

        var texture = new THREE.TextureLoader().load( 'assets/textures/surfacetracking.png' );
        // immediately use the texture for material creation
        var materialtracking = new THREE.MeshBasicMaterial( { map: texture, transparent: true, side: THREE.DoubleSide } );

        let geometry = new THREE.PlaneGeometry( 200, 200, 1 );
        this.trackingPlane = new THREE.Mesh( geometry, materialtracking );
        this.trackingPlane.rotateX(Math.PI/2);
        this.trackingPlane.position.set(0,0,0);
        this.add( this.trackingPlane );

    }
}