Overview
========

The `tools` directory of each addon contains a set of applications that can be added to an AR
environment from the pocket of the Vuforia Spatial Toolbox iOS or Android app.

How it interacts with the Vuforia Spatial Edge Server
========================================

If you run an Edge Server on your computer, it will browse the contents of this directory and
load each of the tools (applications) into the set of possible tools that the server hosts and
knows how to process. If you go to `http://localhost:8080` in your web browser, and click on
`Spatial Tools`, you should see a row for each of the directories inside of this. Tools can be
enabled or disabled via this interface. The enabled state of each tool is stored persistently in
`tools/.identity/[tool-name]/settings.json`, which will be automatically generated when you run
the Edge Server if you haven't manually created one.

How to create a new tool
=========================

To create a new tool, simply create a new directory inside this directory. The name of the
directory will be the name of your tool. Your tool's directory should contain at least two files:

 - index.html
    - This is your application! You can build this similar to any standard web page, and the
      result will be available to add to your AR environment through the Spatial Toolbox app. To
      interact with AR capabilities, your html file should include
      `<script src="objectDefaultFiles/object.js">`. The `object.js` file contains the
      RealityInterface API, and will be injected at that location. For more information on building
      frames and using the RealityInterface API, see our additional documentation.
 - icon.gif
   - This is the icon that will appear in the menu and Toolbox pocket. It will be scaled
     to fit, so a specific pixel size is not necessary, but a small file on the order of 256px by
     256px will work well. To check that your icon has been added correctly, check if it appears
     next to the name of the tool on the Spatial Tools section of `localhost:8080` when the
     Edge Server is running.

A complete tutorial on creating a tool can be found
[here](https://github.com/ptcrealitylab/vuforia-spatial-toolbox-documentation/blob/master/make%20tools/toolTutorial.md).

Deleting a tool's directory will completely delete that tool from the server. To temporarily
disable a tool from being available to clients, it can be disabled on the web dashboard.
