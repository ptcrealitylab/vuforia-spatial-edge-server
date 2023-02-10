---
layout: doc
title: Edge Server API
permalink: /docs/dive-deeper/internals/edge-server-api
---

## REST Interface - GET


### GET /allObjects

Returns an array of identifying information for each of the objects on this server

[http://localhost:8080/allObjects](http://localhost:8080/allObjects)

```javascript
[
  {
    "id": "_HUMAN_device_kgr6hd42f1z", // Unique identifier
    "ip": "192.168.0.20", // Ip address of object (usually corresponds to the server's)
    "port": 8080,         // Port for accessing object (usually corresponds to the server's)
    "vn": 322,            // Version number
    "pr": "R2",           // Protocol variation
    "tcs": 0              // Checksum if applicable
  }, {
    "id": "_WORLD_instantScan_yay1j3zgtoe",
    "ip": "192.168.0.20",
    "port": 8080,
    "vn": 322,
    "pr": "R2",
    "tcs": "2ngwZJ"
  }
]
```

### GET /object/:objectID

Returns the object.json file for this object

[http://localhost:8080/object/\_WORLD_instantScan_yay1j3zgtoe](http://localhost:8080/object/_WORLD_instantScan_yay1j3zgtoe)

```javascript
{
  "objectId":"_WORLD_instantScan_yay1j3zgtoe",
  "name":"_WORLD_instantScan",
  "matrix": [],
  ...
  "frames": {}
  ...
}
```

### GET /obj/:objectName/target/:filenameWithExtension

Downloads the Vuforia target file for this object. Note that it uses the object name, not the full ID. You should download at least the xml and dat for each object you want Vuforia to track.

Possible filenameWithExtensions:

 - target.dat
   - [http://192.168.0.20:8080/obj/\_WORLD_instantScan/target/target.dat](http://192.168.0.20:8080/obj/_WORLD_instantScan/target/target.dat)
   - This is the dataset, needs to be added to Vuforia
 - target.xml
   - [http://192.168.0.20:8080/obj/\_WORLD_instantScan/target/target.xml](http://192.168.0.20:8080/obj/_WORLD_instantScan/target/target.xml)
   - This is the metadata for the dataset, needs to be added to Vuforia. Also contains the objectID so the tracked object gets mapped properly back to a Toolbox object.

 - target.jpg
   - You probably don't need this unless your object was created with an instant image target
 - target.glb
   - [http://192.168.0.20:8080/obj/\_WORLD_instantScan/target/target.glb](http://192.168.0.20:8080/obj/_WORLD_instantScan/target/target.glb)
   - This only exists on world objects – it is the static 3D model that can be rendered

### GET /spatial/sceneGraph

Returns a computed spatial graph with all the information about where everything in the server is located.

This doesn't contain any new information that you can't already find in the object.json, but it can help in some cases since it already computed the math of where everything is in a single coordinate system.

[http://localhost:8080/spatial/sceneGraph](http://localhost:8080/spatial/sceneGraph)

```javascript
{
  "ROOT": {
    "localMatrix":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    "worldMatrix":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    "children": ["_WORLD_instantScan_yay1j3zgtoe"],
    "parent":null,
    // ...
    },
  "_WORLD_instantScan_yay1j3zgtoe":{
    "localMatrix":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    "worldMatrix":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    children: ["_HUMAN_device_kgr6hd42f1z"],
    "parent":"ROOT"
    // ...
  }
  // ...
}
```

## REST Interface - POST

### POST / with body: "action=new&name=objectName&isWorld=false"

[http://localhost:8080/](http://localhost:8080/)

Creates a new object with that name. Make sure you have the right params in the body

Example request (using javascript fetch):

```javascript
var params = new URLSearchParams({action: 'new', name: objectName, isWorld: false});
fetch('http://' + serverIp + ':' + serverPort + '/', {
  method: 'POST',
  body: params
}).then((response) => {
  console.log('added new object', response);
});
```

### POST /generateFrame

[http://localhost:8080/object/test_Peoqk0h4lgb/generateFrame](http://localhost:8080/object/test_Peoqk0h4lgb/generateFrame)

Creates a frame of the specified type attached to the specified object

Example request (from terminal):

```bash
curl --header "Content-type: application/json" -d "{\"frameType\":\"graphUI\", \"relativeMatrix\":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}" http://localhost:8080/object/test_Peoqk0h4lgb/generateFrame
```

### POST /object/:objectID/frame/:frameID/node/null/size/

[http://localhost:8080/object/\_WORLD_instantScan_yay1j3zgtoe/frame/\_WORLD_instantScan_yay1j3zgtoegraphUI/node/null/size/](http://localhost:8080/object/_WORLD_instantScan_yay1j3zgtoe/frame/_WORLD_instantScan_yay1j3zgtoegraphUI/node/null/size/)

Change the size and/or position (the API name is misleading) of a tool and save it persistently on the server. Nodes can be updated with a similar API by specifying the nodeID instead of null and using /nodeSize/ instead of /size/ in the url.

```bash
curl --header "Content-type: application/json" -d "{\"x\":100, \"y\":100, \"scale\":2.0, \"matrix\":[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}" http://localhost:8080/object/test_Peoqk0h4lgb/generateFrame
```


## Socket Interface

In general, the server follows this pattern for real-time data updates: emit a
/subscribe message one time when your client starts up to register that client
in the server as a listener for a particular type of message. Whenever a
corresponding message is emitted, the server will broadcast it to all
registered clients (toolbox iOS clients, remote operators, hardware interfaces,
or anything else listenening)

Socket messages you send should be JSON.stringified and all contain a property
called "editorId" which is a random ID for your device that makes sure the
server doesn't send messages back to the sender in an infinite loop.

Note that these socket messages won't actually save the persistent state to
permanent storage – you need to make a post request every once in awhile for
each object to actually write the object.json files to disk.

### SOCKET /subscribe/realityEditorUpdates

Subscribes to /batchedUpdate messages, which get sent when nodes and tools are dragged around

Example:

```javascript
serverSocket.emit('/subscribe/realityEditorUpdates', JSON.stringify({editorId: tempDeviceId}));
serverSocket.on('/batchedUpdate', function(msg) {
  let msgData = JSON.parse(msg);
  console.log(msgData.batchedUpdates); // process each update however you'd like to
});
```

### SOCKET /batchedUpdate

Send this message to update any property of an object, tool, or node. Can contain multiple property updates in one message, for efficiency. Or can just contain one update per message. Works for ar.x, ar.y, ar.scale, ar.matrix (on tools), or x, y, scale, matrix (on nodes)

Example 1: moves the tool to a new matrix relative to its object

```javascript
serverSocket.emit('/batchedUpdate', JSON.stringify({
  batchedUpdates: [
    {
      objectKey: "test_Peoqk0h4lgb",
      frameKey: "test_Peoqk0h4lgbcommunicationIheoqop8cs05", // if this were null, it would update the object matrix instead
      nodeKey: null, // since this is null, the update will happen on the tool
      propertyPath: 'ar.matrix',
      newValue: [1,0,0,0,0,1,0,0,0,0,1,0,1000,2000,0,1],
      editorId: "4Q19ow5g" // random ID for this device
    }
  ]
}));
```

Example 2: sends two updates at once to update the x and y properties of a node

```javascript
serverSocket.emit('/batchedUpdate', JSON.stringify({
  batchedUpdates: [
    {
      objectKey: "test_Peoqk0h4lgb",
      frameKey: "test_Peoqk0h4lgbcommunicationIheoqop8cs05",
      nodeKey: "test_Peoqk0h4lgbcommunicationIheoqop8cs05value",
      propertyPath: 'x',
      newValue: 200,
      editorId: "4Q19ow5g"
    },
    {
      objectKey: "test_Peoqk0h4lgb",
      frameKey: "test_Peoqk0h4lgbcommunicationIheoqop8cs05",
      nodeKey: "test_Peoqk0h4lgbcommunicationIheoqop8cs05value",
      propertyPath: 'y',
      newValue: 300,
      editorId: "4Q19ow5g"
    }
  ]
}));
```

### SOCKET /subscribe/objectUpdates

Subscribes to /update/object/matrix. You can do this with the /batchedUpdates
messages too, this is sort of an alternative option that we have, that also
updates the sceneGraph on the server.

Example:

```javascript
serverSocket.emit('/subscribe/objectUpdates', JSON.stringify({editorId: tempDeviceId}));
serverSocket.on('/update/object/matrix', function(msg) {
  let msgData = JSON.parse(msg);
  console.log(msgData.editorId, msgData.objectKey, msgData.propertyPath, msgData.newValue);
});
```

### SOCKET /update/object/matrix

Send this message to update the position of an object relative to the world

Example:

```javascript
serverSocket.emit('/update/object/matrix', JSON.stringify({
  objectKey: "test_Peoqk0h4lgb",
  matrix: [1,0,0,0,0,1,0,0,0,0,1,0,1000,2000,0,1],
  worldId: "_WORLD_instantScan_yay1j3zgtoe",
  editorId: "4Q19ow5g" // random ID for this device
}));
```

### SOCKET /subscribe/realityEditor

Tool iframes use this to subscribe to their node value changes.

### SOCKET /subscribe/cameraMatrix

Obsoleted by Avatar objects and RVL frames.

Remote operators use this to subscribe to /cameraMatrix messages from other
remote operators, to render the real-time position of all remote operator
cameras in the system

Example:

```javascript
serverSocket.emit('/subscribe/cameraMatrix', JSON.stringify({editorId: tempDeviceId}));
serverSocket.on('/cameraMatrix', function(msg) {
  let msgData = JSON.parse(msg);
  console.log(msgData.editorId, msgData.cameraMatrix);
});
```

### SOCKET /cameraMatrix

Obsoleted by Avatar objects and RVL frames.

Send this to notify other clients about your camera position so they can visualize it.

Example:

```javascript
serverSocket.emit('/cameraMatrix', JSON.stringify({
  cameraMatrix: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  editorId: "4Q19ow5g" // random ID for this device
}));
```

## UDP Messages

If you notice that your application isn't updating with the latest state when
other clients make changes, it is possible that you also need to be listening
to UDP messages on the network. I would avoid adding this complexity unless it
becomes a problem, but it might be necessary. Whenever a tool is created or
updated (via a POST message, not via the sockets) the server will broadcast a
UDP message to the network with an "action" message telling each client to
reload the specified object, tool, or node. This keeps all the clients in sync
with what's stored on the server.
