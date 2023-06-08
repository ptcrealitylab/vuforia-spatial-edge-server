import {isHumanPoseObject, JOINTS} from './utils.js';

// Tell the server (corresponding to this world object) to create a new human object with the specified ID
function addHumanPoseObject(worldId, objectName, onSuccess, onError) {
    let worldObject = realityEditor.getObject(worldId);
    if (!worldObject) {
        console.warn('Unable to add human pose object because no world with ID: ' + worldId);
        return;
    }

    let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
    let poseJointSchema = JSON.stringify(JOINTS);
    let params = new URLSearchParams({action: 'new', name: objectName, isHuman: JSON.stringify(true), worldId: worldId, poseJointSchema: poseJointSchema});
    // TODO: we may need to include the pose joints or at least a list of which joints are provided by this source
    fetch(postUrl, {
        method: 'POST',
        body: params
    }).then(response => response.json())
        .then(data => {
            onSuccess(data);
        }).catch(err => {
            onError(err);
        });
}

// helper function that will trigger the callback for each avatar object previously or in-future discovered
function onHumanPoseObjectDiscovered(callback) {
    // first check if any previously discovered objects are avatars
    for (let [objectKey, object] of Object.entries(objects)) {
        if (isHumanPoseObject(object)) {
            callback(object, objectKey);
        }
    }

    // next, listen to newly discovered objects
    realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
        if (isHumanPoseObject(object)) {
            callback(object, objectKey);
        }
    });
}

function onHumanPoseObjectDeleted(callback) {
    realityEditor.network.registerCallback('objectDeleted', (params) => {
        callback(params.objectKey);
    });
}

export {
    addHumanPoseObject,
    onHumanPoseObjectDiscovered,
    onHumanPoseObjectDeleted,
};
