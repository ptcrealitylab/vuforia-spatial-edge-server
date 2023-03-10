
const HumanPoseObject = require('./HumanPoseObject');
const sgUtils = require('./sceneGraph/utils.js');
const utilities = require('./utilities.js');
const server = require('../server');

// incoming HumanPoseObjects should be created with this joint schema
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
};

class HumanPoseFuser {

    constructor(objects, sceneGraph, objectLookup, ip, version, protocol, beatPort) {
        // references to global data structures for objects
        this.objectsRef = objects;
        this.sceneGraphRef = sceneGraph;
        this.objectLookupRef = objectLookup;

        // for HumanPoseObject creation
        this.ip = ip;
        this.version = version;
        this.protocol = protocol;
        this.beatPort = beatPort;

        // recent history of poses for each existing HumanPoseObject
        // dictionary - key: objectId, value: { latestFusedDataTS, array of objects from publicData['whole_pose'] }
        this.pastPoses = {};

        // dictionary - key: objectId of fused human object, value: objectId of associated human object which has currently best pose
        this.bestHumanObjectForFusedObject = {};

        // dictionary - key: objectId of fused human object, value: array of objectId of associated human objects (original ones updated from Toolbox apps)
        this.humanObjectsOfFusedObject = {
            getFusedObject(objectId) {
                for (let [fusedObjId, ids] of Object.entries(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    let ind = ids.indexOf(objectId);
                    if (ind >= 0) {
                        return fusedObjId;
                    }
                }
                return null;
            },

            deleteObject(objectId) {
                for (let ids of Object.values(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    let ind = ids.indexOf(objectId);
                    if (ind >= 0) {
                        ids.splice(ind, 1);
                    }
                }
            },

            print() {
                let str = "";
                for (let [objectId, ids] of Object.entries(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    str += objectId + ': ' + ids;
                }
                return str;
            }
            // TODO?: add objectId

        };

        this.intervalTimer = null;
        // same frequency as body tracking in Toolbox app
        this.fuseIntervalMs = 100;
        // keep in pastPoses data which are x ms in the past (on timeline of data ts)
        this.pastIntervalMs = 10000;
        // time interval into past to find corresponding poses across human objects (on timeline of data ts)
        this.recentIntervalMs = 500;
        // time interval into past to aggregate pose confidence for a human object (on timeline of data ts)
        this.confidenceIntervalMs = 500;
        
        
        this.maxDistanceForSamePerson = 300; // mm
        this.minConfidenceDifference = 1.0;  // difference in total pose confidence over recent frames
    }

    start() {
        this.intervalTimer = setInterval(() => {
            this.fuse();
        },
        this.fuseIntervalMs);
    }

    stop() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
    }

    fuse() {
        const start = Date.now();
        console.log('-- Fusing poses');

        let currentPoseData = this.findPoseDataMatchingInTime();

        for (let [objectId, pose] of Object.entries(currentPoseData)) {
            console.log('obj=' + objectId + ', data_ts=' + pose.timestamp.toFixed(0) + ( (pose.joints.length == 0) ? ' (empty)' : '' ));
        }

        // TODO: set here latestFusedDataTS or leave it in findPoseDataMatchingInTime()

        this.assignPoseData(currentPoseData);

        console.log('Assignment to fused human objects: \n', this.humanObjectsOfFusedObject.print());

        this.fusePoseData(currentPoseData);

        this.cleanPastPoses();

        const elapsedTimeMs = Date.now() - start;
        console.log(`Fusion time: ${elapsedTimeMs}ms`);
    }

    addPoseData(objectId, wholePose) {
        if (this.pastPoses[objectId] === undefined) {
            this.pastPoses[objectId] = {
                latestFusedDataTS: 0,
                poses: []
            };
        }

        // extend pose object with overall confidence but prevent it to be copyable
        let poseConfidence = this.computeOverallConfidence(wholePose.joints);
        wholePose.poseConfidence = poseConfidence;
        Object.defineProperty(wholePose, 'poseConfidence', { enumerable: false });

        this.pastPoses[objectId].poses.push(wholePose);
    }

    /**
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} poseJoints 
     * @returns overall pose confidence
     */
    computeOverallConfidence(poseJoints) {

        if (poseJoints.length == 0) {
            return 0.0;
        }

        // limit to joints which are not synthetically computed,
        // and keep just one 'head' joint - nose to limit an influence of head
        const selectedJointNames = ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];

        const joints = Object.values(JOINTS);
        let sum = 0.0;
        for (let name of selectedJointNames) {
            const jointIndex = joints.indexOf(name);

            if (jointIndex >= 0) {
                sum += poseJoints[jointIndex].confidence;
            }
        }

        return sum / selectedJointNames.length;
    }

    removeHumanObject(objectId) {

        let removeFusedObject = (fid) => {

            let batchedUpdates = [];
            // remove parent reference from its remaining associated human objects
            for (let id of this.humanObjectsOfFusedObject[fid]) {
                if (this.objectsRef[id] !== undefined) {
                    this.objectsRef[id].parent = null;

                    batchedUpdates.push({
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: null,
                        editorId: 0    // TODO: some server identificator
                    });
                }
            }

            // remove all association data if the given object is a fused human object
            delete this.humanObjectsOfFusedObject[fid];
            delete this.bestHumanObjectForFusedObject[fid];

            // send out 'parent' property updates to all subscribers
            server.socketHandler.sendUpdateToAllSubscribers(batchedUpdates);
        };

        // remove pose history of a deleted human object if there is any
        delete this.pastPoses[objectId];

        if (this.humanObjectsOfFusedObject[objectId] === undefined) { // not a fused human object

            let fusedObjectId = this.humanObjectsOfFusedObject.getFusedObject(objectId);

            // remove association of a deleted object to any fused human object
            this.humanObjectsOfFusedObject.deleteObject(objectId);

            // remove fused human objects if it has less than 2 associated human objects
            if (fusedObjectId && this.humanObjectsOfFusedObject[fusedObjectId].length < 2) {
                removeFusedObject(fusedObjectId);
            }

            return;
        }

        // a fused human object is deleted
        removeFusedObject(objectId);
    }

    cleanPastPoses() {
        // get the latest data timestamp
        let latestTS = 0;
        for (let objPoses of Object.values(this.pastPoses)) {
            if (objPoses.poses.length > 0 && objPoses.poses.at(-1).timestamp > latestTS) {
                latestTS = objPoses.poses.at(-1).timestamp;
            }
        }

        if (latestTS == 0) {
            return;
        }

        let cutoffTS = latestTS - this.pastIntervalMs;

        // delete poses older than a given ts across all human pose objects
        for (let objPoses of Object.values(this.pastPoses)) {
            this.removeOldPoseData(objPoses.poses, cutoffTS);
        }
    }

    removeOldPoseData(poseArr, timestamp) {
        // the oldest data are at the start of array
        let deleteCount = 0;
        for (let i = 0; i < poseArr.length; i++) {
            if (poseArr[i].timestamp > timestamp) {
                break;
            }
            deleteCount++;
        }
        poseArr.splice(0, deleteCount);
    }

    // Simple approach of taking the latest poses across human pose objects up to short interval into past (for now).
    // @return {Object.<string, Object>} - key: HumanPoseObject.objectId, value: Object of publicData['whole_pose']
    findPoseDataMatchingInTime() {

        let matchingPoses = {};

        // get the latest data across objects and find the most recent timestamp
        let latestTS = 0;
        for (let [objectId, objPoses] of Object.entries(this.pastPoses)) {
            if (objPoses.poses.length > 0) {
                let ts = objPoses.poses.at(-1).timestamp;
                if (ts > objPoses.latestFusedDataTS) {
                    matchingPoses[objectId] = objPoses.poses.at(-1);
                    objPoses.latestFusedDataTS = ts;
                    if (ts > latestTS) {
                        latestTS = ts;
                    }
                }
            }
        }

        // filter out poses older than recent past
        let cutoffTS = latestTS - this.recentIntervalMs;
        let filteredMatchingPoses = Object.fromEntries(Object.entries(matchingPoses).filter(entry => entry[1].timestamp > cutoffTS));
        
        // TODO: does this even come to play for 500ms when latestFusedDataTS is updated every 100ms ???
        const numFiltered = Object.keys(matchingPoses).length - Object.keys(filteredMatchingPoses).length;
        if (numFiltered > 0) {
            console.log(`Filtered ${numFiltered} poses.`);
        }

        return filteredMatchingPoses;
    }

    // @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints1/joints2
    arePosesOfSamePerson(joints1, joints2) {

        // check distances between pelvis and neck
        let pelvisIndex = Object.values(JOINTS).indexOf('pelvis');
        let neckIndex = Object.values(JOINTS).indexOf('neck');

        if (pelvisIndex < 0 || neckIndex < 0) {
            // this should not really happen in correct joint schema
            return false;
        }

        let pelvisDist = sgUtils.positionDistance(joints1[pelvisIndex], joints2[pelvisIndex]);
        let neckDist = sgUtils.positionDistance(joints1[neckIndex], joints2[neckIndex]);

        if (pelvisDist > this.maxDistanceForSamePerson || neckDist > this.maxDistanceForSamePerson) {
            return false;
        }

        return true;
    }

    /**
     * Selects the best human object to update its parent fused human object based on presence and quality of received poses in recent past.
     * Note that it can select an object (from app/view) which received empty pose since the last fusion run.
     * @param {string} fusedObjectId - id of parent fused object
     * @param {Object.<string, Object>} poseData - dictionary with key: objectId, value: Object of publicData['whole_pose']; currently available poses for existing human objects
     * @return {string | null} objectId
     */
    selectHumanObject(fusedObjectId, poseData) {

        let bestObjectId = null;

        let poseDataArr = Object.entries(poseData);
        if (poseDataArr.length == 0) {
            return bestObjectId;
        }
        if (poseDataArr.length == 1) {
            bestObjectId = poseDataArr[0][0];
            console.log('Recent total confidence: ' + bestObjectId + '=[single_choice]');
            this.bestHumanObjectForFusedObject[fusedObjectId] = bestObjectId;
            return bestObjectId;
        }

        // get the latest data timestamp
        let latestTS = 0;
        for (let pose of Object.values(poseData)) {
            if (pose.timestamp > latestTS) {
                latestTS = pose.timestamp;
            }
        }

        let cutoffTS = latestTS - this.confidenceIntervalMs;
        let str = "";
        let totalConfidences = [];
        // look at pose confidence history of currently considered human pose objects
        for (let [objectId, currentPose] of poseDataArr) {
            // aggregate pose confidence over recent frames
            let totalConfidence = 0.0;
            for (let pose of this.pastPoses[objectId].poses) {
                if (pose.timestamp > cutoffTS && pose.timestamp < (currentPose.timestamp + 1.0)) {   // increase by one ms to ensure that the current pose is also included
                    totalConfidence += pose.poseConfidence;
                }
            }

            totalConfidences.push({id: objectId, value: totalConfidence});
            str += objectId + ' = ' + totalConfidence.toFixed(3) + ', ';
        }
        console.log('Recent total confidence: ', str);

        let currentBest; // undefined
        if (totalConfidences.length > 0) {
            // find the human object with the highest sum of individual confidences
            currentBest = totalConfidences.reduce( (max, current) => { return max.value > current.value ? max : current; } );
        }

        const previousSelectedObject = this.bestHumanObjectForFusedObject[fusedObjectId]; // can be also undefined
        const previousBest = totalConfidences.find(item => item.id == previousSelectedObject);
        if (previousBest !== undefined && currentBest !== undefined) {
            // add some hysteresis to select a different human object
            if ((currentBest.value - previousBest.value) > this.minConfidenceDifference) {
                bestObjectId = currentBest.id;
            } else {
                bestObjectId = previousBest.id;
            }
        } else if (previousBest !== undefined && currentBest == undefined) {
            // keep the human object selected so far because there is no current candidate
            bestObjectId = previousBest.id;
        } else if (previousBest == undefined && currentBest !== undefined) {
            // the human object selected so far is not available, switch to the current best
            bestObjectId = currentBest.id;
        } else {
            // return null id below
        }

        if (bestObjectId) {
            this.bestHumanObjectForFusedObject[fusedObjectId] = bestObjectId;
        }
        else {
            console.warn('Cannot select the best object for a fused human object.');
        }

        return bestObjectId;
    }

    /**
     * @param {string} fusedObjectId
     * @param {Object.<string, Object>} poseData - dictionary with key: objectId, value: Object of publicData['whole_pose']
     */
    updateFusedObject(fusedObjectId, poseData) {

        if (this.objectsRef[fusedObjectId] === undefined) {
            console.warn('Updating non-existent fused human pose object.');
            return;
        }

        let selectedObjectId = this.selectHumanObject(fusedObjectId, poseData);
        if (!selectedObjectId) {
            return;
        }

        if (poseData[selectedObjectId].joints.length == 0) {
            console.log('not updating joints: obj=' + fusedObjectId);
            return;
        }

        this.objectsRef[fusedObjectId].updateJoints(poseData[selectedObjectId].joints);
        this.objectsRef[fusedObjectId].lastUpdateDataTS = poseData[selectedObjectId].timestamp;
        server.resetObjectTimeout(fusedObjectId); // keep the object alive

        // create copy and update name (confidence attribute not copied)
        let wholePose = Object.assign({}, poseData[selectedObjectId]);
        let end = fusedObjectId.indexOf('pose1');
        let name = fusedObjectId.substring('_HUMAN_'.length, end + 'pose1'.length);
        wholePose.name = name; // 'server_pose1' in practise for now

        // update public data of a selected node to enable transmission of new pose state to clients (eg. remote operator viewer)
        // NOTE: string 'whole_pose' is defined in JOINT_PUBLIC_DATA_KEYS in UI codebase
        let keys = this.objectsRef[fusedObjectId].getJointNodeInfo(0);
        if (this.objectsRef.hasOwnProperty(keys.objectKey)) {
            if (this.objectsRef[keys.objectKey].frames.hasOwnProperty(keys.frameKey)) {
                if (this.objectsRef[keys.objectKey].frames[keys.frameKey].nodes.hasOwnProperty(keys.nodeKey)) {
                    var data = this.objectsRef[keys.objectKey].frames[keys.frameKey].nodes[keys.nodeKey].publicData;
                    data['whole_pose'] = wholePose;
                    // sent out message with this updated data to all subscribers (eg. remote viewer)
                    // TODO: some server identificator instead of sessionUuid
                    server.socketHandler.sendPublicDataToAllSubscribers(keys.objectKey, keys.frameKey, keys.nodeKey, 0 /*sessionUuid*/);
                }
            }
        }

        console.log('updating joints: obj=' + fusedObjectId + ' with ' + selectedObjectId + ', data_ts=' + poseData[selectedObjectId].timestamp.toFixed(0) + ', update_ts=' + Date.now());
    }

    // @param {Object.<string, Object>} poseData - dictionary with key: objectId, value: Object of publicData['whole_pose']
    assignPoseData(poseData) {

        // simple approach which fused one pair of pose streams into a new fused human object at a time
        // compare all pairs of poses and store ones belonging to a same person
        // WARNING: it can create multiple fused human objects for the same person
        let poseObjsSamePerson = [];
        let poseDataArr = Object.entries(poseData).filter(entry => entry[1].joints.length > 0);

        outer: for (let i = 0; i < poseDataArr.length; i++) {
            for (let j = i + 1; j < poseDataArr.length; j++) {
                if (this.arePosesOfSamePerson(poseDataArr[i][1].joints, poseDataArr[j][1].joints)) {
                    // introduce new set of related human objects
                    poseObjsSamePerson.push([poseDataArr[i][0], poseDataArr[j][0]]);
                    //break outer;
                }
            }
        }

        // TODO: maybe there should be a check whether poses assigned to an existing fused human object are still in spatial proximity

        let batchedUpdates = [];

        // assign groups of spatially-close human objects to existing or new fused human objects
        for (let ids of poseObjsSamePerson) {
            // check if some objects in the group already belong to some fused human objects
            let fusedObjectId = null;
            let unassignedIds = [];
            for (let id of ids) {
                let fid = this.humanObjectsOfFusedObject.getFusedObject(id);
                if (fid) {
                    // NOTE: there can be human objects in this group can be already assigned to different fused human objects 
                    // not handling this properly at the moment
                    if (!fusedObjectId) {
                        fusedObjectId = fid;
                    }
                }
                else {
                    unassignedIds.push(id);
                }
            }

            if (fusedObjectId) {
                // add unassigned human objects to a fused human object at the same location
                for (let id of unassignedIds) {
                    this.humanObjectsOfFusedObject[fusedObjectId].push(id);

                    // set parent reference pointing at a fused human object
                    this.objectsRef[id].parent = fusedObjectId;

                    batchedUpdates.push({
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: fusedObjectId,
                        editorId: 0    // TODO: some server identificator
                    });
                }
            }
            else {
                // whole group is unassigned, thus create new fused human object for it
                // TODO?: add a string identifying the server  (equivalent to globalStates.tempUuid for devices) 
                let fusedObjectId = '_HUMAN_' + 'server' + '_pose1' + utilities.uuidTime();
                this.objectsRef[fusedObjectId] = new HumanPoseObject(this.ip, this.version, this.protocol, fusedObjectId, JOINTS);
                if (this.humanObjectsOfFusedObject[fusedObjectId] === undefined) {
                    this.humanObjectsOfFusedObject[fusedObjectId] = ids;

                    // set parent reference pointing at new fused human object
                    for (let id of ids) {
                        this.objectsRef[id].parent = fusedObjectId;

                        batchedUpdates.push({
                            objectKey: id,
                            frameKey: null,
                            nodeKey: null,
                            propertyPath: 'parent',
                            newValue: fusedObjectId,
                            editorId: 0    // TODO: some server identificator
                        });
                    }
                }

                // setup active heartbeat for this new object
                server.objectBeatSender(this.beatPort, fusedObjectId, this.ip, false, true);

                // add new object to different global data structures
                this.sceneGraphRef.addObjectAndChildren(fusedObjectId, this.objectsRef[fusedObjectId]);
                utilities.writeObject(this.objectLookupRef, this.objectsRef[fusedObjectId].name, fusedObjectId);

                // TODO?: add to 'knownObjects' - it seems that locally created objects do not get added there in general, just to 'objects'

                console.log('creating fused human obj=' + fusedObjectId);
            }
        }

        // send out 'parent' property updates to all subscribers
        server.socketHandler.sendUpdateToAllSubscribers(batchedUpdates);
    }

    /**
     * @param {Object.<string, Object>} poseData - dictionary with key: objectId, value: Object of publicData['whole_pose']
     */
    fusePoseData(poseData) {

        let poseGroups = {}; // dictionary with key: fusedObjectId, value: subset of dictionary poseData
        // group poses according to the fused human objects their are associated to
        for (let [id, pose] of Object.entries(poseData)) {
            let fid = this.humanObjectsOfFusedObject.getFusedObject(id);
            if (fid) {
                // associated to some fused human object
                if (poseGroups[fid] === undefined) {
                    poseGroups[fid] = {};
                }
                poseGroups[fid][id] = pose;
            }
            //console.log('obj=' + objectId + ', data_ts=' + pose.timestamp.toFixed(0));
        }

        for (let [fid, group] of Object.entries(poseGroups)) {
            this.updateFusedObject(fid, group);
        }

    }

}

module.exports = HumanPoseFuser;
