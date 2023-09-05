## Read First
The Vuforia Spatial Toolbox and Vuforia Spatial Edge Server make up a shared research platform for exploring spatial computing as a community. This research platform is not an out of the box production-ready enterprise solution. Please read the [MPL 2.0 license](LICENSE) before use.

Join the conversations in our [discourse forum](https://forum.spatialtoolbox.vuforia.com) if you have questions, ideas want to collaborate or just say hi.


# vuforia-spatial-remote-operator-addon

The Remote Operator is an add-on for [Vuforia Spatial Toolbox](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-ios) that makes it compatible with the [Vuforia Spatial Toolbox Virtualizer](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-virtualizer) Unity project. The result is a browser-based web app that combines a live volumetric capture of a space with mixed reality content.

Full installation instructions are in the Vuforia Spatial Toolbox Virtualizer [README](https://github.com/ptcrealitylab/Vuforia-Spatial-Toolbox-Virtualizer#vuforia-spatial-toolbox-virtualizer).

This add-on contains two hardware interfaces:
1. `virtualizer`: This interface provides a websocket-based communication layer between the Vuforia Spatial Edge Server and the Unity application.
2. `remoteOperatorUI`: This interface will serve the Remote Operator web app on `localhost:8081`.

The add-on also contains some `content_scripts` that will modify the [Vuforia Spatial Toolbox User Interface](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-userinterface) to be able to run in a desktop browser environment in addition to on a mobile AR device.

**Special Setup instructions:**
1. Make sure to turn on both of these hardware interfaces in the "Manage Hardware Interfaces" tab of your Edge Server's web interface (`localhost:8080`)
2. The `remoteOperatorUI` interface needs to be configured with a path to a local copy of the [Vuforia Spatial Toolbox User Interface](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-userinterface) repository. Click on the yellow gear on the `remoteOperatorUI` interface to view its configurations, and type in the path (e.g. `/Users/Benjamin/Documents/vuforia-spatial-toolbox-userinterface`) and hit save.
3. After configuring, restart your edge server to serve the web app on port 8081.
4. In order to see any tools in the pocket menu of the Remote Operator, you need to have an activated "World Object" on your server. Click "Add World Object" on localhost:8080 and give it a target to activate it.

**Using the Remote Operator:**
1. Objects, Tools, and Nodes will only appear in the Remote Operator if they have been localized against a World Object. To do this, make sure you have a World Object set up on your edge server and give it an Image Target or Area Target. With your Vuforia Spatial Toolbox iOS app, look at that target first and then look at the other Objects in your space. This will save their locations (relative to the World Object's origin) in the edge server. The World Object's position will be treated as the (0,0,0) position in your Unity project, and all localized Object, Tools, and Nodes will be rendered relative to that.
2. The Remote Operator background will be blank until you connect to an Virtualizer. It will attempt to discover the possible Virtualizers in this network. Make sure your Unity project is running. Click on the drop-down menu in the top left to select a Virtualizer to connect to. Once connected, this Virtualizer must be designated as the "Primary Virtualizer". Go into the Settings menu (click the gear icon) and type in the IP address of the computer running the Unity project into the "Primary Virtualizer IP" field (e.g. `192.168.0.12`) and toggle this mode on. You should now see the video stream in the background.
3. To control the camera of the Remote Operator:
  - `Right-click`: Rotate Camera
  - `Shift + Right-click`: Pan Camera
  - `Scroll Wheel`: Zoom
  - `V`: Toggle visibility of extra UI
4. You can select multiple Virtualizers running on two different computers to receive a combined volumetric video for a larger area. Click on both Virtualizers in the drop-down menu to connect to them both, and ensure that one of them is set as the Primary Virtualizer.

Please use the [forum](https://forum.spatialtoolbox.vuforia.com) for any questions.
