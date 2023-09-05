import * as THREE from 'three';

export class AxisDummy extends THREE.Group {
    constructor() {

        super();

        // Robot dummy for Object Target
        const geometrycube = new THREE.BoxGeometry( 20, 20, 20 );
        const materialcube = new THREE.MeshBasicMaterial( {color: 0xffffff} );
        let robotDummy = new THREE.Mesh( geometrycube, materialcube );
        //robotDummy.matrixAutoUpdate = false;
        robotDummy.position.set(0,0,0);
        this.add( robotDummy );

        /*
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
