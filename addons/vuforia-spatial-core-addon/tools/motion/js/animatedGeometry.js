import * as THREE from 'three';

export class AnimatedGeometry extends THREE.BufferGeometry {
    constructor(geo1, geo2) {
        super();
        const otherVertices = new Float32Array(geo2.attributes.position.array);
        const otherUVs = new Float32Array(geo2.attributes.uv.array);
        this.addAttribute('a_targetPosition', new THREE.BufferAttribute(otherVertices, 3));
        this.addAttribute('a_targetUV', new THREE.BufferAttribute(otherUVs, 2));
        this.addAttribute('position', geo1.attributes.position);
        this.addAttribute('uv', geo1.attributes.uv);
    }
}