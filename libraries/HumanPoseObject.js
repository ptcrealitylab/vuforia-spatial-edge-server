const Frame = require('../models/Frame.js');
const Node = require('../models/Node.js');

/**
 * A functional "subclass" of Objects, which automatically generates frames for each pose joint
 * and sets other parameters for a human pose object
 *
 * @constructor
 * @param {number} bodyId - identifies a skeleton so that updates from the tracker consistently affect the same object
 */
function HumanPoseObject(ip, version, protocol, bodyId) {
    // The ID for the object will be broadcasted along with the IP. It consists of the name with a 12 letter UUID added.
    this.objectId = HumanPoseObject.getObjectId(bodyId);
    // The name for the object used for interfaces.
    this.name = this.getName(bodyId);
    // The IP address for the object is relevant to point the Reality Editor to the right server.
    // It will be used for the UDP broadcasts.
    this.ip = ip;
    // The version number of the Object.
    this.version = version;
    this.deactivated = false;
    this.protocol = protocol;
    // The (t)arget (C)eck(S)um is a sum of the checksum values for the target files.
    this.tcs = null;
    // Intended future use is to keep a memory of the last matrix transformation when interacted.
    // This data can be used for interacting with objects for when they are not visible.
    this.memory = {};
    this.memoryCameraMatrix = {};
    this.memoryProjectionMatrix = {};
    // Store the frames. These embed content positioned relative to the object
    this.frames = this.createPoseFrames();
    // keep a memory of the last commit state of the frames.
    this.framesHistory = {};
    // which visualization mode it should use right now ("ar" or "screen")
    this.visualization = 'ar';
    this.zone = '';
    // taken from target.xml. necessary to make the screens work correctly.
    this.targetSize = { // todo: what should "target size" even mean for a person?
        width: 0.3, // default size should always be overridden, but exists in case xml doesn't contain size
        height: 0.3
    };

    this.isHumanPose = true;
    this.isWorldObject = true;
}

HumanPoseObject.prototype.getName = function(bodyId) {
    return 'human' + bodyId;
};

/**
 * Helper function returns the UUID of a frame based on the name of a joint.
 * @param {string} jointName - e.g. JOINT_PELVIS, JOINT_FOOT_RIGHT
 * @return {string} - e.g. objectUuidJOINT_PELVIS, objectUuidJOINT_FOOT_RIGHT
 */
HumanPoseObject.prototype.getFrameKey = function(jointName) {
    return this.objectId + jointName;
};

// matches the entries of the Azure Kinect Body Tracking SDK
// k4abt_joint_id_t (https://microsoft.github.io/Azure-Kinect-Body-Tracking/release/0.9.x/group__btenums.html#ga5fe6fa921525a37dec7175c91c473781)
// For out purposes, serves as a mapping from joint names to the index they appear in the socket message updating the joint positions
HumanPoseObject.prototype.POSE_JOINTS = Object.freeze({
    JOINT_PELVIS: 0,
    JOINT_SPINE_NAVEL: 1,
    JOINT_SPINE_CHEST: 2,
    JOINT_NECK: 3,
    JOINT_CLAVICLE_LEFT: 4,
    JOINT_SHOULDER_LEFT: 5,
    JOINT_ELBOW_LEFT: 6,
    JOINT_WRIST_LEFT: 7,
    JOINT_HAND_LEFT: 8,
    JOINT_HANDTIP_LEFT: 9,
    JOINT_THUMB_LEFT: 10,
    JOINT_CLAVICLE_RIGHT: 11,
    JOINT_SHOULDER_RIGHT: 12,
    JOINT_ELBOW_RIGHT: 13,
    JOINT_WRIST_RIGHT: 14,
    JOINT_HAND_RIGHT: 15,
    JOINT_HANDTIP_RIGHT: 16,
    JOINT_THUMB_RIGHT: 17,
    JOINT_HIP_LEFT: 18,
    JOINT_KNEE_LEFT: 19,
    JOINT_ANKLE_LEFT: 20,
    JOINT_FOOT_LEFT: 21,
    JOINT_HIP_RIGHT: 22,
    JOINT_KNEE_RIGHT: 23,
    JOINT_ANKLE_RIGHT: 24,
    JOINT_FOOT_RIGHT: 25,
    JOINT_HEAD: 26,
    JOINT_NOSE: 27,
    JOINT_EYE_LEFT: 28,
    JOINT_EAR_LEFT: 29,
    JOINT_EYE_RIGHT: 30,
    JOINT_EAR_RIGHT: 31
});

// a selected subset of joints that frames should be created for to represent the most important parts of the pose
HumanPoseObject.prototype.POSE_JOINTS_FILTERED = Object.freeze({
    JOINT_PELVIS: 0,
    JOINT_SPINE_NAVEL: 1,
    JOINT_CLAVICLE_LEFT: 4,
    JOINT_ELBOW_LEFT: 6,
    JOINT_HAND_LEFT: 8,
    JOINT_CLAVICLE_RIGHT: 11,
    JOINT_ELBOW_RIGHT: 13,
    JOINT_HAND_RIGHT: 15,
    JOINT_KNEE_LEFT: 19,
    JOINT_FOOT_LEFT: 21,
    JOINT_KNEE_RIGHT: 23,
    JOINT_FOOT_RIGHT: 25,
    JOINT_HEAD: 26
});

/**
 * Generates a default frame for each joint in the skeleton.
 * By default, only generates the subset in POSE_JOINTS_FILTERED.
 * @param {boolean|undefined} dontFilterJoints - If truthy argument is provided, generates all in POSE_JOINTS
 */
HumanPoseObject.prototype.createPoseFrames = function(dontFilterJoints) {
    var frames = {};
    var jointsToCreate = this.POSE_JOINTS;
    if (!dontFilterJoints) {
        jointsToCreate = this.POSE_JOINTS_FILTERED;
    }
    Object.keys(jointsToCreate).forEach(function(jointName) {
        frames[ this.getFrameKey(jointName) ] = this.createFrame(jointName);
    }.bind(this));
    return frames;
};

/**
 * Generates a frame for a joint and assigns it default properties
 * @param {string} jointName - e.g. JOINT_PELVIS
 * @param {boolean|undefined} shouldCreateNode
 * @return {Frame}
 */
HumanPoseObject.prototype.createFrame = function(jointName, shouldCreateNode) {
    var newFrame = new Frame(this.objectId, this.getFrameKey(jointName));
    newFrame.name = jointName;
    newFrame.distanceScale = 2; // visible from twice as far away as usual frames
    newFrame.ar.scale = 2;

    if (shouldCreateNode) {
        let nodeName = 'value';
        var newNode = new Node(nodeName, 'node', this.objectId, newFrame.uuid, newFrame.uuid + nodeName);
        newFrame.nodes[newNode.uuid] = newNode;
        newNode.scale = 0.2; // nodes currently have a problem of being rendered too large by default, so decrease scale
    }

    return newFrame;
};

HumanPoseObject.prototype.updateJointPositions = function(joints) {

    // converts joint position from meters to mm scale
    var scale = 1000;

    var objPos = {
        x: joints[0].x * scale, // right now uses the pelvis as the object's center, but could change to any other joint (e.g. head might make sense)
        y: joints[0].y * scale,
        z: joints[0].z * scale
    };

    this.matrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        objPos.x, objPos.y, objPos.z, 1 // note that we don't flip y and z axes here - that is handled by the renderer when needed
    ];

    // update the position of each frame based on the poseInfo
    joints.forEach(function(position, i) {
        var jointName = Object.keys(this.POSE_JOINTS)[i];
        var frame = this.frames[this.getFrameKey(jointName)];
        if (frame) {
            var scaledPosition = {
                x: position.x * scale, // meter to mm scale
                y: position.y * scale,
                z: position.z * scale
            };
            // frame positions are relative to object
            frame.ar.matrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                scaledPosition.x - objPos.x, scaledPosition.y - objPos.y, scaledPosition.z - objPos.z, 1
            ];
        }
    }.bind(this));
};

/**
 * @static - static method used to locate the correct HumanPoseObject instance based on tracker info
 * Converts bodyID from Kinect into a UUID for an object
 * @param {number} bodyId - the body id provided from the tracker (an integer)
 * @return {string}
 */
HumanPoseObject.getObjectId = function(bodyId) {
    return 'humanPoseObject' + bodyId;
};

module.exports = HumanPoseObject;
