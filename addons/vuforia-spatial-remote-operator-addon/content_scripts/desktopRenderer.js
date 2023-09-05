/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace('realityEditor.gui.ar.desktopRenderer');

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { UNIFORMS, MAX_VIEW_FRUSTUMS } from '../../src/gui/ViewFrustum.js';
//import { NerfStudioConnection } from './NerfStudioConnection.js';


/**
 * @fileOverview realityEditor.device.desktopRenderer.js
 * For remote desktop operation: renders background graphics simulating the context streamed from a connected phone.
 * e.g. a point or plane for each marker, or an entire point cloud of the background contents
 */

(function(exports) {
    const PROXY = /(\w+\.)?toolboxedge.net/.test(window.location.host);

    /**
     * @type {Canvas} - the DOM element where the images streamed from a reality zone are rendered
     */
    var backgroundCanvas;
    /**
     * @type {Canvas}
     * Scratch space to draw and chroma-key the image from the RZ which is
     * drawing the point cloud and background
     */
    var primaryBackgroundCanvas;
    // Whether the primary canvas is ready for use in bg rendering
    var primaryDrawn = false;

    /**
     * @type {Canvas}
     * Scratch space to draw and chroma-key the image from the RZ which is
     * drawing only its point cloud
     */
    var secondaryBackgroundCanvas;
    // Whether the secondary canvas is ready for use in bg rendering
    var secondaryDrawn = false;

    var ONLY_REQUIRE_PRIMARY = true;

    // let gltfPath = null; //'./svg/office.glb'; //null; // './svg/BenApt1_authoring.glb';
    let isGlbLoaded = false;

    let gltf = null;
    let staticModelMode = false;
    let videoPlayback = null;
    let cameraVisCoordinator = null;
    let cameraVisSceneNodes = [];

    let cameraVisFrustums = [];
    
    // ---------------------------------------------------------------------

    let nerfCanvas = null;
    let nerfStudioConnection = null; // the NerfStudioConnection class instance

    // configure when the nerf renderer appears or disappears
    // for each variable (time, distance, verticalAngle), set BEGIN and END to the same value to disable animations
    // or make them a bit different to interpolate the opacity based on the bounds

    // how much time after the camera stops moving should we wait before showing the nerf view
    const BEGIN_FADE_TIME = 1350; // time in milliseconds
    const END_FADE_TIME = 1750;
    // how far away from the ground plane origin can we be before hiding the nerf
    const BEGIN_FADE_DISTANCE = 8000; // in millimeters
    const END_FADE_DISTANCE = 12000;
    // how low of a viewing angle can we have before hiding it (e.g. looking at floor = 0, looking level = PI/2, looking at ceiling = PI)
    const BEGIN_FADE_ANGLE = Math.PI * 0.5;
    const END_FADE_ANGLE = Math.PI * 0.75;

    // ---------------------------------------------------------------------

    exports.sendCameraToNerfStudio = (cameraMatrix) => {
        if (nerfStudioConnection) {
            nerfStudioConnection.sendCameraToNerfStudio(cameraMatrix);
        }
    };

    /**
     * Public init method to enable rendering if isDesktop
     */
    function initService() {
        if (!realityEditor.device.desktopAdapter) {
            setTimeout(initService, 100);
            return;
        }

        if (!realityEditor.device.environment.isDesktop()) { return; }

        // connectToNerfStudio();

        const renderingFlagName = 'loadingWorldMesh';
        realityEditor.device.environment.addSuppressedObjectRenderingFlag(renderingFlagName); // hide tools until the model is loaded

        // when a new object is detected, check if we need to create a socket connection with its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (isGlbLoaded) { return; } // only do this for the first world object detected

            let primaryWorldId = realityEditor.device.desktopAdapter.getPrimaryWorldId();
            let isConnectedViaIp = window.location.hostname.split('').every(char => '0123456789.'.includes(char)); // Already know hostname is valid, this is enough to check for IP
            let isSameIp = object.ip === window.location.hostname;
            let isWorldObject = object.isWorldObject || object.type === 'world';

            let allCriteriaMet;
            if (primaryWorldId) {
                allCriteriaMet = objectKey === primaryWorldId; // Connecting to specific world object via search param
            } else {
                if (isConnectedViaIp) {
                    allCriteriaMet = isSameIp && isWorldObject; // Connecting to same world object running on remote operator (excluding when connecting via domain name)
                } else {
                    allCriteriaMet = isWorldObject; // Otherwise, connect to first available world object
                }
            }

            if (!allCriteriaMet) {
                return;
            }

            if (objectKey.includes('_local')) {
                console.warn('Rejected local world object');
                return;
            }

            // try loading area target GLB file into the threejs scene
            isGlbLoaded = true;
            let gltfPath =  realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.glb');

            function checkExist() {
                fetch(gltfPath).then(res => {
                    if (!res.ok) {
                        setTimeout(checkExist, 500);
                    } else {
                        realityEditor.app.targetDownloader.createNavmesh(gltfPath, objectKey, createNavmeshCallback);
                    }
                }).catch(_ => {
                    setTimeout(checkExist, 500);
                });
            }

            function createNavmeshCallback(navmesh) {
                let floorOffset = navmesh.floorOffset * 1000;
                let buffer = 50;
                floorOffset += buffer;
                let groundPlaneMatrix = [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, floorOffset, 0, 1
                ];
                realityEditor.sceneGraph.setGroundPlanePosition(groundPlaneMatrix);

                realityEditor.device.desktopCamera.initService(floorOffset);

                let ceilingHeight = Math.max(
                    navmesh.maxY - navmesh.minY,
                    navmesh.maxX - navmesh.minX,
                    navmesh.maxZ - navmesh.minZ
                );
                let center = {
                    x: (navmesh.maxX + navmesh.minX) / 2,
                    y: navmesh.minY,
                    z: (navmesh.maxZ + navmesh.minZ) / 2,
                };
                realityEditor.gui.threejsScene.addGltfToScene(gltfPath, {x: 0, y: -floorOffset, z: 0}, {x: 0, y: 0, z: 0}, ceilingHeight, center, function(createdMesh) {

                    realityEditor.device.environment.clearSuppressedObjectRenderingFlag(renderingFlagName); // stop hiding tools

                    let endMarker = document.createElement('div');
                    endMarker.style.display = 'none';
                    endMarker.id = 'gltf-added';
                    document.body.appendChild(endMarker);

                    gltf = createdMesh;
                    gltf.name = 'areaTargetMesh';

                    const greyMaterial = new THREE.MeshBasicMaterial({
                        color: 0x777777,
                        wireframe: true,
                    });

                    gltf.traverse(obj => {
                        if (obj.type === 'Mesh' && obj.material) {
                            obj.oldMaterial = greyMaterial;
                        }
                    });
                    BEGIN_FADE_TIME
                    realityEditor.device.meshLine.inject();

                    // this will trigger any onLocalizedWithinWorld callbacks in the userinterface, such as creating the Avatar
                    let identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                    realityEditor.worldObjects.setOrigin(objectKey, identity);

                    let realityZoneVoxelizer;
                    function enableVoxelizer() {
                        if (realityZoneVoxelizer) {
                            realityZoneVoxelizer.remove();
                        }
                        realityZoneVoxelizer = new realityEditor.gui.ar.desktopRenderer.RealityZoneVoxelizer(floorOffset, createdMesh, navmesh);
                        realityZoneVoxelizer.add();
                        cameraVisCoordinator.voxelizer = realityZoneVoxelizer;
                    }
                    function disableVoxelizer() {
                        if (!realityZoneVoxelizer) {
                            return;
                        }

                        realityZoneVoxelizer.remove();
                        realityZoneVoxelizer = null;
                        cameraVisCoordinator.voxelizer = null;
                    }

                    function setupMenuBar() {
                        if (!realityEditor.gui.getMenuBar) {
                            setTimeout(setupMenuBar, 100);
                            return;
                        }

                        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.Voxelizer, (toggled) => {
                            if (toggled) {
                                enableVoxelizer();
                            } else {
                                disableVoxelizer();
                            }
                        });

                        cameraVisCoordinator = new realityEditor.device.cameraVis.CameraVisCoordinator(floorOffset);
                        cameraVisCoordinator.connect();
                        cameraVisCoordinator.onCameraVisCreated(cameraVis => {
                            console.log('onCameraVisCreated', cameraVis);
                            cameraVisSceneNodes.push(cameraVis.sceneGraphNode);

                            // add to cameraVisFrustums so that material uniforms can be updated
                            cameraVisFrustums.push(cameraVis.id);
                        });

                        cameraVisCoordinator.onCameraVisRemoved(cameraVis => {
                            console.log('onCameraVisRemoved', cameraVis);
                            cameraVisSceneNodes = cameraVisSceneNodes.filter(sceneNode => {
                                return sceneNode !== cameraVis.sceneGraphNode;
                            });

                            // remove from cameraVisFrustums so that material uniforms can be updated
                            cameraVisFrustums = cameraVisSceneNodes.filter(id => {
                                return id !== cameraVis.id;
                            });
                            realityEditor.gui.threejsScene.removeMaterialCullingFrustum(cameraVis.id);
                        });

                        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.AdvanceCameraShader, () => {
                            cameraVisCoordinator.advanceShaderMode();
                        });

                        if (!PROXY) {
                            videoPlayback = new realityEditor.videoPlayback.VideoPlaybackCoordinator();
                            videoPlayback.setPointCloudCallback(cameraVisCoordinator.loadPointCloud.bind(cameraVisCoordinator));
                            videoPlayback.setHidePointCloudCallback(cameraVisCoordinator.hidePointCloud.bind(cameraVisCoordinator));
                            videoPlayback.load();
                            window.videoPlayback = videoPlayback;

                            realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.VideoPlayback, (toggled) => {
                                videoPlayback.toggleVisibility(toggled);
                            });
                        }
                    }

                    setupMenuBar();
                });
            }

            checkExist();
        });

        document.body.style.backgroundColor = 'rgb(50,50,50)';

        // create background canvas and supporting canvasses

        backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.id = 'desktopBackgroundRenderer';
        backgroundCanvas.classList.add('desktopBackgroundRenderer');
        backgroundCanvas.style.transform = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)'; // render behind three.js
        backgroundCanvas.style.transformOrigin = 'top left';
        backgroundCanvas.style.position = 'absolute';
        backgroundCanvas.style.visibility = 'hidden';
        primaryBackgroundCanvas = document.createElement('canvas');
        secondaryBackgroundCanvas = document.createElement('canvas');

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // backgroundRenderer.src = "https://www.youtube.com/embed/XOacA3RYrXk?enablejsapi=1&rel=0&amp;controls=0&playsinline=1&vq=large";

        // add the Reality Zone background behind everything else
        document.body.insertBefore(backgroundCanvas, document.body.childNodes[0]);

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ModelVisibility, (value) => {
            if (!gltf) { return; }
            staticModelMode = value;
            if (staticModelMode) {
                // disabling ALL gltf show/hide for dev
                //gltf.visible = true;
                console.log('show gtlf');
            } else {
                //gltf.visible = false;
                console.log('hide gltf');
            }
        });

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ModelTexture, () => {
            if (!gltf) {
                return;
            }
            gltf.traverse(obj => {
                if (obj.type === 'Mesh' && obj.material) {
                    let tmp = obj.material;
                    obj.material = obj.oldMaterial;
                    obj.oldMaterial = tmp;
                }
            });
        });

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ToggleAnalyticsSettings, () => {
            if (!realityEditor.humanPose.draw) { return; }
            realityEditor.humanPose.draw.toggleAnalyzerSettingsUI();
        });

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.ToggleHumanPoses, (toggled) => {
            if (!realityEditor.humanPose.draw) { return; }
            realityEditor.humanPose.draw.setHumanPosesVisible(toggled);
        });

        realityEditor.gui.getMenuBar().addCallbackToItem(realityEditor.gui.ITEM.NerfRendering, (value) => {

            if (value) {
                if (!nerfStudioConnection) {
                    //nerfStudioConnection = new realityEditor.device.NerfStudioConnection();
                    // re-routing this to the new JS script for developing the new python webSocket connection
                    // *** !!! ***
                    nerfStudioConnection = new realityEditor.websocket.WebSocketConnection();
                }
                const onTurnOn = () => {
                    if (gltf) { 
                        staticModelMode = false;
                        //gltf.visible = false;
                        realityEditor.gui.ar.groundPlaneRenderer.stopVisualization();
                        // nerfEffect = 0;
                    }
                    console.log('hiding gltf for nerf');
                }
                nerfStudioConnection.turnOn(onTurnOn);
                //nerfStudioConnection.start
                
                // show nerf canvas
                if (!nerfCanvas) {
                    nerfCanvas = document.createElement('video');
                    nerfCanvas.setAttribute('autoplay', 'true');
                    nerfCanvas.id = 'nerfCanvas';
                    nerfCanvas.style.position = 'absolute';
                    nerfCanvas.style.left = '0';
                    nerfCanvas.style.top = '0';
                    nerfCanvas.width = window.innerWidth;
                    nerfCanvas.height = window.innerHeight;
                    nerfCanvas.style.width = window.innerWidth + 'px';
                    nerfCanvas.style.height = window.innerHeight + 'px';
                    nerfCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                    // nerfCanvas.style.transform = 'translateZ(4px)';
                    nerfCanvas.style.zIndex = '-1'; // go behind the glproxy canvas
                    nerfCanvas.style.opacity = '1';
                    nerfCanvas.style.pointerEvents = 'none';
                    nerfCanvas.style.clipPath = 'circle(100% at 50% 50%)';
                    document.body.appendChild(nerfCanvas);
                }
                nerfCanvas.style.display = 'inline';
            } else {

                if (nerfStudioConnection) {
                    nerfStudioConnection.turnOff();
                }

                // hide nerf canvas
                //nerfCanvas.style.display = 'none';

                if (gltf) { 
                    staticModelMode = true;
                    //gltf.visible = true;
                    realityEditor.gui.ar.groundPlaneRenderer.startVisualization();
                    console.log('showing gltf again');
                }
            }
        });

        realityEditor.gui.buttons.registerCallbackForButton(
            'logic',
            function onLogicMode() {
                const logicCanvas = document.getElementById('canvas');
                logicCanvas.style.pointerEvents = 'auto';
            }
        );
        realityEditor.gui.buttons.registerCallbackForButton(
            'gui',
            function onGuiMode() {
                const logicCanvas = document.getElementById('canvas');
                logicCanvas.style.pointerEvents = 'none';
            }
        );
    }

    let nerfEffect = 1; //0 = always show; 1 = delayed render; 2 = focus effect; 3 = disabled for dev
    // key press to toggle Nerf rendering effect, use key '>'
    let mousePressed = false;
    let magnifyingRadius = 15; // Adjust this value to change the radius of the magnifying area

    window.addEventListener("keydown", (event) => {

        // Check if the pressed key is '>'
        if (event.key === ">") {
            // Call the function you want to activate
            if(nerfEffect == 2){nerfEffect=0;}
            else{nerfEffect += 1;}
            if(nerfEffect != 2){nerfCanvas.style.clipPath = 'circle(100% at 50% 50%)';}
            console.log("Changing NeRF rendering mode: " + nerfEffect);
        }
        if (event.key === ".") {
            // increase magnify radius
            if(nerfEffect == 2)
            {
                if(magnifyingRadius < 35){magnifyingRadius += 1;}
                updateMagnifyingArea(event.clientX, event.clientY);
            }
            
        }
        if (event.key === ",") {
            // reduce magnify radius
            if(nerfEffect == 2)
            {
                if(magnifyingRadius > 5){magnifyingRadius -= 1;}
                updateMagnifyingArea(event.clientX, event.clientY);
            }
            
        }
    });

    // Event listeners for mouse events: magnifying glass effect
    window.addEventListener('mousedown', (event) => {
        mousePressed = true;
        if(nerfEffect == 2)
        {updateMagnifyingArea(event.clientX, event.clientY);}
    });

    window.addEventListener('mousemove', (event) => {
        if (mousePressed) {
            if(nerfEffect == 2)
            {updateMagnifyingArea(event.clientX, event.clientY);} 
        }
    });

    window.addEventListener('mouseup', () => {
        mousePressed = false;
        if(nerfEffect == 2){hideMagnifyingArea();}
    });
    
    function updateMagnifyingArea(x, y) {
        let magString = magnifyingRadius.toString() + '%'
        nerfCanvas.style.clipPath = `circle(${magString} at ${x}px ${y}px)`;
    }

    function hideMagnifyingArea() {
        nerfCanvas.style.clipPath = 'circle(0% at 0px 0px)';
    }

    let lastDistance = 0;
    let lastVerticalAngle = 0;
    let lastTimestamp = 0;
    function updateNerfRendering(distance, verticalAngle, isMoving, timestamp) {
        lastDistance = distance;
        lastVerticalAngle = verticalAngle;
        if (isMoving) {
            lastTimestamp = timestamp;
        }

        let opacity = 0.01;

        // change NeRF rendering effect based on the Mode
        if(nerfEffect == 0)
        {
            nerfCanvas.style.zIndex = '-1'; // go behind the glproxy canvas
            opacity = 1;
            if (!staticModelMode) {
                //gltf.visible = false;
            }
        }
        else if (nerfEffect == 1)
        {
            let dt = Date.now() - lastTimestamp;
            if (dt < END_FADE_TIME) {
                if (dt > BEGIN_FADE_TIME) {
                    opacity = (dt - BEGIN_FADE_TIME) / (END_FADE_TIME - BEGIN_FADE_TIME);
                }else{
                    opacity = 0.01;
                }
                if (!staticModelMode) {
                    //gltf.visible = true;
                }
                nerfCanvas.style.zIndex = '4'; // go behind the glproxy canvas
            } else {
                opacity = 1;
                if (!staticModelMode) {
                    //gltf.visible = false;
                }
                nerfCanvas.style.zIndex = '4'; // go behind the glproxy canvas
            }
        }
        else if (nerfEffect == 2)
        {
            //implemented ahead of this in the eventListener
            opacity = 1;
            if (!staticModelMode) {
                //gltf.visible = true;
            }
            nerfCanvas.style.zIndex = '4'; // go behind the glproxy canvas
        }


        // make less opaque if you're too far away
        
        // if (distance > BEGIN_FADE_DISTANCE) {
        //     let amount = 0;
        //     if (distance < END_FADE_DISTANCE) {
        //         amount = (distance - BEGIN_FADE_DISTANCE) / (END_FADE_DISTANCE - BEGIN_FADE_DISTANCE);
        //     } else {
        //         amount = 1;
        //     }
        //     opacity = Math.min(opacity, 1.0 - amount);
        // }

        // make less opaque if you're looking at the ceiling

        // if (verticalAngle > BEGIN_FADE_ANGLE) {
        //     let amount = 0;
        //     if (verticalAngle < END_FADE_ANGLE) {
        //         amount = (verticalAngle - BEGIN_FADE_ANGLE) / (END_FADE_ANGLE - BEGIN_FADE_ANGLE);
        //     } else {
        //         amount = 1;
        //     }
        //     opacity = Math.min(opacity, 1.0 - amount);
        // }

        nerfCanvas.style.opacity = opacity;

    }
    exports.updateNerfRendering = updateNerfRendering;

    function showCameraCanvas(id) {
        if (cameraVisCoordinator) {
            cameraVisCoordinator.showFullscreenColorCanvas(id);
            isVirtualizerRenderingIn2D[id] = true;
        }
    }
    exports.showCameraCanvas = showCameraCanvas;

    function hideCameraCanvas(id) {
        if (cameraVisCoordinator) {
            cameraVisCoordinator.hideFullscreenColorCanvas(id);
            isVirtualizerRenderingIn2D[id] = false;
        }
    }
    exports.hideCameraCanvas = hideCameraCanvas;

    // can use this to preserve 2D rendering if we switch from one camera target to another
    let isVirtualizerRenderingIn2D = {};
    exports.getVirtualizers2DRenderingState = function() {
        return isVirtualizerRenderingIn2D;
    };

    /**
     * Updates canvas size for resize events
    */
    function updateCanvasSize() {
        backgroundCanvas.width = window.innerWidth;
        backgroundCanvas.height = window.innerHeight;
        primaryBackgroundCanvas.width = window.innerWidth;
        primaryBackgroundCanvas.height = window.innerHeight;
        secondaryBackgroundCanvas.width = window.innerWidth;
        secondaryBackgroundCanvas.height = window.innerHeight;
        primaryDrawn = false;
        secondaryDrawn = false;
    }

    /**
     * Takes a message containing an encoded image, and chroma keys it for use as the fullscreen background on the desktop
     * @param {string} source - either primary or secondary
     * @param {string} msgContent - contains the image data encoded as a base64 string
     */
    function processImageFromSource(source, msgContent) {
        // if (typeof msgContent.base64String !== 'undefined') {
        //     var imageBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(msgContent.base64String);
        //     backgroundRenderer.src = imageBlobUrl;
        // }
        let parts = msgContent.split(';_;');
        let rgbImage = parts[0];
        let alphaImage = parts[1];
        let editorId = parts[2];
        let rescaleFactor = parts[3];

        if (editorId !== globalStates.tempUuid) {
            // console.log('ignoring image from other editorId');
            return;
        }

        let prom;
        if (source === 'primary') {
            prom = renderImageAndChromaKey(primaryBackgroundCanvas, rgbImage, alphaImage).then(function() {
                primaryDrawn = true;
            });
        } else if (source === 'secondary') {
            prom = renderImageAndChromaKey(secondaryBackgroundCanvas, rgbImage, alphaImage).then(function() {
                secondaryDrawn = true;
            });
        }
        if (!prom) {
            return;
        }
        prom.then(function() {
            if (primaryDrawn && (secondaryDrawn || ONLY_REQUIRE_PRIMARY)) {
                renderBackground();
                backgroundCanvas.style.transform = 'matrix3d(' + rescaleFactor + ', 0, 0, 0, 0, ' + rescaleFactor + ', 0, 0, 0, 0, 1, 0, 0, 0, 1, 1)';
            }
        });
    }

    function renderBackground() {
        let gfx = backgroundCanvas.getContext('2d');
        gfx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        gfx.drawImage(primaryBackgroundCanvas, 0, 0);
        gfx.drawImage(secondaryBackgroundCanvas, 0, 0);
        realityEditor.device.desktopStats.imageRendered();

        if (staticModelMode) {
            // desktopBackgroundRenderer
            backgroundCanvas.style.visibility = 'hidden';
        } else {
            backgroundCanvas.style.visibility = '';
        }
    }

    function loadImage(width, height, imageStr) {
        if (!imageStr) {
            return Promise.resolve(null);
        }
        return new Promise(function(res) {
            let img = new Image(width, height);
            img.onload = function() {
                img.onload = null;
                res(img);
            };
            img.src = imageStr;
        });
    }

    function renderImageAndChromaKey(canvas, rgbImageStr, alphaImageStr) {
        return Promise.all([
            loadImage(canvas.width, canvas.height, rgbImageStr),
            loadImage(canvas.width, canvas.height, alphaImageStr),
        ]).then(function([rgbImage, alphaImage]) {
            let gfx = canvas.getContext('2d');

            if (!alphaImage) {
                gfx.drawImage(rgbImage, 0, 0);
                return;
            }

            gfx.drawImage(alphaImage, 0, 0);
            let alphaId = gfx.getImageData(0, 0, canvas.width, canvas.height);
            gfx.drawImage(rgbImage, 0, 0);
            let id = gfx.getImageData(0, 0, canvas.width, canvas.height);
            let nPixels = canvas.width * canvas.height;
            for (let i = 0; i < nPixels; i++) {
                id.data[4 * i + 3] = alphaId.data[4 * i + 0];
            }
            gfx.putImageData(id, 0, 0);
        });
    }

    exports.processImageFromSource = processImageFromSource;

    exports.getCameraVisSceneNodes = () => {
        return cameraVisSceneNodes;
    };
    
    exports.updateAreaGltfForCamera = function(cameraId, cameraWorldMatrix, maxDepthMeters) {
        if (!gltf || typeof gltf.traverse === 'undefined') return;
        const utils = realityEditor.gui.ar.utilities;
        
        let cameraPosition = new THREE.Vector3(
            cameraWorldMatrix.elements[12] / 1000,
            cameraWorldMatrix.elements[13] / 1000,
            cameraWorldMatrix.elements[14] / 1000
        );
        let cameraPos = [cameraPosition.x, cameraPosition.y, cameraPosition.z];
        let cameraDirection = utils.normalize(utils.getForwardVector(cameraWorldMatrix.elements));
        let cameraLookAtPosition = utils.add(cameraPos, cameraDirection);
        let cameraUp = utils.normalize(utils.getUpVector(cameraWorldMatrix.elements));

        let thisFrustumPlanes = realityEditor.gui.threejsScene.updateMaterialCullingFrustum(cameraId, cameraPos, cameraLookAtPosition, cameraUp, maxDepthMeters);
        
        gltf.traverse(child => {
            updateFrustumUniforms(child, cameraId, thisFrustumPlanes);
        });
    }

    function updateFrustumUniforms(mesh, cameraId, frustumPlanes) {
        if (!mesh.material || !mesh.material.uniforms) return;

        let cameraFrustumIndex = cameraVisFrustums.indexOf(cameraId);
        if (cameraFrustumIndex >= MAX_VIEW_FRUSTUMS || cameraFrustumIndex === -1) {
            return;
        }

        mesh.material.uniforms[UNIFORMS.numFrustums].value = Math.min(cameraVisFrustums.length, MAX_VIEW_FRUSTUMS);

        if (typeof mesh.material.uniforms[UNIFORMS.frustums] !== 'undefined') {
            // update this frustum with all of the normals and constants
            let existingFrustums = mesh.material.uniforms[UNIFORMS.frustums].value;
            existingFrustums[cameraFrustumIndex] = frustumPlanes;
            mesh.material.uniforms[UNIFORMS.frustums].value = existingFrustums;
            mesh.material.needsUpdate = true
        }
    }

    function muteMicrophoneForCameraVis() {
        if (!cameraVisCoordinator) return;
        cameraVisCoordinator.muteMicrophone();
    }

    function unmuteMicrophoneForCameraVis() {
        if (!cameraVisCoordinator) return;
        cameraVisCoordinator.unmuteMicrophone();
    }

    exports.muteMicrophoneForCameraVis = muteMicrophoneForCameraVis;
    exports.unmuteMicrophoneForCameraVis = unmuteMicrophoneForCameraVis;

    realityEditor.addons.addCallback('init', initService);
})(realityEditor.gui.ar.desktopRenderer);
