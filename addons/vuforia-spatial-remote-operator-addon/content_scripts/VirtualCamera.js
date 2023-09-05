/*
* Copyright © 2021 PTC
*/

createNameSpace('realityEditor.device');

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function (exports) {

    const DISPLAY_PERSPECTIVE_CUBES = false;
    const FOCUS_DISTANCE_MM_IN_FRONT_OF_VIRTUALIZER = 1000; // what point to focus on when we rotate/pan away from following

    class VirtualCamera {
        constructor(cameraNode, kTranslation, kRotation, kScale, initialPosition, floorOffset) {
            if (!cameraNode) { console.warn('cameraNode is undefined!'); }

            this.cameraNode = cameraNode;
            this.projectionMatrix = [];
            this.idleOrbitting = false;
            this.isFlying = false;

            this.initialPosition = [0, 0, 0];
            this.position = [1, 1, 1];
            if (typeof initialPosition !== 'undefined') {
                this.initialPosition = [initialPosition[0], initialPosition[1], initialPosition[2]];
                this.position = [initialPosition[0], initialPosition[1], initialPosition[2]];
            }
            this.initialDistance = magnitude(this.position);
            this.targetPosition = [0, 0, 0];
            this.velocity = [0, 0, 0];
            this.targetVelocity = [0, 0, 0];
            this.distanceToTarget = 1;
            this.preRotateDistanceToTarget = null;
            this.preStopFollowingDistanceToTarget = null;
            this.afterNFrames = []; // can be used to trigger delayed actions that gives the camera precise time to update
            this.speedFactors = {
                translation: kTranslation || 1,
                rotation: kRotation || 1,
                scale: kScale || 1
            };
            this.mouseInput = {
                unprocessedDX: 0,
                unprocessedDY: 0,
                unprocessedScroll: 0,
                isPointerDown: false,
                isRightClick: false,
                isRotateRequested: false,
                isStrafeRequested: false,
                first: { x: 0, y: 0 },
                last: { x: 0, y: 0 },
                lastWorldPos: [0, 0, 0],
            };
            this.mouseFlyInput = {
                justSwitched: true,
                last: {x: 0, y: 0},
                unprocessedDX: 0,
                unprocessedDY: 0,
            };
            this.keyboard = new realityEditor.device.KeyboardListener();
            this.followerName = 'cameraFollower' + cameraNode.id;
            this.followingState = {
                active: false,
                selectedId: null,
                virtualizerId: null,
                currentFollowingDistance: 0,
                currentlyRendering2DVideo: false,
                // three.js objects used to calculate the following trajectory
                unstabilizedContainer: null,
                stabilizedContainer: null,
                forwardTargetObject: null, // this is unstabilized
                levelTargetObject: null, // this is fully stabilized, has height = virtualizer height
                partiallyStabilizedTargetObject: null // this is actually what we lookAt, in between forwardObj and levelObj
            };
            this.callbacks = {
                onPanToggled: [],
                onRotateToggled: [],
                onScaleToggled: [],
                onStopFollowing: [] // other modules can discover when pan/rotate forced this camera out of follow mode
            };

            this.normalModePrompt = null;
            this.flyModePrompt = null;
            this.addFlyAndNormalModePrompts();
            
            this.focusTargetCube = null;
            this.addFocusTargetCube();
            this.addEventListeners();

            this.threeJsContainer = new THREE.Group();
            this.threeJsContainer.name = 'VirtualCamera_' + cameraNode.id + '_threeJsContainer';
            this.threeJsContainer.position.y = -floorOffset;
            this.threeJsContainer.rotation.x = Math.PI / 2;
            realityEditor.gui.threejsScene.addToScene(this.threeJsContainer);
        }
        addFocusTargetCube() {
            if (this.focusTargetCube === null) {
                this.focusTargetCube = new THREE.Mesh(
                    new THREE.BoxGeometry(20, 20, 20),
                    new THREE.MeshBasicMaterial({color: 0x00ffff})
                );
                this.focusTargetCube.position.copy(new THREE.Vector3().fromArray(this.mouseInput.lastWorldPos));
                realityEditor.gui.threejsScene.addToScene(this.focusTargetCube);
            }
        }
        addFlyAndNormalModePrompts() {
            // add normal mode prompt
            this.normalModePrompt = document.createElement('div');
            this.normalModePrompt.classList.add('mode-prompt');
            this.normalModePrompt.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
            let normalModeText = document.createElement('div');
            normalModeText.classList.add('mode-prompt-big-font');
            normalModeText.innerHTML = 'Entered normal mode';
            this.normalModePrompt.appendChild(normalModeText);
            this.normalModePrompt.appendChild(document.createElement('br'));
            let normalModeControls1 = document.createElement('div');
            normalModeControls1.innerHTML = 'F - switch mode, G - focus, RMB - rotate,';
            this.normalModePrompt.appendChild(normalModeControls1);
            let normalModeControls2 = document.createElement('div');
            normalModeControls2.innerHTML = 'MMB/RMB+Alt - pan, scroll wheel - zoom';
            this.normalModePrompt.appendChild(normalModeControls2);
            document.body.appendChild(this.normalModePrompt);
            setTimeout(() => {this.normalModePrompt.style.opacity = 0}, 3000);
            // add fly mode prompt
            this.flyModePrompt = document.createElement('div');
            this.flyModePrompt.classList.add('mode-prompt', 'fly-mode-prompt');
            this.flyModePrompt.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
            let flyModeText = document.createElement('div');
            flyModeText.classList.add('mode-prompt-big-font');
            flyModeText.innerHTML = 'Entered fly mode';
            this.flyModePrompt.appendChild(flyModeText);
            this.flyModePrompt.appendChild(document.createElement('br'));
            let flyModeControls1 = document.createElement('div');
            flyModeControls1.innerHTML = 'F - switch mode, G - focus, Q/E - down/up';
            this.flyModePrompt.appendChild(flyModeControls1);
            let flyModeControls2 = document.createElement('div');
            flyModeControls2.innerHTML = 'W/A/S/D - move, SHIFT - speed up';
            this.flyModePrompt.appendChild(flyModeControls2);
            document.body.appendChild(this.flyModePrompt);
        }
        switchMode() {
            if (this.isFlying) {
                this.normalModePrompt.style.opacity = '0';
                this.flyModePrompt.style.opacity = '1';
                setTimeout(() => {this.flyModePrompt.style.opacity = 0}, 2000);
            } else {
                this.flyModePrompt.style.opacity = '0';
                this.normalModePrompt.style.opacity = '1';
                setTimeout(() => {this.normalModePrompt.style.opacity = 0}, 2000);
            }
        }
        addEventListeners() {

            let scrollTimeout = null;
            window.addEventListener('wheel', function (event) {
                this.mouseInput.unprocessedScroll += event.deltaY;
                if (this.followingState && this.followingState.currentlyRendering2DVideo) {
                    this.followingState.currentlyRendering2DVideo = false;
                    realityEditor.gui.ar.desktopRenderer.hideCameraCanvas(this.followingState.virtualizerId);
                }
                event.preventDefault();

                // update scale callbacks based on whether you've scrolled in this 150ms time period
                this.triggerScaleCallbacks(true);
                this.preRotateDistanceToTarget = null; // if we rotate and scroll, don't lock zoom to pre-rotate level

                if (scrollTimeout !== null) {
                    clearTimeout(scrollTimeout);
                }
                scrollTimeout = setTimeout(function () {
                    this.triggerScaleCallbacks(false);
                    this.preRotateDistanceToTarget = null;

                }.bind(this), 150);
            }.bind(this), { passive: false }); // in order to call preventDefault, wheel needs to be active not passive

            document.addEventListener('pointerdown', function (event) {
                if (event.button === 2 || event.button === 1) { // 2 is right click, 0 is left, 1 is middle button
                    this.mouseInput.isPointerDown = true;
                    this.mouseInput.isRightClick = false;
                    this.mouseInput.isRotateRequested = false;
                    this.mouseInput.isStrafeRequested = false;
                    if (event.button === 1 || this.keyboard.keyStates[this.keyboard.keyCodes.ALT] === 'down') {
                        this.mouseInput.isStrafeRequested = true;
                        this.triggerPanCallbacks(true);
                    } else if (event.button === 2) {
                        setFocusTargetCube(event);
                        this.mouseInput.isRightClick = true;
                        this.mouseInput.isRotateRequested = true;
                        this.triggerRotateCallbacks(true);
                        if (!this.followingState.active) { // we preserve distance to virtualizer if following, not distance to target
                            this.preRotateDistanceToTarget = this.distanceToTarget;
                        }
                    }
                    this.mouseInput.first.x = event.pageX;
                    this.mouseInput.first.y = event.pageY;
                    this.mouseInput.last.x = event.pageX;
                    this.mouseInput.last.y = event.pageY;
                    // follow a tool if you click it with shift held down
                }
            }.bind(this));

            // when in normal mode, right click to add a green focus cube to the scene
            const setFocusTargetCube = (event) => {
                if (this.isFlying) return;
                // conform to spatial cursor mousemove event pageX and pageY
                if (event.button === 2) {
                    let worldIntersectPoint = realityEditor.spatialCursor.getRaycastCoordinates(event.pageX, event.pageY).point;
                    if (worldIntersectPoint === undefined) return;
                    // record pointerdown world intersect point, for off-center camera rotation
                    this.mouseInput.lastWorldPos = [worldIntersectPoint.x, worldIntersectPoint.y, worldIntersectPoint.z];
                    if (this.focusTargetCube === null) {
                        this.focusTargetCube = new THREE.Mesh(
                            new THREE.BoxGeometry(20, 20, 20),
                            new THREE.MeshBasicMaterial({color: 0x00ffff})
                        );
                        this.focusTargetCube.position.copy(worldIntersectPoint);
                        realityEditor.gui.threejsScene.addToScene(this.focusTargetCube);
                    } else {
                        this.focusTargetCube.position.copy(worldIntersectPoint);
                    }
                }
            };

            const pointerReset = () => {
                this.mouseInput.isPointerDown = false;
                this.mouseInput.isRightClick = false;
                this.mouseInput.isRotateRequested = false;
                this.mouseInput.isStrafeRequested = false;

                this.mouseInput.first.x = 0;
                this.mouseInput.first.y = 0;
                this.mouseInput.last.x = 0;
                this.mouseInput.last.y = 0;

                if (this.preRotateDistanceToTarget !== null) {
                    this.preRotateDistanceToTarget = null;
                }

                this.triggerPanCallbacks(false);
                this.triggerRotateCallbacks(false);
                this.triggerScaleCallbacks(false);
            };

            document.addEventListener('pointerup', pointerReset);
            document.addEventListener('pointercancel', pointerReset);

            // focus camera on the focus point
            document.addEventListener('keypress', function (e) {
                if (e.key === 'g' || e.key === 'G') {
                    this.focus(this.focusTargetCube.position.clone());
                }
            }.bind(this));

            // enter fly mode
            document.addEventListener('keydown', (e) => {
                if (e.key === 'f' || e.key === 'F') {
                    this.isFlying = !this.isFlying;
                    if (this.isFlying) {
                        document.body.requestPointerLock();
                    } else {
                        document.exitPointerLock();
                    }
                }
            });

            document.addEventListener('pointerlockchange', () => {
                if (document.pointerLockElement === document.body) {
                    this.isFlying = true;
                } else if (document.pointerLockElement === null) {
                    this.isFlying = false;
                }
                this.switchMode();
            });

            document.addEventListener('pointermove', function (event) {
                if ( document.pointerLockElement === document.body ) {
                    this.mouseFlyInput.unprocessedDX = event.movementX;
                    this.mouseFlyInput.unprocessedDY = event.movementY;
                } else {
                    if (this.mouseInput.isPointerDown) {

                        let xOffset = event.pageX - this.mouseInput.last.x;
                        let yOffset = event.pageY - this.mouseInput.last.y;

                        this.mouseInput.unprocessedDX += xOffset;
                        this.mouseInput.unprocessedDY += yOffset;

                        if (this.followingState && this.followingState.currentlyRendering2DVideo) {
                            this.followingState.currentlyRendering2DVideo = false;
                            realityEditor.gui.ar.desktopRenderer.hideCameraCanvas(this.followingState.virtualizerId);
                        }

                        this.mouseInput.last.x = event.pageX;
                        this.mouseInput.last.y = event.pageY;
                    }
                }
            }.bind(this));
        }
        reset() {
            this.stopFollowing();
            this.position = [this.initialPosition[0], this.initialPosition[1], this.initialPosition[2]];
            this.targetPosition = [0, 0, 0];
            this.mouseInput.lastWorldPos = [0, 0, 0];
            this.focusTargetCube.position.copy(new THREE.Vector3().fromArray(this.mouseInput.lastWorldPos));
        }
        adjustEnvVars(distanceToTarget) {
            // places new tools at the camera's targetPosition...
            // relies on the fact that new tools are dropped 400mm in front of camera by default
            realityEditor.device.environment.variables.newFrameDistanceMultiplier = distanceToTarget / 400;
        }
        getTargetMatrix() {
            return [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                this.targetPosition[0], this.targetPosition[1], this.targetPosition[2], 1
            ];
        }
        getFocusTargetCubeMatrix() {
            return [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                this.focusTargetCube.position.x, this.focusTargetCube.position.y, this.focusTargetCube.position.z, 1
            ];
        }
        onPanToggled(callback) {
            this.callbacks.onPanToggled.push(callback);
        }
        onRotateToggled(callback) {
            this.callbacks.onRotateToggled.push(callback);
        }
        onScaleToggled(callback) {
            this.callbacks.onScaleToggled.push(callback);
        }
        triggerPanCallbacks(newValue) {
            this.callbacks.onPanToggled.forEach(function(cb) { cb(newValue); });
        }
        triggerRotateCallbacks(newValue) {
            this.callbacks.onRotateToggled.forEach(function(cb) { cb(newValue); });
        }
        triggerScaleCallbacks(newValue) {
            this.callbacks.onScaleToggled.forEach(function(cb) { cb(newValue); });
        }
        zoomBackToPreStopFollowLevel() {
            if (this.preStopFollowingDistanceToTarget === null) { return; }
            let cameraNormalizedVector = normalize(add(this.position, negate(this.targetPosition)));
            this.position = add(this.targetPosition, scalarMultiply(cameraNormalizedVector, this.preStopFollowingDistanceToTarget));
        }
        onStopFollowing(callback) {
            this.callbacks.onStopFollowing.push(callback);
        }
        // get the camera direction as an array
        getCameraDirection() {
            return normalize(sub(this.targetPosition, this.position));
        }
        // if specify a focus direction, the camera will look into that direction. Note that dir is expected to be a unit vector
        // if not, move the camera while keeping its lookAt direction
        focus(pos, dir) {
            let zoomFactor = 4000;
            this.targetPosition[0] = pos.x;
            this.targetPosition[1] = pos.y;
            this.targetPosition[2] = pos.z;
            if (dir !== undefined) {
                this.position[0] = this.targetPosition[0] + dir.x * zoomFactor;
                this.position[1] = this.targetPosition[1] + dir.y * zoomFactor;
                this.position[2] = this.targetPosition[2] + dir.z * zoomFactor;
            } else {
                let camDir = this.getCameraDirection();
                this.position[0] = this.targetPosition[0] - camDir[0] * zoomFactor;
                this.position[1] = this.targetPosition[1] - camDir[1] * zoomFactor;
                this.position[2] = this.targetPosition[2] - camDir[2] * zoomFactor;
            }
        }
        orbit(xRot, yRot, camPos, camLookAt, target) {
            const yaxis = new THREE.Vector3(0, 1, 0);
            const newXAxis = new THREE.Vector3();
            // basically set newXAxis x and z to direction tangent to camera lookAt direction, and y to 0
            newXAxis.x = -camLookAt.z;
            newXAxis.z = camLookAt.x;
            newXAxis.y = 0;
            
            newXAxis.normalize();

            // step 1: first change the camera position
            // method 1: 
            const newCamPos = camPos
                .sub(target)
                .applyAxisAngle(newXAxis, xRot)
                .applyAxisAngle(yaxis, yRot)
                .add(target);
            this.position = newCamPos.toArray();

            // step 2: change the camera lookAt/target position
            const relLookAt = camLookAt
                .multiplyScalar(this.initialDistance)
                .applyAxisAngle(newXAxis, xRot)
                .applyAxisAngle(yaxis, yRot)
                .add(newCamPos);
            this.targetPosition = relLookAt.toArray();
        }
        // this needs to be called externally each frame that you want it to update
        update() {
            this.velocity = [0, 0, 0];
            this.targetVelocity = [0, 0, 0];

            if (this.followingState.active) {
                this.updateFollowing();
            } else {
                this.stopFollowing();
            }

            let previousTargetPosition = [this.targetPosition[0], this.targetPosition[1], this.targetPosition[2]];
            // move camera to cameraPosition and look at cameraTargetPosition
            let newCameraLookAtMatrix = lookAt(this.position[0], this.position[1], this.position[2], this.targetPosition[0], this.targetPosition[1], this.targetPosition[2], 0, 1, 0);

            let ev = this.position;
            let cv = this.targetPosition;
            let uv = [0, 1, 0];

            this.distanceToTarget = magnitude(add(ev, negate(cv)));
            this.adjustEnvVars(this.distanceToTarget);

            let mCamera = newCameraLookAtMatrix; // translation is based on what direction you're facing,
            let vCamX = normalize([mCamera[0], mCamera[4], mCamera[8]]);
            let vCamY = normalize([mCamera[1], mCamera[5], mCamera[9]]);
            let _vCamZ = normalize([mCamera[2], mCamera[6], mCamera[10]]);

            let forwardVector = normalize(add(ev, negate(cv))); // vector from the camera to the center point
            let horizontalVector = normalize(crossProduct(uv, forwardVector)); // a "right" vector, orthogonal to n and the lookup vector
            let verticalVector = crossProduct(forwardVector, horizontalVector); // resulting orthogonal vector to n and u, as the up vector isn't necessarily one anymore

            let distancePanFactor = Math.max(1, this.distanceToTarget / 1000); // speed when 1 meter units away, scales up w/ distance

            if (this.idleOrbitting) {
                this.mouseInput.unprocessedDX = 0.15;
                this.mouseInput.isRotateRequested = true;
                this.mouseInput.isStrafeRequested = false;
            }

            // rotate
            if (this.mouseInput.isRotateRequested && (this.mouseInput.unprocessedDX !== 0 || this.mouseInput.unprocessedDY !== 0)) {
                let camLookAt = new THREE.Vector3().fromArray(this.getCameraDirection());
                let angle = camLookAt.clone().angleTo(new THREE.Vector3(camLookAt.x, 0, camLookAt.z));
                // rotateFactor is a quadratic function that goes through (+-PI/2, 0) and (0, 1), so that when camera gets closer to 2 poles, the slower it rotates
                let rotateFactor = -Math.pow(angle / Math.PI, 2) * 4 + 1;
                let xRot = -this.mouseInput.unprocessedDY * 0.01 * rotateFactor;
                let yRot = -this.mouseInput.unprocessedDX * 0.01 * rotateFactor;
                let camPos = new THREE.Vector3().fromArray(this.position);
                let target = new THREE.Vector3().fromArray(this.mouseInput.lastWorldPos);
                this.orbit(xRot, yRot, camPos, camLookAt, target);

                this.deselectTarget();
                
                this.mouseInput.unprocessedDX = 0;
                this.mouseInput.unprocessedDY = 0;
            }

            // strafe
            if (this.mouseInput.isStrafeRequested) {
                if (this.mouseInput.unprocessedDX !== 0) { // strafe left-right
                    let vector = scalarMultiply(negate(horizontalVector), distancePanFactor * this.speedFactors.translation * this.mouseInput.unprocessedDX * getCameraPanSensitivity());
                    this.targetVelocity = add(this.targetVelocity, vector);
                    this.velocity = add(this.velocity, vector);
                    this.deselectTarget();

                    this.mouseInput.unprocessedDX = 0;
                }
                if (this.mouseInput.unprocessedDY !== 0) { // strafe up-down
                    let vector = scalarMultiply(verticalVector, distancePanFactor * this.speedFactors.translation * this.mouseInput.unprocessedDY * getCameraPanSensitivity());
                    this.targetVelocity = add(this.targetVelocity, vector);
                    this.velocity = add(this.velocity, vector);
                    this.deselectTarget();

                    this.mouseInput.unprocessedDY = 0;
                }
            }

            // scroll
            scrollOperation: if (this.mouseInput.unprocessedScroll !== 0) {
                
                // prevent from scrolling while rotating
                if (this.mouseInput.isRotateRequested) {
                    this.mouseInput.unprocessedScroll = 0;
                    this.deselectTarget();
                    break scrollOperation;
                }

                if (this.followingState.active) {
                    // while following, zooming in-out moves the camera along a parametric curve up and behind the virtualizer
                    let dDist = this.speedFactors.scale * getCameraZoomSensitivity() * this.mouseInput.unprocessedScroll;
                    this.followingState.currentFollowingDistance = Math.min(10000, Math.max(0, this.followingState.currentFollowingDistance + dDist));

                    this.updateParametricTargetAndPosition(this.followingState.currentFollowingDistance);

                } else {
                    // increase speed as distance increases
                    let nonLinearFactor = 1.05; // closer to 1 = less intense log (bigger as distance bigger)
                    let isZoomingIn = this.mouseInput.unprocessedScroll < 0;
                    let baseLog = getBaseLog(nonLinearFactor, this.distanceToTarget) / 100;
                    
                    // interpolate camera towards camera target point
                    {
                        let distanceMultiplier = Math.max(1, baseLog);
                        let vector = scalarMultiply(forwardVector, distanceMultiplier * this.speedFactors.scale * getCameraZoomSensitivity() * this.mouseInput.unprocessedScroll);
                        // if distanceToTarget <= 200, slow down zooming speed quadratically to prevent from zooming too close / beyond the target
                        if (isZoomingIn && this.distanceToTarget <= 200) {
                            let scrollFactor = Math.pow(this.distanceToTarget / 200, 2);
                            vector = scalarMultiply(vector, scrollFactor);
                        }
                        // * 0.7 to prevent the camera from getting too close to the camera target point
                        this.velocity = add(this.velocity, scalarMultiply(vector, 0.7));
                    }

                    // interpolate camera target point towards focus point
                    {
                        let offset = sub(this.mouseInput.lastWorldPos, this.targetPosition);
                        let targetToFocus = magnitude(offset);
                        if (targetToFocus <= 300) {
                            this.targetPosition = this.mouseInput.lastWorldPos;
                            this.mouseInput.unprocessedScroll = 0;
                            this.deselectTarget();
                            break scrollOperation;
                        }
                        // only interpolate camera target point towards focus point if zooming in. maintain targetPosition when zooming out, b/c we're not zooming towards a specific position
                        if (isZoomingIn) {
                            // * 0.5 to make distanceMultiplier2 smaller for the camera target to focus point interpolation, to avoid overshooting
                            let distanceMultiplier2 = -Math.max(1, baseLog) * 0.5;
                            let targetForwardVector = normalize(offset);
                            let vector2 = scalarMultiply(targetForwardVector, distanceMultiplier2 * this.speedFactors.scale * getCameraZoomSensitivity() * this.mouseInput.unprocessedScroll);
                            this.targetVelocity = add(this.targetVelocity, vector2);
                        }
                    }
                    
                    this.deselectTarget();
                }

                this.mouseInput.unprocessedScroll = 0; // reset now that data is processed
            }

            let flyingSpeed = 30;
            if (this.isFlying) {
                // handle mouse movements
                let mouseVector = [0, 0, 0];
                mouseVector = add(mouseVector, scalarMultiply(vCamX, 0.0005 * (2 * Math.PI * this.distanceToTarget) * this.mouseFlyInput.unprocessedDX));
                this.mouseFlyInput.unprocessedDX = 0;
                mouseVector = add(mouseVector, scalarMultiply(negate(vCamY), 0.0005 * (2 * Math.PI * this.distanceToTarget) * this.mouseFlyInput.unprocessedDY));
                this.mouseFlyInput.unprocessedDY = 0;
                this.targetVelocity = add(this.targetVelocity, mouseVector);
                // handle WASDQE movements, shift to speed up
                let transformKeys = {
                    W: this.keyboard.keyStates[this.keyboard.keyCodes.W] === 'down',
                    A: this.keyboard.keyStates[this.keyboard.keyCodes.A] === 'down',
                    S: this.keyboard.keyStates[this.keyboard.keyCodes.S] === 'down',
                    D: this.keyboard.keyStates[this.keyboard.keyCodes.D] === 'down',
                    Q: this.keyboard.keyStates[this.keyboard.keyCodes.Q] === 'down',
                    E: this.keyboard.keyStates[this.keyboard.keyCodes.E] === 'down',
                };
                let keyDirection = [transformKeys.S - transformKeys.W, transformKeys.D - transformKeys.A, transformKeys.E - transformKeys.Q];
                if (magnitude(keyDirection) !== 0) {
                    let vector = [0, 0, 0];
                    flyingSpeed = this.keyboard.keyStates[this.keyboard.keyCodes.SHIFT] === 'down' ? 40 : 20;
                    let forwardValue = scalarMultiply(forwardVector, keyDirection[0]);
                    let horizontalValue = scalarMultiply(horizontalVector, keyDirection[1]);
                    let verticalValue = scalarMultiply([0, 1, 0], keyDirection[2]);
                    vector = add(vector, add(add(forwardValue, horizontalValue), verticalValue));
                    vector = scalarMultiply(normalize(vector), flyingSpeed);
                    this.targetVelocity = add(this.targetVelocity, vector);
                    this.velocity = add(this.velocity, vector);
                }
            }

            // TODO: add back keyboard controls
            // TODO: add back 6D mouse controls

            if (!this.mouseInput.isRotateRequested || this.isFlying) {
                let camLookAt = new THREE.Vector3().fromArray(this.getCameraDirection());
                let angle = camLookAt.clone().angleTo(new THREE.Vector3(camLookAt.x, 0, camLookAt.z));
                // rotateFactor is a quadratic function that goes through (+-PI/2, 0) and (0, 1), so that when camera gets closer to 2 poles, the slower it rotates
                let rotateFactor = -Math.pow(angle / Math.PI, 2) * 4 + 1;
                this.position = add(this.position, scalarMultiply(this.velocity, rotateFactor));
                this.targetPosition = add(this.targetPosition, scalarMultiply(this.targetVelocity, rotateFactor));
            }

            // tween the matrix every frame to animate it to the new position
            // let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
            let currentCameraMatrix = realityEditor.gui.ar.utilities.copyMatrix(this.cameraNode.localMatrix);
            let destinationCameraMatrix = realityEditor.gui.ar.utilities.invertMatrix(newCameraLookAtMatrix);
            let totalDifference = sumOfElementDifferences(destinationCameraMatrix, currentCameraMatrix);
            if (totalDifference < 0.00001) {
                return; // don't animate the matrix with an infinite level of precision, stop when it gets very close to destination
            }

            // Ben disabled this for the NeRF Studio demo
            let shouldSmoothCamera = false; // !this.isRendering2DVideo();
            let animationSpeed = shouldSmoothCamera ? 0.3 : 1.0;
            let newCameraMatrix = tweenMatrix(currentCameraMatrix, destinationCameraMatrix, animationSpeed);

            if (this.cameraNode.id === 'CAMERA') {
                realityEditor.sceneGraph.setCameraPosition(newCameraMatrix);
            } else {
                this.cameraNode.setLocalMatrix(newCameraMatrix);
            }

            // allows us to schedule code to trigger exactly after the camera has updated its position N times
            // useful for some calculations that require an up-to-date camera. can also be used for animations
            let callbacksToTrigger = [];
            this.afterNFrames.forEach((info) => {
                info.n -= 1;
                if (info.n <= 0) {
                    callbacksToTrigger.push(info.callback);
                }
            });
            this.afterNFrames = this.afterNFrames.filter(entry => entry.n > 0);
            callbacksToTrigger.forEach(cb => cb());
        }

        isRendering2DVideo() {
            return (this.followingState.active && this.followingState.currentlyRendering2DVideo);
        }

        /////////////////////////////
        // FOLLOWING THE VIRTUALIZER
        /////////////////////////////
        follow(sceneNodeToFollow, virtualizerId, initialFollowDistance, isRendering2D) {
            if (this.followingState.active) {
                this.stopFollowing();
            }

            this.followingState.active = true;
            this.followingState.virtualizerId = virtualizerId;
            this.followingState.selectedId = sceneNodeToFollow.id;
            if (typeof initialFollowDistance !== 'undefined') {
                this.followingState.currentFollowingDistance = initialFollowDistance; // can adjust with scroll wheel
            }
            if (typeof isRendering2D !== 'undefined') {
                this.followingState.currentlyRendering2DVideo = isRendering2D;
            }

            this.updateParametricTargetAndPosition(this.followingState.currentFollowingDistance);
        }
        deselectTarget() {
            // set the target position to a point slightly in front of the camera, and then stop following
            let selectedNode = realityEditor.sceneGraph.getSceneNodeById(this.followingState.selectedId);
            if (!selectedNode) { return; }
            let virtualizerMatrixThree = new THREE.Matrix4();
            let relativeMatrix = selectedNode.getMatrixRelativeTo(realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId()))
            realityEditor.gui.threejsScene.setMatrixFromArray(virtualizerMatrixThree, relativeMatrix);

            // the new focus of the camera should be the point 1 meter in front of the virtualizer
            let virtualizerForwardPosition = this.followingState.partiallyStabilizedTargetObject.getWorldPosition(new THREE.Vector3());

            this.targetPosition = [virtualizerForwardPosition.x, virtualizerForwardPosition.y, virtualizerForwardPosition.z];

            if (this.preStopFollowingDistanceToTarget === null) {
                // calculate distance from this.position to virtualizerForwardPosition, so that we can zoom back to this
                this.preStopFollowingDistanceToTarget = magnitude(add(this.position, negate(this.targetPosition)));
            }

            // need to allow the camera position to update once to actually lookAt the targetPosition before we stop
            this.afterOneFrame(() => {
                if (this.followingState.active) {
                    this.stopFollowing();
                }
            });
        }
        afterOneFrame(callback) {
            this.afterNFrames.push({
                n: 1,
                callback: callback
            });
        }
        stopFollowing() {
            this.followingState.active = false;
            this.followingState.selectedId = null;
            if (this.followingState.virtualizerId) {
                realityEditor.gui.ar.desktopRenderer.hideCameraCanvas(this.followingState.virtualizerId);
                this.followingState.virtualizerId = null;
            }

            if (this.preStopFollowingDistanceToTarget !== null) {
                this.zoomBackToPreStopFollowLevel();
                this.preRotateDistanceToTarget = this.preStopFollowingDistanceToTarget;
                this.preStopFollowingDistanceToTarget = null;
            }

            this.callbacks.onStopFollowing.forEach(cb => cb());
        }
        // trigger this in the main update loop each frame while we are following, to perform the following camera motion
        updateFollowing() {
            // don't update parametric position while we are disengaging from a follow, otherwise the target velocity goes crazy
            if (this.preStopFollowingDistanceToTarget !== null) { return; }

            // check that the sceneNode exists with its worldMatrix positioned at the virtualizer
            let targetPosition = realityEditor.sceneGraph.getWorldPosition(this.followingState.selectedId);
            if (!targetPosition) { this.stopFollowing(); return; }

            // to work in portrait or landscape, the curve that the camera follows (which is nested inside a threejs group)
            //  needs to not have the exact transform of the virtualizer – ignore the twist and tilt of the phone
            this.stabilizeCameraFollowPathUpVector();

            // updates the camera position to equal the parametricPositionObject, and its direction to lookAt the parametricTargetObject
            // these invisible threejs objects are nested inside the stabilizedContainer and their positions move as you scroll in/out
            this.moveCameraToParametricFollowPosition();
        }
        stabilizeCameraFollowPathUpVector() {
            // before beginning, ensure the right group hierarchies exist to compute the lookAt vector
            this.createMissingThreejsFollowingGroups();

            // 1. directly set the matrix of the UN-stabilized container to that of the virtualizer
            let selectedNode = realityEditor.sceneGraph.getSceneNodeById(this.followingState.selectedId);
            realityEditor.gui.threejsScene.setMatrixFromArray(this.followingState.unstabilizedContainer.matrix, selectedNode.worldMatrix);

            // 2. set the position of the stabilized container = the UN-stabilized container
            let virtualizerPosition = new THREE.Vector3().setFromMatrixPosition(this.followingState.unstabilizedContainer.matrix);
            this.followingState.stabilizedContainer.position.set(virtualizerPosition.x, virtualizerPosition.y, virtualizerPosition.z);

            // 3. get the "world position" of the forwardTargetObject, which is a child of the UN-stabilized container (in the coordinate system of the threeJsContainer)
            let tiltedForwardPosition = this.followingState.forwardTargetObject.position.clone().applyMatrix4(this.followingState.unstabilizedContainer.matrix);

            // 4. set the "world position" of the levelTargetObject to that of the forwardTargetObject, but with its height = the height of the virtualizer
            this.followingState.levelTargetObject.position.set(tiltedForwardPosition.x, tiltedForwardPosition.y, virtualizerPosition.z);

            // 5. stabilize the camera's up-down tilt more and more as you zoom out, such that when you are fully zoomed out, it doesn't tilt up and down at all,
            //    but when you are fully zoomed in it is completely un-stabilized, so you tilt up and down exactly with the virtualizer perspective
            //    (this step is optional but leads to stable birds-eye and seamless first-person transition)
            let parametricTargetObject = realityEditor.gui.threejsScene.getObjectByName('parametricTargetObject');
            let MIN_Z = 1250; // these can be calculated from passing min and max follow distance into updateParametricTargetAndPosition
            let MAX_Z = 2500;
            let unclampedPercent = 1.0 - (Math.abs(parametricTargetObject.position.z) - MIN_Z) / (MAX_Z - MIN_Z);
            let stabilizationPercent = clamp(unclampedPercent, 0, 1);
            let stabilizedHeight = virtualizerPosition.z * stabilizationPercent + tiltedForwardPosition.z * (1 - stabilizationPercent);
            let stabilizedTargetPosition = new THREE.Vector3(this.followingState.levelTargetObject.position.x, this.followingState.levelTargetObject.position.y, stabilizedHeight);

            if (this.followingState.partiallyStabilizedTargetObject) {
                // set before doing localToWorld, since both are children of the threeJsContainer
                this.followingState.partiallyStabilizedTargetObject.position.set(stabilizedTargetPosition.x, stabilizedTargetPosition.y, stabilizedTargetPosition.z);
            }

            // 6. rotate the stabilized container to lookAt the (partially stabilized depending on distance) levelTargetObject
            this.threeJsContainer.localToWorld(stabilizedTargetPosition); // THREE.lookAt takes in world coordinates, so requires a transform
            this.followingState.stabilizedContainer.lookAt(stabilizedTargetPosition.x, stabilizedTargetPosition.y, stabilizedTargetPosition.z);
        }
        createMissingThreejsFollowingGroups() {
            if (!this.followingState.unstabilizedContainer) {
                this.followingState.unstabilizedContainer = new THREE.Group();
                this.followingState.unstabilizedContainer.name = 'followingElementGroup';
                this.followingState.unstabilizedContainer.matrixAutoUpdate = false;
                this.followingState.unstabilizedContainer.visible = DISPLAY_PERSPECTIVE_CUBES;
                this.threeJsContainer.add(this.followingState.unstabilizedContainer);

                // These boxes could be groups / empty objects rather than meshes, but we have them to help debug
                let forwardTarget = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: '#0000ff' }));
                forwardTarget.position.set(0, 0, FOCUS_DISTANCE_MM_IN_FRONT_OF_VIRTUALIZER);
                forwardTarget.name = 'forwardFollowTargetObject';
                forwardTarget.visible = DISPLAY_PERSPECTIVE_CUBES;
                this.followingState.unstabilizedContainer.add(forwardTarget);
                this.followingState.forwardTargetObject = forwardTarget;

                let level = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: '#00ffff' }));
                level.name = 'levelFollowTargetObject';
                level.visible = DISPLAY_PERSPECTIVE_CUBES;
                this.threeJsContainer.add(level);
                this.followingState.levelTargetObject = level;
            }

            if (!this.followingState.stabilizedContainer) {
                let container = new THREE.Group();
                container.name = 'followStabilizedContainer';
                container.visible = DISPLAY_PERSPECTIVE_CUBES;
                this.followingState.stabilizedContainer = container;
                this.threeJsContainer.add(container);

                let obj = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: '#ff0000' }));
                obj.name = 'parametricPositionObject';
                obj.visible = DISPLAY_PERSPECTIVE_CUBES;
                container.add(obj);

                let target = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: '#ff0000' }));
                target.name = 'parametricTargetObject';
                target.visible = DISPLAY_PERSPECTIVE_CUBES;
                container.add(target);

                // set initial positions of objects otherwise camera following will break
                this.updateParametricTargetAndPosition(this.followingState.currentFollowingDistance);
            }

            if (!this.followingState.partiallyStabilizedTargetObject) {
                let obj = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: '#00ffff' }));
                obj.name = 'partiallyStabilizedFollowTargetObject';
                obj.visible = DISPLAY_PERSPECTIVE_CUBES;
                this.threeJsContainer.add(obj);
                this.followingState.partiallyStabilizedTargetObject = obj;
            }
        }
        // actually moves the camera to be located at the positionObject and looking at the targetObject
        // (which are nested inside the stabilized following container)
        moveCameraToParametricFollowPosition() {
            let positionObject = realityEditor.gui.threejsScene.getObjectByName('parametricPositionObject');
            let targetObject = realityEditor.gui.threejsScene.getObjectByName('parametricTargetObject');

            let groundPlaneMatrixArray = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
            let invGroundPlaneMatrix = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(invGroundPlaneMatrix, groundPlaneMatrixArray);
            invGroundPlaneMatrix.invert();

            let vec1 = new THREE.Vector3();
            let vec2 = new THREE.Vector3();
            targetObject.getWorldPosition(vec1);
            positionObject.getWorldPosition(vec2);
            vec1.applyMatrix4(invGroundPlaneMatrix);
            vec2.applyMatrix4(invGroundPlaneMatrix);
            let newPosVec = vec2.toArray();
            let newTargetPosVec = vec1.toArray();

            let movement = add(newPosVec, negate(this.position));
            if (movement[0] !== 0 || movement[1] !== 0 || movement[2] !== 0) {
                this.velocity = add(this.velocity, movement);
            }

            let targetMovement = add(newTargetPosVec, negate(this.targetPosition));
            if (targetMovement[0] !== 0 || targetMovement[1] !== 0 || targetMovement[2] !== 0) {
                this.targetVelocity = add(this.targetVelocity, targetMovement);
            }
        }
        // moves the parametricPositionObject and parametricTargetObject along curves,
        // based on distance between VirtualCamera and the virtualizer we are following
        updateParametricTargetAndPosition(distanceToCamera) {
            let positionObject = realityEditor.gui.threejsScene.getObjectByName('parametricPositionObject');
            let targetObject = realityEditor.gui.threejsScene.getObjectByName('parametricTargetObject');

            if (!positionObject || !targetObject) {
                return;
            }

            // Diagram showing the path that the curve follows relative to the virtualizer (from a side view)
            // A is where that object will be when the camera is zoomed in all the way
            // B is where that object will be when the camera is zoomed out all the way
            //
            //                                                               [POSITION OBJECT]
            //                                                                     -B>|
            //                                                                    --
            //                                                                  ---
            //                                                               ----
            //     |<A------- [TARGET OBJECT] -----B>| [VIRTUALIZER] |<A------

            // camera is positioned along a quadratic curve behind the camera
            let z = -distanceToCamera;
            let y = 1500 * (z / 3000) * (z / 3000);
            positionObject.position.set(0, y, z);
            positionObject.matrixWorldNeedsUpdate = true;

            // target distance decreases hyperbolically as camera distance increases
            // this makes the camera angle tilt further and further outwards as you zoom in
            // and tilt more towards the virtualizer when you zoom out
            z = 1500 * (10000 / (distanceToCamera + 2000));
            targetObject.position.set(0, 0, z);
            targetObject.matrixWorldNeedsUpdate = true;

            // Trigger the virtualizer shader to render flat video when we reach first-person perspective
            if (this.followingState.currentFollowingDistance <= 0 && !this.followingState.currentlyRendering2DVideo) {
                realityEditor.gui.ar.desktopRenderer.showCameraCanvas(this.followingState.virtualizerId);
                this.followingState.currentlyRendering2DVideo = true;

            } else if (this.followingState.currentlyRendering2DVideo && this.followingState.currentFollowingDistance > 0) {
                realityEditor.gui.ar.desktopRenderer.hideCameraCanvas(this.followingState.virtualizerId);
                this.followingState.currentlyRendering2DVideo = false;
            }
        }
    }

    //************************************************ Utilities *************************************************//

    // since groundPlaneMatrix is applied to threejsContainerObj in threejsScene.js
    // here we apply the same groundPlaneMatrix to VirtualCamera, so that it's in the same coord space as threejsContainerObj
    function convertToThreejsContainerObjSpace(eyeX, eyeY, eyeZ, centerX, centerY, centerZ) {
        let groundPlaneMatrixArray = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let groundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneMatrixArray);
        let cameraPos = new THREE.Vector3(eyeX, eyeY, eyeZ);
        cameraPos.applyMatrix4(groundPlaneMatrix);
        eyeX = cameraPos.x;
        eyeY = cameraPos.y;
        eyeZ = cameraPos.z;
        let targetPos = new THREE.Vector3(centerX, centerY, centerZ);
        targetPos.applyMatrix4(groundPlaneMatrix);
        centerX = targetPos.x;
        centerY = targetPos.y;
        centerZ = targetPos.z;
        return {a: eyeX, b: eyeY, c: eyeZ, d: centerX, e: centerY, f: centerZ};
    }
    
    // Working look-at matrix generator (with a set of vector3 math functions)
    function lookAt( eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ ) {
        let {a, b, c, d, e, f} = convertToThreejsContainerObjSpace(eyeX, eyeY, eyeZ, centerX, centerY, centerZ);
        eyeX = a; eyeY = b; eyeZ = c; centerX = d; centerY = e; centerZ = f;
        var ev = [eyeX, eyeY, eyeZ];
        var cv = [centerX, centerY, centerZ];
        var uv = [upX, upY, upZ];

        var n = normalize(add(ev, negate(cv))); // vector from the camera to the center point
        var u = normalize(crossProduct(uv, n)); // a "right" vector, orthogonal to n and the lookup vector
        var v = crossProduct(n, u); // resulting orthogonal vector to n and u, as the up vector isn't necessarily one anymore

        return [u[0], v[0], n[0], 0,
            u[1], v[1], n[1], 0,
            u[2], v[2], n[2], 0,
            dotProduct(negate(u), ev), dotProduct(negate(v), ev), dotProduct(negate(n), ev), 1];
    }

    function scalarMultiply(A, x) {
        return [A[0] * x, A[1] * x, A[2] * x];
    }

    function negate(A) {
        return [-A[0], -A[1], -A[2]];
    }

    function add(A, B) {
        return [A[0] + B[0], A[1] + B[1], A[2] + B[2]];
    }

    function sub(A, B) {
        return add(A, negate(B));
    }

    function hadamardProduct(A, B) {
        return [A[0] * B[0], A[1] * B[1], A[2] * B[2]];
    }

    function magnitude(A) {
        return Math.sqrt(A[0] * A[0] + A[1] * A[1] + A[2] * A[2]);
    }

    function normalize(A) {
        // include the edge case where A === [0, 0, 0]
        if (A[0] === 0 && A[1] === 0 && A[2] === 0) return A;
        var mag = magnitude(A);
        return [A[0] / mag, A[1] / mag, A[2] / mag];
    }

    function crossProduct(A, B) {
        var a = A[1] * B[2] - A[2] * B[1];
        var b = A[2] * B[0] - A[0] * B[2];
        var c = A[0] * B[1] - A[1] * B[0];
        return [a, b, c];
    }

    function dotProduct(A, B) {
        return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    }

    function multiplyMatrixVector(M, v) {
        return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
        M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
        M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
    }

    function sumOfElementDifferences(M1, M2) {
        // assumes M1 and M2 are of equal length
        let sum = 0;
        for (let i = 0; i < M1.length; i++) {
            sum += Math.abs(M1[i] - M2[i]);
        }
        return sum;
    }

    function getBaseLog(x, y) {
        return Math.log(y) / Math.log(x);
    }

    function clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }

    function prettyPrint(matrix, precision) {
        return '[ ' + matrix[0].toFixed(precision) + ', ' + matrix[1].toFixed(precision) + ', ' + matrix[2].toFixed(precision) + ']';
    }

    function tweenMatrix(currentMatrix, destination, tweenSpeed) {
        if (typeof tweenSpeed === 'undefined') { tweenSpeed = 0.5; } // default value

        if (currentMatrix.length !== destination.length) {
            console.warn('matrices are inequal lengths. cannot be tweened so just assigning current=destination');
            return realityEditor.gui.ar.utilities.copyMatrix(destination);
        }
        if (tweenSpeed <= 0 || tweenSpeed >= 1) {
            return realityEditor.gui.ar.utilities.copyMatrix(destination);
        }

        var m = [];
        for (var i = 0; i < currentMatrix.length; i++) {
            m[i] = destination[i] * tweenSpeed + currentMatrix[i] * (1.0 - tweenSpeed);
        }
        return m;
    }

    function getCameraZoomSensitivity() {
        return Math.max(0.01, realityEditor.gui.settings.toggleStates.cameraZoomSensitivity || 0.5);
    }

    function getCameraPanSensitivity() {
        return Math.max(0.01, realityEditor.gui.settings.toggleStates.cameraPanSensitivity || 0.5);
    }

    function getCameraRotateSensitivity() {
        return Math.max(0.01, realityEditor.gui.settings.toggleStates.cameraRotateSensitivity || 0.5);
    }

    exports.VirtualCamera = VirtualCamera;
})(realityEditor.device);
