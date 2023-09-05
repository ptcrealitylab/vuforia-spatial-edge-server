createNameSpace('realityEditor.device.cameraVis');

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {rvl} from '../../thirdPartyCode/rvl/index.js';
import RVLParser from '../../thirdPartyCode/rvl/RVLParser.js';
import { Spaghetti } from '../../src/humanPose/spaghetti.js';

(function(exports) {
    const debug = false;
    const ZDEPTH = false;
    const ENABLE_PICTURE_IN_PICTURE = false;
    const FIRST_PERSON_CANVAS = false;
    const DEPTH_REPR_PNG = false;
    const DEPTH_WIDTH = 256;
    const DEPTH_HEIGHT = 144;
    const CONNECTION_TIMEOUT_MS = 10000;
    const PATCH_KEY_PREFIX = 'realityEditor.device.cameraVis.patch';
    const PROXY = /(\w+\.)?toolboxedge.net/.test(window.location.host);
    const ShaderMode = {
        SOLID: 'SOLID',
        POINT: 'POINT',
        HOLO: 'HOLO',
        DIFF: 'DIFF',
        FIRST_PERSON: 'FIRST_PERSON',
    };

    const enabledShaderModes = [
        ShaderMode.SOLID,
        ShaderMode.DIFF,
        ShaderMode.POINT,
        ShaderMode.HOLO,
    ];

    const urlBase = 'ws://' + window.location.hostname + ':31337/';
    const vertexShader = `
uniform sampler2D map;
uniform sampler2D mapDepth;

uniform float width;
uniform float height;
uniform float depthScale;
uniform float glPosScale;
uniform float patchLoading;

uniform float pointSize;
uniform vec2 focalLength;
uniform vec2 principalPoint;
const float pointSizeBase = 0.0;

varying vec2 vUv;
varying vec4 pos;

void main() {
  vUv = vec2(position.x / width, position.y / height);

  vec4 color = texture2D(mapDepth, vUv);
  ${(!ZDEPTH) ? `
  float depth = 5000.0 * (color.r + color.g / 255.0 + color.b / (255.0 * 255.0));
  ` : `
  // color.rgb are all 0-1 when we want them to be 0-255 so we can shift out across depth (mm?)
  int r = int(color.r * 255.0);
  int g = int(color.g * 255.0);
  int b = int(color.b * 255.0);

  float depth = float((r & 1) |
      ((g & 1) << 1) |
      ((b & 1) << 2) |
      ((r & (1 << 1)) << (3 - 1)) |
      ((g & (1 << 1)) << (4 - 1)) |
      ((b & (1 << 1)) << (5 - 1)) |
      ((r & (1 << 2)) << (6 - 2)) |
      ((g & (1 << 2)) << (7 - 2)) |
      ((b & (1 << 2)) << (8 - 2)) |
      ((r & (1 << 3)) << (9 - 3)) |
      ((g & (1 << 3)) << (10 - 3)) |
      ((b & (1 << 3)) << (11 - 3)) |
      ((r & (1 << 4)) << (12 - 4)) |
      ((g & (1 << 4)) << (13 - 4)) |
      ((b & (1 << 4)) << (14 - 4)) |
      ((r & (1 << 5)) << (15 - 5)) |
      ((g & (1 << 5)) << (16 - 5)) |
      ((b & (1 << 5)) << (17 - 5)) |
      ((r & (1 << 6)) << (18 - 6)) |
      ((g & (1 << 6)) << (19 - 6)) |
      ((b & (1 << 6)) << (20 - 6)) |
      ((r & (1 << 7)) << (21 - 7)) |
      ((g & (1 << 7)) << (22 - 7)) |
      ((b & (1 << 7)) << (23 - 7))) *
      (5000.0 / float(1 << 24));
  `}
  float z = (depth - 1.0) * patchLoading;

  // Projection code by @kcmic
  pos = vec4(
    (position.x - principalPoint.x) / focalLength.x * z,
    (position.y - principalPoint.y) / focalLength.y * z,
    -z,
    1.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;
  // gl_PointSize = pointSizeBase + pointSize * depth * depthScale;
  gl_PointSize = pointSizeBase + pointSize * depth * depthScale + glPosScale / gl_Position.w;
}`;

    const pointFragmentShader = `
uniform sampler2D map;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(map, vUv);
  gl_FragColor = vec4(color.r, color.g, color.b, 0.4);
}`;

    const holoFragmentShader = `
// color texture
uniform sampler2D map;
uniform float time;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;

void main() {
  // Depth in millimeters
  float depth = -pos.z;

  // Fade out beginning at 4.5 meters and be gone after 5.0
  float alphaDepth = clamp(2.0 * (5.0 - depth / 1000.0), 0.0, 1.0);

  // Hologram effect :)
  float alphaHolo = clamp(round(sin(pos.y / 3.0 - 40.0 * time) - 0.3), 0.0, 1.0) *
                clamp(sin(gl_FragCoord.x / 10.0 + gl_FragCoord.y + 40.0 * time) + sin(5.0 * time) + 1.5, 0.0, 1.0);
                // clamp(sin(sqrt(pos.x * pos.x + pos.z * pos.z) / 3.0 + 0.5) + sin(10.0 * time) + 1.5, 0.0, 1.0);

  // Normal vector of the depth mesh based on pos
  // Necessary to calculate manually since we're messing with gl_Position in the vertex shader
  vec3 normal = normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

  // pos.xyz is the ray looking out from the camera to this pixel
  // dot of pos.xyz and the normal is to what extent this pixel is flat
  // relative to the camera (alternatively, how much it's pointing at the
  // camera)
  // alphaDepth is thrown in here to incorporate the depth-based fade
  float alpha = abs(dot(normalize(pos.xyz), normal)) * alphaDepth * alphaHolo;

  // Sample the proper color for this pixel from the color image
  vec4 color = texture2D(map, vUv);

  gl_FragColor = vec4(color.rgb * vec3(0.1, 0.3, 0.3) + vec3(0.0, 0.7, 0.7), alpha);
}`;

    const solidFragmentShader = `
// color texture
uniform sampler2D map;
uniform vec3 borderColor;
uniform float borderEnabled;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;
uniform float depthMin;
uniform float depthMax;
uniform float patchLoading;

void main() {
  // Depth in millimeters
  float depth = -pos.z;

  // Fade out beginning at 4.5 meters and be gone after 5.0
  float alphaDepth = clamp(2.0 * (5.0 - depth / 1000.0), 0.0, 1.0);

  // Normal vector of the depth mesh based on pos
  // Necessary to calculate manually since we're messing with gl_Position in the vertex shader
  vec3 normal = normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

  // pos.xyz is the ray looking out from the camera to this pixel
  // dot of pos.xyz and the normal is to what extent this pixel is flat
  // relative to the camera (alternatively, how much it's pointing at the
  // camera)
  // Roughly calculated curve such that fading starts at 45 degrees and is done
  // by ~78
  float alphaNorm = clamp(1.75 * abs(dot(normalize(pos.xyz), normal)) - 0.2, 0.0, 1.0);
  // alphaDepth is thrown in here to incorporate the depth-based fade
  float alpha = alphaNorm * alphaDepth;

  alpha = alpha * (1.0 - step(depthMax, depth)) * step(depthMin, depth);

  // Sample the proper color for this pixel from the color image, fading from
  // white when animating patch loading
  float colorPatchLoading = patchLoading * patchLoading;
  vec4 color = mix(vec4(1.0, 1.0, 1.0, 1.0), texture2D(map, vUv), colorPatchLoading);

  float aspect = 1920.0 / 1080.0;
  float borderScale = 0.001 * 5000.0 / (depth + 50.0);
  float border = borderEnabled * clamp(
      (1.0 - step(borderScale, vUv.x)) +
      (1.0 - step(borderScale * aspect, vUv.y)) +
      step(1.0 - borderScale, vUv.x) +
      step(1.0 - borderScale * aspect, vUv.y),
      0.0,
      1.0
  );
  if (alpha < 0.02) {
      discard; // Necessary to prevent weird transparency errors when overlapping with self
  }
  // gl_FragColor = vec4(color.rgb, alpha);
  gl_FragColor = (1.0 - border) * vec4(color.rgb, alpha) + border * vec4(borderColor.rgb, alpha);

  // gl_FragColor = vec4(alphaNorm, alphaNorm, alphaDepth, 1.0);
}`;


    const firstPersonFragmentShader = `
// color texture
uniform sampler2D map;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;

void main() {
  // Sample the proper color for this pixel from the color image
  vec4 color = texture2D(map, vUv);

  gl_FragColor = vec4(color.rgb, 1.0);
}`;

    function setMatrixFromArray(matrix, array) {
        matrix.set(
            array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }

    class CameraVis {
        constructor(id, floorOffset, color) {
            this.id = id;
            this.firstPersonMode = false;
            this.shaderMode = ShaderMode.SOLID;
            this.container = new THREE.Group();
            // this.container.scale.set(0.001, 0.001, 0.001);
            // this.container.rotation.y = Math.PI;
            this.container.position.y = -floorOffset;
            this.container.rotation.x = Math.PI / 2;

            this.container.updateMatrix();
            this.container.updateMatrixWorld(true);
            this.container.matrixAutoUpdate = false;

            this.container.name = 'CameraVisContainer_' + id;
            this.lastUpdate = Date.now();
            this.phone = new THREE.Group();
            this.phone.matrixAutoUpdate = false;
            this.phone.frustumCulled = false;
            this.container.add(this.phone);

            this.maxDepthMeters = 5; // this goes down if lidar is pointed at a wall/floor/object closer than 5 meters

            let parentNode = realityEditor.sceneGraph.getVisualElement('CameraGroupContainer');
            // let parentNode = realityEditor.sceneGraph.getGroundPlaneNode();
            // let parentNode = realityEditor.sceneGraph.getSceneNodeById(elementId);
            let sceneGraphNodeId = realityEditor.sceneGraph.addVisualElement('CameraVis_' + id, parentNode);
            this.sceneGraphNode = realityEditor.sceneGraph.getSceneNodeById(sceneGraphNodeId);

            this.cameraMeshGroup = new THREE.Group();

            const geo = new THREE.BoxGeometry(100, 100, 80);
            if (!color) {
                let colorId = id;
                if (typeof id === 'string') {
                    colorId = 0;
                    for (let i = 0; i < id.length; i++) {
                        colorId ^= id.charCodeAt(i);
                    }
                }
                let hue = ((colorId / 29) % Math.PI) * 360 / Math.PI;
                const colorStr = `hsl(${hue}, 100%, 50%)`;
                this.color = new THREE.Color(colorStr);
            } else {
                this.color = color;
            }
            this.colorRGB = [
                255 * this.color.r,
                255 * this.color.g,
                255 * this.color.b,
            ];
            this.cameraMeshGroupMat = new THREE.MeshBasicMaterial({color: this.color});
            const box = new THREE.Mesh(geo, this.cameraMeshGroupMat);
            box.name = 'cameraVisCamera';
            box.cameraVisId = this.id;
            this.cameraMeshGroup.add(box);

            const geoCone = new THREE.ConeGeometry(60, 180, 16, 1);
            const cone = new THREE.Mesh(geoCone, this.cameraMeshGroupMat);
            cone.rotation.x = -Math.PI / 2;
            cone.rotation.y = Math.PI / 8;
            cone.position.z = 65;
            cone.name = 'cameraVisCamera';
            cone.cameraVisId = this.id;
            this.cameraMeshGroup.add(cone);

            this.phone.add(this.cameraMeshGroup);

            this.texture = new THREE.Texture();
            this.texture.minFilter = THREE.LinearFilter;
            this.texture.magFilter = THREE.LinearFilter;
            this.texture.generateMipmaps = false;
            this.texture.isVideoTexture = true;
            this.texture.update = function() {
            };

            this.textureDepth = new THREE.Texture();
            this.textureDepth.minFilter = THREE.LinearFilter;
            this.textureDepth.magFilter = THREE.LinearFilter;
            this.textureDepth.generateMipmaps = false;
            this.textureDepth.isVideoTexture = true;
            this.textureDepth.update = function() {
            };

            this.material = null;
            this.mesh = null;

            if (debug) {
                this.setupDebugCubes();
            }

            this.setupPointCloud();

            this.time = performance.now();
            this.matrices = [];
            this.loading = {};

            this.historyPoints = [];
            // note: we will color the path in each point, rather than in the constructor
            this.historyMesh = new Spaghetti(this.historyPoints, null, 'Camera Spaghetti Line', {
                widthMm: 30,
                heightMm: 30,
                usePerVertexColors: true,
                wallBrightness: 0.6
            });

            // we add the historyMesh to scene because crossing up vector gets messed up by rotation if added to this.container
            realityEditor.gui.threejsScene.addToScene(this.historyMesh);
        }

        /**
         * Clone the current state of the mesh rendering part of this CameraVis
         * @return {THREE.Object3D} object containing all relevant meshes
         */
        clonePatch() {
            let key = PATCH_KEY_PREFIX + '-' + Date.now() + '.' + Math.floor(Math.random() * 10000);
            let serialization = {
                key,
                container: this.container.matrix.elements,
                phone: this.phone.matrix.elements,
                texture: this.texture.image.toDataURL(),
                textureDepth: this.textureDepth.image.toDataURL(),
            };
            try {
                window.localStorage.setItem(key, JSON.stringify(serialization));
            } catch (e) {
                console.error('Unable to persist patch', e);
            }

            return {
                key,
                patch: CameraVis.createPatch(
                    this.container.matrix,
                    this.phone.matrix,
                    this.texture.image,
                    this.textureDepth.image
                ),
            };
        }

        static createPatch(containerMatrix, phoneMatrix, textureImage, textureDepthImage) {
            let patch = new THREE.Group();
            patch.matrix.copy(containerMatrix);
            patch.matrixAutoUpdate = false;
            patch.matrixWorldNeedsUpdate = true;

            let phone = new THREE.Group();
            phone.matrix.copy(phoneMatrix);
            phone.matrixAutoUpdate = false;
            phone.matrixWorldNeedsUpdate = true;
            phone.frustumCulled = false;

            let texture = new THREE.Texture();
            // texture.minFilter = THREE.NearestFilter;
            // texture.magFilter = THREE.NearestFilter;
            // texture.minFilter = THREE.LinearFilter;
            // texture.magFilter = THREE.LinearFilter;
            // texture.generateMipmaps = false;

            let textureDepth = new THREE.Texture();
            // textureDepth.minFilter = THREE.NearestFilter;
            // textureDepth.magFilter = THREE.NearestFilter;
            // textureDepth.minFilter = THREE.LinearFilter;
            // textureDepth.magFilter = THREE.LinearFilter;
            // textureDepth.generateMipmaps = false;

            texture.image = textureImage;
            textureDepth.image = textureDepthImage;

            texture.needsUpdate = true;
            textureDepth.needsUpdate = true;

            let mesh = CameraVis.createPointCloud(texture, textureDepth, ShaderMode.SOLID);
            mesh.material.uniforms.patchLoading.value = 0;

            let lastTime = -1;
            function patchLoading(time) {
                if (lastTime < 0) {
                    lastTime = time;
                }
                // limit to 30fps
                let dt = Math.min(time - lastTime, 67);
                lastTime = time;
                mesh.material.uniforms.patchLoading.value += 8 * dt / 1000;
                if (mesh.material.uniforms.patchLoading.value < 1) {
                    window.requestAnimationFrame(patchLoading);
                } else {
                    mesh.material.uniforms.patchLoading.value = 1;
                }
            }
            window.requestAnimationFrame(patchLoading);

            phone.add(mesh);
            patch.add(phone);
            return patch;
        }

        setupDebugCubes() {
            let debugDepth = new THREE.MeshBasicMaterial({
                map: this.textureDepth,
            });
            let debugDepthCube = new THREE.Mesh(new THREE.PlaneGeometry(500, 500 * DEPTH_HEIGHT / DEPTH_WIDTH), debugDepth);
            this.container.add(debugDepthCube);
            debugDepthCube.position.set(400, 250, -1000);

            let debugColor = new THREE.MeshBasicMaterial({
                map: this.texture,
            });
            this.debugColorCube = new THREE.Mesh(new THREE.PlaneGeometry(100, 100 * 1080 / 1920), debugColor);
            // this.container.add(debugColorCube);
            this.debugColorCube.position.set(-180 * window.innerWidth / window.innerHeight, 140, -1000);
            this.debugColorCube.rotation.z = Math.PI;
        }

        toggleColorCube(i) {
            if (!this.debugColorCube || !this.debugColorCube.parent) {
                this.addColorCube(i);
            } else {
                this.removeColorCube();
            }
        }

        addColorCube(i) {
            if (!this.debugColorCube) {
                let debugColor = new THREE.MeshBasicMaterial({
                    map: this.texture,
                });
                this.debugColorCube = new THREE.Mesh(new THREE.PlaneGeometry(100, 100 * 1080 / 1920), debugColor);
                // this.container.add(debugColorCube);
                this.debugColorCube.rotation.z = Math.PI;
            }
            let x = -180 * window.innerWidth / window.innerHeight;
            let y = 140 - i * 100;
            this.debugColorCube.position.set(x, y, -1000);
            realityEditor.gui.threejsScene.addToScene(this.debugColorCube, {parentToCamera: true});
        }

        removeColorCube() {
            realityEditor.gui.threejsScene.removeFromScene(this.debugColorCube);
        }

        static createPointCloud(texture, textureDepth, shaderMode, borderColor) {
            const width = 640, height = 360;

            let geometry;
            if (shaderMode !== ShaderMode.POINT) {
                geometry = new THREE.PlaneBufferGeometry(width, height, DEPTH_WIDTH / 2, DEPTH_HEIGHT / 2);
                geometry.translate(width / 2, height / 2);
            } else {
                geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array(width * height * 3);

                for (let i = 0, j = 0, l = vertices.length; i < l; i += 3, j ++) {
                    vertices[i] = j % width;
                    vertices[i + 1] = Math.floor(j / width);
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            }

            const material = CameraVis.createPointCloudMaterial(texture, textureDepth, shaderMode, borderColor);

            let mesh;
            if (shaderMode !== ShaderMode.POINT) {
                mesh = new THREE.Mesh(geometry, material);
            } else {
                mesh = new THREE.Points(geometry, material);
            }
            mesh.scale.set(-1, 1, -1);
            mesh.frustumCulled = false;
            mesh.layers.enable(2);

            return mesh;
        }

        static createPointCloudMaterial(texture, textureDepth, shaderMode, borderColor) {
            const width = 640, height = 360;

            let borderEnabled = 1;
            if (!borderColor) {
                borderColor = new THREE.Color(0.0, 1.0, 0.0);
                borderEnabled = 0;
            }

            let fragmentShader;
            switch (shaderMode) {
            case ShaderMode.POINT:
                fragmentShader = pointFragmentShader;
                break;
            case ShaderMode.HOLO:
                fragmentShader = holoFragmentShader;
                break;
            case ShaderMode.FIRST_PERSON:
                fragmentShader = firstPersonFragmentShader;
                break;
            case ShaderMode.SOLID:
            case ShaderMode.DIFF:
            default:
                fragmentShader = solidFragmentShader;
                break;
            }

            let material = new THREE.ShaderMaterial({
                uniforms: {
                    depthMin: {value: 100},
                    depthMax: {value: 5000},
                    time: {value: window.performance.now()},
                    map: {value: texture},
                    mapDepth: {value: textureDepth},
                    width: {value: width},
                    height: {value: height},
                    depthScale: {value: 0.15 / 256}, // roughly 1 / 1920
                    glPosScale: {value: 20000}, // 0.15 / 256}, // roughly 1 / 1920
                    // pointSize: { value: 8 * 0.666 * 0.15 / 256 },
                    pointSize: { value: 2 * 0.666 },
                    borderColor: { value: borderColor },
                    borderEnabled: { value: borderEnabled },
                    // Fraction that this is done loading (1.0 for completed or not-patch)
                    patchLoading: { value: 1.0 },
                    // Defaults taken from iPhone 13 Pro Max
                    focalLength: { value: new THREE.Vector2(1393.48523 / 1920 * width, 1393.48523 / 1080 * height) },
                    principalPoint: { value: new THREE.Vector2(959.169433 / 1920 * width, 539.411926 / 1080 * height) },
                },
                vertexShader,
                fragmentShader,
                // blending: THREE.AdditiveBlending,
                depthTest: shaderMode !== ShaderMode.FIRST_PERSON,
                // depthWrite: false,
                transparent: true
            });

            return material;
        }

        setupPointCloud() {
            const mesh = CameraVis.createPointCloud(this.texture, this.textureDepth, this.shaderMode, this.color);

            this.mesh = mesh;
            this.material = mesh.material;

            this.phone.add(mesh);
        }

        update(mat, delayed, rawMatricesMsg) {
            let now = performance.now();
            if (this.shaderMode === ShaderMode.HOLO) {
                this.material.uniforms.time.value = window.performance.now();
            }
            this.lastUpdate = now;


            if (rawMatricesMsg) {
                let width = this.material.uniforms.width.value;
                let height = this.material.uniforms.height.value;
                let rawWidth = rawMatricesMsg.imageSize[0];
                let rawHeight = rawMatricesMsg.imageSize[1];

                this.material.uniforms.focalLength.value = new THREE.Vector2(
                    rawMatricesMsg.focalLength[0] / rawWidth * width,
                    rawMatricesMsg.focalLength[1] / rawHeight * height,
                );
                this.material.uniforms.principalPoint.value = new THREE.Vector2(
                    rawMatricesMsg.principalPoint[0] / rawWidth * width,
                    rawMatricesMsg.principalPoint[1] / rawHeight * height,
                );
            }

            if (this.time > now || !delayed) {
                this.setMatrix(mat);
                return;
            }
            this.matrices.push({
                matrix: mat,
                time: now,
            });
        }

        setTime(time) {
            this.time = time;
            if (this.matrices.length === 0) {
                return;
            }
            let latest = this.matrices[0];
            if (latest.time > time) {
                return;
            }
            let latestI = 0;
            for (let i = 1; i < this.matrices.length; i++) {
                let mat = this.matrices[i];
                if (mat.time > time) {
                    break;
                }
                latest = mat;
                latestI = i;
            }
            this.matrices.splice(0, latestI + 1);

            this.setMatrix(latest.matrix);
        }

        getSceneNodeMatrix() {
            let matrix = this.phone.matrixWorld.clone();

            let initialVehicleMatrix = new THREE.Matrix4().fromArray([
                -1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, 1,
            ]);
            matrix.multiply(initialVehicleMatrix);

            return matrix;
        }

        setMatrix(newMatrix) {
            setMatrixFromArray(this.phone.matrix, newMatrix);
            this.phone.updateMatrixWorld(true);
            this.texture.needsUpdate = true;
            this.textureDepth.needsUpdate = true;

            if (this.cutoutViewFrustum) {
                realityEditor.gui.ar.desktopRenderer.updateAreaGltfForCamera(this.id, this.phone.matrixWorld, this.maxDepthMeters);
            }

            this.hideNearCamera(newMatrix[12], newMatrix[13], newMatrix[14]);
            let localHistoryPoint = new THREE.Vector3( newMatrix[12], newMatrix[13], newMatrix[14]);

            // history point needs to be transformed into the groundPlane coordinate system
            let worldHistoryPoint = this.container.localToWorld(localHistoryPoint);
            let rootNode = realityEditor.sceneGraph.getSceneNodeById('ROOT');
            let gpNode = realityEditor.sceneGraph.getGroundPlaneNode();
            let gpHistoryPoint = realityEditor.sceneGraph.convertToNewCoordSystem(worldHistoryPoint, rootNode, gpNode);

            let nextHistoryPoint = {
                x: gpHistoryPoint.x,
                y: gpHistoryPoint.y,
                z: gpHistoryPoint.z,
                color: this.colorRGB,
                timestamp: Date.now()
            };

            let addToHistory = this.historyPoints.length === 0;
            if (this.historyPoints.length > 0) {
                let lastHistoryPoint = this.historyPoints[this.historyPoints.length - 1];
                let diffSq = (lastHistoryPoint.x - nextHistoryPoint.x) * (lastHistoryPoint.x - nextHistoryPoint.x) +
                    (lastHistoryPoint.y - nextHistoryPoint.y) * (lastHistoryPoint.y - nextHistoryPoint.y) +
                    (lastHistoryPoint.z - nextHistoryPoint.z) * (lastHistoryPoint.z - nextHistoryPoint.z);

                addToHistory = diffSq > 100 * 100;
            }

            if (addToHistory) {
                this.historyPoints.push(nextHistoryPoint);
                this.historyMesh.setPoints(this.historyPoints);
            }

            if (this.sceneGraphNode) {
                this.sceneGraphNode.setLocalMatrix(newMatrix);
            }

            if (this.firstPersonMode) {
                let matrix = this.getSceneNodeMatrix();
                let eye = new THREE.Vector3(0, 0, 0);
                eye.applyMatrix4(matrix);
                let target = new THREE.Vector3(0, 0, -1);
                target.applyMatrix4(matrix);
                matrix.lookAt(eye, target, new THREE.Vector3(0, 1, 0));
                realityEditor.sceneGraph.setCameraPosition(matrix.elements);
            }

            if (this.shaderMode === ShaderMode.DIFF) {
                realityEditor.device.visualDiff.showDiff(this);
            }
        }

        hideNearCamera() {
            let mat = this.phone.matrix.clone();
            mat.premultiply(this.container.matrix);
            const x = mat.elements[12];
            const y = mat.elements[13];
            const z = mat.elements[14];

            let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
            const cameraX = cameraNode.worldMatrix[12];
            const cameraY = cameraNode.worldMatrix[13];
            const cameraZ = cameraNode.worldMatrix[14];

            let diffSq = (cameraX - x) * (cameraX - x) +
                (cameraY - y) * (cameraY - y) +
                (cameraZ - z) * (cameraZ - z);

            if (diffSq < 3000 * 3000) {
                if (this.cameraMeshGroup.visible) {
                    this.cameraMeshGroup.visible = false;
                }
            } else if (!this.cameraMeshGroup.visible) {
                this.cameraMeshGroup.visible = true;
            }
        }

        setShaderMode(shaderMode) {
            if (shaderMode !== this.shaderMode) {
                this.shaderMode = shaderMode;

                if (this.matDiff) {
                    this.matDiff = null;
                }
                this.material = CameraVis.createPointCloudMaterial(this.texture, this.textureDepth, this.shaderMode, this.color);
                this.mesh.material = this.material;
            }
        }

        enableFirstPersonMode() {
            this.firstPersonMode = true;
            if (this.shaderMode === ShaderMode.SOLID) {
                this.setShaderMode(ShaderMode.FIRST_PERSON);
            }
        }

        disableFirstPersonMode() {
            this.firstPersonMode = false;
            if (this.shaderMode === ShaderMode.FIRST_PERSON) {
                this.setShaderMode(ShaderMode.SOLID);
            }
        }

        enableFrustumCutout() {
            this.cutoutViewFrustum = true;
        }

        disableFrustumCutout() {
            this.cutoutViewFrustum = false;
            realityEditor.gui.threejsScene.removeMaterialCullingFrustum(this.id);
        }

        /**
         * @param {THREE.Color} color
         */
        setColor(color) {
            this.color = color;
            this.cameraMeshGroupMat.color = color;
            if (this.material && this.material.uniforms.borderColor) {
                this.material.uniforms.borderColor.value = color;
            }
        }

        add() {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }

        remove() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
        }
    }

    exports.CameraVisCoordinator = class CameraVisCoordinator {
        constructor(floorOffset) {
            this.voxelizer = null;
            this.webRTCCoordinator = null;
            this.cameras = {};
            this.patches = {};
            this.visible = true;
            this.spaghettiVisible = false;
            this.currentShaderModeIndex = 0;
            this.floorOffset = floorOffset;
            this.depthCanvasCache = {};
            this.colorCanvasCache = {};
            this.showCanvasTimeout = null;
            this.callbacks = {
                onCameraVisCreated: [],
                onCameraVisRemoved: [],
            };

            this.onAnimationFrame = this.onAnimationFrame.bind(this);
            window.requestAnimationFrame(this.onAnimationFrame);

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.PointClouds, (toggled) => {
                this.visible = toggled;
                for (let camera of Object.values(this.cameras)) {
                    camera.mesh.visible = this.visible;
                    camera.mesh.__hidden = !this.visible;
                }
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ResetPaths, () => {
                for (let camera of Object.values(this.cameras)) {
                    camera.historyPoints = [];
                    camera.historyMesh.setPoints(camera.historyPoints);
                }
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.SpaghettiMap, (toggled) => {
                this.spaghettiVisible = toggled;
                for (let camera of Object.values(this.cameras)) {
                    camera.historyMesh.visible = this.spaghettiVisible;
                }
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ClonePatch, () => {
                for (let camera of Object.values(this.cameras)) {
                    const {key, patch} = camera.clonePatch();
                    realityEditor.gui.threejsScene.addToScene(patch);
                    this.patches[key] = patch;
                    // Hide for a bit to show the patch in space
                    camera.mesh.visible = false;
                    camera.mesh.__hidden = true;

                    setTimeout(() => {
                        camera.mesh.visible = this.visible;
                        camera.mesh.__hidden = !this.visible;
                    }, 300);
                }
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.UndoPatch, () => {
                const keys = this.getPatchKeys();
                this.undoPatch(keys[0]);
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.UndoPatches, () => {
                const keys = this.getPatchKeys();
                for (const key of keys) {
                    this.undoPatch(key);
                }
            });

            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.CutoutViewFrustums, (toggled) => {
                this.cutoutViewFrustums = toggled;
                for (let camera of Object.values(this.cameras)) {
                    if (toggled) {
                        camera.enableFrustumCutout();
                    } else {
                        camera.disableFrustumCutout();
                    }
                }
            });

            this.onPointerDown = this.onPointerDown.bind(this);

            let threejsCanvas = document.getElementById('mainThreejsCanvas');
            if (threejsCanvas && ENABLE_PICTURE_IN_PICTURE) {
                threejsCanvas.addEventListener('pointerdown', this.onPointerDown);
            }

            this.startWebRTC();
            this.restorePatches();
        }

        onAnimationFrame() {
            let now = performance.now();
            for (let camera of Object.values(this.cameras)) {
                if (camera.mesh.__hidden) {
                    camera.mesh.visible = false;
                    continue;
                }
                if (now - camera.lastUpdate > CONNECTION_TIMEOUT_MS) {
                    camera.remove();
                    delete this.cameras[camera.id];
                    this.callbacks.onCameraVisRemoved.forEach(cb => {
                        cb(camera);
                    });
                } else if (!camera.mesh.visible) {
                    camera.mesh.visible = true;
                }
            }
            window.requestAnimationFrame(this.onAnimationFrame);
        }

        connectWsToMatrix(url) {
            if (PROXY) {
                const ws = realityEditor.cloud.socket;

                ws.on('message', async (route, body, cbObj, bin) => {
                    if (body.id !== 'matrix') {
                        return;
                    }

                    const id = bin.data[0];
                    // const pktType = bytes[1];
                    // if (pktType === PKT_MATRIX) {
                    const mat = new Float32Array(bin.data.slice(1, bin.data.length).buffer);
                    // }
                    this.updateMatrix(id, mat, true, null);
                });
            } else {
                const ws = new WebSocket(url);
                ws.addEventListener('message', async (msg) => {
                    const bytes = new Uint8Array(await msg.data.slice(0, 1).arrayBuffer());
                    const id = bytes[0];
                    const mat = new Float32Array(await msg.data.slice(1, msg.data.size).arrayBuffer());
                    this.updateMatrix(id, mat, true, null);
                });
            }
        }

        updateMatrix(id, mat, delayed, rawMatricesMsg) {
            if (!this.cameras[id]) {
                this.createCameraVis(id);
            }
            this.cameras[id].update(mat, delayed, rawMatricesMsg);
        }

        connect() {
            const connectWsToTexture = (url, textureKey, mimetype) => {
                if (PROXY) {
                    const ws = realityEditor.cloud.socket;

                    ws.on('message', async (route, body, cbObj, bin) => {
                        if (body.id !== 'depth' && body.id !== 'color') {
                            return;
                        }
                        if (body.id === 'depth' && textureKey !== 'textureDepth') {
                            return;
                        }
                        if (body.id === 'color' && textureKey !== 'texture') {
                            return;
                        }

                        const bytes = new Uint8Array(bin.data.slice(0, 1));
                        const id = bytes[0];
                        const imageBlob = new Blob([bin.data.slice(1, bin.data.length).buffer], {type: mimetype});
                        const imageUrl = URL.createObjectURL(imageBlob);
                        this.renderPointCloud(id, textureKey, imageUrl);
                    });
                } else {
                    const ws = new WebSocket(url);

                    ws.addEventListener('message', async (msg) => {
                        const bytes = new Uint8Array(await msg.data.slice(0, 1).arrayBuffer());
                        const id = bytes[0];
                        if (textureKey === 'textureDepth' && !DEPTH_REPR_PNG) {
                            const parser = new RVLParser(await msg.data.slice(1, msg.data.size).arrayBuffer());
                            const rawDepth = rvl.decompress(parser.currentFrame.rvlBuf);
                            this.renderPointCloudRawDepth(id, rawDepth);
                            return;
                        }

                        const imageBlob = msg.data.slice(1, msg.data.size, mimetype);
                        const imageUrl = URL.createObjectURL(imageBlob);
                        this.renderPointCloud(id, textureKey, imageUrl);
                    });
                }
            };

            const urlColor = urlBase + 'color';
            const urlDepth = urlBase + 'depth';
            const urlMatrix = urlBase + 'matrix';

            connectWsToTexture(urlColor, 'texture', 'image/jpeg');
            connectWsToTexture(urlDepth, 'textureDepth', 'image/png');
            this.connectWsToMatrix(urlMatrix);
        }

        startWebRTC() {
            const network = 'cam' + Math.floor(Math.random() * 1000);

            const ws = PROXY ? realityEditor.cloud.socket : new WebSocket(urlBase + 'signalling');
            this.webRTCCoordinator = new realityEditor.device.cameraVis.WebRTCCoordinator(this, ws, network);
        }

        muteMicrophone() {
            if (!this.webRTCCoordinator) return;
            this.webRTCCoordinator.mute();
        }

        unmuteMicrophone() {
            if (!this.webRTCCoordinator) return;
            this.webRTCCoordinator.unmute();
        }

        renderPointCloud(id, textureKey, imageUrl) {
            if (!this.cameras[id]) {
                this.createCameraVis(id);
            }
            if (this.cameras[id].loading[textureKey]) {
                return;
            }
            this.cameras[id].loading[textureKey] = true;
            // const pktType = bytes[1];
            // if (pktType === PKT_MATRIX) {
            //   const text = await msg.data.slice(2, msg.data.length).text();
            //   const mat = JSON.parse(text);
            // }

            const image = new Image();

            let start = window.performance.now();
            image.onload = () => {
                const tex = this.cameras[id][textureKey];
                tex.dispose();
                // hmmmmm
                // most efficient would be if this had a data url for its src
                // data url = 'data:image/(png|jpeg);' + base64(blob)
                if (textureKey === 'textureDepth') {
                    if (!this.depthCanvasCache.hasOwnProperty(id)) {
                        let canvas = document.createElement('canvas');
                        this.depthCanvasCache[id] = {
                            canvas,
                            context: canvas.getContext('2d'),
                        };
                    }
                    let {canvas, context} = this.depthCanvasCache[id];
                    if (canvas.width !== image.width || canvas.height !== image.height) {
                        canvas.width = image.width;
                        canvas.height = image.height;
                    }
                    context.drawImage(image, 0, 0, image.width, image.height);
                } else {
                    if (!this.colorCanvasCache.hasOwnProperty(id)) {
                        let canvas = document.createElement('canvas');
                        this.colorCanvasCache[id] = {
                            canvas,
                            context: canvas.getContext('2d'),
                        };
                    }
                    let {canvas, context} = this.colorCanvasCache[id];
                    if (canvas.width !== image.width || canvas.height !== image.height) {
                        canvas.width = image.width;
                        canvas.height = image.height;
                    }
                    context.drawImage(image, 0, 0, image.width, image.height);
                }
                this.finishRenderPointCloudCanvas(id, textureKey, start);
                URL.revokeObjectURL(imageUrl);
            };
            image.onerror = (e) => {
                console.error(e);
            };
            image.src = imageUrl;
        }

        renderPointCloudRawDepth(id, rawDepth) {
            const textureKey = 'textureDepth';

            if (!this.cameras[id]) {
                this.createCameraVis(id);
            }
            if (this.cameras[id].loading[textureKey]) {
                return;
            }
            this.cameras[id].loading[textureKey] = true;
            const tex = this.cameras[id][textureKey];
            tex.dispose();

            if (!this.depthCanvasCache.hasOwnProperty(id)) {
                let canvas = document.createElement('canvas');
                let context = canvas.getContext('2d');
                let imageData = context.createImageData(DEPTH_WIDTH, DEPTH_HEIGHT);
                this.depthCanvasCache[id] = {
                    canvas,
                    context,
                    imageData,
                };
            }

            let {canvas, context, imageData} = this.depthCanvasCache[id];
            canvas.width = DEPTH_WIDTH;
            canvas.height = DEPTH_HEIGHT;
            let maxDepth14bits = 0;
            for (let i = 0; i < DEPTH_WIDTH * DEPTH_HEIGHT; i++) {
                if (rawDepth[i] > maxDepth14bits) {
                    maxDepth14bits = rawDepth[i];
                }
                // We get 14 bits of depth information from the RVL-encoded
                // depth buffer. Note that this means the blue channel is
                // always zero
                let depth24Bits = rawDepth[i] << (24 - 14); // * 5 / (1 << 14);
                if (depth24Bits > 0xffffff) {
                    depth24Bits = 0xffffff;
                }
                let b = depth24Bits & 0xff;
                let g = (depth24Bits >> 8) & 0xff;
                let r = (depth24Bits >> 16) & 0xff;
                imageData.data[4 * i + 0] = r;
                imageData.data[4 * i + 1] = g;
                imageData.data[4 * i + 2] = b;
                imageData.data[4 * i + 3] = 255;
            }
            this.cameras[id].maxDepthMeters = 5 * (maxDepth14bits / (1 << 14));

            context.putImageData(imageData, 0, 0);
            this.finishRenderPointCloudCanvas(id, textureKey, -1);

            if (this.voxelizer) {
                this.voxelizer.raycastDepth(
                    this.cameras[id].phone, {
                        width: DEPTH_WIDTH,
                        height: DEPTH_HEIGHT,
                    },
                    rawDepth
                );
            }
        }

        finishRenderPointCloudCanvas(id, textureKey, start) {
            const tex = this.cameras[id][textureKey];

            if (textureKey === 'textureDepth') {
                if (!this.depthCanvasCache.hasOwnProperty(id)) {
                    let canvas = document.createElement('canvas');
                    this.depthCanvasCache[id] = {
                        canvas,
                        context: canvas.getContext('2d'),
                    };
                }
                let {canvas} = this.depthCanvasCache[id];
                tex.image = canvas;
            } else {
                if (!this.colorCanvasCache.hasOwnProperty(id)) {
                    let canvas = document.createElement('canvas');
                    this.colorCanvasCache[id] = {
                        canvas,
                        context: canvas.getContext('2d'),
                    };
                }
                let {canvas} = this.colorCanvasCache[id];
                tex.image = canvas;
            }
            // tex.needsUpdate = true;
            // let end = window.performance.now();
            if (textureKey === 'texture') {
                // We know that capture takes 30ms
                // Transmission takes ??s
                this.cameras[id].setTime(start + 40);
            }
            this.cameras[id].loading[textureKey] = false;
        }

        showFullscreenColorCanvas(id) {
            let cacheId = id;
            if (!this.cameras.hasOwnProperty(cacheId)) {
                cacheId = 'prov' + id;
            }

            if (FIRST_PERSON_CANVAS) {
                const doShowCanvas = !document.getElementById('colorCanvas' + cacheId) && !this.showCanvasTimeout;
                if (this.colorCanvasCache[cacheId] && doShowCanvas) {
                    let canvas = this.colorCanvasCache[cacheId].canvas;
                    canvas.style.position = 'absolute';
                    canvas.style.left = '0';
                    canvas.style.top = '0';
                    canvas.style.width = '100vw';
                    canvas.style.height = '100vh';
                    canvas.style.transform = 'rotate(180deg)';
                    // canvas.style.transition = 'opacity 1.0s ease-in-out';
                    // canvas.style.opacity = '0';
                    canvas.id = 'colorCanvas' + cacheId;
                    this.showCanvasTimeout = setTimeout(() => {
                        document.body.appendChild(canvas);
                        this.showCanvasTimeout = null;
                    }, 300);
                }
            } else {
                const camera = this.cameras[cacheId];
                if (camera) {
                    camera.enableFirstPersonMode();
                    camera.historyMesh.visible = false;
                }
            }
        }

        hideFullscreenColorCanvas(id) {
            let cacheId = id;
            if (!this.cameras.hasOwnProperty(cacheId)) {
                cacheId = 'prov' + id;
            }

            if (FIRST_PERSON_CANVAS) {
                let canvas = document.getElementById('colorCanvas' + cacheId);
                if (canvas && canvas.parentElement) {
                    canvas.parentElement.removeChild(canvas);
                }
            } else {
                const camera = this.cameras[cacheId];
                if (this.cameras[cacheId]) {
                    camera.disableFirstPersonMode();
                    camera.historyMesh.visible = this.spaghettiVisible;
                }
            }
        }

        loadPointCloud(id, textureUrl, textureDepthUrl, matrix) {
            this.renderPointCloud(id, 'texture', textureUrl);
            this.renderPointCloud(id, 'textureDepth', textureDepthUrl);
            this.updateMatrix(id, matrix, true, null);
        }

        hidePointCloud(id) {
            if (!this.cameras[id]) {
                console.log('No need to hide camera ' + id + ', it hasn\'t been created yet.');
                return;
            }
            let camera = this.cameras[id];
            if (camera.mesh) {
                camera.mesh.visible = false;
            }
        }

        onCameraVisCreated(cb) {
            this.callbacks.onCameraVisCreated.push(cb);
        }

        onCameraVisRemoved(cb) {
            this.callbacks.onCameraVisRemoved.push(cb);
        }

        /**
         * @param {string} id - id of cameravis to be on the lookout for
         */
        startRecheckColorInterval(id) {
            let recheckColorInterval = setInterval(() => {
                let colorStr = realityEditor.avatar.getAvatarColorFromProviderId(id);
                if (!colorStr) {
                    return;
                }
                let color = new THREE.Color(colorStr);
                this.cameras[id].setColor(color);
                clearInterval(recheckColorInterval);
            }, 3000);
        }

        createCameraVis(id) {
            if (debug) {
                console.log('new camera', id);
            }
            let color;
            let colorStr = realityEditor.avatar.getAvatarColorFromProviderId(id);
            if (!colorStr) {
                console.warn('no color for camera', id);
                // If it's a webrtc cameravis (id starts with prov) then we
                // should eventually get this avatar information
                if (id.startsWith('prov')) {
                    this.startRecheckColorInterval(id);
                }
            } else {
                color = new THREE.Color(colorStr);
            }
            this.cameras[id] = new CameraVis(id, this.floorOffset, color);
            this.cameras[id].add();
            this.cameras[id].historyMesh.visible = this.spaghettiVisible;
            this.cameras[id].setShaderMode(enabledShaderModes[this.currentShaderModeIndex]);
            if (this.cutoutViewFrustums) {
                this.cameras[id].enableFrustumCutout();
            } else {
                this.cameras[id].disableFrustumCutout();
            }
            // these menubar shortcuts are disabled by default, enabled when at least one virtualizer connects
            realityEditor.gui.getMenuBar().setItemEnabled(realityEditor.gui.ITEM.PointClouds, true);
            realityEditor.gui.getMenuBar().setItemEnabled(realityEditor.gui.ITEM.SpaghettiMap, true);

            realityEditor.gui.getMenuBar().setItemEnabled(realityEditor.gui.ITEM.AdvanceCameraShader, true);

            realityEditor.gui.getMenuBar().setItemEnabled(realityEditor.gui.ITEM.ClonePatch, true);
            realityEditor.gui.getMenuBar().setItemEnabled(realityEditor.gui.ITEM.StopFollowing, true);
            Object.values(realityEditor.device.desktopCamera.perspectives).forEach(info => {
                realityEditor.gui.getMenuBar().setItemEnabled(info.menuBarName, true);
            });

            this.callbacks.onCameraVisCreated.forEach(cb => {
                cb(this.cameras[id]);
            });
        }

        onPointerDown(e) {
            let objectsToCheck = Object.values(this.cameras).map(cameraVis => {
                return cameraVis.cameraMeshGroup;
            });
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, objectsToCheck);

            intersects.forEach((intersect) => {
                if (intersect.object.name !== 'cameraVisCamera') {
                    return;
                }

                let id = intersect.object.cameraVisId;
                let i = Object.keys(this.cameras).indexOf('' + id);
                this.cameras[id].toggleColorCube(i);

                // stop propagation if we hit anything, otherwise pass the event on to the rest of the application
                e.stopPropagation();
            });
        }

        restorePatches() {
            const keys = Object.keys(window.localStorage).filter(key => {
                return key.startsWith(PATCH_KEY_PREFIX);
            });

            for (const key of keys) {
                const serialization = JSON.parse(window.localStorage[key]);
                const containerMatrix = new THREE.Matrix4().fromArray(serialization.container);
                const phoneMatrix = new THREE.Matrix4().fromArray(serialization.phone);
                const textureImage = document.createElement('img');
                textureImage.src = serialization.texture;
                const textureDepthImage = document.createElement('img');
                textureDepthImage.src = serialization.textureDepth;

                const patch = CameraVis.createPatch(
                    containerMatrix,
                    phoneMatrix,
                    textureImage,
                    textureDepthImage
                );
                realityEditor.gui.threejsScene.addToScene(patch);
                this.patches[key] = patch;
            }
        }

        /**
         * @return {Array<string>} patch keys
         */
        getPatchKeys() {
            let keys = Object.keys(window.localStorage).filter(key => {
                return key.startsWith(PATCH_KEY_PREFIX);
            });
            // Fall back to locally persisted patches
            if (keys.length === 0) {
                keys = Object.keys(this.patches);
            }
            if (keys.length === 0) {
                return;
            }
            keys.sort((keyA, keyB) => {
                let a = parseFloat(keyA.split('-')[1]);
                let b = parseFloat(keyB.split('-')[1]);
                return b - a;
            });

            return keys;
        }

        /**
         * @param {string} key - patch key
         */
        undoPatch(key) {
            try {
                window.localStorage.removeItem(key);
            } catch (e) {
                console.warn('Unable to remove patch from localStorage', key, e);
            }

            if (this.patches[key]) {
                realityEditor.gui.threejsScene.removeFromScene(this.patches[key]);
                delete this.patches[key];
            }
        }

        advanceShaderMode() {
            this.currentShaderModeIndex = (this.currentShaderModeIndex + 1) % enabledShaderModes.length;

            for (let camera of Object.values(this.cameras)) {
                camera.setShaderMode(enabledShaderModes[this.currentShaderModeIndex]);
            }
        }
    };

})(realityEditor.device.cameraVis);
