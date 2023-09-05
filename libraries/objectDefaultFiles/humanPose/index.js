createNameSpace("realityEditor.humanPose");

import * as network from './network.js';
import * as draw from './draw.js';
import * as utils from './utils.js';

(function(exports) {
    // Re-export submodules for use in legacy code
    exports.network = network;
    exports.draw = draw;
    exports.utils = utils;

    const MAX_FPS = 20;
    const IDLE_TIMEOUT_MS = 2000;

    let humanPoseObjects = {};
    let nameIdMap = {};
    let lastRenderTime = Date.now();
    let lastUpdateTime = Date.now();
    let lastRenderedPoses = {};

    function initService() {
        console.log('init humanPose module', network, draw, utils);

        realityEditor.app.callbacks.subscribeToPoses((poseJoints) => {
            let pose = utils.makePoseFromJoints('device' + globalStates.tempUuid + '_pose1', poseJoints);
            let poseObjectName = utils.getPoseObjectName(pose);

            if (typeof nameIdMap[poseObjectName] === 'undefined') {
                tryCreatingObjectFromPose(pose, poseObjectName);
            } else {
                let objectId = nameIdMap[poseObjectName];
                if (humanPoseObjects[objectId]) {
                    tryUpdatingPoseObject(pose, humanPoseObjects[objectId]);
                }
            }
        });

        network.onHumanPoseObjectDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
        });

        network.onHumanPoseObjectDeleted((objectKey) => {
            let objectToDelete = humanPoseObjects[objectKey];
            if (!objectToDelete) return;

            delete nameIdMap[objectToDelete.name];
            delete humanPoseObjects[objectKey];
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            try {
                // main update runs at ~60 FPS, but we can save some compute by limiting the pose rendering FPS
                if (Date.now() - lastRenderTime < (1000.0 / MAX_FPS)) return;
                lastRenderTime = Date.now();

                if (lastRenderTime - lastUpdateTime > IDLE_TIMEOUT_MS) {
                    // Clear out all human pose renderers because we've
                    // received no updates from any of them
                    draw.renderHumanPoseObjects([]);
                    lastUpdateTime = Date.now();
                    return;
                }

                // further reduce rendering redundant poses by only rendering if any pose data has been updated
                if (!areAnyPosesUpdated(humanPoseObjects)) return;

                lastUpdateTime = Date.now();

                draw.renderHumanPoseObjects(Object.values(humanPoseObjects));

                for (const [id, obj] of Object.entries(humanPoseObjects)) {
                    lastRenderedPoses[id] = utils.getPoseStringFromObject(obj);
                }
            } catch (e) {
                console.warn('error in renderHumanPoseObjects', e);
            }
        });
    }

    function areAnyPosesUpdated(poseObjects) {
        for (const [id, obj] of Object.entries(poseObjects)) {
            if (typeof lastRenderedPoses[id] === 'undefined') return true;
            let newPoseHash = utils.getPoseStringFromObject(obj);
            if (newPoseHash !== lastRenderedPoses[id]) {
                return true;
            }
        }
        return false;
    }

    function tryUpdatingPoseObject(pose, humanPoseObject) {
        // update the object position to be the average of the pose.joints
        // update each of the tool's positions to be the position of the joint relative to the average
        console.log('try updating pose object', pose, humanPoseObject);

        pose.joints.forEach((jointInfo, index) => {
            let jointName = Object.values(utils.JOINTS)[index];
            let frameId = Object.keys(humanPoseObject.frames).find(key => {
                return key.endsWith(jointName);
            });
            if (!frameId) {
                console.warn('couldn\'t find frame for joint ' + jointName + ' (' + index + ')');
                return;
            }
            const SCALE = 1000;
            // let jointFrame = humanPoseObject.frames[frameId];
            // set position of jointFrame
            let positionMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                jointInfo.x * SCALE, jointInfo.y * SCALE, jointInfo.z * SCALE, 1,
            ];
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameId);
            frameSceneNode.setLocalMatrix(positionMatrix); // this will broadcast it realtime, and sceneGraph will upload it every ~1 second for persistence
        });
    }

    let objectsInProgress = {};

    function tryCreatingObjectFromPose(pose, poseObjectName) {
        if (objectsInProgress[poseObjectName]) { return; }
        objectsInProgress[poseObjectName] = true;

        let worldObject = realityEditor.worldObjects.getBestWorldObject(); // subscribeToPoses only triggers after we localize within a world

        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, poseObjectName, () => {
            network.addHumanPoseObject(worldObject.objectId, poseObjectName, (data) => {
                console.log('added new human pose object', data);
                nameIdMap[poseObjectName] = data.id;
                // myAvatarId = data.id;
                // connectionStatus.isMyAvatarCreated = true;
                // refreshStatusUI();
                delete objectsInProgress[poseObjectName];

            }, (err) => {
                console.warn('unable to add human pose object to server', err);
                delete objectsInProgress[poseObjectName];

            });
        }, () => {
            console.warn('human pose already exists on server');
            delete objectsInProgress[poseObjectName];

        });
    }

    // initialize the human pose object
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isHumanPoseObject(object)) { return; }
        if (typeof humanPoseObjects[objectKey] !== 'undefined') { return; }
        humanPoseObjects[objectKey] = object; // keep track of which human pose objects we've processed so far

        // TODO: subscribe to public data, etc
    }

    exports.initService = initService;
}(realityEditor.humanPose));

export const initService = realityEditor.humanPose.initService;
