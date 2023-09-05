createNameSpace('realityEditor.gui.ar.desktopRenderer');

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshBVH } from '../../thirdPartyCode/three-mesh-bvh.module.js';
import { mergeBufferGeometries } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';

(function(exports) {
    const MAX_AGE = 100;

    class OctTree {
        constructor({minX, maxX, minY, maxY, minZ, maxZ}) {
            this.minX = minX;
            this.maxX = maxX;
            this.minY = minY;
            this.maxY = maxY;
            this.minZ = minZ;
            this.maxZ = maxZ;
            this.tree = [];
        }

        getOct(x, y, z) {
            if (typeof x !== 'number' ||
                typeof y !== 'number' ||
                typeof z !== 'number') {
                throw new Error(`incorrect arguments to getOct: ${JSON.stringify({x, y, z})}`);
            }
            // TODO
            //  - update displayed voxels
            //  - create entire tree for insertion
            let {minX, maxX, minY, maxY, minZ, maxZ} = this;
            let tree = this.tree;
            while (tree && tree.length > 0) {
                let midX = (maxX + minX) / 2;
                let midY = (maxY + minY) / 2;
                let midZ = (maxZ + minZ) / 2;
                let idx = 0;
                // Generate an index into an array of length 8 of the binary form XZY
                if (x > midX) {
                    idx += 4;
                }
                if (z > midZ) {
                    idx += 2;
                }
                if (y > midY) {
                    idx += 1;
                }
                let cell = tree[idx];
                if (!Array.isArray(cell)) {
                    return cell;
                }
                if (x > midX) {
                    minX = midX;
                } else {
                    maxX = midX;
                }
                if (y > midY) {
                    minY = midY;
                } else {
                    maxY = midY;
                }
                if (z > midZ) {
                    minZ = midZ;
                } else {
                    maxZ = midZ;
                }
                tree = cell;
            }
        }

        insert(x, y, z, value) {
            if (typeof x !== 'number' ||
                typeof y !== 'number' ||
                typeof z !== 'number' ||
                !value) {
                throw new Error(`incorrect arguments to insert: ${JSON.stringify({x, y, z, value})}`);
            }
            // TODO
            //  - update displayed voxels
            //  - create entire tree for insertion
            let {minX, maxX, minY, maxY, minZ, maxZ} = this;
            let tree = this.tree;
            while (tree) {
                let midX = (maxX + minX) / 2;
                let midY = (maxY + minY) / 2;
                let midZ = (maxZ + minZ) / 2;
                // Generate an index into an array of length 8 of the binary form XZY
                let idx = 0;
                if (x > midX) {
                    idx += 4;
                }
                if (z > midZ) {
                    idx += 2;
                }
                if (y > midY) {
                    idx += 1;
                }
                if (typeof tree[idx] === 'undefined') {
                    tree[idx] = value;
                    return;
                }
                let cell = tree[idx];
                if (!Array.isArray(cell)) {
                    let cur = cell;
                    tree[idx] = [];
                    this.insert(cur.pos.x, cur.pos.y, cur.pos.z, cur);
                }
                if (x > midX) {
                    minX = midX;
                } else {
                    maxX = midX;
                }
                if (y > midY) {
                    minY = midY;
                } else {
                    maxY = midY;
                }
                if (z > midZ) {
                    minZ = midZ;
                } else {
                    maxZ = midZ;
                }
                tree = tree[idx];
            }
        }

        removeOct(x, y, z, isValidDeletion) {
            if (typeof x !== 'number' ||
                typeof y !== 'number' ||
                typeof z !== 'number') {
                throw new Error(`incorrect arguments to removeOct: ${JSON.stringify({x, y, z})}`);
            }

            // TODO
            //  - update displayed voxels
            //  - create entire tree for insertion
            let {minX, maxX, minY, maxY, minZ, maxZ} = this;
            let tree = this.tree;
            while (tree && tree.length > 0) {
                let midX = (maxX + minX) / 2;
                let midY = (maxY + minY) / 2;
                let midZ = (maxZ + minZ) / 2;
                let idx = 0;
                // Generate an index into an array of length 8 of the binary form XZY
                if (x > midX) {
                    idx += 4;
                }
                if (z > midZ) {
                    idx += 2;
                }
                if (y > midY) {
                    idx += 1;
                }
                let cell = tree[idx];
                if (!Array.isArray(cell)) {
                    if (!cell) {
                        return;
                    }
                    if (isValidDeletion && !isValidDeletion(cell, x, y, z)) {
                        return;
                    }
                    delete tree[idx];
                    return cell;
                }
                if (x > midX) {
                    minX = midX;
                } else {
                    maxX = midX;
                }
                if (y > midY) {
                    minY = midY;
                } else {
                    maxY = midY;
                }
                if (z > midZ) {
                    minZ = midZ;
                } else {
                    maxZ = midZ;
                }
                tree = cell;
            }
        }

        filterOldBoxes() {
            let queue = [this.tree];
            while (queue.length > 0) {
                let tree = queue.pop();
                for (let i = 0; i < 8; i++) {
                    let cell = tree[i];
                    if (Array.isArray(cell)) {
                        queue.push(cell);
                        continue;
                    }
                    if (!cell) {
                        continue;
                    }
                    cell.box._age -= 1;
                    if (cell.box._age > 0) {
                        continue;
                    }

                    cell.box.parent.remove(cell.box);
                    delete tree[i];
                }
            }
        }
    }

    exports.RealityZoneVoxelizer = class RealityZoneVoxelizer {
        constructor(floorOffset, gltf, navmesh) {
            this.floorOffset = floorOffset;

            this.isCloseDeletion = this.isCloseDeletion.bind(this);

            let geometries = [];
            gltf.traverse(obj => {
                if (obj.geometry) {
                    let geo = obj.geometry.clone();
                    geo.deleteAttribute('uv'); // Messes with merge if present in some geometries but not others
                    geometries.push(geo);
                }
            });

            gltf.children.map(child => {
                child.geometry.boundsTree = new MeshBVH(child.geometry);
            });

            this.gltf = gltf;

            let geometry = geometries[0];
            if (geometries.length > 1) {
                const mergedGeometry = mergeBufferGeometries(geometries);
                geometry = mergedGeometry;
            }

            this.bvh = new MeshBVH(geometry);
            this.navmesh = navmesh;
            this.raycaster = new THREE.Raycaster();
            this.container = new THREE.Group();
            this.container.position.y = -floorOffset;
            // this.container.rotation.x = Math.PI / 2;
            // Can dynamically octree-style subdivide and save a ton of processing
            this.res = 100 / 1000;

            this.baseMat = new THREE.MeshBasicMaterial({
                color: 0x777777,
                transparent: true,
                opacity: 0.3,
                wireframe: true,
            });

            this.addedMat = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.3,
                // wireframe: true,
            });

            this.removedMat = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.3,
                // wireframe: true,
            });

            this.baseGeo = new THREE.BoxBufferGeometry(1, 1, 1);
            const maxBoxes = 1 << 16;
            this.boxesMesh = new THREE.InstancedMesh(this.baseGeo, this.baseMat, maxBoxes);
            this.addedRemovedOct = null;

            this.voxOct = null;
        }

        add() {
            realityEditor.gui.threejsScene.addToScene(this.container);

            this.boxesMesh.count = 0;

            let startRes = this.res * 8;

            let diffX = Math.ceil((this.navmesh.maxX - this.navmesh.minX) / startRes + 2) * startRes;
            let diffY = Math.ceil((this.navmesh.maxY - this.navmesh.minY) / startRes + 2) * startRes;
            let diffZ = Math.ceil((this.navmesh.maxZ - this.navmesh.minZ) / startRes + 2) * startRes;
            let avgX = (this.navmesh.minX + this.navmesh.maxX) / 2;
            let avgY = (this.navmesh.minY + this.navmesh.maxY) / 2;
            let avgZ = (this.navmesh.minZ + this.navmesh.maxZ) / 2;
            let diff = Math.max(diffX, diffY, diffZ);
            this.voxOct = new OctTree({
                minX: avgX - diff / 2,
                minY: avgY - diff / 2,
                minZ: avgZ - diff / 2,
                maxX: avgX + diff / 2,
                maxY: avgY + diff / 2,
                maxZ: avgZ + diff / 2,
            });
            this.addedRemovedOct = new OctTree({
                minX: avgX - diff / 2,
                minY: avgY - diff / 2,
                minZ: avgZ - diff / 2,
                maxX: avgX + diff / 2,
                maxY: avgY + diff / 2,
                maxZ: avgZ + diff / 2,
            });

            this.voxOct.tree = this.scanRegion(
                avgX - diff / 2,
                avgY - diff / 2,
                avgZ - diff / 2,
                avgX + diff / 2,
                avgY + diff / 2,
                avgZ + diff / 2,
                2);
            let boxScale = diff;
            while (boxScale > this.res) {
                boxScale /= 2;
            }
            this.res = boxScale;
            this.container.add(this.boxesMesh);
        }

        remove() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
        }

        removeOct(x, y, z) {
            let n = this.voxOct.remove(x, y, z);
            if (typeof n !== 'number') {
                return;
            }
            if (n < 0) {
                return; // hmmmmMMMMMM
            }
            let zeros = new THREE.Matrix4(
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 1
            );
            this.boxesMesh.setMatrixAt(n, zeros);
        }

        scanRegion(minX, minY, minZ, maxX, maxY, maxZ, subdivs) {
            let res = (maxX - minX) / subdivs;
            let building = res <= this.res;

            let oct = [];
            for (let xi = 0; xi < subdivs; xi++) {
                let x = minX + res * (xi + 0.5);
                for (let zi = 0; zi < subdivs; zi++) {
                    let z = minZ + res * (zi + 0.5);
                    for (let yi = 0; yi < subdivs; yi++) {
                        let y = minY + res * (yi + 0.5);
                        if (this.doRaycastBox(x, y, z, res)) {
                            // let box = new THREE.Mesh(this.baseGeo, this.baseMat);
                            // box.position.set(x * 1000, y * 1000, z * 1000);
                            // box.scale.set(res / this.res, res / this.res, res / this.res);
                            // this.container.add(box);
                            if (building) {
                                let mat = new THREE.Matrix4();
                                mat.makeScale(res * 1000, res * 1000, res * 1000);
                                mat.setPosition(x * 1000, y * 1000, z * 1000);
                                this.boxesMesh.setMatrixAt(this.boxesMesh.count, mat);
                                // let box = new THREE.Mesh(this.baseGeo, this.baseMat);
                                // box.position.set
                                // // this.boxPositions.push(x * 1000, y * 1000, z * 1000);
                                // // box.rotation.y = Math.random() * 0.4;
                                // box.scale.set(res * 1000, res * 1000, res * 1000);
                                // this.container.add(box);
                                oct.push(this.boxesMesh.count);
                                this.boxesMesh.count += 1;
                            } else {
                                oct.push(this.scanRegion(
                                    x - res / 2, y - res / 2, z - res / 2,
                                    x + res / 2, y + res / 2, z + res / 2,
                                    2));
                            }
                        } else {
                            oct.push([]);
                        }
                    }
                }
            }
            return oct;
        }

        doRaycastBox(x, y, z, res) {
            let box = new THREE.Box3();
            box.min.set(
                x - res / 2,
                y - res / 2,
                z - res / 2
            );
            box.max.set(
                x + res / 2,
                y + res / 2,
                z + res / 2
            );
            return this.bvh.intersectsBox(box, new THREE.Matrix4());
        }

        isCloseDeletion(cell, x, y, z) {
            let otherPos = new THREE.Vector3(x, y, z);
            return cell.pos.distanceToSquared(otherPos) < this.res * this.res;
        }

        raycastDepth(mesh, {width, height}, rawDepth) {
            mesh.updateMatrixWorld();
            const matrixWorld = mesh.matrixWorld;
            const matrixWorldInv = mesh.matrix.clone();
            matrixWorldInv.invert();
            // Is just 1000x scale and 1/1000x scale, respectively
            // const gltfMatrixWorldInv = this.gltf.matrixWorld.clone();
            // gltfMatrixWorldInv.invert();
            const XtoZ = 1920.0 / 1448.24976; // width over focal length
            const YtoZ = 1080.0 / 1448.24976;
            let res = 16;
            const origin = new THREE.Vector3();
            origin.setFromMatrixPosition(matrixWorld);
            origin.x /= 1000;
            origin.y /= 1000;
            origin.z /= 1000;

            // Raycast in a square in the center of the screen
            let xMargin = (width - height) / 2;

            // for (let y = height / 2; y < height; y += 10000)
            //     for (let x = width / 2; x < width; x += 10000)
            for (let y = 0; y < height; y += res) {
                for (let x = xMargin; x < width - xMargin; x += res) {
                    const direction = new THREE.Vector3(
                        x / width,
                        y / height,
                        1
                    );
                    let depth = rawDepth[y * width + x] * 5000 / (1 << 14);
                    const z = depth;
                    direction.x = -(x / width - 0.5) * z * XtoZ;
                    direction.y = -(y / height - 0.5) * z * YtoZ;
                    direction.z = z;
                    const ray = new THREE.Ray(new THREE.Vector3(), direction);
                    // Transforms from a ray relative to the cameravis to a ray
                    // relative to the world
                    ray.applyMatrix4(matrixWorld);
                    ray.origin.x /= 1000;
                    ray.origin.y /= 1000;
                    ray.origin.z /= 1000;

                    // TODO this isn't very reliable due to sampling only once
                    // every `res` pixels. Performance could be improved by
                    // doing a true octtree-ray intersection

                    // Scan and remove existing boxes that intersect with this
                    // ray of length=measured depth by querying points along
                    // the ray
                    for (let airDepth = 0; airDepth < depth / 1000; airDepth += this.res) {
                        let airPosWorld = ray.origin.clone();
                        let diffVec = ray.direction.clone();
                        diffVec.multiplyScalar(airDepth);
                        airPosWorld.add(diffVec);
                        let cell = this.addedRemovedOct.removeOct(
                            airPosWorld.x, airPosWorld.y, airPosWorld.z,
                            this.isCloseDeletion
                        );
                        if (cell) {
                            cell.box.parent.remove(cell.box);
                        }
                    }

                    let hit = this.bvh.raycastFirst(ray, THREE.DoubleSide);
                    if (!hit) {
                        continue;
                    }

                    let boxDiffMm = Math.max(100, Math.min(depth * 0.4, 1000));
                    // add green box at ray.origin + ray.direction * depth;
                    let added = depth + boxDiffMm < hit.distance * 1000;
                    // add red box at hit.point
                    let removed = depth - boxDiffMm > hit.distance * 1000;

                    if (!added && !removed) {
                        continue;
                    }

                    let boxPosWorld = hit.point;
                    if (added) {
                        boxPosWorld.copy(ray.origin);
                        let diffVec = ray.direction.clone();
                        diffVec.multiplyScalar(depth / 1000);
                        boxPosWorld.add(diffVec);
                    }

                    let existingBox = this.addedRemovedOct.getOct(boxPosWorld.x, boxPosWorld.y, boxPosWorld.z);
                    if (existingBox && existingBox.pos.distanceToSquared(boxPosWorld) < this.res * this.res) {
                        existingBox.box._age = MAX_AGE;
                        continue;
                    }


                    let box = new THREE.Mesh(this.baseGeo, added ? this.addedMat : this.removedMat);
                    box.scale.set(this.res * 1000, this.res * 1000, this.res * 1000);
                    box._age = MAX_AGE;
                    this.container.add(box);

                    // a point in space aligned to the voxel grid
                    const centerX = (this.navmesh.minX + this.navmesh.maxX) / 2 + this.res / 2;
                    const centerY = (this.navmesh.minY + this.navmesh.maxY) / 2 + this.res / 2;
                    const centerZ = (this.navmesh.minZ + this.navmesh.maxZ) / 2 + this.res / 2;
                    // Use this point in space on the grid to align our box
                    // position to the grid
                    let dx = Math.round((boxPosWorld.x - centerX) / this.res) * this.res;
                    let dy = Math.round((boxPosWorld.y - centerY) / this.res) * this.res;
                    let dz = Math.round((boxPosWorld.z - centerZ) / this.res) * this.res;

                    box.position.set(
                        (centerX + dx) * 1000,
                        (centerY + dy) * 1000,
                        (centerZ + dz) * 1000
                    );
                    box.rotation.set(0, 0, 0);

                    this.addedRemovedOct.insert(
                        boxPosWorld.x, boxPosWorld.y, boxPosWorld.z,
                        {
                            box,
                            pos: boxPosWorld,
                        }
                    );
                }
            }
            // Cull any boxes that have not been seen for a long time
            this.addedRemovedOct.filterOldBoxes();
        }
    };
})(realityEditor.gui.ar.desktopRenderer);

