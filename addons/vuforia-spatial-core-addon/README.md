# Vuforia Spatial Edge Server Core Add-on

This is the core-addon for the Vuforia Spatial Edge Server. It provides a
baseline set of blocks, interfaces, nodes, and tools to the Edge Server. The
server loads code from blocks, interfaces, and nodes. The editor user interface
loads blocks, nodes, and tools.

## Read First
The Vuforia Spatial Toolbox and Vuforia Spatial Edge Server make up a shared research platform for exploring spatial computing as a community. This research platform is not an out of the box production-ready enterprise solution. Please read the [MPL 2.0 license](LICENSE) before use.

Join the conversations in our [discourse forum](https://forum.spatialtoolbox.vuforia.com) if you have questions, ideas want to collaborate or just say hi.

## Add-on Content Types

### Blocks

Logic blocks available in the data crafting board.

### Interfaces

Hardware interfaces which translate between the hardwareInterface.js API and
the hardware.

### Nodes

Programming nodes associated with an object that can produce and consume
values.

### Tools

Tools which the user can place on objects or float in world space to provide
useful interactions.

### Content Scripts

Low-level scripts placed directly into the user interface's context as if they
were part of the editor's code.


## Examples

This repo contains examples for blocks, interfaces, nodes, and tools. Content
scripts are more niche but a simple "hello world" example looks like this:

```javascript
(function() {
    function initService() {
        let messageDiv = document.createElement('div');
        messageDiv.style.position = 'absolute';
        messageDiv.style.left = 0;
        messageDiv.style.top = 0;
        messageDiv.style.fontFamily = 'sans-serif';
        messageDiv.style.fontSize = '12px';
        messageDiv.style.color = 'cyan';
        messageDiv.style.pointerEvents = 'none';
        messageDiv.textContent = 'Hello world!';

        document.body.appendChild(messageDiv);
    }

    realityEditor.addons.addCallback('init', initService);
}());
```

## Using the Kepware Interface

The Kepware Interface is compatible with both [KEPServerEX](https://www.kepware.com/en-us/products/kepserverex/) and [Kepware Edge](https://www.kepware.com/en-us/products/thingworx-kepware-edge/).

### Kepware Connection Instructions
1. Enter the Hardware Interfaces tab on the Vuforia Spatial Edge Server Web UI.
![](interfaces/kepware/images/kepA.png "Selecting the Manage Hardware Interfaces button")
2. Enable the Kepware interface.
![](interfaces/kepware/images/kepB.png "Clicking the toggle button to toggle the Kepware interface on")
3. Enter in your connection details and save your changes.
![](interfaces/kepware/images/kepC.png "Entering in the connection details and saving changes")
4. On your KEPServerEX or Kepware Edge server, browse through the rejected certificate list and accept the most recent certificate. This process differs between the two servers, so consult the corresponding User Manual (available at https://www.kepware.com/en-us/products/kepserverex/ and https://www.kepware.com/en-us/products/thingworx-kepware-edge/ respectively).
5. Refresh the page after a moment to see the available tags.
![](interfaces/kepware/images/kepD.png "Highlighting the notice on the page reminding the user to refresh")
6. Select the tags you want to use and save your changes.
![](interfaces/kepware/images/kepE.png "Tag selection menu with a few tags selected and the Save Changes button highlighted")
7. (Optional) You can also filter the tag results if you are looking for a specific tag. 
![](interfaces/kepware/images/kepF.png "Filtering for the word 'sine' in the tag selection menu") 
8. The tags you selected will now be available in the Spatial Toolbox!
![](interfaces/kepware/images/kepG.png "Object listing UI showing the newly added tags")
