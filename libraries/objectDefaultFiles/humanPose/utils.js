const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

const JOINTS = {
    NOSE: 'nose',
    LEFT_EYE: 'left_eye',
    RIGHT_EYE: 'right_eye',
    LEFT_EAR: 'left_ear',
    RIGHT_EAR: 'right_ear',
    LEFT_SHOULDER: 'left_shoulder',
    RIGHT_SHOULDER: 'right_shoulder',
    LEFT_ELBOW: 'left_elbow',
    RIGHT_ELBOW: 'right_elbow',
    LEFT_WRIST: 'left_wrist',
    RIGHT_WRIST: 'right_wrist',
    LEFT_HIP: 'left_hip',
    RIGHT_HIP: 'right_hip',
    LEFT_KNEE: 'left_knee',
    RIGHT_KNEE: 'right_knee',
    LEFT_ANKLE: 'left_ankle',
    RIGHT_ANKLE: 'right_ankle',
    HEAD: 'head', // synthetic
    NECK: 'neck', // synthetic
    CHEST: 'chest', // synthetic
    NAVEL: 'navel', // synthetic
    PELVIS: 'pelvis', // synthetic
    // LEFT_HAND: 'left hand synthetic',
    // RIGHT_HAND: 'right hand synthetic',
};

const JOINT_CONNECTIONS = {
    elbowWristLeft: [JOINTS.LEFT_WRIST, JOINTS.LEFT_ELBOW], // 0
    shoulderElbowLeft: [JOINTS.LEFT_ELBOW, JOINTS.LEFT_SHOULDER],
    shoulderSpan: [JOINTS.LEFT_SHOULDER, JOINTS.RIGHT_SHOULDER],
    shoulderElbowRight: [JOINTS.RIGHT_SHOULDER, JOINTS.RIGHT_ELBOW],
    elbowWristRight: [JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_WRIST],
    chestLeft: [JOINTS.LEFT_SHOULDER, JOINTS.LEFT_HIP], // 5
    hipSpan: [JOINTS.LEFT_HIP, JOINTS.RIGHT_HIP],
    chestRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_SHOULDER],
    hipKneeLeft: [JOINTS.LEFT_HIP, JOINTS.LEFT_KNEE],
    kneeAnkleLeft: [JOINTS.LEFT_KNEE, JOINTS.LEFT_ANKLE],
    hipKneeRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_KNEE], // 10
    kneeAnkleRight: [JOINTS.RIGHT_KNEE, JOINTS.RIGHT_ANKLE], // 11
    headNeck: [JOINTS.HEAD, JOINTS.NECK],
    neckChest: [JOINTS.NECK, JOINTS.CHEST],
    chestNavel: [JOINTS.CHEST, JOINTS.NAVEL],
    navelPelvis: [JOINTS.NAVEL, JOINTS.PELVIS],
};

// other modules in the project can use this to reliably check whether an object is a humanPose object
function isHumanPoseObject(object) {
    if (!object) { return false; }
    return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
}

function makePoseFromJoints(name, joints) {
    return {
        name: name,
        joints: joints
    };
}

function getPoseObjectName(pose) {
    return HUMAN_POSE_ID_PREFIX + pose.name;
}

function getPoseStringFromObject(poseObject) {
    let jointPositions = Object.keys(poseObject.frames).map(jointFrameId => realityEditor.sceneGraph.getWorldPosition(jointFrameId));
    return jointPositions.map(position => positionToRoundedString(position)).join();
}

function positionToRoundedString(position) {
    return 'x' + position.x.toFixed(0) + 'y' + position.y.toFixed(0) + 'z' + position.z.toFixed(0);
}

// a single piece of pose test data saved from a previous session
function getMockPoseStandingFarAway() {
    let joints = JSON.parse(
        "[{\"x\":-0.7552632972083383,\"y\":0.2644442929211472,\"z\":0.7913752977850149},{\"x\":-0.7845470806021233,\"y\":0.2421982759192687,\"z\":0.8088129628325323},{\"x\":-0.7702630884492285,\"y\":0.3001014048608925,\"z\":0.7688086082955945},{\"x\":-0.8222937248161452,\"y\":0.24623275325440866,\"z\":0.9550474860100973},{\"x\":-0.7833413553528865,\"y\":0.3678937178976209,\"z\":0.8505136192483953},{\"x\":-0.6329333926426419,\"y\":0.12993628611940003,\"z\":1.003037519866321},{\"x\":-0.5857144750949138,\"y\":0.4589454778216688,\"z\":0.8355459885338103},{\"x\":-0.3674280483465843,\"y\":-0.015621332976114535,\"z\":1.0097465238602046},{\"x\":-0.3089154169856956,\"y\":0.5132346709005703,\"z\":0.7849136963889392},{\"x\":-0.1927517400895856,\"y\":-0.17818293753755024,\"z\":0.9756865047079787},{\"x\":-0.16714735686176868,\"y\":0.5735810435150129,\"z\":0.6760789908531224},{\"x\":-0.1250018136428199,\"y\":-0.3687589763164842,\"z\":-0.9344674156160389},{\"x\":-0.12229286355074954,\"y\":-0.3292508923208693,\"z\":-0.8945665731201982},{\"x\":-0.10352244950174398,\"y\":-0.382806122564826,\"z\":-0.9740523344761574},{\"x\":-0.09227820167479968,\"y\":-0.34637551009676415,\"z\":-0.9339987027591811},{\"x\":-0.09457788170460725,\"y\":-0.3891481311166776,\"z\":-0.9955435991385165},{\"x\":-0.07832232108450882,\"y\":-0.35210246362115816,\"z\":-0.957316956868217}]"
    );
    return joints;
}

export {
    JOINTS,
    JOINT_CONNECTIONS,
    isHumanPoseObject,
    makePoseFromJoints,
    getPoseObjectName,
    getPoseStringFromObject,
    getMockPoseStandingFarAway,
};
