/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace('realityEditor.device.multiclientUI');

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function() {
    let allConnectedCameras = {};
    let isCameraSubscriptionActiveForObject = {};

    const USE_ICOSAHEDRON = false;
    let showViewCones = false;

    const wireVertex = `
        attribute vec3 center;
        varying vec3 vCenter;
        void main() {
            vCenter = center;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const wireFragment = `
        uniform float thickness;
        uniform vec3 color;
        varying vec3 vCenter;

        void main() {
            vec3 afwidth = fwidth(vCenter.xyz);
            vec3 edge3 = smoothstep((thickness - 1.0) * afwidth, thickness * afwidth, vCenter.xyz);
            float edge = 1.0 - min(min(edge3.x, edge3.y), edge3.z);
            gl_FragColor.rgb = gl_FrontFacing ? color : (color * 0.5);
            gl_FragColor.a = edge;
        }
    `;

    const wireMat = new THREE.ShaderMaterial({
        uniforms: {
            thickness: {
                value: 5.0,
            },
            color: {
                value: new THREE.Color(0.9, 0.9, 1.0),
            },
        },
        vertexShader: wireVertex,
        fragmentShader: wireFragment,
        side: THREE.DoubleSide,
        alphaToCoverage: true,
    });
    wireMat.extensions.derivatives = true;
    window.wireMat = wireMat;

    function initService() {
        if (!realityEditor.device.desktopAdapter || !realityEditor.device.KeyboardListener || !realityEditor.gui.getMenuBar) {
            setTimeout(initService, 100);
            return;
        }

        if (!realityEditor.device.environment.isDesktop()) { return; }

        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            setTimeout(function() {
                setupWorldSocketSubscriptionsIfNeeded(objectKey);
            }, 100); // give time for bestWorldObject to update before checking
        });

        update();

        let keyboard = new realityEditor.device.KeyboardListener();
        keyboard.onKeyDown(function(code) {
            if (realityEditor.device.keyboardEvents.isKeyboardActive()) { return; } // ignore if a tool is using the keyboard

            // while shift is down, turn on the laser beam
            if (code === keyboard.keyCodes.SHIFT) {
                let touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                realityEditor.avatar.setBeamOn(touchPosition.x, touchPosition.y);
            }
        });
        keyboard.onKeyUp(function(code) {
            if (realityEditor.device.keyboardEvents.isKeyboardActive()) { return; } // ignore if a tool is using the keyboard

            // when shift is released, turn off the laser beam
            if (code === keyboard.keyCodes.SHIFT) {
                let touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                realityEditor.avatar.setBeamOff(touchPosition.x, touchPosition.y);
            }
        });

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ViewCones, (toggled) => {
            showViewCones = toggled;

            Object.keys(allConnectedCameras).forEach(function(editorId) {
                // let cameraMatrix = allConnectedCameras[editorId];
                let coneMesh = realityEditor.gui.threejsScene.getObjectByName('camera_' + editorId + '_coneMesh');
                let coneMesh2 = realityEditor.gui.threejsScene.getObjectByName('camera_' + editorId + '_coneMesh2');
                if (coneMesh && coneMesh2) {
                    coneMesh.visible = showViewCones;
                    coneMesh2.visible = showViewCones;
                }
            });
        });
    }

    function setupWorldSocketSubscriptionsIfNeeded(objectKey) {
        if (isCameraSubscriptionActiveForObject[objectKey]) {
            return;
        }

        // subscribe to remote operator camera positions
        // right now this assumes there will only be one world object in the network
        let object = realityEditor.getObject(objectKey);
        if (object && (object.isWorldObject || object.type === 'world')) {
            realityEditor.network.realtime.subscribeToCameraMatrices(objectKey, onCameraMatrix);
            isCameraSubscriptionActiveForObject[objectKey] = true;
        }
    }

    function onCameraMatrix(data) {
        let msgData = JSON.parse(data);
        if (typeof msgData.cameraMatrix !== 'undefined' && typeof msgData.editorId !== 'undefined') {
            allConnectedCameras[msgData.editorId] = msgData.cameraMatrix;
        }
    }

    // helper function to generate an integer hash from a string (https://stackoverflow.com/a/15710692)
    function hashCode(s) {
        return s.split("").reduce(function(a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
    }

    function update() {
        // this remote operator's camera position already gets sent in desktopCamera.js
        // here we render boxes at the location of each other camera...

        try {
            Object.keys(allConnectedCameras).forEach(function(editorId) {
                let cameraMatrix = allConnectedCameras[editorId];
                let existingMesh = realityEditor.gui.threejsScene.getObjectByName('camera_' + editorId);
                if (!existingMesh) {
                    // each client gets a random but consistent color based on their editorId
                    let id = Math.abs(hashCode(editorId));
                    const color = `hsl(${(id % Math.PI) * 360 / Math.PI}, 100%, 50%)`;

                    // render either a simple box, or a more complicated icosahedron, located at the remote camera position
                    let mesh;
                    if (USE_ICOSAHEDRON) {
                        const geo = new THREE.IcosahedronBufferGeometry(100);
                        geo.deleteAttribute('normal');
                        geo.deleteAttribute('uv');

                        const vectors = [
                            new THREE.Vector3(1, 0, 0),
                            new THREE.Vector3(0, 1, 0),
                            new THREE.Vector3(0, 0, 1)
                        ];

                        const position = geo.attributes.position;
                        const centers = new Float32Array(position.count * 3);

                        for (let i = 0, l = position.count; i < l; i ++) {
                            vectors[i % 3].toArray(centers, i * 3);
                        }

                        geo.setAttribute('center', new THREE.BufferAttribute(centers, 3));

                        const mat = wireMat.clone();
                        mat.uniforms.color.value = new THREE.Color(color);
                        mesh = new THREE.Mesh(geo, mat);
                    } else {
                        let cubeSize = 50;
                        const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                        const mat = new THREE.MeshBasicMaterial({color: color});
                        mesh = new THREE.Mesh(geo, mat);
                    }

                    const fov = 0.1 * Math.PI;
                    const points = [
                        // new THREE.Vector2(100 * Math.sin(fov), 100 * Math.cos(fov)),
                        new THREE.Vector2(0, 0),
                        new THREE.Vector2(15 * 1000 * Math.sin(fov), 15 * 1000 * Math.cos(fov)),
                    ];
                    const coneGeo = new THREE.LatheGeometry(points, 4);
                    const coneMesh = new THREE.Mesh(
                        coneGeo,
                        new THREE.MeshBasicMaterial({
                            color: new THREE.Color(color),
                            transparent: true,
                            depthWrite: false,
                            opacity: 0.05,
                        })
                    );
                    coneMesh.name = 'camera_' + editorId + '_coneMesh';
                    coneMesh.rotation.x = -Math.PI / 2;
                    coneMesh.rotation.y = Math.PI / 4;
                    coneMesh.position.z = 0; // 7.5 * 1000;

                    const coneMesh2 = new THREE.Mesh(
                        coneGeo,
                        new THREE.MeshBasicMaterial({
                            color: new THREE.Color(color),
                            wireframe: true,
                        })
                    );
                    coneMesh2.name = 'camera_' + editorId + '_coneMesh2';
                    coneMesh2.rotation.x = -Math.PI / 2;
                    coneMesh2.rotation.y = Math.PI / 4;
                    coneMesh2.position.z = 0; // 7.5 * 1000;

                    if (!showViewCones) {
                        coneMesh.visible = false;
                        coneMesh2.visible = false;
                    }

                    existingMesh = new THREE.Group();
                    existingMesh.add(coneMesh);
                    existingMesh.add(coneMesh2);
                    existingMesh.add(mesh);

                    existingMesh.name = 'camera_' + editorId;
                    existingMesh.matrixAutoUpdate = false;
                    realityEditor.gui.threejsScene.addToScene(existingMesh);
                }

                const ANIMATE = false;
                if (ANIMATE) {
                    // let animatedMatrix = realityEditor.gui.ar.utilities.tweenMatrix(existingMesh.matrix.elements, cameraMatrix, 0.05);
                    let animatedMatrix = realityEditor.gui.ar.utilities.animationVectorLinear(existingMesh.matrix.elements, cameraMatrix, 30);
                    realityEditor.gui.threejsScene.setMatrixFromArray(existingMesh.matrix, animatedMatrix);
                } else {
                    realityEditor.gui.threejsScene.setMatrixFromArray(existingMesh.matrix, cameraMatrix);
                }
            });
        } catch (e) {
            console.warn(e);
        }

        requestAnimationFrame(update);
    }

    realityEditor.addons.addCallback('init', initService);
})(realityEditor.device.multiclientUI);
