---
layout: doc
title: Developing with the Motion Tool
permalink: /docs/vuforia-spatial-robotic-addon/interfaces/MIR100/tools/motion/motionToolDev
---

> IMPORTANT NOTE: Due to the current situation regarding COVID-19, we don't have access to the MIR100 AGV and have not been able to test the last tweaks to the interface. We have worked hard to ensure the correct functionality of the robotic addons but would much appreciate your patience if any bugs are found.


# Developing with the Motion tool

The Motion Tool is a [VST Spatial Tool](https://spatialtoolbox.vuforia.com/docs/use/spatial-tools) that allows for path planning and realtime motion visualization.
It is built with HTML and Javascript and uses Node.js in order to manage all the files and dependencies.

## Getting Started

The file index.html will be rendered on the VST once the tool is activated. 
This HTML file will trigger the Javascript file js/index.js that will start the code for the Motion Tool.

The Motion Tool has three main characteristics:

1. It is a **3D tool**. If you have explored the basic [VST Spatial Tools](https://spatialtoolbox.vuforia.com/docs/use/spatial-tools), they are mostly 2D HTML windows. The Motion Tool is a 3D tool. 
It makes use of [three.js](https://threejs.org/) to render its contents onto the environment.
2. It is a **full screen tool**. The basic VST tools often get attached to an object as a 2D window and don't take the entire screen when rendered. 
The motion tool is a full screen tool, it takes up all the device screen when rendered.
3. It is a **sticky tool**. Once our object/robot has been tracked, the motion tool will keep on being rendered even if we loose the tracking of our object robot.

## Main references in index.js

The Motion tool will be attached to an object (for example, a robot). When your device detects the object in the environment, the Motion Tool will automatically be loaded in full screen.
You can see some screenshots of the Motion Tool here: [Motion Tool readme file](motionTool.md).

We will explain here the different elements that you can find in the Motion Tool code. 
The index.js file is the starting point for the Motion Tool. 

The first object generated is the MainUI containing the UI for the tool with the tracking feedback icons and the buttons to reset a path and reset the tracking. Several callbacks are set up for the mainUI.

```js
const mainUI = new MainUI();
```

The ARScene will take care of generating the Three.js scene and adding all the 3D content.

```js
const arScene = new ARScene();
```

Then we will create the CheckpointUI, that will take care of the menu to select checkpoint parameters.
```js
const checkpointUI = new CheckpointUI();
```

And finally the SpatialInterface object allows us to connect with the [Vuforia Spatial Edge Server](https://github.com/ptcrealitylab/vuforia-spatial-edge-server)
```js
const spatialInterface = new SpatialInterface();
```

We subscribe to the following event in order to initialize our tool.

```js
spatialInterface.onRealityInterfaceLoaded(function() {
    // Initialization code
});
```

(In the next section we explain the initialization methods used)

We also have a method to send data to the server in the node called 'kineticNode2' specifically used by our robotic addon to receive paths data.
We will use this node to write to the publicData structure that will trigger the server to react every time there is new data.

```js
function pushPathsDataToServer(){
    let pathsData = [];
    arScene.paths.forEach(path => { pathsData.push(path.pathData); });

    // spatialInterface.writePublicData(nodeName, dataName, data);
    spatialInterface.writePublicData("kineticNode2", "pathData", pathsData);
}
```

In index.js we can also find the pointer events:
```js
document.addEventListener( 'pointerdown', pointerDown, false );
document.addEventListener( 'pointermove', pointerMove, false );
document.addEventListener( 'pointerup', pointerUp, false );
```

The Update method is called at 60fps.

```js
const loop = animitter(update);
```

## Spatial Interface initialization

The following methods are called in the onRealityInterfaceLoaded callback, in order to configure our tool:

| Method        | Explanation  |
|:------------- |:-------------|
| spatialInterface.setFullScreenOn();      | Set tool to full screen |
| spatialInterface.setStickyFullScreenOn();      | Set tool to sticky. It won't disappear if we loose tracking of our object|
| spatialInterface.subscribeToMatrix(); | Subscribe to data from matrices from objects and groundplane      |
| spatialInterface.addMatrixListener(renderRobotCallback); | Callback for when we receive matrix data from object tracked      |
| spatialInterface.addGroundPlaneMatrixListener(groundPlaneCallback); | Callback for when we receive matrix data from [Vuforia Ground Plane](https://library.vuforia.com/articles/Training/ground-plane-guide.html)     |
| spatialInterface.setVisibilityDistance(100); | We extend the visibility distance to 100 so that the tool does not disappear when getting further      |
| spatialInterface.getScreenDimensions(...); | Resize to screen dimensions      |
| spatialInterface.setMoveDelay(-1); | Keep pointer move active after some time of pointer down      |
| spatialInterface.addReadPublicDataListener(...); | This will allow us to add a listener for data from the edge server  |

## Important things to consider

#### The camera is fixed at 0,0,0
This means that we move all the 3D content along with our Ground Plane on the floor or along with our object tracked matrices.
That is why inside of ARScene, we are generating a parent object to contain all other objects:

```js
this.groundPlaneContainerObj = new THREE.Object3D();
```

We will constantly move this object in order to match the locations in our environment.

## Authors

* **[Anna Fuste](https://github.com/afustePTC)**

See also the list of [contributors](https://github.com/ptcrealitylab/vuforia-spatial-robotic-addon/graphs/contributors) who participated in this project.

## License

This project is licensed under the MPL 2.0 License - see the [LICENSE](../../../../LICENSE) file for details

## Acknowledgments

* Hat tip to anyone whose code was used
* We thank Robb Stark for being on our wall watching all of us during the development process

