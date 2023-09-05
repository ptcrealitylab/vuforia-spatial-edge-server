/** Class that draws to a 3D scene. */
class DrawingManager {
    /**
     * Creates a DrawingManager.
     * @param {THREE.Scene} scene - The scene to draw in.
     * @param {THREE.Camera} camera - The camera used for the scene.
     */
    constructor(scene, camera) {
        this.toolMap = {
            'LINE': new DrawingManager.Tool.Line(this),
            'ICON': new DrawingManager.Tool.Icon(this)
        };
        this.cursorMap = {
            'PROJECTION': new DrawingManager.Cursor.SmoothProjection(),
            'OFFSET': new DrawingManager.Cursor.Offset(),
        };

        this.tool = this.toolMap['LINE'];
        this.cursor = this.cursorMap['PROJECTION'];

        this.scene = scene;
        this.camera = camera;
        this.drawingGroup = new THREE.Group();
        this.scene.add(this.drawingGroup);

        this.erasing = false;
        this.raycaster = new THREE.Raycaster();

        this.eventStack = [];
        this.pointerDown = false;

        this.tempOffsetMode = false;

        this.interactionsActive = true;

        this.callbacks = {
            'color': [],
            'cursor': [],
            'eraseMode': [],
            'icon': [],
            'render': [],
            'size': [],
            'tool': [],
            'update': [],
            'visibility': []
        };
    }

    /**
     * Sets the visibility of the drawing.
     * @param visibility - The visibility of the drawing.
     */
    setVisibility(visibility) {
        this.drawingGroup.visible = visibility;
        this.triggerCallbacks('visibility', visibility);
    }

    /**
     * Adds a callback to the given listener.
     * @param name - The listener name.
     * @param cb - The callback.
     */
    addCallback(name, cb) {
        this.callbacks[name].push(cb);
    }

    /**
     * Triggers callbacks for the given listener.
     * @param name - The listener name.
     * @param value - The value passed to the callbacks.
     */
    triggerCallbacks(name, value) {
        this.callbacks[name].forEach(cb => cb(value));
    }

    /**
     * Serializes the drawing into a JSON format.
     * @returns {Object} - A serialized JSON object representing the drawing.
     */
    serializeDrawing() {
        const drawings = [];
        this.drawingGroup.children.forEach(drawing => {
            if (drawing.serialized) {
                drawings.push(drawing.serialized);
            }
        });
        return {drawings};
    }

    /**
     * Deserializes a serialized drawing and populates it into the scene, replacing the existing drawing.
     * @param {Object} obj - A serialized JSON object representing the drawing
     */
    deserializeDrawing(obj) {
        const newDrawings = obj.drawings.filter(newDrawing => !this.drawingGroup.children.some(drawing => newDrawing.drawingId === drawing.drawingId));

        // Remove drawings which are not present in the JSON
        this.drawingGroup.children.forEach(drawing => {
            if (drawing.serialized && !obj.drawings.some(newDrawing => newDrawing.drawingId === drawing.drawingId)) {
                this.drawingGroup.remove(drawing);
            }
        });

        // Add drawings that are not present in the scene
        newDrawings.forEach(newDrawing => {
            this.toolMap[newDrawing.tool].drawFromSerialized(this.drawingGroup, newDrawing);
        });
    }

    /**
     * Sets the drawing tool.
     * @param {DrawingManager.Tool} tool - The drawing tool.
     */
    setTool(tool) {
        this.setEraseMode(false);
        this.tool.endDraw(this.drawingGroup, this.cursor.getPosition());
        this.tool = tool;
        this.triggerCallbacks('tool', tool);
        this.triggerCallbacks('color', tool.color);
        this.triggerCallbacks('size', tool.size);
    }

    /**
     * Sets the cursor type.
     * @param {DrawingManager.Cursor} cursor - The cursor type.
     */
    setCursor(cursor) {
        this.setEraseMode(false);
        this.tool.endDraw(this.drawingGroup, this.cursor.getPosition());
        this.cursor = cursor;
        this.triggerCallbacks('cursor', cursor);
    }

    /**
     * Sets the drawing color.
     * @param {string} color - The color.
     */
    setColor(color) {
        this.setEraseMode(false);
        this.tool.endDraw(this.drawingGroup, this.cursor.getPosition());
        this.tool.setColor(color);
        this.triggerCallbacks('color', color);
    }

    /**
     * Sets the drawing size.
     * @param {number} size - The size.
     */
    setSize(size) {
        this.tool.endDraw(this.drawingGroup, this.cursor.getPosition());
        this.tool.setSize(size);
        this.triggerCallbacks('size', size);
    }

    /**
     * Enters or exits erase mode.
     * @param {boolean} value - Value to set the erase mode to.
     */
    setEraseMode(value) {
        this.erasing = value;
        this.tool.endDraw(this.drawingGroup, this.cursor.getPosition());
        this.triggerCallbacks('eraseMode', this.erasing);
    }

    /**
     * Sets the active icon for the icon tool by name, if it exists. Also sets the current tool to the Icon tool.
     * @param {string} iconName - The name of the icon to be set as active.
     */
    setIcon(iconName) {
        if (this.toolMap['ICON'].iconNames.includes(iconName)) {
            this.toolMap['ICON'].setIcon(iconName);
            this.setTool(this.toolMap['ICON']);
            this.triggerCallbacks('icon', iconName);
        }
    }

    /**
     * Erases lines drawn under the pointer.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    erase(pointerEvent) {
        const position = {
            x: (pointerEvent.pageX / window.innerWidth) * 2 - 1,
            y: - (pointerEvent.pageY / window.innerHeight) * 2 + 1,
        };

        this.raycaster.setFromCamera(new THREE.Vector2(position.x, position.y), this.camera);
        const serializedDrawings = [];
        const serializedChildren = [];
        this.drawingGroup.children.forEach(obj => {
            if (obj.serialized) {
                serializedDrawings.push(obj);
                obj.traverse(child => {
                    if (child === obj) {
                        return;
                    }
                    child.serializedParent = obj;
                    serializedChildren.push(child);
                });
            }
        });
        const intersects = this.raycaster.intersectObjects(serializedDrawings);
        intersects.forEach(intersect => {
            if (intersect.object.serialized) {
                intersect.object.parent.remove(intersect.object);
                const undoEvent = {
                    type: 'draw',
                    data: intersect.object.serialized
                };
                this.pushUndoEvent(undoEvent);
            }
        });
        const childIntersects = this.raycaster.intersectObjects(serializedChildren);
        childIntersects.forEach(intersect => {
            if (intersect.object.serializedParent) {
                intersect.object.serializedParent.parent.remove(intersect.object.serializedParent);
                const undoEvent = {
                    type: 'draw',
                    data: intersect.object.serializedParent.serialized
                };
                this.pushUndoEvent(undoEvent);
            }
        });
    }

    /**
     * Calls updateCallbacks with the current state of the drawing.
     */
    shareUpdates() {
        const serializedDrawings = this.serializeDrawing();
        this.triggerCallbacks('update', serializedDrawings);
    }

    /**
     * Adds an undoable event to the event stack.
     * @param {Object} event - The event to be performed if undo is pressed.
     */
    pushUndoEvent(event) {
        this.eventStack.push(event);
        this.shareUpdates();
    }

    /**
     * Performs the most recent event in the event stack.
     */
    popUndoEvent() {
        const event = this.eventStack.pop();
        if (!event) {
            return;
        }
        if (event.type === 'erase') {
            const target = this.drawingGroup.children.find(child => event.data.drawingId === child.drawingId);
            if (!target) { // Object may have been erased by another user
                this.popUndoEvent(); // Skip this undo and undo the next event in the stack
                return;
            }
            target.parent.remove(target);
        } else if (event.type === 'draw') {
            this.toolMap[event.data.tool].drawFromSerialized(this.drawingGroup, event.data);
        }
        this.shareUpdates();
    }

    /**
     * Enables drawing interactions
     */
    enableInteractions() {
        this.interactionsActive = true;
    }

    /**
     * Disables drawing interactions
     */
    disableInteractions() {
        this.interactionsActive = false;
    }

    /**
     * Calls startDraw on the current tool with the position given by the current cursor.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    onPointerDown(pointerEvent) {
        if (!this.interactionsActive) {
            return;
        }
        this.pointerDown = true;
        if (this.cursor === this.cursorMap['PROJECTION'] && !this.erasing) {
            if (!pointerEvent.projectedZ) {
                this.setCursor(this.cursorMap['OFFSET']);
                this.tempOffsetMode = true;
            }
        }
        this.cursor.updatePosition(this.scene, this.camera, pointerEvent);
        if (this.erasing) {
            this.erase(pointerEvent);
        } else {
            this.tool.startDraw(this.drawingGroup, this.cursor.getPosition(), this.cursor.getNormal());
        }
    }

    /**
     * Calls moveDraw on the current tool with the position given by the current cursor.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    onPointerMove(pointerEvent) {
        if (!this.interactionsActive) {
            return;
        }
        this.cursor.updatePosition(this.scene, this.camera, pointerEvent);
        if (this.erasing && this.pointerDown) {
            this.erase(pointerEvent);
        } else {
            this.tool.moveDraw(this.drawingGroup, this.cursor.getPosition(), this.cursor.getNormal());
        }
    }

    /**
     * Calls endDraw on the current tool with the position given by the current cursor.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    onPointerUp(pointerEvent) {
        if (!this.interactionsActive) {
            return;
        }
        this.pointerDown = false;
        this.cursor.updatePosition(this.scene, this.camera, pointerEvent);
        if (this.erasing) {
            this.erase(pointerEvent);
        } else {
            this.tool.endDraw(this.drawingGroup, this.cursor.getPosition(), this.cursor.getNormal());
        }
        if (this.tempOffsetMode) {
            this.tempOffsetMode = false;
            this.setCursor(this.cursorMap['PROJECTION']);
        }
    }
}

/* ========== Classes ========== */
/** Class that defines behavior for drawing style within DrawingManager */
DrawingManager.Tool = class {
    /**
     * Creates a Tool.
     */
    constructor(drawingManager) {
        this.drawingManager = drawingManager;
        this.size = 20;
        this.color = '#FF009F';
        this.meshLineMaterial = generateMeshLineMaterial(this.size, this.color);
    }

    /**
     * Starts drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    startDraw() {
    }

    /**
     * Updates drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    moveDraw() {
    }

    /**
     * Finishes drawing with the tool. Can be called when tool is not currently drawing.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    endDraw() {
    }

    /**
     * Creates a drawing from a serialized version.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {Object} drawing - The serialized object defining the object to be drawn.
     */
    drawFromSerialized() {
    }

    /**
     * Sets the drawing size.
     * @param {number} size - The size.
     */
    setSize(size) {
        this.size = size;
    }

    /**
     * Sets the drawing color.
     * @param {string} color - The color.
     */
    setColor(color) {
        this.color = color;
    }
};

/** Class that defines behavior for drawing placement within DrawingManager */
DrawingManager.Cursor = class {
    /**
     * Creates a Cursor.
     */
    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.normal = new THREE.Vector3(0, 1, 0);
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Updates the cursor position and normal.
     * @param {THREE.Scene} scene - The scene to calculate the position in.
     * @param {THREE.Camera} camera - The camera used for calculating the cursor position.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    updatePosition() {
    }

    /**
     * Gets the current cursor position.
     * @returns {THREE.Vector3} - The position of the cursor in the scene.
     */
    getPosition() {
        return this.position;
    }

    /**
     * Gets the current surface normal.
     * @returns {THREE.Vector3} - The normal of the cursor in the scene.
     */
    getNormal() {
        return this.normal;
    }

    /**
     * Calculates the camera ray for a given pointer event.
     * @param {PointerEvent} pointerEvent - The triggering pointer event.
     * @param {THREE.Camera} camera - The scene's camera.
     * @return {THREE.Ray} - The ray that emits from the camera into the scene.
     */
    getScreenRay(pointerEvent, camera) {
        const position = {
            x: (pointerEvent.pageX / window.innerWidth) * 2 - 1,
            y: - (pointerEvent.pageY / window.innerHeight) * 2 + 1,
        };
        this.raycaster.setFromCamera(position, camera);
        return this.raycaster.ray;
    }

    /**
     * Projects a ray a specified distance and returns the position of that point in the scene's coordinate system.
     * @param {PointerEvent} pointerEvent - The triggering pointer event.
     * @param {number} distance - The distance into the scene to project.
     * @param {THREE.Camera} camera - The scene's camera.
     * @param {THREE.Scene} scene - The scene to calculate the final position in.
     * @return {THREE.Vector3} - The position of the calculated point.
     */
    screenProject(pointerEvent, distance, camera, scene) {
        const ray = this.getScreenRay(pointerEvent, camera);
        return ray.origin.clone().add(ray.direction.clone().multiplyScalar(distance)).applyMatrix4(camera.matrixWorld).applyMatrix4(scene.matrixWorld.clone().invert());
    }
};

/**
 * Generates a material for MeshLine drawing given a size and a color.
 * @param {number} size - The size of the MeshLine being drawn.
 * @param {string} color - The color of the material.
 * @return {MeshLineMaterial} - The generated brush material.
 */
function generateMeshLineMaterial(size, color) {
    return new MeshLineMaterial({
        lineWidth: size,
        color: color
    });
}

DrawingManager.Tool.Line = class extends DrawingManager.Tool {
    /**
     * Creates a Line Tool.
     */
    constructor(drawingManager) {
        super(drawingManager);

        this.currentLine = null;

        this.lastPointTime = 0;
        this.minimumUpdate = {
            distance: 5,
            time: 1000
        };
    }

    /**
     * Starts drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     */
    startDraw(parent, position) {
        this.currentLine = {
            points: [position.clone()],
            meshLine: new MeshLine(),
            obj: null,
        };

        this.lastPointTime = Date.now();
    }

    /**
     * Updates drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     */
    moveDraw(parent, position) {
        if (!this.currentLine) {
            return;
        }
        const lastPosition = this.currentLine.points[this.currentLine.points.length - 1];
        const newPosition = position.clone();

        if (newPosition.clone().sub(lastPosition).length() < this.minimumUpdate.length && Date.now() - this.lastPointTime < this.minimumUpdate.time) {
            return; // Return if the cursor hasn't moved far enough and enough time hasn't passed, simplifies path when cursor doesn't move much for a bit
        }
        this.lastPointTime = Date.now();

        this.currentLine.points.push(newPosition);
        const curve = new THREE.CatmullRomCurve3(this.currentLine.points);
        this.currentLine.meshLine.setPoints(curve.getPoints(1000));
        if (this.currentLine.obj) {
            this.currentLine.obj.geometry.dispose();
            this.currentLine.obj.material.dispose();
            this.currentLine.obj.parent.remove(this.currentLine.obj);
            this.currentLine.obj = null;
        }
        const mesh = new THREE.Mesh(this.currentLine.meshLine, this.meshLineMaterial);
        mesh.raycast = MeshLineRaycast;
        this.currentLine.obj = mesh;
        parent.add(this.currentLine.obj);
    }

    /**
     * Finishes drawing with the tool. Can be called when tool is not currently drawing.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     */
    endDraw() {
        if (this.currentLine && this.currentLine.obj) {
            this.currentLine.obj.drawingId = `${Math.round(Math.random() * 100000000)}`;

            const undoEvent = {
                type: 'erase',
                data: {
                    drawingId: this.currentLine.obj.drawingId
                }
            };

            this.currentLine.obj.serialized = {
                tool: 'LINE',
                points: this.currentLine.points,
                size: this.size,
                color: this.color,
                drawingId: this.currentLine.obj.drawingId
            };
            this.currentLine = null;
            this.lastPointTime = 0;
            this.drawingManager.pushUndoEvent(undoEvent);
        } else {
            this.currentLine = null;
            this.lastPointTime = 0;
        }
    }

    /**
     * Creates a drawing from a serialized version.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {Object} drawing - The serialized object defining the object to be drawn.
     */
    drawFromSerialized(parent, drawing) {
        const meshLineMaterial = generateMeshLineMaterial(drawing.size, drawing.color);

        const threePoints = drawing.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
        const curve = new THREE.CatmullRomCurve3(threePoints);
        const meshLine = new MeshLine();
        meshLine.setPoints(curve.getPoints(1000));
        const mesh = new THREE.Mesh(meshLine, meshLineMaterial);
        mesh.raycast = MeshLineRaycast;
        mesh.drawingId = drawing.drawingId;
        mesh.serialized = drawing;
        parent.add(mesh);
    }

    /**
     * Sets the drawing size.
     * @param {number} size - The size.
     */
    setSize(size) {
        super.setSize(size);
        this.meshLineMaterial = generateMeshLineMaterial(size, this.color);
    }

    /**
     * Sets the drawing color.
     * @param {string} color - The color.
     */
    setColor(color) {
        super.setColor(color);
        this.meshLineMaterial = generateMeshLineMaterial(this.size, color);
    }
};

DrawingManager.Tool.Icon = class extends DrawingManager.Tool {
    /**
     * Creates an Icon Tool.
     */
    constructor(drawingManager) {
        super(drawingManager);

        this.iconNames = ['press', 'pull', 'push', 'rotateCCW', 'rotateCW'];
        this.icons = {}; // Icons will be loaded into this
        this.selectedIcon = null; // Icon to place into scene
        this.currentObj = null; // Object that is moved around scene during drawing

        this.gltfLoader = new THREE.GLTFLoader();
        const loadingPromises = this.iconNames.map(iconName => {
            const url = `resources/glb/${iconName}.glb`;
            return new Promise((resolve, reject) => {
                this.gltfLoader.load(url, gltf => {
                    gltf.iconName = iconName;
                    this.icons[iconName] = gltf;
                    resolve();
                }, () => {}, error => {
                    console.error(error);
                    reject(error);
                });
            });
        });

        Promise.allSettled(loadingPromises).then(() => {
            this.selectedIcon = this.icons[this.iconNames[0]];
        }).catch(error => {
            console.error('error occurred in icon tool loading');
            console.error(error);
        });
    }

    /**
     * Sets the active icon.
     * @param {string} iconName - The icon to be set as active.
     */
    setIcon(iconName) {
        if (this.iconNames.includes(iconName)) {
            this.selectedIcon = this.icons[iconName];
        }
    }

    /**
     * Starts drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    startDraw(parent, position, normalVector) {
        if (this.currentObj) {
            return;
        }
        const currentObj = this.selectedIcon.scene.clone();
        currentObj.iconName = this.selectedIcon.iconName;
        currentObj.traverse(obj => {
            if (obj.material) {
                obj.material = new THREE.MeshLambertMaterial({color: this.color});
            }
        });
        parent.add(currentObj);
        currentObj.position.copy(position);
        currentObj.scale.multiplyScalar(this.size * 10);
        currentObj.lookAt(currentObj.getWorldPosition().add(normalVector));
        currentObj.normalVector = normalVector;

        currentObj.animationMixer = new THREE.AnimationMixer(currentObj);
        currentObj.lastRender = 0;
        this.drawingManager.addCallback('render', _now => {
            const deltaSeconds = (_now - currentObj.lastRender) / 1000;
            currentObj.lastRender = _now;
            currentObj.animationMixer.update(deltaSeconds);
        });
        this.selectedIcon.animations.forEach(animation => {
            currentObj.animationMixer.clipAction(animation).play();
        });

        this.currentObj = currentObj;
    }

    /**
     * Updates drawing with the tool.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    moveDraw(parent, position, normalVector) {
        if (!this.currentObj) {
            return;
        }
        this.currentObj.position.copy(position);
        this.currentObj.lookAt(this.currentObj.getWorldPosition().add(normalVector));
        this.currentObj.normalVector = normalVector;
    }

    /**
     * Finishes drawing with the tool. Can be called when tool is not currently drawing.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {THREE.Vector3} position - The position of the cursor.
     * @param {THREE.Vector3} normalVector - The direction of the normal at raycast hit.
     */
    endDraw() {
        if (!this.currentObj) {
            return;
        }

        this.currentObj.drawingId = `${Math.round(Math.random() * 100000000)}`;

        const undoEvent = {
            type: 'erase',
            data: {
                drawingId: this.currentObj.drawingId
            }
        };

        this.currentObj.serialized = {
            tool: 'ICON',
            color: this.color,
            size: this.size,
            iconName: this.currentObj.iconName,
            position: this.currentObj.position.clone(),
            normalVector: this.currentObj.normalVector.clone().applyMatrix4(this.drawingManager.scene.matrixWorld.clone().transpose()),
            drawingId: this.currentObj.drawingId
        };
        this.drawingManager.pushUndoEvent(undoEvent);

        this.currentObj = null;
    }

    /**
     * Creates a drawing from a serialized version.
     * @param {THREE.Object3D} parent - The parent object to draw in.
     * @param {Object} drawing - The serialized object defining the object to be drawn.
     */
    drawFromSerialized(parent, drawing) {
        if (!this.iconNames.includes(drawing.iconName)) {
            console.error(`Attempted to load icon with name "${drawing.iconName}" that doesn't exist`);
            return;
        }
        if (!this.icons[drawing.iconName]) { // Hasn't loaded gltf yet
            setTimeout(() => this.drawFromSerialized(parent, drawing), 500);
            return;
        }
        const selectedIcon = this.icons[drawing.iconName];
        const obj = selectedIcon.scene.clone();
        obj.iconName = selectedIcon.iconName;
        obj.traverse(child => {
            if (child.material) {
                child.material = new THREE.MeshLambertMaterial({color: drawing.color});
            }
        });
        parent.add(obj);
        obj.scale.multiplyScalar(drawing.size * 10);
        obj.position.copy(drawing.position);

        drawing.normalVector = new THREE.Vector3(drawing.normalVector.x, drawing.normalVector.y, drawing.normalVector.z);
        // Note: I do not know why (mathematically) the normal needs to be negated here. If not negated, it points the wrong direction.
        const transformedNormal = drawing.normalVector.clone().negate().applyMatrix4(this.drawingManager.scene.matrixWorld.clone().invert().transpose());
        obj.lookAt(obj.getWorldPosition().add(transformedNormal));
        obj.normalVector = transformedNormal;

        obj.animationMixer = new THREE.AnimationMixer(obj);
        obj.lastRender = 0;
        this.drawingManager.addCallback('render', _now => {
            const deltaSeconds = (_now - obj.lastRender) / 1000;
            obj.lastRender = _now;
            obj.animationMixer.update(deltaSeconds);
        });
        selectedIcon.animations.forEach(animation => {
            obj.animationMixer.clipAction(animation).play();
        });

        obj.drawingId = drawing.drawingId;
        obj.serialized = drawing;
    }
};

DrawingManager.Cursor.Offset = class extends DrawingManager.Cursor {
    /**
     * Creates an Offset Cursor.
     */
    constructor() {
        super();
        this.offset = 500;
        this.position = new THREE.Vector3(0, 0, 0);
    }

    /**
     * Updates the cursor position and normal.
     * @param {THREE.Scene} scene - The scene to calculate the position in.
     * @param {THREE.Camera} camera - The camera used for calculating the cursor position.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    updatePosition(scene, camera, pointerEvent) {
        this.position = this.screenProject(pointerEvent, this.offset, camera, scene);
        this.normal = this.getScreenRay(pointerEvent, camera).direction.clone().negate();
    }
};

// DrawingManager.Cursor.Projection = class extends DrawingManager.Cursor {
//     /**
//      * Creates a Projection Cursor.
//      */
//     constructor() {
//         super();
//         this.position = new THREE.Vector3(0, 0, 0);
//     }
//
//     /**
//      * Updates the cursor position.
//      * @param {THREE.Scene} scene - The scene to calculate the position in.
//      * @param {THREE.Camera} camera - The camera used for calculating the cursor position.
//      * @param {Object} pointerEvent - The triggering pointer event.
//      */
//     updatePosition(scene, camera, pointerEvent) {
//         const offset = pointerEvent.projectedZ;
//         if (!offset) {
//             return;
//         }
//         this.position = super.screenProject(pointerEvent, offset, camera, scene);
//     }
//
//     /**
//      * Gets the current cursor position.
//      * @returns {THREE.Vector3} - The position of the cursor in the scene.
//      */
//     getPosition() {
//         return this.position;
//     }
// };

DrawingManager.Cursor.SmoothProjection = class extends DrawingManager.Cursor {
    /**
     * Creates a Smooth Projection Cursor, preventing the cursor from jumping into the distance.
     */
    constructor() {
        super();
        this.position = new THREE.Vector3(0, 0, 0);
        this.jumpDistanceLimit = 500; // Distance diff considered to be too big, must be smoothed
        this.lastOffset = 0; // Distance at which to draw when going over holes, updated when hitting surface
        this.lastNormal = this.normal; // Normal to use when going over holes, updated when hitting surface
        this.bumpTowardsCamera = 15; // Distance by which to shift the cursor towards the camera to prevent z-fighting with surfaces
        this.activeCursor = false; // Successful pointerdown over geometry
        this.planePoints = [];
        this.logDebug = false;
    }

    debug(msg) {
        if (this.logDebug) {
            console.log(msg);
        }
    }

    addPlanePoint(position, scene) {
        if (this.planePoints.length < 3) {
            const planePoint = new THREE.Object3D();
            scene.add(planePoint);
            planePoint.position.copy(position);
            this.planePoints.push(planePoint);
        } else {
            const planePoint = this.planePoints.shift();
            planePoint.position.copy(position);
            this.planePoints.push(planePoint);
        }
    }

    /**
     * Updates the cursor position.
     * @param {THREE.Scene} scene - The scene to calculate the position in.
     * @param {THREE.Camera} camera - The camera used for calculating the cursor position.
     * @param {Object} pointerEvent - The triggering pointer event.
     */
    updatePosition(scene, camera, pointerEvent) {
        const projectedZ = pointerEvent.projectedZ;
        if (pointerEvent.type === 'pointerdown') {
            this.activeCursor = !!projectedZ;
            this.planePoints.forEach(planePoint => planePoint.parent.remove(planePoint));
            this.planePoints = [];
        }
        if (pointerEvent.type === 'pointerup') {
            this.activeCursor = false;
        }
        if (!this.activeCursor) {
            return;
        }

        const screenRay = this.getScreenRay(pointerEvent, camera);
        const lastOffsetPosition = this.screenProject(pointerEvent, this.lastOffset - this.bumpTowardsCamera, camera, scene);
        if (projectedZ) {
            const meshProjectedPosition = this.screenProject(pointerEvent, projectedZ - this.bumpTowardsCamera, camera, scene);
            if (this.planePoints.length === 3) { // If plane has been defined
                const plane = new THREE.Plane().setFromCoplanarPoints(...this.planePoints.map(p => p.position.clone().applyMatrix4(scene.matrixWorld).applyMatrix4(camera.matrixWorldInverse)));
                if (screenRay.distanceToPlane(plane) !== null) {
                    const planeProjectedPosition = this.screenProject(pointerEvent, screenRay.distanceToPlane(plane) - this.bumpTowardsCamera, camera, scene);
                    if (Math.abs(projectedZ - this.lastOffset) > this.jumpDistanceLimit) {
                        this.lastOffset = screenRay.distanceToPlane(plane); // Set hole offset with successful draw distance
                        this.debug('plane projection, jump too big');
                        this.position = planeProjectedPosition;
                        if (screenRay.direction.dot(plane.normal) > 0) {
                            this.normal = plane.normal.clone().negate();
                        } else {
                            this.normal = plane.normal;
                        }
                        this.lastNormal = this.normal;
                    } else {
                        this.lastOffset = projectedZ; // Set hole offset with successful draw distance
                        this.debug('mesh projection, default');
                        this.addPlanePoint(meshProjectedPosition, scene);
                        this.position = meshProjectedPosition;
                        this.normal = new THREE.Vector3(pointerEvent.worldIntersectPoint.normalVector.x, pointerEvent.worldIntersectPoint.normalVector.y, pointerEvent.worldIntersectPoint.normalVector.z);
                        this.lastNormal = this.normal;
                    }
                } else {
                    this.lastOffset = projectedZ; // Set hole offset with successful draw distance
                    this.debug('mesh projection, failed to intersect plane');
                    this.addPlanePoint(meshProjectedPosition, scene);
                    this.position = meshProjectedPosition;
                    this.normal = new THREE.Vector3(pointerEvent.worldIntersectPoint.normalVector.x, pointerEvent.worldIntersectPoint.normalVector.y, pointerEvent.worldIntersectPoint.normalVector.z);
                    this.lastNormal = this.normal;
                }
            } else { // If plane has not yet been defined
                if (pointerEvent.type === 'pointerdown' || Math.abs(this.lastOffset - projectedZ) < this.jumpDistanceLimit) {
                    this.lastOffset = projectedZ; // Set hole offset with successful draw distance
                    this.debug('mesh projection, plane undefined');
                    this.addPlanePoint(meshProjectedPosition, scene);
                    this.position = meshProjectedPosition;
                    this.normal = new THREE.Vector3(pointerEvent.worldIntersectPoint.normalVector.x, pointerEvent.worldIntersectPoint.normalVector.y, pointerEvent.worldIntersectPoint.normalVector.z);
                    this.lastNormal = this.normal;
                } else { // If hole into other geometry
                    this.debug('hole projection, jump too big');
                    this.position = lastOffsetPosition;
                    this.normal = this.lastNormal;
                }
            }
        } else { // If hole into empty space
            if (this.planePoints.length === 3) { // If plane has been defined
                const plane = new THREE.Plane().setFromCoplanarPoints(...this.planePoints.map(p => p.position.clone().applyMatrix4(scene.matrixWorld).applyMatrix4(camera.matrixWorldInverse)));
                if (screenRay.distanceToPlane(plane) !== null) {
                    const planeProjectedPosition = this.screenProject(pointerEvent, screenRay.distanceToPlane(plane) - this.bumpTowardsCamera, camera, scene);
                    this.lastOffset = screenRay.distanceToPlane(plane); // Set hole offset with successful draw distance
                    this.debug('plane projection, no mesh, default');
                    this.position = planeProjectedPosition;
                    if (screenRay.direction.dot(plane.normal) > 0) {
                        this.normal = plane.normal.clone().negate();
                    } else {
                        this.normal = plane.normal;
                    }
                    this.lastNormal = this.normal;
                } else {
                    this.debug('hole projection, no mesh, failed to intersect plane');
                    this.position = lastOffsetPosition;
                    this.normal = this.lastNormal;
                }
            } else {
                this.debug('hole projection, no mesh, plane undefined');
                this.position = lastOffsetPosition;
                this.normal = this.lastNormal;
            }
        }
    }
};
